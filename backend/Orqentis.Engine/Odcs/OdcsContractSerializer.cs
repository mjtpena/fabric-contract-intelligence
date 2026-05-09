using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace Orqentis.Engine.Odcs;

/// <summary>Serializes the internal contract model into ODCS-compatible YAML.</summary>
public sealed class OdcsContractSerializer
{
    private static readonly ISerializer Serializer = new SerializerBuilder()
        .WithNamingConvention(CamelCaseNamingConvention.Instance)
        .ConfigureDefaultValuesHandling(DefaultValuesHandling.OmitNull)
        .Build();

    /// <summary>
    /// Serializes a contract definition to YAML.
    /// </summary>
    /// <param name="contract">The contract definition to serialize.</param>
    /// <returns>An ODCS-compatible YAML string.</returns>
    public string Serialize(ContractDefinition contract)
    {
        ArgumentNullException.ThrowIfNull(contract);

        var document = OdcsDocumentMapper.MapToDocument(contract);
        return Serializer.Serialize(document);
    }
}
