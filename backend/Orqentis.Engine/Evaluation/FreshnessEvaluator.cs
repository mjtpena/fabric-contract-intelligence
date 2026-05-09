using Orqentis.Engine.Models;
using Orqentis.Engine.Odcs;
using Microsoft.Extensions.Logging;

namespace Orqentis.Engine.Evaluation;

/// <summary>Evaluates <c>freshness.max_age</c> against the latest Delta commit time.</summary>
public sealed class FreshnessEvaluator : IFreshnessEvaluator
{
    private readonly ILogger<FreshnessEvaluator> _logger;

    public FreshnessEvaluator(ILogger<FreshnessEvaluator> logger) => _logger = logger;

    public RuleResult? Evaluate(DateTimeOffset lastModifiedUtc, FreshnessRule? rule, DateTimeOffset nowUtc)
    {
        if (rule is null)
        {
            return null;
        }

        var ageHours = Math.Round(Math.Max(0, (nowUtc - lastModifiedUtc).TotalHours), 2, MidpointRounding.AwayFromZero);
        var isWithinSla = ageHours <= rule.MaxAgeHours;
        var status = isWithinSla ? RuleStatus.Passed : ResolveFailureStatus(rule.Severity);

        _logger.LogDebug(
            "Freshness-Evaluate MaxAgeHours={MaxAgeHours} AgeHours={AgeHours} Status={Status}",
            rule.MaxAgeHours,
            ageHours,
            status);

        return new RuleResult
        {
            RuleId = "freshness.max_age",
            Status = status,
            Message = isWithinSla
                ? "Table freshness is within the contract SLA."
                : $"Table age {ageHours} hours exceeds the contract maximum of {rule.MaxAgeHours} hours.",
            MaxAgeHours = rule.MaxAgeHours,
            LastModifiedUtc = lastModifiedUtc,
            AgeHours = ageHours,
        };
    }

    private static RuleStatus ResolveFailureStatus(string severity) =>
        severity.Trim().ToLowerInvariant() switch
        {
            "warning" or "warn" or "warned" => RuleStatus.Warned,
            _ => RuleStatus.Failed,
        };
}
