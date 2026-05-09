using Orqentis.Engine.Models;
using Orqentis.Engine.Odcs;

namespace Orqentis.Engine.Evaluation;

/// <summary>Evaluates freshness rules against the latest Delta commit time.</summary>
public interface IFreshnessEvaluator
{
    RuleResult? Evaluate(DateTimeOffset lastModifiedUtc, FreshnessRule? rule, DateTimeOffset nowUtc);
}
