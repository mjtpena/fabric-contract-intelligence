namespace FCI.Engine.Models;

/// <summary>
/// The full result of an enforcement run. Persisted to <c>enforcement_runs.result_json</c>
/// (spec §5.2). Returned from <see cref="IEnforcementOrchestrator.RunAsync"/>.
/// </summary>
public sealed record EnforcementResult
{
    public required Guid RunId { get; init; }
    public required Guid ContractId { get; init; }
    public required EnforcementStatus OverallStatus { get; init; }
    public required long DeltaTableVersion { get; init; }
    public required IReadOnlyList<RuleResult> SchemaRules { get; init; }
    public required IReadOnlyList<RuleResult> QualityRules { get; init; }
    public RuleResult? FreshnessRule { get; init; }
    public SchemaDiff? SchemaDiff { get; init; }

    /// <summary>0–100 AI-computed severity. Null if AI unavailable or feature off.</summary>
    public decimal? BreachScore { get; init; }

    public IReadOnlyList<string> RemediationSuggestions { get; init; } = [];
    public required DateTimeOffset CompletedAt { get; init; }

    /// <summary>Populated when <see cref="OverallStatus"/> is <see cref="EnforcementStatus.Error"/>.</summary>
    public string? ErrorMessage { get; init; }
}
