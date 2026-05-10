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
}
