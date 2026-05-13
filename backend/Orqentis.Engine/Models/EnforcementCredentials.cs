namespace Orqentis.Engine.Models;

/// <summary>Delegated downstream tokens used by target-specific enforcement adapters.</summary>
public sealed record EnforcementCredentials
{
    public string? OneLakeToken { get; init; }
    public string? FabricRestToken { get; init; }
    public string? FabricSqlToken { get; init; }
    public string? KustoToken { get; init; }
}

/// <summary>Fabric target identity required by control-plane metadata adapters.</summary>
public sealed record EnforcementTargetContext
{
    public required Guid WorkspaceId { get; init; }
    public required Guid TargetItemId { get; init; }
    public required string TargetType { get; init; }
}
