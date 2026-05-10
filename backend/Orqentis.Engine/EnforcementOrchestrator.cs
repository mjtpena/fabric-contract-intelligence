using Microsoft.Extensions.Logging;
using Orqentis.Engine.Delta;
using Orqentis.Engine.Evaluation;
using Orqentis.Engine.Models;
using Orqentis.Engine.Odcs;

namespace Orqentis.Engine;

/// <summary>
/// Sprint 3 deliverable (full impl). Sprint 1 stub: composes the evaluator chain.
/// Reads Delta log → evaluates schema/quality/freshness → aggregates EnforcementResult.
/// </summary>
public sealed class EnforcementOrchestrator : IEnforcementOrchestrator
{
    private readonly IDeltaLogReader _deltaReader;
    private readonly ISchemaRuleEvaluator _schemaEvaluator;
    private readonly IFreshnessEvaluator _freshnessEvaluator;
    private readonly IQualityRuleEvaluator _qualityEvaluator;
    private readonly ILogger<EnforcementOrchestrator> _logger;
    private readonly TimeProvider _clock;

    public EnforcementOrchestrator(
        IDeltaLogReader deltaReader,
        ISchemaRuleEvaluator schemaEvaluator,
        IFreshnessEvaluator freshnessEvaluator,
        IQualityRuleEvaluator qualityEvaluator,
        ILogger<EnforcementOrchestrator> logger,
        TimeProvider? clock = null)
    {
        _deltaReader = deltaReader;
        _schemaEvaluator = schemaEvaluator;
        _freshnessEvaluator = freshnessEvaluator;
        _qualityEvaluator = qualityEvaluator;
        _logger = logger;
        _clock = clock ?? TimeProvider.System;
    }

    public async Task<EnforcementResult> RunAsync(
        ContractDefinition contract,
        string oneLakeOboToken,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(contract);
        ArgumentException.ThrowIfNullOrWhiteSpace(oneLakeOboToken);

        var runId = Guid.NewGuid();
        var contractId = Guid.TryParse(contract.Id.Split(':').Last(), out var g) ? g : Guid.NewGuid();
        var now = _clock.GetUtcNow();

        try
        {
            _logger.LogInformation(
                "Run-Start RunId={RunId} ContractName={Name} Server={Server}",
                runId,
                contract.Name,
                contract.Servers.FirstOrDefault()?.Path);

            var server = contract.Servers.FirstOrDefault()
                ?? throw new InvalidOperationException("Contract has no server entry.");

            var snapshotResult = await _deltaReader.ReadAsync(server.Path, oneLakeOboToken, ct).ConfigureAwait(false);
            if (!snapshotResult.IsSuccess || snapshotResult.Value is null)
            {
                _logger.LogError("Run-Error RunId={RunId} Reason={Reason}", runId, snapshotResult.Error);
                return CreateErrorResult(runId, contractId, now, snapshotResult.Error);
            }

            var snapshot = snapshotResult.Value;
            var schemaRules = _schemaEvaluator.Evaluate(snapshot.Schema, contract.Schema, snapshot.PartitionColumns);
            var freshnessRule = _freshnessEvaluator.Evaluate(snapshot.LastModifiedUtc, contract.Freshness, now);
            var qualityRules = await _qualityEvaluator
                .EvaluateAsync(contract.Quality, server, oneLakeOboToken, ct)
                .ConfigureAwait(false);
            var schemaDiff = SchemaDiff.Compute(snapshot.Schema, contract.Schema, snapshot.PartitionColumns);
            var overall = AggregateStatus(schemaRules, qualityRules, freshnessRule);

            _logger.LogInformation(
                "Run-Complete RunId={RunId} Status={Status} SchemaRules={SchemaCount} QualityRules={QualityCount}",
                runId,
                overall,
                schemaRules.Count,
                qualityRules.Count);

            return new EnforcementResult
            {
                RunId = runId,
                ContractId = contractId,
                OverallStatus = overall,
                DeltaTableVersion = snapshot.Version,
                SchemaRules = schemaRules,
                QualityRules = qualityRules,
                FreshnessRule = freshnessRule,
                SchemaDiff = schemaDiff.IsEmpty ? null : schemaDiff,
                BreachScore = null,
                RemediationSuggestions = [],
                CompletedAt = now,
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Run-Error RunId={RunId} ContractName={Name}", runId, contract.Name);
            return CreateErrorResult(runId, contractId, now, ex.Message);
        }
    }

    private static EnforcementStatus AggregateStatus(
        IReadOnlyList<RuleResult> schema,
        IReadOnlyList<RuleResult> quality,
        RuleResult? freshness)
    {
        var all = schema.Concat(quality);
        if (freshness is not null) all = all.Append(freshness);

        var anyFailed = all.Any(r => r.Status == RuleStatus.Failed);
        if (anyFailed) return EnforcementStatus.Failed;

        var anyWarned = all.Any(r => r.Status == RuleStatus.Warned);
        return anyWarned ? EnforcementStatus.Warned : EnforcementStatus.Passed;
    }

    private static EnforcementResult CreateErrorResult(Guid runId, Guid contractId, DateTimeOffset now, string? errorMessage) =>
        new()
        {
            RunId = runId,
            ContractId = contractId,
            OverallStatus = EnforcementStatus.Error,
            DeltaTableVersion = -1,
            SchemaRules = [],
            QualityRules = [],
            CompletedAt = now,
            RemediationSuggestions = [],
            ErrorMessage = errorMessage,
        };
}
