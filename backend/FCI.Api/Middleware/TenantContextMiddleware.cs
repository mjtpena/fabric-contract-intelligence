using FCI.Api.Auth;

namespace FCI.Api.Middleware;

/// <summary>
/// Populates <see cref="HttpTenantContext"/> from JWT claims:
/// <c>tid</c> = Entra tenant id, <c>oid</c> = user OID, custom <c>workspace_id</c> + <c>tier</c>.
/// Spec §11.
/// </summary>
public sealed class TenantContextMiddleware
{
    private readonly RequestDelegate _next;

    public TenantContextMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, HttpTenantContext tenant)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            tenant.TenantId = ParseGuid(context.User.FindFirst("tid")?.Value);
            tenant.UserObjectId = context.User.FindFirst("oid")?.Value ?? string.Empty;
            tenant.UserEmail = context.User.FindFirst("preferred_username")?.Value
                ?? context.User.FindFirst("upn")?.Value
                ?? string.Empty;
            tenant.WorkspaceId = ParseGuid(
                context.Request.Headers["X-Workspace-Id"].FirstOrDefault()
                ?? context.User.FindFirst("workspace_id")?.Value);
            tenant.Tier = context.User.FindFirst("tier")?.Value ?? "community";
        }

        tenant.CorrelationId = (context.Items[CorrelationIdMiddleware.HeaderName] as string) ?? string.Empty;

        await _next(context).ConfigureAwait(false);
    }

    private static Guid ParseGuid(string? raw) =>
        Guid.TryParse(raw, out var g) ? g : Guid.Empty;
}
