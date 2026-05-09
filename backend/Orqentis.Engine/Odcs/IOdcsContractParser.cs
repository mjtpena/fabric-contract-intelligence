using Orqentis.Engine.Common;

namespace Orqentis.Engine.Odcs;

/// <summary>Parses ODCS v3.1.0 YAML into a <see cref="ContractDefinition"/>.</summary>
public interface IOdcsContractParser
{
    /// <summary>
    /// Parses an ODCS YAML document into the Orqentis contract model.
    /// </summary>
    /// <param name="odcsYaml">The raw ODCS YAML.</param>
    /// <returns>A parsed contract result.</returns>
    Result<ContractDefinition> Parse(string odcsYaml);
}
