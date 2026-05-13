namespace Orqentis.Api.Services;

/// <summary>Canonical Fabric contract target types supported by the API and workload UI.</summary>
public static class ContractTargetTypes
{
    public const string Lakehouse = "lakehouse";
    public const string Warehouse = "warehouse";
    public const string Eventhouse = "eventhouse";
    public const string SemanticModel = "semantic_model";
    public const string FabricSql = "fabric_sql";

    private static readonly HashSet<string> _supported = new(StringComparer.Ordinal)
    {
        Lakehouse,
        Warehouse,
        Eventhouse,
        SemanticModel,
        FabricSql,
    };

    public static string? Normalize(string? value)
    {
        var normalized = (value ?? Lakehouse).Trim().Replace('-', '_').ToLowerInvariant();
        return _supported.Contains(normalized) ? normalized : null;
    }

    public static string ToServerFormat(string targetType) =>
        Normalize(targetType) switch
        {
            Warehouse or FabricSql => "sql",
            Eventhouse => "kql",
            SemanticModel => "semantic_model",
            _ => "delta",
        };
}
