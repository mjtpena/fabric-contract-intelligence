using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Orqentis.Api.Controllers;

/// <summary>Liveness and readiness endpoints.</summary>
[ApiController]
[Route("health")]
[AllowAnonymous]
public sealed class HealthController : ControllerBase
{
    private readonly HealthCheckService _healthCheckService;

    public HealthController(HealthCheckService healthCheckService)
    {
        _healthCheckService = healthCheckService;
    }

    /// <summary>Simple liveness endpoint.</summary>
    [HttpGet("live")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult Live() => Ok(new
    {
        status = "healthy",
        timestamp = DateTimeOffset.UtcNow,
    });

    /// <summary>Aggregated readiness endpoint.</summary>
    [HttpGet("ready")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Ready(CancellationToken ct)
    {
        var report = await _healthCheckService
            .CheckHealthAsync(check => check.Tags.Contains("ready"), ct)
            .ConfigureAwait(false);

        var payload = new
        {
            status = report.Status.ToString().ToLowerInvariant(),
            checks = report.Entries.ToDictionary(
                entry => entry.Key,
                entry => entry.Value.Status.ToString().ToLowerInvariant()),
            timestamp = DateTimeOffset.UtcNow,
        };

        return report.Status == HealthStatus.Unhealthy
            ? StatusCode(StatusCodes.Status503ServiceUnavailable, payload)
            : Ok(payload);
    }
}
