using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Orqentis.Api.Dtos;
using Orqentis.Data;
using Orqentis.Data.Entities;

namespace Orqentis.Api.Controllers;

/// <summary>Workspace browser and API key endpoints.</summary>
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

    // ──────────────────────────────────────────────────────────────────────
    // API key endpoints
    // ──────────────────────────────────────────────────────────────────────

    /// <summary>Lists active API keys for the current workspace (no raw key returned).</summary>
    [HttpGet("api-keys")]
    [ProducesResponseType(typeof(IReadOnlyList<WorkspaceApiKeyDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<WorkspaceApiKeyDto>>> ListApiKeysAsync(CancellationToken ct)
    {
        if (_tenantContext.WorkspaceId == Guid.Empty)
        {
            return Ok(Array.Empty<WorkspaceApiKeyDto>());
        }

        var keys = await _dbContext.WorkspaceApiKeys
            .AsNoTracking()
            .Where(k => k.WorkspaceId == _tenantContext.WorkspaceId)
            .OrderByDescending(k => k.CreatedAt)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        return Ok(keys.Select(k => new WorkspaceApiKeyDto
        {
            Id = k.KeyId,
            DisplayName = k.DisplayName,
            KeyHint = $"orq_{k.KeyPrefix}…",
            CreatedAt = k.CreatedAt,
            LastUsedAt = k.LastUsedAt,
        }).ToArray());
    }

    /// <summary>
    /// Generates a new M2M API key for the workspace. The raw key is returned exactly
    /// once in this response and is never stored — only its SHA-256 hash is persisted.
    /// </summary>
    [HttpPost("api-keys")]
    [ProducesResponseType(typeof(CreateApiKeyResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CreateApiKeyResponse>> CreateApiKeyAsync(
        [FromBody] CreateApiKeyRequest request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.DisplayName))
        {
            return BadRequest(new ProblemDetails { Title = "DisplayName is required." });
        }

        if (_tenantContext.TenantId == Guid.Empty || _tenantContext.WorkspaceId == Guid.Empty)
        {
            return Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Tenant context required.");
        }

        // Generate a 32-byte random token, encode as base64url → ~43 chars
        var rawBytes = RandomNumberGenerator.GetBytes(32);
        var tokenBody = Base64Url(rawBytes);
        var rawKey = $"orq_{tokenBody}";

        // Prefix (first 8 chars of body) shown in the UI for key identification
        var prefix = tokenBody[..8];

        // SHA-256 of the full raw key stored for future validation
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawKey));
        var keyHash = Convert.ToHexString(hashBytes).ToLowerInvariant();

        // Caller identity from the JWT sub claim
        var caller = User.FindFirst("sub")?.Value
            ?? User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value
            ?? "unknown";

        var entity = new WorkspaceApiKey
        {
            KeyId = Guid.NewGuid(),
            TenantId = _tenantContext.TenantId,
            WorkspaceId = _tenantContext.WorkspaceId,
            DisplayName = request.DisplayName.Trim(),
            KeyPrefix = prefix,
            KeyHash = keyHash,
            CreatedBy = caller,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        _dbContext.WorkspaceApiKeys.Add(entity);
        await _dbContext.SaveChangesAsync(ct).ConfigureAwait(false);

        var response = new CreateApiKeyResponse
        {
            Id = entity.KeyId,
            DisplayName = entity.DisplayName,
            KeyHint = $"orq_{prefix}…",
            RawKey = rawKey,
            CreatedAt = entity.CreatedAt,
        };

        return CreatedAtAction(nameof(ListApiKeysAsync), response);
    }

    /// <summary>Soft-deletes an API key.</summary>
    [HttpDelete("api-keys/{keyId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteApiKeyAsync(Guid keyId, CancellationToken ct)
    {
        var key = await _dbContext.WorkspaceApiKeys
            .FirstOrDefaultAsync(k => k.KeyId == keyId && k.WorkspaceId == _tenantContext.WorkspaceId, ct)
            .ConfigureAwait(false);

        if (key is null)
        {
            return NotFound();
        }

        key.DeletedAt = DateTimeOffset.UtcNow;
        await _dbContext.SaveChangesAsync(ct).ConfigureAwait(false);
        return NoContent();
    }

    private static string Base64Url(byte[] bytes)
    {
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }
}
