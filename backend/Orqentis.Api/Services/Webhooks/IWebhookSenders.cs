namespace Orqentis.Api.Services.Webhooks;

public interface IGenericWebhookSender
{
    Task SendAsync(string url, object payload, CancellationToken ct = default);
}

public interface ISlackWebhookSender
{
    Task SendAsync(string url, string text, CancellationToken ct = default);
}
