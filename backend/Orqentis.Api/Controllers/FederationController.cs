using Microsoft.AspNetCore.Mvc;
using Orqentis.Api.Auth;
using Orqentis.Api.Dtos;
using Orqentis.Api.Services;
using Orqentis.Data;

namespace Orqentis.Api.Controllers;

[ApiController]
[Route("v1/federation")]
[Enterprise]
public sealed class FederationController : ControllerBase
{
    private readonly ITenantContext _tenantContext;
    private readonly IContractStore _contractStore;

    public FederationController(ITenantContext tenantContext, IContractStore contractStore)
    {
        _tenantContext = tenantContext;
        _contractStore = contractStore;
    }

    [HttpGet("contracts")]
    [ProducesResponseType(typeof(FederatedContractsResponseDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<FederatedContractsResponseDto>> ListContractsAsync(
        [FromQuery] int pageSize = 25,
        [FromQuery] string? cursor = null,
        CancellationToken ct = default)
    {
        if (!string.Equals(_tenantContext.Tier, "enterprise", StringComparison.OrdinalIgnoreCase))
        {
            return Problem(statusCode: StatusCodes.Status402PaymentRequired, title: "Enterprise tier required.");
        }

        var page = await _contractStore.ListFederatedContractsAsync(pageSize, cursor, ct).ConfigureAwait(false);
        return Ok(new FederatedContractsResponseDto
        {
            NextCursor = page.NextCursor,
            Contracts = page.Contracts
                .Select(contract => new ContractSummaryDto
                {
                    Id = contract.ContractId,
                    Name = contract.Name,
                    TargetType = contract.TargetType,
                    Status = contract.Status,
                    Version = contract.CurrentVersion,
                    LastRunStatus = contract.LatestRun?.Status,
                    LastRunAt = contract.LatestRun?.TriggeredAt.UtcDateTime.ToString("O"),
                })
                .ToArray(),
        });
    }
}
