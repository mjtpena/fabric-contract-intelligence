using FCI.Engine;
using FCI.Engine.Delta;
using FCI.Engine.Evaluation;
using FCI.Engine.Odcs;

using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace FCI.Tests.FCI.Engine.Tests;

public sealed class EngineServiceCollectionExtensionsTests
{
    [Fact]
    public void AddFciEngine_RegistersExpectedServices()
    {
        // Arrange
        var services = new ServiceCollection();
        services.AddLogging();

        // Act
        services.AddFciEngine();
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
