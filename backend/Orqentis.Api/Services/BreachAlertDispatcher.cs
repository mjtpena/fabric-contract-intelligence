using System.Text.Json;
using Microsoft.ApplicationInsights;
using Orqentis.Api.Services.Webhooks;

namespace Orqentis.Api.Services;

public sealed class BreachAlertDispatcher : IBreachAlertDispatcher
{
    private readonly IActivatorClient _activatorClient;
    private readonly IGenericWebhookSender _genericWebhookSender;
    private readonly ISlackWebhookSender _slackWebhookSender;
    private readonly TelemetryClient _telemetryClient;
    private readonly ILogger<BreachAlertDispatcher> _logger;

    public BreachAlertDispatcher(
        IActivatorClient activatorClient,
        IGenericWebhookSender genericWebhookSender,
        ISlackWebhookSender slackWebhookSender,
        TelemetryClient telemetryClient,
        ILogger<BreachAlertDispatcher> logger)
    {
        _activatorClient = activatorClient;
        _genericWebhookSender = genericWebhookSender;
        _slackWebhookSender = slackWebhookSender;
        _telemetryClient = telemetryClient;
        _logger = logger;
    }

    public async Task<AlertDispatchResult> DispatchAsync(AlertDispatchRequest request, CancellationToken ct = default)
    {
        try
        {
            if (request.Policy.ActivatorRuleId.HasValue)
            {
                await _activatorClient.TriggerRuleAsync(
                    request.WorkspaceId,
                    request.Policy.ActivatorRuleId.Value,
                    request.TriggerContext,
                    request.FabricRestToken,
                    ct).ConfigureAwait(false);
                return new AlertDispatchResult(true, "activator");
            }

            var config = ParseConfig(request.Policy.ActionConfigJson);
            var webhookUrl = config.WebhookUrl;
            if (string.IsNullOrWhiteSpace(webhookUrl))
            {
                return new AlertDispatchResult(false, "none");
            }

            if (string.Equals(config.Provider, "slack", StringComparison.OrdinalIgnoreCase))
            {
                await _slackWebhookSender.SendAsync(
                    webhookUrl,
                    $"Orqentis contract breach: {request.TriggerContext.ContractName} | Score={request.TriggerContext.BreachScore?.ToString("0.##") ?? "n/a"} | Run={request.TriggerContext.RunId}",
                    ct).ConfigureAwait(false);
                return new AlertDispatchResult(false, "slack");
            }

            await _genericWebhookSender.SendAsync(
                webhookUrl,
                new
                {
                    contractId = request.TriggerContext.ContractId,
                    contractName = request.TriggerContext.ContractName,
                    tablePath = request.TriggerContext.TablePath,
                    runId = request.TriggerContext.RunId,
                    status = request.TriggerContext.Status,
                    breachScore = request.TriggerContext.BreachScore,
                    violatedRules = request.TriggerContext.ViolatedRules,
                    runUrl = request.TriggerContext.RunUrl,
                },
                ct).ConfigureAwait(false);
            return new AlertDispatchResult(false, "webhook");
        }
        catch (Exception ex)
        {
            _telemetryClient.TrackEvent("Orqentis_Activator_Drop", new Dictionary<string, string>
            {
                ["reason"] = ex.Message,
                ["route"] = request.Policy.ActionType,
            });
            _logger.LogWarning(ex, "AlertDispatch-Dropped PolicyId={PolicyId} ContractId={ContractId}", request.Policy.PolicyId, request.Policy.ContractId);
            return new AlertDispatchResult(false, "drop");
        }
    }

    private static ActionConfig ParseConfig(string rawJson)
    {
        if (string.IsNullOrWhiteSpace(rawJson))
        {
            return new ActionConfig(null, null, false);
        }

        try
        {
            using var document = JsonDocument.Parse(rawJson);
            var root = document.RootElement;
            var webhookUrl = root.TryGetProperty("webhookUrl", out var webhook) ? webhook.GetString() :
                root.TryGetProperty("url", out var url) ? url.GetString() : null;
            var provider = root.TryGetProperty("provider", out var providerElement) ? providerElement.GetString() : null;
            var alertOnWarn = root.TryGetProperty("alertOnWarn", out var alertOnWarnElement) && alertOnWarnElement.GetBoolean();
            return new ActionConfig(webhookUrl, provider, alertOnWarn);
        }
        catch
        {
            return new ActionConfig(null, null, false);
        }
    }

    private sealed record ActionConfig(string? WebhookUrl, string? Provider, bool AlertOnWarn);
}
