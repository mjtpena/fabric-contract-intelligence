using Orqentis.Api.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Orqentis.Api.Controllers;

/// <summary>Enterprise-only placeholder endpoints for AI features.</summary>
[ApiController]
[Route("v1/ai")]
[Enterprise]
public sealed class AiController : ControllerBase
{
    /// <summary>Placeholder AI contract suggestion endpoint.</summary>
    [HttpPost("suggest-contract")]
    [ProducesResponseType(StatusCodes.Status501NotImplemented)]
    public IActionResult SuggestContractAsync() => Problem(
        statusCode: StatusCodes.Status501NotImplemented,
        title: "Not implemented.",
        detail: "AI contract suggestion is scheduled for a later sprint.");

    /// <summary>Placeholder natural language query endpoint.</summary>
    [HttpPost("query")]
    [ProducesResponseType(StatusCodes.Status501NotImplemented)]
    public IActionResult QueryAsync() => Problem(
        statusCode: StatusCodes.Status501NotImplemented,
        title: "Not implemented.",
        detail: "AI querying is scheduled for a later sprint.");
}
