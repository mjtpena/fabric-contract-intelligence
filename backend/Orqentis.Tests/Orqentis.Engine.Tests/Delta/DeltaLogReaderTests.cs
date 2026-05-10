using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Orqentis.Engine.Delta;
using Orqentis.Tests.Fixtures;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;

namespace Orqentis.Tests.Orqentis.Engine.Tests.Delta;

public sealed class DeltaLogReaderTests
{
    [Theory]
    [InlineData("01-create", 0L, "2026-05-01T00:00:00Z", new[] { "encounter_id", "patient_id", "encounter_date" })]
    [InlineData("02-add-column", 1L, "2026-05-02T06:30:00Z", new[] { "encounter_id", "patient_id", "encounter_date", "facility_id" })]
    [InlineData("03-drop-column", 2L, "2026-05-03T09:45:00Z", new[] { "encounter_id", "patient_id", "encounter_date", "facility_id" })]
    public async Task ReadAsync_FixtureScenario_ReturnsExpectedSnapshot(
        string scenario,
        long expectedVersion,
        string expectedLastModifiedUtc,
        string[] expectedColumns)
    {
        // Arrange
        using var fakeServer = new FakeDeltaLakeServer(scenario);
        var reader = new DeltaLogReader(
            new HttpClient(),
            new SchemaExtractor(),
            NullLogger<DeltaLogReader>.Instance);

        // Act
        var result = await reader.ReadAsync(fakeServer.TableUri, "fixture-token");

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();
        result.Value!.Version.Should().Be(expectedVersion);
        result.Value.LastModifiedUtc.Should().Be(DateTimeOffset.Parse(expectedLastModifiedUtc));
        result.Value.PartitionColumns.Should().Equal("encounter_date");
        result.Value.Schema.Columns.Select(static column => column.Name).Should().Equal(expectedColumns);
    }

    [Fact]
    public async Task ReadAsync_UnreachableAbfssHost_ReturnsFailure()
    {
        // Arrange
        var reader = new DeltaLogReader(
            new HttpClient(),
            new SchemaExtractor(),
            NullLogger<DeltaLogReader>.Instance);

        // Act
        var result = await reader.ReadAsync("abfss://clinical@127.0.0.1:9/ClinicalLakehouse.Lakehouse/Tables/patient_encounters", "fixture-token");

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorCode.Should().Be("DeltaReadFailed");
    }

    [Fact]
    public async Task ReadAsync_HttpWithoutTransactionLogs_ReturnsMissingLogFailure()
    {
        // Arrange
        using var server = WireMockServer.Start();
        var reader = new DeltaLogReader(
            new HttpClient(),
            new SchemaExtractor(),
            NullLogger<DeltaLogReader>.Instance);

        // Act
        var result = await reader.ReadAsync($"{server.Urls[0].TrimEnd('/')}/empty/", "fixture-token");

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorCode.Should().Be("DeltaLogMissing");
    }

    private sealed class FakeDeltaLakeServer : IDisposable
    {
        private readonly WireMockServer _server;

        public FakeDeltaLakeServer(string scenario)
        {
            _server = WireMockServer.Start();

            var fixtureDirectory = FixturePath.FromTestProject("Fixtures", "delta", scenario, "_delta_log");
            foreach (var path in Directory.GetFiles(fixtureDirectory, "*.json"))
            {
                var fileName = Path.GetFileName(path);
                var body = File.ReadAllText(path);

                _server
                    .Given(Request.Create().WithPath($"/{scenario}/_delta_log/{fileName}").UsingGet())
                    .RespondWith(Response.Create().WithStatusCode(200).WithBody(body));
            }

            TableUri = $"{_server.Urls[0].TrimEnd('/')}/{scenario}/";
        }

        public string TableUri { get; }

        public void Dispose() => _server.Dispose();
    }
}
