using Orqentis.Api.Services;

namespace Orqentis.Tests.Orqentis.Api.Tests.Services;

public sealed class ContractTargetTypesTests
{
    [Theory]
    [InlineData("lakehouse", "lakehouse")]
    [InlineData("warehouse", "warehouse")]
    [InlineData("eventhouse", "eventhouse")]
    [InlineData("semantic-model", "semantic_model")]
    [InlineData("fabric-sql", "fabric_sql")]
    [InlineData(null, "lakehouse")]
    public void Normalize_ReturnsCanonicalTargetType(string? input, string expected)
    {
        ContractTargetTypes.Normalize(input).Should().Be(expected);
    }

    [Theory]
    [InlineData("lakehouse", "delta")]
    [InlineData("warehouse", "sql")]
    [InlineData("fabric_sql", "sql")]
    [InlineData("eventhouse", "kql")]
    [InlineData("semantic_model", "semantic_model")]
    public void ToServerFormat_MapsTargetTypeToOdcsServerFormat(string targetType, string expectedFormat)
    {
        ContractTargetTypes.ToServerFormat(targetType).Should().Be(expectedFormat);
    }

    [Fact]
    public void Normalize_ReturnsNullForUnsupportedTargetType()
    {
        ContractTargetTypes.Normalize("notebook").Should().BeNull();
    }
}
