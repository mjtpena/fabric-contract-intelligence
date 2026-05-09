using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Security.Cryptography;
using Orqentis.Tests.Orqentis.Api.Tests.Infrastructure;
using Microsoft.IdentityModel.Tokens;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;

namespace Orqentis.Tests.Orqentis.Api.Tests.Auth;

public sealed class FabricAuthPipelineTests : IDisposable
{
    private readonly RSA _rsa = RSA.Create(2048);
    private readonly RsaSecurityKey _securityKey;
    private readonly WireMockServer _wireMockServer;
    private readonly string _issuer;

    public FabricAuthPipelineTests()
    {
        _securityKey = new RsaSecurityKey(_rsa) { KeyId = "test-signing-key" };
        _wireMockServer = WireMockServer.Start();
        _issuer = $"{_wireMockServer.Url}/tenant/{TestIdentifiers.CommunityEntraTenantId}";
        ConfigureOidcEndpoints();
    }

    [Fact]
    public async Task ContractsEndpoint_WithoutBearerToken_ReturnsUnauthorizedProblem()
    {
        using var factory = CreateFactory();
        using var client = factory.CreateClient(new() { AllowAutoRedirect = false });
        client.DefaultRequestHeaders.Add("X-Workspace-Id", TestIdentifiers.WorkspaceId.ToString());

        var response = await client.GetAsync("/v1/contracts");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        response.Content.Headers.ContentType!.MediaType.Should().Be("application/problem+json");
        response.Headers.Contains("X-Correlation-Id").Should().BeTrue();
    }

    [Fact]
    public async Task WorkspacesEndpoint_WithValidBearerToken_ReturnsSuccess()
    {
        using var factory = CreateFactory();
        using var client = factory.CreateClient(new() { AllowAutoRedirect = false });
        client.DefaultRequestHeaders.Add("X-Workspace-Id", TestIdentifiers.WorkspaceId.ToString());
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", CreateAccessToken());

        var response = await client.GetAsync("/v1/workspaces");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Headers.Contains("X-Correlation-Id").Should().BeTrue();
    }

    public void Dispose()
    {
        _wireMockServer.Dispose();
        _rsa.Dispose();
    }

    private ApiWebApplicationFactory CreateFactory() =>
        new(
            useTestAuthentication: false,
            configurationOverrides: new Dictionary<string, string?>
            {
                ["AzureAd:MetadataAddress"] = $"{_wireMockServer.Url}/.well-known/openid-configuration",
                ["AzureAd:ValidIssuer"] = _issuer,
                ["AzureAd:Audience"] = "api://test-client-id",
                ["AzureAd:ClientId"] = "test-client-id",
            });

    private string CreateAccessToken()
    {
        var token = new JwtSecurityToken(
            issuer: _issuer,
            audience: "api://test-client-id",
            claims:
            [
                new Claim("tid", TestIdentifiers.CommunityEntraTenantId.ToString()),
                new Claim("oid", "jwt-test-user"),
                new Claim("preferred_username", "jwt.user@example.com"),
                new Claim("workspace_id", TestIdentifiers.WorkspaceId.ToString()),
            ],
            notBefore: DateTime.UtcNow.AddMinutes(-5),
            expires: DateTime.UtcNow.AddMinutes(30),
            signingCredentials: new SigningCredentials(_securityKey, SecurityAlgorithms.RsaSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private void ConfigureOidcEndpoints()
    {
        var jwk = JsonWebKeyConverter.ConvertFromRSASecurityKey(_securityKey);
        jwk.Kid = _securityKey.KeyId;

        _wireMockServer.Given(Request.Create().WithPath("/.well-known/openid-configuration").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(200).WithHeader("Content-Type", "application/json").WithBodyAsJson(new
            {
                issuer = _issuer,
                jwks_uri = $"{_wireMockServer.Url}/keys",
            }));

        _wireMockServer.Given(Request.Create().WithPath("/keys").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(200).WithHeader("Content-Type", "application/json").WithBodyAsJson(new
            {
                keys = new[]
                {
                    new
                    {
                        kty = jwk.Kty,
                        use = "sig",
                        kid = jwk.Kid,
                        e = jwk.E,
                        n = jwk.N,
                        alg = "RS256",
                    },
                },
            }));
    }
}
