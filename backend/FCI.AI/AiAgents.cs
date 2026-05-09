using FCI.Engine.Models;
using FCI.Engine.Odcs;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace FCI.AI;

/// <summary>Sprint 8 deliverable. Stub today returns NotImplemented but throws no exceptions
/// (so the orchestrator can keep running with breachScore=null).</summary>
public sealed class ContractSuggestionAgent : IContractSuggestionAgent
{
    private readonly AiOptions _options;
    private readonly ILogger<ContractSuggestionAgent> _logger;

    public ContractSuggestionAgent(IOptions<AiOptions> options, ILogger<ContractSuggestionAgent> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public Task<ContractSuggestion> SuggestAsync(TableProfile profile, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(profile);
        _logger.LogWarning("ContractSuggestionAgent not implemented (sprint-08).");
        throw new NotImplementedException("See .ai/commands/sprint-08-ai-features.md");
    }
}

/// <summary>Sprint 8 deliverable. Stub.</summary>
public sealed class BreachImpactScorer : IBreachImpactScorer
{
    private readonly ILogger<BreachImpactScorer> _logger;

    public BreachImpactScorer(ILogger<BreachImpactScorer> logger) => _logger = logger;

    public Task<BreachScore> ScoreAsync(
        EnforcementResult result,
        ContractDefinition contract,
        CancellationToken ct = default)
    {
        _logger.LogWarning("BreachImpactScorer not implemented (sprint-08). Returning score=0.");
        return Task.FromResult(new BreachScore(0, ["AI scorer not yet implemented (sprint-08)."], "stub"));
    }
}

/// <summary>Sprint 8 deliverable. Stub returns empty list.</summary>
public sealed class RemediationAdvisor : IRemediationAdvisor
{
    private readonly ILogger<RemediationAdvisor> _logger;

    public RemediationAdvisor(ILogger<RemediationAdvisor> logger) => _logger = logger;

    public Task<IReadOnlyList<string>> SuggestAsync(
        EnforcementResult result,
        ContractDefinition contract,
        CancellationToken ct = default)
    {
        _logger.LogWarning("RemediationAdvisor not implemented (sprint-08).");
        return Task.FromResult<IReadOnlyList<string>>([]);
    }
}
