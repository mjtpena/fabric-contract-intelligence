using Orqentis.Api.Auth;
using Orqentis.Engine;
using Orqentis.Engine.Models;
using Orqentis.Engine.Odcs;

namespace Orqentis.Tests.Orqentis.Api.Tests.Infrastructure;

internal sealed class CapturingTokenBroker : IOneLakeTokenBroker
{
    public string? LastUserAssertion { get; private set; }

    public Task<string> GetFabricRestTokenAsync(string userAssertion, CancellationToken ct = default)
    {
        LastUserAssertion = userAssertion;
        return Task.FromResult("fabric-rest-token");
    }

    public Task<string> GetOneLakeTokenAsync(string userAssertion, CancellationToken ct = default)
    {
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
}
