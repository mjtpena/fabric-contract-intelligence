namespace FCI.Data;

/// <summary>
/// Spec §11. Exchanges the inbound user-bearer token for a delegated token scoped to OneLake
/// (<c>https://storage.azure.com/.default</c>) or Fabric REST (<c>https://api.fabric.microsoft.com/.default</c>)
/// via Azure.Identity.OnBehalfOfCredential. Tokens MUST NOT be persisted.
/// </summary>
public interface IOneLakeTokenBroker
{
    Task<string> GetOneLakeTokenAsync(string userAssertion, CancellationToken ct = default);
    Task<string> GetFabricRestTokenAsync(string userAssertion, CancellationToken ct = default);
}
