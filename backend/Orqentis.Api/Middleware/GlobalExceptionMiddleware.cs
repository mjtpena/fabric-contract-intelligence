using Microsoft.AspNetCore.Mvc.Infrastructure;

namespace Orqentis.Api.Middleware;

/// <summary>Converts unhandled exceptions to RFC 7807 responses.</summary>
public sealed class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;
    private readonly IProblemDetailsService _problemDetailsService;

    public GlobalExceptionMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionMiddleware> logger,
        IProblemDetailsService problemDetailsService)
    {
        _next = next;
        _logger = logger;
        _problemDetailsService = problemDetailsService;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            var correlationId = context.Items[CorrelationIdMiddleware.HeaderName] as string ?? string.Empty;
            _logger.LogError(ex, "Request-Failed CorrelationId={CorrelationId}", correlationId);

            if (context.Response.HasStarted)
            {
                return;
            }

            context.Response.Clear();
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;

            await _problemDetailsService.WriteAsync(new ProblemDetailsContext
            {
                HttpContext = context,
                ProblemDetails =
                {
                    Status = StatusCodes.Status500InternalServerError,
                    Title = "An unexpected error occurred.",
                    Detail = "The request could not be completed.",
                    Type = "https://httpstatuses.com/500",
                },
            }).ConfigureAwait(false);
        }
    }
}
