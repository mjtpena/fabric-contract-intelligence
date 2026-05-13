using Microsoft.Extensions.Logging.Abstractions;
using Orqentis.Engine.Evaluation;
using Orqentis.Engine.Models;
using Orqentis.Engine.Odcs;

namespace Orqentis.Tests.Orqentis.Engine.Tests.Evaluation;

public sealed class QualityRuleEvaluatorTests
{
    [Fact]
    public async Task EvaluateAsync_NullRateAboveThreshold_Fails()
    {
        var evaluator = CreateEvaluator(new StubFabricSqlClient(0.05));
        var result = await evaluator.EvaluateAsync(
            [
                new QualityRule
                {
                    Type = "null_rate",
                    Column = "customer_id",
                    Threshold = 0.01,
                    Severity = "error",
                },
            ],
            CreateServer(),
            "token");

        result.Should().ContainSingle();
        result[0].Status.Should().Be(RuleStatus.Failed);
    }

    [Fact]
    public async Task EvaluateAsync_UniquenessBelowThreshold_Fails()
    {
        var evaluator = CreateEvaluator(new StubFabricSqlClient(0.999));
        var result = await evaluator.EvaluateAsync(
            [
                new QualityRule
                {
                    Type = "uniqueness",
                    Column = "id",
                    Threshold = 1.0,
                    Severity = "error",
                },
            ],
            CreateServer(),
            "token");

        result[0].Status.Should().Be(RuleStatus.Failed);
    }

    [Fact]
    public async Task EvaluateAsync_RegexPassRateMeetsThreshold_Passes()
    {
        var evaluator = CreateEvaluator(new StubFabricSqlClient(0.96));
        var result = await evaluator.EvaluateAsync(
            [
                new QualityRule
                {
                    Type = "regex",
                    Column = "postal_code",
                    Pattern = "____",
                    Threshold = 0.95,
                    Severity = "warn",
                },
            ],
            CreateServer(),
            "token");

        result[0].Status.Should().Be(RuleStatus.Passed);
    }

    [Fact]
    public async Task EvaluateAsync_CustomSqlZeroRows_Passes()
    {
        var evaluator = CreateEvaluator(new StubFabricSqlClient(0));
        var result = await evaluator.EvaluateAsync(
            [
                new QualityRule
                {
                    Type = "custom_sql",
                    Sql = "SELECT COUNT(*) FROM [dbo].[orders] WHERE amount < 0",
                    Severity = "error",
                },
            ],
            CreateServer(),
            "token");

        result[0].Status.Should().Be(RuleStatus.Passed);
    }

    [Fact]
    public async Task EvaluateAsync_CustomSqlWithPlaceholder_Fails()
    {
        var evaluator = CreateEvaluator(new StubFabricSqlClient(0));
        var result = await evaluator.EvaluateAsync(
            [
                new QualityRule
                {
                    Type = "custom_sql",
                    Sql = "SELECT COUNT(*) FROM [dbo].[orders] WHERE amount > ${threshold}",
                    Severity = "error",
                },
            ],
            CreateServer(),
            "token");

        result[0].Status.Should().Be(RuleStatus.Failed);
        result[0].Message.Should().Contain("placeholders");
    }

    [Fact]
    public async Task EvaluateAsync_SqlTargetPath_UsesSchemaAndTableName()
    {
        var sqlClient = new CapturingFabricSqlClient(0);
        var evaluator = CreateEvaluator(sqlClient);

        await evaluator.EvaluateAsync(
            [
                new QualityRule
                {
                    Type = "null_rate",
                    Column = "customer_id",
                    Threshold = 0.01,
                    Severity = "error",
                },
            ],
            CreateServer() with { Path = "sales.customer_orders" },
            "token");

        sqlClient.LastSql.Should().Contain("[sales].[customer_orders]");
    }

    private static QualityRuleEvaluator CreateEvaluator(IFabricSqlClient sqlClient) =>
        new(sqlClient, NullLogger<QualityRuleEvaluator>.Instance);

    private static ContractServer CreateServer() =>
        new()
        {
            Name = "fabric-sql",
            Type = "delta",
            Host = "https://example.sql.fabric.microsoft.com",
            Path = "abfss://workspace@onelake.dfs.fabric.microsoft.com/Lakehouse.Lakehouse/Tables/dbo/orders",
        };

    private sealed class StubFabricSqlClient : IFabricSqlClient
    {
        private readonly double? _value;

        public StubFabricSqlClient(double? value)
        {
            _value = value;
        }

        public Task<double?> ExecuteScalarAsync(ContractServer server, string sql, string fabricSqlOboToken, CancellationToken ct = default) =>
            Task.FromResult(_value);
    }

    private sealed class CapturingFabricSqlClient(double? value) : IFabricSqlClient
    {
        public string? LastSql { get; private set; }

        public Task<double?> ExecuteScalarAsync(ContractServer server, string sql, string fabricSqlOboToken, CancellationToken ct = default)
        {
            LastSql = sql;
            return Task.FromResult(value);
        }
    }
}
