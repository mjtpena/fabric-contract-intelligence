using System.Net.Http.Headers;
using Microsoft.AspNetCore.Mvc;
using Orqentis.Api.Auth;
using Orqentis.Api.Dtos;
using Orqentis.Api.Services;

namespace Orqentis.Api.Controllers;

/// <summary>
/// Proxy endpoints that fan out to the Fabric REST API using an OBO-exchanged token.
/// The frontend cannot call api.fabric.microsoft.com directly (CORS + token scope limitations),
/// so all Fabric REST calls flow through these endpoints.
/// </summary>
[ApiController]
[Route("v1/fabric")]
public sealed class FabricProxyController : ControllerBase
{
    private const string _fabricApiBase = "https://api.fabric.microsoft.com/v1";

    private readonly IOneLakeTokenBroker _tokenBroker;
    private readonly HttpClient _httpClient;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<FabricProxyController> _logger;

    public FabricProxyController(
        IOneLakeTokenBroker tokenBroker,
        IHttpClientFactory httpClientFactory,
        IHttpContextAccessor httpContextAccessor,
        ILogger<FabricProxyController> logger)
    {
        _tokenBroker = tokenBroker;
        _httpClient = httpClientFactory.CreateClient("fabric-rest");
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    /// <summary>Lists all Lakehouse items in the given workspace via the Fabric REST API.</summary>
    [HttpGet("{workspaceId:guid}/lakehouses")]
    [ProducesResponseType(typeof(IReadOnlyList<FabricLakehouseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<IReadOnlyList<FabricLakehouseDto>>> ListLakehousesAsync(
        Guid workspaceId,
        CancellationToken ct)
    {
        var userAssertion = GetUserAssertion();
        if (string.IsNullOrWhiteSpace(userAssertion))
        {
            return Unauthorized();
        }

        string fabricToken;
        try
        {
            fabricToken = await _tokenBroker.GetFabricRestTokenAsync(userAssertion, ct).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "FabricProxy-OboExchange-Failed WorkspaceId={WorkspaceId}", workspaceId);
            return StatusCode(StatusCodes.Status502BadGateway, "Failed to exchange token for Fabric REST access.");
        }

        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{_fabricApiBase}/workspaces/{workspaceId}/lakehouses");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", fabricToken);

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "FabricProxy-Lakehouses-HttpError WorkspaceId={WorkspaceId}", workspaceId);
            return StatusCode(StatusCodes.Status502BadGateway);
        }

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(
                "FabricProxy-Lakehouses-Upstream WorkspaceId={WorkspaceId} StatusCode={StatusCode}",
                workspaceId,
                (int)response.StatusCode);
            return StatusCode((int)response.StatusCode);
        }

        var body = await response.Content.ReadFromJsonAsync<FabricLakehouseListResponse>(ct).ConfigureAwait(false);
        var lakehouses = (body?.Value ?? [])
            .Select(item => new FabricLakehouseDto
            {
                Id = item.Id,
                DisplayName = item.DisplayName,
                WorkspaceId = workspaceId,
            })
            .ToArray();

        return Ok(lakehouses);
    }

    /// <summary>Lists Fabric items eligible for a contract target type.</summary>
    [HttpGet("{workspaceId:guid}/items")]
    [ProducesResponseType(typeof(IReadOnlyList<FabricItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<IReadOnlyList<FabricItemDto>>> ListTargetItemsAsync(
        Guid workspaceId,
        [FromQuery] string targetType,
        CancellationToken ct)
    {
        var normalizedTargetType = ContractTargetTypes.Normalize(targetType);
        if (normalizedTargetType is null)
        {
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid target type.",
                detail: "Target type must be one of lakehouse, warehouse, eventhouse, semantic_model, or fabric_sql.");
        }

        var allowedFabricTypes = ResolveFabricItemTypes(normalizedTargetType);
        var userAssertion = GetUserAssertion();
        if (string.IsNullOrWhiteSpace(userAssertion))
        {
            return Unauthorized();
        }

        string fabricToken;
        try
        {
            fabricToken = await _tokenBroker.GetFabricRestTokenAsync(userAssertion, ct).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "FabricProxy-OboExchange-Failed WorkspaceId={WorkspaceId} TargetType={TargetType}", workspaceId, normalizedTargetType);
            return StatusCode(StatusCodes.Status502BadGateway, "Failed to exchange token for Fabric REST access.");
        }

        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{_fabricApiBase}/workspaces/{workspaceId}/items");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", fabricToken);

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "FabricProxy-Items-HttpError WorkspaceId={WorkspaceId} TargetType={TargetType}", workspaceId, normalizedTargetType);
            return StatusCode(StatusCodes.Status502BadGateway);
        }

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(
                "FabricProxy-Items-Upstream WorkspaceId={WorkspaceId} TargetType={TargetType} StatusCode={StatusCode}",
                workspaceId,
                normalizedTargetType,
                (int)response.StatusCode);
            return StatusCode((int)response.StatusCode);
        }

        var body = await response.Content.ReadFromJsonAsync<FabricItemListResponse>(ct).ConfigureAwait(false);
        var items = (body?.Value ?? [])
            .Where(item => allowedFabricTypes.Contains(item.Type))
            .Select(item => new FabricItemDto
            {
                Id = item.Id,
                DisplayName = item.DisplayName,
                Type = item.Type,
                WorkspaceId = workspaceId,
            })
            .OrderBy(item => item.DisplayName, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return Ok(items);
    }

    /// <summary>Lists Delta/Parquet tables inside the given Lakehouse via the Fabric REST API.</summary>
    [HttpGet("{workspaceId:guid}/lakehouses/{lakehouseId:guid}/tables")]
    [ProducesResponseType(typeof(IReadOnlyList<FabricTableDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<IReadOnlyList<FabricTableDto>>> ListTablesAsync(
        Guid workspaceId,
        Guid lakehouseId,
        CancellationToken ct)
    {
        var userAssertion = GetUserAssertion();
        if (string.IsNullOrWhiteSpace(userAssertion))
        {
            return Unauthorized();
        }

        string fabricToken;
        try
        {
            fabricToken = await _tokenBroker.GetFabricRestTokenAsync(userAssertion, ct).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "FabricProxy-OboExchange-Failed WorkspaceId={WorkspaceId} LakehouseId={LakehouseId}", workspaceId, lakehouseId);
            return StatusCode(StatusCodes.Status502BadGateway, "Failed to exchange token for Fabric REST access.");
        }

        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{_fabricApiBase}/workspaces/{workspaceId}/lakehouses/{lakehouseId}/tables");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", fabricToken);

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "FabricProxy-Tables-HttpError WorkspaceId={WorkspaceId} LakehouseId={LakehouseId}", workspaceId, lakehouseId);
            return StatusCode(StatusCodes.Status502BadGateway);
        }

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(
                "FabricProxy-Tables-Upstream WorkspaceId={WorkspaceId} LakehouseId={LakehouseId} StatusCode={StatusCode}",
                workspaceId,
                lakehouseId,
                (int)response.StatusCode);
            return StatusCode((int)response.StatusCode);
        }

        var body = await response.Content.ReadFromJsonAsync<FabricTableListResponse>(ct).ConfigureAwait(false);
        var tables = (body?.Data ?? [])
            .Select(item => new FabricTableDto
            {
                Name = item.Name,
                Type = item.Type,
                Location = item.Location,
            })
            .ToArray();

        return Ok(tables);
    }

    private string? GetUserAssertion()
    {
        var authHeader = _httpContextAccessor.HttpContext?.Request.Headers.Authorization.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(authHeader) ||
            !authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        return authHeader["Bearer ".Length..].Trim();
    }

    // ─── Fabric REST API response shapes (internal deserialization only) ──────

    private sealed class FabricLakehouseListResponse
    {
        public List<FabricLakehouseItem>? Value { get; set; }
    }

    private sealed class FabricLakehouseItem
    {
        public Guid Id { get; set; }
        public string DisplayName { get; set; } = string.Empty;
    }

    private sealed class FabricItemListResponse
    {
        public List<FabricItem>? Value { get; set; }
    }

    private sealed class FabricItem
    {
        public Guid Id { get; set; }
        public string DisplayName { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
    }

    private sealed class FabricTableListResponse
    {
        public List<FabricTableItem>? Data { get; set; }
    }

    private sealed class FabricTableItem
    {
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
    }

    private static HashSet<string> ResolveFabricItemTypes(string targetType) =>
        ContractTargetTypes.Normalize(targetType) switch
        {
            ContractTargetTypes.Warehouse => new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "Warehouse",
            },
            ContractTargetTypes.Eventhouse => new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "Eventhouse",
                "KQLDatabase",
                "KQL Database",
            },
            ContractTargetTypes.SemanticModel => new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "SemanticModel",
                "Semantic Model",
                "Dataset",
            },
            ContractTargetTypes.FabricSql => new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "SQLDatabase",
                "SQL Database",
                "MirroredDatabase",
            },
            _ => new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "Lakehouse",
            },
        };
}
