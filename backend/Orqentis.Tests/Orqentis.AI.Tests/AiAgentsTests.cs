using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Orqentis.AI;
using Orqentis.Engine.Models;
using Orqentis.Engine.Odcs;

namespace Orqentis.Tests.Orqentis.AI.Tests;

public sealed class AiAgentsTests
{
    [Fact]
    public async Task ContractSuggestionAgent_FallsBackToValidTemplate_WhenLlmUnavailable()
    {
        var validator = new OdcsContractValidator(NullLogger<OdcsContractValidator>.Instance);
        var agent = new ContractSuggestionAgent(
            new StubLlmRouter(null),
            new StubPromptLoader("contract suggestion prompt"),
            validator,
            Options.Create(new AiOptions()),
            NullLogger<ContractSuggestionAgent>.Instance);

        var suggestion = await agent.SuggestAsync(new TableProfile
        {
            TableName = "owid_co2_demo",
            AbfssUri = "abfss://showcase@onelake.dfs.fabric.microsoft.com/ShowcaseLakehouse.Lakehouse/Tables/owid_co2_demo",
            Columns =
            [
                new TableProfileColumn("country", "string", false, 5, 0),
                new TableProfileColumn("year", "integer", false, 5, 0),
            ],
            SampleRows = [],
        });

        validator.Validate(suggestion.OdcsYaml).Should().BeEmpty();
        suggestion.ModelUsed.Should().Be("fallback-template");
    }

    [Fact]
    public async Task BreachImpactScorer_ReturnsNull_WhenProviderPayloadIsInvalid()
    {
        var scorer = new BreachImpactScorer(
            new StubLlmRouter(new LlmResult("not-json", "stub-model")),
            new StubPromptLoader("breach prompt"),
            NullLogger<BreachImpactScorer>.Instance);

        var score = await scorer.ScoreAsync(CreateResult(), CreateContract());
        score.Should().BeNull();
    }

    [Fact]
    public async Task BreachImpactScorer_ParsesScorePayload()
    {
        var scorer = new BreachImpactScorer(
            new StubLlmRouter(new LlmResult("""{"score":72,"reasons":["required column dropped"]}""", "gpt-4o")),
            new StubPromptLoader("breach prompt"),
            NullLogger<BreachImpactScorer>.Instance);

        var score = await scorer.ScoreAsync(CreateResult(), CreateContract());
        score.Should().NotBeNull();
        score!.Score.Should().Be(72);
        score.ModelUsed.Should().Be("gpt-4o");
    }

    [Fact]
    public async Task RemediationAdvisor_ReturnsColumnSpecificFallback()
    {
        var advisor = new RemediationAdvisor(
            new StubLlmRouter(null),
            new StubPromptLoader("remediation prompt"),
            NullLogger<RemediationAdvisor>.Instance);

        var suggestions = await advisor.SuggestAsync(
            CreateResult() with
            {
                QualityRules =
                [
                    new RuleResult
                    {
                        RuleId = "quality.null_rate",
                        Column = "country",
                        Status = RuleStatus.Failed,
                        Message = "country null rate exceeded threshold.",
                    },
                ],
            },
            CreateContract());

        suggestions.Should().ContainSingle();
        suggestions[0].Should().Contain("country");
    }

    private static EnforcementResult CreateResult() =>
        new()
        {
            ContractId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            RunId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
            DeltaTableVersion = 0,
            OverallStatus = EnforcementStatus.Failed,
            SchemaRules = [],
            QualityRules = [],
            CompletedAt = DateTimeOffset.UtcNow,
        };

    private static ContractDefinition CreateContract() =>
        new()
        {
            ApiVersion = "v3.1.0",
            Kind = "DataContract",
            Id = "urn:orqentis:orqentis:test:owid",
            Name = "owid_co2_demo",
            Version = "0.1.0",
            Status = "active",
            Info = new ContractInfo { Title = "owid", Owner = "owner@example.com" },
            Servers = [new ContractServer { Name = "fabric", Type = "azure", Path = "abfss://demo" }],
            Schema = [new ContractColumn { Name = "country", Type = "string", Required = true }],
        };

    private sealed class StubLlmRouter : ILlmRouter
    {
        private readonly LlmResult? _result;

        public StubLlmRouter(LlmResult? result) => _result = result;

        public Task<LlmResult?> CompleteAsync(string operation, string systemPrompt, string userInput, CancellationToken ct = default) =>
            Task.FromResult(_result);
    }

    private sealed class StubPromptLoader : IPromptLoader
    {
        private readonly string _prompt;

        public StubPromptLoader(string prompt) => _prompt = prompt;

        public string Load(string fileName) => _prompt;
    }
}
