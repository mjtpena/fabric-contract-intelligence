namespace Orqentis.Engine.Delta;

/// <summary>Point-in-time snapshot of a Delta table derived from its transaction log.</summary>
public sealed record DeltaTableSnapshot
{
    public required long Version { get; init; }

    public required DeltaSchema Schema { get; init; }

    public required IReadOnlyList<string> PartitionColumns { get; init; }

    public required DateTimeOffset LastModifiedUtc { get; init; }
}
