using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using Azure.Core;
using Azure.Identity;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace Orqentis.Api.Auth;

public interface IOboTokenAcquirer
{
    ValueTask<AccessToken> GetTokenAsync(string tenantId, string clientId, string clientSecret, string userAssertion, string[] scopes, CancellationToken ct = default);
}

public sealed class AzureIdentityOboTokenAcquirer : IOboTokenAcquirer
{
    public async ValueTask<AccessToken> GetTokenAsync(
        string tenantId,
        string clientId,
        string clientSecret,
        string userAssertion,
        string[] scopes,
        CancellationToken ct = default)
    {
        var credential = new OnBehalfOfCredential(tenantId, clientId, clientSecret, userAssertion);
        return await credential.GetTokenAsync(new TokenRequestContext(scopes), ct).ConfigureAwait(false);
    }
}

/// <summary>Azure.Identity-backed OBO broker for OneLake and Fabric REST scopes.</summary>
public sealed class OneLakeTokenBroker : IOneLakeTokenBroker
{
    private static readonly string[] _oneLakeScopes = ["https://storage.azure.com/.default"];
    private static readonly string[] _fabricScopes = ["https://api.fabric.microsoft.com/.default"];
    private static readonly string[] _fabricSqlScopes = ["https://database.windows.net/.default"];
    private static readonly string[] _kustoScopes = ["https://kusto.kusto.windows.net/.default"];
    private static readonly TimeSpan _expirySkew = TimeSpan.FromMinutes(5);

    private readonly AzureAdOptions _options;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IMemoryCache _cache;
    private readonly IOboTokenAcquirer _tokenAcquirer;
    private readonly ILogger<OneLakeTokenBroker> _logger;
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new(StringComparer.Ordinal);

    public OneLakeTokenBroker(
        IOptions<AzureAdOptions> options,
        IHttpContextAccessor httpContextAccessor,
        IMemoryCache cache,
        IOboTokenAcquirer tokenAcquirer,
        ILogger<OneLakeTokenBroker> logger)
    {
        _options = options.Value;
        _httpContextAccessor = httpContextAccessor;
        _cache = cache;
        _tokenAcquirer = tokenAcquirer;
        _logger = logger;
    }

    /// <inheritdoc />
    public Task<string> GetOneLakeTokenAsync(string userAssertion, CancellationToken ct = default) =>
        GetTokenAsync(userAssertion, _oneLakeScopes, "storage.azure.com", ct);

    /// <inheritdoc />
    public Task<string> GetFabricRestTokenAsync(string userAssertion, CancellationToken ct = default) =>
        GetTokenAsync(userAssertion, _fabricScopes, "api.fabric.microsoft.com", ct);

    /// <inheritdoc />
    public Task<string> GetFabricSqlTokenAsync(string userAssertion, CancellationToken ct = default) =>
        GetTokenAsync(userAssertion, _fabricSqlScopes, "database.windows.net", ct);

    /// <inheritdoc />
    public Task<string> GetKustoTokenAsync(string userAssertion, CancellationToken ct = default) =>
        GetTokenAsync(userAssertion, _kustoScopes, "kusto.kusto.windows.net", ct);

    private async Task<string> GetTokenAsync(
        string userAssertion,
        string[] scopes,
        string resource,
        CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(userAssertion);

        var tenantId = ResolveTenantId();
        var userOid = ResolveUserObjectId();
        if (string.IsNullOrWhiteSpace(tenantId) ||
            string.IsNullOrWhiteSpace(userOid) ||
            string.IsNullOrWhiteSpace(_options.ClientId) ||
            string.IsNullOrWhiteSpace(_options.ClientSecret))
        {
            throw new InvalidOperationException("AzureAd client credentials and user tenant claims are required for OBO token exchange.");
        }

        var cacheKey = BuildCacheKey(tenantId, userOid, scopes[0]);
        if (TryGetCachedToken(cacheKey, out var cachedToken))
        {
            return cachedToken;
        }

        var gate = _locks.GetOrAdd(cacheKey, static _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(ct).ConfigureAwait(false);
        try
        {
            if (TryGetCachedToken(cacheKey, out cachedToken))
            {
                return cachedToken;
            }

            _logger.LogInformation(
                "TokenExchange-Start TenantId={TenantId} Resource={Resource}",
                tenantId,
                resource);

            AccessToken token;
            try
            {
                token = await _tokenAcquirer
                    .GetTokenAsync(tenantId, _options.ClientId, _options.ClientSecret, userAssertion, scopes, ct)
                    .ConfigureAwait(false);
            }
            catch
            {
                _cache.Remove(cacheKey);
                throw;
            }

            CacheToken(cacheKey, token);

            _logger.LogInformation(
                "TokenExchange-Complete TenantId={TenantId} Resource={Resource}",
                tenantId,
                resource);

            return token.Token;
        }
        finally
        {
            gate.Release();
            if (gate.CurrentCount == 1)
            {
                _locks.TryRemove(cacheKey, out _);
            }
        }
    }

    private string ResolveTenantId() =>
        _httpContextAccessor.HttpContext?.User.FindFirst("tid")?.Value
        ?? _options.TenantId
        ?? string.Empty;

    private string ResolveUserObjectId() =>
        _httpContextAccessor.HttpContext?.User.FindFirst("oid")?.Value
        ?? string.Empty;

    private static string BuildCacheKey(string tenantId, string userOid, string resourceScope)
    {
        var input = $"{tenantId}|{userOid}|{resourceScope}";
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return "obo:" + Convert.ToHexString(hash);
    }

    private bool TryGetCachedToken(string cacheKey, out string token)
    {
        if (_cache.TryGetValue(cacheKey, out OboTokenCacheEntry? entry) &&
            entry is not null &&
            entry.ExpiresOn > DateTimeOffset.UtcNow.Add(_expirySkew))
        {
            token = entry.Token;
            return true;
        }

        token = string.Empty;
        return false;
    }

    private void CacheToken(string cacheKey, AccessToken token)
    {
        var cacheUntil = token.ExpiresOn.Subtract(_expirySkew);
        if (cacheUntil <= DateTimeOffset.UtcNow)
        {
            return;
        }

        _cache.Set(
            cacheKey,
            new OboTokenCacheEntry(token.Token, token.ExpiresOn),
            new MemoryCacheEntryOptions
            {
                AbsoluteExpiration = cacheUntil,
                Size = Math.Max(1, token.Token.Length),
            });
    }

    private sealed record OboTokenCacheEntry(string Token, DateTimeOffset ExpiresOn);
}
