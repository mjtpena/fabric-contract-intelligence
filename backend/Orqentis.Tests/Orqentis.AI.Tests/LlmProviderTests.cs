using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Orqentis.AI;

namespace Orqentis.Tests.Orqentis.AI.Tests;

public sealed class LlmProviderTests
{
    [Fact]
    public async Task AzureOpenAiProvider_SendsChatCompletionRequest_AndReturnsTrimmedContent()
    {
        var handler = new RecordingHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = JsonContent("""
            {
              "choices": [
                {
                  "message": {
                    "content": "  generated yaml  "
                  }
                }
              ]
            }
            """),
        });
        var provider = new AzureOpenAiLlmProvider(
            new StaticHttpClientFactory(handler),
            Options.Create(new AiOptions
            {
                AzureOpenAI = new AzureOpenAiOptions
                {
                    Endpoint = "https://azure-openai.example",
                    DeploymentName = "gpt-4o",
                    ApiKey = "test-key",
                    ApiVersion = "2024-10-21",
                },
            }));

        var result = await provider.CompleteAsync("system prompt", "user input");

        result.Should().Be("generated yaml");
        handler.Requests.Should().ContainSingle();
        var request = handler.Requests[0];
        request.RequestUri!.ToString().Should().Be("https://azure-openai.example/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21");
        request.Headers.GetValues("api-key").Should().ContainSingle("test-key");
        var body = await request.Content!.ReadAsStringAsync();
        body.Should().Contain("system prompt");
        body.Should().Contain("user input");
    }

    [Fact]
    public async Task AzureOpenAiProvider_ReturnsNull_WhenNotConfigured()
    {
        var provider = new AzureOpenAiLlmProvider(
            new StaticHttpClientFactory(new RecordingHandler(_ => new HttpResponseMessage(HttpStatusCode.OK))),
            Options.Create(new AiOptions()));

        var result = await provider.CompleteAsync("system", "user");

        result.Should().BeNull();
    }

    [Fact]
    public async Task AzureOpenAiProvider_Throws_WhenHttpStatusFails()
    {
        var provider = new AzureOpenAiLlmProvider(
            new StaticHttpClientFactory(new RecordingHandler(_ => new HttpResponseMessage(HttpStatusCode.BadGateway))),
            Options.Create(new AiOptions
            {
                AzureOpenAI = new AzureOpenAiOptions
                {
                    Endpoint = "https://azure-openai.example",
                    DeploymentName = "gpt-4o",
                    ApiKey = "test-key",
                },
            }));

        var act = async () => await provider.CompleteAsync("system", "user");

        await act.Should().ThrowAsync<HttpRequestException>()
            .WithMessage("*502*");
    }

    [Fact]
    public async Task AnthropicProvider_SendsMessageRequest_AndReturnsTrimmedText()
    {
        var handler = new RecordingHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = JsonContent("""
            {
              "content": [
                {
                  "text": "  remediation advice  "
                }
              ]
            }
            """),
        });
        var provider = new AnthropicLlmProvider(
            new StaticHttpClientFactory(handler),
            Options.Create(new AiOptions
            {
                Anthropic = new AnthropicOptions
                {
                    Endpoint = "https://anthropic.example",
                    Model = "claude-sonnet",
                    ApiKey = "anthropic-key",
                },
            }));

        var result = await provider.CompleteAsync("system prompt", "user input");

        result.Should().Be("remediation advice");
        handler.Requests.Should().ContainSingle();
        var request = handler.Requests[0];
        request.RequestUri!.ToString().Should().Be("https://anthropic.example/v1/messages");
        request.Headers.GetValues("x-api-key").Should().ContainSingle("anthropic-key");
        request.Headers.GetValues("anthropic-version").Should().ContainSingle("2023-06-01");
        var body = await request.Content!.ReadAsStringAsync();
        body.Should().Contain("claude-sonnet");
        body.Should().Contain("system prompt");
        body.Should().Contain("user input");
    }

    [Fact]
    public async Task AnthropicProvider_ReturnsNull_WhenNotConfigured()
    {
        var provider = new AnthropicLlmProvider(
            new StaticHttpClientFactory(new RecordingHandler(_ => new HttpResponseMessage(HttpStatusCode.OK))),
            Options.Create(new AiOptions { Anthropic = new AnthropicOptions { ApiKey = null } }));

        var result = await provider.CompleteAsync("system", "user");

        result.Should().BeNull();
    }

    [Fact]
    public async Task AnthropicProvider_Throws_WhenHttpStatusFails()
    {
        var provider = new AnthropicLlmProvider(
            new StaticHttpClientFactory(new RecordingHandler(_ => new HttpResponseMessage(HttpStatusCode.TooManyRequests))),
            Options.Create(new AiOptions
            {
                Anthropic = new AnthropicOptions
                {
                    Endpoint = "https://anthropic.example",
                    ApiKey = "anthropic-key",
                },
            }));

        var act = async () => await provider.CompleteAsync("system", "user");

        await act.Should().ThrowAsync<HttpRequestException>()
            .WithMessage("*429*");
    }

    private static StringContent JsonContent(string json) => new(json, System.Text.Encoding.UTF8, "application/json");

    private sealed class StaticHttpClientFactory : IHttpClientFactory
    {
        private readonly HttpMessageHandler _handler;

        public StaticHttpClientFactory(HttpMessageHandler handler)
        {
            _handler = handler;
        }

        public HttpClient CreateClient(string name) => new(_handler, disposeHandler: false);
    }

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
