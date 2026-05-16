using System.Net.Security;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;

namespace Orqentis.Api.Services.Webhooks;

public sealed class SlackWebhookSender : ISlackWebhookSender
{
    private readonly WebhookUrlValidator _urlValidator;

    public SlackWebhookSender(HttpClient _, WebhookUrlValidator urlValidator)
    {
        _urlValidator = urlValidator;
    }

    public async Task SendAsync(string url, string text, CancellationToken ct = default)
    {
        var validatedUrl = await _urlValidator.ValidateAsync(url, ct).ConfigureAwait(false);
        using var request = new HttpRequestMessage(HttpMethod.Post, validatedUrl.Uri);
        request.Content = new StringContent(
            JsonSerializer.Serialize(new { text }),
            Encoding.UTF8,
            "application/json");
        using var handler = CreatePinnedHandler(validatedUrl);
        using var httpClient = new HttpClient(handler, disposeHandler: true);
        using var response = await httpClient.SendAsync(request, ct).ConfigureAwait(false);
        response.EnsureSuccessStatusCode();
    }

    private static SocketsHttpHandler CreatePinnedHandler(WebhookUrlValidationResult validatedUrl) =>
        new()
        {
            ConnectCallback = async (context, ct) =>
            {
                var socket = new Socket(validatedUrl.PinnedAddress.AddressFamily, SocketType.Stream, ProtocolType.Tcp);
                try
                {
                    await socket.ConnectAsync(validatedUrl.PinnedAddress, context.DnsEndPoint.Port, ct).ConfigureAwait(false);
                    return new NetworkStream(socket, ownsSocket: true);
                }
                catch
                {
                    socket.Dispose();
                    throw;
                }
            },
            SslOptions = new SslClientAuthenticationOptions
            {
                TargetHost = validatedUrl.Uri.IdnHost,
            },
        };
}
