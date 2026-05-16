using System.Net;
using Microsoft.Extensions.Configuration;
using Orqentis.Api.Services.Webhooks;

namespace Orqentis.Tests.Orqentis.Api.Tests.Services;

public sealed class WebhookUrlValidatorTests
{
    [Theory]
    [InlineData("https://10.0.0.1/hook", "10.0.0.1")]
    [InlineData("https://172.16.0.1/hook", "172.16.0.1")]
    [InlineData("https://192.168.1.1/hook", "192.168.1.1")]
    [InlineData("https://169.254.1.1/hook", "169.254.1.1")]
    [InlineData("https://169.254.169.254/hook", "169.254.169.254")]
    [InlineData("https://127.0.0.1/hook", "127.0.0.1")]
    [InlineData("https://[::1]/hook", "::1")]
    [InlineData("https://168.63.129.16/hook", "168.63.129.16")]
    public async Task ValidateAsync_PrivateOrInternalAddress_Rejects(string url, string ipAddress)
    {
        // Arrange
        var validator = CreateValidator(ipAddress: ipAddress);

        // Act
        var act = () => validator.ValidateAsync(url);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*non-public IP address*");
    }

    [Theory]
    [InlineData("https://service.internal/hook")]
    [InlineData("https://api.local/hook")]
    [InlineData("https://alerts.svc.cluster.local/hook")]
    public async Task ValidateAsync_InternalDomain_Rejects(string url)
    {
        // Arrange
        var validator = CreateValidator();

        // Act
        var act = () => validator.ValidateAsync(url);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*host is not allowed*");
    }

    [Theory]
    [InlineData("https://tenant.webhook.office.com/webhookb2/token")]
    [InlineData("https://hooks.slack.com/services/test")]
    [InlineData("https://events.pagerduty.com/v2/enqueue")]
    [InlineData("https://instance.service-now.com/api/hook")]
    public async Task ValidateAsync_AllowedProviderDomain_ReturnsPinnedPublicIp(string url)
    {
        // Arrange
        var validator = CreateValidator(
            ipAddress: "8.8.8.8",
            allowlist:
            [
                "*.webhook.office.com",
                "hooks.slack.com",
                "events.pagerduty.com",
                "*.service-now.com",
            ]);

        // Act
        var result = await validator.ValidateAsync(url);

        // Assert
        result.Uri.ToString().Should().Be(url);
        result.PinnedAddress.Should().Be(IPAddress.Parse("8.8.8.8"));
    }

    [Fact]
    public async Task ValidateAsync_AllowlistConfiguredForDifferentDomain_Rejects()
    {
        // Arrange
        var validator = CreateValidator(allowlist: ["hooks.slack.com"]);

        // Act
        var act = () => validator.ValidateAsync("https://evil.example.com/hook");

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*configured allowlist*");
    }

    private static WebhookUrlValidator CreateValidator(string ipAddress = "8.8.8.8", string[]? allowlist = null)
    {
        var data = new Dictionary<string, string?>();
        if (allowlist is not null)
        {
            for (var i = 0; i < allowlist.Length; i++)
            {
                data[$"Webhooks:DomainAllowlist:{i}"] = allowlist[i];
            }
        }

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(data)
            .Build();
        return new WebhookUrlValidator(configuration, new StubDnsResolver(IPAddress.Parse(ipAddress)));
    }

    private sealed class StubDnsResolver : IWebhookDnsResolver
    {
        private readonly IPAddress _address;

        public StubDnsResolver(IPAddress address)
        {
            _address = address;
        }

        public Task<IPAddress[]> GetHostAddressesAsync(string host, CancellationToken ct = default) =>
            Task.FromResult(new[] { _address });
    }
}
