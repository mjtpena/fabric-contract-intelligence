using Orqentis.Engine.Delta;
using Orqentis.Tests.Fixtures;

using FluentAssertions;

namespace Orqentis.Tests.Orqentis.Engine.Tests.Delta;

public sealed class SchemaExtractorTests
{
    [Fact]
    public void Extract_LatestMetadataPresent_ReturnsLatestSchemaAndPartitionColumns()
    {
        // Arrange
        var parser = new TransactionLogParser();
        var extractor = new SchemaExtractor();
        var commits = Directory
            .GetFiles(FixturePath.FromTestProject("Fixtures", "delta", "03-drop-column", "_delta_log"), "*.json")
            .OrderBy(static path => path)
            .Select((path, index) => parser.Parse(index, File.ReadAllText(path)))
            .ToArray();

        // Act
        var result = extractor.Extract(commits);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();
        result.Value!.PartitionColumns.Should().Equal("encounter_date");
        result.Value.Schema.Columns.Select(static column => column.Name)
            .Should()
            .Equal("encounter_id", "patient_id", "encounter_date", "facility_id");
    }

    [Fact]
    public void Extract_NoMetadataActions_ReturnsFailure()
    {
        // Arrange
        var extractor = new SchemaExtractor();
        var commits = new[]
        {
            new TransactionLogCommit
            {
                Version = 0,
                Actions = [new AddFileAction("part-00000.parquet")],
            },
        };

        // Act
        var result = extractor.Extract(commits);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorCode.Should().Be("DeltaMetadataMissing");
    }
}
