using Orqentis.Engine.Odcs.Extensions;

namespace Orqentis.Engine.Odcs;

/// <summary>
/// In-memory representation of an ODCS v3.1.0 contract. Mirrors the YAML 1:1 for the
/// sections Orqentis consumes (spec §6 + sample §6.2).
/// </summary>
public sealed record ContractDefinition
{
    public required string ApiVersion { get; init; }
    public required string Kind { get; init; }
    public required string Id { get; init; }
    public required string Name { get; init; }
    public required string Version { get; init; }
    public required string Status { get; init; }
    public required ContractInfo Info { get; init; }
    public required IReadOnlyList<ContractServer> Servers { get; init; }
    public required IReadOnlyList<ContractColumn> Schema { get; init; }
    public IReadOnlyList<QualityRule> Quality { get; init; } = [];
    public FreshnessRule? Freshness { get; init; }
    public IReadOnlyList<SlaProperty> Sla { get; init; } = [];

    /// <summary>
    /// Optional AI governance context. When set, the contract participates in
    /// Orqentis AI-data security gates (Phase 1 of the data-security-for-AI plan).
    /// </summary>
    public AiContextExtension? AiContext { get; init; }
}

public sealed record ContractInfo
{
    public required string Title { get; init; }
    public string? Description { get; init; }
    public required string Owner { get; init; }
    public IReadOnlyList<ContractContact> Contact { get; init; } = [];
}

public sealed record ContractContact(string Name, string Email, string Role);

public sealed record ContractServer
{
    public required string Name { get; init; }
    public required string Type { get; init; }
    public string? Host { get; init; }
    public required string Path { get; init; }
    public string? Format { get; init; }
    /// <summary>
    /// Optional Fabric workspace GUID that hosts this data store.
    /// When set, enforcement reads schema and runs quality checks in this workspace
    /// instead of the workspace that owns the Orqentis contract item. Use this when
    /// an Eventhouse, Warehouse, or Semantic Model lives in a different workspace.
    /// YAML key: <c>workspaceId</c>.
    /// </summary>
    public Guid? WorkspaceId { get; init; }
}

public sealed record ContractColumn
{
    public required string Name { get; init; }
    public required string Type { get; init; }
    public bool Required { get; init; }
    public bool Unique { get; init; }
    public string? Description { get; init; }
    public bool Pii { get; init; }
    public int? PartitionKeyPosition { get; init; }
}

public sealed record QualityRule
{
    public required string Type { get; init; }
    public string? Column { get; init; }
    public double? Threshold { get; init; }
    public string? Pattern { get; init; }
    public string? Sql { get; init; }
    public required string Severity { get; init; }
}

public sealed record FreshnessRule
{
    public required double MaxAgeHours { get; init; }
    public required string Severity { get; init; }
}

public sealed record SlaProperty
{
    public required string Property { get; init; }
    public required object Value { get; init; }
    public string? Unit { get; init; }
}
