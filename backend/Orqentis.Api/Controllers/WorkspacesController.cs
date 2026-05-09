using Orqentis.Api.Dtos;
using Orqentis.Data;
using Microsoft.AspNetCore.Mvc;

namespace Orqentis.Api.Controllers;

/// <summary>Read-only workspace browser endpoints.</summary>
[ApiController]
[Route("v1/workspaces")]
public sealed class WorkspacesController : ControllerBase
{
    private readonly ITenantContext _tenantContext;

    public WorkspacesController(ITenantContext tenantContext)
    {
        _tenantContext = tenantContext;
    }

    /// <summary>Lists workspaces visible to the current caller.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<WorkspaceSummaryDto>), StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyList<WorkspaceSummaryDto>> ListAsync()
    {
        if (_tenantContext.WorkspaceId == Guid.Empty)
        {
            return Ok(Array.Empty<WorkspaceSummaryDto>());
        }

        return Ok(new[]
        {
            new WorkspaceSummaryDto
            {
                Id = _tenantContext.WorkspaceId,
                Name = "Current workspace",
                Tier = _tenantContext.Tier,
            },
        });
    }

    /// <summary>Lists Delta tables for a workspace. Stubbed in Sprint 4.</summary>
    [HttpGet("{id:guid}/tables")]
    [ProducesResponseType(typeof(IReadOnlyList<WorkspaceTableDto>), StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyList<WorkspaceTableDto>> ListTablesAsync(Guid id)
    {
        _ = id;
        return Ok(Array.Empty<WorkspaceTableDto>());
    }
}
