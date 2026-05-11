namespace Orqentis.Api.Dtos;

/// <summary>Workspace summary returned by the workspace listing endpoint.</summary>
public sealed record WorkspaceSummaryDto
{
    public required Guid Id { get; init; }
    public required string Name { get; init; }
    public required string Tier { get; init; }
}

/// <summary>Minimal Delta table descriptor for workspace table browsing.</summary>
public sealed record WorkspaceTableDto
{
    public required string Name { get; init; }
    public required string Path { get; init; }
    public required string Format { get; init; }
}

/// <summary>Lakehouse item proxied from the Fabric REST API.</summary>
public sealed record FabricLakehouseDto
{
    public required Guid Id { get; init; }
    public required string DisplayName { get; init; }
    public required Guid WorkspaceId { get; init; }
}

/// <summary>Delta/Parquet table proxied from the Fabric Lakehouse tables API.</summary>
public sealed record FabricTableDto
{
    public required string Name { get; init; }
    public required string Type { get; init; }
    public required string Location { get; init; }
}
