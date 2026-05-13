namespace Orqentis.Api.Auth;

/// <summary>
/// Exchanges the inbound user bearer token for delegated downstream tokens via OBO.
/// Tokens are transient and must never be persisted.
/// </summary>
public interface IOneLakeTokenBroker
{
    /// <summary>Gets a delegated token for OneLake data-plane access.</summary>
    Task<string> GetOneLakeTokenAsync(string userAssertion, CancellationToken ct = default);

    /// <summary>Gets a delegated token for Fabric REST control-plane access.</summary>
    Task<string> GetFabricRestTokenAsync(string userAssertion, CancellationToken ct = default);

    /// <summary>Gets a delegated token for Fabric SQL data-plane access.</summary>
    Task<string> GetFabricSqlTokenAsync(string userAssertion, CancellationToken ct = default);

    /// <summary>Gets a delegated token for Fabric Eventhouse/Kusto query access.</summary>
    Task<string> GetKustoTokenAsync(string userAssertion, CancellationToken ct = default);
}
