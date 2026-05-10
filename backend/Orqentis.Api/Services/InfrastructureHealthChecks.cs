using Microsoft.Extensions.Diagnostics.HealthChecks;
using Orqentis.Data;

namespace Orqentis.Api.Services;

/// <summary>Readiness check for the configured data store.</summary>
public sealed class OrqentisDatabaseHealthCheck : IHealthCheck
{
    private readonly OrqentisDbContext _dbContext;

    public OrqentisDatabaseHealthCheck(OrqentisDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /// <inheritdoc />
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var canConnect = await _dbContext.Database.CanConnectAsync(cancellationToken).ConfigureAwait(false);
            return canConnect
                ? HealthCheckResult.Healthy("Database reachable.")
                : HealthCheckResult.Unhealthy("Database unavailable.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy($"Database connection failed: {ex.GetType().Name}: {ex.Message}");
        }
    }
}

/// <summary>Readiness check for Key Vault configuration presence.</summary>
public sealed class KeyVaultConfigurationHealthCheck : IHealthCheck
{
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;

    public KeyVaultConfigurationHealthCheck(IConfiguration configuration, IWebHostEnvironment environment)
    {
        _configuration = configuration;
        _environment = environment;
    }

    /// <inheritdoc />
    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var vaultUri = _configuration["KeyVault:VaultUri"];
        if (!string.IsNullOrWhiteSpace(vaultUri) || !_environment.IsProduction())
        {
            return Task.FromResult(HealthCheckResult.Healthy("Key Vault configuration accepted."));
        }

        return Task.FromResult(HealthCheckResult.Degraded("KeyVault:VaultUri is not configured."));
    }
}
