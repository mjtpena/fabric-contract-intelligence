using System.ComponentModel.DataAnnotations;

namespace Orqentis.Api.Dtos;

/// <summary>Summary view used by the contracts list endpoint.</summary>
public sealed record ContractSummaryDto
{
    public required Guid Id { get; init; }
    public required string Name { get; init; }
    public required string TargetType { get; init; }
    public required string Status { get; init; }
    public required string Version { get; init; }
    public string? LastRunStatus { get; init; }
    public string? LastRunAt { get; init; }
}

/// <summary>Full contract payload returned from detail endpoints.</summary>
public sealed record ContractDto
{
    public required Guid Id { get; init; }
    public required string Name { get; init; }
    public string? Description { get; init; }
    public required string Status { get; init; }
    public required string Version { get; init; }
    public required string OdcsYaml { get; init; }
    public required string OwnerEmail { get; init; }
    public required string TargetType { get; init; }
    public Guid? TargetItemId { get; init; }
    public required string TargetTablePath { get; init; }
    public Guid? TargetLakehouseId { get; init; }
    public required bool AiSuggested { get; init; }
    public required string CreatedBy { get; init; }
    public required string CreatedAt { get; init; }
    public required string UpdatedAt { get; init; }
}

/// <summary>Request body for creating a contract.</summary>
public sealed record CreateContractRequest
{
    [Required]
    public required string Mode { get; init; }

    [Required]
    public required string Name { get; init; }

    public string? Description { get; init; }

    [Required]
    [EmailAddress]
    public required string OwnerEmail { get; init; }

    public string TargetType { get; init; } = "lakehouse";

    public Guid? TargetItemId { get; init; }

    [Required]
    public required string TargetTablePath { get; init; }

    public Guid? TargetLakehouseId { get; init; }

    public string? OdcsYaml { get; init; }
    public string? AiHints { get; init; }
}

/// <summary>Request body for updating a contract.</summary>
public sealed record UpdateContractRequest
{
    [Required]
    public required string Name { get; init; }

    public string? Description { get; init; }

    [Required]
    [EmailAddress]
    public required string OwnerEmail { get; init; }

    public string TargetType { get; init; } = "lakehouse";

    public Guid? TargetItemId { get; init; }

    [Required]
    public required string TargetTablePath { get; init; }

    public Guid? TargetLakehouseId { get; init; }

    [Required]
    public required string OdcsYaml { get; init; }

    public string? CommitMessage { get; init; }
}

/// <summary>Request body for live schema preview against a live Fabric target.</summary>
public sealed record LivePreviewRequest
{
    [Required]
    public required string OdcsYaml { get; init; }

    /// <summary>Fabric item ID for non-Delta targets (warehouse, eventhouse, semantic model).</summary>
    public Guid? TargetItemId { get; init; }

    /// <summary>Target workspace ID. If omitted, the current request workspace is used.</summary>
    public Guid? TargetWorkspaceId { get; init; }

    /// <summary>Target type hint (lakehouse, warehouse, eventhouse, semantic_model, fabric_sql).</summary>
    public string? TargetType { get; init; }
}

/// <summary>A single field from the live schema of the target table.</summary>
public sealed record SchemaPreviewFieldDto
{
    public required string Name { get; init; }
    public required string PhysicalType { get; init; }
    public required bool Nullable { get; init; }
}

/// <summary>Response from live schema preview.</summary>
public sealed record LivePreviewResponse
{
    public required IReadOnlyList<SchemaPreviewFieldDto> Fields { get; init; }
    public required long DeltaVersion { get; init; }
}

/// <summary>Immutable contract version snapshot.</summary>
public sealed record ContractVersionDto
{
    public required Guid Id { get; init; }
    public required string Version { get; init; }
    public required string OdcsYaml { get; init; }
    public required string CreatedBy { get; init; }
    public required string CreatedAt { get; init; }
    public string? CommitMessage { get; init; }
}
