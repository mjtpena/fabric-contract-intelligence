namespace Orqentis.Engine.Delta;

/// <summary>Single Delta column definition extracted from the schema string.</summary>
public sealed record DeltaColumn
{
    public required string Name { get; init; }

    public required string Type { get; init; }

    public required bool Nullable { get; init; }

    public IReadOnlyDictionary<string, string>? Metadata { get; init; }
}
