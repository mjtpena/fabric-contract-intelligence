using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Orqentis.AI;

public static class AiServiceCollectionExtensions
{
    public static IServiceCollection AddOrqentisAi(this IServiceCollection services, IConfiguration config)
    {
        services.Configure<AiOptions>(config.GetSection(AiOptions.SectionName));
        services.TryAddSingleton<IContractSuggestionAgent, ContractSuggestionAgent>();
        services.TryAddSingleton<IBreachImpactScorer, BreachImpactScorer>();
        services.TryAddSingleton<IRemediationAdvisor, RemediationAdvisor>();
        return services;
    }
}
