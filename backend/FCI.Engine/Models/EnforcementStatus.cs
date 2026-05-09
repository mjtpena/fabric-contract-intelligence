namespace FCI.Engine.Models;

/// <summary>Overall enforcement run status.</summary>
public enum EnforcementStatus
{
    Passed,
    Warned,
    Failed,
    Error
}

/// <summary>Status for a single rule evaluation.</summary>
public enum RuleStatus
{
    Passed,
    Warned,
    Failed,
    Skipped
}
