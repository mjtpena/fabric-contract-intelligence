using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Orqentis.AI;
using Orqentis.Api.Controllers;
using Orqentis.Api.Dtos;
using Orqentis.Api.Services;
using Orqentis.Engine.Odcs;
using Orqentis.Tests.Orqentis.Api.Tests.Infrastructure;

namespace Orqentis.Tests.Orqentis.Api.Tests.Controllers;

public sealed class AiControllerTests
{
    [Fact]
    public async Task SuggestContractAsync_EleventhRequestWithinWindow_ReturnsTooManyRequests()
    {
        // Arrange
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient(TestIdentifiers.EnterpriseEntraTenantId);
        var request = new SuggestContractRequest
        {
            TableName = "owid_co2_demo",
            AbfssUri = "abfss://showcase@onelake.dfs.fabric.microsoft.com/ShowcaseLakehouse.Lakehouse/Tables/owid_co2_demo",
        };

        // Act
        var responses = new List<HttpResponseMessage>();
        for (var i = 0; i < 11; i++)
        {
            responses.Add(await client.PostAsJsonAsync("/v1/ai/suggest-contract", request));
        }

        // Assert
        responses.Take(10).Should().OnlyContain(response => response.StatusCode == HttpStatusCode.OK);
        responses[10].StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
        responses[10].Headers.RetryAfter.Should().NotBeNull();
    }

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
    public async Task QueryAsync_UsesContractsWithLatestVersions_WithoutPerContractLookups()
    {
        // Arrange
        var contractId = Guid.Parse("11111111-1111-4111-8111-111111111111");
        var version = new ContractVersionRecord(
            Guid.Parse("22222222-2222-4222-8222-222222222222"),
            contractId,
            "1.0.0",
            "name: test",
            "hash",
            "owner@example.com",
            DateTimeOffset.UtcNow,
            "Initial");
        var store = new Mock<IContractStore>(MockBehavior.Strict);
        store.Setup(s => s.ListWithLatestVersionAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([
                new ContractRecord(
                    contractId,
                    Guid.Parse("33333333-3333-4333-8333-333333333333"),
                    Guid.Parse("44444444-4444-4444-8444-444444444444"),
                    null,
                    "lakehouse",
                    "Test Contract",
                    "active",
                    "1.0.0",
                    "owner@example.com",
                    "owner@example.com",
                    DateTimeOffset.UtcNow,
                    DateTimeOffset.UtcNow,
                    version,
                    null),
            ]);
        var queryHandler = new Mock<INaturalLanguageQueryHandler>(MockBehavior.Strict);
        queryHandler
            .Setup(handler => handler.QueryAsync("test", It.Is<IReadOnlyList<NaturalLanguageContractDocument>>(docs => docs.Count == 1), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new NaturalLanguageQueryResponse(
                "ok",
                [new NaturalLanguageQueryMatch(contractId, "Test Contract", "1.0.0", "match", 1)],
                "heuristic"));
        var controller = new AiController(
            Mock.Of<IContractSuggestionAgent>(),
            Mock.Of<IContractImprovementAgent>(),
            queryHandler.Object,
            store.Object,
            Mock.Of<IOdcsContractValidator>());

        // Act
        var actionResult = await controller.QueryAsync(new NaturalLanguageQueryRequest { Query = "test" }, CancellationToken.None);

        // Assert
        actionResult.Result.Should().BeOfType<OkObjectResult>();
        store.Verify(s => s.ListWithLatestVersionAsync(It.IsAny<CancellationToken>()), Times.Once);
        store.Verify(s => s.GetAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
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
