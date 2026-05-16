using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Polly;

namespace Orqentis.Api.Services;

public sealed class ActivatorClient : IActivatorClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ActivatorClient> _logger;
    private readonly ResiliencePipeline _pipeline;

    public ActivatorClient(HttpClient httpClient, ILogger<ActivatorClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _pipeline = new ResiliencePipelineBuilder()
            .AddRetry(new Polly.Retry.RetryStrategyOptions
            {
                MaxRetryAttempts = 3,
                Delay = TimeSpan.FromSeconds(1),
                BackoffType = Polly.DelayBackoffType.Exponential,
                UseJitter = true,
                ShouldHandle = new PredicateBuilder()
                    .Handle<HttpRequestException>()
                    .Handle<TaskCanceledException>(),
            })
            .Build();
    }

    public async Task TriggerRuleAsync(
        Guid workspaceId,
        Guid ruleId,
        ActivatorTriggerContext context,
        string fabricRestToken,
        CancellationToken ct = default)
    {
        var url = $"https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/reflex/rules/{ruleId}/trigger";
        var jsonPayload = JsonSerializer.Serialize(new
        {
            context = new
            {
                contractId = context.ContractId,
                contractName = context.ContractName,
                tablePath = context.TablePath,
                runId = context.RunId,
                status = context.Status,
                breachScore = context.BreachScore,
                violatedRules = context.ViolatedRules,
                runUrl = context.RunUrl,
            },
        });

        await _pipeline.ExecuteAsync(async token =>
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", fabricRestToken);
            request.Content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
            using var response = await _httpClient.SendAsync(request, token).ConfigureAwait(false);
            if (!response.IsSuccessStatusCode)
            {
                throw new HttpRequestException($"Activator trigger failed with status {(int)response.StatusCode}.");
            }
        }, ct).ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<ActivatorRuleSummary>> ListRulesAsync(
        Guid workspaceId,
        string fabricRestToken,
        CancellationToken ct = default)
    {
        var url = $"https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/reflex/rules";
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", fabricRestToken);

        using var response = await _httpClient.SendAsync(request, ct).ConfigureAwait(false);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Activator-ListRulesFailed StatusCode={StatusCode}", (int)response.StatusCode);
            return [];
        }

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct).ConfigureAwait(false));
        if (!document.RootElement.TryGetProperty("value", out var value) || value.ValueKind != JsonValueKind.Array)
        {
            return [];
        }

        return value.EnumerateArray()
            .Select(item =>
            {
                var id = item.TryGetProperty("id", out var idElement) ? idElement.GetString() : null;
                var name = item.TryGetProperty("displayName", out var nameElement)
                    ? nameElement.GetString()
                    : item.TryGetProperty("name", out var fallbackName) ? fallbackName.GetString() : "Activator Rule";
                return Guid.TryParse(id, out var parsedId)
                    ? new ActivatorRuleSummary(parsedId, name ?? "Activator Rule")
                    : null;
            })
            .Where(rule => rule is not null)
            .Cast<ActivatorRuleSummary>()
            .ToArray();
    }
}
