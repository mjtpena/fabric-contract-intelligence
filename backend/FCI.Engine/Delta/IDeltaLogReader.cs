using FCI.Engine.Common;

namespace FCI.Engine.Delta;

/// <summary>
/// Reads the <c>_delta_log/*.json</c> commit log of a Delta table at an <c>abfss://</c> URI
/// using a delegated OneLake (OBO) token.
/// </summary>
public interface IDeltaLogReader
{
    /// <summary>
    /// Reads the latest Delta table snapshot from the transaction log.
    /// </summary>
    /// <param name="abfssUri">The Delta table URI.</param>
    /// <param name="oneLakeOboToken">The delegated OneLake access token.</param>
    /// <param name="ct">The cancellation token.</param>
    /// <returns>A snapshot result for the requested table.</returns>
    Task<Result<DeltaTableSnapshot>> ReadAsync(
        string abfssUri,
        string oneLakeOboToken,
        CancellationToken ct = default);
}
