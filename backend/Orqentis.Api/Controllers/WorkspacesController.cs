using Orqentis.Api.Dtos;
using Orqentis.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;

namespace Orqentis.Api.Controllers;

/// <summary>Read-only workspace browser endpoints.</summary>
[ApiController]
[Route("v1/workspaces")]
public sealed class WorkspacesController : ControllerBase
{
    private readonly ITenantContext _tenantContext;
    private readonly OrqentisDbContext _dbContext;

    public WorkspacesController(ITenantContext tenantContext, OrqentisDbContext dbContext)
    {
        _tenantContext = tenantContext;
        _dbContext = dbContext;
    }

    /// <summary>Lists workspaces visible to the current caller.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<WorkspaceSummaryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<WorkspaceSummaryDto>>> ListAsync(CancellationToken ct)
    {
        if (_tenantContext.WorkspaceId == Guid.Empty)
        {
            return Ok(Array.Empty<WorkspaceSummaryDto>());
        }

        var results = new List<WorkspaceSummaryDto>
        {
            new WorkspaceSummaryDto
            {
                Id = _tenantContext.WorkspaceId,
                Name = "Current workspace",
                Tier = _tenantContext.Tier,
            },
        };

        if (string.Equals(_tenantContext.Tier, "enterprise", StringComparison.OrdinalIgnoreCase))
        {
            var links = await _dbContext.WorkspaceLinks
                .AsNoTracking()
                .Where(link => link.TenantId == _tenantContext.TenantId && link.WorkspaceId == _tenantContext.WorkspaceId)
                .OrderBy(link => link.LinkedWorkspaceId)
                .ToListAsync(ct)
                .ConfigureAwait(false);

            results.AddRange(links.Select(link => new WorkspaceSummaryDto
            {
                Id = link.LinkedWorkspaceId,
                Name = $"Linked workspace {link.LinkedWorkspaceId}",
                Tier = _tenantContext.Tier,
            }));
        }

        return Ok(results);
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
