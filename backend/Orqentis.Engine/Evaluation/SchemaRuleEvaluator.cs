using Microsoft.Extensions.Logging;
using Orqentis.Engine.Delta;
using Orqentis.Engine.Models;
using Orqentis.Engine.Odcs;

namespace Orqentis.Engine.Evaluation;

/// <summary>Implements the schema rules defined in spec §9.4.</summary>
public sealed class SchemaRuleEvaluator : ISchemaRuleEvaluator
{
    private readonly ILogger<SchemaRuleEvaluator> _logger;

    public SchemaRuleEvaluator(ILogger<SchemaRuleEvaluator> logger) => _logger = logger;

    public IReadOnlyList<RuleResult> Evaluate(
        DeltaSchema liveSchema,
        IReadOnlyList<ContractColumn> contractSchema,
        IReadOnlyList<string> livePartitionColumns)
    {
        ArgumentNullException.ThrowIfNull(liveSchema);
        ArgumentNullException.ThrowIfNull(contractSchema);
        ArgumentNullException.ThrowIfNull(livePartitionColumns);

        var results = new List<RuleResult>();
        var liveLookup = liveSchema.Columns.ToDictionary(static column => column.Name, StringComparer.OrdinalIgnoreCase);

        foreach (var contractColumn in contractSchema)
        {
            if (!liveLookup.TryGetValue(contractColumn.Name, out var liveColumn))
            {
                results.Add(new RuleResult
                {
                    RuleId = "schema.column.present",
                    Column = contractColumn.Name,
                    Status = RuleStatus.Failed,
                    Message = $"Column {contractColumn.Name} is missing from the live Delta schema.",
                    Expected = FormatContractColumn(contractColumn),
                    Actual = "MISSING",
                });

                continue;
            }

            results.Add(new RuleResult
            {
                RuleId = "schema.column.present",
                Column = contractColumn.Name,
                Status = RuleStatus.Passed,
                Message = $"Column {contractColumn.Name} exists in the live Delta schema.",
                Expected = FormatContractColumn(contractColumn),
                Actual = FormatLiveColumn(liveColumn),
            });

            var typeMatches = string.Equals(
                NormalizeType(contractColumn.Type),
                NormalizeType(liveColumn.Type),
                StringComparison.Ordinal);

            results.Add(new RuleResult
            {
                RuleId = "schema.column.type",
                Column = contractColumn.Name,
                Status = typeMatches ? RuleStatus.Passed : RuleStatus.Failed,
                Message = typeMatches
                    ? $"Column {contractColumn.Name} type matches the contract."
                    : $"Column {contractColumn.Name} type {NormalizeType(liveColumn.Type)} does not match contract type {NormalizeType(contractColumn.Type)}.",
                Expected = NormalizeType(contractColumn.Type),
                Actual = NormalizeType(liveColumn.Type),
            });

            var nullabilityPassed = !contractColumn.Required || !liveColumn.Nullable;
            results.Add(new RuleResult
            {
                RuleId = "schema.column.nullable",
                Column = contractColumn.Name,
                Status = nullabilityPassed ? RuleStatus.Passed : RuleStatus.Failed,
                Message = nullabilityPassed
                    ? $"Column {contractColumn.Name} nullability satisfies the contract."
                    : $"Column {contractColumn.Name} is nullable in table but NOT NULL in contract.",
                Expected = contractColumn.Required ? "NOT NULL" : "NULLABLE",
                Actual = liveColumn.Nullable ? "NULLABLE" : "NOT NULL",
            });
        }

        var extraColumns = liveSchema.Columns
            .Where(column => !contractSchema.Any(contractColumn => string.Equals(contractColumn.Name, column.Name, StringComparison.OrdinalIgnoreCase)))
            .ToArray();

        if (extraColumns.Length == 0)
        {
            results.Add(new RuleResult
            {
                RuleId = "schema.column.extra",
                Status = RuleStatus.Passed,
                Message = "No extra live columns were found outside the contract.",
                Expected = Array.Empty<string>(),
                Actual = Array.Empty<string>(),
            });
        }
        else
        {
            results.AddRange(extraColumns.Select(static column => new RuleResult
            {
                RuleId = "schema.column.extra",
                Column = column.Name,
                Status = RuleStatus.Warned,
                Message = $"Column {column.Name} exists in the live Delta schema but is not defined in the contract.",
                Expected = "Not defined in contract",
                Actual = FormatLiveColumn(column),
            }));
        }

        var expectedPartitionColumns = contractSchema
            .Where(static column => column.PartitionKeyPosition is > 0)
            .OrderBy(static column => column.PartitionKeyPosition)
            .Select(static column => column.Name)
            .ToArray();

        if (expectedPartitionColumns.Length > 0)
        {
            var partitionMatches = expectedPartitionColumns.SequenceEqual(livePartitionColumns, StringComparer.OrdinalIgnoreCase);
            results.Add(new RuleResult
            {
                RuleId = "schema.partition.match",
                Status = partitionMatches ? RuleStatus.Passed : RuleStatus.Warned,
                Message = partitionMatches
                    ? "Table partitioning matches the contract."
                    : "Table partitioning does not match the contract.",
                Expected = expectedPartitionColumns,
                Actual = livePartitionColumns.ToArray(),
            });
        }

        _logger.LogDebug(
            "Schema-Evaluate Columns={ColumnCount} Rules={RuleCount}",
            contractSchema.Count,
            results.Count);

        return results;
    }

    private static string FormatContractColumn(ContractColumn column) =>
        $"{NormalizeType(column.Type)} {(column.Required ? "NOT NULL" : "NULLABLE")}";

    private static string FormatLiveColumn(DeltaColumn column) =>
        $"{NormalizeType(column.Type)} {(column.Nullable ? "NULLABLE" : "NOT NULL")}";

    private static string NormalizeType(string type) =>
        type.Trim().ToUpperInvariant() switch
        {
            "INT" => "INTEGER",
            "BOOL" => "BOOLEAN",
            _ => type.Trim().ToUpperInvariant(),
        };
}
