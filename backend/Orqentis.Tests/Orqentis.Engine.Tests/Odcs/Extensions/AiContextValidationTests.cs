using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Orqentis.Engine.Odcs;

namespace Orqentis.Tests.Orqentis.Engine.Tests.Odcs.Extensions;

public sealed class AiContextValidationTests
{
    private static string YamlWithAi(string aiBlock) => $"""
apiVersion: v3.1.0
kind: DataContract
id: contract-ai-val
name: contract_ai_val
version: 1.0.0
status: active
servers:
  - server: lake
    type: lakehouse
    location: abfss://w@onelake.dfs.fabric.microsoft.com/L.Lakehouse/Tables/t
schema:
  - name: t
    physicalType: table
    properties:
      - name: id
        logicalType: string
        physicalType: STRING
        required: true
customProperties:
  - property: orqentisAiContext
    value:
{aiBlock}
""";

    [Fact]
    public void Validate_AiContextValid_ReturnsNoAiErrors()
    {
        var validator = new OdcsContractValidator(NullLogger<OdcsContractValidator>.Instance);
        var yaml = YamlWithAi("""
      useCases:
        - id: uc-1
          tier: high-risk
      permittedUses: [training]
      prohibitedUses: [synthetic-data-generation]
      retentionForTraining:
        maxAgeDays: 90
""");

        var errors = validator.Validate(yaml);

        errors.Where(e => e.JsonPath.Contains("orqentisAiContext", StringComparison.Ordinal)).Should().BeEmpty();
    }

    [Fact]
    public void Validate_AiContextInvalidTier_ReturnsTierError()
    {
        var validator = new OdcsContractValidator(NullLogger<OdcsContractValidator>.Instance);
        var yaml = YamlWithAi("""
      useCases:
        - id: uc-1
          tier: catastrophic
""");

        var errors = validator.Validate(yaml);

        errors.Should().ContainSingle(e => e.JsonPath.EndsWith(".tier", StringComparison.Ordinal))
            .Which.Message.Should().Contain("minimal, limited, high-risk, prohibited");
    }

    [Fact]
    public void Validate_AiContextEmptyUseCaseId_ReturnsIdError()
    {
        var validator = new OdcsContractValidator(NullLogger<OdcsContractValidator>.Instance);
        var yaml = YamlWithAi("""
      useCases:
        - id: ""
          tier: minimal
""");

        var errors = validator.Validate(yaml);

        errors.Should().Contain(e => e.JsonPath.EndsWith(".id", StringComparison.Ordinal) && e.Message.Contains("non-empty"));
    }

    [Fact]
    public void Validate_AiContextPermittedAndProhibitedOverlap_ReturnsConflict()
    {
        var validator = new OdcsContractValidator(NullLogger<OdcsContractValidator>.Instance);
        var yaml = YamlWithAi("""
      useCases:
        - id: uc-1
          tier: limited
      permittedUses: [training, rag-retrieval]
      prohibitedUses: [training]
""");

        var errors = validator.Validate(yaml);

        errors.Should().Contain(e => e.Message.Contains("'training'") && e.Message.Contains("permittedUses"));
    }

    [Fact]
    public void Validate_AiContextNegativeRetention_ReturnsRetentionError()
    {
        var validator = new OdcsContractValidator(NullLogger<OdcsContractValidator>.Instance);
        var yaml = YamlWithAi("""
      useCases:
        - id: uc-1
          tier: minimal
      retentionForTraining:
        maxAgeDays: 0
""");

        var errors = validator.Validate(yaml);

        errors.Should().ContainSingle(e => e.JsonPath.EndsWith(".maxAgeDays", StringComparison.Ordinal))
            .Which.Message.Should().Contain("positive integer");
    }

    [Fact]
    public void Validate_LegalContractExtractsSample_ReturnsNoErrors()
    {
        var validator = new OdcsContractValidator(NullLogger<OdcsContractValidator>.Instance);
        var yaml = File.ReadAllText(Fixtures.FixturePath.FromTestProject(
            "..", "..", "contracts", "examples", "legal-contract-extracts.contract.yaml"));

        var errors = validator.Validate(yaml);

        errors.Should().BeEmpty(string.Join(Environment.NewLine, errors.Select(e => $"{e.JsonPath}: {e.Message}")));
    }
}
