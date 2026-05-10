using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Orqentis.AI;
using Orqentis.Api.Auth;
using Orqentis.Api.Dtos;
using Orqentis.Api.Services;
using Orqentis.Data;
using Orqentis.Engine.Odcs;

namespace Orqentis.Api.Controllers;

/// <summary>CRUD and version endpoints for persisted ODCS contracts.</summary>
[ApiController]
[Route("v1/contracts")]
public sealed class ContractsController : ControllerBase
{
    private readonly IContractStore _contractStore;
    private readonly IOdcsContractValidator _validator;
    private readonly IOdcsContractParser _parser;
    private readonly OdcsContractSerializer _serializer;
    private readonly ITenantContext _tenantContext;
    private readonly IContractSuggestionAgent _contractSuggestionAgent;

    public ContractsController(
        IContractStore contractStore,
        IOdcsContractValidator validator,
        IOdcsContractParser parser,
        OdcsContractSerializer serializer,
        ITenantContext tenantContext,
        IContractSuggestionAgent contractSuggestionAgent)
    {
        _contractStore = contractStore;
        _validator = validator;
        _parser = parser;
        _serializer = serializer;
        _tenantContext = tenantContext;
        _contractSuggestionAgent = contractSuggestionAgent;
    }

    /// <summary>Lists contracts for the current tenant workspace.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ContractSummaryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ContractSummaryDto>>> ListAsync(CancellationToken ct)
    {
        var contracts = await _contractStore.ListAsync(ct).ConfigureAwait(false);
        return Ok(contracts.Select(MapSummary).ToArray());
    }

    /// <summary>Creates a new contract and its initial version snapshot.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(ContractDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status402PaymentRequired)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ContractDto>> CreateAsync(
        [FromBody] CreateContractRequest request,
        CancellationToken ct)
    {
        if (string.Equals(request.Mode, "ai_generate", StringComparison.OrdinalIgnoreCase))
        {
            if (!string.Equals(_tenantContext.Tier, "enterprise", StringComparison.OrdinalIgnoreCase))
            {
                return Problem(
                    statusCode: StatusCodes.Status402PaymentRequired,
                    title: "Enterprise tier required.",
                    detail: "AI-generated contracts are only available to enterprise tenants.");
            }
        }

        if (!string.Equals(request.Mode, "direct", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(request.Mode, "ai_generate", StringComparison.OrdinalIgnoreCase))
        {
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid mode.",
                detail: "Mode must be either 'direct' or 'ai_generate'.");
        }

        var isAiGenerated = string.Equals(request.Mode, "ai_generate", StringComparison.OrdinalIgnoreCase);
        var odcsYaml = request.OdcsYaml;

        if (isAiGenerated)
        {
            var profile = new TableProfile
            {
                TableName = request.Name,
                AbfssUri = request.TargetTablePath,
                Columns = [],
                SampleRows = [],
            };

            var suggestion = await _contractSuggestionAgent.SuggestAsync(profile, ct).ConfigureAwait(false);
            odcsYaml = suggestion.OdcsYaml;
        }

        if (!TryNormalizeContract(
                request.Name,
                request.Description,
                request.OwnerEmail,
                request.TargetTablePath,
                odcsYaml,
                out var normalizedYaml,
                out var contractDefinition,
                out ActionResult<ContractDto>? validationProblem))
        {
            return validationProblem!;
        }

        try
        {
            var created = await _contractStore.CreateAsync(
                new CreateContractCommand(
                    _tenantContext.WorkspaceId,
                    request.TargetLakehouseId,
                    request.Name,
                    contractDefinition.Status.ToLowerInvariant(),
                    contractDefinition.Version,
                    request.OwnerEmail,
                    GetActor(),
                    normalizedYaml,
                    null),
                ct).ConfigureAwait(false);

            return Created($"/v1/contracts/{created.ContractId}", MapContract(created, isAiGenerated));
        }
        catch (ContractConflictException ex)
        {
            return Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "Contract conflict.",
                detail: ex.Message);
        }
    }

    /// <summary>Gets the current version of a contract.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ContractDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ContractDto>> GetAsync(Guid id, CancellationToken ct)
    {
        var contract = await _contractStore.GetAsync(id, ct).ConfigureAwait(false);
        return contract is null
            ? Problem(statusCode: StatusCodes.Status404NotFound, title: "Contract not found.")
            : Ok(MapContract(contract));
    }

    /// <summary>Creates a new immutable contract version and updates the current pointer.</summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(ContractDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ContractDto>> UpdateAsync(
        Guid id,
        [FromBody] UpdateContractRequest request,
        CancellationToken ct)
    {
        if (!TryNormalizeContract(
                request.Name,
                request.Description,
                request.OwnerEmail,
                request.TargetTablePath,
                request.OdcsYaml,
                out var normalizedYaml,
                out var contractDefinition,
                out ActionResult<ContractDto>? validationProblem))
        {
            return validationProblem!;
        }

        try
        {
            var updated = await _contractStore.UpdateAsync(
                id,
                new UpdateContractCommand(
                    request.TargetLakehouseId,
                    request.Name,
                    contractDefinition.Status.ToLowerInvariant(),
                    contractDefinition.Version,
                    request.OwnerEmail,
                    GetActor(),
                    normalizedYaml,
                    request.CommitMessage),
                ct).ConfigureAwait(false);

            return updated is null
                ? Problem(statusCode: StatusCodes.Status404NotFound, title: "Contract not found.")
                : Ok(MapContract(updated));
        }
        catch (ContractConflictException ex)
        {
            return Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "Contract conflict.",
                detail: ex.Message);
        }
    }

    /// <summary>Soft deletes a contract.</summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteAsync(Guid id, CancellationToken ct)
    {
        var deleted = await _contractStore.SoftDeleteAsync(id, ct).ConfigureAwait(false);
        return deleted
            ? NoContent()
            : Problem(statusCode: StatusCodes.Status404NotFound, title: "Contract not found.");
    }

    /// <summary>Lists all immutable versions for a contract.</summary>
    [HttpGet("{id:guid}/versions")]
    [ProducesResponseType(typeof(IReadOnlyList<ContractVersionDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ContractVersionDto>>> ListVersionsAsync(Guid id, CancellationToken ct)
    {
        var versions = await _contractStore.ListVersionsAsync(id, ct).ConfigureAwait(false);
        return Ok(versions.Select(MapVersion).ToArray());
    }

    /// <summary>Gets one immutable contract version snapshot.</summary>
    [HttpGet("{id:guid}/versions/{version}")]
    [ProducesResponseType(typeof(ContractVersionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ContractVersionDto>> GetVersionAsync(Guid id, string version, CancellationToken ct)
    {
        var contractVersion = await _contractStore.GetVersionAsync(id, version, ct).ConfigureAwait(false);
        return contractVersion is null
            ? Problem(statusCode: StatusCodes.Status404NotFound, title: "Contract version not found.")
            : Ok(MapVersion(contractVersion));
    }

    private bool TryNormalizeContract(
        string name,
        string? description,
        string ownerEmail,
        string targetTablePath,
        string? odcsYaml,
        out string normalizedYaml,
        out ContractDefinition contractDefinition,
        out ActionResult<ContractDto>? validationProblem)
    {
        normalizedYaml = string.Empty;
        contractDefinition = default!;
        validationProblem = null;

        if (string.IsNullOrWhiteSpace(odcsYaml))
        {
            validationProblem = Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "ODCS YAML is required.",
                detail: "Provide a valid ODCS v3.1.0 YAML document.");
            return false;
        }

        var errors = _validator.Validate(odcsYaml);
        if (errors.Count > 0)
        {
            var modelState = new ModelStateDictionary();
            foreach (var error in errors)
            {
                modelState.AddModelError(error.JsonPath, error.Message);
            }

            validationProblem = ValidationProblem(modelState);
            return false;
        }

        var parseResult = _parser.Parse(odcsYaml);
        if (!parseResult.IsSuccess || parseResult.Value is null)
        {
            validationProblem = Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid ODCS YAML.",
                detail: parseResult.Error ?? "The ODCS contract could not be parsed.");
            return false;
        }

        var parsed = parseResult.Value;
        var servers = parsed.Servers.ToList();
        if (servers.Count == 0)
        {
            validationProblem = Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Target server missing.",
                detail: "The contract YAML must contain at least one server entry.");
            return false;
        }

        servers[0] = servers[0] with { Path = targetTablePath };
        contractDefinition = parsed with
        {
            Name = name,
            Info = parsed.Info with
            {
                Title = name,
                Description = description ?? parsed.Info.Description,
                Owner = ownerEmail,
            },
            Servers = servers,
        };

        normalizedYaml = _serializer.Serialize(contractDefinition);
        return true;
    }

    private ContractDto MapContract(ContractRecord contract, bool aiSuggested = false)
    {
        var yaml = contract.CurrentVersionRecord?.OdcsYaml ?? string.Empty;
        var parseResult = _parser.Parse(yaml);
        var parsed = parseResult.IsSuccess ? parseResult.Value : null;

        return new ContractDto
        {
            Id = contract.ContractId,
            Name = contract.Name,
            Description = parsed?.Info.Description,
            Status = contract.Status,
            Version = contract.CurrentVersion,
            OdcsYaml = yaml,
            OwnerEmail = contract.OwnerEmail,
            TargetTablePath = parsed?.Servers.FirstOrDefault()?.Path ?? string.Empty,
            TargetLakehouseId = contract.FabricItemId,
            AiSuggested = aiSuggested,
            CreatedBy = contract.CreatedBy,
            CreatedAt = ToIsoString(contract.CreatedAt),
            UpdatedAt = ToIsoString(contract.UpdatedAt),
        };
    }

    private static ContractSummaryDto MapSummary(ContractSummaryRecord contract) =>
        new()
        {
            Id = contract.ContractId,
            Name = contract.Name,
            Status = contract.Status,
            Version = contract.CurrentVersion,
            LastRunStatus = contract.LatestRun?.Status,
            LastRunAt = contract.LatestRun is null ? null : ToIsoString(contract.LatestRun.TriggeredAt),
        };

    private static ContractVersionDto MapVersion(ContractVersionRecord version) =>
        new()
        {
            Id = version.VersionId,
            Version = version.Version,
            OdcsYaml = version.OdcsYaml,
            CreatedBy = version.CreatedBy,
            CreatedAt = ToIsoString(version.CreatedAt),
            CommitMessage = version.CommitMessage,
        };

    private string GetActor() =>
        !string.IsNullOrWhiteSpace(_tenantContext.UserEmail)
            ? _tenantContext.UserEmail
            : _tenantContext.UserObjectId;

    private static string ToIsoString(DateTimeOffset value) => value.UtcDateTime.ToString("O");
}
