namespace FCI.Engine.Models;

/// <summary>
/// Structured delta between live Delta schema and a contract's schema.
/// Computed by the orchestrator after schema rule evaluation.
/// </summary>
public sealed record SchemaDiff
{
    public required IReadOnlyList<string> AddedColumns { get; init; }
    public required IReadOnlyList<string> RemovedColumns { get; init; }
    public required IReadOnlyList<TypeChange> TypeChanges { get; init; }
    public required IReadOnlyList<NullabilityChange> NullabilityChanges { get; init; }
    public PartitionChange? PartitionChange { get; init; }

    public static SchemaDiff Empty { get; } = new()
    {
        AddedColumns = [],
        RemovedColumns = [],
        TypeChanges = [],
        NullabilityChanges = [],
        PartitionChange = null
    };
}

public sealed record TypeChange(string Column, string ExpectedType, string ActualType);
public sealed record NullabilityChange(string Column, bool ExpectedRequired, bool ActualRequired);
public sealed record PartitionChange(IReadOnlyList<string> Expected, IReadOnlyList<string> Actual);
