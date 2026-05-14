using Microsoft.AspNetCore.Mvc.Infrastructure;

namespace Orqentis.Api.Middleware;

/// <summary>Converts unhandled exceptions to RFC 7807 responses.</summary>
public sealed class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;
    private readonly IProblemDetailsService _problemDetailsService;
    private readonly IConfiguration _configuration;

    public GlobalExceptionMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionMiddleware> logger,
        IProblemDetailsService problemDetailsService,
        IConfiguration configuration)
    {
        _next = next;
        _logger = logger;
        _problemDetailsService = problemDetailsService;
        _configuration = configuration;
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
            _logger.LogError(ex, "Request-Failed CorrelationId={CorrelationId} ExceptionType={ExceptionType} ExceptionMessage={ExceptionMessage}",
                correlationId, ex.GetType().FullName, ex.Message);

            if (context.Response.HasStarted)
            {
                return;
            }

            context.Response.Clear();
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;

            var debugErrors = string.Equals(
                _configuration["ORQENTIS_DEBUG_ERRORS"], "true",
                StringComparison.OrdinalIgnoreCase);

            await _problemDetailsService.WriteAsync(new ProblemDetailsContext
            {
                HttpContext = context,
                ProblemDetails =
                {
                    Status = StatusCodes.Status500InternalServerError,
                    Title = "An unexpected error occurred.",
                    Detail = debugErrors
                        ? $"{ex.GetType().Name}: {ex.Message}"
                        : "The request could not be completed.",
                    Type = "https://httpstatuses.com/500",
                    Extensions =
                    {
                        ["correlationId"] = correlationId,
                    },
                },
            }).ConfigureAwait(false);
        }
    }
}
