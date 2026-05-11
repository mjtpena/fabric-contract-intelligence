using System.Net;
using Microsoft.Extensions.Logging.Abstractions;
using Orqentis.Engine.Evaluation;
using Orqentis.Engine.Odcs;

namespace Orqentis.Tests.Orqentis.Engine.Tests.Evaluation;

public sealed class FabricSqlClientTests
{
    [Fact]
    public async Task ExecuteScalarAsync_PostsQueryWithBearerToken_AndReadsRowsArrayScalar()
    {
        var handler = new RecordingHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = JsonContent("""{ "rows": [[ 42.5 ]] }"""),
        });
        var client = new FabricSqlClient(new HttpClient(handler), NullLogger<FabricSqlClient>.Instance);

        var value = await client.ExecuteScalarAsync(
            new ContractServer
            {
                Name = "fabric",
                Type = "fabric",
                Host = "https://sql.fabric.example/",
                Path = "Tables/demo",
            },
            "select 42.5",
            "obo-token");

        value.Should().Be(42.5);
        handler.Requests.Should().ContainSingle();
        var request = handler.Requests[0];
        request.RequestUri!.ToString().Should().Be("https://sql.fabric.example/query");
        request.Headers.Authorization!.Scheme.Should().Be("Bearer");
        request.Headers.Authorization.Parameter.Should().Be("obo-token");
        var body = await request.Content!.ReadAsStringAsync();
        body.Should().Contain("select 42.5");
    }

    [Fact]
    public async Task ExecuteScalarAsync_ReadsObjectRowScalar()
    {
        var client = CreateClient("""{ "rows": [{ "metric": "0.97" }] }""");

        var value = await client.ExecuteScalarAsync(CreateServer(), "select metric", "token");

        value.Should().Be(0.97);
    }

    [Fact]
    public async Task ExecuteScalarAsync_ReadsNestedResultScalar()
    {
        var client = CreateClient("""{ "result": { "rows": [[ "12" ]] } }""");

        var value = await client.ExecuteScalarAsync(CreateServer(), "select count", "token");

        value.Should().Be(12);
    }

    [Fact]
    public async Task ExecuteScalarAsync_ReadsDirectValueScalar()
    {
        var client = CreateClient("""{ "value": "3.14" }""");

        var value = await client.ExecuteScalarAsync(CreateServer(), "select pi", "token");

        value.Should().Be(3.14);
    }

    [Fact]
    public async Task ExecuteScalarAsync_Throws_WhenHostIsMissing()
    {
        var client = CreateClient("""{ "value": 1 }""");

        var act = async () => await client.ExecuteScalarAsync(
            new ContractServer
            {
                Name = "fabric",
                Type = "fabric",
                Path = "Tables/demo",
            },
            "select 1",
            "token");

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*server host is required*");
    }

    [Fact]
    public async Task ExecuteScalarAsync_Throws_WhenScalarIsMissing()
    {
        var client = CreateClient("""{ "rows": [[]] }""");

        var act = async () => await client.ExecuteScalarAsync(CreateServer(), "select bad", "token");

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*did not include a scalar value*");
    }

    [Fact]
    public async Task ExecuteScalarAsync_Throws_WhenEndpointReturnsError()
    {
        var client = new FabricSqlClient(
            new HttpClient(new RecordingHandler(_ => new HttpResponseMessage(HttpStatusCode.InternalServerError)
            {
                Content = JsonContent("""{ "error": "boom" }"""),
            })),
            NullLogger<FabricSqlClient>.Instance);

        var act = async () => await client.ExecuteScalarAsync(CreateServer(), "select bad", "token");

        await act.Should().ThrowAsync<HttpRequestException>();
    }

    private static FabricSqlClient CreateClient(string responseJson) =>
        new(
            new HttpClient(new RecordingHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = JsonContent(responseJson),
            })),
            NullLogger<FabricSqlClient>.Instance);

    private static ContractServer CreateServer() => new()
    {
        Name = "fabric",
        Type = "fabric",
        Host = "https://sql.fabric.example",
        Path = "Tables/demo",
    };

    private static StringContent JsonContent(string json) => new(json, System.Text.Encoding.UTF8, "application/json");

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

        private static async Task<HttpRequestMessage> CloneRequestAsync(HttpRequestMessage request, CancellationToken ct)
        {
            var clone = new HttpRequestMessage(request.Method, request.RequestUri)
            {
                Content = request.Content is null
                    ? null
                    : new StringContent(await request.Content.ReadAsStringAsync(ct).ConfigureAwait(false), System.Text.Encoding.UTF8, "application/json"),
            };

            foreach (var header in request.Headers)
            {
                clone.Headers.TryAddWithoutValidation(header.Key, header.Value);
            }

            return clone;
        }
    }
}
