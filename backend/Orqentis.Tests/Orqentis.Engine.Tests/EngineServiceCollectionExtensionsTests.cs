using Orqentis.Engine;
using Orqentis.Engine.Delta;
using Orqentis.Engine.Evaluation;
using Orqentis.Engine.Odcs;

using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace Orqentis.Tests.Orqentis.Engine.Tests;

public sealed class EngineServiceCollectionExtensionsTests
{
    [Fact]
    public void AddOrqentisEngine_RegistersExpectedServices()
    {
        // Arrange
        var services = new ServiceCollection();
        services.AddLogging();

        // Act
        services.AddOrqentisEngine();
        using var provider = services.BuildServiceProvider();

        // Assert
        provider.GetRequiredService<IDeltaLogReader>().Should().NotBeNull();
        provider.GetRequiredService<IOdcsContractParser>().Should().NotBeNull();
        provider.GetRequiredService<IOdcsContractValidator>().Should().NotBeNull();
        provider.GetRequiredService<OdcsContractSerializer>().Should().NotBeNull();
        provider.GetRequiredService<ISchemaRuleEvaluator>().Should().NotBeNull();
        provider.GetRequiredService<IFreshnessEvaluator>().Should().NotBeNull();
        provider.GetRequiredService<IQualityRuleEvaluator>().Should().NotBeNull();

        using var scope = provider.CreateScope();
        scope.ServiceProvider.GetRequiredService<IEnforcementOrchestrator>().Should().NotBeNull();
    }
}
