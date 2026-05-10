using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Orqentis.Api.Auth;
using Orqentis.Api.Dtos;
using Orqentis.Data;
using Orqentis.Data.Entities;

namespace Orqentis.Api.Controllers;

/// <summary>Enterprise policy management endpoints.</summary>
[ApiController]
[Route("v1/policies")]
public sealed class PoliciesController : ControllerBase
{
    private readonly OrqentisDbContext _dbContext;
    private readonly ITenantContext _tenantContext;

    public PoliciesController(OrqentisDbContext dbContext, ITenantContext tenantContext)
    {
        _dbContext = dbContext;
        _tenantContext = tenantContext;
    }

    /// <summary>Lists persisted policies for the current tenant workspace scope.</summary>
    [HttpGet]
    [Enterprise]
    [ProducesResponseType(typeof(IReadOnlyList<PolicyDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<PolicyDto>>> ListAsync(CancellationToken ct)
    {
        var policies = await (
            from policy in _dbContext.ContractPolicies.AsNoTracking()
            join contract in _dbContext.Contracts.AsNoTracking() on policy.ContractId equals contract.ContractId
            where _tenantContext.WorkspaceId == Guid.Empty || contract.WorkspaceId == _tenantContext.WorkspaceId
            orderby contract.Name, policy.CreatedAt
            select new { policy })
            .ToListAsync(ct)
            .ConfigureAwait(false);

        return Ok(policies.Select(row => MapPolicy(row.policy)).ToArray());
    }

    /// <summary>Creates a policy linked to an existing contract.</summary>
    [HttpPost]
    [Enterprise]
    [ProducesResponseType(typeof(PolicyDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PolicyDto>> CreateAsync([FromBody] CreatePolicyRequest request, CancellationToken ct)
    {
        var contractExists = await _dbContext.Contracts
            .AsNoTracking()
            .AnyAsync(
                contract => contract.ContractId == request.ContractId &&
                    (_tenantContext.WorkspaceId == Guid.Empty || contract.WorkspaceId == _tenantContext.WorkspaceId),
                ct)
            .ConfigureAwait(false);

        if (!contractExists)
        {
            return Problem(statusCode: StatusCodes.Status404NotFound, title: "Contract not found.");
        }

        var now = DateTimeOffset.UtcNow;
        var entity = new ContractPolicy
        {
            PolicyId = Guid.NewGuid(),
            ContractId = request.ContractId,
            ActivatorRuleId = request.ActivatorRuleId,
            TriggerEvent = request.TriggerEvent,
            ActionType = request.ActionType,
            ActionConfigJson = string.IsNullOrWhiteSpace(request.ActionConfigJson) ? "{}" : request.ActionConfigJson,
            Enabled = request.Enabled,
            CreatedAt = now,
            UpdatedAt = now,
        };

        _dbContext.ContractPolicies.Add(entity);
        await _dbContext.SaveChangesAsync(ct).ConfigureAwait(false);

        return Created($"/v1/policies/{entity.PolicyId}", MapPolicy(entity));
    }

    /// <summary>Updates a policy for the current tenant workspace scope.</summary>
    [HttpPut("{id:guid}")]
    [Enterprise]
    [ProducesResponseType(typeof(PolicyDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PolicyDto>> UpdateAsync(Guid id, [FromBody] UpdatePolicyRequest request, CancellationToken ct)
    {
        var policy = await (
            from candidate in _dbContext.ContractPolicies
            join contract in _dbContext.Contracts on candidate.ContractId equals contract.ContractId
            where candidate.PolicyId == id &&
                (_tenantContext.WorkspaceId == Guid.Empty || contract.WorkspaceId == _tenantContext.WorkspaceId)
            select candidate)
            .SingleOrDefaultAsync(ct)
            .ConfigureAwait(false);

        if (policy is null)
        {
            return Problem(statusCode: StatusCodes.Status404NotFound, title: "Policy not found.");
        }

        policy.ActivatorRuleId = request.ActivatorRuleId;
        policy.TriggerEvent = request.TriggerEvent;
        policy.ActionType = request.ActionType;
        policy.ActionConfigJson = string.IsNullOrWhiteSpace(request.ActionConfigJson) ? "{}" : request.ActionConfigJson;
        policy.Enabled = request.Enabled;
        policy.UpdatedAt = DateTimeOffset.UtcNow;

        await _dbContext.SaveChangesAsync(ct).ConfigureAwait(false);
        return Ok(MapPolicy(policy));
    }

    /// <summary>Disables a policy without deleting data.</summary>
    [HttpDelete("{id:guid}")]
    [Enterprise]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteAsync(Guid id, CancellationToken ct)
    {
        var policy = await (
            from candidate in _dbContext.ContractPolicies
            join contract in _dbContext.Contracts on candidate.ContractId equals contract.ContractId
            where candidate.PolicyId == id &&
                (_tenantContext.WorkspaceId == Guid.Empty || contract.WorkspaceId == _tenantContext.WorkspaceId)
            select candidate)
            .SingleOrDefaultAsync(ct)
            .ConfigureAwait(false);

        if (policy is null)
        {
            return Problem(statusCode: StatusCodes.Status404NotFound, title: "Policy not found.");
        }

        policy.Enabled = false;
        policy.UpdatedAt = DateTimeOffset.UtcNow;
        await _dbContext.SaveChangesAsync(ct).ConfigureAwait(false);
        return NoContent();
    }

    private static PolicyDto MapPolicy(ContractPolicy policy) =>
        new()
        {
            Id = policy.PolicyId,
            ContractId = policy.ContractId,
            ActivatorRuleId = policy.ActivatorRuleId,
            TriggerEvent = policy.TriggerEvent,
            ActionType = policy.ActionType,
            ActionConfigJson = policy.ActionConfigJson,
            Enabled = policy.Enabled,
            CreatedAt = ToIsoString(policy.CreatedAt),
            UpdatedAt = ToIsoString(policy.UpdatedAt),
        };

    private static string ToIsoString(DateTimeOffset value) => value.UtcDateTime.ToString("O");
}
