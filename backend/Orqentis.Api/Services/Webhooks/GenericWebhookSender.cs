using System.Text;
using System.Text.Json;

namespace Orqentis.Api.Services.Webhooks;

public sealed class GenericWebhookSender : IGenericWebhookSender
{
    private readonly HttpClient _httpClient;

    public GenericWebhookSender(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task SendAsync(string url, object payload, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        using var response = await _httpClient.SendAsync(request, ct).ConfigureAwait(false);
        response.EnsureSuccessStatusCode();
    }
}
