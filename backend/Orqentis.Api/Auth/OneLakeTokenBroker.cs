using Azure.Core;
using Azure.Identity;
using Orqentis.Data;
using Microsoft.Extensions.Options;

namespace Orqentis.Api.Auth;

/// <summary>Azure.Identity-backed OBO broker for OneLake and Fabric REST scopes.</summary>
public sealed class OneLakeTokenBroker : IOneLakeTokenBroker
{
    private static readonly string[] OneLakeScopes = ["https://storage.azure.com/.default"];
    private static readonly string[] FabricScopes = ["https://api.fabric.microsoft.com/.default"];

    private readonly AzureAdOptions _options;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<OneLakeTokenBroker> _logger;

    public OneLakeTokenBroker(
        IOptions<AzureAdOptions> options,
        ITenantContext tenantContext,
        ILogger<OneLakeTokenBroker> logger)
    {
        _options = options.Value;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    /// <inheritdoc />
    public Task<string> GetOneLakeTokenAsync(string userAssertion, CancellationToken ct = default) =>
        GetTokenAsync(userAssertion, OneLakeScopes, "storage.azure.com", ct);

    /// <inheritdoc />
    public Task<string> GetFabricRestTokenAsync(string userAssertion, CancellationToken ct = default) =>
        GetTokenAsync(userAssertion, FabricScopes, "api.fabric.microsoft.com", ct);

    private async Task<string> GetTokenAsync(
        string userAssertion,
        string[] scopes,
        string resource,
        CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(userAssertion);

        var tenantId = _tenantContext.EntraTenantId != Guid.Empty
            ? _tenantContext.EntraTenantId.ToString()
            : _options.TenantId;

        if (string.IsNullOrWhiteSpace(tenantId) ||
            string.IsNullOrWhiteSpace(_options.ClientId) ||
            string.IsNullOrWhiteSpace(_options.ClientSecret))
        {
            throw new InvalidOperationException("AzureAd client credentials are not configured for OBO token exchange.");
        }

        _logger.LogInformation(
            "TokenExchange-Start TenantId={TenantId} Resource={Resource}",
            tenantId,
            resource);

        var credential = new OnBehalfOfCredential(
            tenantId,
            _options.ClientId,
            _options.ClientSecret,
            userAssertion);

        var token = await credential
            .GetTokenAsync(new TokenRequestContext(scopes), ct)
            .ConfigureAwait(false);

        _logger.LogInformation(
            "TokenExchange-Complete TenantId={TenantId} Resource={Resource}",
            tenantId,
            resource);

        return token.Token;
    }
}
