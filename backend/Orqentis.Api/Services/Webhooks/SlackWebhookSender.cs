using System.Text;
using System.Text.Json;

namespace Orqentis.Api.Services.Webhooks;

public sealed class SlackWebhookSender : ISlackWebhookSender
{
    private readonly HttpClient _httpClient;

    public SlackWebhookSender(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task SendAsync(string url, string text, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Content = new StringContent(
            JsonSerializer.Serialize(new { text }),
            Encoding.UTF8,
            "application/json");
        using var response = await _httpClient.SendAsync(request, ct).ConfigureAwait(false);
        response.EnsureSuccessStatusCode();
    }
}
