using Orqentis.Engine.Models;
using Orqentis.Engine.Odcs;

namespace Orqentis.Engine.Scoring;

/// <summary>
/// Computes a 0–100 Contract Health Score by aggregating seven governance signals.
/// The weighting model is sourced from the Collibra Trust Score pattern (see
/// <c>files/plan-data-security-for-ai.md §5.3</c>) but adapted to ODCS v3.1.0:
/// schema validity, quality pass-rate, freshness SLA, sensitivity label presence,
/// approval state, lineage completeness, and evidence-cited ratio.
/// </summary>
public interface IContractHealthScorer
{
    ContractHealthScore Compute(
        ContractDefinition contract,
        EnforcementResult? latestRun,
        ContractHealthContext context,
        HealthScoreWeights? weights = null);
}

/// <summary>
/// Inputs that aren't part of the contract YAML itself — fed in by the orchestrator
/// from the database (approval state, sensitivity-label sync state, lineage metadata).
/// </summary>
public sealed record ContractHealthContext
{
    public bool SensitivityLabelSynced { get; init; }
    public bool ApprovalUpToDate { get; init; }
    public bool LineageRecorded { get; init; }
    /// <summary>Fraction of risk fields that cite evidence (Purview label, column, approval id).</summary>
    public double EvidenceCitedRatio { get; init; }
}

public sealed record HealthScoreWeights
{
    public required double SchemaValidity { get; init; }
    public required double QualityRulePassRate { get; init; }
    public required double FreshnessSlaMet { get; init; }
    public required double SensitivityLabelSet { get; init; }
    public required double ApprovalUpToDate { get; init; }
    public required double LineageCompleteness { get; init; }
    public required double EvidenceCitedRatio { get; init; }

    /// <summary>Default profile from the plan: [.20, .25, .15, .10, .10, .10, .10].</summary>
    public static HealthScoreWeights Default { get; } = new()
    {
        SchemaValidity = 0.20,
        QualityRulePassRate = 0.25,
        FreshnessSlaMet = 0.15,
        SensitivityLabelSet = 0.10,
        ApprovalUpToDate = 0.10,
        LineageCompleteness = 0.10,
        EvidenceCitedRatio = 0.10,
    };

    internal double Sum =>
        SchemaValidity + QualityRulePassRate + FreshnessSlaMet + SensitivityLabelSet
        + ApprovalUpToDate + LineageCompleteness + EvidenceCitedRatio;
}

public sealed record ContractHealthScore
{
    public required int Score { get; init; }
    public required HealthScoreGrade Grade { get; init; }
    public required IReadOnlyDictionary<string, double> Dimensions { get; init; }
}

public enum HealthScoreGrade
{
    Green,
    Amber,
    Red,
}

public sealed class ContractHealthScorer : IContractHealthScorer
{
    public ContractHealthScore Compute(
        ContractDefinition contract,
        EnforcementResult? latestRun,
        ContractHealthContext context,
        HealthScoreWeights? weights = null)
    {
        ArgumentNullException.ThrowIfNull(contract);
        ArgumentNullException.ThrowIfNull(context);

        var w = weights ?? HealthScoreWeights.Default;
        if (w.Sum <= 0)
        {
            throw new ArgumentException("Weights must sum to a positive value.", nameof(weights));
        }

        var schemaValidity = ComputeSchemaValidity(latestRun);
        var qualityPassRate = ComputeQualityPassRate(latestRun);
        var freshnessMet = ComputeFreshnessMet(latestRun);
        var labelSet = context.SensitivityLabelSynced ? 1.0 : 0.0;
        var approval = context.ApprovalUpToDate ? 1.0 : 0.0;
        var lineage = context.LineageRecorded ? 1.0 : 0.0;
        var evidence = Math.Clamp(context.EvidenceCitedRatio, 0.0, 1.0);

        var weighted =
            (schemaValidity * w.SchemaValidity)
            + (qualityPassRate * w.QualityRulePassRate)
            + (freshnessMet * w.FreshnessSlaMet)
            + (labelSet * w.SensitivityLabelSet)
            + (approval * w.ApprovalUpToDate)
            + (lineage * w.LineageCompleteness)
            + (evidence * w.EvidenceCitedRatio);

        var normalised = weighted / w.Sum;
        var score = (int)Math.Round(normalised * 100, MidpointRounding.AwayFromZero);
        score = Math.Clamp(score, 0, 100);

        var dims = new Dictionary<string, double>
        {
            ["schemaValidity"] = schemaValidity,
            ["qualityRulePassRate"] = qualityPassRate,
            ["freshnessSlaMet"] = freshnessMet,
            ["sensitivityLabelSet"] = labelSet,
            ["approvalUpToDate"] = approval,
            ["lineageCompleteness"] = lineage,
            ["evidenceCitedRatio"] = evidence,
        };

        return new ContractHealthScore
        {
            Score = score,
            Grade = score >= 80 ? HealthScoreGrade.Green : score >= 60 ? HealthScoreGrade.Amber : HealthScoreGrade.Red,
            Dimensions = dims,
        };
    }

    private static double ComputeSchemaValidity(EnforcementResult? run)
    {
        if (run is null || run.SchemaRules.Count == 0)
        {
            return run is null ? 0.0 : 1.0;
        }

        var passed = run.SchemaRules.Count(r => r.Status == RuleStatus.Passed);
        return (double)passed / run.SchemaRules.Count;
    }

    private static double ComputeQualityPassRate(EnforcementResult? run)
    {
        if (run is null || run.QualityRules.Count == 0)
        {
            return run is null ? 0.0 : 1.0;
        }

        var passed = run.QualityRules.Count(r => r.Status == RuleStatus.Passed);
        return (double)passed / run.QualityRules.Count;
    }

    private static double ComputeFreshnessMet(EnforcementResult? run)
    {
        if (run?.FreshnessRule is null)
        {
            return 1.0;
        }

        return run.FreshnessRule.Status switch
        {
            RuleStatus.Passed => 1.0,
            RuleStatus.Warned => 0.5,
            RuleStatus.Skipped => 1.0,
            _ => 0.0,
        };
    }
}
