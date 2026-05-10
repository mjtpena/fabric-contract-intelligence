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
            var errors = _schema.Value.Validate(root.GetRawText());

            return errors
                .Select(MapError)
                .ToArray();
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
