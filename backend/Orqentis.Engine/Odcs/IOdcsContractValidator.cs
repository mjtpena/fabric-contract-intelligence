namespace Orqentis.Engine.Odcs;

/// <summary>
/// Validates raw ODCS YAML against the official v3.1.0 JSON Schema.
/// Per <c>.github/copilot-instructions.md §3.4</c>, contracts that fail validation
/// MUST NOT be persisted with status='active'.
/// </summary>
public interface IOdcsContractValidator
{
    /// <summary>Validate raw ODCS YAML against the v3.1.0 JSON Schema.</summary>
    /// <returns>Empty list = valid. Each entry = one schema violation (path + message).</returns>
    IReadOnlyList<OdcsValidationError> Validate(string odcsYaml);
}

/// <summary>Single validation failure returned from the ODCS schema validator.</summary>
public sealed record OdcsValidationError(string JsonPath, string Message);
