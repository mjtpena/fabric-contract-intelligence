using System.Text.Json.Serialization;

namespace Orqentis.Engine.Models;

/// <summary>
/// The full result of an enforcement run. Persisted to <c>enforcement_runs.result_json</c>
/// (spec §5.2). Returned from <see cref="IEnforcementOrchestrator"/>.
/// </summary>
public sealed record EnforcementResult
{
    [JsonPropertyName("contractId")]
    [JsonPropertyOrder(0)]
    public required Guid ContractId { get; init; }

    [JsonPropertyName("runId")]
    [JsonPropertyOrder(1)]
    public required Guid RunId { get; init; }

    [JsonPropertyName("tableVersion")]
    [JsonPropertyOrder(2)]
    public required long DeltaTableVersion { get; init; }

    [JsonPropertyName("overallStatus")]
    [JsonPropertyOrder(3)]
    public required EnforcementStatus OverallStatus { get; init; }

    [JsonPropertyName("schemaRules")]
    [JsonPropertyOrder(4)]
    public required IReadOnlyList<RuleResult> SchemaRules { get; init; }

    [JsonPropertyName("qualityRules")]
    [JsonPropertyOrder(5)]
    public required IReadOnlyList<RuleResult> QualityRules { get; init; }

    [JsonPropertyName("freshnessRule")]
    [JsonPropertyOrder(6)]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public RuleResult? FreshnessRule { get; init; }

    [JsonPropertyName("schemaDiff")]
    [JsonPropertyOrder(7)]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public SchemaDiff? SchemaDiff { get; init; }

    /// <summary>0–100 AI-computed severity. Null if AI unavailable or feature off.</summary>
    [JsonPropertyName("breachScore")]
    [JsonPropertyOrder(8)]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public decimal? BreachScore { get; init; }

    [JsonPropertyName("remediationSuggestions")]
    [JsonPropertyOrder(9)]
    public IReadOnlyList<string> RemediationSuggestions { get; init; } = [];

    [JsonPropertyName("completedAt")]
    [JsonPropertyOrder(10)]
    public required DateTimeOffset CompletedAt { get; init; }

    /// <summary>Populated when <see cref="OverallStatus"/> is <see cref="EnforcementStatus.Error"/>.</summary>
    [JsonPropertyName("errorMessage")]
    [JsonPropertyOrder(11)]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ErrorMessage { get; init; }
}
