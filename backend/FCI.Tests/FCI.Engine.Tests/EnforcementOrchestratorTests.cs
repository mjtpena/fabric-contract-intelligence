using FCI.Engine;
using FCI.Engine.Common;
using FCI.Engine.Delta;
using FCI.Engine.Evaluation;
using FCI.Engine.Models;
using FCI.Engine.Odcs;

using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace FCI.Tests.FCI.Engine.Tests;

public sealed class EnforcementOrchestratorTests
{
    [Fact]
    public async Task RunAsync_DeltaReadFails_ReturnsErrorResult()
    {
        // Arrange
        var deltaReader = new Mock<IDeltaLogReader>();
        deltaReader
            .Setup(reader => reader.ReadAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<DeltaTableSnapshot>.Failure("boom", "DeltaReadFailed"));

        var orchestrator = CreateOrchestrator(deltaReader: deltaReader.Object);

        // Act
        var result = await orchestrator.RunAsync(CreateContract(), "obo-token");

        // Assert
        result.OverallStatus.Should().Be(EnforcementStatus.Error);
        result.DeltaTableVersion.Should().Be(-1);
        result.ErrorMessage.Should().Be("boom");
        result.SchemaRules.Should().BeEmpty();
        result.QualityRules.Should().BeEmpty();
    }

    [Fact]
    public async Task RunAsync_RulesWarned_ReturnsWarnedResult()
    {
        // Arrange
        var snapshot = new DeltaTableSnapshot
        {
            Version = 7,
            Schema = new DeltaSchema
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
            },
            PartitionColumns = ["encounter_date"],
            LastModifiedUtc = new DateTimeOffset(2026, 5, 1, 0, 0, 0, TimeSpan.Zero),
        };

        var deltaReader = new Mock<IDeltaLogReader>();
        deltaReader
            .Setup(reader => reader.ReadAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<DeltaTableSnapshot>.Success(snapshot));

        var schemaRules = new[]
        {
            new RuleResult
            {
                RuleId = "schema.column.extra",
                Status = RuleStatus.Warned,
                Message = "extra column",
            },
        };

        var freshnessRule = new RuleResult
        {
            RuleId = "freshness.max_age",
            Status = RuleStatus.Passed,
            Message = "fresh",
        };

        var schemaEvaluator = new Mock<ISchemaRuleEvaluator>();
        schemaEvaluator
            .Setup(evaluator => evaluator.Evaluate(It.IsAny<DeltaSchema>(), It.IsAny<IReadOnlyList<ContractColumn>>(), It.IsAny<IReadOnlyList<string>>()))
            .Returns(schemaRules);

        var freshnessEvaluator = new Mock<IFreshnessEvaluator>();
        freshnessEvaluator
            .Setup(evaluator => evaluator.Evaluate(It.IsAny<DateTimeOffset>(), It.IsAny<FreshnessRule?>(), It.IsAny<DateTimeOffset>()))
            .Returns(freshnessRule);

        var qualityEvaluator = new Mock<IQualityRuleEvaluator>();
        qualityEvaluator
            .Setup(evaluator => evaluator.EvaluateAsync(It.IsAny<IReadOnlyList<QualityRule>>(), It.IsAny<ContractServer>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var now = new DateTimeOffset(2026, 5, 2, 0, 0, 0, TimeSpan.Zero);
        var orchestrator = CreateOrchestrator(
            deltaReader.Object,
            schemaEvaluator.Object,
            freshnessEvaluator.Object,
            qualityEvaluator.Object,
            new FixedTimeProvider(now));

        // Act
        var result = await orchestrator.RunAsync(CreateContract(), "obo-token");

        // Assert
        result.OverallStatus.Should().Be(EnforcementStatus.Warned);
        result.DeltaTableVersion.Should().Be(7);
        result.SchemaRules.Should().BeEquivalentTo(schemaRules);
        result.FreshnessRule.Should().BeEquivalentTo(freshnessRule);
        result.SchemaDiff.Should().BeSameAs(SchemaDiff.Empty);
        result.CompletedAt.Should().Be(now);
        result.ContractId.Should().NotBeEmpty();
    }

    [Fact]
    public async Task RunAsync_RulesFailed_ReturnsFailedResult()
    {
        // Arrange
        var snapshot = new DeltaTableSnapshot
        {
            Version = 4,
            Schema = new DeltaSchema { Columns = [] },
            PartitionColumns = [],
            LastModifiedUtc = new DateTimeOffset(2026, 5, 1, 0, 0, 0, TimeSpan.Zero),
        };

        var deltaReader = new Mock<IDeltaLogReader>();
        deltaReader
            .Setup(reader => reader.ReadAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<DeltaTableSnapshot>.Success(snapshot));

        var qualityRules = new[]
        {
            new RuleResult
            {
                RuleId = "quality.null_rate",
                Status = RuleStatus.Failed,
                Message = "null rate too high",
            },
        };

        var qualityEvaluator = new Mock<IQualityRuleEvaluator>();
        qualityEvaluator
            .Setup(evaluator => evaluator.EvaluateAsync(It.IsAny<IReadOnlyList<QualityRule>>(), It.IsAny<ContractServer>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(qualityRules);

        var orchestrator = CreateOrchestrator(
            deltaReader.Object,
            qualityEvaluator: qualityEvaluator.Object);

        // Act
        var result = await orchestrator.RunAsync(CreateContract(), "obo-token");

        // Assert
        result.OverallStatus.Should().Be(EnforcementStatus.Failed);
        result.QualityRules.Should().BeEquivalentTo(qualityRules);
    }

    private static EnforcementOrchestrator CreateOrchestrator(
        IDeltaLogReader? deltaReader = null,
        ISchemaRuleEvaluator? schemaEvaluator = null,
        IFreshnessEvaluator? freshnessEvaluator = null,
        IQualityRuleEvaluator? qualityEvaluator = null,
        TimeProvider? timeProvider = null)
    {
        if (schemaEvaluator is null)
        {
            var schemaEvaluatorMock = new Mock<ISchemaRuleEvaluator>();
            schemaEvaluatorMock
                .Setup(evaluator => evaluator.Evaluate(It.IsAny<DeltaSchema>(), It.IsAny<IReadOnlyList<ContractColumn>>(), It.IsAny<IReadOnlyList<string>>()))
                .Returns([]);
            schemaEvaluator = schemaEvaluatorMock.Object;
        }

        if (freshnessEvaluator is null)
        {
            var freshnessEvaluatorMock = new Mock<IFreshnessEvaluator>();
            freshnessEvaluatorMock
                .Setup(evaluator => evaluator.Evaluate(It.IsAny<DateTimeOffset>(), It.IsAny<FreshnessRule?>(), It.IsAny<DateTimeOffset>()))
                .Returns((RuleResult?)null);
            freshnessEvaluator = freshnessEvaluatorMock.Object;
        }

        if (qualityEvaluator is null)
        {
            var qualityEvaluatorMock = new Mock<IQualityRuleEvaluator>();
            qualityEvaluatorMock
                .Setup(evaluator => evaluator.EvaluateAsync(It.IsAny<IReadOnlyList<QualityRule>>(), It.IsAny<ContractServer>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync([]);
            qualityEvaluator = qualityEvaluatorMock.Object;
        }

        return new EnforcementOrchestrator(
            deltaReader ?? Mock.Of<IDeltaLogReader>(),
            schemaEvaluator,
            freshnessEvaluator,
            qualityEvaluator,
            NullLogger<EnforcementOrchestrator>.Instance,
            timeProvider);
    }

    private static ContractDefinition CreateContract() =>
        new()
        {
            ApiVersion = "v3.1.0",
            Kind = "DataContract",
            Id = "urn:datachain:fci:healthcare:patient_encounters:v1",
            Name = "Patient Encounters Contract",
            Version = "1.0.0",
            Status = "active",
            Info = new ContractInfo
            {
                Title = "Patient Encounters",
                Owner = "clinical-data-team@example.com",
            },
            Servers =
            [
                new ContractServer
                {
                    Name = "fabric-production",
                    Type = "azure",
                    Path = "abfss://clinical@onelake.dfs.fabric.microsoft.com/ClinicalLakehouse.Lakehouse/Tables/patient_encounters",
                },
            ],
            Schema = [],
            Quality = [],
            Freshness = new FreshnessRule
            {
                MaxAgeHours = 25,
                Severity = "warning",
            },
            Sla = [],
        };

    private sealed class FixedTimeProvider(DateTimeOffset utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => utcNow;
    }
}
