using System.Net;
using System.Net.Http.Json;
using Orqentis.Api.Dtos;
using Orqentis.Tests.Orqentis.Api.Tests.Infrastructure;

namespace Orqentis.Tests.Orqentis.Api.Tests.Controllers;

public sealed class PoliciesControllerTests
{
    [Fact]
    public async Task PolicyLifecycle_EnterpriseTenant_WorksEndToEnd()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient(TestIdentifiers.EnterpriseEntraTenantId);

        var contractResponse = await client.PostAsJsonAsync(
            "/v1/contracts",
            new CreateContractRequest
            {
                Mode = "direct",
                Name = "Policy Test Contract",
                Description = "Contract for policy tests",
                OwnerEmail = "owner@example.com",
                TargetTablePath = "abfss://clinical@onelake.dfs.fabric.microsoft.com/ClinicalLakehouse.Lakehouse/Tables/patient_encounters",
                TargetLakehouseId = TestIdentifiers.LakehouseId,
                OdcsYaml = ContractSample.CreateYaml("1.0.0"),
            });

        contractResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var contract = await contractResponse.Content.ReadFromJsonAsync<ContractDto>();
        contract.Should().NotBeNull();

        var createResponse = await client.PostAsJsonAsync(
            "/v1/policies",
            new CreatePolicyRequest
            {
                ContractId = contract!.Id,
                TriggerEvent = "enforcement.failed",
                ActionType = "notify",
                ActionConfigJson = "{\"channel\":\"email\"}",
                Enabled = true,
            });

        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createResponse.Content.ReadFromJsonAsync<PolicyDto>();
        created.Should().NotBeNull();
        created!.Enabled.Should().BeTrue();

        var list = await client.GetFromJsonAsync<List<PolicyDto>>("/v1/policies");
        list.Should().NotBeNull();
        list!.Should().ContainSingle(policy => policy.Id == created.Id);

        var updateResponse = await client.PutAsJsonAsync(
            $"/v1/policies/{created.Id}",
            new UpdatePolicyRequest
            {
                TriggerEvent = "enforcement.warned",
                ActionType = "webhook",
                ActionConfigJson = "{\"url\":\"https://example.invalid/webhook\"}",
                Enabled = false,
            });

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await updateResponse.Content.ReadFromJsonAsync<PolicyDto>();
        updated.Should().NotBeNull();
        updated!.ActionType.Should().Be("webhook");
        updated.Enabled.Should().BeFalse();

        var deleteResponse = await client.DeleteAsync($"/v1/policies/{created.Id}");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var afterDelete = await client.GetFromJsonAsync<List<PolicyDto>>("/v1/policies");
        afterDelete.Should().NotBeNull();
        afterDelete!.Should().ContainSingle(policy => policy.Id == created.Id && !policy.Enabled);
    }

    [Fact]
    public async Task List_CommunityTenant_ReturnsPaymentRequired()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient();

        var response = await client.GetAsync("/v1/policies");
        response.StatusCode.Should().Be(HttpStatusCode.PaymentRequired);
    }
}
