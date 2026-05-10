namespace Orqentis.Api.Dtos;

/// <summary>Top-level run summary counters for dashboard views.</summary>
public sealed record ReportSummaryDto
{
    public required int TotalRuns { get; init; }
    public required int PassedRuns { get; init; }
    public required int FailedRuns { get; init; }
    public required int WarnedRuns { get; init; }
    public required int ErrorRuns { get; init; }
    public string? LastRunAt { get; init; }
}

/// <summary>Audit row for recent run history.</summary>
public sealed record AuditReportRowDto
{
    public required Guid RunId { get; init; }
    public required Guid ContractId { get; init; }
    public required string ContractName { get; init; }
    public required string Status { get; init; }
    public required string TriggeredBy { get; init; }
    public required string TriggeredAt { get; init; }
    public string? CompletedAt { get; init; }
    public long? DeltaTableVersion { get; init; }
    public decimal? BreachScore { get; init; }
    public required string CorrelationId { get; init; }
}
