namespace Orqentis.Api.Auth;

/// <summary>JWT/OBO configuration bound from the <c>AzureAd</c> section.</summary>
public sealed class AzureAdOptions
{
    public string? Instance { get; init; }
    public string? TenantId { get; init; }
    public string? ClientId { get; init; }
    public string? Audience { get; init; }
    public string? ClientSecret { get; init; }
    public string? MetadataAddress { get; init; }
    public string? ValidIssuer { get; init; }
}
