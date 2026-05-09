using System.Text.Json;

namespace Orqentis.Api.Dtos;

/// <summary>202 response for a newly persisted enforcement run.</summary>
public sealed record RunAcceptedDto
{
    public required Guid RunId { get; init; }
    public required string Status { get; init; }
}

/// <summary>List item for enforcement runs.</summary>
public sealed record RunSummaryDto
{
    public required Guid Id { get; init; }
    public required Guid ContractId { get; init; }
    public required Guid VersionId { get; init; }
    public required string Status { get; init; }
    public required string TriggeredBy { get; init; }
    public required string TriggeredAt { get; init; }
    public string? CompletedAt { get; init; }
    public required string CorrelationId { get; init; }
}

/// <summary>Run detail including the persisted result payload.</summary>
public sealed record RunDetailDto
{
    public required Guid Id { get; init; }
    public required Guid ContractId { get; init; }
    public required Guid VersionId { get; init; }
    public required string Status { get; init; }
    public required string TriggeredBy { get; init; }
    public required string TriggeredAt { get; init; }
    public string? CompletedAt { get; init; }
    public long? DeltaTableVersion { get; init; }
    public decimal? BreachScore { get; init; }
    public required string CorrelationId { get; init; }
    public required JsonElement ResultJson { get; init; }
}
