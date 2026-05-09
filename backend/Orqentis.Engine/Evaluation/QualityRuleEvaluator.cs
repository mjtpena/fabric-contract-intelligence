using Orqentis.Engine.Models;
using Orqentis.Engine.Odcs;
using Microsoft.Extensions.Logging;

namespace Orqentis.Engine.Evaluation;

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
