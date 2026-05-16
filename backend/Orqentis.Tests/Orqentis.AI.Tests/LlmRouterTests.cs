using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Orqentis.AI;

namespace Orqentis.Tests.Orqentis.AI.Tests;

public sealed class LlmRouterTests
{
    [Fact]
    public async Task CompleteAsync_UsesFallback_WhenPrimaryFails()
    {
        using var memoryCache = new MemoryCache(new MemoryCacheOptions { SizeLimit = 1024 * 1024 });
        var router = new LlmRouter(
            [new ThrowingProvider("azure-openai"), new StaticProvider("anthropic", "fallback-result", "claude")],
            Options.Create(new AiOptions { FallbackEnabled = true }),
            memoryCache,
            NullLogger<LlmRouter>.Instance);

        var result = await router.CompleteAsync("Test", "system", "user");

        result.Should().NotBeNull();
        result!.Content.Should().Be("fallback-result");
        result.ModelUsed.Should().Be("claude");
    }

    [Fact]
    public async Task CompleteAsync_ReturnsNull_WhenAllProvidersFail()
    {
        using var memoryCache = new MemoryCache(new MemoryCacheOptions { SizeLimit = 1024 * 1024 });
        var router = new LlmRouter(
            [new ThrowingProvider("azure-openai"), new ThrowingProvider("anthropic")],
            Options.Create(new AiOptions { FallbackEnabled = true }),
            memoryCache,
            NullLogger<LlmRouter>.Instance);

        var result = await router.CompleteAsync("Test", "system", "user");

        result.Should().BeNull();
    }

    [Fact]
    public async Task CompleteAsync_CacheHitOnSecondCall_DoesNotDispatchAgain()
    {
        using var memoryCache = new MemoryCache(new MemoryCacheOptions { SizeLimit = 1024 * 1024 });
        var provider = new CountingProvider("azure-openai", "cached-result", "gpt-4o");
        var router = new LlmRouter(
            [provider],
            Options.Create(new AiOptions { FallbackEnabled = false }),
            memoryCache,
            NullLogger<LlmRouter>.Instance);

        var first = await router.CompleteAsync("Test", "system", "user");
        var second = await router.CompleteAsync("Test", "system", "user");

        first.Should().NotBeNull();
        second.Should().NotBeNull();
        second!.Content.Should().Be("cached-result");
        provider.CallCount.Should().Be(1);
    }

    private sealed class StaticProvider : ILlmProvider
    {
        private readonly string _value;
        private readonly string _model;

        public StaticProvider(string name, string value, string model)
        {
            Name = name;
            _value = value;
            _model = model;
        }

        public string Name { get; }
        public bool IsConfigured => true;

        public Task<LlmProviderResult?> CompleteAsync(string systemPrompt, string userInput, CancellationToken ct = default) =>
            Task.FromResult<LlmProviderResult?>(new LlmProviderResult(_value, _model));
    }

    private sealed class CountingProvider : ILlmProvider
    {
        private readonly string _value;
        private readonly string _model;

        public CountingProvider(string name, string value, string model)
        {
            Name = name;
            _value = value;
            _model = model;
        }

        public string Name { get; }
        public bool IsConfigured => true;
        public int CallCount { get; private set; }

        public Task<LlmProviderResult?> CompleteAsync(string systemPrompt, string userInput, CancellationToken ct = default)
        {
            CallCount++;
            return Task.FromResult<LlmProviderResult?>(new LlmProviderResult(_value, _model));
        }
    }

    private sealed class ThrowingProvider : ILlmProvider
    {
        public ThrowingProvider(string name) => Name = name;

        public string Name { get; }
        public bool IsConfigured => true;

        public Task<LlmProviderResult?> CompleteAsync(string systemPrompt, string userInput, CancellationToken ct = default) =>
            throw new InvalidOperationException("provider failed");
    }
}
