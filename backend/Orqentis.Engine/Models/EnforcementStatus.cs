using System.Text.Json;
using System.Text.Json.Serialization;

namespace Orqentis.Engine.Models;

/// <summary>Overall enforcement run status.</summary>
[JsonConverter(typeof(EnforcementStatusJsonConverter))]
public enum EnforcementStatus
{
    Passed,
    Warned,
    Failed,
    Error
}

/// <summary>Status for a single rule evaluation.</summary>
[JsonConverter(typeof(RuleStatusJsonConverter))]
public enum RuleStatus
{
    Passed,
    Warned,
    Failed,
    Skipped
}

internal sealed class EnforcementStatusJsonConverter : JsonConverter<EnforcementStatus>
{
    public override EnforcementStatus Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
        reader.GetString()?.ToLowerInvariant() switch
        {
            "passed" => EnforcementStatus.Passed,
            "warned" => EnforcementStatus.Warned,
            "failed" => EnforcementStatus.Failed,
            "error" => EnforcementStatus.Error,
            _ => throw new JsonException("Unsupported enforcement status."),
        };

    public override void Write(Utf8JsonWriter writer, EnforcementStatus value, JsonSerializerOptions options) =>
        writer.WriteStringValue(value switch
        {
            EnforcementStatus.Passed => "passed",
            EnforcementStatus.Warned => "warned",
            EnforcementStatus.Failed => "failed",
            EnforcementStatus.Error => "error",
            _ => throw new JsonException("Unsupported enforcement status."),
        });
}

internal sealed class RuleStatusJsonConverter : JsonConverter<RuleStatus>
{
    public override RuleStatus Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
        reader.GetString()?.ToLowerInvariant() switch
        {
            "passed" => RuleStatus.Passed,
            "warned" => RuleStatus.Warned,
            "failed" => RuleStatus.Failed,
            "skipped" => RuleStatus.Skipped,
            _ => throw new JsonException("Unsupported rule status."),
        };

    public override void Write(Utf8JsonWriter writer, RuleStatus value, JsonSerializerOptions options) =>
        writer.WriteStringValue(value switch
        {
            RuleStatus.Passed => "passed",
            RuleStatus.Warned => "warned",
            RuleStatus.Failed => "failed",
            RuleStatus.Skipped => "skipped",
            _ => throw new JsonException("Unsupported rule status."),
        });
}
