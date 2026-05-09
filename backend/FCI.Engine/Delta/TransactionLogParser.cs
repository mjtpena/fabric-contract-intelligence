using System.Globalization;
using System.Text.Json;

namespace FCI.Engine.Delta;

/// <summary>Parses Delta transaction-log JSONL commit files into typed commit records.</summary>
internal sealed class TransactionLogParser
{
    public TransactionLogCommit Parse(long version, string content)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(content);

        DeltaMetadataAction? metadata = null;
        DateTimeOffset? commitTimestampUtc = null;
        var actions = new List<TransactionLogAction>();

        foreach (var line in ReadJsonLines(content))
        {
            using var document = JsonDocument.Parse(line);
            var root = document.RootElement;

            if (root.TryGetProperty("metaData", out var metadataElement))
            {
                metadata = ParseMetadata(metadataElement);
                actions.Add(metadata);
                continue;
            }

            if (root.TryGetProperty("add", out var addElement))
            {
                actions.Add(new AddFileAction(addElement.GetProperty("path").GetString() ?? string.Empty));
                continue;
            }

            if (root.TryGetProperty("remove", out var removeElement))
            {
                actions.Add(new RemoveFileAction(removeElement.GetProperty("path").GetString() ?? string.Empty));
                continue;
            }

            if (root.TryGetProperty("commitInfo", out var commitInfoElement))
            {
                commitTimestampUtc = ParseCommitTimestamp(commitInfoElement);
                if (commitTimestampUtc is not null)
                {
                    actions.Add(new CommitInfoAction(commitTimestampUtc.Value));
                }
            }
        }

        return new TransactionLogCommit
        {
            Version = version,
            Metadata = metadata,
            CommitTimestampUtc = commitTimestampUtc,
            Actions = actions,
        };
    }

    private static IEnumerable<string> ReadJsonLines(string content) =>
        content
            .Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(static line => !string.IsNullOrWhiteSpace(line));

    private static DeltaMetadataAction ParseMetadata(JsonElement metadataElement)
    {
        var partitionColumns = metadataElement.TryGetProperty("partitionColumns", out var partitionElement)
            ? partitionElement.EnumerateArray()
                .Select(static value => value.GetString())
                .Where(static value => !string.IsNullOrWhiteSpace(value))
                .Cast<string>()
                .ToArray()
            : [];

        var schemaString = metadataElement.GetProperty("schemaString").GetString();
        if (string.IsNullOrWhiteSpace(schemaString))
        {
            throw new InvalidOperationException("Delta metaData.schemaString must be present.");
        }

        return new DeltaMetadataAction(
            ParseSchema(schemaString),
            partitionColumns);
    }

    private static DeltaSchema ParseSchema(string schemaString)
    {
        using var document = JsonDocument.Parse(schemaString);
        var fields = document.RootElement.GetProperty("fields");

        var columns = fields.EnumerateArray().Select(ParseColumn).ToArray();

        return new DeltaSchema
        {
            Columns = columns,
        };
    }

    private static DeltaColumn ParseColumn(JsonElement fieldElement)
    {
        var metadata = fieldElement.TryGetProperty("metadata", out var metadataElement)
            ? ParseMetadataMap(metadataElement)
            : null;

        return new DeltaColumn
        {
            Name = fieldElement.GetProperty("name").GetString() ?? string.Empty,
            Type = ParseColumnType(fieldElement.GetProperty("type")),
            Nullable = fieldElement.TryGetProperty("nullable", out var nullableElement) && nullableElement.GetBoolean(),
            Metadata = metadata,
        };
    }

    private static IReadOnlyDictionary<string, string>? ParseMetadataMap(JsonElement metadataElement)
    {
        if (metadataElement.ValueKind != JsonValueKind.Object || !metadataElement.EnumerateObject().Any())
        {
            return null;
        }

        return metadataElement
            .EnumerateObject()
            .ToDictionary(
                static property => property.Name,
                static property => property.Value.ValueKind == JsonValueKind.String
                    ? property.Value.GetString() ?? string.Empty
                    : property.Value.ToString());
    }

    private static string ParseColumnType(JsonElement typeElement) =>
        typeElement.ValueKind == JsonValueKind.String
            ? typeElement.GetString() ?? string.Empty
            : typeElement.GetRawText();

    private static DateTimeOffset? ParseCommitTimestamp(JsonElement commitInfoElement)
    {
        if (!commitInfoElement.TryGetProperty("timestamp", out var timestampElement))
        {
            return null;
        }

        return timestampElement.ValueKind switch
        {
            JsonValueKind.Number when timestampElement.TryGetInt64(out var epochMillis) =>
                DateTimeOffset.FromUnixTimeMilliseconds(epochMillis),
            JsonValueKind.String when DateTimeOffset.TryParse(
                timestampElement.GetString(),
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out var timestamp) => timestamp,
            _ => null,
        };
    }
}

internal sealed record TransactionLogCommit
{
    public required long Version { get; init; }

    public DeltaMetadataAction? Metadata { get; init; }

    public DateTimeOffset? CommitTimestampUtc { get; init; }

    public required IReadOnlyList<TransactionLogAction> Actions { get; init; }
}

internal abstract record TransactionLogAction;

internal sealed record DeltaMetadataAction(
    DeltaSchema Schema,
    IReadOnlyList<string> PartitionColumns) : TransactionLogAction;

internal sealed record AddFileAction(string Path) : TransactionLogAction;

internal sealed record RemoveFileAction(string Path) : TransactionLogAction;

internal sealed record CommitInfoAction(DateTimeOffset TimestampUtc) : TransactionLogAction;
