namespace Orqentis.Api.Dtos;

public sealed record ActivatorRuleDto
{
    public required Guid Id { get; init; }
    public required string Name { get; init; }
}
