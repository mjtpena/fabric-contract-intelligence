using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Orqentis.Engine.Delta;
using Orqentis.Engine.Evaluation;
using Orqentis.Engine.Odcs;

namespace Orqentis.Engine;

/// <summary>DI registration for the Engine. Call from <c>Orqentis.Api/Program.cs</c>.</summary>
public static class EngineServiceCollectionExtensions
{
    public static IServiceCollection AddOrqentisEngine(this IServiceCollection services)
    {
        services.TryAddSingleton<ISchemaExtractor, SchemaExtractor>();
        services.AddHttpClient<IDeltaLogReader, DeltaLogReader>();
        services.AddHttpClient<IFabricSqlClient, FabricSqlClient>();
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
