using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Orqentis.Engine.Evaluation;
using Orqentis.Engine.Models;
using Orqentis.Engine.Odcs;

namespace Orqentis.Tests.Orqentis.Engine.Tests.Evaluation;

public sealed class FreshnessEvaluatorTests
{
    [Fact]
    public void Evaluate_NullRule_ReturnsNull()
    {
        // Arrange
        var evaluator = CreateEvaluator();

        // Act
        var result = evaluator.Evaluate(DateTimeOffset.UtcNow.AddHours(-1), null, DateTimeOffset.UtcNow);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void Evaluate_InsideSla_ReturnsPassed()
    {
        // Arrange
        var evaluator = CreateEvaluator();
        var lastModifiedUtc = new DateTimeOffset(2026, 5, 8, 18, 0, 0, TimeSpan.Zero);
        var nowUtc = new DateTimeOffset(2026, 5, 9, 0, 0, 0, TimeSpan.Zero);
        var rule = new FreshnessRule
        {
            MaxAgeHours = 8,
            Severity = "warning",
        };

        // Act
        var result = evaluator.Evaluate(lastModifiedUtc, rule, nowUtc);

        // Assert
        result.Should().NotBeNull();
        result!.Status.Should().Be(RuleStatus.Passed);
        result.MaxAgeHours.Should().Be(8);
        result.AgeHours.Should().Be(6);
    }

    [Fact]
    public void Evaluate_JustOverSlaWithWarningSeverity_ReturnsWarned()
    {
        // Arrange
        var evaluator = CreateEvaluator();
        var lastModifiedUtc = new DateTimeOffset(2026, 5, 8, 17, 0, 0, TimeSpan.Zero);
        var nowUtc = new DateTimeOffset(2026, 5, 9, 0, 15, 0, TimeSpan.Zero);
        var rule = new FreshnessRule
        {
            MaxAgeHours = 7,
            Severity = "warning",
        };

        // Act
        var result = evaluator.Evaluate(lastModifiedUtc, rule, nowUtc);

        // Assert
        result.Should().NotBeNull();
        result!.Status.Should().Be(RuleStatus.Warned);
        result.AgeHours.Should().Be(7.25);
    }

    [Fact]
    public void Evaluate_WayOverSlaWithErrorSeverity_ReturnsFailed()
    {
        // Arrange
        var evaluator = CreateEvaluator();
        var lastModifiedUtc = new DateTimeOffset(2026, 5, 6, 0, 0, 0, TimeSpan.Zero);
        var nowUtc = new DateTimeOffset(2026, 5, 9, 0, 0, 0, TimeSpan.Zero);
        var rule = new FreshnessRule
        {
            MaxAgeHours = 12,
            Severity = "error",
        };

        // Act
        var result = evaluator.Evaluate(lastModifiedUtc, rule, nowUtc);

        // Assert
        result.Should().NotBeNull();
        result!.Status.Should().Be(RuleStatus.Failed);
        result.AgeHours.Should().Be(72);
    }

    private static FreshnessEvaluator CreateEvaluator() =>
        new(NullLogger<FreshnessEvaluator>.Instance);
}
