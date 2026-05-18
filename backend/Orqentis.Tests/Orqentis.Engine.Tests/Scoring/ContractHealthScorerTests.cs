using FluentAssertions;
using Orqentis.Engine.Models;
using Orqentis.Engine.Odcs;
using Orqentis.Engine.Scoring;

namespace Orqentis.Tests.Orqentis.Engine.Tests.Scoring;

public sealed class ContractHealthScorerTests
{
    private static ContractDefinition MinimalContract() => new()
    {
        ApiVersion = "v3.1.0",
        Kind = "DataContract",
        Id = "c1",
        Name = "c1",
        Version = "1.0.0",
        Status = "active",
        Info = new ContractInfo { Title = "c1", Owner = "x@y" },
        Servers = [],
        Schema = [],
    };

    private static EnforcementResult MakeRun(IReadOnlyList<RuleResult> schema, IReadOnlyList<RuleResult> quality, RuleResult? freshness = null) => new()
    {
        ContractId = Guid.NewGuid(),
        RunId = Guid.NewGuid(),
        DeltaTableVersion = 1,
        OverallStatus = EnforcementStatus.Passed,
        SchemaRules = schema,
        QualityRules = quality,
        FreshnessRule = freshness,
        CompletedAt = DateTimeOffset.UtcNow,
    };

    private static RuleResult Pass(string id) => new() { RuleId = id, Status = RuleStatus.Passed, Message = "ok" };
    private static RuleResult Fail(string id) => new() { RuleId = id, Status = RuleStatus.Failed, Message = "bad" };

    [Fact]
    public void Compute_AllDimensionsPerfect_Returns100Green()
    {
        var scorer = new ContractHealthScorer();
        var run = MakeRun(
            schema: [Pass("s1"), Pass("s2")],
            quality: [Pass("q1"), Pass("q2"), Pass("q3")],
            freshness: new RuleResult { RuleId = "f", Status = RuleStatus.Passed, Message = "fresh" });

        var context = new ContractHealthContext
        {
            SensitivityLabelSynced = true,
            ApprovalUpToDate = true,
            LineageRecorded = true,
            EvidenceCitedRatio = 1.0,
        };

        var result = scorer.Compute(MinimalContract(), run, context);

        result.Score.Should().Be(100);
        result.Grade.Should().Be(HealthScoreGrade.Green);
    }

    [Fact]
    public void Compute_AllDimensionsZero_ReturnsZeroRed()
    {
        var scorer = new ContractHealthScorer();
        var run = MakeRun(
            schema: [Fail("s1")],
            quality: [Fail("q1")],
            freshness: new RuleResult { RuleId = "f", Status = RuleStatus.Failed, Message = "stale" });

        var context = new ContractHealthContext
        {
            SensitivityLabelSynced = false,
            ApprovalUpToDate = false,
            LineageRecorded = false,
            EvidenceCitedRatio = 0.0,
        };

        var result = scorer.Compute(MinimalContract(), run, context);

        result.Score.Should().Be(0);
        result.Grade.Should().Be(HealthScoreGrade.Red);
    }

    [Fact]
    public void Compute_HalfQualityRulesFailed_ReducesScore()
    {
        var scorer = new ContractHealthScorer();
        var run = MakeRun(
            schema: [Pass("s1")],
            quality: [Pass("q1"), Fail("q2")],
            freshness: new RuleResult { RuleId = "f", Status = RuleStatus.Passed, Message = "ok" });

        var context = new ContractHealthContext
        {
            SensitivityLabelSynced = true,
            ApprovalUpToDate = true,
            LineageRecorded = true,
            EvidenceCitedRatio = 1.0,
        };

        var result = scorer.Compute(MinimalContract(), run, context);

        result.Dimensions["qualityRulePassRate"].Should().Be(0.5);
        result.Score.Should().BeLessThan(100);
        result.Score.Should().BeGreaterThan(80);
    }

    [Fact]
    public void Compute_FreshnessWarned_GetsHalfCredit()
    {
        var scorer = new ContractHealthScorer();
        var run = MakeRun(
            schema: [Pass("s1")],
            quality: [Pass("q1")],
            freshness: new RuleResult { RuleId = "f", Status = RuleStatus.Warned, Message = "drift" });

        var context = new ContractHealthContext
        {
            SensitivityLabelSynced = true,
            ApprovalUpToDate = true,
            LineageRecorded = true,
            EvidenceCitedRatio = 1.0,
        };

        var result = scorer.Compute(MinimalContract(), run, context);

        result.Dimensions["freshnessSlaMet"].Should().Be(0.5);
    }

    [Fact]
    public void Compute_NoEnforcementRun_TreatsRuleDimensionsAsZero()
    {
        var scorer = new ContractHealthScorer();
        var context = new ContractHealthContext
        {
            SensitivityLabelSynced = true,
            ApprovalUpToDate = true,
            LineageRecorded = true,
            EvidenceCitedRatio = 1.0,
        };

        var result = scorer.Compute(MinimalContract(), latestRun: null, context);

        result.Dimensions["schemaValidity"].Should().Be(0.0);
        result.Dimensions["qualityRulePassRate"].Should().Be(0.0);
        result.Dimensions["freshnessSlaMet"].Should().Be(1.0);
    }

    [Fact]
    public void Compute_CustomWeights_HonoursDistribution()
    {
        var scorer = new ContractHealthScorer();
        var weights = new HealthScoreWeights
        {
            SchemaValidity = 1.0,
            QualityRulePassRate = 0.0,
            FreshnessSlaMet = 0.0,
            SensitivityLabelSet = 0.0,
            ApprovalUpToDate = 0.0,
            LineageCompleteness = 0.0,
            EvidenceCitedRatio = 0.0,
        };
        var run = MakeRun(
            schema: [Pass("s1")],
            quality: [Fail("q1")]);

        var result = scorer.Compute(MinimalContract(), run, new ContractHealthContext(), weights);

        result.Score.Should().Be(100);
    }

    [Fact]
    public void Compute_NullContract_Throws()
    {
        var scorer = new ContractHealthScorer();

        Action act = () => scorer.Compute(null!, null, new ContractHealthContext());

        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Compute_AmberRange_GradesAmber()
    {
        var scorer = new ContractHealthScorer();
        // schema 1.0, quality 1.0, freshness 0.0, label 0, approval 1, lineage 0, evidence 1
        // weighted = .20 + .25 + 0 + 0 + .10 + 0 + .10 = .65 → 65 → Amber (60–79)
        var run = MakeRun(
            schema: [Pass("s")],
            quality: [Pass("q")],
            freshness: new RuleResult { RuleId = "f", Status = RuleStatus.Failed, Message = "stale" });

        var result = scorer.Compute(MinimalContract(), run, new ContractHealthContext
        {
            SensitivityLabelSynced = false,
            ApprovalUpToDate = true,
            LineageRecorded = false,
            EvidenceCitedRatio = 1.0,
        });

        result.Score.Should().Be(65);
        result.Grade.Should().Be(HealthScoreGrade.Amber);
    }
}
