using System.Net;
using System.Text.Json;

namespace FCI.Api.Middleware;

/// <summary>
/// Top-level safety net. Converts unhandled exceptions to RFC-7807 problem JSON with the
/// correlation id and a stable error code. Spec §16.1.
/// </summary>
public sealed class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
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
            _logger.LogError(ex, "Unhandled exception. CorrelationId={CorrelationId}", correlationId);

            if (context.Response.HasStarted) return;

            context.Response.Clear();
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            context.Response.ContentType = "application/problem+json";

            var payload = new
            {
                type = "https://datachain.consulting/errors/internal",
                title = "An unexpected error occurred.",
                status = 500,
                correlationId,
                errorCode = "InternalServerError"
            };
            await context.Response.WriteAsync(JsonSerializer.Serialize(payload)).ConfigureAwait(false);
        }
    }
}
