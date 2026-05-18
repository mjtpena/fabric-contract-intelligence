using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Orqentis.Engine.Odcs;
using Orqentis.Engine.Odcs.Extensions;

namespace Orqentis.Tests.Orqentis.Engine.Tests.Odcs.Extensions;

public sealed class AiContextExtensionTests
{
    private const string _yamlWithAiContext = """
apiVersion: v3.1.0
kind: DataContract
id: contract-ai-001
name: contract_ai_test
version: 1.0.0
status: active
servers:
  - server: lakehouse
    type: lakehouse
    location: abfss://workspace@onelake.dfs.fabric.microsoft.com/lake.Lakehouse/Tables/orders
    format: delta
schema:
  - name: orders
    physicalType: table
    properties:
      - name: order_id
        logicalType: string
        physicalType: string
        required: true
customProperties:
  - property: orqentisInfo
    value:
      title: Orders Contract
      description: Test contract
      owner: data-eng@example.com
  - property: orqentisAiContext
    value:
      useCases:
        - id: usecase-liability-summarizer
          tier: high-risk
          jurisdictions:
            - EU
            - AU
          regulations:
            - eu-ai-act-art-10
            - nist-ai-rmf-govern
      permittedUses:
        - training
        - rag-retrieval
      prohibitedUses:
        - synthetic-data-generation
      permittedAgents:
        - fabric-copilot
      retentionForTraining:
        maxAgeDays: 365
""";

    [Fact]
    public void Parse_ContractWithAiContext_PopulatesAllFields()
    {
        var parser = new OdcsContractParser(NullLogger<OdcsContractParser>.Instance);

        var parsed = parser.Parse(_yamlWithAiContext);

        parsed.IsSuccess.Should().BeTrue(parsed.Error);
        var ai = parsed.Value!.AiContext;
        ai.Should().NotBeNull();
        ai!.UseCases.Should().HaveCount(1);
        ai.UseCases[0].Id.Should().Be("usecase-liability-summarizer");
        ai.UseCases[0].Tier.Should().Be("high-risk");
        ai.UseCases[0].Jurisdictions.Should().BeEquivalentTo("EU", "AU");
        ai.UseCases[0].Regulations.Should().BeEquivalentTo("eu-ai-act-art-10", "nist-ai-rmf-govern");
        ai.PermittedUses.Should().BeEquivalentTo("training", "rag-retrieval");
        ai.ProhibitedUses.Should().BeEquivalentTo("synthetic-data-generation");
        ai.PermittedAgents.Should().BeEquivalentTo("fabric-copilot");
        ai.RetentionForTraining!.MaxAgeDays.Should().Be(365);
    }

    [Fact]
    public void Parse_ContractWithoutAiContext_LeavesAiContextNull()
    {
        var parser = new OdcsContractParser(NullLogger<OdcsContractParser>.Instance);
        var yaml = _yamlWithAiContext.Replace("""
  - property: orqentisAiContext
    value:
      useCases:
        - id: usecase-liability-summarizer
          tier: high-risk
          jurisdictions:
            - EU
            - AU
          regulations:
            - eu-ai-act-art-10
            - nist-ai-rmf-govern
      permittedUses:
        - training
        - rag-retrieval
      prohibitedUses:
        - synthetic-data-generation
      permittedAgents:
        - fabric-copilot
      retentionForTraining:
        maxAgeDays: 365
""", string.Empty, StringComparison.Ordinal);

        var parsed = parser.Parse(yaml);

        parsed.IsSuccess.Should().BeTrue(parsed.Error);
        parsed.Value!.AiContext.Should().BeNull();
    }

    [Fact]
    public void RoundTrip_PreservesAiContext()
    {
        var parser = new OdcsContractParser(NullLogger<OdcsContractParser>.Instance);
        var serializer = new OdcsContractSerializer();

        var parsed = parser.Parse(_yamlWithAiContext);
        parsed.IsSuccess.Should().BeTrue(parsed.Error);

        var roundTrip = parser.Parse(serializer.Serialize(parsed.Value!));

        roundTrip.IsSuccess.Should().BeTrue(roundTrip.Error);
        roundTrip.Value!.AiContext.Should().BeEquivalentTo(parsed.Value!.AiContext);
    }

    [Fact]
    public void Parse_AiContextWithEmptyUseCaseId_DropsEntry()
    {
        var parser = new OdcsContractParser(NullLogger<OdcsContractParser>.Instance);
        var yaml = """
apiVersion: v3.1.0
kind: DataContract
id: contract-ai-002
name: contract_ai_test_2
version: 1.0.0
status: active
servers:
  - server: lakehouse
    type: lakehouse
    location: abfss://w@onelake.dfs.fabric.microsoft.com/lake.Lakehouse/Tables/x
schema:
  - name: x
    physicalType: table
    properties:
      - name: id
        logicalType: string
        required: true
customProperties:
  - property: orqentisAiContext
    value:
      useCases:
        - id: ""
          tier: high-risk
        - id: valid-use-case
""";

        var parsed = parser.Parse(yaml);

        parsed.IsSuccess.Should().BeTrue(parsed.Error);
        parsed.Value!.AiContext!.UseCases.Should().ContainSingle()
            .Which.Id.Should().Be("valid-use-case");
    }
}
