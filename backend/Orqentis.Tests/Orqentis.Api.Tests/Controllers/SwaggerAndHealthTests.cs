using System.Net;
using Orqentis.Tests.Orqentis.Api.Tests.Infrastructure;

namespace Orqentis.Tests.Orqentis.Api.Tests.Controllers;

public sealed class SwaggerAndHealthTests
{
    [Fact]
    public async Task SwaggerDocument_ContainsSprintFourEndpoints()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateClient(new() { AllowAutoRedirect = false });

        var response = await client.GetAsync("/swagger/v1/swagger.json");
        var json = await response.Content.ReadAsStringAsync();

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        json.Should().Contain("/v1/contracts");
        json.Should().Contain("/v1/contracts/{id}/runs");
        json.Should().Contain("/v1/runs/{runId}");
        json.Should().Contain("/v1/workspaces");
        json.Should().Contain("/v1/policies");
        json.Should().Contain("/v1/ai/query");
        json.Should().Contain("/v1/reports/summary");
    }

    [Fact]
    public async Task HealthEndpoints_AreAnonymousAndReturnReadyPayloads()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateClient(new() { AllowAutoRedirect = false });

        var live = await client.GetAsync("/health/live");
        var ready = await client.GetAsync("/health/ready");

        live.StatusCode.Should().Be(HttpStatusCode.OK);
        ready.StatusCode.Should().Be(HttpStatusCode.OK);
        live.Headers.Contains("X-Correlation-Id").Should().BeTrue();
        ready.Headers.Contains("X-Correlation-Id").Should().BeTrue();
    }
}
