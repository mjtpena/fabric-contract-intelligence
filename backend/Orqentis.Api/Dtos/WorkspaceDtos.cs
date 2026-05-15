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

/// <summary>API key descriptor returned by the list endpoint (never includes the raw key).</summary>
public sealed record WorkspaceApiKeyDto
{
    public required Guid Id { get; init; }
    public required string DisplayName { get; init; }
    public required string KeyHint { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
    public required DateTimeOffset? LastUsedAt { get; init; }
}

/// <summary>Returned once after key creation — <see cref="RawKey"/> is never stored.</summary>
public sealed record CreateApiKeyResponse
{
    public required Guid Id { get; init; }
    public required string DisplayName { get; init; }
    public required string KeyHint { get; init; }
    public required string RawKey { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
}

/// <summary>Request body for key creation.</summary>
public sealed record CreateApiKeyRequest
{
    public required string DisplayName { get; init; }
}

public sealed record FabricLakehouseDto
{
    public required Guid Id { get; init; }
    public required string DisplayName { get; init; }
    public required Guid WorkspaceId { get; init; }
}

/// <summary>Fabric item returned by the generic target picker proxy.</summary>
public sealed record FabricItemDto
{
    public required Guid Id { get; init; }
    public required string DisplayName { get; init; }
    public required string Type { get; init; }
    public required Guid WorkspaceId { get; init; }
}

/// <summary>Delta/Parquet table proxied from the Fabric Lakehouse tables API.</summary>
public sealed record FabricTableDto
{
    public required string Name { get; init; }
    public required string Type { get; init; }
    public required string Location { get; init; }
}
