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
