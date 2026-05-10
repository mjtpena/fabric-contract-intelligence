using Orqentis.Data.Entities;

namespace Orqentis.Api.Services;

public interface IBreachAlertDispatcher
{
    Task<AlertDispatchResult> DispatchAsync(
        AlertDispatchRequest request,
        CancellationToken ct = default);
}

public sealed record AlertDispatchRequest(
    Guid WorkspaceId,
    ContractPolicy Policy,
    ActivatorTriggerContext TriggerContext,
    string FabricRestToken);

public sealed record AlertDispatchResult(bool ActivatorTriggered, string Route);
