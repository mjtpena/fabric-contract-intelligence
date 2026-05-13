using System.ComponentModel.DataAnnotations.Schema;

namespace Orqentis.Data.Entities;

[Table("tenants")]
public sealed class Tenant
{
    [Column("tenant_id")] public Guid TenantId { get; set; }
    [Column("entra_tenant_id")] public Guid EntraTenantId { get; set; }
    [Column("display_name")] public string DisplayName { get; set; } = string.Empty;
    [Column("tier")] public string Tier { get; set; } = "community";
    [Column("region")] public string Region { get; set; } = "australiaeast";
    [Column("status")] public string Status { get; set; } = "active";
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; }
    [Column("updated_at")] public DateTimeOffset UpdatedAt { get; set; }
}

[Table("contracts")]
public sealed class Contract
{
    [Column("contract_id")] public Guid ContractId { get; set; }
    [Column("tenant_id")] public Guid TenantId { get; set; }
    [Column("workspace_id")] public Guid WorkspaceId { get; set; }
    [Column("fabric_item_id")] public Guid? FabricItemId { get; set; }
    [Column("target_type")] public string TargetType { get; set; } = "lakehouse";
    [Column("name")] public string Name { get; set; } = string.Empty;
    [Column("status")] public string Status { get; set; } = "draft";
    [Column("current_version")] public string CurrentVersion { get; set; } = "0.1.0";
    [Column("owner_email")] public string OwnerEmail { get; set; } = string.Empty;
    [Column("created_by")] public string CreatedBy { get; set; } = string.Empty;
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; }
    [Column("updated_at")] public DateTimeOffset UpdatedAt { get; set; }
    [Column("deleted_at")] public DateTimeOffset? DeletedAt { get; set; }
}

[Table("contract_versions")]
public sealed class ContractVersion
{
    [Column("version_id")] public Guid VersionId { get; set; }
    [Column("contract_id")] public Guid ContractId { get; set; }
    [Column("version")] public string Version { get; set; } = "0.1.0";
    [Column("odcs_yaml")] public string OdcsYaml { get; set; } = string.Empty;
    [Column("odcs_hash")] public string OdcsHash { get; set; } = string.Empty;
    [Column("created_by")] public string CreatedBy { get; set; } = string.Empty;
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; }
    [Column("commit_message")] public string? CommitMessage { get; set; }
}

[Table("enforcement_runs")]
public sealed class EnforcementRun
{
    [Column("run_id")] public Guid RunId { get; set; }
    [Column("contract_id")] public Guid ContractId { get; set; }
    [Column("version_id")] public Guid VersionId { get; set; }
    [Column("triggered_by")] public string TriggeredBy { get; set; } = "manual";
    [Column("triggered_at")] public DateTimeOffset TriggeredAt { get; set; }
    [Column("completed_at")] public DateTimeOffset? CompletedAt { get; set; }
    [Column("status")] public string Status { get; set; } = "running";
    [Column("delta_table_version")] public long? DeltaTableVersion { get; set; }
    [Column("breach_score")] public decimal? BreachScore { get; set; }
    [Column("breach_score_breakdown")] public string? BreachScoreBreakdown { get; set; }
    [Column("activator_triggered")] public bool ActivatorTriggered { get; set; }
    [Column("result_json")] public string ResultJson { get; set; } = "{}";
    [Column("correlation_id")] public string CorrelationId { get; set; } = string.Empty;
}

[Table("contract_policies")]
public sealed class ContractPolicy
{
    [Column("policy_id")] public Guid PolicyId { get; set; }
    [Column("contract_id")] public Guid ContractId { get; set; }
    [Column("activator_rule_id")] public Guid? ActivatorRuleId { get; set; }
    [Column("trigger_event")] public string TriggerEvent { get; set; } = "enforcement.failed";
    [Column("action_type")] public string ActionType { get; set; } = "notify";
    [Column("action_config_json")] public string ActionConfigJson { get; set; } = "{}";
    [Column("enabled")] public bool Enabled { get; set; } = true;
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; }
    [Column("updated_at")] public DateTimeOffset UpdatedAt { get; set; }
}

[Table("workspace_links")]
public sealed class WorkspaceLink
{
    [Column("link_id")] public Guid LinkId { get; set; }
    [Column("tenant_id")] public Guid TenantId { get; set; }
    [Column("workspace_id")] public Guid WorkspaceId { get; set; }
    [Column("linked_workspace_id")] public Guid LinkedWorkspaceId { get; set; }
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; }
    [Column("updated_at")] public DateTimeOffset UpdatedAt { get; set; }
}
