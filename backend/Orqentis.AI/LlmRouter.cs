using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Polly;
using Polly.Retry;

namespace Orqentis.AI;

public interface ILlmRouter
{
    Task<LlmResult?> CompleteAsync(string operation, string systemPrompt, string userInput, CancellationToken ct = default);
}

public sealed record LlmResult(string Content, string ModelUsed);

public interface ILlmProvider
{
    string Name { get; }
    bool IsConfigured { get; }
    Task<string?> CompleteAsync(string systemPrompt, string userInput, CancellationToken ct = default);
}

public sealed class LlmRouter : ILlmRouter
{
    private readonly AiOptions _options;
    private readonly IReadOnlyDictionary<string, ILlmProvider> _providers;
    private readonly ILogger<LlmRouter> _logger;
    private readonly ResiliencePipeline<string?> _retryPipeline;

    public LlmRouter(
        IEnumerable<ILlmProvider> providers,
        IOptions<AiOptions> options,
        ILogger<LlmRouter> logger)
    {
        _options = options.Value;
        _logger = logger;
        _providers = providers.ToDictionary(provider => provider.Name, StringComparer.OrdinalIgnoreCase);

        _retryPipeline = new ResiliencePipelineBuilder<string?>()
            .AddRetry(new RetryStrategyOptions<string?>
            {
                BackoffType = DelayBackoffType.Exponential,
                Delay = TimeSpan.FromSeconds(1),
                MaxRetryAttempts = 3,
                UseJitter = false,
                ShouldHandle = new PredicateBuilder<string?>()
                    .Handle<Exception>()
                    .HandleResult(value => string.IsNullOrWhiteSpace(value)),
            })
            .Build();
    }

    public async Task<LlmResult?> CompleteAsync(string operation, string systemPrompt, string userInput, CancellationToken ct = default)
    {
        var primaryResult = await ExecuteWithProviderAsync("azure-openai", operation, systemPrompt, userInput, ct).ConfigureAwait(false);
        if (primaryResult is not null)
        {
            return primaryResult;
        }

        if (!_options.FallbackEnabled)
        {
            return null;
        }

        return await ExecuteWithProviderAsync("anthropic", operation, systemPrompt, userInput, ct).ConfigureAwait(false);
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

        try
        {
            var content = await _retryPipeline.ExecuteAsync(
                    async token => await provider.CompleteAsync(systemPrompt, userInput, token).ConfigureAwait(false),
                    timeoutCts.Token)
                .ConfigureAwait(false);

            return string.IsNullOrWhiteSpace(content) ? null : new LlmResult(content, provider.Name);
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
}

internal sealed class AzureOpenAiLlmProvider : ILlmProvider
{
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

    public async Task<string?> CompleteAsync(string systemPrompt, string userInput, CancellationToken ct = default)
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
            temperature = 0.1,
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
        return content?.Trim();
    }
}

internal sealed class AnthropicLlmProvider : ILlmProvider
{
    private const string AnthropicVersion = "2023-06-01";
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

    public async Task<string?> CompleteAsync(string systemPrompt, string userInput, CancellationToken ct = default)
    {
        if (!IsConfigured)
        {
            return null;
        }

        var endpoint = _options.Anthropic.Endpoint.TrimEnd('/');
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{endpoint}/v1/messages");
        request.Headers.Add("x-api-key", _options.Anthropic.ApiKey);
        request.Headers.Add("anthropic-version", AnthropicVersion);
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
        return text?.Trim();
    }
}
