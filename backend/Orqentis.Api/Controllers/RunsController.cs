using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Orqentis.AI;
using Orqentis.Api.Auth;
using Orqentis.Api.Dtos;
using Orqentis.Api.Services;
using Orqentis.Data;
using Orqentis.Data.Entities;
using Orqentis.Engine;
using Orqentis.Engine.Models;
using Orqentis.Engine.Odcs;

namespace Orqentis.Api.Controllers;

/// <summary>Manual trigger and read endpoints for enforcement runs.</summary>
[ApiController]
[Route("v1")]
public sealed class RunsController : ControllerBase
{
    private readonly IContractStore _contractStore;
    private readonly IOneLakeTokenBroker _tokenBroker;
    private readonly IEnforcementOrchestrator _orchestrator;
    private readonly IOdcsContractParser _parser;
    private readonly OrqentisDbContext _dbContext;
    private readonly IBreachImpactScorer _breachImpactScorer;
    private readonly IRemediationAdvisor _remediationAdvisor;
    private readonly IBreachAlertDispatcher _alertDispatcher;

    public RunsController(
        IContractStore contractStore,
        IOneLakeTokenBroker tokenBroker,
        IEnforcementOrchestrator orchestrator,
        OrqentisDbContext dbContext,
        IOdcsContractParser parser,
        IBreachImpactScorer breachImpactScorer,
        IRemediationAdvisor remediationAdvisor,
        IBreachAlertDispatcher alertDispatcher)
    {
        _contractStore = contractStore;
        _tokenBroker = tokenBroker;
        _orchestrator = orchestrator;
        _dbContext = dbContext;
        _parser = parser;
        _breachImpactScorer = breachImpactScorer;
        _remediationAdvisor = remediationAdvisor;
        _alertDispatcher = alertDispatcher;
    }

    /// <summary>Runs contract enforcement immediately and persists the resulting run record.</summary>
    [HttpPost("contracts/{id:guid}/runs")]
    [ProducesResponseType(typeof(RunAcceptedDto), StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RunAcceptedDto>> CreateRunAsync(Guid id, CancellationToken ct)
    {
        var contract = await _contractStore.GetAsync(id, ct).ConfigureAwait(false);
        if (contract?.CurrentVersionRecord is null)
        {
            return Problem(statusCode: StatusCodes.Status404NotFound, title: "Contract not found.");
        }

        var bearerToken = GetBearerToken();
        if (string.IsNullOrWhiteSpace(bearerToken))
        {
            return Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title: "Bearer token missing.",
                detail: "An inbound bearer token is required for OBO exchange.");
        }

        var parseResult = _parser.Parse(contract.CurrentVersionRecord.OdcsYaml);
        if (!parseResult.IsSuccess || parseResult.Value is null)
        {
            return Problem(
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Stored contract is invalid.",
                detail: parseResult.Error ?? "The persisted contract YAML could not be parsed.");
        }

        var format = NormalizeFormat(parseResult.Value.Servers.FirstOrDefault()?.Format);
        var credentials = await GetCredentialsAsync(format, bearerToken, ct).ConfigureAwait(false);
        var targetContext = contract.FabricItemId is null
            ? null
            : new EnforcementTargetContext
            {
                WorkspaceId = contract.WorkspaceId,
                TargetItemId = contract.FabricItemId.Value,
                TargetType = contract.TargetType,
            };
        var result = await _orchestrator.RunAsync(parseResult.Value, credentials, targetContext, ct).ConfigureAwait(false);
        var breachScore = await _breachImpactScorer.ScoreAsync(result, parseResult.Value, ct).ConfigureAwait(false);
        var remediationSuggestions = await _remediationAdvisor.SuggestAsync(result, parseResult.Value, ct).ConfigureAwait(false);
        var breakdownJson = breachScore is null
            ? null
            : JsonSerializer.Serialize(new
            {
                model = breachScore.ModelUsed,
                reasons = breachScore.Reasons,
                factors = breachScore.Breakdown,
            });

        var persistedResult = result with
        {
            BreachScore = breachScore?.Score,
            RemediationSuggestions = remediationSuggestions,
        };

        var shouldDispatchAlert = await ShouldDispatchAlertAsync(contract.ContractId, persistedResult, ct).ConfigureAwait(false);
        var activatorTriggered = false;
        if (shouldDispatchAlert.Policy is not null)
        {
            var fabricToken = await _tokenBroker.GetFabricRestTokenAsync(bearerToken, ct).ConfigureAwait(false);
            var alertResult = await _alertDispatcher.DispatchAsync(
                new AlertDispatchRequest(
                    shouldDispatchAlert.WorkspaceId,
                    shouldDispatchAlert.Policy,
                    BuildTriggerContext(contract, parseResult.Value, persistedResult),
                    fabricToken),
                ct).ConfigureAwait(false);
            activatorTriggered = alertResult.ActivatorTriggered;
        }

        var persisted = await _contractStore.CreateRunAsync(
            new CreateRunCommand(
                contract.ContractId,
                contract.CurrentVersionRecord.VersionId,
                "manual",
                HttpContext.Items[Middleware.CorrelationIdMiddleware.HeaderName]?.ToString() ?? string.Empty,
                persistedResult.OverallStatus.ToString().ToLowerInvariant(),
                persistedResult.DeltaTableVersion,
                persistedResult.BreachScore,
                breakdownJson,
                activatorTriggered,
                JsonSerializer.Serialize(persistedResult),
                DateTimeOffset.UtcNow,
                persistedResult.CompletedAt),
            ct).ConfigureAwait(false);

        if (persisted is null)
        {
            return Problem(statusCode: StatusCodes.Status404NotFound, title: "Contract not found.");
        }

        return Accepted(
            $"/v1/runs/{persisted.RunId}",
            new RunAcceptedDto
            {
                RunId = persisted.RunId,
                ContractId = id,
                Status = "accepted",
            });
    }

    /// <summary>Lists persisted runs for a contract.</summary>
    [HttpGet("contracts/{id:guid}/runs")]
    [ProducesResponseType(typeof(IReadOnlyList<RunSummaryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<RunSummaryDto>>> ListRunsAsync(Guid id, CancellationToken ct)
    {
        var runs = await _contractStore.ListRunsAsync(id, ct).ConfigureAwait(false);
        return Ok(runs.Select(MapSummary).ToArray());
    }

    /// <summary>Gets one persisted enforcement run.</summary>
    [HttpGet("runs/{runId:guid}", Name = nameof(GetRunAsync))]
    [ProducesResponseType(typeof(RunDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RunDetailDto>> GetRunAsync(Guid runId, CancellationToken ct)
    {
        var run = await _contractStore.GetRunAsync(runId, ct).ConfigureAwait(false);
        return run is null
            ? Problem(statusCode: StatusCodes.Status404NotFound, title: "Run not found.")
            : Ok(MapDetail(run));
    }

    private string? GetBearerToken()
    {
        if (!Request.Headers.TryGetValue("Authorization", out var authorization))
        {
            return null;
        }

        const string prefix = "Bearer ";
        var headerValue = authorization.ToString();
        return headerValue.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
            ? headerValue[prefix.Length..].Trim()
            : null;
    }

    private async Task<EnforcementCredentials> GetCredentialsAsync(string format, string bearerToken, CancellationToken ct) =>
        format switch
        {
            "delta" => new EnforcementCredentials
            {
                OneLakeToken = await _tokenBroker.GetOneLakeTokenAsync(bearerToken, ct).ConfigureAwait(false),
                FabricSqlToken = await _tokenBroker.GetFabricSqlTokenAsync(bearerToken, ct).ConfigureAwait(false),
            },
            "sql" => new EnforcementCredentials
            {
                FabricRestToken = await _tokenBroker.GetFabricRestTokenAsync(bearerToken, ct).ConfigureAwait(false),
                FabricSqlToken = await _tokenBroker.GetFabricSqlTokenAsync(bearerToken, ct).ConfigureAwait(false),
            },
            "kql" => new EnforcementCredentials
            {
                FabricRestToken = await _tokenBroker.GetFabricRestTokenAsync(bearerToken, ct).ConfigureAwait(false),
                KustoToken = await _tokenBroker.GetKustoTokenAsync(bearerToken, ct).ConfigureAwait(false),
            },
            "semantic_model" => new EnforcementCredentials
            {
                FabricRestToken = await _tokenBroker.GetFabricRestTokenAsync(bearerToken, ct).ConfigureAwait(false),
            },
            _ => new EnforcementCredentials
            {
                FabricRestToken = await _tokenBroker.GetFabricRestTokenAsync(bearerToken, ct).ConfigureAwait(false),
            },
        };

    private static string NormalizeFormat(string? format) =>
        string.IsNullOrWhiteSpace(format)
            ? "delta"
            : format.Trim().Replace("-", "_", StringComparison.Ordinal).ToLowerInvariant();

    private static RunSummaryDto MapSummary(EnforcementRunRecord run) =>
        new()
        {
            Id = run.RunId,
            ContractId = run.ContractId,
            VersionId = run.VersionId,
            Status = run.Status,
            TriggeredBy = run.TriggeredBy,
            TriggeredAt = ToIsoString(run.TriggeredAt),
            CompletedAt = run.CompletedAt is null ? null : ToIsoString(run.CompletedAt.Value),
            CorrelationId = run.CorrelationId,
            ActivatorTriggered = run.ActivatorTriggered,
        };

    private static RunDetailDto MapDetail(EnforcementRunRecord run) =>
        new()
        {
            Id = run.RunId,
            ContractId = run.ContractId,
            VersionId = run.VersionId,
            Status = run.Status,
            TriggeredBy = run.TriggeredBy,
            TriggeredAt = ToIsoString(run.TriggeredAt),
            CompletedAt = run.CompletedAt is null ? null : ToIsoString(run.CompletedAt.Value),
            DeltaTableVersion = run.DeltaTableVersion,
            BreachScore = run.BreachScore,
            BreachScoreBreakdown = string.IsNullOrWhiteSpace(run.BreachScoreBreakdownJson)
                ? null
                : JsonDocument.Parse(run.BreachScoreBreakdownJson).RootElement.Clone(),
            CorrelationId = run.CorrelationId,
            ActivatorTriggered = run.ActivatorTriggered,
            ResultJson = JsonDocument.Parse(run.ResultJson).RootElement.Clone(),
        };

    private async Task<(ContractPolicy? Policy, Guid WorkspaceId)> ShouldDispatchAlertAsync(
        Guid contractId,
        EnforcementResult result,
        CancellationToken ct)
    {
        var policyWithWorkspace = await (
            from policy in _dbContext.ContractPolicies.AsNoTracking()
            join contract in _dbContext.Contracts.AsNoTracking() on policy.ContractId equals contract.ContractId
            where policy.ContractId == contractId && policy.Enabled
            orderby policy.UpdatedAt descending
            select new { policy, contract.WorkspaceId })
            .FirstOrDefaultAsync(ct)
            .ConfigureAwait(false);

        if (policyWithWorkspace is null)
        {
            return (null, Guid.Empty);
        }

        var status = result.OverallStatus;
        var alertOnWarn = false;
        if (!string.IsNullOrWhiteSpace(policyWithWorkspace.policy.ActionConfigJson))
        {
            try
            {
                using var doc = JsonDocument.Parse(policyWithWorkspace.policy.ActionConfigJson);
                alertOnWarn = doc.RootElement.TryGetProperty("alertOnWarn", out var node) && node.GetBoolean();
            }
            catch
            {
                alertOnWarn = false;
            }
        }

        var policyAllows = status == EnforcementStatus.Failed
            || (status == EnforcementStatus.Warned && alertOnWarn);
        return policyAllows
            ? (policyWithWorkspace.policy, policyWithWorkspace.WorkspaceId)
            : (null, policyWithWorkspace.WorkspaceId);
    }

    private static ActivatorTriggerContext BuildTriggerContext(
        ContractRecord contract,
        ContractDefinition contractDefinition,
        EnforcementResult result)
    {
        var violatedRules = result.SchemaRules.Count(rule => rule.Status is RuleStatus.Failed or RuleStatus.Warned)
            + result.QualityRules.Count(rule => rule.Status is RuleStatus.Failed or RuleStatus.Warned)
            + (result.FreshnessRule is not null && (result.FreshnessRule.Status is RuleStatus.Failed or RuleStatus.Warned) ? 1 : 0);
        return new ActivatorTriggerContext(
            contract.ContractId,
            contract.Name,
            contractDefinition.Servers.FirstOrDefault()?.Path ?? string.Empty,
            result.RunId,
            result.OverallStatus.ToString().ToLowerInvariant(),
            result.BreachScore,
            violatedRules,
            $"https://app.fabric.microsoft.com/groups/{contract.WorkspaceId}/orqentis/runs/{result.RunId}");
    }

    private static string ToIsoString(DateTimeOffset value) => value.UtcDateTime.ToString("O");
}
