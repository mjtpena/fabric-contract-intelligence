using Orqentis.Api.Auth;

using Orqentis.Data;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Orqentis.Api.Middleware;

/// <summary>
/// Resolves the scoped tenant context from JWT claims and the tenants table.
/// </summary>
public sealed class TenantContextMiddleware
{
    private readonly RequestDelegate _next;

    public TenantContextMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(
        HttpContext context,
        HttpTenantContext tenant,
        OrqentisDbContext dbContext,
        IProblemDetailsService problemDetailsService)
    {
        tenant.CorrelationId = (context.Items[CorrelationIdMiddleware.HeaderName] as string) ?? string.Empty;

        if (context.User.Identity?.IsAuthenticated != true)
        {
            await _next(context).ConfigureAwait(false);
            return;
        }

        tenant.EntraTenantId = ParseGuid(context.User.FindFirst("tid")?.Value);
        tenant.UserObjectId = context.User.FindFirst("oid")?.Value ?? string.Empty;
        tenant.UserEmail = context.User.FindFirst("preferred_username")?.Value
            ?? context.User.FindFirst("upn")?.Value
            ?? string.Empty;
        tenant.WorkspaceId = ParseGuid(
            context.Request.Headers["X-Workspace-Id"].FirstOrDefault()
            ?? context.User.FindFirst("workspace_id")?.Value);

        if (tenant.EntraTenantId == Guid.Empty)
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await problemDetailsService.WriteAsync(new ProblemDetailsContext
            {
                HttpContext = context,
                ProblemDetails =
                {
                    Status = StatusCodes.Status403Forbidden,
                    Title = "Tenant claim missing.",
                    Detail = "The access token did not include a valid tenant identifier.",
                    Type = "https://httpstatuses.com/403",
                },
            }).ConfigureAwait(false);
            return;
        }

        var tenantEntity = await dbContext.Tenants
            .AsNoTracking()
            .SingleOrDefaultAsync(
                row => row.EntraTenantId == tenant.EntraTenantId && row.Status == "active",
                context.RequestAborted)
            .ConfigureAwait(false);

        if (tenantEntity is null)
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await problemDetailsService.WriteAsync(new ProblemDetailsContext
            {
                HttpContext = context,
                ProblemDetails =
                {
                    Status = StatusCodes.Status403Forbidden,
                    Title = "Tenant not provisioned.",
                    Detail = "The calling tenant is not registered for Orqentis.",
                    Type = "https://httpstatuses.com/403",
                },
            }).ConfigureAwait(false);
            return;
        }

        tenant.TenantId = tenantEntity.TenantId;
        tenant.Tier = tenantEntity.Tier;

        await _next(context).ConfigureAwait(false);
    }

    private static Guid ParseGuid(string? raw) =>
        Guid.TryParse(raw, out var g) ? g : Guid.Empty;
}
