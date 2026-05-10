using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Orqentis.Data;

namespace Orqentis.Api.Auth;

/// <summary>Returns HTTP 402 when a community tenant calls an enterprise-only endpoint.</summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class EnterpriseAttribute : Attribute, IAsyncAuthorizationFilter
{
    /// <inheritdoc />
    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var tenantContext = context.HttpContext.RequestServices.GetRequiredService<ITenantContext>();
        if (string.Equals(tenantContext.Tier, "enterprise", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var problemDetailsService = context.HttpContext.RequestServices.GetRequiredService<IProblemDetailsService>();
        context.HttpContext.Response.StatusCode = StatusCodes.Status402PaymentRequired;

        if (await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = context.HttpContext,
            ProblemDetails =
                {
                    Status = StatusCodes.Status402PaymentRequired,
                    Title = "Enterprise tier required.",
                    Detail = "This endpoint is only available to enterprise tenants.",
                    Type = "https://httpstatuses.com/402",
                },
        }).ConfigureAwait(false))
        {
            context.Result = new EmptyResult();
            return;
        }

        context.Result = new ObjectResult(new ProblemDetails
        {
            Status = StatusCodes.Status402PaymentRequired,
            Title = "Enterprise tier required.",
            Detail = "This endpoint is only available to enterprise tenants.",
            Type = "https://httpstatuses.com/402",
        })
        {
            StatusCode = StatusCodes.Status402PaymentRequired,
        };
    }
}
