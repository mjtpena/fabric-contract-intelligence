using System.Net;

namespace Orqentis.Api.Services.Webhooks;

/// <summary>Resolves and validates outbound webhook destinations before any network send.</summary>
public sealed class WebhookUrlValidator
{
    private static readonly string[] BlockedDomains = ["svc.cluster.local", "internal", "local"];
    private static readonly string[] DefaultAllowedDomains =
    [
        "*.webhook.office.com",
        "outlook.office.com",
        "hooks.slack.com",
        "events.pagerduty.com",
        "*.service-now.com",
    ];

    private readonly IWebhookDnsResolver _dnsResolver;
    private readonly string[] _domainAllowlist;

    public WebhookUrlValidator(IConfiguration configuration, IWebhookDnsResolver dnsResolver)
    {
        _dnsResolver = dnsResolver;
        _domainAllowlist = configuration.GetSection("Webhooks:DomainAllowlist").Get<string[]>() ?? [];
    }

    /// <summary>Validates a webhook URL, resolves DNS once, and returns the IP to pin for the request.</summary>
    public async Task<WebhookUrlValidationResult> ValidateAsync(string url, CancellationToken ct = default)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
        {
            throw new InvalidOperationException("Webhook URL must be an absolute URI.");
        }

        if (!string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Webhook URL must use HTTPS.");
        }

        var host = uri.IdnHost.ToLowerInvariant();
        if (BlockedDomains.Any(domain => string.Equals(host, domain, StringComparison.OrdinalIgnoreCase) ||
            host.EndsWith($".{domain}", StringComparison.OrdinalIgnoreCase)))
        {
            throw new InvalidOperationException("Webhook URL host is not allowed.");
        }

        var allowlist = _domainAllowlist.Length == 0 ? [] : _domainAllowlist;
        if (allowlist.Length > 0 && !allowlist.Any(pattern => MatchesDomainPattern(host, pattern)))
        {
            throw new InvalidOperationException("Webhook URL host is not in the configured allowlist.");
        }

        IPAddress[] addresses = IPAddress.TryParse(host, out var literalAddress)
            ? [literalAddress]
            : await _dnsResolver.GetHostAddressesAsync(host, ct).ConfigureAwait(false);

        if (addresses.Length == 0)
        {
            throw new InvalidOperationException("Webhook URL host did not resolve to an IP address.");
        }

        var normalizedAddresses = addresses.Select(NormalizeAddress).ToArray();
        if (normalizedAddresses.Any(address => !IsPublicAddress(address)))
        {
            throw new InvalidOperationException("Webhook URL host resolved to a non-public IP address.");
        }

        return new WebhookUrlValidationResult(uri, normalizedAddresses[0]);
    }

    internal static bool MatchesKnownProvider(string host) =>
        DefaultAllowedDomains.Any(pattern => MatchesDomainPattern(host, pattern));

    private static bool MatchesDomainPattern(string host, string pattern)
    {
        var normalizedPattern = pattern.Trim().ToLowerInvariant();
        if (normalizedPattern.StartsWith("*.", StringComparison.Ordinal))
        {
            var suffix = normalizedPattern[1..];
            return host.EndsWith(suffix, StringComparison.OrdinalIgnoreCase) && host.Length > suffix.Length;
        }

        return string.Equals(host, normalizedPattern, StringComparison.OrdinalIgnoreCase);
    }

    private static IPAddress NormalizeAddress(IPAddress address) =>
        address.IsIPv4MappedToIPv6 ? address.MapToIPv4() : address;

    private static bool IsPublicAddress(IPAddress address)
    {
        if (IPAddress.IsLoopback(address) || IPAddress.IsLoopback(address.MapToIPv6()))
        {
            return false;
        }

        if (address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
        {
            var bytes = address.GetAddressBytes();
            return bytes switch
            {
                [10, ..] => false,
                [127, ..] => false,
                [169, 254, ..] => false,
                [168, 63, 129, 16] => false,
                [172, >= 16 and <= 31, ..] => false,
                [192, 168, ..] => false,
                [0, ..] => false,
                _ => true,
            };
        }

        var ipv6Bytes = address.GetAddressBytes();
        return !address.IsIPv6LinkLocal &&
            !address.IsIPv6SiteLocal &&
            !address.IsIPv6Multicast &&
            !address.Equals(IPAddress.IPv6None) &&
            !address.Equals(IPAddress.IPv6Any) &&
            ipv6Bytes[0] is not 0xfc and not 0xfd;
    }
}

public sealed record WebhookUrlValidationResult(Uri Uri, IPAddress PinnedAddress);

public interface IWebhookDnsResolver
{
    Task<IPAddress[]> GetHostAddressesAsync(string host, CancellationToken ct = default);
}

public sealed class WebhookDnsResolver : IWebhookDnsResolver
{
    public Task<IPAddress[]> GetHostAddressesAsync(string host, CancellationToken ct = default) =>
        Dns.GetHostAddressesAsync(host, ct);
}
