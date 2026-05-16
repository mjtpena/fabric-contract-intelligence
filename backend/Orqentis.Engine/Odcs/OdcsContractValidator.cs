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
                .Concat(ValidateServerUris(root));

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
