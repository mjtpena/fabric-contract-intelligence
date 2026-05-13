using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Orqentis.Data;
using Orqentis.Data.Entities;

namespace Orqentis.Api.Services;

/// <summary>EF Core-backed contract store for the Sprint 4 API surface.</summary>
public sealed class ContractStore : IContractStore
{
    private readonly OrqentisDbContext _dbContext;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<ContractStore> _logger;

    public ContractStore(
        OrqentisDbContext dbContext,
        ITenantContext tenantContext,
        ILogger<ContractStore> logger)
    {
        _dbContext = dbContext;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<ContractSummaryRecord>> ListAsync(CancellationToken ct = default)
    {
        var contracts = await _dbContext.Contracts
            .AsNoTracking()
            .Where(c => _tenantContext.WorkspaceId == Guid.Empty || c.WorkspaceId == _tenantContext.WorkspaceId)
            .OrderBy(c => c.Name)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        var latestRuns = await LoadLatestRunsAsync(contracts.Select(c => c.ContractId).ToArray(), ct).ConfigureAwait(false);

        return contracts
            .Select(contract => new ContractSummaryRecord(
                contract.ContractId,
                contract.Name,
                contract.TargetType,
                contract.Status,
                contract.CurrentVersion,
                latestRuns.TryGetValue(contract.ContractId, out var latestRun) ? latestRun : null))
            .ToArray();
    }

    /// <inheritdoc />
    public async Task<ContractRecord?> GetAsync(Guid contractId, CancellationToken ct = default)
    {
        var contract = await _dbContext.Contracts
            .AsNoTracking()
            .SingleOrDefaultAsync(
                c => c.ContractId == contractId &&
                    (_tenantContext.WorkspaceId == Guid.Empty || c.WorkspaceId == _tenantContext.WorkspaceId),
                ct)
            .ConfigureAwait(false);

        if (contract is null)
        {
            return null;
        }

        var version = await LoadCurrentVersionAsync(contract.ContractId, contract.CurrentVersion, ct).ConfigureAwait(false);
        var latestRun = await LoadLatestRunAsync(contract.ContractId, ct).ConfigureAwait(false);
        return MapContract(contract, version, latestRun);
    }

    /// <inheritdoc />
    public async Task<ContractRecord> CreateAsync(CreateContractCommand command, CancellationToken ct = default)
    {
        if (await _dbContext.Contracts.AnyAsync(
                c => c.WorkspaceId == command.WorkspaceId && c.Name == command.Name,
                ct).ConfigureAwait(false))
        {
            throw new ContractConflictException("A contract with that name already exists in the workspace.");
        }

        var existingVersion = await _dbContext.ContractVersions
            .AsNoTracking()
            .Join(
                _dbContext.Contracts.AsNoTracking(),
                version => version.ContractId,
                contract => contract.ContractId,
                (version, contract) => new { version, contract })
            .AnyAsync(
                row => row.contract.WorkspaceId == command.WorkspaceId &&
                    row.contract.Name == command.Name &&
                    row.version.Version == command.CurrentVersion,
                ct)
            .ConfigureAwait(false);

        if (existingVersion)
        {
            throw new ContractConflictException("A contract version with that value already exists in the workspace.");
        }

        var contract = new Contract
        {
            ContractId = Guid.NewGuid(),
            TenantId = _tenantContext.TenantId,
            WorkspaceId = command.WorkspaceId,
            FabricItemId = command.TargetItemId,
            TargetType = command.TargetType,
            Name = command.Name,
            Status = command.Status,
            CurrentVersion = command.CurrentVersion,
            OwnerEmail = command.OwnerEmail,
            CreatedBy = command.CreatedBy,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        var version = new ContractVersion
        {
            VersionId = Guid.NewGuid(),
            ContractId = contract.ContractId,
            Version = command.CurrentVersion,
            OdcsYaml = command.OdcsYaml,
            OdcsHash = ComputeHash(command.OdcsYaml),
            CreatedBy = command.CreatedBy,
            CreatedAt = DateTimeOffset.UtcNow,
            CommitMessage = command.CommitMessage,
        };

        _dbContext.Contracts.Add(contract);
        _dbContext.ContractVersions.Add(version);

        await _dbContext.SaveChangesAsync(ct).ConfigureAwait(false);

        _logger.LogInformation(
            "Contract-Created ContractId={ContractId} TenantId={TenantId}",
            contract.ContractId,
            _tenantContext.TenantId);

        return MapContract(contract, MapVersion(version), null);
    }

    /// <inheritdoc />
    public async Task<ContractRecord?> UpdateAsync(Guid contractId, UpdateContractCommand command, CancellationToken ct = default)
    {
        var contract = await _dbContext.Contracts
            .SingleOrDefaultAsync(
                c => c.ContractId == contractId &&
                    (_tenantContext.WorkspaceId == Guid.Empty || c.WorkspaceId == _tenantContext.WorkspaceId),
                ct)
            .ConfigureAwait(false);

        if (contract is null)
        {
            return null;
        }

        if (await _dbContext.ContractVersions.AnyAsync(
                version => version.ContractId == contractId && version.Version == command.CurrentVersion,
                ct).ConfigureAwait(false))
        {
            throw new ContractConflictException("A contract version with that value already exists.");
        }

        contract.Name = command.Name;
        contract.Status = command.Status;
        contract.OwnerEmail = command.OwnerEmail;
        contract.CurrentVersion = command.CurrentVersion;
        contract.FabricItemId = command.TargetItemId;
        contract.TargetType = command.TargetType;
        contract.UpdatedAt = DateTimeOffset.UtcNow;

        var version = new ContractVersion
        {
            VersionId = Guid.NewGuid(),
            ContractId = contract.ContractId,
            Version = command.CurrentVersion,
            OdcsYaml = command.OdcsYaml,
            OdcsHash = ComputeHash(command.OdcsYaml),
            CreatedBy = command.UpdatedBy,
            CreatedAt = DateTimeOffset.UtcNow,
            CommitMessage = command.CommitMessage,
        };

        _dbContext.ContractVersions.Add(version);
        await _dbContext.SaveChangesAsync(ct).ConfigureAwait(false);

        _logger.LogInformation(
            "Contract-Updated ContractId={ContractId} Version={Version}",
            contractId,
            command.CurrentVersion);

        return MapContract(contract, MapVersion(version), await LoadLatestRunAsync(contractId, ct).ConfigureAwait(false));
    }

    /// <inheritdoc />
    public async Task<bool> SoftDeleteAsync(Guid contractId, CancellationToken ct = default)
    {
        var contract = await _dbContext.Contracts
            .SingleOrDefaultAsync(
                c => c.ContractId == contractId &&
                    (_tenantContext.WorkspaceId == Guid.Empty || c.WorkspaceId == _tenantContext.WorkspaceId),
                ct)
            .ConfigureAwait(false);

        if (contract is null)
        {
            return false;
        }

        contract.Status = "archived";
        contract.DeletedAt = DateTimeOffset.UtcNow;
        contract.UpdatedAt = DateTimeOffset.UtcNow;
        await _dbContext.SaveChangesAsync(ct).ConfigureAwait(false);
        return true;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<ContractVersionRecord>> ListVersionsAsync(Guid contractId, CancellationToken ct = default)
    {
        if (!await ContractExistsAsync(contractId, ct).ConfigureAwait(false))
        {
            return [];
        }

        return await _dbContext.ContractVersions
            .AsNoTracking()
            .Where(v => v.ContractId == contractId)
            .OrderByDescending(v => v.CreatedAt)
            .Select(v => MapVersion(v))
            .ToArrayAsync(ct)
            .ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task<ContractVersionRecord?> GetVersionAsync(Guid contractId, string version, CancellationToken ct = default)
    {
        if (!await ContractExistsAsync(contractId, ct).ConfigureAwait(false))
        {
            return null;
        }

        return await _dbContext.ContractVersions
            .AsNoTracking()
            .Where(v => v.ContractId == contractId && v.Version == version)
            .Select(v => MapVersion(v))
            .SingleOrDefaultAsync(ct)
            .ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task<EnforcementRunRecord?> CreateRunAsync(CreateRunCommand command, CancellationToken ct = default)
    {
        if (!await ContractExistsAsync(command.ContractId, ct).ConfigureAwait(false))
        {
            return null;
        }

        var entity = new EnforcementRun
        {
            RunId = Guid.NewGuid(),
            ContractId = command.ContractId,
            VersionId = command.VersionId,
            TriggeredBy = command.TriggeredBy,
            TriggeredAt = command.TriggeredAt,
            CompletedAt = command.CompletedAt,
            Status = command.Status,
            DeltaTableVersion = command.DeltaTableVersion,
            BreachScore = command.BreachScore,
            BreachScoreBreakdown = command.BreachScoreBreakdownJson,
            ActivatorTriggered = command.ActivatorTriggered,
            ResultJson = command.ResultJson,
            CorrelationId = command.CorrelationId,
        };

        _dbContext.EnforcementRuns.Add(entity);
        await _dbContext.SaveChangesAsync(ct).ConfigureAwait(false);
        return MapRun(entity);
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<EnforcementRunRecord>> ListRunsAsync(Guid contractId, CancellationToken ct = default)
    {
        if (!await ContractExistsAsync(contractId, ct).ConfigureAwait(false))
        {
            return [];
        }

        return await _dbContext.EnforcementRuns
            .AsNoTracking()
            .Where(r => r.ContractId == contractId)
            .OrderByDescending(r => r.TriggeredAt)
            .Select(r => MapRun(r))
            .ToArrayAsync(ct)
            .ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task<EnforcementRunRecord?> GetRunAsync(Guid runId, CancellationToken ct = default)
    {
        return await (
            from run in _dbContext.EnforcementRuns.AsNoTracking()
            join contract in _dbContext.Contracts.AsNoTracking() on run.ContractId equals contract.ContractId
            where run.RunId == runId &&
                (_tenantContext.WorkspaceId == Guid.Empty || contract.WorkspaceId == _tenantContext.WorkspaceId)
            select MapRun(run))
            .SingleOrDefaultAsync(ct)
            .ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task<EnforcementRunRecord?> UpdateRunEnrichmentAsync(UpdateRunEnrichmentCommand command, CancellationToken ct = default)
    {
        var entity = await (
            from run in _dbContext.EnforcementRuns
            join contract in _dbContext.Contracts on run.ContractId equals contract.ContractId
            where run.RunId == command.RunId &&
                (_tenantContext.WorkspaceId == Guid.Empty || contract.WorkspaceId == _tenantContext.WorkspaceId)
            select run)
            .SingleOrDefaultAsync(ct)
            .ConfigureAwait(false);

        if (entity is null)
        {
            return null;
        }

        entity.BreachScore = command.BreachScore;
        entity.BreachScoreBreakdown = command.BreachScoreBreakdownJson;
        entity.ActivatorTriggered = command.ActivatorTriggered;
        entity.ResultJson = command.ResultJson;
        await _dbContext.SaveChangesAsync(ct).ConfigureAwait(false);
        return MapRun(entity);
    }

    /// <inheritdoc />
    public async Task<FederatedContractsPage> ListFederatedContractsAsync(int pageSize, string? cursor, CancellationToken ct = default)
    {
        var effectivePageSize = Math.Clamp(pageSize, 1, 100);
        DateTimeOffset? cursorUpdatedAt = null;
        Guid? cursorContractId = null;
        if (!string.IsNullOrWhiteSpace(cursor))
        {
            var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(cursor));
            var parts = decoded.Split('|', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (parts.Length == 2 &&
                DateTimeOffset.TryParse(parts[0], out var parsedUpdatedAt) &&
                Guid.TryParse(parts[1], out var parsedContractId))
            {
                cursorUpdatedAt = parsedUpdatedAt;
                cursorContractId = parsedContractId;
            }
        }

        var linkedWorkspaceIds = await _dbContext.WorkspaceLinks
            .AsNoTracking()
            .Where(link => link.TenantId == _tenantContext.TenantId && link.WorkspaceId == _tenantContext.WorkspaceId)
            .Select(link => link.LinkedWorkspaceId)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        var workspaceIds = linkedWorkspaceIds
            .Append(_tenantContext.WorkspaceId)
            .Distinct()
            .ToArray();

        var query = _dbContext.Contracts
            .AsNoTracking()
            .Where(contract => workspaceIds.Contains(contract.WorkspaceId))
            .OrderByDescending(contract => contract.UpdatedAt)
            .ThenByDescending(contract => contract.ContractId);

        if (cursorUpdatedAt.HasValue && cursorContractId.HasValue)
        {
            query = query.Where(contract =>
                contract.UpdatedAt < cursorUpdatedAt.Value ||
                (contract.UpdatedAt == cursorUpdatedAt.Value && contract.ContractId.CompareTo(cursorContractId.Value) < 0))
                .OrderByDescending(contract => contract.UpdatedAt)
                .ThenByDescending(contract => contract.ContractId);
        }

        var contracts = await query
            .Take(effectivePageSize + 1)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        var hasMore = contracts.Count > effectivePageSize;
        var pageItems = hasMore ? contracts.Take(effectivePageSize).ToArray() : contracts.ToArray();

        var latestRuns = await LoadLatestRunsAsync(pageItems.Select(item => item.ContractId).ToArray(), ct).ConfigureAwait(false);
        var summaries = pageItems
            .Select(contract => new ContractSummaryRecord(
                contract.ContractId,
                contract.Name,
                contract.TargetType,
                contract.Status,
                contract.CurrentVersion,
                latestRuns.TryGetValue(contract.ContractId, out var latestRun) ? latestRun : null))
            .ToArray();

        string? nextCursor = null;
        if (hasMore)
        {
            var last = pageItems[^1];
            nextCursor = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{last.UpdatedAt:O}|{last.ContractId}"));
        }

        return new FederatedContractsPage(summaries, nextCursor);
    }

    private async Task<bool> ContractExistsAsync(Guid contractId, CancellationToken ct)
    {
        return await _dbContext.Contracts
            .AsNoTracking()
            .AnyAsync(
                c => c.ContractId == contractId &&
                    (_tenantContext.WorkspaceId == Guid.Empty || c.WorkspaceId == _tenantContext.WorkspaceId),
                ct)
            .ConfigureAwait(false);
    }

    private async Task<ContractVersionRecord?> LoadCurrentVersionAsync(Guid contractId, string currentVersion, CancellationToken ct)
    {
        var version = await _dbContext.ContractVersions
            .AsNoTracking()
            .Where(v => v.ContractId == contractId && v.Version == currentVersion)
            .Select(v => MapVersion(v))
            .SingleOrDefaultAsync(ct)
            .ConfigureAwait(false);

        if (version is not null)
        {
            return version;
        }

        return await _dbContext.ContractVersions
            .AsNoTracking()
            .Where(v => v.ContractId == contractId)
            .OrderByDescending(v => v.CreatedAt)
            .Select(v => MapVersion(v))
            .FirstOrDefaultAsync(ct)
            .ConfigureAwait(false);
    }

    private async Task<EnforcementRunRecord?> LoadLatestRunAsync(Guid contractId, CancellationToken ct)
    {
        return await _dbContext.EnforcementRuns
            .AsNoTracking()
            .Where(r => r.ContractId == contractId)
            .OrderByDescending(r => r.TriggeredAt)
            .Select(r => MapRun(r))
            .FirstOrDefaultAsync(ct)
            .ConfigureAwait(false);
    }

    private async Task<Dictionary<Guid, EnforcementRunRecord>> LoadLatestRunsAsync(Guid[] contractIds, CancellationToken ct)
    {
        if (contractIds.Length == 0)
        {
            return [];
        }

        var runs = await _dbContext.EnforcementRuns
            .AsNoTracking()
            .Where(r => contractIds.Contains(r.ContractId))
            .OrderByDescending(r => r.TriggeredAt)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        return runs
            .GroupBy(r => r.ContractId)
            .Select(group => group.First())
            .ToDictionary(r => r.ContractId, MapRun);
    }

    private static ContractRecord MapContract(
        Contract contract,
        ContractVersionRecord? currentVersion,
        EnforcementRunRecord? latestRun) =>
        new(
            contract.ContractId,
            contract.TenantId,
            contract.WorkspaceId,
            contract.FabricItemId,
            contract.TargetType,
            contract.Name,
            contract.Status,
            contract.CurrentVersion,
            contract.OwnerEmail,
            contract.CreatedBy,
            contract.CreatedAt,
            contract.UpdatedAt,
            currentVersion,
            latestRun);

    private static ContractVersionRecord MapVersion(ContractVersion version) =>
        new(
            version.VersionId,
            version.ContractId,
            version.Version,
            version.OdcsYaml,
            version.OdcsHash,
            version.CreatedBy,
            version.CreatedAt,
            version.CommitMessage);

    private static EnforcementRunRecord MapRun(EnforcementRun run) =>
        new(
            run.RunId,
            run.ContractId,
            run.VersionId,
            run.TriggeredBy,
            run.TriggeredAt,
            run.CompletedAt,
            run.Status,
            run.DeltaTableVersion,
            run.BreachScore,
            run.BreachScoreBreakdown,
            run.ActivatorTriggered,
            run.ResultJson,
            run.CorrelationId);

    private static string ComputeHash(string content)
    {
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(content));
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }
}
