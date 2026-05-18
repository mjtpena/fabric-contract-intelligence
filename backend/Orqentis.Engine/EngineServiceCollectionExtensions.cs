using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Http.Resilience;
using Orqentis.Engine.Delta;
using Orqentis.Engine.Evaluation;
using Orqentis.Engine.Odcs;
using Orqentis.Engine.Scoring;
using Polly;

namespace Orqentis.Engine;

/// <summary>DI registration for the Engine. Call from <c>Orqentis.Api/Program.cs</c>.</summary>
public static class EngineServiceCollectionExtensions
{
    public static IServiceCollection AddOrqentisEngine(this IServiceCollection services, Action<IHttpClientBuilder>? configureHttpClient = null)
    {
        services.TryAddSingleton<ISchemaExtractor, SchemaExtractor>();
        ConfigureOneLakeClient(services.AddHttpClient<IDeltaLogReader, DeltaLogReader>(client => client.Timeout = TimeSpan.FromSeconds(60)), configureHttpClient);
        ConfigureFabricClient(services.AddHttpClient<IFabricSqlClient, FabricSqlClient>(client => client.Timeout = TimeSpan.FromSeconds(30)), configureHttpClient);
        services.TryAddSingleton<OdcsContractSerializer>();
        services.TryAddSingleton<IOdcsContractParser, OdcsContractParser>();
        services.TryAddSingleton<IOdcsContractValidator, OdcsContractValidator>();
        ConfigureFabricClient(services.AddHttpClient<IFabricSqlSchemaReader, FabricSqlSchemaReader>(client => client.Timeout = TimeSpan.FromSeconds(30)), configureHttpClient);
        ConfigureFabricClient(services.AddHttpClient<IFabricKqlSchemaReader, FabricKqlSchemaReader>(client => client.Timeout = TimeSpan.FromSeconds(30)), configureHttpClient);
        ConfigureFabricClient(services.AddHttpClient<IFabricSemanticModelSchemaReader, FabricSemanticModelSchemaReader>(client => client.Timeout = TimeSpan.FromSeconds(30)), configureHttpClient);
        services.TryAddSingleton<ISchemaRuleEvaluator, SchemaRuleEvaluator>();
        services.TryAddSingleton<IFreshnessEvaluator, FreshnessEvaluator>();
        services.TryAddSingleton<IQualityRuleEvaluator, QualityRuleEvaluator>();
        services.TryAddSingleton<IContractHealthScorer, ContractHealthScorer>();
        services.TryAddScoped<IEnforcementOrchestrator, EnforcementOrchestrator>();
        return services;
    }

    private static void ConfigureFabricClient(IHttpClientBuilder builder, Action<IHttpClientBuilder>? configureHttpClient)
    {
        builder.AddStandardResilienceHandler(options => ConfigureResilience(options, TimeSpan.FromSeconds(10)));
        configureHttpClient?.Invoke(builder);
    }

    private static void ConfigureOneLakeClient(IHttpClientBuilder builder, Action<IHttpClientBuilder>? configureHttpClient)
    {
        builder.AddStandardResilienceHandler(options => ConfigureResilience(options, TimeSpan.FromSeconds(10)));
        configureHttpClient?.Invoke(builder);
    }

    private static void ConfigureResilience(HttpStandardResilienceOptions options, TimeSpan attemptTimeout)
    {
        options.Retry.MaxRetryAttempts = 3;
        options.Retry.Delay = TimeSpan.FromSeconds(1);
        options.Retry.MaxDelay = TimeSpan.FromSeconds(8);
        options.Retry.BackoffType = DelayBackoffType.Exponential;
        options.Retry.UseJitter = true;
        options.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(30);
        options.CircuitBreaker.MinimumThroughput = 10;
        options.CircuitBreaker.FailureRatio = 1.0;
        options.CircuitBreaker.BreakDuration = TimeSpan.FromSeconds(30);
        options.AttemptTimeout.Timeout = attemptTimeout;
        options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(60);
    }
}
