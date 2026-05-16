using System.Net;
using Microsoft.AspNetCore.Http;
using Orqentis.Api.Http;
using Orqentis.Api.Middleware;

namespace Orqentis.Tests.Orqentis.Api.Tests.Services;

public sealed class CorrelationIdDelegatingHandlerTests
{
    [Fact]
    public async Task SendAsync_CorrelationItemExists_AddsOutboundHeader()
    {
        var inner = new RecordingHandler();
        var httpContext = new DefaultHttpContext();
        httpContext.Items[CorrelationIdMiddleware.HeaderName] = "corr-123";
        var handler = new CorrelationIdDelegatingHandler(new HttpContextAccessor { HttpContext = httpContext })
        {
            InnerHandler = inner,
        };
        using var client = new HttpClient(handler);

        await client.GetAsync("https://example.test/dependency");

        inner.CorrelationId.Should().Be("corr-123");
    }

    private sealed class RecordingHandler : HttpMessageHandler
    {
        public string? CorrelationId { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            CorrelationId = request.Headers.TryGetValues(CorrelationIdMiddleware.HeaderName, out var values)
                ? values.Single()
                : null;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
        }
    }
}
