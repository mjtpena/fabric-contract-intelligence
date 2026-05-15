using System.ComponentModel.DataAnnotations;

namespace Orqentis.Api.Dtos;

public sealed record SuggestContractRequest
{
    [Required]
    public required string TableName { get; init; }

    [Required]
    public required string AbfssUri { get; init; }

    public IReadOnlyList<SuggestContractColumnDto> Columns { get; init; } = [];
    public IReadOnlyList<Dictionary<string, string?>> SampleRows { get; init; } = [];
}

public sealed record SuggestContractColumnDto
{
    [Required]
    public required string Name { get; init; }

    [Required]
    public required string Type { get; init; }

    public bool Nullable { get; init; }
    public long? DistinctCount { get; init; }
    public long? NullCount { get; init; }
}

public sealed record SuggestContractResponse
{
    public required string OdcsYaml { get; init; }
    public required IReadOnlyList<string> Rationale { get; init; }
    public required string ModelUsed { get; init; }
    public required long LatencyMs { get; init; }
}

public sealed record ImproveContractRequest
{
    [Required]
    public required string OdcsYaml { get; init; }
}

public sealed record NaturalLanguageQueryRequest
{
    [Required]
    public required string Query { get; init; }
}

public sealed record NaturalLanguageQueryResponseDto
{
    public required string Explanation { get; init; }
    public required string ModelUsed { get; init; }
    public required IReadOnlyList<NaturalLanguageQueryMatchDto> Matches { get; init; }
}

public sealed record NaturalLanguageQueryMatchDto
{
    public required Guid ContractId { get; init; }
    public required string Name { get; init; }
    public required string Version { get; init; }
    public required string Explanation { get; init; }
    public required double RelevanceScore { get; init; }
}
