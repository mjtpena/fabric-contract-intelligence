using Orqentis.Engine.Odcs;
using Orqentis.Tests.Fixtures;

using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;

namespace Orqentis.Tests.Orqentis.Engine.Tests.Odcs;

public sealed class OdcsContractParserTests
{
    [Fact]
    public void ParseAndSerialize_HealthcareContract_RoundTripsWithoutInformationLoss()
    {
        // Arrange
        var parser = new OdcsContractParser(NullLogger<OdcsContractParser>.Instance);
        var serializer = new OdcsContractSerializer();
        var yaml = File.ReadAllText(FixturePath.FromTestProject("..", "..", "contracts", "examples", "healthcare.contract.yaml"));

        // Act
        var parsed = parser.Parse(yaml);
        var serialized = serializer.Serialize(parsed.Value!);
        var reparsed = parser.Parse(serialized);

        // Assert
        parsed.IsSuccess.Should().BeTrue();
        reparsed.IsSuccess.Should().BeTrue();
        reparsed.Value.Should().BeEquivalentTo(parsed.Value);
    }
}
