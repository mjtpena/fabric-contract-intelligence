using Microsoft.AspNetCore.Mvc;
using Orqentis.AI;
using Orqentis.Api.Auth;
using Orqentis.Api.Dtos;
using Orqentis.Api.Services;

namespace Orqentis.Api.Controllers;

/// <summary>Enterprise-only AI endpoints for contract suggestions and natural-language query.</summary>
[ApiController]
[Route("v1/ai")]
[Enterprise]
public sealed class AiController : ControllerBase
{
    private readonly IContractSuggestionAgent _suggestionAgent;
    private readonly IContractImprovementAgent _improvementAgent;
    private readonly INaturalLanguageQueryHandler _queryHandler;
    private readonly IContractStore _contractStore;

    public AiController(
        IContractSuggestionAgent suggestionAgent,
        IContractImprovementAgent improvementAgent,
        INaturalLanguageQueryHandler queryHandler,
        IContractStore contractStore)
    {
        _suggestionAgent = suggestionAgent;
        _improvementAgent = improvementAgent;
        _queryHandler = queryHandler;
        _contractStore = contractStore;
    }

    /// <summary>Generates an ODCS draft from table profile metadata.</summary>
    [HttpPost("suggest-contract")]
    [ProducesResponseType(typeof(SuggestContractResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<SuggestContractResponse>> SuggestContractAsync(
        [FromBody] SuggestContractRequest request,
        CancellationToken ct)
    {
        var profile = new TableProfile
        {
            TableName = request.TableName,
            AbfssUri = request.AbfssUri,
            Columns = request.Columns
                .Select(column => new TableProfileColumn(
                    column.Name,
                    column.Type,
                    column.Nullable,
                    column.DistinctCount,
                    column.NullCount))
                .ToArray(),
            SampleRows = request.SampleRows
                .Select(row => new TableProfileSampleRow(row))
                .ToArray(),
        };

        var suggestion = await _suggestionAgent.SuggestAsync(profile, ct).ConfigureAwait(false);
        return Ok(new SuggestContractResponse
        {
            OdcsYaml = suggestion.OdcsYaml,
            Rationale = suggestion.Rationale,
            ModelUsed = suggestion.ModelUsed,
            LatencyMs = (long)suggestion.Latency.TotalMilliseconds,
        });
    }

    /// <summary>Improves an existing ODCS contract with richer governance rules and PII annotations.</summary>
    [HttpPost("improve-contract")]
    [ProducesResponseType(typeof(SuggestContractResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SuggestContractResponse>> ImproveContractAsync(
        [FromBody] ImproveContractRequest request,
        CancellationToken ct)
    {
        var suggestion = await _improvementAgent.ImproveAsync(request.OdcsYaml, ct).ConfigureAwait(false);
        return Ok(new SuggestContractResponse
        {
            OdcsYaml = suggestion.OdcsYaml,
            Rationale = suggestion.Rationale,
            ModelUsed = suggestion.ModelUsed,
            LatencyMs = (long)suggestion.Latency.TotalMilliseconds,
        });
    }

    /// <summary>Finds contracts relevant to a natural-language query.</summary>
    [HttpPost("query")]
    [ProducesResponseType(typeof(NaturalLanguageQueryResponseDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<NaturalLanguageQueryResponseDto>> QueryAsync(
        [FromBody] NaturalLanguageQueryRequest request,
        CancellationToken ct)
    {
        var contracts = await _contractStore.ListAsync(ct).ConfigureAwait(false);
        var details = new List<ContractRecord>(contracts.Count);
        foreach (var contract in contracts)
        {
            var detail = await _contractStore.GetAsync(contract.ContractId, ct).ConfigureAwait(false);
            if (detail is not null)
            {
                details.Add(detail);
            }
        }

        var documents = details
            .Where(detail => detail.CurrentVersionRecord is not null
                && !string.IsNullOrWhiteSpace(detail.CurrentVersionRecord.OdcsYaml))
            .Select(detail => new NaturalLanguageContractDocument(
                detail.ContractId,
                detail.Name ?? string.Empty,
                detail.CurrentVersionRecord?.CommitMessage,
                detail.OwnerEmail ?? string.Empty,
                detail.CurrentVersionRecord!.OdcsYaml,
                detail.CurrentVersion ?? string.Empty))
            .ToArray();

        var result = await _queryHandler.QueryAsync(request.Query, documents, ct).ConfigureAwait(false);
        return Ok(new NaturalLanguageQueryResponseDto
        {
            Explanation = result.Explanation,
            ModelUsed = result.ModelUsed,
            Matches = result.Matches
                .Select(match => new NaturalLanguageQueryMatchDto
                {
                    ContractId = match.ContractId,
                    Name = match.Name,
                    Version = match.Version,
                    Explanation = match.Explanation,
                    RelevanceScore = match.RelevanceScore,
                })
                .ToArray(),
        });
    }
}
