namespace Orqentis.Data;

/// <summary>
/// Per-request tenant context resolved from the inbound Entra bearer token.
/// Stored in a scoped service so data access can enforce tenant boundaries.
/// </summary>
public interface ITenantContext
{
    Guid TenantId { get; }
    Guid EntraTenantId { get; }
    Guid WorkspaceId { get; }
    string UserObjectId { get; }
    string UserEmail { get; }
    string Tier { get; }
    string CorrelationId { get; }
    bool HasTenant => TenantId != Guid.Empty;
}
