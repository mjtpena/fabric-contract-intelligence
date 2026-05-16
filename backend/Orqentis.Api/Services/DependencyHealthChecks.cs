using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Orqentis.Api.Services;

public sealed class KeyVaultReachabilityHealthCheck : IHealthCheck
{
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;
    private readonly IHttpClientFactory _httpClientFactory;

    public KeyVaultReachabilityHealthCheck(
        IConfiguration configuration,
        IWebHostEnvironment environment,
        IHttpClientFactory httpClientFactory)
    {
        _configuration = configuration;
        _environment = environment;
        _httpClientFactory = httpClientFactory;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        var vaultUri = _configuration["KeyVault:VaultUri"];
        if (string.IsNullOrWhiteSpace(vaultUri))
        {
            return _environment.IsProduction()
                ? HealthCheckResult.Degraded("KeyVault:VaultUri is not configured.")
                : HealthCheckResult.Healthy("Key Vault is optional outside production.");
        }

        using var request = new HttpRequestMessage(HttpMethod.Head, vaultUri.TrimEnd('/') + "/");
        using var response = await _httpClientFactory.CreateClient("key-vault-health").SendAsync(request, cancellationToken).ConfigureAwait(false);
        return (int)response.StatusCode < 500
            ? HealthCheckResult.Healthy("Key Vault endpoint reachable.")
            : HealthCheckResult.Unhealthy($"Key Vault endpoint returned {(int)response.StatusCode}.");
    }
}

public sealed class AzureOpenAiHealthCheck : IHealthCheck
{
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;

    public AzureOpenAiHealthCheck(IConfiguration configuration, IHttpClientFactory httpClientFactory)
    {
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        var endpoint = _configuration["AI:AzureOpenAI:Endpoint"];
        if (string.IsNullOrWhiteSpace(endpoint))
        {
            return HealthCheckResult.Degraded("Azure OpenAI endpoint is not configured.");
        }

        using var request = new HttpRequestMessage(HttpMethod.Head, endpoint.TrimEnd('/') + "/");
        using var response = await _httpClientFactory.CreateClient("azure-openai-health").SendAsync(request, cancellationToken).ConfigureAwait(false);
        return (int)response.StatusCode < 500
            ? HealthCheckResult.Healthy("Azure OpenAI endpoint reachable.")
            : HealthCheckResult.Unhealthy($"Azure OpenAI endpoint returned {(int)response.StatusCode}.");
    }
}

public sealed class FabricRestHealthCheck : IHealthCheck
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IWebHostEnvironment _environment;

    public FabricRestHealthCheck(IHttpClientFactory httpClientFactory, IWebHostEnvironment environment)
    {
        _httpClientFactory = httpClientFactory;
        _environment = environment;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        if (_environment.IsEnvironment("Testing"))
        {
            return HealthCheckResult.Healthy("Fabric REST check skipped during tests.");
        }

        using var request = new HttpRequestMessage(HttpMethod.Get, "v1/capacities");
        using var response = await _httpClientFactory.CreateClient("fabric-rest").SendAsync(request, cancellationToken).ConfigureAwait(false);
        return (int)response.StatusCode < 500
            ? HealthCheckResult.Healthy("Fabric REST endpoint reachable.")
            : HealthCheckResult.Unhealthy($"Fabric REST endpoint returned {(int)response.StatusCode}.");
    }
}
