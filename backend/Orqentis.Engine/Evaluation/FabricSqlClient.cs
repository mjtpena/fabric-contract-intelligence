using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Orqentis.Engine.Odcs;
using Microsoft.Extensions.Logging;

namespace Orqentis.Engine.Evaluation;

/// <summary>HTTP client for executing scalar SQL queries against Fabric SQL endpoints.</summary>
public sealed class FabricSqlClient : IFabricSqlClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<FabricSqlClient> _logger;

    public FabricSqlClient(HttpClient httpClient, ILogger<FabricSqlClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<double?> ExecuteScalarAsync(
        ContractServer server,
        string sql,
        string fabricSqlOboToken,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(server);
        ArgumentException.ThrowIfNullOrWhiteSpace(sql);
        ArgumentException.ThrowIfNullOrWhiteSpace(fabricSqlOboToken);

        if (string.IsNullOrWhiteSpace(server.Host))
        {
            throw new InvalidOperationException("Contract server host is required for SQL quality evaluation.");
        }

        var endpoint = server.Host!.TrimEnd('/');
        _logger.LogInformation("QualitySql-Execute Endpoint={Endpoint}", endpoint);
        if (!Uri.TryCreate($"{endpoint}/query", UriKind.Absolute, out var queryUri))
        {
            throw new InvalidOperationException($"Contract server host '{server.Host}' is not a valid SQL endpoint URI.");
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, queryUri);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", fabricSqlOboToken);
        request.Content = new StringContent(
            JsonSerializer.Serialize(new { query = sql }),
            Encoding.UTF8,
            "application/json");

        using var response = await _httpClient.SendAsync(request, ct).ConfigureAwait(false);
        var body = await response.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
        response.EnsureSuccessStatusCode();

        return TryExtractScalar(body, out var value)
            ? value
            : throw new InvalidOperationException("SQL endpoint response did not include a scalar value.");
    }

    private static bool TryExtractScalar(string body, out double? value)
    {
        using var document = JsonDocument.Parse(body);
        var root = document.RootElement;

        if (TryReadFirstRowFirstColumn(root, out value))
        {
            return true;
        }

        if (root.TryGetProperty("value", out var scalar) && TryToDouble(scalar, out var direct))
        {
            value = direct;
            return true;
        }

        value = null;
        return false;
    }

    private static bool TryReadFirstRowFirstColumn(JsonElement root, out double? value)
    {
        value = null;

        if (root.TryGetProperty("rows", out var rows) && rows.ValueKind == JsonValueKind.Array && rows.GetArrayLength() > 0)
        {
            var firstRow = rows[0];
            if (firstRow.ValueKind == JsonValueKind.Array && firstRow.GetArrayLength() > 0 && TryToDouble(firstRow[0], out var number))
            {
                value = number;
                return true;
            }

            if (firstRow.ValueKind == JsonValueKind.Object)
            {
                foreach (var property in firstRow.EnumerateObject())
                {
                    if (TryToDouble(property.Value, out number))
                    {
                        value = number;
                        return true;
                    }
                }
            }
        }

        if (root.TryGetProperty("result", out var result))
        {
            return TryReadFirstRowFirstColumn(result, out value);
        }

        return false;
    }

    private static bool TryToDouble(JsonElement element, out double value)
    {
        value = 0;
        return element.ValueKind switch
        {
            JsonValueKind.Number => element.TryGetDouble(out value),
            JsonValueKind.String => double.TryParse(
                element.GetString(),
                NumberStyles.Float | NumberStyles.AllowThousands,
                CultureInfo.InvariantCulture,
                out value),
            _ => false,
        };
    }
}
