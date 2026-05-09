using System.Net;
using Orqentis.Tests.Orqentis.Api.Tests.Infrastructure;

namespace Orqentis.Tests.Orqentis.Api.Tests.Auth;

public sealed class EnterpriseAttributeTests
{
    [Fact]
    public async Task QueryAsync_CommunityTenant_ReturnsPaymentRequired()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient();

        var response = await client.PostAsync("/v1/ai/query", content: null);

        response.StatusCode.Should().Be(HttpStatusCode.PaymentRequired);
        response.Headers.Contains("X-Correlation-Id").Should().BeTrue();
    }

    [Fact]
    public async Task QueryAsync_EnterpriseTenant_ReturnsNotImplemented()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient(TestIdentifiers.EnterpriseEntraTenantId);

        var response = await client.PostAsync("/v1/ai/query", content: null);

        response.StatusCode.Should().Be(HttpStatusCode.NotImplemented);
        response.Headers.Contains("X-Correlation-Id").Should().BeTrue();
    }
}
