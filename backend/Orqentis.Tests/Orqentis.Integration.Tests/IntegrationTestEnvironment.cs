using System.Net.Http.Headers;

namespace Orqentis.Integration.Tests;

internal sealed record IntegrationTestSettings(
    string ApiBaseUrl,
    string BearerToken,
    string WorkspaceId,
    string PassedContractId,
    string DriftedContractId);

internal static class IntegrationTestEnvironment
{
    public static readonly string[] RequiredVariables =
    [
        "FABRIC_TEST_TENANT_ID",
        "FABRIC_TEST_WORKSPACE_ID",
        "FABRIC_TEST_CAPACITY_ID",
        "FABRIC_TEST_API_BASE_URL",
        "FABRIC_TEST_BEARER_TOKEN",
        "FABRIC_TEST_PASSED_CONTRACT_ID",
        "FABRIC_TEST_DRIFTED_CONTRACT_ID"
    ];

    public static IntegrationTestSettings Load() =>
        new(
            Require("FABRIC_TEST_API_BASE_URL"),
            Require("FABRIC_TEST_BEARER_TOKEN"),
            Require("FABRIC_TEST_WORKSPACE_ID"),
            Require("FABRIC_TEST_PASSED_CONTRACT_ID"),
            Require("FABRIC_TEST_DRIFTED_CONTRACT_ID"));

    public static HttpClient CreateClient(IntegrationTestSettings settings)
    {
        var httpClient = new HttpClient
        {
            BaseAddress = new Uri(settings.ApiBaseUrl.TrimEnd('/') + "/")
        };

        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", settings.BearerToken);
        httpClient.DefaultRequestHeaders.Add("X-Workspace-Id", settings.WorkspaceId);

        return httpClient;
    }

    private static string Require(string variableName) =>
        Environment.GetEnvironmentVariable(variableName)
        ?? throw new InvalidOperationException($"Missing required environment variable '{variableName}'.");
}
