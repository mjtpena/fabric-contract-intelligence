using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using Orqentis.Api.Services;

namespace Orqentis.Tests.Orqentis.Api.Tests.Services;

public sealed class ActivatorClientTests
{
    [Fact]
    public async Task TriggerRuleAsync_SendsExpectedUrlAndPayload()
    {
        var handler = new RecordingHandler();
        var httpClient = new HttpClient(handler);
        var client = new ActivatorClient(httpClient, NullLogger<ActivatorClient>.Instance);
        var workspaceId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        var ruleId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
        var context = new ActivatorTriggerContext(
            Guid.Parse("11111111-1111-1111-1111-111111111111"),
            "Contract",
            "abfss://table",
            Guid.Parse("22222222-2222-2222-2222-222222222222"),
            "failed",
            78.4m,
            3,
            "https://app.fabric.microsoft.com/run");

        await client.TriggerRuleAsync(workspaceId, ruleId, context, "token");

        handler.RequestUri.Should().Be($"https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/reflex/rules/{ruleId}/trigger");
        handler.Authorization.Should().Be("Bearer token");

        using var payload = JsonDocument.Parse(handler.Body ?? "{}");
        payload.RootElement.GetProperty("context").GetProperty("contractId").GetGuid().Should().Be(context.ContractId);
        payload.RootElement.GetProperty("context").GetProperty("violatedRules").GetInt32().Should().Be(3);
    }

    private sealed class RecordingHandler : HttpMessageHandler
    {
        public string? RequestUri { get; private set; }
        public string? Authorization { get; private set; }
        public string? Body { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            RequestUri = request.RequestUri?.ToString();
            Authorization = request.Headers.Authorization?.ToString();
            Body = request.Content is null ? null : await request.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
            return new HttpResponseMessage(HttpStatusCode.OK);
        }
    }
}
