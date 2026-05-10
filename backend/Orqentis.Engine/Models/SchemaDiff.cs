using System.Text.Json.Serialization;
using Orqentis.Engine.Delta;
using Orqentis.Engine.Odcs;

namespace Orqentis.Engine.Models;

/// <summary>
/// Structured delta between live Delta schema and a contract's schema.
/// Computed by the orchestrator after schema rule evaluation.
/// </summary>
public sealed record SchemaDiff
{
    [JsonPropertyName("addedColumns")]
    public required IReadOnlyList<string> AddedColumns { get; init; }

    [JsonPropertyName("removedColumns")]
    public required IReadOnlyList<string> RemovedColumns { get; init; }

    [JsonPropertyName("typeChanges")]
    public required IReadOnlyList<TypeChange> TypeChanges { get; init; }

    [JsonPropertyName("nullabilityChanges")]
    public required IReadOnlyList<NullabilityChange> NullabilityChanges { get; init; }

    [JsonPropertyName("partitionChange")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public PartitionChange? PartitionChange { get; init; }

    public static SchemaDiff Empty { get; } = new()
    {
        AddedColumns = [],
        RemovedColumns = [],
        TypeChanges = [],
        NullabilityChanges = [],
        PartitionChange = null
    };

    [JsonIgnore]
    public bool IsEmpty =>
        AddedColumns.Count == 0 &&
        RemovedColumns.Count == 0 &&
        TypeChanges.Count == 0 &&
        NullabilityChanges.Count == 0 &&
        PartitionChange is null;

    public static SchemaDiff Compute(
        DeltaSchema liveSchema,
        IReadOnlyList<ContractColumn> contractSchema,
        IReadOnlyList<string> livePartitionColumns)
    {
        ArgumentNullException.ThrowIfNull(liveSchema);
        ArgumentNullException.ThrowIfNull(contractSchema);
        ArgumentNullException.ThrowIfNull(livePartitionColumns);

        var liveLookup = liveSchema.Columns.ToDictionary(static column => column.Name, StringComparer.OrdinalIgnoreCase);
        var contractLookup = contractSchema.ToDictionary(static column => column.Name, StringComparer.OrdinalIgnoreCase);

        var addedColumns = liveSchema.Columns
            .Where(column => !contractLookup.ContainsKey(column.Name))
            .Select(static column => column.Name)
            .ToArray();

        var removedColumns = contractSchema
            .Where(column => !liveLookup.ContainsKey(column.Name))
            .Select(static column => column.Name)
            .ToArray();

        var typeChanges = contractSchema
            .Where(column => liveLookup.TryGetValue(column.Name, out _))
            .Select(column =>
            {
                var liveColumn = liveLookup[column.Name];
                return (column, liveColumn);
            })
            .Where(static pair => !string.Equals(NormalizeType(pair.column.Type), NormalizeType(pair.liveColumn.Type), StringComparison.Ordinal))
            .Select(static pair => new TypeChange(pair.column.Name, NormalizeType(pair.column.Type), NormalizeType(pair.liveColumn.Type)))
            .ToArray();

        var nullabilityChanges = contractSchema
            .Where(column => liveLookup.TryGetValue(column.Name, out _))
            .Select(column =>
            {
                var liveColumn = liveLookup[column.Name];
                return (column, liveColumn);
            })
            .Where(static pair => pair.column.Required == pair.liveColumn.Nullable)
            .Select(static pair => new NullabilityChange(pair.column.Name, pair.column.Required, !pair.liveColumn.Nullable))
            .ToArray();

        var expectedPartitionColumns = contractSchema
            .Where(static column => column.PartitionKeyPosition is > 0)
            .OrderBy(static column => column.PartitionKeyPosition)
            .Select(static column => column.Name)
            .ToArray();

        PartitionChange? partitionChange = null;
        if (expectedPartitionColumns.Length > 0 &&
            !expectedPartitionColumns.SequenceEqual(livePartitionColumns, StringComparer.OrdinalIgnoreCase))
        {
            partitionChange = new PartitionChange(expectedPartitionColumns, livePartitionColumns.ToArray());
        }

        return new SchemaDiff
        {
            AddedColumns = addedColumns,
            RemovedColumns = removedColumns,
            TypeChanges = typeChanges,
            NullabilityChanges = nullabilityChanges,
            PartitionChange = partitionChange,
        };
    }

    private static string NormalizeType(string type) =>
        type.Trim().ToUpperInvariant() switch
        {
            "INT" => "INTEGER",
            "BOOL" => "BOOLEAN",
            _ => type.Trim().ToUpperInvariant(),
        };
}

public sealed record TypeChange(
    [property: JsonPropertyName("column")] string Column,
    [property: JsonPropertyName("expectedType")] string ExpectedType,
    [property: JsonPropertyName("actualType")] string ActualType);

public sealed record NullabilityChange(
    [property: JsonPropertyName("column")] string Column,
    [property: JsonPropertyName("expectedRequired")] bool ExpectedRequired,
    [property: JsonPropertyName("actualRequired")] bool ActualRequired);

public sealed record PartitionChange(
    [property: JsonPropertyName("expected")] IReadOnlyList<string> Expected,
    [property: JsonPropertyName("actual")] IReadOnlyList<string> Actual);
