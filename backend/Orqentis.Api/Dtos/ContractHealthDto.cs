namespace Orqentis.Api.Dtos;

/// <summary>
/// Response body for <c>GET /v1/contracts/{id}/health</c>. Mirrors
/// <c>Orqentis.Engine.Scoring.ContractHealthScore</c> with grade lowercased
/// to match TS convention (frontend/src/models/AiContext.ts).
/// </summary>
public sealed record ContractHealthDto
{
    public required Guid ContractId { get; init; }
    public required int Score { get; init; }
    public required string Grade { get; init; }
    public required ContractHealthDimensionsDto Dimensions { get; init; }
    /// <summary>Run id used to compute the score, or null when no run exists yet.</summary>
    public Guid? LatestRunId { get; init; }
    /// <summary>ISO-8601 completion time of the run used as input.</summary>
    public string? LatestRunCompletedAt { get; init; }
    /// <summary>ISO-8601 time the score was computed (UTC).</summary>
    public required string ComputedAt { get; init; }
}

public sealed record ContractHealthDimensionsDto
{
    public required double SchemaValidity { get; init; }
    public required double QualityRulePassRate { get; init; }
    public required double FreshnessSlaMet { get; init; }
    public required double SensitivityLabelSet { get; init; }
    public required double ApprovalUpToDate { get; init; }
    public required double LineageCompleteness { get; init; }
    public required double EvidenceCitedRatio { get; init; }
}
