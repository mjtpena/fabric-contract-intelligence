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
    /// Runs full contract enforcement against the target Delta table.
    /// </summary>
    /// <param name="contract">Parsed ODCS contract definition.</param>
    /// <param name="oneLakeOboToken">OBO token scoped to OneLake (storage.azure.com).</param>
    /// <param name="ct">Cancellation token (apply request timeout via the caller).</param>
    Task<EnforcementResult> RunAsync(
        ContractDefinition contract,
        string oneLakeOboToken,
        CancellationToken ct = default);
}
