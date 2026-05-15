using Microsoft.EntityFrameworkCore;
using Orqentis.Data.Entities;

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
    public DbSet<WorkspaceLink> WorkspaceLinks => Set<WorkspaceLink>();
    public DbSet<WorkspaceApiKey> WorkspaceApiKeys => Set<WorkspaceApiKey>();

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
            b.Property(c => c.TargetType).HasMaxLength(32);
            b.Property(c => c.CurrentVersion).HasMaxLength(64);
        });

        modelBuilder.Entity<ContractVersion>(b =>
        {
            b.HasKey(v => v.VersionId);
            b.HasIndex(v => new { v.ContractId, v.Version }).IsUnique();
            b.Property(v => v.Version).HasMaxLength(64);
            b.HasOne<Contract>()
                .WithMany()
                .HasForeignKey(v => v.ContractId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<EnforcementRun>(b =>
        {
            b.HasKey(r => r.RunId);
            b.HasIndex(r => new { r.ContractId, r.TriggeredAt });
            b.HasIndex(r => r.CorrelationId);
            b.Property(r => r.Status).HasMaxLength(32);
            b.Property(r => r.ResultJson).HasColumnType("jsonb");
            b.Property(r => r.BreachScoreBreakdown).HasColumnType("jsonb");
            b.HasOne<Contract>()
                .WithMany()
                .HasForeignKey(r => r.ContractId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ContractPolicy>(b =>
        {
            b.HasKey(p => p.PolicyId);
            b.Property(p => p.ActionConfigJson).HasColumnType("jsonb");
            b.HasOne<Contract>()
                .WithMany()
                .HasForeignKey(p => p.ContractId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<WorkspaceLink>(b =>
        {
            b.HasKey(link => link.LinkId);
            b.HasIndex(link => new { link.TenantId, link.WorkspaceId, link.LinkedWorkspaceId }).IsUnique();
        });

        modelBuilder.Entity<WorkspaceApiKey>(b =>
        {
            b.HasKey(k => k.KeyId);
            b.HasQueryFilter(k => k.DeletedAt == null &&
                (!_tenantContext.HasTenant || k.TenantId == _tenantContext.TenantId));
            b.HasIndex(k => k.KeyHash).IsUnique().HasFilter("deleted_at IS NULL");
            b.HasIndex(k => new { k.TenantId, k.WorkspaceId }).HasDatabaseName("ix_workspace_api_keys_workspace");
        });
    }
}
