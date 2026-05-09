using Orqentis.Engine.Common;
using Microsoft.Extensions.Logging;

namespace Orqentis.Engine.Odcs;

/// <summary>YAML → <see cref="ContractDefinition"/> via YamlDotNet.</summary>
public sealed class OdcsContractParser : IOdcsContractParser
{
    private readonly ILogger<OdcsContractParser> _logger;

    public OdcsContractParser(ILogger<OdcsContractParser> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc />
    public Result<ContractDefinition> Parse(string odcsYaml)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(odcsYaml);

        try
        {
            var root = OdcsYamlJsonConverter.ConvertToJsonElement(odcsYaml);
            var contract = OdcsDocumentMapper.MapToContractDefinition(root);

            _logger.LogInformation(
                "Contract-Parsed ContractId={ContractId} Name={Name}",
                contract.Id,
                contract.Name);

            return Result<ContractDefinition>.Success(contract);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Contract-ParseFailed");
            return Result<ContractDefinition>.Failure(
                $"Failed to parse the ODCS contract YAML: {ex.Message}",
                "OdcsParseFailed");
        }
    }
}
