using System.Text.Json.Serialization;

namespace Orqentis.Engine.Models;

/// <summary>
/// The result of evaluating a single contract rule (schema, quality, or freshness).
/// Spec §5.2 (per-rule entry inside <c>result_json</c>).
/// </summary>
public sealed record RuleResult
{
    [JsonPropertyName("ruleId")]
    [JsonPropertyOrder(0)]
    public required string RuleId { get; init; }

    [JsonPropertyName("column")]
    [JsonPropertyOrder(1)]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Column { get; init; }

    [JsonPropertyName("expected")]
    [JsonPropertyOrder(2)]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public object? Expected { get; init; }

    [JsonPropertyName("threshold")]
    [JsonPropertyOrder(3)]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? Threshold { get; init; }

    [JsonPropertyName("maxAgeHours")]
    [JsonPropertyOrder(4)]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? MaxAgeHours { get; init; }

    [JsonPropertyName("lastModifiedUtc")]
    [JsonPropertyOrder(5)]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public DateTimeOffset? LastModifiedUtc { get; init; }

    [JsonPropertyName("ageHours")]
    [JsonPropertyOrder(6)]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? AgeHours { get; init; }

    [JsonPropertyName("actual")]
    [JsonPropertyOrder(7)]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public object? Actual { get; init; }

    [JsonPropertyName("status")]
    [JsonPropertyOrder(8)]
    public required RuleStatus Status { get; init; }

    [JsonPropertyName("message")]
    [JsonPropertyOrder(9)]
    public required string Message { get; init; }
}
