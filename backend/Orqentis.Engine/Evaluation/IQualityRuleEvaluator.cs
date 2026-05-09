using Orqentis.Engine.Models;
using Orqentis.Engine.Odcs;

namespace Orqentis.Engine.Evaluation;

/// <summary>
/// Sprint 7 deliverable. Evaluates quality rules via the Fabric SQL endpoint.
/// Stubbed in Sprint 1 so the orchestrator interface is complete.
/// </summary>
public interface IQualityRuleEvaluator
{
    Task<IReadOnlyList<RuleResult>> EvaluateAsync(
        IReadOnlyList<QualityRule> rules,
        ContractServer server,
        string fabricSqlOboToken,
        CancellationToken ct = default);
}
