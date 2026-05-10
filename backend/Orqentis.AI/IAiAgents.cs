using Orqentis.Engine.Models;
using Orqentis.Engine.Odcs;

namespace Orqentis.AI;

/// <summary>
/// Sprint 8 deliverable. Authors a draft ODCS YAML from delta-table sample data.
/// Spec §10.2. Uses a system prompt loaded from <c>Prompts/ContractSuggestion.txt</c> —
/// never inline the prompt in C#.
/// </summary>
public interface IContractSuggestionAgent
{
    /// <summary>
    /// Generates a suggested ODCS v3.1.0 YAML for the supplied table profile.
    /// Must finish in &lt; 15 s or fall back per spec §3 (copilot-instructions).
    /// </summary>
    Task<ContractSuggestion> SuggestAsync(
        TableProfile profile,
        CancellationToken ct = default);
}

public sealed record TableProfile
{
    public required string TableName { get; init; }
    public required string AbfssUri { get; init; }
    public required IReadOnlyList<TableProfileColumn> Columns { get; init; }
    public IReadOnlyList<TableProfileSampleRow> SampleRows { get; init; } = [];
}

public sealed record TableProfileColumn(
    string Name,
    string Type,
    bool Nullable,
    long? DistinctCount,
    long? NullCount);

public sealed record TableProfileSampleRow(IReadOnlyDictionary<string, string?> Values);

public sealed record ContractSuggestion
{
    public required string OdcsYaml { get; init; }
    public required IReadOnlyList<string> Rationale { get; init; }
    public required string ModelUsed { get; init; }
    public required TimeSpan Latency { get; init; }
}

/// <summary>Sprint 8 deliverable. Computes 0-100 breach severity score for an enforcement run.</summary>
public interface IBreachImpactScorer
{
    Task<BreachScore?> ScoreAsync(
        EnforcementResult result,
        ContractDefinition contract,
        CancellationToken ct = default);
}

public sealed record BreachScore(
    decimal Score,
    IReadOnlyList<string> Reasons,
    string ModelUsed,
    IReadOnlyDictionary<string, decimal>? Breakdown = null);

/// <summary>Sprint 8 deliverable. Plain-English remediation suggestions for failed rules.</summary>
public interface IRemediationAdvisor
{
    Task<IReadOnlyList<string>> SuggestAsync(
        EnforcementResult result,
        ContractDefinition contract,
        CancellationToken ct = default);
}

/// <summary>Enterprise-only natural language search over the contract registry.</summary>
public interface INaturalLanguageQueryHandler
{
    Task<NaturalLanguageQueryResponse> QueryAsync(
        string query,
        IReadOnlyList<NaturalLanguageContractDocument> contracts,
        CancellationToken ct = default);
}

public sealed record NaturalLanguageContractDocument(
    Guid ContractId,
    string Name,
    string? Description,
    string OwnerEmail,
    string OdcsYaml,
    string Version);

public sealed record NaturalLanguageQueryMatch(
    Guid ContractId,
    string Name,
    string Version,
    string Explanation,
    double RelevanceScore);

public sealed record NaturalLanguageQueryResponse(
    string Explanation,
    IReadOnlyList<NaturalLanguageQueryMatch> Matches,
    string ModelUsed);
