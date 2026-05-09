using FCI.Engine.Delta;
using FCI.Engine.Evaluation;
using FCI.Engine.Odcs;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace FCI.Engine;

/// <summary>DI registration for the Engine. Call from <c>FCI.Api/Program.cs</c>.</summary>
public static class EngineServiceCollectionExtensions
{
    public static IServiceCollection AddFciEngine(this IServiceCollection services)
    {
        services.TryAddSingleton<ISchemaExtractor, SchemaExtractor>();
        services.AddHttpClient<IDeltaLogReader, DeltaLogReader>();
        services.TryAddSingleton<OdcsContractSerializer>();
        services.TryAddSingleton<IOdcsContractParser, OdcsContractParser>();
        services.TryAddSingleton<IOdcsContractValidator, OdcsContractValidator>();
        services.TryAddSingleton<ISchemaRuleEvaluator, SchemaRuleEvaluator>();
        services.TryAddSingleton<IFreshnessEvaluator, FreshnessEvaluator>();
        services.TryAddSingleton<IQualityRuleEvaluator, QualityRuleEvaluator>();
        services.TryAddScoped<IEnforcementOrchestrator, EnforcementOrchestrator>();
        return services;
    }
}
