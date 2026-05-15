using System.Net;
using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using Orqentis.Engine.Evaluation;
using Orqentis.Engine.Models;
using Orqentis.Engine.Odcs;

namespace Orqentis.Tests.Orqentis.Engine.Tests.Evaluation;

public sealed class FabricTargetSchemaReadersTests
{
    [Fact]
    public async Task ResolveConnectionStringAsync_WarehouseMetadata_ReturnsDelegatedConnectionString()
    {
        var handler = new RecordingHandler(_ => JsonResponse(HttpStatusCode.OK, """
            {
              "displayName": "SalesWarehouse",
              "properties": {
                "connectionString": "Server=sales.datawarehouse.fabric.microsoft.com;Initial Catalog=SalesWarehouse;",
                "lastUpdatedTime": "2026-05-13T00:00:00Z"
              }
            }
            """));
        var reader = new FabricSqlSchemaReader(new HttpClient(handler), NullLogger<FabricSqlSchemaReader>.Instance);

        var result = await reader.ResolveConnectionStringAsync(CreateServer("dbo.sales"), CreateCredentials(), CreateTarget("warehouse"));

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Contain("SalesWarehouse");
        handler.Requests.Should().ContainSingle();
        handler.Requests[0].RequestUri!.ToString().Should().Contain("/warehouses/");
        handler.Requests[0].Headers.Authorization!.Parameter.Should().Be("fabric-rest-token");
    }

    [Fact]
    public async Task ResolveConnectionStringAsync_FabricSqlTarget_UsesSqlDatabaseMetadataEndpoint()
    {
        var handler = new RecordingHandler(_ => JsonResponse(HttpStatusCode.OK, """
            {
              "displayName": "SalesSql",
              "properties": {
                "connectionString": "Server=sales.database.fabric.microsoft.com;Initial Catalog=SalesSql;"
              }
            }
            """));
        var reader = new FabricSqlSchemaReader(new HttpClient(handler), NullLogger<FabricSqlSchemaReader>.Instance);

        var result = await reader.ResolveConnectionStringAsync(CreateServer("dbo.sales"), CreateCredentials(), CreateTarget("fabric_sql"));

        result.IsSuccess.Should().BeTrue();
        handler.Requests[0].RequestUri!.ToString().Should().Contain("/sqlDatabases/");
    }

    [Fact]
    public async Task ResolveConnectionStringAsync_ServerHost_DoesNotCallFabricRest()
    {
        var handler = new RecordingHandler(_ => throw new InvalidOperationException("HTTP should not be called."));
        var reader = new FabricSqlSchemaReader(new HttpClient(handler), NullLogger<FabricSqlSchemaReader>.Instance);

        var result = await reader.ResolveConnectionStringAsync(
            CreateServer("dbo.sales") with { Host = "sales.datawarehouse.fabric.microsoft.com" },
            CreateCredentials(),
            CreateTarget("warehouse"));

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Contain("Data Source=sales.datawarehouse.fabric.microsoft.com");
        handler.Requests.Should().BeEmpty();
    }

    [Fact]
    public async Task ResolveConnectionStringAsync_MissingTokens_ReturnsFailure()
    {
        var reader = new FabricSqlSchemaReader(new HttpClient(new RecordingHandler(_ => JsonResponse(HttpStatusCode.OK, "{}"))), NullLogger<FabricSqlSchemaReader>.Instance);

        var result = await reader.ResolveConnectionStringAsync(CreateServer("dbo.sales"), new EnforcementCredentials(), CreateTarget("warehouse"));

        result.IsSuccess.Should().BeFalse();
        result.ErrorCode.Should().Be("FabricSqlTokenMissing");
    }

    [Fact]
    public async Task ResolveConnectionStringAsync_MetadataWithoutConnectionString_ReturnsFailure()
    {
        var reader = new FabricSqlSchemaReader(
            new HttpClient(new RecordingHandler(_ => JsonResponse(HttpStatusCode.OK, """{ "properties": { } }"""))),
            NullLogger<FabricSqlSchemaReader>.Instance);

        var result = await reader.ResolveConnectionStringAsync(CreateServer("dbo.sales"), CreateCredentials(), CreateTarget("warehouse"));

        result.IsSuccess.Should().BeFalse();
        result.ErrorCode.Should().Be("FabricSqlConnectionMissing");
    }

    [Fact]
    public async Task KqlReadAsync_QueriesSchemaAndParsesColumns()
    {
        var handler = new QueueHandler(
            JsonResponse(HttpStatusCode.OK, """
                {
                  "displayName": "SalesKql",
                  "properties": { "queryServiceUri": "https://sales.kusto.fabric.microsoft.com" }
                }
                """),
            JsonResponse(HttpStatusCode.OK, """
                {
                  "Tables": [
                    {
                      "TableName": "Table_0",
                      "Columns": [
                        { "ColumnName": "TableName", "DataType": "String", "ColumnType": "string" },
                        { "ColumnName": "Schema", "DataType": "String", "ColumnType": "string" },
                        { "ColumnName": "DatabaseName", "DataType": "String", "ColumnType": "string" }
                      ],
                      "Rows": [
                        ["SalesEvents", "{\"Name\":\"SalesEvents\",\"OrderedColumns\":[{\"Name\":\"event_id\",\"Type\":\"System.String\",\"CslType\":\"string\"},{\"Name\":\"amount\",\"Type\":\"System.Double\",\"CslType\":\"real\"}]}", "sales-db-id"]
                      ]
                    }
                  ]
                }
                """));
        var reader = new FabricKqlSchemaReader(new HttpClient(handler));

        var result = await reader.ReadAsync(CreateServer("SalesEvents"), CreateCredentials(), CreateTarget("eventhouse"));

        result.IsSuccess.Should().BeTrue();
        result.Value!.Schema.Columns.Should().Contain(column => column.Name == "event_id" && column.Type == "string");
        handler.Requests.Should().HaveCount(2);
        handler.Requests[1].RequestUri!.ToString().Should().Be("https://sales.kusto.fabric.microsoft.com/v1/rest/mgmt");
        (await handler.Requests[1].Content!.ReadAsStringAsync()).Should().Contain("SalesEvents");
    }

    [Fact]
    public async Task KqlReadAsync_MissingTokens_ReturnsFailure()
    {
        var reader = new FabricKqlSchemaReader(new HttpClient(new RecordingHandler(_ => JsonResponse(HttpStatusCode.OK, "{}"))));

        var result = await reader.ReadAsync(CreateServer("SalesEvents"), new EnforcementCredentials(), CreateTarget("eventhouse"));

        result.IsSuccess.Should().BeFalse();
        result.ErrorCode.Should().Be("KqlTokenMissing");
    }

    [Fact]
    public async Task SemanticModelReadAsync_ParsesTmdlPayload()
    {
        var payload = Convert.ToBase64String(Encoding.UTF8.GetBytes("""
            table Sales
              column OrderId string
              column Amount decimal
            """));
        var handler = new RecordingHandler(_ => JsonResponse(HttpStatusCode.OK, $$"""
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
            """));
        var reader = new FabricSemanticModelSchemaReader(new HttpClient(handler));

        var result = await reader.ReadAsync(CreateServer("Sales"), CreateCredentials(), CreateTarget("semantic_model"));

        result.IsSuccess.Should().BeTrue();
        result.Value!.Schema.Columns.Should().Contain(column => column.Name == "OrderId" && column.Type == "string");
        handler.Requests[0].RequestUri!.ToString().Should().Contain("/semanticModels/");
        handler.Requests[0].RequestUri!.Query.Should().Contain("format=TMDL");
    }

    [Fact]
    public async Task SemanticModelReadAsync_202AsyncPoll_ParsesTmdlFromOperationResult()
    {
        // Arrange: first request returns 202 with poll URL in Location header.
        // Second request (poll) returns 200 with {"status":"Succeeded","result":{"definition":{"parts":[...]}}}.
        var payload = Convert.ToBase64String(Encoding.UTF8.GetBytes("""
            table co2_emissions
              column country string
              column year int64
              column co2 double
            """));

        var operationResult = $$"""
            {
              "status": "Succeeded",
              "result": {
                "definition": {
                  "parts": [
                    {
                      "path": "definition/tables/co2_emissions.tmdl",
                      "payloadType": "InlineBase64",
                      "payload": "{{payload}}"
                    }
                  ]
                }
              }
            }
            """;

        var callCount = 0;
        var handler = new RecordingHandler(_ =>
        {
            callCount++;
            if (callCount == 1)
            {
                var resp202 = new HttpResponseMessage(HttpStatusCode.Accepted);
                resp202.Headers.Location = new Uri("https://wabi.example.com/v1/operations/op123");
                resp202.Content = new StringContent(string.Empty);
                return resp202;
            }
            return JsonResponse(HttpStatusCode.OK, operationResult);
        });

        var reader = new FabricSemanticModelSchemaReader(new HttpClient(handler));
        var result = await reader.ReadAsync(CreateServer("co2_emissions"), CreateCredentials(), CreateTarget("semantic_model"));

        result.IsSuccess.Should().BeTrue();
        result.Value!.Schema.Columns.Should().HaveCount(3);
        result.Value.Schema.Columns.Should().Contain(c => c.Name == "country" && c.Type == "string");
        result.Value.Schema.Columns.Should().Contain(c => c.Name == "co2" && c.Type == "double");
    }

    [Fact]
    public async Task SemanticModelReadAsync_DefinitionFailure_ReturnsFailure()
    {
        var reader = new FabricSemanticModelSchemaReader(
            new HttpClient(new RecordingHandler(_ => JsonResponse(HttpStatusCode.Forbidden, """{ "error": "denied" }"""))));

        var result = await reader.ReadAsync(CreateServer("Sales"), CreateCredentials(), CreateTarget("semantic_model"));

        result.IsSuccess.Should().BeFalse();
        result.ErrorCode.Should().Be("SemanticModelDefinitionFailed");
    }

    [Theory]
    [InlineData("dbo.sales", "dbo", "sales")]
    [InlineData("warehouse/sales/orders", "sales", "orders")]
    [InlineData("abfss://workspace@onelake.dfs.fabric.microsoft.com/Lakehouse.Lakehouse/Tables/orders", "dbo", "orders")]
    public void ParseSql_HandlesFabricTargetPaths(string path, string expectedSchema, string expectedTable)
    {
        var source = FabricTargetPath.ParseSql(path);

        source.Schema.Should().Be(expectedSchema);
        source.Table.Should().Be(expectedTable);
    }

    [Fact]
    public async Task ResolveConnectionStringAsync_CrossWorkspace_UsesServerWorkspaceId()
    {
        var crossWorkspaceId = Guid.Parse("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
        var handler = new RecordingHandler(_ => JsonResponse(HttpStatusCode.OK, """
            {
              "displayName": "CrossWorkspaceWarehouse",
              "properties": {
                "connectionString": "Server=cross.datawarehouse.fabric.microsoft.com;Initial Catalog=CrossDB;"
              }
            }
            """));
        var reader = new FabricSqlSchemaReader(new HttpClient(handler), NullLogger<FabricSqlSchemaReader>.Instance);
        var server = CreateServer("dbo.sales") with { WorkspaceId = crossWorkspaceId };

        var result = await reader.ResolveConnectionStringAsync(server, CreateCredentials(), CreateTarget("warehouse"));

        result.IsSuccess.Should().BeTrue();
        // The request must use the server's workspace, not the contract's workspace (11111...1).
        handler.Requests[0].RequestUri!.ToString().Should().Contain(crossWorkspaceId.ToString());
        handler.Requests[0].RequestUri!.ToString().Should().NotContain("11111111");
    }

    [Fact]
    public async Task KqlReadAsync_CrossWorkspace_UsesServerWorkspaceId()
    {
        var crossWorkspaceId = Guid.Parse("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
        var handler = new QueueHandler(
            JsonResponse(HttpStatusCode.OK, """
                {
                  "displayName": "CrossEventhouse",
                  "properties": { "queryServiceUri": "https://cross.kusto.fabric.microsoft.com" }
                }
                """),
            JsonResponse(HttpStatusCode.OK, """
                {
                  "Tables": [
                    {
                      "TableName": "Table_0",
                      "Columns": [
                        { "ColumnName": "TableName", "DataType": "String", "ColumnType": "string" },
                        { "ColumnName": "Schema", "DataType": "String", "ColumnType": "string" },
                        { "ColumnName": "DatabaseName", "DataType": "String", "ColumnType": "string" }
                      ],
                      "Rows": [
                        ["Events", "{\"Name\":\"Events\",\"OrderedColumns\":[{\"Name\":\"event_id\",\"Type\":\"System.String\",\"CslType\":\"string\"}]}", "db"]
                      ]
                    }
                  ]
                }
                """));
        var reader = new FabricKqlSchemaReader(new HttpClient(handler));
        var server = CreateServer("Events") with { WorkspaceId = crossWorkspaceId };

        var result = await reader.ReadAsync(server, CreateCredentials(), CreateTarget("eventhouse"));

        result.IsSuccess.Should().BeTrue();
        // Metadata request should target the cross-workspace, not the contract's workspace.
        handler.Requests[0].RequestUri!.ToString().Should().Contain(crossWorkspaceId.ToString());
        handler.Requests[0].RequestUri!.ToString().Should().NotContain("11111111");
    }

    [Fact]
    public async Task KqlReadAsync_HostIsKustoUri_SkipsFabricRestLookup()
    {
        // Only one HTTP call — direct to the Kusto mgmt endpoint — no Fabric REST metadata call.
        var handler = new RecordingHandler(_ => JsonResponse(HttpStatusCode.OK, """
            {
              "Tables": [
                {
                  "TableName": "Table_0",
                  "Columns": [
                    { "ColumnName": "TableName", "DataType": "String", "ColumnType": "string" },
                    { "ColumnName": "Schema", "DataType": "String", "ColumnType": "string" },
                    { "ColumnName": "DatabaseName", "DataType": "String", "ColumnType": "string" }
                  ],
                  "Rows": [
                    ["Logs", "{\"Name\":\"Logs\",\"OrderedColumns\":[{\"Name\":\"ts\",\"Type\":\"System.DateTime\",\"CslType\":\"datetime\"},{\"Name\":\"msg\",\"Type\":\"System.String\",\"CslType\":\"string\"}]}", "db"]
                  ]
                }
              ]
            }
            """));
        var reader = new FabricKqlSchemaReader(new HttpClient(handler));
        // host = direct Kusto cluster URI; path = "MyDatabase/Logs"
        var server = new ContractServer
        {
            Name = "remote-eventhouse",
            Type = "azure",
            Path = "MyDatabase/Logs",
            Format = "kql",
            Host = "https://mydb.z6.kusto.windows.net",
        };

        var result = await reader.ReadAsync(server, CreateCredentials(), CreateTarget("eventhouse"));

        result.IsSuccess.Should().BeTrue();
        result.Value!.Schema.Columns.Should().Contain(c => c.Name == "ts");
        // Only one request — straight to Kusto mgmt, no Fabric REST call.
        handler.Requests.Should().ContainSingle();
        handler.Requests[0].RequestUri!.ToString().Should().Contain("kusto.windows.net");
    }

    [Fact]
    public async Task SemanticModelReadAsync_CrossWorkspace_UsesServerWorkspaceId()
    {
        var crossWorkspaceId = Guid.Parse("cccccccc-cccc-4ccc-8ccc-cccccccccccc");
        var payload = Convert.ToBase64String(Encoding.UTF8.GetBytes("""
            table Sales
              column OrderId string
            """));
        var handler = new RecordingHandler(_ => JsonResponse(HttpStatusCode.OK, $$"""
            {
              "definition": {
                "parts": [
                  { "path": "definition/tables/Sales.tmdl", "payload": "{{payload}}" }
                ]
              }
            }
            """));
        var reader = new FabricSemanticModelSchemaReader(new HttpClient(handler));
        var server = CreateServer("Sales") with { WorkspaceId = crossWorkspaceId };

        var result = await reader.ReadAsync(server, CreateCredentials(), CreateTarget("semantic_model"));

        result.IsSuccess.Should().BeTrue();
        // The request must target the cross-workspace, not the contract's workspace.
        handler.Requests[0].RequestUri!.ToString().Should().Contain(crossWorkspaceId.ToString());
        handler.Requests[0].RequestUri!.ToString().Should().NotContain("11111111");
    }

    private static ContractServer CreateServer(string path) => new()
    {
        Name = "fabric-target",
        Type = "azure",
        Path = path,
        Format = "sql",
    };

    private static EnforcementCredentials CreateCredentials() => new()
    {
        FabricRestToken = "fabric-rest-token",
        FabricSqlToken = "fabric-sql-token",
        KustoToken = "kusto-token",
    };

    private static EnforcementTargetContext CreateTarget(string targetType) => new()
    {
        WorkspaceId = Guid.Parse("11111111-1111-4111-8111-111111111111"),
        TargetItemId = Guid.Parse("22222222-2222-4222-8222-222222222222"),
        TargetType = targetType,
    };

    private sealed class RecordingHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _respond;

        public RecordingHandler(Func<HttpRequestMessage, HttpResponseMessage> respond)
        {
            _respond = respond;
        }

        public List<HttpRequestMessage> Requests { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Requests.Add(await CloneRequestAsync(request, cancellationToken).ConfigureAwait(false));
            return _respond(request);
        }
    }

    private sealed class QueueHandler(params HttpResponseMessage[] responses) : HttpMessageHandler
    {
        private readonly Queue<HttpResponseMessage> _responses = new(responses);

        public List<HttpRequestMessage> Requests { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Requests.Add(await CloneRequestAsync(request, cancellationToken).ConfigureAwait(false));
            return _responses.Dequeue();
        }
    }

    private static async Task<HttpRequestMessage> CloneRequestAsync(HttpRequestMessage request, CancellationToken ct)
    {
        var clone = new HttpRequestMessage(request.Method, request.RequestUri)
        {
            Content = request.Content is null
                ? null
                : new StringContent(await request.Content.ReadAsStringAsync(ct).ConfigureAwait(false), Encoding.UTF8, "application/json"),
        };

        foreach (var header in request.Headers)
        {
            clone.Headers.TryAddWithoutValidation(header.Key, header.Value);
        }

        return clone;
    }

    private static HttpResponseMessage JsonResponse(HttpStatusCode statusCode, string json) =>
        new(statusCode)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json"),
        };
}
