namespace Orqentis.Engine.Odcs.Extensions;

/// <summary>
/// Orqentis ODCS extension that declares the AI governance context for a contract.
/// Persisted in <c>customProperties[]</c> under the key <c>orqentisAiContext</c>, so
/// the ODCS v3.1.0 JSON Schema remains untouched and any downstream tool that consumes
/// vanilla ODCS will continue to validate cleanly (spec §16.1 rule 4).
/// </summary>
/// <remarks>
/// Sourced from the vendor synthesis in <c>files/plan-data-security-for-ai.md §3.1</c>.
/// </remarks>
public sealed record AiContextExtension
{
    public IReadOnlyList<AiUseCaseRef> UseCases { get; init; } = [];
    public IReadOnlyList<string> PermittedUses { get; init; } = [];
    public IReadOnlyList<string> ProhibitedUses { get; init; } = [];
    public IReadOnlyList<string> PermittedAgents { get; init; } = [];
    public AiRetentionPolicy? RetentionForTraining { get; init; }
}

public sealed record AiUseCaseRef
{
    public required string Id { get; init; }
    public string? Tier { get; init; }
    public IReadOnlyList<string> Jurisdictions { get; init; } = [];
    public IReadOnlyList<string> Regulations { get; init; } = [];
}

public sealed record AiRetentionPolicy
{
    public int? MaxAgeDays { get; init; }
}
