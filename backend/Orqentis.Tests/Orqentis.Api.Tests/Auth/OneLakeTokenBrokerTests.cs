using System.Security.Claims;
using Azure.Core;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Orqentis.Api.Auth;
using Orqentis.Tests.Orqentis.Api.Tests.Infrastructure;

namespace Orqentis.Tests.Orqentis.Api.Tests.Auth;

public sealed class OneLakeTokenBrokerTests
{
    [Fact]
    public async Task GetOneLakeTokenAsync_SecondCallWithinTtl_ReturnsCachedToken()
    {
        var acquirer = new FakeOboTokenAcquirer(_ => new AccessToken("cached-token", DateTimeOffset.UtcNow.AddHours(1)));
        var broker = CreateBroker(acquirer);

        var first = await broker.GetOneLakeTokenAsync("assertion");
        var second = await broker.GetOneLakeTokenAsync("assertion");

        first.Should().Be("cached-token");
        second.Should().Be("cached-token");
        acquirer.CallCount.Should().Be(1);
    }

    [Fact]
    public async Task GetOneLakeTokenAsync_ExpiredToken_ReacquiresToken()
    {
        var tokens = new Queue<string>(["first-token", "second-token"]);
        var acquirer = new FakeOboTokenAcquirer(_ => new AccessToken(tokens.Dequeue(), DateTimeOffset.UtcNow.AddMinutes(1)));
        var broker = CreateBroker(acquirer);

        var first = await broker.GetOneLakeTokenAsync("assertion");
        var second = await broker.GetOneLakeTokenAsync("assertion");

        first.Should().Be("first-token");
        second.Should().Be("second-token");
        acquirer.CallCount.Should().Be(2);
    }

    [Fact]
    public async Task GetOneLakeTokenAsync_AcquisitionFailure_DoesNotPoisonCache()
    {
        var acquirer = new FakeOboTokenAcquirer(call =>
        {
            if (call == 1)
            {
                throw new InvalidOperationException("transient OBO failure");
            }

            return new AccessToken("recovered-token", DateTimeOffset.UtcNow.AddHours(1));
        });
        var broker = CreateBroker(acquirer);

        await Assert.ThrowsAsync<InvalidOperationException>(() => broker.GetOneLakeTokenAsync("assertion"));
        var recovered = await broker.GetOneLakeTokenAsync("assertion");

        recovered.Should().Be("recovered-token");
        acquirer.CallCount.Should().Be(2);
    }

    private static OneLakeTokenBroker CreateBroker(IOboTokenAcquirer acquirer)
    {
        var claims = new[]
        {
            new Claim("tid", TestIdentifiers.CommunityEntraTenantId.ToString()),
            new Claim("oid", TestIdentifiers.UserObjectId.ToString()),
        };
        var httpContextAccessor = new HttpContextAccessor
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test")),
            },
        };

        return new OneLakeTokenBroker(
            Options.Create(new AzureAdOptions
            {
                TenantId = TestIdentifiers.CommunityEntraTenantId.ToString(),
                ClientId = "client-id",
                ClientSecret = "client-secret",
            }),
            httpContextAccessor,
            new MemoryCache(new MemoryCacheOptions()),
            acquirer,
            NullLogger<OneLakeTokenBroker>.Instance);
    }

    private sealed class FakeOboTokenAcquirer : IOboTokenAcquirer
    {
        private readonly Func<int, AccessToken> _factory;

        public FakeOboTokenAcquirer(Func<int, AccessToken> factory)
        {
            _factory = factory;
        }

        public int CallCount { get; private set; }

        public ValueTask<AccessToken> GetTokenAsync(
            string tenantId,
            string clientId,
            string clientSecret,
            string userAssertion,
            string[] scopes,
            CancellationToken ct = default)
        {
            CallCount++;
            return ValueTask.FromResult(_factory(CallCount));
        }
    }
}
