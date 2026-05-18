using System.Diagnostics;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Polly;
using Polly.Retry;

namespace Orqentis.AI;

public interface ILlmRouter
{
    Task<LlmResult?> CompleteAsync(string operation, string systemPrompt, string userInput, CancellationToken ct = default);
}

public sealed record LlmResult(string Content, string ModelUsed, int? TotalTokens = null, int? PromptTokens = null, int? CompletionTokens = null);

public sealed record LlmUsage(int? PromptTokens, int? CompletionTokens, int? TotalTokens);

public sealed record LlmProviderResult(string Content, string ModelUsed, LlmUsage? Usage = null);

public interface ILlmProvider
{
    string Name { get; }
    bool IsConfigured { get; }
    Task<LlmProviderResult?> CompleteAsync(string systemPrompt, string userInput, CancellationToken ct = default);
}

public sealed class LlmRouter : ILlmRouter
{
    private const int _maxTokens = 2048;
    private const double _temperature = 0.1;

    private readonly AiOptions _options;
    private readonly IReadOnlyDictionary<string, ILlmProvider> _providers;
    private readonly IMemoryCache _memoryCache;
    private readonly ILogger<LlmRouter> _logger;
    private readonly ResiliencePipeline<LlmProviderResult?> _retryPipeline;

    public LlmRouter(
        IEnumerable<ILlmProvider> providers,
        IOptions<AiOptions> options,
        IMemoryCache memoryCache,
        ILogger<LlmRouter> logger)
    {
        _options = options.Value;
        _memoryCache = memoryCache;
        _logger = logger;
        _providers = providers.ToDictionary(provider => provider.Name, StringComparer.OrdinalIgnoreCase);

        _retryPipeline = new ResiliencePipelineBuilder<LlmProviderResult?>()
            .AddRetry(new RetryStrategyOptions<LlmProviderResult?>
            {
                BackoffType = DelayBackoffType.Exponential,
                Delay = TimeSpan.FromSeconds(1),
                MaxRetryAttempts = 3,
                UseJitter = false,
                ShouldHandle = new PredicateBuilder<LlmProviderResult?>()
                    .Handle<Exception>()
                    .HandleResult(value => value is null || string.IsNullOrWhiteSpace(value.Content)),
            })
            .Build();
    }

    public async Task<LlmResult?> CompleteAsync(string operation, string systemPrompt, string userInput, CancellationToken ct = default)
    {
        var cacheKey = BuildCacheKey(systemPrompt, userInput, _maxTokens, _temperature);
        if (_temperature <= 0.3 && _memoryCache.TryGetValue(cacheKey, out LlmResult? cached))
        {
            return cached;
        }

        var primaryResult = await ExecuteWithProviderAsync("azure-openai", operation, systemPrompt, userInput, ct).ConfigureAwait(false);
        if (primaryResult is not null)
        {
            CacheResult(cacheKey, primaryResult);
            return primaryResult;
        }

        if (!_options.FallbackEnabled)
        {
            return null;
        }

        var fallbackResult = await ExecuteWithProviderAsync("anthropic", operation, systemPrompt, userInput, ct).ConfigureAwait(false);
        if (fallbackResult is not null)
        {
            CacheResult(cacheKey, fallbackResult);
        }

        return fallbackResult;
    }

    private async Task<LlmResult?> ExecuteWithProviderAsync(
        string providerName,
        string operation,
        string systemPrompt,
        string userInput,
        CancellationToken ct)
    {
        if (!_providers.TryGetValue(providerName, out var provider) || !provider.IsConfigured)
        {
            _logger.LogWarning("AI-{Operation}-ProviderUnavailable Provider={Provider}", operation, providerName);
            return null;
        }

        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(_options.CallTimeout);
        var stopwatch = Stopwatch.StartNew();

        try
        {
            var providerResult = await _retryPipeline.ExecuteAsync(
                    async token => await provider.CompleteAsync(systemPrompt, userInput, token).ConfigureAwait(false),
                    timeoutCts.Token)
                .ConfigureAwait(false);

            stopwatch.Stop();
            if (providerResult is null || string.IsNullOrWhiteSpace(providerResult.Content))
            {
                return null;
            }

            _logger.LogInformation(
                "AI-{Feature}-Usage WorkspaceId={WorkspaceId} Feature={Feature} PromptTokens={PromptTokens} CompletionTokens={CompletionTokens} Provider={Provider} ModelUsed={ModelUsed} LatencyMs={LatencyMs}",
                operation,
                "unknown",
                operation,
                providerResult.Usage?.PromptTokens,
                providerResult.Usage?.CompletionTokens,
                provider.Name,
                providerResult.ModelUsed,
                stopwatch.ElapsedMilliseconds);

            return new LlmResult(
                providerResult.Content,
                providerResult.ModelUsed,
                providerResult.Usage?.TotalTokens,
                providerResult.Usage?.PromptTokens,
                providerResult.Usage?.CompletionTokens);
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            _logger.LogWarning("AI-{Operation}-ProviderTimeout Provider={Provider} TimeoutSeconds={TimeoutSeconds}", operation, providerName, _options.CallTimeout.TotalSeconds);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "AI-{Operation}-ProviderFailed Provider={Provider}", operation, providerName);
            return null;
        }
    }

    private void CacheResult(string cacheKey, LlmResult result)
    {
        var responseBytes = Encoding.UTF8.GetByteCount(result.Content);
        _memoryCache.Set(
            cacheKey,
            result,
            new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10),
                Size = Math.Max(1, responseBytes),
            });
    }

    private static string BuildCacheKey(string systemPrompt, string userInput, int maxTokens, double temperature)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes($"{systemPrompt}\u001f{userInput}\u001f{maxTokens}\u001f{temperature}"));
        return $"llm:{Convert.ToHexString(bytes).ToLowerInvariant()}";
    }
}

internal sealed class AzureOpenAiLlmProvider : ILlmProvider
{
    private const int _maxTokens = 2048;
    private const double _temperature = 0.1;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly AiOptions _options;

    public AzureOpenAiLlmProvider(IHttpClientFactory httpClientFactory, IOptions<AiOptions> options)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
    }

    public string Name => "azure-openai";

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_options.AzureOpenAI.Endpoint) &&
        !string.IsNullOrWhiteSpace(_options.AzureOpenAI.DeploymentName) &&
        !string.IsNullOrWhiteSpace(_options.AzureOpenAI.ApiKey);

    public async Task<LlmProviderResult?> CompleteAsync(string systemPrompt, string userInput, CancellationToken ct = default)
    {
        if (!IsConfigured)
        {
            return null;
        }

        var endpoint = _options.AzureOpenAI.Endpoint.TrimEnd('/');
        var requestUri = $"{endpoint}/openai/deployments/{_options.AzureOpenAI.DeploymentName}/chat/completions?api-version={_options.AzureOpenAI.ApiVersion}";
        using var request = new HttpRequestMessage(HttpMethod.Post, requestUri);
        request.Headers.Add("api-key", _options.AzureOpenAI.ApiKey);

        var payload = new
        {
            temperature = _temperature,
            max_tokens = _maxTokens,
            messages = new object[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userInput },
            },
        };

        request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        var client = _httpClientFactory.CreateClient("orqentis-ai-azure-openai");
        using var response = await client.SendAsync(request, ct).ConfigureAwait(false);
        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException($"Azure OpenAI call failed with status {(int)response.StatusCode}.");
        }

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct).ConfigureAwait(false));
        var content = document.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString();
        var usage = TryReadAzureUsage(document.RootElement);
        return string.IsNullOrWhiteSpace(content)
            ? null
            : new LlmProviderResult(content.Trim(), _options.AzureOpenAI.DeploymentName, usage);
    }

    private static LlmUsage? TryReadAzureUsage(JsonElement root)
    {
        if (!root.TryGetProperty("usage", out var usage))
        {
            return null;
        }

        return new LlmUsage(
            TryGetInt(usage, "prompt_tokens"),
            TryGetInt(usage, "completion_tokens"),
            TryGetInt(usage, "total_tokens"));
    }

    private static int? TryGetInt(JsonElement element, string propertyName) =>
        element.TryGetProperty(propertyName, out var property) && property.TryGetInt32(out var value)
            ? value
            : null;
}

internal sealed class AnthropicLlmProvider : ILlmProvider
{
    private const string _anthropicVersion = "2023-06-01";
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly AiOptions _options;

    public AnthropicLlmProvider(IHttpClientFactory httpClientFactory, IOptions<AiOptions> options)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
    }

    public string Name => "anthropic";

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_options.Anthropic.Endpoint) &&
        !string.IsNullOrWhiteSpace(_options.Anthropic.ApiKey);

    public async Task<LlmProviderResult?> CompleteAsync(string systemPrompt, string userInput, CancellationToken ct = default)
    {
        if (!IsConfigured)
        {
            return null;
        }

        var endpoint = _options.Anthropic.Endpoint.TrimEnd('/');
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{endpoint}/v1/messages");
        request.Headers.Add("x-api-key", _options.Anthropic.ApiKey);
        request.Headers.Add("anthropic-version", _anthropicVersion);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        var payload = new
        {
            model = _options.Anthropic.Model,
            max_tokens = 1024,
            system = systemPrompt,
            messages = new object[]
            {
                new { role = "user", content = userInput },
            },
        };

        request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        var client = _httpClientFactory.CreateClient("orqentis-ai-anthropic");
        using var response = await client.SendAsync(request, ct).ConfigureAwait(false);
        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException($"Anthropic call failed with status {(int)response.StatusCode}.");
        }

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct).ConfigureAwait(false));
        var text = document.RootElement
            .GetProperty("content")[0]
            .GetProperty("text")
            .GetString();
        var usage = TryReadAnthropicUsage(document.RootElement);
        return string.IsNullOrWhiteSpace(text)
            ? null
            : new LlmProviderResult(text.Trim(), _options.Anthropic.Model, usage);
    }

    private static LlmUsage? TryReadAnthropicUsage(JsonElement root)
    {
        if (!root.TryGetProperty("usage", out var usage))
        {
            return null;
        }

        var promptTokens = TryGetInt(usage, "input_tokens");
        var completionTokens = TryGetInt(usage, "output_tokens");
        return new LlmUsage(promptTokens, completionTokens, promptTokens + completionTokens);
    }

    private static int? TryGetInt(JsonElement element, string propertyName) =>
        element.TryGetProperty(propertyName, out var property) && property.TryGetInt32(out var value)
            ? value
            : null;
}
