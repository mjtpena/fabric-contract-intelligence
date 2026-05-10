using System.Net;
using System.Net.Http.Json;
using Orqentis.Api.Dtos;
using Orqentis.Tests.Orqentis.Api.Tests.Infrastructure;

namespace Orqentis.Tests.Orqentis.Api.Tests.Controllers;

public sealed class AiControllerTests
{
    [Fact]
    public async Task SuggestContractAsync_ReturnsGeneratedYaml_ForEnterpriseTenant()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient(TestIdentifiers.EnterpriseEntraTenantId);

        var response = await client.PostAsJsonAsync(
            "/v1/ai/suggest-contract",
            new SuggestContractRequest
            {
                TableName = "owid_co2_demo",
                AbfssUri = "abfss://showcase@onelake.dfs.fabric.microsoft.com/ShowcaseLakehouse.Lakehouse/Tables/owid_co2_demo",
                Columns =
                [
                    new SuggestContractColumnDto
                    {
                        Name = "country",
                        Type = "string",
                        Nullable = false,
                    },
                ],
            });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<SuggestContractResponse>();
        payload.Should().NotBeNull();
        payload!.OdcsYaml.Should().Contain("apiVersion: v3.1.0");
    }

    [Fact]
    public async Task QueryAsync_ReturnsRelevantContracts_ForEnterpriseTenant()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient(TestIdentifiers.EnterpriseEntraTenantId);

        var createResponse = await client.PostAsJsonAsync(
            "/v1/contracts",
            new CreateContractRequest
            {
                Mode = "direct",
                Name = "OWID CO2 Contract",
                Description = "Tracks annual country emissions",
                OwnerEmail = "owner@example.com",
                TargetTablePath = "abfss://showcase@onelake.dfs.fabric.microsoft.com/ShowcaseLakehouse.Lakehouse/Tables/owid_co2_demo",
                TargetLakehouseId = TestIdentifiers.LakehouseId,
                OdcsYaml = ContractSample.CreateYaml("1.0.0", "OWID CO2 Contract"),
            });
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var queryResponse = await client.PostAsJsonAsync(
            "/v1/ai/query",
            new NaturalLanguageQueryRequest { Query = "co2 emissions by country" });

        queryResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await queryResponse.Content.ReadFromJsonAsync<NaturalLanguageQueryResponseDto>();
        payload.Should().NotBeNull();
        payload!.Matches.Should().ContainSingle();
    }

    [Fact]
    public async Task SuggestContractAsync_ReturnsPaymentRequired_ForCommunityTenant()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient(TestIdentifiers.CommunityEntraTenantId);

        var response = await client.PostAsJsonAsync(
            "/v1/ai/suggest-contract",
            new SuggestContractRequest
            {
                TableName = "owid_co2_demo",
                AbfssUri = "abfss://showcase@onelake.dfs.fabric.microsoft.com/ShowcaseLakehouse.Lakehouse/Tables/owid_co2_demo",
            });

        response.StatusCode.Should().Be(HttpStatusCode.PaymentRequired);
    }
}
