using System.Text.Json;
using Orqentis.Api.Auth;
using Orqentis.Api.Dtos;
using Orqentis.Api.Services;
using Orqentis.Engine;
using Orqentis.Engine.Odcs;
using Microsoft.AspNetCore.Mvc;

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

    public RunsController(
        IContractStore contractStore,
        IOneLakeTokenBroker tokenBroker,
        IEnforcementOrchestrator orchestrator,
        IOdcsContractParser parser)
    {
        _contractStore = contractStore;
        _tokenBroker = tokenBroker;
        _orchestrator = orchestrator;
        _parser = parser;
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

        var oneLakeToken = await _tokenBroker.GetOneLakeTokenAsync(bearerToken, ct).ConfigureAwait(false);
        var result = await _orchestrator.RunAsync(parseResult.Value, oneLakeToken, ct).ConfigureAwait(false);
        var persisted = await _contractStore.CreateRunAsync(
            new CreateRunCommand(
                contract.ContractId,
                contract.CurrentVersionRecord.VersionId,
                "manual",
                HttpContext.Items[Middleware.CorrelationIdMiddleware.HeaderName]?.ToString() ?? string.Empty,
                result.OverallStatus.ToString().ToLowerInvariant(),
                result.DeltaTableVersion,
                result.BreachScore,
                JsonSerializer.Serialize(result),
                DateTimeOffset.UtcNow,
                result.CompletedAt),
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
            CorrelationId = run.CorrelationId,
            ResultJson = JsonDocument.Parse(run.ResultJson).RootElement.Clone(),
        };

    private static string ToIsoString(DateTimeOffset value) => value.UtcDateTime.ToString("O");
}
