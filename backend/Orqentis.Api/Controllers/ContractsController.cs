using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Orqentis.AI;
using Orqentis.Api.Auth;
using Orqentis.Api.Dtos;
using Orqentis.Api.Services;
using Orqentis.Data;
using Orqentis.Engine.Common;
using Orqentis.Engine.Delta;
using Orqentis.Engine.Evaluation;
using Orqentis.Engine.Models;
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
    private readonly IOneLakeTokenBroker _tokenBroker;
    private readonly IDeltaLogReader _deltaReader;
    private readonly IFabricKqlSchemaReader _kqlSchemaReader;
    private readonly IFabricSqlSchemaReader _sqlSchemaReader;
    private readonly IFabricSemanticModelSchemaReader _semanticModelSchemaReader;

    public ContractsController(
        IContractStore contractStore,
        IOdcsContractValidator validator,
        IOdcsContractParser parser,
        OdcsContractSerializer serializer,
        ITenantContext tenantContext,
        IContractSuggestionAgent contractSuggestionAgent,
        IOneLakeTokenBroker tokenBroker,
        IDeltaLogReader deltaReader,
        IFabricKqlSchemaReader kqlSchemaReader,
        IFabricSqlSchemaReader sqlSchemaReader,
        IFabricSemanticModelSchemaReader semanticModelSchemaReader)
    {
        _contractStore = contractStore;
        _validator = validator;
        _parser = parser;
        _serializer = serializer;
        _tenantContext = tenantContext;
        _contractSuggestionAgent = contractSuggestionAgent;
        _tokenBroker = tokenBroker;
        _deltaReader = deltaReader;
        _kqlSchemaReader = kqlSchemaReader;
        _sqlSchemaReader = sqlSchemaReader;
        _semanticModelSchemaReader = semanticModelSchemaReader;
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

        var targetType = ContractTargetTypes.Normalize(request.TargetType);
        if (targetType is null)
        {
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid target type.",
                detail: "Target type must be one of lakehouse, warehouse, eventhouse, semantic_model, or fabric_sql.");
        }

        var targetItemId = request.TargetItemId ?? request.TargetLakehouseId;
        if (targetItemId is null)
        {
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Target item missing.",
                detail: "TargetItemId is required for Fabric contract targets.");
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
                targetType,
                request.TargetTablePath,
                odcsYaml,
                out var normalizedYaml,
                out var contractDefinition,
                out ActionResult<ContractDto>? validationProblem,
                _tenantContext.WorkspaceId,
                targetItemId))
        {
            return validationProblem!;
        }

        try
        {
            var created = await _contractStore.CreateAsync(
                new CreateContractCommand(
                    _tenantContext.WorkspaceId,
                    targetType,
                    targetItemId.Value,
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
        var targetType = ContractTargetTypes.Normalize(request.TargetType);
        if (targetType is null)
        {
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid target type.",
                detail: "Target type must be one of lakehouse, warehouse, eventhouse, semantic_model, or fabric_sql.");
        }

        var targetItemId = request.TargetItemId ?? request.TargetLakehouseId;
        if (targetItemId is null)
        {
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Target item missing.",
                detail: "TargetItemId is required for Fabric contract targets.");
        }

        if (!TryNormalizeContract(
                request.Name,
                request.Description,
                request.OwnerEmail,
                targetType,
                request.TargetTablePath,
                request.OdcsYaml,
                out var normalizedYaml,
                out var contractDefinition,
                out ActionResult<ContractDto>? validationProblem,
                _tenantContext.WorkspaceId,
                targetItemId))
        {
            return validationProblem!;
        }

        try
        {
            var updated = await _contractStore.UpdateAsync(
                id,
                new UpdateContractCommand(
                    targetType,
                    targetItemId.Value,
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

    /// <summary>
    /// Reads the live schema of the target Fabric item referenced in the supplied ODCS YAML.
    /// Requires a delegated OBO token to access OneLake/Fabric data-plane. Spec §9.1.
    /// </summary>
    [HttpPost("schema-preview")]
    [ProducesResponseType(typeof(LivePreviewResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LivePreviewResponse>> SchemaPreviewAsync(
        [FromBody] LivePreviewRequest request,
        CancellationToken ct)
    {
        var bearerToken = GetBearerToken();
        if (string.IsNullOrWhiteSpace(bearerToken))
        {
            return Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title: "Bearer token missing.",
                detail: "An inbound bearer token is required for OBO exchange.");
        }

        var parseResult = _parser.Parse(request.OdcsYaml);
        if (!parseResult.IsSuccess || parseResult.Value is null)
        {
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid ODCS YAML.",
                detail: parseResult.Error ?? "The contract YAML could not be parsed.");
        }

        var server = parseResult.Value.Servers.FirstOrDefault();
        if (server is null)
        {
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Target server missing.",
                detail: "The contract YAML must contain at least one server entry with a valid location.");
        }

        var format = NormalizeServerFormat(server.Format);

        // Resolve target context from request parameters or YAML server block.
        var resolvedWorkspaceId = request.TargetWorkspaceId
            ?? server.WorkspaceId
            ?? _tenantContext.WorkspaceId;

        var targetContext = request.TargetItemId.HasValue
            ? new EnforcementTargetContext
            {
                WorkspaceId = resolvedWorkspaceId,
                TargetItemId = request.TargetItemId.Value,
                TargetType = request.TargetType is not null
                    ? ContractTargetTypes.Normalize(request.TargetType) ?? ContractTargetTypes.Lakehouse
                    : ContractTargetTypes.Lakehouse,
            }
            : (EnforcementTargetContext?)null;

        var credentials = await GetPreviewCredentialsAsync(format, bearerToken, ct).ConfigureAwait(false);

        var snapshotResult = await ReadLiveSnapshotAsync(format, server, credentials, targetContext, ct).ConfigureAwait(false);
        if (!snapshotResult.IsSuccess || snapshotResult.Value is null)
        {
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Schema preview failed.",
                detail: snapshotResult.Error ?? "Unable to read live schema from the target.");
        }

        var snapshot = snapshotResult.Value;
        return Ok(new LivePreviewResponse
        {
            DeltaVersion = snapshot.Version,
            Fields = snapshot.Schema.Columns
                .Select(column => new SchemaPreviewFieldDto
                {
                    Name = column.Name,
                    PhysicalType = column.Type,
                    Nullable = column.Nullable,
                })
                .ToArray(),
        });
    }

    private Task<Result<DeltaTableSnapshot>> ReadLiveSnapshotAsync(
        string format,
        ContractServer server,
        EnforcementCredentials credentials,
        EnforcementTargetContext? target,
        CancellationToken ct) =>
        format switch
        {
            "delta" => string.IsNullOrWhiteSpace(credentials.OneLakeToken)
                ? Task.FromResult(Result<DeltaTableSnapshot>.Failure("A delegated OneLake token is required.", "OneLakeTokenMissing"))
                : _deltaReader.ReadAsync(server.Path, credentials.OneLakeToken, ct),
            "sql" => target is not null
                ? _sqlSchemaReader.ReadAsync(server, credentials, target, ct)
                : Task.FromResult(Result<DeltaTableSnapshot>.Failure("Target context is required for SQL preview.", "TargetContextMissing")),
            "kql" => target is not null
                ? _kqlSchemaReader.ReadAsync(server, credentials, target, ct)
                : Task.FromResult(Result<DeltaTableSnapshot>.Failure("Target context is required for KQL preview.", "TargetContextMissing")),
            "semantic_model" => target is not null
                ? _semanticModelSchemaReader.ReadAsync(server, credentials, target, ct)
                : Task.FromResult(Result<DeltaTableSnapshot>.Failure("Target context is required for Semantic Model preview.", "TargetContextMissing")),
            _ => Task.FromResult(Result<DeltaTableSnapshot>.Failure($"Format '{format}' is not supported for live preview.", "FormatUnsupported")),
        };

    private async Task<EnforcementCredentials> GetPreviewCredentialsAsync(string format, string bearerToken, CancellationToken ct) =>
        format switch
        {
            "delta" => new EnforcementCredentials
            {
                OneLakeToken = await _tokenBroker.GetOneLakeTokenAsync(bearerToken, ct).ConfigureAwait(false),
            },
            "sql" => new EnforcementCredentials
            {
                FabricRestToken = await _tokenBroker.GetFabricRestTokenAsync(bearerToken, ct).ConfigureAwait(false),
                FabricSqlToken = await _tokenBroker.GetFabricSqlTokenAsync(bearerToken, ct).ConfigureAwait(false),
            },
            "kql" => new EnforcementCredentials
            {
                FabricRestToken = await _tokenBroker.GetFabricRestTokenAsync(bearerToken, ct).ConfigureAwait(false),
                KustoToken = await _tokenBroker.GetKustoTokenAsync(bearerToken, ct).ConfigureAwait(false),
            },
            "semantic_model" => new EnforcementCredentials
            {
                FabricRestToken = await _tokenBroker.GetFabricRestTokenAsync(bearerToken, ct).ConfigureAwait(false),
            },
            _ => new EnforcementCredentials
            {
                FabricRestToken = await _tokenBroker.GetFabricRestTokenAsync(bearerToken, ct).ConfigureAwait(false),
            },
        };

    private string? GetBearerToken()
    {
        if (!Request.Headers.TryGetValue("Authorization", out var authorization))
        {
            return null;
        }

        const string prefix = "Bearer ";
        var headerValue = authorization.ToString();
        return headerValue.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
            ? headerValue[prefix.Length..].Trim()
            : null;
    }

    private static string NormalizeServerFormat(string? format) =>
        string.IsNullOrWhiteSpace(format)
            ? "delta"
            : format.Trim().Replace("-", "_", StringComparison.Ordinal).ToLowerInvariant();

    private bool TryNormalizeContract(
        string name,
        string? description,
        string ownerEmail,
        string targetType,
        string targetTablePath,
        string? odcsYaml,
        out string normalizedYaml,
        out ContractDefinition contractDefinition,
        out ActionResult<ContractDto>? validationProblem,
        Guid? workspaceId = null,
        Guid? targetItemId = null)
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

        servers[0] = servers[0] with
        {
            Path = BuildStoragePath(targetType, targetTablePath, workspaceId, targetItemId),
            Format = ContractTargetTypes.ToServerFormat(targetType),
        };
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
            TargetType = contract.TargetType,
            TargetItemId = contract.FabricItemId,
            TargetTablePath = parsed?.Servers.FirstOrDefault()?.Path ?? string.Empty,
            TargetLakehouseId = string.Equals(contract.TargetType, ContractTargetTypes.Lakehouse, StringComparison.Ordinal)
                ? contract.FabricItemId
                : null,
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
            TargetType = contract.TargetType,
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

    /// <summary>
    /// Builds the canonical storage path for the ODCS server location.
    /// For Lakehouse/Delta targets with a relative path, constructs the full
    /// abfss:// URI using OneLake's workspace-scoped DFS endpoint format.
    /// Non-Delta targets store a logical display path only.
    /// </summary>
    private static string BuildStoragePath(string targetType, string targetTablePath, Guid? workspaceId, Guid? targetItemId)
    {
        if (!string.Equals(targetType, ContractTargetTypes.Lakehouse, StringComparison.Ordinal))
        {
            return targetTablePath;
        }

        if (targetTablePath.StartsWith("abfss://", StringComparison.OrdinalIgnoreCase))
        {
            return targetTablePath;
        }

        if (workspaceId is null || targetItemId is null)
        {
            return targetTablePath;
        }

        return $"abfss://{workspaceId}@onelake.dfs.fabric.microsoft.com/{targetItemId}/{targetTablePath}";
    }
}
