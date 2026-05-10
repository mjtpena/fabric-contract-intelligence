using Orqentis.Engine.Odcs;

namespace Orqentis.Engine.Evaluation;

/// <summary>Executes scalar SQL queries against a Fabric SQL endpoint.</summary>
public interface IFabricSqlClient
{
    Task<double?> ExecuteScalarAsync(
        ContractServer server,
        string sql,
        string fabricSqlOboToken,
        CancellationToken ct = default);
}
