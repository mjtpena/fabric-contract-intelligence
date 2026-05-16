using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Orqentis.Api.Auth;

namespace Orqentis.Api.Middleware;

/// <summary>Requires and parses the Fabric workspace context for authenticated API requests.</summary>
public sealed class WorkspaceContextMiddleware
{
    public const string WorkspaceIdItemKey = "WorkspaceId";
    public const string WorkspaceIdHeaderName = "X-Workspace-Id";

    private readonly RequestDelegate _next;

    public WorkspaceContextMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(
        HttpContext context,
        HttpTenantContext tenant,
        IProblemDetailsService problemDetailsService)
    {
        if (context.Request.Path.StartsWithSegments("/health") ||
            context.Request.Path.StartsWithSegments("/healthz") ||
            context.User.Identity?.IsAuthenticated != true ||
            context.GetEndpoint()?.Metadata.GetMetadata<IAllowAnonymous>() is not null)
        {
            await _next(context).ConfigureAwait(false);
            return;
        }

        var rawWorkspaceId = context.Request.Headers[WorkspaceIdHeaderName].FirstOrDefault();
        if (!Guid.TryParse(rawWorkspaceId, out var workspaceId) || workspaceId == Guid.Empty)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await problemDetailsService.WriteAsync(new ProblemDetailsContext
            {
                HttpContext = context,
                ProblemDetails =
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Workspace context missing.",
                    Detail = $"A valid {WorkspaceIdHeaderName} header is required for authenticated requests.",
                    Type = "https://httpstatuses.com/400",
                },
            }).ConfigureAwait(false);
            return;
        }

        context.Items[WorkspaceIdItemKey] = workspaceId;
        tenant.WorkspaceId = workspaceId;
        await _next(context).ConfigureAwait(false);
    }
}
