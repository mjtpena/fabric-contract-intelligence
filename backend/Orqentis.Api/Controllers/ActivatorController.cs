using Microsoft.AspNetCore.Mvc;
using Orqentis.Api.Auth;
using Orqentis.Api.Dtos;
using Orqentis.Api.Services;
using Orqentis.Data;

namespace Orqentis.Api.Controllers;

[ApiController]
[Route("v1/activator")]
[Enterprise]
public sealed class ActivatorController : ControllerBase
{
    private readonly ITenantContext _tenantContext;
    private readonly IOneLakeTokenBroker _tokenBroker;
    private readonly IActivatorClient _activatorClient;

    public ActivatorController(
        ITenantContext tenantContext,
        IOneLakeTokenBroker tokenBroker,
        IActivatorClient activatorClient)
    {
        _tenantContext = tenantContext;
        _tokenBroker = tokenBroker;
        _activatorClient = activatorClient;
    }

    [HttpGet("rules")]
    [ProducesResponseType(typeof(IReadOnlyList<ActivatorRuleDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ActivatorRuleDto>>> ListRulesAsync(CancellationToken ct)
    {
        var bearer = GetBearerToken();
        if (string.IsNullOrWhiteSpace(bearer))
        {
            return Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Bearer token missing.");
        }

        var fabricToken = await _tokenBroker.GetFabricRestTokenAsync(bearer, ct).ConfigureAwait(false);
        var rules = await _activatorClient.ListRulesAsync(_tenantContext.WorkspaceId, fabricToken, ct).ConfigureAwait(false);
        return Ok(rules.Select(rule => new ActivatorRuleDto { Id = rule.RuleId, Name = rule.Name }).ToArray());
    }

    private string? GetBearerToken()
    {
        if (!Request.Headers.TryGetValue("Authorization", out var authorization))
        {
            return null;
        }

        const string prefix = "Bearer ";
        var headerValue = authorization.ToString();
        return headerValue.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
            ? headerValue[prefix.Length..].Trim()
            : null;
    }
}
