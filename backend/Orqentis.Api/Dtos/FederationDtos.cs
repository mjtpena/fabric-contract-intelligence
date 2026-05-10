namespace Orqentis.Api.Dtos;

public sealed record FederatedContractsResponseDto
{
    public required IReadOnlyList<ContractSummaryDto> Contracts { get; init; }
    public string? NextCursor { get; init; }
}
