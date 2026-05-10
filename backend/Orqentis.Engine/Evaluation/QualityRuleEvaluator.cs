using Orqentis.Engine.Models;
using Orqentis.Engine.Odcs;
using Microsoft.Extensions.Logging;

namespace Orqentis.Engine.Evaluation;

/// <summary>Evaluates ODCS quality rules using Fabric SQL scalar queries.</summary>
public sealed class QualityRuleEvaluator : IQualityRuleEvaluator
{
    private static readonly string[] ForbiddenCustomSqlTokens = ["${", "#{", "{", "}"];

    private readonly IFabricSqlClient _fabricSqlClient;
    private readonly ILogger<QualityRuleEvaluator> _logger;

    public QualityRuleEvaluator(IFabricSqlClient fabricSqlClient, ILogger<QualityRuleEvaluator> logger)
    {
        _fabricSqlClient = fabricSqlClient;
        _logger = logger;
    }

    public async Task<IReadOnlyList<RuleResult>> EvaluateAsync(
        IReadOnlyList<QualityRule> rules,
        ContractServer server,
        string fabricSqlOboToken,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(rules);
        ArgumentNullException.ThrowIfNull(server);

        var results = new List<RuleResult>();
        foreach (var rule in rules)
        {
            if (IsUnsafeCustomSql(rule, out var unsafeReason))
            {
                results.Add(new RuleResult
                {
                    RuleId = "quality.custom_sql.safe",
                    Column = rule.Column,
                    Status = RuleStatus.Failed,
                    Threshold = rule.Threshold,
                    Message = unsafeReason,
                });
                continue;
            }

            try
            {
                var sql = RuleSqlBuilder.Build(rule, server);
                var actual = await _fabricSqlClient
                    .ExecuteScalarAsync(server, sql, fabricSqlOboToken, ct)
                    .ConfigureAwait(false);

                results.Add(EvaluateRule(rule, actual));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "QualityRule-EvaluateFailed Type={Type} Column={Column}", rule.Type, rule.Column);
                results.Add(new RuleResult
                {
                    RuleId = $"quality.{NormalizeRuleType(rule.Type)}",
                    Column = rule.Column,
                    Status = SeverityToFailureStatus(rule.Severity),
                    Threshold = rule.Threshold,
                    Message = $"Quality rule execution failed: {ex.Message}",
                });
            }
        }

        return results;
    }

    private static RuleResult EvaluateRule(QualityRule rule, double? actual)
    {
        var ruleType = NormalizeRuleType(rule.Type);
        var threshold = rule.Threshold;
        if (actual is null || threshold is null && !IsCustomSql(ruleType))
        {
            return new RuleResult
            {
                RuleId = $"quality.{ruleType}",
                Column = rule.Column,
                Status = RuleStatus.Skipped,
                Threshold = threshold,
                Actual = actual,
                Message = "Rule skipped because no comparable scalar value was returned.",
            };
        }

        var status = ruleType switch
        {
            "null_rate" => actual <= threshold ? RuleStatus.Passed : SeverityToFailureStatus(rule.Severity),
            "uniqueness" => actual >= threshold ? RuleStatus.Passed : SeverityToFailureStatus(rule.Severity),
            "regex" => actual >= threshold ? RuleStatus.Passed : SeverityToFailureStatus(rule.Severity),
            "custom_sql" => actual <= 0 ? RuleStatus.Passed : SeverityToFailureStatus(rule.Severity),
            _ => RuleStatus.Skipped,
        };

        return new RuleResult
        {
            RuleId = $"quality.{ruleType}",
            Column = rule.Column,
            Status = status,
            Threshold = threshold,
            Actual = actual,
            Message = status == RuleStatus.Passed
                ? "Quality rule satisfied."
                : status == RuleStatus.Skipped
                    ? "Quality rule skipped."
                    : "Quality rule violated.",
        };
    }

    private static bool IsUnsafeCustomSql(QualityRule rule, out string reason)
    {
        reason = string.Empty;
        if (!IsCustomSql(NormalizeRuleType(rule.Type)))
        {
            return false;
        }

        var sql = rule.Sql ?? string.Empty;
        if (ForbiddenCustomSqlTokens.Any(sql.Contains))
        {
            reason = "custom_sql contains unsupported template placeholders; use bound parameters only.";
            return true;
        }

        return false;
    }

    private static bool IsCustomSql(string type) =>
        string.Equals(type, "custom_sql", StringComparison.OrdinalIgnoreCase);

    private static RuleStatus SeverityToFailureStatus(string severity) =>
        string.Equals(severity, "warn", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(severity, "warning", StringComparison.OrdinalIgnoreCase)
            ? RuleStatus.Warned
            : RuleStatus.Failed;

    private static string NormalizeRuleType(string rawType) =>
        rawType.Trim().ToLowerInvariant() switch
        {
            "nullrate" => "null_rate",
            "customsql" => "custom_sql",
            _ => rawType.Trim().ToLowerInvariant(),
        };
}
