using FCI.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace FCI.Data;

/// <summary>
/// Read-side EF Core context. Writes use raw SQL via DbUp migrations
/// (see <c>FCI.Data/Migrations/</c>) — DO NOT use EF Migrations.
/// </summary>
public sealed class FciDbContext : DbContext
{
    public FciDbContext(DbContextOptions<FciDbContext> options) : base(options) { }

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
        });

        modelBuilder.Entity<Contract>(b =>
        {
            b.HasKey(c => c.ContractId);
            b.HasQueryFilter(c => c.DeletedAt == null);
            b.HasIndex(c => new { c.TenantId, c.Name });
        });

        modelBuilder.Entity<ContractVersion>(b =>
        {
            b.HasKey(v => v.VersionId);
            b.HasIndex(v => new { v.ContractId, v.Version }).IsUnique();
        });

        modelBuilder.Entity<EnforcementRun>(b =>
        {
            b.HasKey(r => r.RunId);
            b.HasIndex(r => new { r.ContractId, r.TriggeredAt });
            b.HasIndex(r => r.CorrelationId);
        });

        modelBuilder.Entity<ContractPolicy>().HasKey(p => p.PolicyId);
    }
}
