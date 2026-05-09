using Orqentis.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Orqentis.Data;

/// <summary>
/// EF Core context for the Sprint 4 API surface.
/// Query filters enforce soft-delete and tenant isolation for contract reads.
/// </summary>
public sealed class OrqentisDbContext : DbContext
{
    private readonly ITenantContext _tenantContext;

    public OrqentisDbContext(DbContextOptions<OrqentisDbContext> options, ITenantContext tenantContext)
        : base(options)
    {
        _tenantContext = tenantContext;
    }

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<Contract> Contracts => Set<Contract>();
    public DbSet<ContractVersion> ContractVersions => Set<ContractVersion>();
    public DbSet<EnforcementRun> EnforcementRuns => Set<EnforcementRun>();
    public DbSet<ContractPolicy> ContractPolicies => Set<ContractPolicy>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Tenant>(b =>
        {
            b.HasKey(t => t.TenantId);
            b.HasIndex(t => t.EntraTenantId).IsUnique();
            b.Property(t => t.Tier).HasMaxLength(32);
            b.Property(t => t.Status).HasMaxLength(32);
        });

        modelBuilder.Entity<Contract>(b =>
        {
            b.HasKey(c => c.ContractId);
            b.HasQueryFilter(c =>
                c.DeletedAt == null &&
                (!_tenantContext.HasTenant || c.TenantId == _tenantContext.TenantId));
            b.HasIndex(c => new { c.TenantId, c.WorkspaceId }).HasDatabaseName("ix_contracts_tenant_workspace");
            b.HasIndex(c => c.Status).HasDatabaseName("ix_contracts_status");
            b.Property(c => c.Status).HasMaxLength(32);
            b.Property(c => c.CurrentVersion).HasMaxLength(64);
        });

        modelBuilder.Entity<ContractVersion>(b =>
        {
            b.HasKey(v => v.VersionId);
            b.HasIndex(v => new { v.ContractId, v.Version }).IsUnique();
            b.Property(v => v.Version).HasMaxLength(64);
        });

        modelBuilder.Entity<EnforcementRun>(b =>
        {
            b.HasKey(r => r.RunId);
            b.HasIndex(r => new { r.ContractId, r.TriggeredAt });
            b.HasIndex(r => r.CorrelationId);
            b.Property(r => r.Status).HasMaxLength(32);
            b.Property(r => r.ResultJson).HasColumnType("jsonb");
        });

        modelBuilder.Entity<ContractPolicy>(b =>
        {
            b.HasKey(p => p.PolicyId);
            b.Property(p => p.ActionConfigJson).HasColumnType("jsonb");
        });
    }
}
