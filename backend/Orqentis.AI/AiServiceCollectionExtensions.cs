using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Orqentis.AI;

public static class AiServiceCollectionExtensions
{
    public static IServiceCollection AddOrqentisAi(this IServiceCollection services, IConfiguration config)
    {
        services.Configure<AiOptions>(config.GetSection(AiOptions.SectionName));
        services.TryAddSingleton<IPromptLoader, PromptLoader>();
        services.AddHttpClient("orqentis-ai-azure-openai");
        services.AddHttpClient("orqentis-ai-anthropic");

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
}
