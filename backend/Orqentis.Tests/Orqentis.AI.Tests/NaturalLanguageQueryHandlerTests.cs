using Microsoft.Extensions.Logging.Abstractions;
using Orqentis.AI;

namespace Orqentis.Tests.Orqentis.AI.Tests;

public sealed class NaturalLanguageQueryHandlerTests
{
    [Fact]
    public async Task QueryAsync_ReturnsRankedMatches_ForRelevantTerms()
    {
        var handler = new NaturalLanguageQueryHandler(
            new NullLlmRouter(),
            new PromptLoaderStub(),
            NullLogger<NaturalLanguageQueryHandler>.Instance);

        var response = await handler.QueryAsync(
            "co2 emissions country",
            [
                new NaturalLanguageContractDocument(
                    Guid.Parse("11111111-1111-1111-1111-111111111111"),
                    "OWID CO2 Contract",
                    "Tracks yearly emissions by country",
                    "owner@example.com",
                    "schema: country, co2",
                    "1.0.0"),
            ]);

        response.Matches.Should().ContainSingle();
        response.Matches[0].Name.Should().Be("OWID CO2 Contract");
    }

    private sealed class NullLlmRouter : ILlmRouter
    {
        public Task<LlmResult?> CompleteAsync(string operation, string systemPrompt, string userInput, CancellationToken ct = default) =>
            Task.FromResult<LlmResult?>(null);
    }

    private sealed class PromptLoaderStub : IPromptLoader
    {
        public string Load(string fileName) => "nl query prompt";
    }
}
