namespace Orqentis.Engine.Delta;

/// <summary>Delta schema extracted from a transaction-log metadata action.</summary>
public sealed record DeltaSchema
{
    public required IReadOnlyList<DeltaColumn> Columns { get; init; }
}
