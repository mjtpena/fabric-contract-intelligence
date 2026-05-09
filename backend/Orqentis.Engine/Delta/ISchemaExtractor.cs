using Orqentis.Engine.Common;

namespace Orqentis.Engine.Delta;

/// <summary>Extracts the current Delta schema details from parsed transaction-log commits.</summary>
internal interface ISchemaExtractor
{
    /// <summary>
    /// Extracts the latest schema and partition columns from the provided commits.
    /// </summary>
    /// <param name="commits">Parsed Delta commits ordered arbitrarily.</param>
    /// <returns>The extracted schema details.</returns>
    Result<DeltaSchemaDetails> Extract(IReadOnlyList<TransactionLogCommit> commits);
}

/// <summary>The current schema state described by the latest Delta metadata action.</summary>
internal sealed record DeltaSchemaDetails
{
    public required DeltaSchema Schema { get; init; }

    public required IReadOnlyList<string> PartitionColumns { get; init; }
}
