using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Orqentis.Engine.Odcs;
using Orqentis.Tests.Fixtures;

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

    [Fact]
    public void Parse_ServerWithWorkspaceId_RoundTripsWorkspaceId()
    {
        var crossWsId = Guid.Parse("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
        var parser = new OdcsContractParser(NullLogger<OdcsContractParser>.Instance);
        var serializer = new OdcsContractSerializer();

        var yaml = $"""
            apiVersion: v3.1.0
            kind: DataContract
            id: urn:test:cross-workspace
            name: Cross Workspace Test Contract
            version: 1.0.0
            status: active
            info:
              title: Cross Workspace Test
              owner: test@example.com
            servers:
              - server: remote-eventhouse
                type: azure
                location: MyDatabase/SalesEvents
                format: kql
                workspaceId: {crossWsId:D}
            schema: []
            """;

        var parsed = parser.Parse(yaml);
        parsed.IsSuccess.Should().BeTrue();
        parsed.Value!.Servers.Should().ContainSingle();
        parsed.Value.Servers[0].WorkspaceId.Should().Be(crossWsId);

        // Verify round-trip through serializer.
        var serialized = serializer.Serialize(parsed.Value);
        var reparsed = parser.Parse(serialized);
        reparsed.IsSuccess.Should().BeTrue();
        reparsed.Value!.Servers[0].WorkspaceId.Should().Be(crossWsId);
    }
}
