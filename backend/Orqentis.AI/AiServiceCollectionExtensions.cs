using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Http.Resilience;
using Polly;

namespace Orqentis.AI;

public static class AiServiceCollectionExtensions
{
    public static IServiceCollection AddOrqentisAi(
        this IServiceCollection services,
        IConfiguration config,
        Action<IHttpClientBuilder>? configureHttpClient = null)
    {
        services.Configure<AiOptions>(config.GetSection(AiOptions.SectionName));
        services.TryAddSingleton<IPromptLoader, PromptLoader>();
        ConfigureLlmClient(services.AddHttpClient("orqentis-ai-azure-openai", client => client.Timeout = TimeSpan.FromSeconds(60)), configureHttpClient);
        ConfigureLlmClient(services.AddHttpClient("orqentis-ai-anthropic", client => client.Timeout = TimeSpan.FromSeconds(60)), configureHttpClient);

        services.TryAddSingleton<ILlmProvider, AzureOpenAiLlmProvider>();
        services.TryAddSingleton<ILlmProvider, AnthropicLlmProvider>();
        services.TryAddSingleton<ILlmRouter, LlmRouter>();

        services.TryAddSingleton<IContractSuggestionAgent, ContractSuggestionAgent>();
        services.TryAddSingleton<IContractImprovementAgent, ContractImprovementAgent>();
        services.TryAddSingleton<IBreachImpactScorer, BreachImpactScorer>();
        services.TryAddSingleton<IRemediationAdvisor, RemediationAdvisor>();
        services.TryAddSingleton<INaturalLanguageQueryHandler, NaturalLanguageQueryHandler>();
        return services;
    }

    private static void ConfigureLlmClient(IHttpClientBuilder builder, Action<IHttpClientBuilder>? configureHttpClient)
    {
        builder.AddStandardResilienceHandler(options =>
        {
            options.Retry.MaxRetryAttempts = 3;
            options.Retry.Delay = TimeSpan.FromSeconds(1);
            options.Retry.MaxDelay = TimeSpan.FromSeconds(8);
            options.Retry.BackoffType = DelayBackoffType.Exponential;
            options.Retry.UseJitter = true;
            options.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(60);
            options.CircuitBreaker.MinimumThroughput = 10;
            options.CircuitBreaker.FailureRatio = 1.0;
            options.CircuitBreaker.BreakDuration = TimeSpan.FromSeconds(30);
            options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(15);
            options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(15);
        });
        configureHttpClient?.Invoke(builder);
    }
}
