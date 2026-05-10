using Orqentis.Engine.Models;

namespace Orqentis.Api.Services;

/// <summary>Persistence boundary for Sprint 4 contract, version, and run operations.</summary>
public interface IContractStore
{
    /// <summary>Lists contracts visible to the current tenant and workspace.</summary>
    Task<IReadOnlyList<ContractSummaryRecord>> ListAsync(CancellationToken ct = default);

    /// <summary>Gets a single contract aggregate or null when it does not exist.</summary>
    Task<ContractRecord?> GetAsync(Guid contractId, CancellationToken ct = default);

    /// <summary>Creates a contract and its initial immutable version snapshot.</summary>
    Task<ContractRecord> CreateAsync(CreateContractCommand command, CancellationToken ct = default);

    /// <summary>Creates a new version snapshot and updates the current contract pointer.</summary>
    Task<ContractRecord?> UpdateAsync(Guid contractId, UpdateContractCommand command, CancellationToken ct = default);

    /// <summary>Soft deletes a contract.</summary>
    Task<bool> SoftDeleteAsync(Guid contractId, CancellationToken ct = default);

    /// <summary>Lists immutable versions for a contract.</summary>
    Task<IReadOnlyList<ContractVersionRecord>> ListVersionsAsync(Guid contractId, CancellationToken ct = default);

    /// <summary>Gets a specific immutable version snapshot.</summary>
    Task<ContractVersionRecord?> GetVersionAsync(Guid contractId, string version, CancellationToken ct = default);

    /// <summary>Persists a completed enforcement run.</summary>
    Task<EnforcementRunRecord?> CreateRunAsync(CreateRunCommand command, CancellationToken ct = default);

    /// <summary>Lists runs for a contract.</summary>
    Task<IReadOnlyList<EnforcementRunRecord>> ListRunsAsync(Guid contractId, CancellationToken ct = default);

    /// <summary>Gets a single run detail record.</summary>
    Task<EnforcementRunRecord?> GetRunAsync(Guid runId, CancellationToken ct = default);

    /// <summary>Updates AI enrichment and alert dispatch outcomes for an existing run.</summary>
    Task<EnforcementRunRecord?> UpdateRunEnrichmentAsync(UpdateRunEnrichmentCommand command, CancellationToken ct = default);

    /// <summary>Lists contracts across linked workspaces for enterprise federation.</summary>
    Task<FederatedContractsPage> ListFederatedContractsAsync(int pageSize, string? cursor, CancellationToken ct = default);
}

/// <summary>Command used to create a contract.</summary>
public sealed record CreateContractCommand(
    Guid WorkspaceId,
    Guid TargetLakehouseId,
    string Name,
    string Status,
    string CurrentVersion,
    string OwnerEmail,
    string CreatedBy,
    string OdcsYaml,
    string? CommitMessage);

/// <summary>Command used to create a new contract version.</summary>
public sealed record UpdateContractCommand(
    Guid TargetLakehouseId,
    string Name,
    string Status,
    string CurrentVersion,
    string OwnerEmail,
    string UpdatedBy,
    string OdcsYaml,
    string? CommitMessage);

/// <summary>Command used to persist an enforcement run.</summary>
public sealed record CreateRunCommand(
    Guid ContractId,
    Guid VersionId,
    string TriggeredBy,
    string CorrelationId,
    string Status,
    long? DeltaTableVersion,
    decimal? BreachScore,
    string? BreachScoreBreakdownJson,
    bool ActivatorTriggered,
    string ResultJson,
    DateTimeOffset TriggeredAt,
    DateTimeOffset? CompletedAt);

/// <summary>Command used to enrich an existing run after AI scoring and alert dispatch.</summary>
public sealed record UpdateRunEnrichmentCommand(
    Guid RunId,
    decimal? BreachScore,
    string? BreachScoreBreakdownJson,
    bool ActivatorTriggered,
    string ResultJson);

/// <summary>Read model for contract list responses.</summary>
public sealed record ContractSummaryRecord(
    Guid ContractId,
    string Name,
    string Status,
    string CurrentVersion,
    EnforcementRunRecord? LatestRun);

/// <summary>Read model for a contract aggregate.</summary>
public sealed record ContractRecord(
    Guid ContractId,
    Guid TenantId,
    Guid WorkspaceId,
    Guid? FabricItemId,
    string Name,
    string Status,
    string CurrentVersion,
    string OwnerEmail,
    string CreatedBy,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    ContractVersionRecord? CurrentVersionRecord,
    EnforcementRunRecord? LatestRun);

/// <summary>Read model for a version snapshot.</summary>
public sealed record ContractVersionRecord(
    Guid VersionId,
    Guid ContractId,
    string Version,
    string OdcsYaml,
    string OdcsHash,
    string CreatedBy,
    DateTimeOffset CreatedAt,
    string? CommitMessage);

/// <summary>Read model for an enforcement run.</summary>
public sealed record EnforcementRunRecord(
    Guid RunId,
    Guid ContractId,
    Guid VersionId,
    string TriggeredBy,
    DateTimeOffset TriggeredAt,
    DateTimeOffset? CompletedAt,
    string Status,
    long? DeltaTableVersion,
    decimal? BreachScore,
    string? BreachScoreBreakdownJson,
    bool ActivatorTriggered,
    string ResultJson,
    string CorrelationId);

/// <summary>Cursor-paged federated contract list.</summary>
public sealed record FederatedContractsPage(
    IReadOnlyList<ContractSummaryRecord> Contracts,
    string? NextCursor);

/// <summary>Raised when a create or update operation would violate a business uniqueness rule.</summary>
public sealed class ContractConflictException : Exception
{
    public ContractConflictException(string message)
        : base(message)
    {
    }
}
