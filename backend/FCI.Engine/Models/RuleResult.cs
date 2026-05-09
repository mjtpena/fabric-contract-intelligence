namespace FCI.Engine.Models;

/// <summary>
/// The result of evaluating a single contract rule (schema, quality, or freshness).
/// Spec §5.2 (per-rule entry inside <c>result_json</c>).
/// </summary>
public sealed record RuleResult
{
    public required string RuleId { get; init; }
    public string? Column { get; init; }
    public required RuleStatus Status { get; init; }
    public required string Message { get; init; }
    public object? Expected { get; init; }
    public object? Actual { get; init; }
}
