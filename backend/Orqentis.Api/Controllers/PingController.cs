using Microsoft.AspNetCore.Mvc;

namespace Orqentis.Api.Controllers;

/// <summary>Sprint 1 placeholder endpoint so the API project is exercisable.</summary>
[ApiController]
[Route("api/v1/[controller]")]
public sealed class PingController : ControllerBase
{
    [HttpGet]
    [AllowAnonymousAttribute]
    public IActionResult Get() => Ok(new
    {
        service = "orqentis-api",
        version = typeof(PingController).Assembly.GetName().Version?.ToString() ?? "0.0.0",
        timestamp = DateTimeOffset.UtcNow,
    });
}

/// <summary>Anonymous shim — keeps the placeholder reachable without auth wiring.</summary>
internal sealed class AllowAnonymousAttribute : Microsoft.AspNetCore.Authorization.AllowAnonymousAttribute;
