using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Orqentis.Api.Auth;
using Orqentis.Api.Dtos;
using Orqentis.Data;

namespace Orqentis.Api.Controllers;

/// <summary>Enterprise-only report endpoints.</summary>
[ApiController]
[Route("v1/reports")]
[Enterprise]
public sealed class ReportsController : ControllerBase
{
    private readonly OrqentisDbContext _dbContext;
    private readonly ITenantContext _tenantContext;

    public ReportsController(OrqentisDbContext dbContext, ITenantContext tenantContext)
    {
        _dbContext = dbContext;
        _tenantContext = tenantContext;
    }

    /// <summary>Aggregated run-status summary for the current tenant workspace scope.</summary>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(ReportSummaryDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<ReportSummaryDto>> SummaryAsync(CancellationToken ct)
    {
        var query = from run in _dbContext.EnforcementRuns.AsNoTracking()
                    join contract in _dbContext.Contracts.AsNoTracking() on run.ContractId equals contract.ContractId
                    where _tenantContext.WorkspaceId == Guid.Empty || contract.WorkspaceId == _tenantContext.WorkspaceId
                    select run;

        var runs = await query.ToListAsync(ct).ConfigureAwait(false);
        var latest = runs.OrderByDescending(run => run.TriggeredAt).FirstOrDefault();

        return Ok(new ReportSummaryDto
        {
            TotalRuns = runs.Count,
            PassedRuns = runs.Count(run => string.Equals(run.Status, "passed", StringComparison.OrdinalIgnoreCase)),
            FailedRuns = runs.Count(run => string.Equals(run.Status, "failed", StringComparison.OrdinalIgnoreCase)),
            WarnedRuns = runs.Count(run => string.Equals(run.Status, "warned", StringComparison.OrdinalIgnoreCase)),
            ErrorRuns = runs.Count(run => string.Equals(run.Status, "error", StringComparison.OrdinalIgnoreCase)),
            LastRunAt = latest is null ? null : ToIsoString(latest.TriggeredAt),
        });
    }

    /// <summary>Recent run audit rows for the current tenant workspace scope.</summary>
    [HttpGet("audit")]
    [ProducesResponseType(typeof(IReadOnlyList<AuditReportRowDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AuditReportRowDto>>> AuditAsync(CancellationToken ct)
    {
        var rows = await (
            from run in _dbContext.EnforcementRuns.AsNoTracking()
            join contract in _dbContext.Contracts.AsNoTracking() on run.ContractId equals contract.ContractId
            where _tenantContext.WorkspaceId == Guid.Empty || contract.WorkspaceId == _tenantContext.WorkspaceId
            orderby run.TriggeredAt descending
            select new AuditReportRowDto
            {
                RunId = run.RunId,
                ContractId = run.ContractId,
                ContractName = contract.Name,
                Status = run.Status,
                TriggeredBy = run.TriggeredBy,
                TriggeredAt = ToIsoString(run.TriggeredAt),
                CompletedAt = run.CompletedAt == null ? null : ToIsoString(run.CompletedAt.Value),
                DeltaTableVersion = run.DeltaTableVersion,
                BreachScore = run.BreachScore,
                CorrelationId = run.CorrelationId,
            })
            .Take(200)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        return Ok(rows);
    }

    private static string ToIsoString(DateTimeOffset value) => value.UtcDateTime.ToString("O");
}
