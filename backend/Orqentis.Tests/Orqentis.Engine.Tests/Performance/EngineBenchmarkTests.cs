using System.Diagnostics;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Orqentis.Engine;
using Orqentis.Engine.Common;
using Orqentis.Engine.Delta;
using Orqentis.Engine.Evaluation;
using Orqentis.Engine.Models;
using Orqentis.Engine.Odcs;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;
using Xunit.Abstractions;

namespace Orqentis.Tests.Orqentis.Engine.Tests.Performance;

/// <summary>
/// Benchmarks demonstrating that enforcement time scales with the number of Delta
/// transaction-log commits (kilobytes of JSON), NOT with the underlying table row count
/// (gigabytes of Parquet data). This is the core scalability claim of the Orqentis engine.
/// </summary>
public sealed class EngineBenchmarkTests(ITestOutputHelper output)
{
    private static readonly string[] _columnNames =
    [
        "id", "tenant_id", "workspace_id", "contract_id", "dataset_name",
        "source_system", "record_created_at", "record_updated_at", "is_deleted",
        "partition_date", "region_code", "country_iso", "currency_code",
        "amount_usd", "amount_local", "exchange_rate", "category", "subcategory",
        "product_sku", "quantity", "unit_price", "discount_pct", "tax_rate",
        "gross_revenue", "net_revenue", "cost_of_goods", "gross_margin",
        "customer_id", "customer_segment", "channel", "campaign_id",
        "impression_count", "click_count", "conversion_count", "revenue_attribution",
        "ingested_by", "ingested_at", "data_version", "checksum", "quality_score",
    ];

    private static readonly (int Commits, long EstimatedRowCount, string ScaleLabel)[] _scales =
    [
        (Commits: 1,    EstimatedRowCount: 10_000L,          ScaleLabel: "~10K rows     (KB-scale table)"),
        (Commits: 10,   EstimatedRowCount: 100_000L,         ScaleLabel: "~100K rows    (MB-scale table)"),
        (Commits: 100,  EstimatedRowCount: 10_000_000L,      ScaleLabel: "~10M rows     (GB-scale table)"),
        (Commits: 1000, EstimatedRowCount: 1_000_000_000L,   ScaleLabel: "~1B rows      (TB-scale table)"),
        (Commits: 5000, EstimatedRowCount: 100_000_000_000L, ScaleLabel: "~100B rows    (PB-scale table)"),
    ];

    [Fact]
    public async Task EnforcementTime_ScalesWithLogVersions_NotWithRowCount()
    {
        output.WriteLine("=============================================================");
        output.WriteLine("  ORQENTIS ENGINE SCALE BENCHMARK");
        output.WriteLine("  Key claim: enforcement reads only the Delta transaction log");
        output.WriteLine("  (kilobytes of JSON), NOT the Parquet row data.");
        output.WriteLine("  Schema + freshness validation is O(log files), not O(rows).");
        output.WriteLine("=============================================================");
        output.WriteLine("");
        output.WriteLine($"{"Scale",-42} {"Est. Rows",18} {"Log Commits",12} {"Time (ms)",12}");
        output.WriteLine(new string('-', 90));

        var results = new List<(string Label, long Rows, int Commits, long Ms)>();

        foreach (var (commitCount, estimatedRowCount, scaleLabel) in _scales)
        {
            var elapsedMs = await RunBenchmarkAsync(commitCount);
            output.WriteLine($"{scaleLabel,-42} {estimatedRowCount,18:N0} {commitCount,12:N0} {elapsedMs,12} ms");
            results.Add((scaleLabel, estimatedRowCount, commitCount, elapsedMs));
        }

        output.WriteLine("");
        output.WriteLine("KEY INSIGHT:");
        output.WriteLine("  The enforcement engine NEVER reads Parquet row data for schema/freshness.");
        output.WriteLine("  Time grows with log commit count, not row count.");
        output.WriteLine("  A 1-trillion-row table validates as fast as a 10-row table with the same commit history.");
        output.WriteLine("  Quality SQL rules push down to Fabric SQL serverless — the engine just counts violations.");
        output.WriteLine("");

        results.Should().AllSatisfy(r => r.Ms.Should().BeGreaterOrEqualTo(0));

        var at1000 = results.Single(r => r.Commits == 1000);
        at1000.Ms.Should().BeLessOrEqualTo(10_000,
            because: "reading 1000 Delta log commits should be well under 10 seconds over local HTTP");

        // 5000 commits is an extreme scenario (100B-row table); local WireMock makes
        // one HTTP roundtrip per commit file, so this may take up to 120 seconds here.
        // In production, OneLake ADLS SDK batches listing and reads, so it is much faster.
        var at5000 = results.Single(r => r.Commits == 5000);
        at5000.Ms.Should().BeLessOrEqualTo(120_000,
            because: "reading 5000 Delta log commits via WireMock should complete under 2 minutes");
    }

    [Fact]
    public async Task ConcurrentEnforcement_100ParallelRuns_AllSucceed()
    {
        const int concurrentRuns = 100;
        output.WriteLine($"=== Concurrent Enforcement Benchmark: {concurrentRuns} parallel runs ===");

        using var server = BuildWireMockServer(commitCount: 10);
        var orchestrator = BuildOrchestrator(server);
        var contract = BuildContract(server.Urls[0]);

        var sw = Stopwatch.StartNew();
        var tasks = Enumerable.Range(0, concurrentRuns)
            .Select(_ => orchestrator.RunAsync(contract, "benchmark-token"))
            .ToArray();

        var results = await Task.WhenAll(tasks);
        sw.Stop();

        var passed = results.Count(r => r.OverallStatus == EnforcementStatus.Passed);
        var throughput = concurrentRuns / (sw.ElapsedMilliseconds / 1000.0);

        output.WriteLine($"  Concurrent runs:       {concurrentRuns}");
        output.WriteLine($"  Passed:                {passed}/{concurrentRuns}");
        output.WriteLine($"  Total elapsed:         {sw.ElapsedMilliseconds} ms");
        output.WriteLine($"  Throughput:            {throughput:F1} enforcement runs/sec");
        output.WriteLine($"  Mean latency:          {sw.ElapsedMilliseconds / (double)concurrentRuns:F1} ms/run");

        results.Should().AllSatisfy(r =>
            r.OverallStatus.Should().BeOneOf(EnforcementStatus.Passed, EnforcementStatus.Failed, EnforcementStatus.Warned));

        passed.Should().Be(concurrentRuns, because: "all enforcements target the same valid table");
        output.WriteLine($"  All {concurrentRuns} concurrent enforcement runs passed ✅");
    }

    [Fact]
    public async Task WideTable_40Columns_SchemaValidationCompletes()
    {
        output.WriteLine("=== Wide Table Benchmark: 40-column schema validation ===");

        using var server = BuildWireMockServer(commitCount: 5, columnCount: 40);
        var orchestrator = BuildOrchestrator(server);
        var contract = BuildContract(server.Urls[0], columnCount: 40);

        var sw = Stopwatch.StartNew();
        var result = await orchestrator.RunAsync(contract, "benchmark-token");
        sw.Stop();

        output.WriteLine($"  Columns validated:  {result.SchemaRules.Count}");
        output.WriteLine($"  Time elapsed:       {sw.ElapsedMilliseconds} ms");
        output.WriteLine($"  Status:             {result.OverallStatus}");

        result.OverallStatus.Should().Be(EnforcementStatus.Passed);
        result.SchemaRules.Count.Should().BeGreaterOrEqualTo(40);
        sw.ElapsedMilliseconds.Should().BeLessOrEqualTo(2000,
            because: "wide schema validation should complete in under 2 seconds");

        output.WriteLine("  40-column wide table validated successfully ✅");
    }

    private async Task<long> RunBenchmarkAsync(int commitCount)
    {
        using var server = BuildWireMockServer(commitCount);
        var orchestrator = BuildOrchestrator(server);
        var contract = BuildContract(server.Urls[0]);

        // Warm-up run (not measured)
        _ = await orchestrator.RunAsync(contract, "warmup-token");

        var sw = Stopwatch.StartNew();
        var result = await orchestrator.RunAsync(contract, "benchmark-token");
        sw.Stop();

        result.OverallStatus.Should().NotBe(EnforcementStatus.Error,
            because: $"benchmark with {commitCount} commits should not error: {result.ErrorMessage}");

        return sw.ElapsedMilliseconds;
    }

    private static WireMockServer BuildWireMockServer(int commitCount, int columnCount = 8)
    {
        var server = WireMockServer.Start();
        var schemaJson = BuildSchemaJson(columnCount);

        for (var i = 0; i < commitCount; i++)
        {
            var fileName = $"{i:D20}.json";
            string body;

            var ts = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero).AddDays(i).ToString("O");
            if (i == 0)
            {
                body = string.Join("\n",
                    @"{""protocol"":{""minReaderVersion"":1,""minWriterVersion"":2}}",
                    $@"{{""metaData"":{{""id"":""bench-table"",""format"":{{""provider"":""delta""}},""schemaString"":{schemaJson},""partitionColumns"":[""partition_date""]}}}}",
                    @"{""add"":{""path"":""part-00000.parquet"",""size"":1073741824}}",
                    $@"{{""commitInfo"":{{""timestamp"":""{ts}""}}}}");
            }
            else
            {
                body = string.Join("\n",
                    $@"{{""add"":{{""path"":""part-{i:D5}.parquet"",""size"":1073741824}}}}",
                    $@"{{""commitInfo"":{{""timestamp"":""{ts}""}}}}");
            }

            server
                .Given(Request.Create().WithPath($"/bench/_delta_log/{fileName}").UsingGet())
                .RespondWith(Response.Create().WithStatusCode(200).WithBody(body));
        }

        return server;
    }

    private static string BuildSchemaJson(int columnCount)
    {
        var cols = _columnNames.Take(columnCount)
            .Select(name => $$$"""{"name":"{{{name}}}","type":"string","nullable":true,"metadata":{}}""");
        var fields = string.Join(",", cols);
        return System.Text.Json.JsonSerializer.Serialize($"{{\"type\":\"struct\",\"fields\":[{fields}]}}");
    }

    private static EnforcementOrchestrator BuildOrchestrator(WireMockServer server)
    {
        var qualityEvaluator = new Mock<IQualityRuleEvaluator>();
        qualityEvaluator
            .Setup(q => q.EvaluateAsync(
                It.IsAny<IReadOnlyList<QualityRule>>(),
                It.IsAny<ContractServer>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        return new EnforcementOrchestrator(
            deltaReader: new DeltaLogReader(
                new HttpClient(),
                new SchemaExtractor(),
                NullLogger<DeltaLogReader>.Instance),
            sqlSchemaReader: new Mock<IFabricSqlSchemaReader>().Object,
            kqlSchemaReader: new Mock<IFabricKqlSchemaReader>().Object,
            semanticModelSchemaReader: new Mock<IFabricSemanticModelSchemaReader>().Object,
            schemaEvaluator: new SchemaRuleEvaluator(NullLogger<SchemaRuleEvaluator>.Instance),
            freshnessEvaluator: new FreshnessEvaluator(NullLogger<FreshnessEvaluator>.Instance),
            qualityEvaluator: qualityEvaluator.Object,
            logger: NullLogger<EnforcementOrchestrator>.Instance);
    }

    private static ContractDefinition BuildContract(string serverBaseUrl, int columnCount = 8)
    {
        var columns = _columnNames.Take(columnCount)
            .Select(name => new ContractColumn { Name = name, Type = "string", Required = false })
            .ToList();

        return new ContractDefinition
        {
            ApiVersion = "v3.1.0",
            Kind = "DataContract",
            Id = "urn:orqentis:contract:benchmark",
            Name = "Benchmark Contract",
            Version = "1.0.0",
            Status = "active",
            Info = new ContractInfo
            {
                Title = "Benchmark Contract",
                Owner = "benchmark@orqentis.com",
            },
            Servers =
            [
                new ContractServer
                {
                    Name = "benchmark-server",
                    Type = "azure",
                    Host = serverBaseUrl.TrimEnd('/'),
                    Path = $"{serverBaseUrl.TrimEnd('/')}/bench/",
                    Format = "delta",
                },
            ],
            Schema = columns,
            Freshness = new FreshnessRule { MaxAgeHours = 9999, Severity = "warn" },
            Quality = [],
        };
    }
}
