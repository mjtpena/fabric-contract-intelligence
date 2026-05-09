using FCI.Engine.Models;

namespace FCI.Engine.Evaluation;

/// <summary>Sprint 3 deliverable. Compares Delta schema against contract schema.</summary>
public interface ISchemaRuleEvaluator
{
    IReadOnlyList<RuleResult> Evaluate(
        Delta.DeltaSchema liveSchema,
        IReadOnlyList<Odcs.ContractColumn> contractSchema,
        IReadOnlyList<string> livePartitionColumns);
}

/// <summary>Sprint 3 deliverable. Evaluates freshness against latest commit timestamp.</summary>
public interface IFreshnessEvaluator
{
    RuleResult? Evaluate(DateTimeOffset lastModifiedUtc, Odcs.FreshnessRule? rule, DateTimeOffset nowUtc);
}

/// <summary>
/// Sprint 7 deliverable. Evaluates quality rules via the Fabric SQL endpoint.
/// Stubbed in Sprint 1 so the orchestrator interface is complete.
/// </summary>
public interface IQualityRuleEvaluator
{
    Task<IReadOnlyList<RuleResult>> EvaluateAsync(
        IReadOnlyList<Odcs.QualityRule> rules,
        Odcs.ContractServer server,
        string fabricSqlOboToken,
        CancellationToken ct = default);
}
