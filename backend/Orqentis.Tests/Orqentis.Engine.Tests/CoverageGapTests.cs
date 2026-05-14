using System.Net;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Orqentis.Engine.Evaluation;
using Orqentis.Engine.Models;
using Orqentis.Engine.Odcs;
using Xunit;

// ReSharper disable StringLiteralTypo

namespace Orqentis.Tests.Orqentis.Engine.Tests;

/// <summary>
/// Targeted tests that close coverage gaps identified in CI for Orqentis.Engine to stay above 85%.
/// Grouped by class under test.
/// </summary>
public sealed class CoverageGapTests
{
    // ─── EnforcementStatusJsonConverter ──────────────────────────────────────

    [Theory]
    [InlineData("passed", EnforcementStatus.Passed)]
    [InlineData("warned", EnforcementStatus.Warned)]
    [InlineData("failed", EnforcementStatus.Failed)]
    [InlineData("error", EnforcementStatus.Error)]
    public void EnforcementStatus_Deserialize_AllValues(string json, EnforcementStatus expected)
    {
        var result = JsonSerializer.Deserialize<EnforcementStatus>($"\"{json}\"");
        result.Should().Be(expected);
    }

    [Theory]
    [InlineData(EnforcementStatus.Passed, "passed")]
    [InlineData(EnforcementStatus.Warned, "warned")]
    [InlineData(EnforcementStatus.Failed, "failed")]
    [InlineData(EnforcementStatus.Error, "error")]
    public void EnforcementStatus_Serialize_AllValues(EnforcementStatus value, string expected)
    {
        JsonSerializer.Serialize(value).Should().Be($"\"{expected}\"");
    }

    [Fact]
    public void EnforcementStatus_Deserialize_UnknownValue_Throws()
    {
        var act = () => JsonSerializer.Deserialize<EnforcementStatus>("\"unknown\"");
        act.Should().Throw<JsonException>();
    }

    [Fact]
    public void EnforcementStatus_Serialize_InvalidValue_Throws()
    {
        var act = () => JsonSerializer.Serialize((EnforcementStatus)999);
        act.Should().Throw<JsonException>();
    }

    // ─── RuleStatusJsonConverter ──────────────────────────────────────────────

    [Theory]
    [InlineData("passed", RuleStatus.Passed)]
    [InlineData("warned", RuleStatus.Warned)]
    [InlineData("failed", RuleStatus.Failed)]
    [InlineData("skipped", RuleStatus.Skipped)]
    public void RuleStatus_Deserialize_AllValues(string json, RuleStatus expected)
    {
        JsonSerializer.Deserialize<RuleStatus>($"\"{json}\"").Should().Be(expected);
    }

    [Theory]
    [InlineData(RuleStatus.Passed, "passed")]
    [InlineData(RuleStatus.Warned, "warned")]
    [InlineData(RuleStatus.Failed, "failed")]
    [InlineData(RuleStatus.Skipped, "skipped")]
    public void RuleStatus_Serialize_AllValues(RuleStatus value, string expected)
    {
        JsonSerializer.Serialize(value).Should().Be($"\"{expected}\"");
    }

    [Fact]
    public void RuleStatus_Deserialize_UnknownValue_Throws()
    {
        var act = () => JsonSerializer.Deserialize<RuleStatus>("\"bogus\"");
        act.Should().Throw<JsonException>();
    }

    [Fact]
    public void RuleStatus_Serialize_InvalidValue_Throws()
    {
        var act = () => JsonSerializer.Serialize((RuleStatus)999);
        act.Should().Throw<JsonException>();
    }

    // ─── OdcsContractParser error path ──────────────────────────────────────

    [Fact]
    public void OdcsContractParser_Parse_InvalidYaml_ReturnsFailure()
    {
        var parser = new OdcsContractParser(NullLogger<OdcsContractParser>.Instance);
        var result = parser.Parse("{ not: valid: yaml: [[[");
        result.IsSuccess.Should().BeFalse();
        result.ErrorCode.Should().Be("OdcsParseFailed");
    }

    // ─── OdcsContractValidator exception path ────────────────────────────────

    [Fact]
    public void OdcsContractValidator_Validate_InvalidYaml_ReturnsDollarPathError()
    {
        var validator = new OdcsContractValidator(NullLogger<OdcsContractValidator>.Instance);
        // Deliberately malformed so the conversion throws.
        var errors = validator.Validate("{ not: valid: yaml: [[[");
        errors.Should().ContainSingle(e => e.JsonPath == "$");
    }

    // ─── QualityRuleEvaluator ─────────────────────────────────────────────────

    [Fact]
    public async Task QualityRuleEvaluator_ExecuteScalarThrows_RecordsFailedResult()
    {
        var evaluator = new QualityRuleEvaluator(
            new ThrowingFabricSqlClient(),
            NullLogger<QualityRuleEvaluator>.Instance);

        var results = await evaluator.EvaluateAsync(
            [new QualityRule { Type = "null_rate", Column = "id", Threshold = 0.01, Severity = "error" }],
            MakeSqlServer(),
            "token");

        results.Should().ContainSingle(r => r.Status == RuleStatus.Failed);
        results[0].Message.Should().Contain("execution failed");
    }

    [Fact]
    public async Task QualityRuleEvaluator_WarnSeverity_ProducesWarnedStatus()
    {
        var evaluator = new QualityRuleEvaluator(
            new ThrowingFabricSqlClient(),
            NullLogger<QualityRuleEvaluator>.Instance);

        var results = await evaluator.EvaluateAsync(
            [new QualityRule { Type = "null_rate", Column = "id", Threshold = 0.01, Severity = "warn" }],
            MakeSqlServer(),
            "token");

        results.Should().ContainSingle(r => r.Status == RuleStatus.Warned);
    }

    [Fact]
    public async Task QualityRuleEvaluator_NullActualResult_SkipsRule()
    {
        var evaluator = new QualityRuleEvaluator(
            new StubSqlClient(null),
            NullLogger<QualityRuleEvaluator>.Instance);

        var results = await evaluator.EvaluateAsync(
            [new QualityRule { Type = "null_rate", Column = "id", Threshold = 0.01, Severity = "error" }],
            MakeSqlServer(),
            "token");

        results.Should().ContainSingle(r => r.Status == RuleStatus.Skipped);
        results[0].Message.Should().Contain("skipped");
    }

    [Fact]
    public async Task QualityRuleEvaluator_UnknownRuleType_ReturnsSkipped()
    {
        // Build succeeds for unknown type (throws), which triggers the exception path
        var evaluator = new QualityRuleEvaluator(
            new StubSqlClient(0),
            NullLogger<QualityRuleEvaluator>.Instance);

        var results = await evaluator.EvaluateAsync(
            [new QualityRule { Type = "unknown_rule_xyz", Column = "id", Threshold = 0.01, Severity = "warn" }],
            MakeSqlServer(),
            "token");

        // Build() throws InvalidOperationException for unknown type → caught → Warned
        results.Should().ContainSingle(r => r.Status == RuleStatus.Warned);
    }

    [Fact]
    public async Task QualityRuleEvaluator_NullRateThresholdMissing_NullActual_SkipsRule()
    {
        // null_rate without threshold — actual returned null → Skipped
        var evaluator = new QualityRuleEvaluator(
            new StubSqlClient(null),
            NullLogger<QualityRuleEvaluator>.Instance);

        var results = await evaluator.EvaluateAsync(
            [new QualityRule { Type = "null_rate", Column = "id", Severity = "error" }],
            MakeSqlServer(),
            "token");

        results.Should().ContainSingle(r => r.Status == RuleStatus.Skipped);
    }

    [Fact]
    public async Task QualityRuleEvaluator_NullRateAlias_NormalizesType()
    {
        // "NullRate" camelCase alias normalises to null_rate
        var evaluator = new QualityRuleEvaluator(
            new StubSqlClient(0.0),
            NullLogger<QualityRuleEvaluator>.Instance);

        var results = await evaluator.EvaluateAsync(
            [new QualityRule { Type = "NullRate", Column = "id", Threshold = 0.05, Severity = "error" }],
            MakeSqlServer(),
            "token");

        results.Should().ContainSingle(r => r.RuleId == "quality.null_rate");
    }

    [Fact]
    public async Task QualityRuleEvaluator_CustomSqlAlias_NormalizesType()
    {
        var evaluator = new QualityRuleEvaluator(
            new StubSqlClient(0.0),
            NullLogger<QualityRuleEvaluator>.Instance);

        var results = await evaluator.EvaluateAsync(
            [new QualityRule { Type = "CustomSql", Sql = "SELECT 0", Severity = "error" }],
            MakeSqlServer(),
            "token");

        results.Should().ContainSingle(r => r.RuleId == "quality.custom_sql");
    }

    // ─── RuleSqlBuilder ───────────────────────────────────────────────────────

    [Fact]
    public void RuleSqlBuilder_UnknownType_Throws()
    {
        var act = () => RuleSqlBuilder.Build(
            new QualityRule { Type = "bogus_xyz", Column = "id", Severity = "error" },
            MakeSqlServer());
        act.Should().Throw<InvalidOperationException>().WithMessage("*bogus_xyz*");
    }

    [Fact]
    public void RuleSqlBuilder_EmptyCustomSql_Throws()
    {
        var act = () => RuleSqlBuilder.Build(
            new QualityRule { Type = "custom_sql", Severity = "error" },
            MakeSqlServer());
        act.Should().Throw<InvalidOperationException>().WithMessage("*requires SQL*");
    }

    [Fact]
    public void RuleSqlBuilder_RegexMissingPattern_Throws()
    {
        var act = () => RuleSqlBuilder.Build(
            new QualityRule { Type = "regex", Column = "id", Severity = "error" },
            MakeSqlServer());
        act.Should().Throw<InvalidOperationException>().WithMessage("*pattern*");
    }

    [Fact]
    public void RuleSqlBuilder_SingleSegmentPath_UsesDboSchema()
    {
        var server = MakeSqlServer() with { Path = "orders" };
        var sql = RuleSqlBuilder.Build(
            new QualityRule { Type = "null_rate", Column = "id", Threshold = 0.0, Severity = "error" },
            server);
        sql.Should().Contain("[dbo].[orders]");
    }

    // ─── FabricTargetPath ──────────────────────────────────────────────────────

    [Fact]
    public void FabricTargetPath_ParseSingleName_EmptyPath_ReturnsUnknown()
    {
        FabricTargetPath.ParseSingleName("").Should().Be("unknown");
        FabricTargetPath.ParseSingleName("   ").Should().Be("unknown");
    }

    [Fact]
    public void FabricTargetPath_ParseSingleName_AbfssWithoutTablesMarker_ReturnsLastSegment()
    {
        var result = FabricTargetPath.ParseSingleName(
            "abfss://workspace@onelake.dfs.fabric.microsoft.com/Lakehouse.Lakehouse/Files/data.parquet");
        result.Should().Be("data.parquet");
    }

    // ─── FabricSemanticModelSchemaReader ──────────────────────────────────────

    [Fact]
    public async Task SemanticModelReader_MissingToken_ReturnsFailure()
    {
        var reader = new FabricSemanticModelSchemaReader(new HttpClient(new NeverCallHandler()));
        var result = await reader.ReadAsync(
            MakeServer("MyTable"),
            new EnforcementCredentials(),
            MakeTarget("semantic_model"));
        result.IsSuccess.Should().BeFalse();
        result.ErrorCode.Should().Be("FabricRestTokenMissing");
    }

    [Fact]
    public async Task SemanticModelReader_202WithBodyUrl_Polls()
    {
        var payload = Convert.ToBase64String(Encoding.UTF8.GetBytes("table Sales\n  column id string\n"));
        var operationBody = $$"""
            {
              "status": "Succeeded",
              "result": {
                "definition": {
                  "parts": [
                    {
                      "path": "definition/tables/Sales.tmdl",
                      "payloadType": "InlineBase64",
                      "payload": "{{payload}}"
                    }
                  ]
                }
              }
            }
            """;
        var callCount = 0;
        // First call returns 202 with poll URL in body (not Location header)
        var handler = new CallbackHandler(_ =>
        {
            callCount++;
            if (callCount == 1)
            {
                var resp = new HttpResponseMessage(HttpStatusCode.Accepted)
                {
                    Content = new StringContent(
                        """{"Location":"https://wabi.example.com/v1/operations/op456"}""",
                        Encoding.UTF8, "application/json"),
                };
                return resp;
            }
            return Json(HttpStatusCode.OK, operationBody);
        });

        var reader = new FabricSemanticModelSchemaReader(new HttpClient(handler));
        var result = await reader.ReadAsync(MakeServer("Sales"), MakeCredentials(), MakeTarget("semantic_model"));
        result.IsSuccess.Should().BeTrue();
        result.Value!.Schema.Columns.Should().Contain(c => c.Name == "id");
    }

    [Fact]
    public async Task SemanticModelReader_PollNonSuccess_ReturnsFailure()
    {
        // First call: 202 with Location header. Poll: non-200 → timeout returns null
        var callCount = 0;
        var handler = new CallbackHandler(_ =>
        {
            callCount++;
            if (callCount == 1)
            {
                var resp = new HttpResponseMessage(HttpStatusCode.Accepted);
                resp.Headers.Location = new Uri("https://wabi.example.com/v1/operations/fail123");
                resp.Content = new StringContent(string.Empty);
                return resp;
            }
            // Poll always returns 500
            return new HttpResponseMessage(HttpStatusCode.InternalServerError)
            {
                Content = new StringContent("{}", Encoding.UTF8, "application/json"),
            };
        });

        var reader = new FabricSemanticModelSchemaReader(new HttpClient(handler));
        // Returns null definition → produces SemanticModelSchemaEmpty failure because columns = []
        var result = await reader.ReadAsync(MakeServer("Sales"), MakeCredentials(), MakeTarget("semantic_model"),
            new CancellationToken());
        // Either operation failure or empty schema — both are failures
        result.IsSuccess.Should().BeFalse();
    }

    [Fact]
    public async Task SemanticModelReader_PollFailedStatus_ReturnsOperationFailed()
    {
        var callCount = 0;
        var handler = new CallbackHandler(_ =>
        {
            callCount++;
            if (callCount == 1)
            {
                var resp = new HttpResponseMessage(HttpStatusCode.Accepted);
                resp.Headers.Location = new Uri("https://wabi.example.com/v1/operations/op789");
                resp.Content = new StringContent(string.Empty);
                return resp;
            }
            return Json(HttpStatusCode.OK, """
                {
                  "status": "Failed",
                  "error": { "message": "Operation timed out on Fabric side." }
                }
                """);
        });

        var reader = new FabricSemanticModelSchemaReader(new HttpClient(handler));
        var result = await reader.ReadAsync(MakeServer("Sales"), MakeCredentials(), MakeTarget("semantic_model"));
        result.IsSuccess.Should().BeFalse();
        result.ErrorCode.Should().Be("SemanticModelOperationFailed");
        result.Error.Should().Contain("Operation timed out");
    }

    [Fact]
    public async Task SemanticModelReader_SuccessButEmptyColumns_ReturnsSchemaEmptyFailure()
    {
        // Response has a TMDL payload for a different table than what server.Path specifies.
        var payload = Convert.ToBase64String(Encoding.UTF8.GetBytes("table OtherTable\n  column id string\n"));
        var handler = new CallbackHandler(_ => Json(HttpStatusCode.OK, $$"""
            {
              "definition": {
                "parts": [
                  {
                    "path": "definition/tables/OtherTable.tmdl",
                    "payload": "{{payload}}"
                  }
                ]
              }
            }
            """));

        var reader = new FabricSemanticModelSchemaReader(new HttpClient(handler));
        var result = await reader.ReadAsync(MakeServer("NonExistentTable"), MakeCredentials(), MakeTarget("semantic_model"));
        result.IsSuccess.Should().BeFalse();
        result.ErrorCode.Should().Be("SemanticModelSchemaEmpty");
    }

    [Fact]
    public async Task SemanticModelReader_PollBodyWithoutStatusField_TreatsAsDefinition()
    {
        var payload = Convert.ToBase64String(Encoding.UTF8.GetBytes("table Sales\n  column amount double\n"));
        var callCount = 0;
        var handler = new CallbackHandler(_ =>
        {
            callCount++;
            if (callCount == 1)
            {
                var resp = new HttpResponseMessage(HttpStatusCode.Accepted);
                resp.Headers.Location = new Uri("https://wabi.example.com/v1/operations/direct");
                resp.Content = new StringContent(string.Empty);
                return resp;
            }
            // No "status" field — reader should treat it as raw definition
            return Json(HttpStatusCode.OK, $$"""
                {
                  "definition": {
                    "parts": [
                      {
                        "path": "definition/tables/Sales.tmdl",
                        "payload": "{{payload}}"
                      }
                    ]
                  }
                }
                """);
        });

        var reader = new FabricSemanticModelSchemaReader(new HttpClient(handler));
        var result = await reader.ReadAsync(MakeServer("Sales"), MakeCredentials(), MakeTarget("semantic_model"));
        result.IsSuccess.Should().BeTrue();
        result.Value!.Schema.Columns.Should().Contain(c => c.Name == "amount");
    }

    // ─── KqlSchemaParser ──────────────────────────────────────────────────────

    [Fact]
    public void KqlSchemaParser_MissingTablesProperty_ReturnsEmpty()
    {
        var result = KqlSchemaParser.ParseColumns("""{ "Other": [] }""");
        result.Should().BeEmpty();
    }

    [Fact]
    public void KqlSchemaParser_TableMissingRowsProperty_ReturnsEmpty()
    {
        var result = KqlSchemaParser.ParseColumns("""{ "Tables": [ { "TableName": "T" } ] }""");
        result.Should().BeEmpty();
    }

    [Fact]
    public void KqlSchemaParser_SchemaJsonWithoutOrderedColumns_ReturnsEmpty()
    {
        var schemaJson = """{"Name":"T","Columns":[]}""";
        var schemaJsonEscaped = JsonSerializer.Serialize(schemaJson);
        var payload = $$"""
            {
              "Tables": [
                {
                  "TableName": "Table_0",
                  "Columns": [
                    {"ColumnName":"TableName","DataType":"String"},
                    {"ColumnName":"Schema","DataType":"String"},
                    {"ColumnName":"DatabaseName","DataType":"String"}
                  ],
                  "Rows": [["T", {{schemaJsonEscaped}}, "dbid"]]
                }
              ]
            }
            """;
        var result = KqlSchemaParser.ParseColumns(payload);
        result.Should().BeEmpty();
    }

    // ─── helpers ─────────────────────────────────────────────────────────────

    private static ContractServer MakeSqlServer() => new()
    {
        Name = "test-sql",
        Type = "delta",
        Host = "https://sales.datawarehouse.fabric.microsoft.com",
        Path = "dbo.orders",
        Format = "sql",
    };

    private static ContractServer MakeServer(string tableName) => new()
    {
        Name = "test",
        Type = "azure",
        Path = tableName,
        Format = "semantic_model",
    };

    private static EnforcementCredentials MakeCredentials() => new()
    {
        FabricRestToken = "fabric-rest-token",
        FabricSqlToken = "fabric-sql-token",
        KustoToken = "kusto-token",
    };

    private static EnforcementTargetContext MakeTarget(string targetType) => new()
    {
        WorkspaceId = Guid.Parse("11111111-1111-4111-8111-111111111111"),
        TargetItemId = Guid.Parse("22222222-2222-4222-8222-222222222222"),
        TargetType = targetType,
    };

    private static HttpResponseMessage Json(HttpStatusCode code, string body) =>
        new(code) { Content = new StringContent(body, Encoding.UTF8, "application/json") };

    private sealed class StubSqlClient(double? value) : IFabricSqlClient
    {
        public Task<double?> ExecuteScalarAsync(ContractServer _, string __, string ___, CancellationToken ct = default) =>
            Task.FromResult(value);
    }

    private sealed class ThrowingFabricSqlClient : IFabricSqlClient
    {
        public Task<double?> ExecuteScalarAsync(ContractServer _, string __, string ___, CancellationToken ct = default) =>
            throw new InvalidOperationException("simulated SQL failure");
    }

    private sealed class NeverCallHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage _, CancellationToken ct) =>
            throw new InvalidOperationException("HTTP should not be called.");
    }

    private sealed class CallbackHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) =>
            Task.FromResult(respond(request));
    }
}
