namespace Orqentis.Api.Services;

public interface IActivatorClient
{
    Task TriggerRuleAsync(
        Guid workspaceId,
        Guid ruleId,
        ActivatorTriggerContext context,
        string fabricRestToken,
        CancellationToken ct = default);

    Task<IReadOnlyList<ActivatorRuleSummary>> ListRulesAsync(
        Guid workspaceId,
        string fabricRestToken,
        CancellationToken ct = default);
}

public sealed record ActivatorTriggerContext(
    Guid ContractId,
    string ContractName,
    string TablePath,
    Guid RunId,
    string Status,
    decimal? BreachScore,
    int ViolatedRules,
    string RunUrl);

public sealed record ActivatorRuleSummary(Guid RuleId, string Name);
