using FCI.Engine.Common;

namespace FCI.Data;

/// <summary>
/// Persistence boundary for contracts. Implementations must enforce tenant isolation
/// via the <see cref="ITenantContext"/>.
/// </summary>
public interface IContractStore
{
    Task<Result<Guid>> CreateAsync(
        Guid tenantId, Guid workspaceId, string name, string ownerEmail, string odcsYaml,
        string createdBy, CancellationToken ct = default);

    Task<Result<ContractRecord>> GetAsync(Guid contractId, CancellationToken ct = default);

    Task<Result<Guid>> AddVersionAsync(
        Guid contractId, string odcsYaml, string createdBy, string? commitMessage,
        CancellationToken ct = default);

    Task<Result<bool>> SoftDeleteAsync(Guid contractId, CancellationToken ct = default);

    Task<IReadOnlyList<ContractRecord>> ListAsync(
        Guid tenantId, Guid workspaceId, CancellationToken ct = default);
}

public sealed record ContractRecord(
    Guid ContractId,
    Guid TenantId,
    Guid WorkspaceId,
    string Name,
    string Status,
    string CurrentVersion,
    string OwnerEmail,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

/// <summary>Resolved per-request from JWT claims. Spec §11.</summary>
public interface ITenantContext
{
    Guid TenantId { get; }
    Guid WorkspaceId { get; }
    string UserObjectId { get; }
    string UserEmail { get; }
    string Tier { get; }
    string CorrelationId { get; }
}
