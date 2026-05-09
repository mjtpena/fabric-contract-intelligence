using FCI.Engine.Models;
using FCI.Engine.Odcs;
using Microsoft.Extensions.Logging;

namespace FCI.Engine.Evaluation;

/// <summary>Sprint 3 deliverable. Stub today returns no rules so the orchestrator is exercisable.</summary>
public sealed class SchemaRuleEvaluator : ISchemaRuleEvaluator
{
    private readonly ILogger<SchemaRuleEvaluator> _logger;

    public SchemaRuleEvaluator(ILogger<SchemaRuleEvaluator> logger) => _logger = logger;

    public IReadOnlyList<RuleResult> Evaluate(
        Delta.DeltaSchema liveSchema,
        IReadOnlyList<ContractColumn> contractSchema,
        IReadOnlyList<string> livePartitionColumns)
    {
        ArgumentNullException.ThrowIfNull(liveSchema);
        ArgumentNullException.ThrowIfNull(contractSchema);

        // TODO(sprint-03): implement spec §9.4 schema rules.
        _logger.LogWarning("SchemaRuleEvaluator not implemented (sprint-03 deliverable).");
        return [];
    }
}

/// <summary>Sprint 3 deliverable. Stub.</summary>
public sealed class FreshnessEvaluator : IFreshnessEvaluator
{
    private readonly ILogger<FreshnessEvaluator> _logger;

    public FreshnessEvaluator(ILogger<FreshnessEvaluator> logger) => _logger = logger;

    public RuleResult? Evaluate(DateTimeOffset lastModifiedUtc, FreshnessRule? rule, DateTimeOffset nowUtc)
    {
        if (rule is null) return null;

        // TODO(sprint-03): real evaluation.
        _logger.LogWarning("FreshnessEvaluator not implemented (sprint-03 deliverable).");
        return new RuleResult
        {
            RuleId = "freshness.max_age",
            Status = RuleStatus.Skipped,
            Message = "FreshnessEvaluator stub. See sprint-03.",
            Expected = rule.MaxAgeHours,
            Actual = (nowUtc - lastModifiedUtc).TotalHours,
        };
    }
}

/// <summary>Sprint 7 deliverable. Stub returns empty list so the orchestrator works end-to-end now.</summary>
public sealed class QualityRuleEvaluator : IQualityRuleEvaluator
{
    private readonly ILogger<QualityRuleEvaluator> _logger;

    public QualityRuleEvaluator(ILogger<QualityRuleEvaluator> logger) => _logger = logger;

    public Task<IReadOnlyList<RuleResult>> EvaluateAsync(
        IReadOnlyList<QualityRule> rules,
        ContractServer server,
        string fabricSqlOboToken,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(rules);
        // TODO(sprint-07): connect to Fabric SQL endpoint, build aggregate SQL, evaluate.
        _logger.LogWarning("QualityRuleEvaluator not implemented (sprint-07 deliverable).");
        return Task.FromResult<IReadOnlyList<RuleResult>>([]);
    }
}
