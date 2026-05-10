using System.ComponentModel.DataAnnotations;

namespace Orqentis.Api.Dtos;

/// <summary>Policy payload returned by policy endpoints.</summary>
public sealed record PolicyDto
{
    public required Guid Id { get; init; }
    public required Guid ContractId { get; init; }
    public Guid? ActivatorRuleId { get; init; }
    public required string TriggerEvent { get; init; }
    public required string ActionType { get; init; }
    public required string ActionConfigJson { get; init; }
    public required bool Enabled { get; init; }
    public required string CreatedAt { get; init; }
    public required string UpdatedAt { get; init; }
}

/// <summary>Request payload for policy creation.</summary>
public sealed record CreatePolicyRequest
{
    [Required]
    public required Guid ContractId { get; init; }

    public Guid? ActivatorRuleId { get; init; }

    [Required]
    public required string TriggerEvent { get; init; }

    [Required]
    public required string ActionType { get; init; }

    public string? ActionConfigJson { get; init; }
    public bool Enabled { get; init; } = true;
}

/// <summary>Request payload for policy updates.</summary>
public sealed record UpdatePolicyRequest
{
    public Guid? ActivatorRuleId { get; init; }

    [Required]
    public required string TriggerEvent { get; init; }

    [Required]
    public required string ActionType { get; init; }

    public string? ActionConfigJson { get; init; }
    public bool Enabled { get; init; } = true;
}
