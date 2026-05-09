using Orqentis.Api.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Orqentis.Api.Controllers;

/// <summary>Placeholder policy endpoints required by the public API surface.</summary>
[ApiController]
[Route("v1/policies")]
public sealed class PoliciesController : ControllerBase
{
    /// <summary>Lists persisted policies. Policy management lands in a later sprint.</summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult ListAsync() => Ok(Array.Empty<object>());

    /// <summary>Placeholder create endpoint for enterprise policy management.</summary>
    [HttpPost]
    [Enterprise]
    [ProducesResponseType(StatusCodes.Status501NotImplemented)]
    public IActionResult CreateAsync() => Problem(
        statusCode: StatusCodes.Status501NotImplemented,
        title: "Not implemented.",
        detail: "Policy creation is scheduled for a later sprint.");

    /// <summary>Placeholder update endpoint for enterprise policy management.</summary>
    [HttpPut("{id:guid}")]
    [Enterprise]
    [ProducesResponseType(StatusCodes.Status501NotImplemented)]
    public IActionResult UpdateAsync(Guid id)
    {
        _ = id;
        return Problem(
            statusCode: StatusCodes.Status501NotImplemented,
            title: "Not implemented.",
            detail: "Policy updates are scheduled for a later sprint.");
    }

    /// <summary>Placeholder delete endpoint for enterprise policy management.</summary>
    [HttpDelete("{id:guid}")]
    [Enterprise]
    [ProducesResponseType(StatusCodes.Status501NotImplemented)]
    public IActionResult DeleteAsync(Guid id)
    {
        _ = id;
        return Problem(
            statusCode: StatusCodes.Status501NotImplemented,
            title: "Not implemented.",
            detail: "Policy deletion is scheduled for a later sprint.");
    }
}
