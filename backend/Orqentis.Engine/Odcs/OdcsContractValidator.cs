using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using NJsonSchema;
using NJsonSchema.Validation;

namespace Orqentis.Engine.Odcs;

/// <summary>JSON-Schema-backed ODCS validation via NJsonSchema.</summary>
public sealed class OdcsContractValidator : IOdcsContractValidator
{
    private const string _schemaResourceName = "Orqentis.Engine.Odcs.Schema.odcs-v3.1.0.json";

    private static readonly Regex _missingPropertyRegex = new("'(?<property>[^']+)'", RegexOptions.Compiled);

    private readonly Lazy<JsonSchema> _schema;
    private readonly ILogger<OdcsContractValidator> _logger;

    public OdcsContractValidator(ILogger<OdcsContractValidator> logger)
    {
        _logger = logger;
        _schema = new Lazy<JsonSchema>(LoadSchema);
    }

    /// <inheritdoc />
    public IReadOnlyList<OdcsValidationError> Validate(string odcsYaml)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(odcsYaml);

        try
        {
            var root = OdcsYamlJsonConverter.ConvertToJsonElement(odcsYaml);
            var errors = _schema.Value.Validate(root.GetRawText())
                .Select(MapError)
                .Concat(ValidateServerUris(root))
                .Concat(ValidateAiContext(root));

            return errors.ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Contract-ValidateFailed");
            return [new OdcsValidationError("$", ex.Message)];
        }
    }

    private static JsonSchema LoadSchema()
    {
        using var stream = typeof(OdcsContractValidator).Assembly.GetManifestResourceStream(_schemaResourceName)
            ?? throw new InvalidOperationException($"Embedded schema resource '{_schemaResourceName}' was not found.");
        using var reader = new StreamReader(stream);
        var schemaJson = NormalizeSchemaForNJsonSchema(reader.ReadToEnd());
        return JsonSchema.FromJsonAsync(schemaJson).GetAwaiter().GetResult();
    }

    private static string NormalizeSchemaForNJsonSchema(string schemaJson) =>
        schemaJson
            .Replace("\"$defs\"", "\"definitions\"", StringComparison.Ordinal)
            .Replace("#/$defs/", "#/definitions/", StringComparison.Ordinal);

    private static OdcsValidationError MapError(ValidationError error)
    {
        var path = NormalizePath(error);
        return new OdcsValidationError(path, error.ToString());
    }

    private static readonly HashSet<string> _validAiTiers = new(StringComparer.Ordinal)
    {
        "minimal", "limited", "high-risk", "prohibited",
    };

    private static IEnumerable<OdcsValidationError> ValidateAiContext(System.Text.Json.JsonElement root)
    {
        if (!root.TryGetProperty("customProperties", out var custom) || custom.ValueKind != System.Text.Json.JsonValueKind.Array)
        {
            yield break;
        }

        System.Text.Json.JsonElement? aiContextValue = null;
        foreach (var prop in custom.EnumerateArray())
        {
            if (prop.TryGetProperty("property", out var name)
                && name.ValueKind == System.Text.Json.JsonValueKind.String
                && string.Equals(name.GetString(), "orqentisAiContext", StringComparison.Ordinal)
                && prop.TryGetProperty("value", out var value))
            {
                aiContextValue = value;
                break;
            }
        }

        if (aiContextValue is null || aiContextValue.Value.ValueKind != System.Text.Json.JsonValueKind.Object)
        {
            yield break;
        }

        var ai = aiContextValue.Value;

        if (ai.TryGetProperty("useCases", out var useCases) && useCases.ValueKind == System.Text.Json.JsonValueKind.Array)
        {
            var idx = 0;
            foreach (var useCase in useCases.EnumerateArray())
            {
                var basePath = $"$.customProperties[orqentisAiContext].useCases[{idx}]";
                if (useCase.ValueKind != System.Text.Json.JsonValueKind.Object)
                {
                    yield return new OdcsValidationError(basePath, "Use case must be an object.");
                    idx++;
                    continue;
                }

                if (!useCase.TryGetProperty("id", out var id)
                    || id.ValueKind != System.Text.Json.JsonValueKind.String
                    || string.IsNullOrWhiteSpace(id.GetString()))
                {
                    yield return new OdcsValidationError($"{basePath}.id", "Use case id is required and must be a non-empty string.");
                }

                if (useCase.TryGetProperty("tier", out var tier)
                    && tier.ValueKind == System.Text.Json.JsonValueKind.String
                    && !string.IsNullOrEmpty(tier.GetString())
                    && !_validAiTiers.Contains(tier.GetString()!))
                {
                    yield return new OdcsValidationError(
                        $"{basePath}.tier",
                        "tier must be one of: minimal, limited, high-risk, prohibited.");
                }

                idx++;
            }
        }

        var permitted = CollectStringArray(ai, "permittedUses");
        var prohibited = CollectStringArray(ai, "prohibitedUses");
        foreach (var conflict in permitted.Intersect(prohibited, StringComparer.Ordinal))
        {
            yield return new OdcsValidationError(
                "$.customProperties[orqentisAiContext]",
                $"Use '{conflict}' appears in both permittedUses and prohibitedUses.");
        }

        if (ai.TryGetProperty("retentionForTraining", out var retention)
            && retention.ValueKind == System.Text.Json.JsonValueKind.Object
            && retention.TryGetProperty("maxAgeDays", out var maxAge)
            && maxAge.ValueKind == System.Text.Json.JsonValueKind.Number
            && maxAge.TryGetInt32(out var days)
            && days <= 0)
        {
            yield return new OdcsValidationError(
                "$.customProperties[orqentisAiContext].retentionForTraining.maxAgeDays",
                "maxAgeDays must be a positive integer.");
        }
    }

    private static List<string> CollectStringArray(System.Text.Json.JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out var element) || element.ValueKind != System.Text.Json.JsonValueKind.Array)
        {
            return [];
        }

        return element.EnumerateArray()
            .Where(item => item.ValueKind == System.Text.Json.JsonValueKind.String)
            .Select(item => item.GetString()!)
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .ToList();
    }

    private static IEnumerable<OdcsValidationError> ValidateServerUris(System.Text.Json.JsonElement root)
    {
        if (!root.TryGetProperty("servers", out var servers) || servers.ValueKind != System.Text.Json.JsonValueKind.Array)
        {
            yield break;
        }

        var index = 0;
        foreach (var server in servers.EnumerateArray())
        {
            foreach (var propertyName in new[] { "host", "path", "location" })
            {
                if (!server.TryGetProperty(propertyName, out var property) || property.ValueKind != System.Text.Json.JsonValueKind.String)
                {
                    continue;
                }

                var value = property.GetString();
                if (IsUnsafeHttpUri(value))
                {
                    yield return new OdcsValidationError(
                        $"$.servers[{index}].{propertyName}",
                        "HTTP(S) server endpoints must not target localhost, link-local, or private network addresses.");
                }
            }

            index++;
        }
    }

    private static bool IsUnsafeHttpUri(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || !Uri.TryCreate(value, UriKind.Absolute, out var uri))
        {
            return false;
        }

        if (uri.Scheme is not ("http" or "https"))
        {
            return false;
        }

        var host = uri.Host.TrimEnd('.');
        if (host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
            host.Equals("169.254.169.254", StringComparison.OrdinalIgnoreCase) ||
            host.StartsWith("127.", StringComparison.Ordinal))
        {
            return true;
        }

        if (System.Net.IPAddress.TryParse(host, out var address))
        {
            var bytes = address.GetAddressBytes();
            return bytes.Length == 4 &&
                (bytes[0] == 10 ||
                 (bytes[0] == 172 && bytes[1] is >= 16 and <= 31) ||
                 (bytes[0] == 192 && bytes[1] == 168) ||
                 (bytes[0] == 169 && bytes[1] == 254));
        }

        return false;
    }

    private static string NormalizePath(ValidationError error)
    {
        if (!string.IsNullOrWhiteSpace(error.Path))
        {
            var path = error.Path;
            if (path.StartsWith("$", StringComparison.Ordinal))
            {
                return path;
            }

            path = path.StartsWith("#/", StringComparison.Ordinal)
                ? path[2..]
                : path.TrimStart('/');

            return string.IsNullOrWhiteSpace(path)
                ? "$"
                : "$." + path.Replace("/", ".", StringComparison.Ordinal);
        }

        if (!string.IsNullOrWhiteSpace(error.Property))
        {
            return "$." + error.Property;
        }

        var match = _missingPropertyRegex.Match(error.ToString());
        return match.Success
            ? "$." + match.Groups["property"].Value
            : "$";
    }
}
