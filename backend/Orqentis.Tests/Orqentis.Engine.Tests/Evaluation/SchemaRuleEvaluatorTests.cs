using System.Linq;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Orqentis.Engine.Delta;
using Orqentis.Engine.Evaluation;
using Orqentis.Engine.Models;
using Orqentis.Engine.Odcs;

namespace Orqentis.Tests.Orqentis.Engine.Tests.Evaluation;

public sealed class SchemaRuleEvaluatorTests
{
    [Fact]
    public void Evaluate_ColumnPresent_EmitsPassedPresentRule()
    {
        // Arrange
        var evaluator = CreateEvaluator();

        // Act
        var result = evaluator.Evaluate(
            CreateLiveSchema(CreateLiveColumn("encounter_id", "string", false)),
            [CreateContractColumn("encounter_id", "STRING", true)],
            []);

        // Assert
        var rule = result.Single(static item => item.RuleId == "schema.column.present");
        rule.Status.Should().Be(RuleStatus.Passed);
        rule.Column.Should().Be("encounter_id");
    }

    [Fact]
    public void Evaluate_MissingColumn_EmitsFailedPresentRule()
    {
        // Arrange
        var evaluator = CreateEvaluator();

        // Act
        var result = evaluator.Evaluate(
            CreateLiveSchema(),
            [CreateContractColumn("encounter_id", "STRING", true)],
            []);

        // Assert
        var rule = result.Single(static item => item.RuleId == "schema.column.present");
        rule.Status.Should().Be(RuleStatus.Failed);
        rule.Expected.Should().Be("STRING NOT NULL");
        rule.Actual.Should().Be("MISSING");
    }

    [Fact]
    public void Evaluate_MatchingType_EmitsPassedTypeRule()
    {
        // Arrange
        var evaluator = CreateEvaluator();

        // Act
        var result = evaluator.Evaluate(
            CreateLiveSchema(CreateLiveColumn("encounter_id", "string", false)),
            [CreateContractColumn("encounter_id", "STRING", true)],
            []);

        // Assert
        var rule = result.Single(static item => item.RuleId == "schema.column.type");
        rule.Status.Should().Be(RuleStatus.Passed);
        rule.Expected.Should().Be("STRING");
        rule.Actual.Should().Be("STRING");
    }

    [Fact]
    public void Evaluate_TypeMismatch_EmitsFailedTypeRule()
    {
        // Arrange
        var evaluator = CreateEvaluator();

        // Act
        var result = evaluator.Evaluate(
            CreateLiveSchema(CreateLiveColumn("encounter_id", "int", false)),
            [CreateContractColumn("encounter_id", "STRING", true)],
            []);

        // Assert
        var rule = result.Single(static item => item.RuleId == "schema.column.type");
        rule.Status.Should().Be(RuleStatus.Failed);
        rule.Expected.Should().Be("STRING");
        rule.Actual.Should().Be("INTEGER");
    }

    [Fact]
    public void Evaluate_RequiredColumnNotNullable_EmitsPassedNullableRule()
    {
        // Arrange
        var evaluator = CreateEvaluator();

        // Act
        var result = evaluator.Evaluate(
            CreateLiveSchema(CreateLiveColumn("encounter_id", "string", false)),
            [CreateContractColumn("encounter_id", "STRING", true)],
            []);

        // Assert
        var rule = result.Single(static item => item.RuleId == "schema.column.nullable");
        rule.Status.Should().Be(RuleStatus.Passed);
        rule.Expected.Should().Be("NOT NULL");
        rule.Actual.Should().Be("NOT NULL");
    }

    [Fact]
    public void Evaluate_RequiredColumnNullable_EmitsFailedNullableRule()
    {
        // Arrange
        var evaluator = CreateEvaluator();

        // Act
        var result = evaluator.Evaluate(
            CreateLiveSchema(CreateLiveColumn("encounter_id", "string", true)),
            [CreateContractColumn("encounter_id", "STRING", true)],
            []);

        // Assert
        var rule = result.Single(static item => item.RuleId == "schema.column.nullable");
        rule.Status.Should().Be(RuleStatus.Failed);
        rule.Expected.Should().Be("NOT NULL");
        rule.Actual.Should().Be("NULLABLE");
    }

    [Fact]
    public void Evaluate_NoExtraColumns_EmitsPassedExtraRule()
    {
        // Arrange
        var evaluator = CreateEvaluator();

        // Act
        var result = evaluator.Evaluate(
            CreateLiveSchema(CreateLiveColumn("encounter_id", "string", false)),
            [CreateContractColumn("encounter_id", "STRING", true)],
            []);

        // Assert
        var rule = result.Single(static item => item.RuleId == "schema.column.extra");
        rule.Status.Should().Be(RuleStatus.Passed);
    }

    [Fact]
    public void Evaluate_ExtraColumns_EmitsWarnedExtraRule()
    {
        // Arrange
        var evaluator = CreateEvaluator();

        // Act
        var result = evaluator.Evaluate(
            CreateLiveSchema(
                CreateLiveColumn("encounter_id", "string", false),
                CreateLiveColumn("facility_id", "string", false)),
            [CreateContractColumn("encounter_id", "STRING", true)],
            []);

        // Assert
        var rule = result.Single(static item => item.RuleId == "schema.column.extra");
        rule.Status.Should().Be(RuleStatus.Warned);
        rule.Column.Should().Be("facility_id");
    }

    [Fact]
    public void Evaluate_MatchingPartitions_EmitsPassedPartitionRule()
    {
        // Arrange
        var evaluator = CreateEvaluator();

        // Act
        var result = evaluator.Evaluate(
            CreateLiveSchema(CreateLiveColumn("encounter_id", "string", false)),
            [CreateContractColumn("encounter_id", "STRING", true, 1)],
            ["encounter_id"]);

        // Assert
        var rule = result.Single(static item => item.RuleId == "schema.partition.match");
        rule.Status.Should().Be(RuleStatus.Passed);
    }

    [Fact]
    public void Evaluate_PartitionMismatch_EmitsWarnedPartitionRule()
    {
        // Arrange
        var evaluator = CreateEvaluator();

        // Act
        var result = evaluator.Evaluate(
            CreateLiveSchema(CreateLiveColumn("encounter_id", "string", false)),
            [CreateContractColumn("encounter_id", "STRING", true, 1)],
            ["facility_id"]);

        // Assert
        var rule = result.Single(static item => item.RuleId == "schema.partition.match");
        rule.Status.Should().Be(RuleStatus.Warned);
        rule.Expected.Should().BeEquivalentTo(new[] { "encounter_id" });
        rule.Actual.Should().BeEquivalentTo(new[] { "facility_id" });
    }

    // ─── NormalizeType matrix ───────────────────────────────────────────────────
    // Delta persists int64 as "long"; ODCS uses "integer"/"bigint". These must match.

    [Theory]
    [InlineData("long", "integer", true)]
    [InlineData("bigint", "integer", true)]
    [InlineData("smallint", "integer", true)]
    [InlineData("tinyint", "integer", true)]
    [InlineData("short", "integer", true)]
    [InlineData("byte", "integer", true)]
    [InlineData("double", "number", true)]
    [InlineData("float", "number", true)]
    [InlineData("real", "number", true)]
    [InlineData("decimal", "number", true)]
    [InlineData("numeric", "number", true)]
    [InlineData("bool", "boolean", true)]
    [InlineData("boolean", "boolean", true)]
    [InlineData("date", "date", true)]
    [InlineData("timestamp", "timestamp", true)]
    [InlineData("long", "string", false)]
    [InlineData("double", "integer", false)]
    public void Evaluate_NormalizeType_CrossFamilyMatching(string liveType, string contractType, bool shouldMatch)
    {
        var evaluator = CreateEvaluator();

        var result = evaluator.Evaluate(
            CreateLiveSchema(CreateLiveColumn("col", liveType, false)),
            [CreateContractColumn("col", contractType, true)],
            []);

        var typeRule = result.Single(item => item.RuleId == "schema.column.type");
        if (shouldMatch)
            typeRule.Status.Should().Be(RuleStatus.Passed, because: $"'{liveType}' and '{contractType}' should normalize to the same canonical type");
        else
            typeRule.Status.Should().Be(RuleStatus.Failed, because: $"'{liveType}' and '{contractType}' belong to different type families");
    }

    [Theory]
    [InlineData("array<string>", "ARRAY<STRING>")]   // complex type passes through uppercased
    [InlineData("map<string,long>", "MAP<STRING,LONG>")]
    [InlineData("struct<id:string,amount:double>", "STRUCT<ID:STRING,AMOUNT:DOUBLE>")]
    public void Evaluate_ComplexTypes_PassThroughUppercased(string liveType, string expectedNormalized)
    {
        var evaluator = CreateEvaluator();

        var result = evaluator.Evaluate(
            CreateLiveSchema(CreateLiveColumn("col", liveType, false)),
            [CreateContractColumn("col", liveType, true)],
            []);

        var typeRule = result.Single(item => item.RuleId == "schema.column.type");
        typeRule.Status.Should().Be(RuleStatus.Passed);
        typeRule.Actual.Should().Be(expectedNormalized);
    }

    private static SchemaRuleEvaluator CreateEvaluator() =>
        new(NullLogger<SchemaRuleEvaluator>.Instance);

    private static DeltaSchema CreateLiveSchema(params DeltaColumn[] columns) =>
        new()
        {
            Columns = columns,
        };

    private static DeltaColumn CreateLiveColumn(string name, string type, bool nullable) =>
        new()
        {
            Name = name,
            Type = type,
            Nullable = nullable,
        };

    private static ContractColumn CreateContractColumn(string name, string type, bool required, int? partitionKeyPosition = null) =>
        new()
        {
            Name = name,
            Type = type,
            Required = required,
            PartitionKeyPosition = partitionKeyPosition,
        };
}
