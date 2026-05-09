using FCI.Data;

namespace FCI.Api.Auth;

/// <summary>Per-request tenant context resolved from JWT claims by <see cref="Middleware.TenantContextMiddleware"/>.</summary>
public sealed class HttpTenantContext : ITenantContext
{
    public Guid TenantId { get; internal set; }
    public Guid WorkspaceId { get; internal set; }
    public string UserObjectId { get; internal set; } = string.Empty;
    public string UserEmail { get; internal set; } = string.Empty;
    public string Tier { get; internal set; } = "community";
    public string CorrelationId { get; internal set; } = string.Empty;
}
