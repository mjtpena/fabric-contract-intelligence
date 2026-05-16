using System.Net;
using System.Net.Http.Json;
using Orqentis.Api.Dtos;
using Orqentis.Tests.Orqentis.Api.Tests.Infrastructure;

namespace Orqentis.Tests.Orqentis.Api.Tests.Controllers;

public sealed class ContractsControllerTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public async Task ListAsync_MissingOrEmptyWorkspaceContext_ReturnsBadRequest(string? workspaceId)
    {
        // Arrange
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateClient();
        if (workspaceId is not null)
        {
            client.DefaultRequestHeaders.TryAddWithoutValidation("X-Workspace-Id", workspaceId);
        }

        // Act
        var response = await client.GetAsync("/v1/contracts");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateAsync_WarehouseTarget_PersistsGenericFabricTarget()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient();
        var warehouseId = Guid.Parse("33333333-3333-4333-8333-333333333333");

        var createResponse = await client.PostAsJsonAsync(
            "/v1/contracts",
            new CreateContractRequest
            {
                Mode = "direct",
                Name = "Warehouse Sales Contract",
                Description = "Warehouse contract",
                OwnerEmail = "owner@example.com",
                TargetType = "warehouse",
                TargetItemId = warehouseId,
                TargetTablePath = "fabric://workspace/warehouse/dbo.sales",
                OdcsYaml = ContractSample.CreateYaml("1.0.0", "Warehouse Sales Contract"),
            });

        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createResponse.Content.ReadFromJsonAsync<ContractDto>();
        created.Should().NotBeNull();
        created!.TargetType.Should().Be("warehouse");
        created.TargetItemId.Should().Be(warehouseId);
        created.TargetLakehouseId.Should().BeNull();
        created.TargetTablePath.Should().Be("fabric://workspace/warehouse/dbo.sales");
        created.OdcsYaml.Should().Contain("format: sql");
    }

    [Fact]
    public async Task CreateAsync_AiGenerateMode_CreatesContractForEnterpriseTenant()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient(TestIdentifiers.EnterpriseEntraTenantId);

        var createResponse = await client.PostAsJsonAsync(
            "/v1/contracts",
            new CreateContractRequest
            {
                Mode = "ai_generate",
                Name = "AI Generated Contract",
                Description = "AI generated contract",
                OwnerEmail = "owner@example.com",
                TargetTablePath = "abfss://showcase@onelake.dfs.fabric.microsoft.com/ShowcaseLakehouse.Lakehouse/Tables/owid_co2_demo",
                TargetLakehouseId = TestIdentifiers.LakehouseId,
            });

        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createResponse.Content.ReadFromJsonAsync<ContractDto>();
        created.Should().NotBeNull();
        created!.AiSuggested.Should().BeTrue();
    }

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
