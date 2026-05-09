using Orqentis.Engine.Odcs;
using Orqentis.Tests.Fixtures;

using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;

namespace Orqentis.Tests.Orqentis.Engine.Tests.Odcs;

public sealed class OdcsContractValidatorTests
{
    [Fact]
    public void Validate_HealthcareContract_ReturnsNoErrors()
    {
        // Arrange
        var validator = new OdcsContractValidator(NullLogger<OdcsContractValidator>.Instance);
        var yaml = File.ReadAllText(FixturePath.FromTestProject("..", "..", "contracts", "examples", "healthcare.contract.yaml"));

        // Act
        var errors = validator.Validate(yaml);

        // Assert
        errors.Should().BeEmpty();
    }

    [Fact]
    public void Validate_MissingApiVersion_ReturnsApiVersionError()
    {
        // Arrange
        var validator = new OdcsContractValidator(NullLogger<OdcsContractValidator>.Instance);
        var yaml = File.ReadAllText(FixturePath.FromTestProject("..", "..", "contracts", "examples", "healthcare.contract.yaml"));
        var invalidYaml = string.Join(
            Environment.NewLine,
            yaml.Split(Environment.NewLine).Where(static line => !line.StartsWith("apiVersion:", StringComparison.Ordinal)));

        // Act
        var errors = validator.Validate(invalidYaml);

        // Assert
        errors.Should().Contain(static error => error.JsonPath == "$.apiVersion");
    }
}
