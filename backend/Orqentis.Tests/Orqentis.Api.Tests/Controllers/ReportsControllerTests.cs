using System.Net;
using System.Net.Http.Json;
using Orqentis.Api.Dtos;
using Orqentis.Data.Entities;
using Orqentis.Tests.Orqentis.Api.Tests.Infrastructure;

namespace Orqentis.Tests.Orqentis.Api.Tests.Controllers;

public sealed class ReportsControllerTests
{
    [Fact]
    public async Task SummaryAndAudit_EnterpriseTenant_ReturnAggregatesAndRows()
    {
        var contractId = Guid.NewGuid();
        var versionId = Guid.NewGuid();
        var runId = Guid.NewGuid();

        using var factory = new ApiWebApplicationFactory();
        await factory.SeedAsync(dbContext =>
        {
            dbContext.Contracts.Add(new Contract
            {
                ContractId = contractId,
                TenantId = TestIdentifiers.EnterpriseTenantId,
                WorkspaceId = TestIdentifiers.WorkspaceId,
                FabricItemId = TestIdentifiers.LakehouseId,
                Name = "Report Test Contract",
                Status = "active",
                CurrentVersion = "1.0.0",
                OwnerEmail = "owner@example.com",
                CreatedBy = "test.user@example.com",
                CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-10),
                UpdatedAt = DateTimeOffset.UtcNow.AddMinutes(-10),
            });

            dbContext.ContractVersions.Add(new ContractVersion
            {
                VersionId = versionId,
                ContractId = contractId,
                Version = "1.0.0",
                OdcsYaml = ContractSample.CreateYaml("1.0.0"),
                OdcsHash = "abc",
                CreatedBy = "test.user@example.com",
                CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-10),
            });

            dbContext.EnforcementRuns.Add(new EnforcementRun
            {
                RunId = runId,
                ContractId = contractId,
                VersionId = versionId,
                TriggeredBy = "manual",
                TriggeredAt = DateTimeOffset.UtcNow.AddMinutes(-5),
                CompletedAt = DateTimeOffset.UtcNow.AddMinutes(-4),
                Status = "failed",
                DeltaTableVersion = 7,
                BreachScore = 82,
                ResultJson = "{\"overallStatus\":\"failed\"}",
                CorrelationId = Guid.NewGuid().ToString("N"),
            });
        });

        using var client = factory.CreateAuthenticatedClient(TestIdentifiers.EnterpriseEntraTenantId);

        var summary = await client.GetFromJsonAsync<ReportSummaryDto>("/v1/reports/summary");
        summary.Should().NotBeNull();
        summary!.TotalRuns.Should().BeGreaterThanOrEqualTo(1);
        summary.FailedRuns.Should().BeGreaterThanOrEqualTo(1);

        var audit = await client.GetFromJsonAsync<List<AuditReportRowDto>>("/v1/reports/audit");
        audit.Should().NotBeNull();
        audit!.Should().Contain(row => row.RunId == runId && row.ContractName == "Report Test Contract");
    }

    [Fact]
    public async Task Summary_CommunityTenant_ReturnsPaymentRequired()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient();

        var response = await client.GetAsync("/v1/reports/summary");
        response.StatusCode.Should().Be(HttpStatusCode.PaymentRequired);
    }
}
