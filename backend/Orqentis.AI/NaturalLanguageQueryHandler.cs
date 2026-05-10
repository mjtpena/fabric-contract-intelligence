using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace Orqentis.AI;

public sealed class NaturalLanguageQueryHandler : INaturalLanguageQueryHandler
{
    private const string PromptFile = "NaturalLanguageQuery.txt";

    private readonly ILlmRouter _llmRouter;
    private readonly IPromptLoader _promptLoader;
    private readonly ILogger<NaturalLanguageQueryHandler> _logger;

    public NaturalLanguageQueryHandler(
        ILlmRouter llmRouter,
        IPromptLoader promptLoader,
        ILogger<NaturalLanguageQueryHandler> logger)
    {
        _llmRouter = llmRouter;
        _promptLoader = promptLoader;
        _logger = logger;
    }

    public async Task<NaturalLanguageQueryResponse> QueryAsync(
        string query,
        IReadOnlyList<NaturalLanguageContractDocument> contracts,
        CancellationToken ct = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(query);
        ArgumentNullException.ThrowIfNull(contracts);

        var tokens = query
            .Split([' ', ',', '.', ';', ':', '\t', '\n', '\r'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(token => token.ToLowerInvariant())
            .Where(token => token.Length >= 3)
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        var ranked = contracts
            .Select(contract => CreateMatch(contract, tokens))
            .Where(match => match.RelevanceScore > 0)
            .OrderByDescending(match => match.RelevanceScore)
            .Take(10)
            .ToArray();

        if (ranked.Length == 0)
        {
            return new NaturalLanguageQueryResponse(
                "No relevant contracts were found for the supplied question.",
                [],
                "heuristic");
        }

        var prompt = _promptLoader.Load(PromptFile);
        var promptInput = JsonSerializer.Serialize(new
        {
            query,
            matches = ranked.Select(match => new { match.ContractId, match.Name, match.Version, match.Explanation, match.RelevanceScore }),
        });

        _logger.LogDebug("AI-NLQuery-Prompt Prompt={Prompt}", prompt);
        var llmResult = await _llmRouter.CompleteAsync("NaturalLanguageQuery", prompt, promptInput, ct).ConfigureAwait(false);
        var summary = llmResult?.Content;
        if (string.IsNullOrWhiteSpace(summary))
        {
            summary = $"Found {ranked.Length} relevant contract(s) for query '{query}'.";
        }

        return new NaturalLanguageQueryResponse(
            summary.Trim(),
            ranked,
            llmResult?.ModelUsed ?? "heuristic");
    }

    private static NaturalLanguageQueryMatch CreateMatch(
        NaturalLanguageContractDocument contract,
        string[] tokens)
    {
        var score = 0.0;
        var explanations = new List<string>();

        var name = contract.Name.ToLowerInvariant();
        var description = contract.Description?.ToLowerInvariant() ?? string.Empty;
        var yaml = contract.OdcsYaml.ToLowerInvariant();

        foreach (var token in tokens)
        {
            if (name.Contains(token, StringComparison.Ordinal))
            {
                score += 3;
                explanations.Add($"Name matches '{token}'.");
            }
            else if (description.Contains(token, StringComparison.Ordinal))
            {
                score += 2;
                explanations.Add($"Description mentions '{token}'.");
            }
            else if (yaml.Contains(token, StringComparison.Ordinal))
            {
                score += 1;
                explanations.Add($"Contract body references '{token}'.");
            }
        }

        return new NaturalLanguageQueryMatch(
            contract.ContractId,
            contract.Name,
            contract.Version,
            explanations.Count == 0 ? "No lexical match found." : string.Join(" ", explanations.Take(2)),
            score);
    }
}
