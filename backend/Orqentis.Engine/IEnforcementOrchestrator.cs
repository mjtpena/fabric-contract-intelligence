using Orqentis.Engine.Models;
using Orqentis.Engine.Odcs;

namespace Orqentis.Engine;

/// <summary>
/// Coordinates the full enforcement pipeline for a single contract + table.
/// Spec §9.3.
/// </summary>
public interface IEnforcementOrchestrator
{
    /// <summary>
    /// Runs contract enforcement against the supported launch target. Lakehouse/Delta is executable today;
    /// other Fabric target bindings return an explicit unsupported-target result until adapters are added.
    /// </summary>
    /// <param name="contract">Parsed ODCS contract definition.</param>
    /// <param name="oneLakeOboToken">OBO token scoped to OneLake (storage.azure.com).</param>
    /// <param name="ct">Cancellation token (apply request timeout via the caller).</param>
    Task<EnforcementResult> RunAsync(
        ContractDefinition contract,
        string oneLakeOboToken,
        CancellationToken ct = default);

    /// <summary>
    /// Runs contract enforcement against the target described by the persisted Fabric binding.
    /// </summary>
    Task<EnforcementResult> RunAsync(
        ContractDefinition contract,
        EnforcementCredentials credentials,
        EnforcementTargetContext? target,
        CancellationToken ct = default);
}
