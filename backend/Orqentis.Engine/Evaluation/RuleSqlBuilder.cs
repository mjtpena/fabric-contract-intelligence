using System.Globalization;
using Orqentis.Engine.Odcs;

namespace Orqentis.Engine.Evaluation;

/// <summary>Builds quality-rule SQL templates for Fabric SQL execution.</summary>
public static class RuleSqlBuilder
{
    public static string Build(QualityRule rule, ContractServer server)
    {
        ArgumentNullException.ThrowIfNull(rule);
        ArgumentNullException.ThrowIfNull(server);

        var source = ResolveSqlSource(server.Path);
        return rule.Type.Trim().ToLowerInvariant() switch
        {
            "null_rate" or "nullrate" => BuildNullRate(source, RequiredColumn(rule)),
            "uniqueness" => BuildUniqueness(source, RequiredColumn(rule)),
            "regex" => BuildRegexPassRate(source, RequiredColumn(rule), RequiredPattern(rule)),
            "custom_sql" or "customsql" => RequiredSql(rule),
            _ => throw new InvalidOperationException($"Unsupported quality rule type '{rule.Type}'."),
        };
    }

    private static string BuildNullRate(SqlSource source, string column) =>
        $"SELECT CAST(SUM(CASE WHEN [{column}] IS NULL THEN 1 ELSE 0 END) AS FLOAT) / NULLIF(COUNT(*), 0) AS null_rate FROM [{source.Schema}].[{source.Table}];";

    private static string BuildUniqueness(SqlSource source, string column) =>
        $"SELECT CAST(COUNT(DISTINCT [{column}]) AS FLOAT) / NULLIF(COUNT(*), 0) AS uniqueness FROM [{source.Schema}].[{source.Table}];";

    private static string BuildRegexPassRate(SqlSource source, string column, string pattern) =>
        $"SELECT CAST(SUM(CASE WHEN [{column}] LIKE '{EscapeSqlString(pattern)}' THEN 1 ELSE 0 END) AS FLOAT) / NULLIF(COUNT(*), 0) AS regex_pass_rate FROM [{source.Schema}].[{source.Table}];";

    private static SqlSource ResolveSqlSource(string path)
    {
        var marker = "/Tables/";
        var markerIndex = path.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (markerIndex < 0)
        {
            return new SqlSource("dbo", "unknown_table");
        }

        var tableSegment = path[(markerIndex + marker.Length)..].Trim('/');
        if (string.IsNullOrWhiteSpace(tableSegment))
        {
            return new SqlSource("dbo", "unknown_table");
        }

        var segments = tableSegment.Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (segments.Length >= 2)
        {
            return new SqlSource(segments[0], segments[1]);
        }

        return new SqlSource("dbo", segments[0]);
    }

    private static string RequiredColumn(QualityRule rule) =>
        !string.IsNullOrWhiteSpace(rule.Column)
            ? rule.Column.Trim()
            : throw new InvalidOperationException($"Rule '{rule.Type}' requires a column.");

    private static string RequiredPattern(QualityRule rule) =>
        !string.IsNullOrWhiteSpace(rule.Pattern)
            ? rule.Pattern.Trim()
            : throw new InvalidOperationException("Regex rule requires a pattern.");

    private static string RequiredSql(QualityRule rule) =>
        !string.IsNullOrWhiteSpace(rule.Sql)
            ? rule.Sql.Trim()
            : throw new InvalidOperationException("custom_sql rule requires SQL.");

    private static string EscapeSqlString(string value) =>
        value.Replace("'", "''", StringComparison.Ordinal);

    private sealed record SqlSource(string Schema, string Table);
}
