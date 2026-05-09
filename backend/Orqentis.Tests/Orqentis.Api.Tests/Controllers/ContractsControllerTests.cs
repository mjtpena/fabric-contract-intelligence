using System.Net;
using System.Net.Http.Json;
using Orqentis.Api.Dtos;
using Orqentis.Tests.Orqentis.Api.Tests.Infrastructure;

namespace Orqentis.Tests.Orqentis.Api.Tests.Controllers;

public sealed class ContractsControllerTests
{
    [Fact]
    public async Task ContractLifecycle_CreateUpdateVersionDelete_WorksEndToEnd()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient();

        var createResponse = await client.PostAsJsonAsync(
            "/v1/contracts",
            new CreateContractRequest
            {
                Mode = "direct",
                Name = "Patient Encounters Contract",
                Description = "Integration test contract",
                OwnerEmail = "owner@example.com",
                TargetTablePath = "abfss://clinical@onelake.dfs.fabric.microsoft.com/ClinicalLakehouse.Lakehouse/Tables/patient_encounters",
                TargetLakehouseId = TestIdentifiers.LakehouseId,
                OdcsYaml = ContractSample.CreateYaml("1.0.0"),
            });

        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        createResponse.Headers.Contains("X-Correlation-Id").Should().BeTrue();

        var created = await createResponse.Content.ReadFromJsonAsync<ContractDto>();
        created.Should().NotBeNull();
        created!.Version.Should().Be("1.0.0");
        created.TargetLakehouseId.Should().Be(TestIdentifiers.LakehouseId);

        var list = await client.GetFromJsonAsync<List<ContractSummaryDto>>("/v1/contracts");
        list.Should().NotBeNull();
        list!.Should().ContainSingle(item => item.Id == created.Id);

        var detail = await client.GetFromJsonAsync<ContractDto>($"/v1/contracts/{created.Id}");
        detail.Should().NotBeNull();
        detail!.Name.Should().Be("Patient Encounters Contract");
        detail.TargetTablePath.Should().Contain("patient_encounters");

        var updateResponse = await client.PutAsJsonAsync(
            $"/v1/contracts/{created.Id}",
            new UpdateContractRequest
            {
                Name = "Patient Encounters Contract",
                Description = "Updated integration test contract",
                OwnerEmail = "owner@example.com",
                TargetTablePath = "abfss://clinical@onelake.dfs.fabric.microsoft.com/ClinicalLakehouse.Lakehouse/Tables/patient_encounters",
                TargetLakehouseId = TestIdentifiers.LakehouseId,
                OdcsYaml = ContractSample.CreateYaml("1.0.1"),
                CommitMessage = "Version bump",
            });

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var updated = await updateResponse.Content.ReadFromJsonAsync<ContractDto>();
        updated.Should().NotBeNull();
        updated!.Version.Should().Be("1.0.1");

        var versions = await client.GetFromJsonAsync<List<ContractVersionDto>>($"/v1/contracts/{created.Id}/versions");
        versions.Should().NotBeNull();
        versions!.Should().HaveCount(2);
        versions!.Select(version => version.Version).Should().Contain(new[] { "1.0.0", "1.0.1" });

        var versionDetail = await client.GetFromJsonAsync<ContractVersionDto>($"/v1/contracts/{created.Id}/versions/1.0.1");
        versionDetail.Should().NotBeNull();
        versionDetail!.CommitMessage.Should().Be("Version bump");

        var deleteResponse = await client.DeleteAsync($"/v1/contracts/{created.Id}");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var missingResponse = await client.GetAsync($"/v1/contracts/{created.Id}");
        missingResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
        missingResponse.Headers.Contains("X-Correlation-Id").Should().BeTrue();
    }
}
