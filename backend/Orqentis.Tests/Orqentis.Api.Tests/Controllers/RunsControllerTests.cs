using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Orqentis.AI;
using Orqentis.Api.Auth;
using Orqentis.Api.Dtos;
using Orqentis.Api.Services;
using Orqentis.Data;
using Orqentis.Engine;
using Orqentis.Engine.Models;
using Orqentis.Tests.Orqentis.Api.Tests.Infrastructure;

namespace Orqentis.Tests.Orqentis.Api.Tests.Controllers;

public sealed class RunsControllerTests
{
    [Fact]
    public async Task CreateRunAsync_UsesInboundBearerToken_PersistsRunAndReturnsAccepted()
    {
        var tokenBroker = new CapturingTokenBroker();
        var orchestrator = new StubEnforcementOrchestrator();
        var scorer = new StubBreachImpactScorer();
        var advisor = new StubRemediationAdvisor();
        var dispatcher = new StubBreachAlertDispatcher();

        using var factory = new ApiWebApplicationFactory(
            configureServices: services =>
            {
                services.RemoveAll<IOneLakeTokenBroker>();
                services.RemoveAll<IEnforcementOrchestrator>();
                services.RemoveAll<IBreachImpactScorer>();
                services.RemoveAll<IRemediationAdvisor>();
                services.RemoveAll<IBreachAlertDispatcher>();
                services.AddSingleton<IOneLakeTokenBroker>(tokenBroker);
                services.AddSingleton<IEnforcementOrchestrator>(orchestrator);
                services.AddSingleton<IBreachImpactScorer>(scorer);
                services.AddSingleton<IRemediationAdvisor>(advisor);
                services.AddSingleton<IBreachAlertDispatcher>(dispatcher);
            });

        using var client = factory.CreateAuthenticatedClient();

        var createResponse = await client.PostAsJsonAsync(
            "/v1/contracts",
            new CreateContractRequest
            {
                Mode = "direct",
                Name = "Patient Encounters Contract",
                Description = "Run integration test contract",
                OwnerEmail = "owner@example.com",
                TargetTablePath = "abfss://clinical@onelake.dfs.fabric.microsoft.com/ClinicalLakehouse.Lakehouse/Tables/patient_encounters",
                TargetLakehouseId = TestIdentifiers.LakehouseId,
                OdcsYaml = ContractSample.CreateYaml("1.0.0"),
            });

        var created = await createResponse.Content.ReadFromJsonAsync<ContractDto>();
        created.Should().NotBeNull();

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "inbound-user-token");

        var runResponse = await client.PostAsync($"/v1/contracts/{created!.Id}/runs", content: null);

        runResponse.StatusCode.Should().Be(HttpStatusCode.Accepted);
        var accepted = await runResponse.Content.ReadFromJsonAsync<RunAcceptedDto>();
        accepted.Should().NotBeNull();
        tokenBroker.LastUserAssertion.Should().Be("inbound-user-token");
        orchestrator.CallCount.Should().Be(1);
        orchestrator.LastToken.Should().Be("obo-token");

        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<OrqentisDbContext>();
        dbContext.EnforcementRuns.Should().ContainSingle();
        dbContext.EnforcementRuns.Single().ResultJson.Should().Contain("\"overallStatus\":\"passed\"");
        dbContext.EnforcementRuns.Single().BreachScore.Should().Be(67);
        dbContext.EnforcementRuns.Single().ResultJson.Should().Contain("encounter_id");

        var listRuns = await client.GetFromJsonAsync<List<RunSummaryDto>>($"/v1/contracts/{created.Id}/runs");
        listRuns.Should().NotBeNull();
        listRuns!.Should().ContainSingle(run => run.Id == accepted!.RunId);

        var detailResponse = await client.GetAsync($"/v1/runs/{accepted!.RunId}");
        detailResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var detail = await detailResponse.Content.ReadFromJsonAsync<RunDetailDto>();
        detail.Should().NotBeNull();
        detail!.ResultJson.GetProperty("overallStatus").GetString().Should().Be("passed");
        detail.CorrelationId.Should().NotBeNullOrWhiteSpace();
        detailResponse.Headers.Contains("X-Correlation-Id").Should().BeTrue();
    }

    [Theory]
    [InlineData("warehouse", "dbo.sales", 0, 1, 1, 0, "fabric-sql-token")]
    [InlineData("fabric_sql", "dbo.sales", 0, 1, 1, 0, "fabric-sql-token")]
    [InlineData("eventhouse", "SalesEvents", 0, 1, 0, 1, "kusto-token")]
    [InlineData("semantic_model", "SalesModel", 0, 1, 0, 0, "fabric-rest-token")]
    public async Task CreateRunAsync_FabricTarget_UsesTargetSpecificDelegatedCredentials(
        string targetType,
        string targetPath,
        int expectedOneLakeCalls,
        int expectedFabricRestCalls,
        int expectedFabricSqlCalls,
        int expectedKustoCalls,
        string expectedLastToken)
    {
        var tokenBroker = new CapturingTokenBroker();
        var orchestrator = new StubEnforcementOrchestrator
        {
            Result = new EnforcementResult
            {
                ContractId = Guid.Parse("55555555-5555-5555-5555-555555555555"),
                RunId = Guid.Parse("66666666-6666-6666-6666-666666666666"),
                DeltaTableVersion = -1,
                OverallStatus = EnforcementStatus.Passed,
                SchemaRules = [],
                QualityRules = [],
                FreshnessRule = null,
                SchemaDiff = null,
                BreachScore = null,
                RemediationSuggestions = [],
                CompletedAt = DateTimeOffset.Parse("2026-05-09T00:00:00Z"),
            },
        };
        var scorer = new StubBreachImpactScorer { Result = null };
        var advisor = new StubRemediationAdvisor { Suggestions = [] };
        var dispatcher = new StubBreachAlertDispatcher();

        using var factory = new ApiWebApplicationFactory(
            configureServices: services =>
            {
                services.RemoveAll<IOneLakeTokenBroker>();
                services.RemoveAll<IEnforcementOrchestrator>();
                services.RemoveAll<IBreachImpactScorer>();
                services.RemoveAll<IRemediationAdvisor>();
                services.RemoveAll<IBreachAlertDispatcher>();
                services.AddSingleton<IOneLakeTokenBroker>(tokenBroker);
                services.AddSingleton<IEnforcementOrchestrator>(orchestrator);
                services.AddSingleton<IBreachImpactScorer>(scorer);
                services.AddSingleton<IRemediationAdvisor>(advisor);
                services.AddSingleton<IBreachAlertDispatcher>(dispatcher);
            });

        using var client = factory.CreateAuthenticatedClient();
        var targetItemId = Guid.Parse("33333333-3333-4333-8333-333333333333");

        var createResponse = await client.PostAsJsonAsync(
            "/v1/contracts",
            new CreateContractRequest
            {
                Mode = "direct",
                Name = "Fabric Target Contract",
                Description = "Run target-specific contract",
                OwnerEmail = "owner@example.com",
                TargetType = targetType,
                TargetItemId = targetItemId,
                TargetTablePath = targetPath,
                OdcsYaml = ContractSample.CreateYaml("1.0.0", "Fabric Target Contract"),
            });

        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createResponse.Content.ReadFromJsonAsync<ContractDto>();
        created.Should().NotBeNull();

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "inbound-user-token");
        var runResponse = await client.PostAsync($"/v1/contracts/{created!.Id}/runs", content: null);

        runResponse.StatusCode.Should().Be(HttpStatusCode.Accepted);
        tokenBroker.OneLakeCallCount.Should().Be(expectedOneLakeCalls);
        tokenBroker.FabricRestCallCount.Should().Be(expectedFabricRestCalls);
        tokenBroker.FabricSqlCallCount.Should().Be(expectedFabricSqlCalls);
        tokenBroker.KustoCallCount.Should().Be(expectedKustoCalls);
        orchestrator.LastToken.Should().Be(expectedLastToken);

        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<OrqentisDbContext>();
        dbContext.EnforcementRuns.Should().ContainSingle();
        dbContext.EnforcementRuns.Single().ResultJson.Should().Contain("\"overallStatus\":\"passed\"");
    }
}
