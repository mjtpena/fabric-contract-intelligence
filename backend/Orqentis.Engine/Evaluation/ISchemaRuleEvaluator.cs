using Orqentis.Engine.Models;
using Orqentis.Engine.Odcs;

namespace Orqentis.Engine.Evaluation;

/// <summary>Compares a live Delta schema to the contract schema and emits rule results.</summary>
public interface ISchemaRuleEvaluator
{
    IReadOnlyList<RuleResult> Evaluate(
        Delta.DeltaSchema liveSchema,
        IReadOnlyList<ContractColumn> contractSchema,
        IReadOnlyList<string> livePartitionColumns);
}
