using DbUp;
using DbUp.Engine;
using Microsoft.Extensions.Logging;

namespace Orqentis.Data;

/// <summary>
/// Runs all <c>Orqentis.Data/Migrations/V*.sql</c> files (embedded resources) at app startup.
/// Idempotent — DbUp tracks applied scripts in <c>schemaversions</c> table.
/// </summary>
public static class DatabaseMigrator
{
    public static DatabaseUpgradeResult Migrate(string connectionString, ILogger logger)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(connectionString);

        EnsureDatabase.For.PostgresqlDatabase(connectionString);

        var upgrader = DeployChanges.To
            .PostgresqlDatabase(connectionString)
            .WithScriptsEmbeddedInAssembly(typeof(DatabaseMigrator).Assembly)
            .LogToConsole()
            .WithTransactionPerScript()
            .Build();

        logger.LogInformation("Running DbUp migrations…");
        var result = upgrader.PerformUpgrade();

        if (!result.Successful)
        {
            logger.LogError(result.Error, "DbUp migration failed.");
            throw new InvalidOperationException("Database migration failed.", result.Error);
        }

        logger.LogInformation("DbUp migrations complete. {Count} script(s) executed.",
            result.Scripts.Count());
        return result;
    }
}
