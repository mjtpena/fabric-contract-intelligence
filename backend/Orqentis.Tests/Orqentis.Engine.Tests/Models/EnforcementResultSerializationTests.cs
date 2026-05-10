using System.Text.Json;
using System.Text.RegularExpressions;
using FluentAssertions;
using Orqentis.Engine.Models;

namespace Orqentis.Tests.Orqentis.Engine.Tests.Models;

public sealed class EnforcementResultSerializationTests
{
    [Fact]
    public void Serialize_ResultJsonMatchesSpecShape()
    {
        // Arrange
        var result = new EnforcementResult
        {
            ContractId = Guid.NewGuid(),
            RunId = Guid.NewGuid(),
            DeltaTableVersion = 42,
            OverallStatus = EnforcementStatus.Failed,
            SchemaRules =
            [
                new RuleResult
                {
                    RuleId = "schema.column.present",
                    Column = "customer_id",
                    Expected = "STRING NOT NULL",
                    Actual = "STRING NULLABLE",
                    Status = RuleStatus.Failed,
                    Message = "Column customer_id is nullable in table but NOT NULL in contract",
                },
            ],
            QualityRules =
            [
                new RuleResult
                {
                    RuleId = "quality.null_rate",
                    Column = "order_date",
                    Threshold = 0.01,
                    Actual = 0.047,
                    Status = RuleStatus.Failed,
                    Message = "Null rate 4.7% exceeds contract threshold of 1%",
                },
            ],
            FreshnessRule = new RuleResult
            {
                RuleId = "freshness.max_age",
                MaxAgeHours = 24,
                LastModifiedUtc = new DateTimeOffset(2026, 5, 8, 10, 0, 0, TimeSpan.Zero),
                AgeHours = 18.4,
                Status = RuleStatus.Passed,
                Message = "Table freshness is within the contract SLA.",
            },
            SchemaDiff = null,
            BreachScore = null,
            RemediationSuggestions =
            [
                "Add NOT NULL constraint to customer_id column in source pipeline",
                "Investigate null order_date values - check pipeline step 'enrich_orders'",
            ],
            CompletedAt = new DateTimeOffset(2026, 5, 9, 0, 0, 0, TimeSpan.Zero),
        };

        // Act
        var json = NormalizeGeneratedValues(JsonSerializer.Serialize(result));

        // Assert
        json.Should().Be("{\"contractId\":\"__GUID__\",\"runId\":\"__GUID__\",\"tableVersion\":42,\"overallStatus\":\"failed\",\"schemaRules\":[{\"ruleId\":\"schema.column.present\",\"column\":\"customer_id\",\"expected\":\"STRING NOT NULL\",\"actual\":\"STRING NULLABLE\",\"status\":\"failed\",\"message\":\"Column customer_id is nullable in table but NOT NULL in contract\"}],\"qualityRules\":[{\"ruleId\":\"quality.null_rate\",\"column\":\"order_date\",\"threshold\":0.01,\"actual\":0.047,\"status\":\"failed\",\"message\":\"Null rate 4.7% exceeds contract threshold of 1%\"}],\"freshnessRule\":{\"ruleId\":\"freshness.max_age\",\"maxAgeHours\":24,\"lastModifiedUtc\":\"__TIMESTAMP__\",\"ageHours\":18.4,\"status\":\"passed\",\"message\":\"Table freshness is within the contract SLA.\"},\"remediationSuggestions\":[\"Add NOT NULL constraint to customer_id column in source pipeline\",\"Investigate null order_date values - check pipeline step \\u0027enrich_orders\\u0027\"],\"completedAt\":\"__TIMESTAMP__\"}");
    }

    [Fact]
    public void SerializeAndDeserialize_RoundTripsWithoutLoss()
    {
        // Arrange
        var original = new EnforcementResult
        {
            ContractId = Guid.NewGuid(),
            RunId = Guid.NewGuid(),
            DeltaTableVersion = 9,
            OverallStatus = EnforcementStatus.Warned,
            SchemaRules =
            [
                new RuleResult
                {
                    RuleId = "schema.column.extra",
                    Column = "legacy_col",
                    Expected = "Not defined in contract",
                    Actual = "STRING NULLABLE",
                    Status = RuleStatus.Warned,
                    Message = "Column legacy_col exists in the live Delta schema but is not defined in the contract.",
                },
            ],
            QualityRules = [],
            FreshnessRule = new RuleResult
            {
                RuleId = "freshness.max_age",
                MaxAgeHours = 25,
                LastModifiedUtc = new DateTimeOffset(2026, 5, 8, 10, 0, 0, TimeSpan.Zero),
                AgeHours = 20,
                Status = RuleStatus.Passed,
                Message = "Table freshness is within the contract SLA.",
            },
            SchemaDiff = new SchemaDiff
            {
                AddedColumns = ["legacy_col"],
                RemovedColumns = ["missing_col"],
                TypeChanges = [new TypeChange("encounter_id", "STRING", "INTEGER")],
                NullabilityChanges = [new NullabilityChange("patient_id", true, false)],
                PartitionChange = new PartitionChange(["encounter_date"], ["facility_id"]),
            },
            BreachScore = 42.5m,
            RemediationSuggestions = ["Do a thing"],
            CompletedAt = new DateTimeOffset(2026, 5, 9, 0, 0, 0, TimeSpan.Zero),
            ErrorMessage = "warn-only flow",
        };

        // Act
        var json = JsonSerializer.Serialize(original);
        var roundTripped = JsonSerializer.Deserialize<EnforcementResult>(json);

        // Assert
        roundTripped.Should().NotBeNull();
        JsonSerializer.Serialize(roundTripped).Should().Be(json);
    }

    private static string NormalizeGeneratedValues(string json)
    {
        json = Regex.Replace(json, "\"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\"", "\"__GUID__\"");
        json = Regex.Replace(json, "\"\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:\\+00:00|Z)\"", "\"__TIMESTAMP__\"");
        return json;
    }
}
