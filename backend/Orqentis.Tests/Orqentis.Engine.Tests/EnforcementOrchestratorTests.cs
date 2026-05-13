using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Orqentis.Engine;
using Orqentis.Engine.Common;
using Orqentis.Engine.Delta;
using Orqentis.Engine.Evaluation;
using Orqentis.Engine.Models;
using Orqentis.Engine.Odcs;

namespace Orqentis.Tests.Orqentis.Engine.Tests;

public sealed class EnforcementOrchestratorTests
{
    [Fact]
    public async Task RunAsync_SchemaAndFreshnessPass_ReturnsPassedResult()
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
            PartitionColumns = ["encounter_id"],
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
                RuleId = "schema.column.present",
                Status = RuleStatus.Passed,
                Message = "schema ok",
            },
        };

        var freshnessRule = new RuleResult
        {
            RuleId = "freshness.max_age",
            Status = RuleStatus.Passed,
            Message = "fresh",
            MaxAgeHours = 25,
            LastModifiedUtc = snapshot.LastModifiedUtc,
            AgeHours = 12,
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
        result.OverallStatus.Should().Be(EnforcementStatus.Passed);
        result.DeltaTableVersion.Should().Be(7);
        result.SchemaRules.Should().BeEquivalentTo(schemaRules);
        result.FreshnessRule.Should().BeEquivalentTo(freshnessRule);
        result.SchemaDiff.Should().BeNull();
        result.CompletedAt.Should().Be(now);
    }

    [Fact]
    public async Task RunAsync_SchemaFailure_ReturnsFailedResult()
    {
        // Arrange
        var snapshot = new DeltaTableSnapshot
        {
            Version = 4,
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
            PartitionColumns = [],
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
                RuleId = "schema.column.present",
                Status = RuleStatus.Failed,
                Message = "missing column",
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

        var orchestrator = CreateOrchestrator(
            deltaReader.Object,
            schemaEvaluator.Object,
            freshnessEvaluator.Object,
            qualityEvaluator.Object);

        // Act
        var result = await orchestrator.RunAsync(CreateContract(), "obo-token");

        // Assert
        result.OverallStatus.Should().Be(EnforcementStatus.Failed);
        result.SchemaRules.Should().BeEquivalentTo(schemaRules);
    }

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
    }

    [Theory]
    [InlineData("sql")]
    [InlineData("kql")]
    [InlineData("semantic_model")]
    public async Task RunAsync_NonDeltaServerFormat_RoutesToFabricTargetReader(string format)
    {
        // Arrange
        var deltaReader = new Mock<IDeltaLogReader>(MockBehavior.Strict);
        var sqlReader = new Mock<IFabricSqlSchemaReader>(MockBehavior.Strict);
        var kqlReader = new Mock<IFabricKqlSchemaReader>(MockBehavior.Strict);
        var semanticReader = new Mock<IFabricSemanticModelSchemaReader>(MockBehavior.Strict);
        var snapshot = new DeltaTableSnapshot
        {
            Version = -1,
            Schema = new DeltaSchema { Columns = [] },
            PartitionColumns = [],
            LastModifiedUtc = new DateTimeOffset(2026, 5, 1, 0, 0, 0, TimeSpan.Zero),
        };

        if (format == "sql")
        {
            sqlReader
                .Setup(reader => reader.ReadAsync(
                    It.IsAny<ContractServer>(),
                    It.Is<EnforcementCredentials>(credentials => credentials.FabricSqlToken == "sql-token"),
                    It.IsAny<EnforcementTargetContext>(),
                    It.IsAny<CancellationToken>()))
                .ReturnsAsync(Result<DeltaTableSnapshot>.Success(snapshot));
        }
        else if (format == "kql")
        {
            kqlReader
                .Setup(reader => reader.ReadAsync(
                    It.IsAny<ContractServer>(),
                    It.Is<EnforcementCredentials>(credentials => credentials.FabricRestToken == "fabric-token" && credentials.KustoToken == "kusto-token"),
                    It.IsAny<EnforcementTargetContext>(),
                    It.IsAny<CancellationToken>()))
                .ReturnsAsync(Result<DeltaTableSnapshot>.Success(snapshot));
        }
        else
        {
            semanticReader
                .Setup(reader => reader.ReadAsync(
                    It.IsAny<ContractServer>(),
                    It.Is<EnforcementCredentials>(credentials => credentials.FabricRestToken == "fabric-token"),
                    It.IsAny<EnforcementTargetContext>(),
                    It.IsAny<CancellationToken>()))
                .ReturnsAsync(Result<DeltaTableSnapshot>.Success(snapshot));
        }

        var orchestrator = CreateOrchestrator(
            deltaReader: deltaReader.Object,
            sqlReader: sqlReader.Object,
            kqlReader: kqlReader.Object,
            semanticReader: semanticReader.Object);
        var contract = CreateContract() with
        {
            Servers =
            [
                new ContractServer
                {
                    Name = "fabric-warehouse",
                    Type = "azure",
                    Path = "fabric://workspace/warehouse/dbo.sales",
                    Format = format,
                },
            ],
        };
        var credentials = new EnforcementCredentials
        {
            FabricRestToken = "fabric-token",
            FabricSqlToken = "sql-token",
            KustoToken = "kusto-token",
        };
        var target = new EnforcementTargetContext
        {
            WorkspaceId = Guid.Parse("11111111-1111-4111-8111-111111111111"),
            TargetItemId = Guid.Parse("22222222-2222-4222-8222-222222222222"),
            TargetType = "warehouse",
        };

        // Act
        var result = await orchestrator.RunAsync(contract, credentials, target);

        // Assert
        result.OverallStatus.Should().Be(EnforcementStatus.Passed);
        result.DeltaTableVersion.Should().Be(-1);
        deltaReader.Verify(
            reader => reader.ReadAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
        sqlReader.Verify(
            reader => reader.ReadAsync(
                It.IsAny<ContractServer>(),
                It.Is<EnforcementCredentials>(credentials => credentials.FabricSqlToken == "sql-token"),
                It.IsAny<EnforcementTargetContext>(),
                It.IsAny<CancellationToken>()),
            format == "sql" ? Times.Once : Times.Never);
        kqlReader.Verify(
            reader => reader.ReadAsync(
                It.IsAny<ContractServer>(),
                It.Is<EnforcementCredentials>(credentials => credentials.FabricRestToken == "fabric-token" && credentials.KustoToken == "kusto-token"),
                It.IsAny<EnforcementTargetContext>(),
                It.IsAny<CancellationToken>()),
            format == "kql" ? Times.Once : Times.Never);
        semanticReader.Verify(
            reader => reader.ReadAsync(
                It.IsAny<ContractServer>(),
                It.Is<EnforcementCredentials>(credentials => credentials.FabricRestToken == "fabric-token"),
                It.IsAny<EnforcementTargetContext>(),
                It.IsAny<CancellationToken>()),
            format == "semantic_model" ? Times.Once : Times.Never);
    }

    [Fact]
    public async Task RunAsync_EvaluatorThrows_ReturnsErrorResult()
    {
        // Arrange
        var snapshot = new DeltaTableSnapshot
        {
            Version = 7,
            Schema = new DeltaSchema { Columns = [] },
            PartitionColumns = [],
            LastModifiedUtc = new DateTimeOffset(2026, 5, 1, 0, 0, 0, TimeSpan.Zero),
        };

        var deltaReader = new Mock<IDeltaLogReader>();
        deltaReader
            .Setup(reader => reader.ReadAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<DeltaTableSnapshot>.Success(snapshot));

        var schemaEvaluator = new Mock<ISchemaRuleEvaluator>();
        schemaEvaluator
            .Setup(evaluator => evaluator.Evaluate(It.IsAny<DeltaSchema>(), It.IsAny<IReadOnlyList<ContractColumn>>(), It.IsAny<IReadOnlyList<string>>()))
            .Throws(new InvalidOperationException("schema blew up"));

        var orchestrator = CreateOrchestrator(deltaReader.Object, schemaEvaluator.Object);

        // Act
        var result = await orchestrator.RunAsync(CreateContract(), "obo-token");

        // Assert
        result.OverallStatus.Should().Be(EnforcementStatus.Error);
        result.ErrorMessage.Should().Be("schema blew up");
    }

    private static EnforcementOrchestrator CreateOrchestrator(
        IDeltaLogReader? deltaReader = null,
        ISchemaRuleEvaluator? schemaEvaluator = null,
        IFreshnessEvaluator? freshnessEvaluator = null,
        IQualityRuleEvaluator? qualityEvaluator = null,
        TimeProvider? timeProvider = null,
        IFabricSqlSchemaReader? sqlReader = null,
        IFabricKqlSchemaReader? kqlReader = null,
        IFabricSemanticModelSchemaReader? semanticReader = null)
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
            sqlReader ?? Mock.Of<IFabricSqlSchemaReader>(),
            kqlReader ?? Mock.Of<IFabricKqlSchemaReader>(),
            semanticReader ?? Mock.Of<IFabricSemanticModelSchemaReader>(),
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
            Id = "urn:orqentis:orqentis:healthcare:patient_encounters:v1",
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
            Schema =
            [
                new ContractColumn
                {
                    Name = "encounter_id",
                    Type = "STRING",
                    Required = true,
                    PartitionKeyPosition = 1,
                },
            ],
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
