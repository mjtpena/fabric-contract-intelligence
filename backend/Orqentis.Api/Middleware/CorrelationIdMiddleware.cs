namespace Orqentis.Api.Middleware;

/// <summary>
/// Ensures every request has an <c>X-Correlation-Id</c>. If absent, generates a new GUID-N.
/// Spec §16 — required on all logs and downstream calls.
/// </summary>
public sealed class CorrelationIdMiddleware
{
    public const string HeaderName = "X-Correlation-Id";
    private readonly RequestDelegate _next;

    public CorrelationIdMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = context.Request.Headers.TryGetValue(HeaderName, out var v) && !string.IsNullOrWhiteSpace(v)
            ? v.ToString()
            : Guid.NewGuid().ToString("N");

        context.Items[HeaderName] = correlationId;
        context.Response.OnStarting(() =>
        {
            if (!context.Response.Headers.ContainsKey(HeaderName))
            {
                context.Response.Headers[HeaderName] = correlationId;
            }
            return Task.CompletedTask;
        });

        using (Serilog.Context.LogContext.PushProperty("CorrelationId", correlationId))
        {
            await _next(context).ConfigureAwait(false);
        }
    }
}
