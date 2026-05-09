using Orqentis.Api.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Orqentis.Api.Controllers;

/// <summary>Enterprise-only placeholder report endpoints.</summary>
[ApiController]
[Route("v1/reports")]
[Enterprise]
public sealed class ReportsController : ControllerBase
{
    /// <summary>Placeholder summary report endpoint.</summary>
    [HttpGet("summary")]
    [ProducesResponseType(StatusCodes.Status501NotImplemented)]
    public IActionResult SummaryAsync() => Problem(
        statusCode: StatusCodes.Status501NotImplemented,
        title: "Not implemented.",
        detail: "Reporting is scheduled for a later sprint.");

    /// <summary>Placeholder audit report endpoint.</summary>
    [HttpGet("audit")]
    [ProducesResponseType(StatusCodes.Status501NotImplemented)]
    public IActionResult AuditAsync() => Problem(
        statusCode: StatusCodes.Status501NotImplemented,
        title: "Not implemented.",
        detail: "Audit reporting is scheduled for a later sprint.");
}
