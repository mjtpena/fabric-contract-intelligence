using FCI.Data;
using Microsoft.AspNetCore.Authorization;

namespace FCI.Api.Auth;

/// <summary>
/// Spec §16.1 / copilot-instructions §3.6 — features gated to Enterprise tier MUST emit 402.
/// </summary>
public sealed class EnterpriseTierRequirement : IAuthorizationRequirement;

public sealed class EnterpriseTierHandler : AuthorizationHandler<EnterpriseTierRequirement>
{
    private readonly ITenantContext _tenant;

    public EnterpriseTierHandler(ITenantContext tenant) => _tenant = tenant;

    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context, EnterpriseTierRequirement requirement)
    {
        if (string.Equals(_tenant.Tier, "enterprise", StringComparison.OrdinalIgnoreCase))
        {
            context.Succeed(requirement);
        }
        return Task.CompletedTask;
    }
}
