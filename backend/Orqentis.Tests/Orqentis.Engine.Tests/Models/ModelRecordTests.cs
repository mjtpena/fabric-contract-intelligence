using FluentAssertions;
using Orqentis.Engine.Models;

namespace Orqentis.Tests.Orqentis.Engine.Tests.Models;

public sealed class ModelRecordTests
{
    [Fact]
    public void SchemaDiff_Empty_ReturnsEmptyCollections()
    {
        // Arrange
        var diff = SchemaDiff.Empty;

        // Assert
        diff.AddedColumns.Should().BeEmpty();
        diff.RemovedColumns.Should().BeEmpty();
        diff.TypeChanges.Should().BeEmpty();
        diff.NullabilityChanges.Should().BeEmpty();
        diff.PartitionChange.Should().BeNull();
    }

    [Fact]
    public void ModelRecords_PreserveAssignedValues()
    {
        // Arrange
        var rule = new RuleResult
        {
            RuleId = "schema.column.present",
            Column = "encounter_id",
            Status = RuleStatus.Passed,
            Message = "ok",
            Expected = "STRING",
            Actual = "STRING",
        };

        var diff = new SchemaDiff
        {
            AddedColumns = ["new_col"],
            RemovedColumns = ["old_col"],
            TypeChanges = [new TypeChange("encounter_id", "string", "int")],
            NullabilityChanges = [new NullabilityChange("patient_id", true, false)],
            PartitionChange = new PartitionChange(["encounter_date"], ["facility_id"]),
        };

        var result = new EnforcementResult
        {
            RunId = Guid.NewGuid(),
            ContractId = Guid.NewGuid(),
            OverallStatus = EnforcementStatus.Passed,
            DeltaTableVersion = 3,
            SchemaRules = [rule],
            QualityRules = [],
            FreshnessRule = rule,
            SchemaDiff = diff,
            BreachScore = 42.5m,
            RemediationSuggestions = ["Do a thing"],
            CompletedAt = new DateTimeOffset(2026, 5, 1, 0, 0, 0, TimeSpan.Zero),
            ErrorMessage = null,
        };

        // Assert
        rule.Column.Should().Be("encounter_id");
        result.SchemaDiff.Should().BeEquivalentTo(diff);
        result.BreachScore.Should().Be(42.5m);
        result.RemediationSuggestions.Should().ContainSingle().Which.Should().Be("Do a thing");
    }
}
