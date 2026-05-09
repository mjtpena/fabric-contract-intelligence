using FCI.Engine.Delta;
using FCI.Engine.Evaluation;
using FCI.Engine.Models;
using FCI.Engine.Odcs;

using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;

namespace FCI.Tests.FCI.Engine.Tests.Evaluation;

public sealed class EvaluatorStubTests
{
    [Fact]
    public void SchemaRuleEvaluator_Evaluate_ReturnsEmptyList()
    {
        // Arrange
        var evaluator = new SchemaRuleEvaluator(NullLogger<SchemaRuleEvaluator>.Instance);
        var liveSchema = new DeltaSchema
        {
            Columns =
            [
                new DeltaColumn
                {
                    Name = "encounter_id",
                    Type = "string",
                    Nullable = false,
                },
            ],
        };
        IReadOnlyList<ContractColumn> contractSchema =
        [
            new ContractColumn
            {
                Name = "encounter_id",
                Type = "STRING",
                Required = true,
            },
        ];

        // Act
        var result = evaluator.Evaluate(liveSchema, contractSchema, ["encounter_date"]);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public void FreshnessEvaluator_NullRule_ReturnsNull()
    {
        // Arrange
        var evaluator = new FreshnessEvaluator(NullLogger<FreshnessEvaluator>.Instance);

        // Act
        var result = evaluator.Evaluate(DateTimeOffset.UtcNow.AddHours(-1), null, DateTimeOffset.UtcNow);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void FreshnessEvaluator_RuleProvided_ReturnsSkippedRule()
    {
        // Arrange
        var evaluator = new FreshnessEvaluator(NullLogger<FreshnessEvaluator>.Instance);
        var lastModified = new DateTimeOffset(2026, 5, 1, 0, 0, 0, TimeSpan.Zero);
        var now = new DateTimeOffset(2026, 5, 2, 0, 0, 0, TimeSpan.Zero);
        var rule = new FreshnessRule
        {
            MaxAgeHours = 12,
            Severity = "warning",
        };

        // Act
        var result = evaluator.Evaluate(lastModified, rule, now);

        // Assert
        result.Should().NotBeNull();
        result!.RuleId.Should().Be("freshness.max_age");
        result.Status.Should().Be(RuleStatus.Skipped);
        result.Expected.Should().Be(12d);
        result.Actual.Should().Be(24d);
    }

    [Fact]
    public async Task QualityRuleEvaluator_EvaluateAsync_ReturnsEmptyList()
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
