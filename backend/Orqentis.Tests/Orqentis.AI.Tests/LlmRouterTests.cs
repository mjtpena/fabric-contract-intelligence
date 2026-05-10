using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Orqentis.AI;

namespace Orqentis.Tests.Orqentis.AI.Tests;

public sealed class LlmRouterTests
{
    [Fact]
    public async Task CompleteAsync_UsesFallback_WhenPrimaryFails()
    {
        var router = new LlmRouter(
            [new ThrowingProvider("azure-openai"), new StaticProvider("anthropic", "fallback-result")],
            Options.Create(new AiOptions { FallbackEnabled = true }),
            NullLogger<LlmRouter>.Instance);

        var result = await router.CompleteAsync("Test", "system", "user");
        result.Should().NotBeNull();
        result!.Content.Should().Be("fallback-result");
        result.ModelUsed.Should().Be("anthropic");
    }

    [Fact]
    public async Task CompleteAsync_ReturnsNull_WhenAllProvidersFail()
    {
        var router = new LlmRouter(
            [new ThrowingProvider("azure-openai"), new ThrowingProvider("anthropic")],
            Options.Create(new AiOptions { FallbackEnabled = true }),
            NullLogger<LlmRouter>.Instance);

        var result = await router.CompleteAsync("Test", "system", "user");
        result.Should().BeNull();
    }

    private sealed class StaticProvider : ILlmProvider
    {
        private readonly string _value;

        public StaticProvider(string name, string value)
        {
            Name = name;
            _value = value;
        }

        public string Name { get; }
        public bool IsConfigured => true;

        public Task<string?> CompleteAsync(string systemPrompt, string userInput, CancellationToken ct = default) =>
            Task.FromResult<string?>(_value);
    }

    private sealed class ThrowingProvider : ILlmProvider
    {
        public ThrowingProvider(string name) => Name = name;

        public string Name { get; }
        public bool IsConfigured => true;

        public Task<string?> CompleteAsync(string systemPrompt, string userInput, CancellationToken ct = default) =>
            throw new InvalidOperationException("provider failed");
    }
}
