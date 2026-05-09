using Orqentis.Engine.Evaluation;
using Orqentis.Engine.Odcs;

using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;

namespace Orqentis.Tests.Orqentis.Engine.Tests.Evaluation;

public sealed class QualityRuleEvaluatorTests
{
    [Fact]
    public async Task EvaluateAsync_StubbedImplementation_ReturnsEmptyList()
    {
        // Arrange
        var evaluator = new QualityRuleEvaluator(NullLogger<QualityRuleEvaluator>.Instance);
        IReadOnlyList<QualityRule> rules =
        [
            new QualityRule
            {
                Type = "nullRate",
                Column = "encounter_id",
                Threshold = 0,
                Severity = "error",
            },
        ];
        var server = new ContractServer
        {
            Name = "fabric-production",
            Type = "azure",
            Path = "abfss://clinical@onelake.dfs.fabric.microsoft.com/ClinicalLakehouse.Lakehouse/Tables/patient_encounters",
        };

        // Act
        var result = await evaluator.EvaluateAsync(rules, server, "token");

        // Assert
        result.Should().BeEmpty();
    }
}
