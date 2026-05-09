using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace Orqentis.Integration.Tests;

public sealed class RunEndpointsIntegrationTests
{
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    [LiveFabricFact]
    public async Task EndToEnd_HealthcareContract_PassesAllRules()
    {
        // Arrange
        var settings = IntegrationTestEnvironment.Load();
        using var client = IntegrationTestEnvironment.CreateClient(settings);

        // Act
        var startedRun = await StartRunAsync(client, settings.PassedContractId);
        var completedRun = await WaitForCompletedRunAsync(client, startedRun.RunId);

        // Assert
        completedRun.Status.Should().Be("passed");
        completedRun.ResultJson.OverallStatus.Should().Be("passed");
        completedRun.ResultJson.SchemaRules.Should().OnlyContain(static rule => rule.Status == "passed");
        completedRun.ResultJson.QualityRules.Should().OnlyContain(static rule => rule.Status == "passed");
        completedRun.ResultJson.FreshnessRule?.Status.Should().BeOneOf("passed", null);
    }

    [LiveFabricFact]
    public async Task EndToEnd_SchemaDrift_FailsCorrectRule()
    {
        // Arrange
        var settings = IntegrationTestEnvironment.Load();
        using var client = IntegrationTestEnvironment.CreateClient(settings);

        // Act
        var startedRun = await StartRunAsync(client, settings.DriftedContractId);
        var completedRun = await WaitForCompletedRunAsync(client, startedRun.RunId);

        // Assert
        completedRun.Status.Should().Be("failed");
        completedRun.ResultJson.OverallStatus.Should().Be("failed");
        completedRun.ResultJson.SchemaRules.Should().Contain(
            rule => rule.Status == "failed" && rule.RuleId.StartsWith("schema.", StringComparison.Ordinal));
    }

    private static async Task<RunAcceptedResponse> StartRunAsync(HttpClient client, string contractId)
    {
        using var response = await client.PostAsJsonAsync($"v1/contracts/{contractId}/runs", new { });
        response.StatusCode.Should().Be(HttpStatusCode.Accepted);

        var payload = await response.Content.ReadFromJsonAsync<RunAcceptedResponse>(SerializerOptions);
        payload.Should().NotBeNull();

        return payload!;
    }

    private static async Task<RunDetailResponse> WaitForCompletedRunAsync(HttpClient client, Guid runId)
    {
        for (var attempt = 0; attempt < 10; attempt++)
        {
            using var response = await client.GetAsync($"v1/runs/{runId}");
            response.EnsureSuccessStatusCode();

            var payload = await response.Content.ReadFromJsonAsync<RunDetailResponse>(SerializerOptions);
            payload.Should().NotBeNull();

            if (!string.Equals(payload!.Status, "running", StringComparison.OrdinalIgnoreCase))
            {
                return payload;
            }

            await Task.Delay(TimeSpan.FromSeconds(3));
        }

        throw new TimeoutException($"Run {runId} did not leave the running state within the polling window.");
    }

    private sealed record RunAcceptedResponse(Guid RunId, string Status);

    private sealed record RunDetailResponse(string Status, EnforcementResultResponse ResultJson);

    private sealed record EnforcementResultResponse(
        string OverallStatus,
        IReadOnlyList<RuleResultResponse> SchemaRules,
        IReadOnlyList<RuleResultResponse> QualityRules,
        RuleResultResponse? FreshnessRule);

    private sealed record RuleResultResponse(string RuleId, string Status);
}
