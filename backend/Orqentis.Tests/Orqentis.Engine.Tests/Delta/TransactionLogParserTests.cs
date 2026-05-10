using FluentAssertions;
using Orqentis.Engine.Delta;
using Orqentis.Tests.Fixtures;

namespace Orqentis.Tests.Orqentis.Engine.Tests.Delta;

public sealed class TransactionLogParserTests
{
    [Theory]
    [InlineData("01-create", "00000000000000000000.json", 0L, 1, 1, 0, "2026-05-01T00:00:00Z")]
    [InlineData("02-add-column", "00000000000000000001.json", 1L, 1, 1, 0, "2026-05-02T06:30:00Z")]
    [InlineData("03-drop-column", "00000000000000000002.json", 2L, 1, 1, 1, "2026-05-03T09:45:00Z")]
    public void Parse_ValidFixtureCommit_ReturnsExpectedActions(
        string scenario,
        string fileName,
        long expectedVersion,
        int expectedMetadataActions,
        int expectedAddActions,
        int expectedRemoveActions,
        string expectedTimestamp)
    {
        // Arrange
        var parser = new TransactionLogParser();
        var path = FixturePath.FromTestProject("Fixtures", "delta", scenario, "_delta_log", fileName);
        var content = File.ReadAllText(path);

        // Act
        var commit = parser.Parse(expectedVersion, content);

        // Assert
        commit.Version.Should().Be(expectedVersion);
        commit.Actions.OfType<DeltaMetadataAction>().Should().HaveCount(expectedMetadataActions);
        commit.Actions.OfType<AddFileAction>().Should().HaveCount(expectedAddActions);
        commit.Actions.OfType<RemoveFileAction>().Should().HaveCount(expectedRemoveActions);
        commit.CommitTimestampUtc.Should().Be(DateTimeOffset.Parse(expectedTimestamp));
    }
}
