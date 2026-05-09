using Xunit;

namespace Orqentis.Integration.Tests;

/// <summary>
/// Skips live-capacity integration tests until the required Fabric environment variables are supplied.
/// </summary>
[AttributeUsage(AttributeTargets.Method)]
public sealed class LiveFabricFactAttribute : FactAttribute
{
    public LiveFabricFactAttribute()
    {
        var missingVariables = IntegrationTestEnvironment.RequiredVariables
            .Where(static variable => string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(variable)))
            .ToArray();

        if (missingVariables.Length > 0)
        {
            Skip = $"Requires live Fabric configuration: {string.Join(", ", missingVariables)}";
        }
    }
}
