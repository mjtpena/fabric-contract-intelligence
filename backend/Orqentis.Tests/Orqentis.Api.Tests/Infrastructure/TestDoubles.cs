using Orqentis.AI;
using Orqentis.Api.Auth;
using Orqentis.Api.Services;
using Orqentis.Engine;
using Orqentis.Engine.Models;
using Orqentis.Engine.Odcs;

namespace Orqentis.Tests.Orqentis.Api.Tests.Infrastructure;

internal sealed class CapturingTokenBroker : IOneLakeTokenBroker
{
    public int FabricRestCallCount { get; private set; }
    public int FabricSqlCallCount { get; private set; }
    public int KustoCallCount { get; private set; }
    public string? LastUserAssertion { get; private set; }
    public int OneLakeCallCount { get; private set; }

    public Task<string> GetFabricRestTokenAsync(string userAssertion, CancellationToken ct = default)
    {
        FabricRestCallCount++;
        LastUserAssertion = userAssertion;
        return Task.FromResult("fabric-rest-token");
    }

    public Task<string> GetFabricSqlTokenAsync(string userAssertion, CancellationToken ct = default)
    {
        FabricSqlCallCount++;
        LastUserAssertion = userAssertion;
        return Task.FromResult("fabric-sql-token");
    }

    public Task<string> GetKustoTokenAsync(string userAssertion, CancellationToken ct = default)
    {
        KustoCallCount++;
        LastUserAssertion = userAssertion;
        return Task.FromResult("kusto-token");
    }

    public Task<string> GetOneLakeTokenAsync(string userAssertion, CancellationToken ct = default)
    {
        OneLakeCallCount++;
        LastUserAssertion = userAssertion;
        return Task.FromResult("obo-token");
    }
}

internal sealed class StubEnforcementOrchestrator : IEnforcementOrchestrator
{
    public int CallCount { get; private set; }
    public ContractDefinition? LastContract { get; private set; }
    public string? LastToken { get; private set; }

    public EnforcementResult Result { get; set; } = new()
    {
        ContractId = Guid.Parse("55555555-5555-5555-5555-555555555555"),
        RunId = Guid.Parse("66666666-6666-6666-6666-666666666666"),
        DeltaTableVersion = 42,
        OverallStatus = EnforcementStatus.Passed,
        SchemaRules = [],
        QualityRules = [],
        FreshnessRule = null,
        SchemaDiff = null,
        BreachScore = null,
        RemediationSuggestions = [],
        CompletedAt = DateTimeOffset.Parse("2026-05-09T00:00:00Z"),
    };

    public Task<EnforcementResult> RunAsync(ContractDefinition contract, string oneLakeOboToken, CancellationToken ct = default)
    {
        CallCount++;
        LastContract = contract;
        LastToken = oneLakeOboToken;
        return Task.FromResult(Result);
    }

    public Task<EnforcementResult> RunAsync(
        ContractDefinition contract,
        EnforcementCredentials credentials,
        EnforcementTargetContext? target,
        CancellationToken ct = default)
    {
        CallCount++;
        LastContract = contract;
        LastToken = credentials.OneLakeToken ?? credentials.FabricSqlToken ?? credentials.KustoToken ?? credentials.FabricRestToken;
        return Task.FromResult(Result);
    }
}

internal sealed class StubBreachImpactScorer : IBreachImpactScorer
{
    public BreachScore? Result { get; set; } = new(67, ["Synthetic breach score for tests."], "test-model");

    public Task<BreachScore?> ScoreAsync(EnforcementResult result, ContractDefinition contract, CancellationToken ct = default) =>
        Task.FromResult(Result);
}

internal sealed class StubRemediationAdvisor : IRemediationAdvisor
{
    public IReadOnlyList<string> Suggestions { get; set; } = ["Fix upstream null handling for column 'encounter_id'."];

    public Task<IReadOnlyList<string>> SuggestAsync(EnforcementResult result, ContractDefinition contract, CancellationToken ct = default) =>
        Task.FromResult(Suggestions);
}

internal sealed class StubBreachAlertDispatcher : IBreachAlertDispatcher
{
    public AlertDispatchResult Result { get; set; } = new(false, "none");

    public Task<AlertDispatchResult> DispatchAsync(AlertDispatchRequest request, CancellationToken ct = default) =>
        Task.FromResult(Result);
}
