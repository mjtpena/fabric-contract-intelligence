using System.Linq;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;
using Orqentis.Engine.Common;
using Orqentis.Engine.Delta;
using Orqentis.Engine.Models;
using Orqentis.Engine.Odcs;

namespace Orqentis.Engine.Evaluation;

public interface IFabricSqlSchemaReader
{
    Task<Result<DeltaTableSnapshot>> ReadAsync(
        ContractServer server,
        EnforcementCredentials credentials,
        EnforcementTargetContext target,
        CancellationToken ct = default);

    Task<Result<string>> ResolveConnectionStringAsync(
        ContractServer server,
        EnforcementCredentials credentials,
        EnforcementTargetContext target,
        CancellationToken ct = default);
}

public interface IFabricKqlSchemaReader
{
    Task<Result<DeltaTableSnapshot>> ReadAsync(
        ContractServer server,
        EnforcementCredentials credentials,
        EnforcementTargetContext target,
        CancellationToken ct = default);
}

public interface IFabricSemanticModelSchemaReader
{
    Task<Result<DeltaTableSnapshot>> ReadAsync(
        ContractServer server,
        EnforcementCredentials credentials,
        EnforcementTargetContext target,
        CancellationToken ct = default);
}

public sealed class FabricSqlSchemaReader : IFabricSqlSchemaReader
{
    private const string _fabricApiBase = "https://api.fabric.microsoft.com/v1";
    private readonly HttpClient _httpClient;
    private readonly ILogger<FabricSqlSchemaReader> _logger;

    public FabricSqlSchemaReader(HttpClient httpClient, ILogger<FabricSqlSchemaReader> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<Result<DeltaTableSnapshot>> ReadAsync(
        ContractServer server,
        EnforcementCredentials credentials,
        EnforcementTargetContext target,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(server);
        ArgumentNullException.ThrowIfNull(credentials);
        ArgumentNullException.ThrowIfNull(target);

        if (string.IsNullOrWhiteSpace(credentials.FabricSqlToken))
        {
            return Result<DeltaTableSnapshot>.Failure("A delegated Fabric SQL token is required for SQL target enforcement.", "FabricSqlTokenMissing");
        }

        var endpointResult = await ResolveSqlEndpointAsync(server, credentials, target, ct).ConfigureAwait(false);
        if (!endpointResult.IsSuccess || endpointResult.Value is null)
        {
            return Result<DeltaTableSnapshot>.Failure(endpointResult.Error ?? "Unable to resolve Fabric SQL endpoint.", endpointResult.ErrorCode);
        }

        var source = FabricTargetPath.ParseSql(server.Path);
        var columns = new List<DeltaColumn>();

        try
        {
            await using var connection = new SqlConnection(endpointResult.Value.ConnectionString);
            connection.AccessToken = credentials.FabricSqlToken;
            await connection.OpenAsync(ct).ConfigureAwait(false);

            await using var command = connection.CreateCommand();
            command.CommandText = """
                SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @table
                ORDER BY ORDINAL_POSITION;
                """;
            command.Parameters.AddWithValue("@schema", source.Schema);
            command.Parameters.AddWithValue("@table", source.Table);

            await using var reader = await command.ExecuteReaderAsync(ct).ConfigureAwait(false);
            while (await reader.ReadAsync(ct).ConfigureAwait(false))
            {
                columns.Add(new DeltaColumn
                {
                    Name = reader.GetString(0),
                    Type = reader.GetString(1),
                    Nullable = string.Equals(reader.GetString(2), "YES", StringComparison.OrdinalIgnoreCase),
                });
            }
        }
        catch (Exception ex) when (ex is SqlException or InvalidOperationException or TimeoutException)
        {
            _logger.LogError(ex, "FabricSqlSchema-ReadFailed TargetItemId={TargetItemId} Path={Path}", target.TargetItemId, server.Path);
            return Result<DeltaTableSnapshot>.Failure($"Fabric SQL schema read failed: {ex.Message}", "FabricSqlSchemaReadFailed");
        }

        if (columns.Count == 0)
        {
            return Result<DeltaTableSnapshot>.Failure(
                $"No columns were returned for SQL object '{source.Schema}.{source.Table}'.",
                "FabricSqlSchemaEmpty");
        }

        return Result<DeltaTableSnapshot>.Success(new DeltaTableSnapshot
        {
            Version = 0,
            Schema = new DeltaSchema { Columns = columns },
            PartitionColumns = [],
            LastModifiedUtc = endpointResult.Value.LastUpdatedUtc ?? DateTimeOffset.UtcNow,
        });
    }

    public async Task<Result<string>> ResolveConnectionStringAsync(
        ContractServer server,
        EnforcementCredentials credentials,
        EnforcementTargetContext target,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(server);
        ArgumentNullException.ThrowIfNull(credentials);
        ArgumentNullException.ThrowIfNull(target);

        if (string.IsNullOrWhiteSpace(credentials.FabricSqlToken))
        {
            return Result<string>.Failure("A delegated Fabric SQL token is required for SQL target enforcement.", "FabricSqlTokenMissing");
        }

        var endpointResult = await ResolveSqlEndpointAsync(server, credentials, target, ct).ConfigureAwait(false);
        return endpointResult.IsSuccess && endpointResult.Value is not null
            ? Result<string>.Success(endpointResult.Value.ConnectionString)
            : Result<string>.Failure(endpointResult.Error ?? "Unable to resolve Fabric SQL endpoint.", endpointResult.ErrorCode);
    }

    private async Task<Result<SqlEndpoint>> ResolveSqlEndpointAsync(
        ContractServer server,
        EnforcementCredentials credentials,
        EnforcementTargetContext target,
        CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(server.Host))
        {
            return Result<SqlEndpoint>.Success(SqlEndpoint.FromHost(server.Host, null));
        }

        if (string.IsNullOrWhiteSpace(credentials.FabricRestToken))
        {
            return Result<SqlEndpoint>.Failure("A delegated Fabric REST token is required to resolve SQL target connection metadata.", "FabricRestTokenMissing");
        }

        var path = string.Equals(target.TargetType, "fabric_sql", StringComparison.OrdinalIgnoreCase)
            ? $"workspaces/{target.WorkspaceId}/sqlDatabases/{target.TargetItemId}"
            : $"workspaces/{target.WorkspaceId}/warehouses/{target.TargetItemId}";
        using var request = new HttpRequestMessage(HttpMethod.Get, $"{_fabricApiBase}/{path}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", credentials.FabricRestToken);

        using var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct).ConfigureAwait(false);
        var body = await response.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
        if (!response.IsSuccessStatusCode)
        {
            return Result<SqlEndpoint>.Failure(
                $"Fabric SQL metadata request failed with status {(int)response.StatusCode}.",
                "FabricSqlMetadataFailed");
        }

        using var document = JsonDocument.Parse(body);
        var root = document.RootElement;
        var displayName = root.TryGetProperty("displayName", out var display) ? display.GetString() : null;
        var properties = root.TryGetProperty("properties", out var props) ? props : default;
        var connectionString = ReadString(properties, "connectionString");
        var lastUpdated = ReadDateTimeOffset(properties, "lastUpdatedTime") ?? ReadDateTimeOffset(properties, "createdDate");

        return string.IsNullOrWhiteSpace(connectionString)
            ? Result<SqlEndpoint>.Failure("Fabric SQL metadata did not include a connection string.", "FabricSqlConnectionMissing")
            : Result<SqlEndpoint>.Success(SqlEndpoint.FromHost(connectionString, displayName, lastUpdated));
    }

    private static string? ReadString(JsonElement element, string propertyName) =>
        element.ValueKind == JsonValueKind.Object && element.TryGetProperty(propertyName, out var property)
            ? property.GetString()
            : null;

    private static DateTimeOffset? ReadDateTimeOffset(JsonElement element, string propertyName) =>
        ReadString(element, propertyName) is { } value && DateTimeOffset.TryParse(value, out var parsed)
            ? parsed
            : null;

    private sealed record SqlEndpoint(string ConnectionString, DateTimeOffset? LastUpdatedUtc)
    {
        public static SqlEndpoint FromHost(string hostOrConnectionString, string? databaseName, DateTimeOffset? lastUpdatedUtc = null)
        {
            if (hostOrConnectionString.Contains("Data Source=", StringComparison.OrdinalIgnoreCase) ||
                hostOrConnectionString.Contains("Server=", StringComparison.OrdinalIgnoreCase))
            {
                return new SqlEndpoint(hostOrConnectionString, lastUpdatedUtc);
            }

            var builder = new SqlConnectionStringBuilder
            {
                DataSource = hostOrConnectionString,
                InitialCatalog = databaseName ?? string.Empty,
                Encrypt = true,
                TrustServerCertificate = false,
                ConnectTimeout = 30,
            };
            return new SqlEndpoint(builder.ConnectionString, lastUpdatedUtc);
        }
    }
}

public sealed class FabricKqlSchemaReader : IFabricKqlSchemaReader
{
    private const string _fabricApiBase = "https://api.fabric.microsoft.com/v1";
    private readonly HttpClient _httpClient;

    public FabricKqlSchemaReader(HttpClient httpClient) => _httpClient = httpClient;

    public async Task<Result<DeltaTableSnapshot>> ReadAsync(
        ContractServer server,
        EnforcementCredentials credentials,
        EnforcementTargetContext target,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(credentials.FabricRestToken) || string.IsNullOrWhiteSpace(credentials.KustoToken))
        {
            return Result<DeltaTableSnapshot>.Failure("Delegated Fabric REST and Kusto tokens are required for Eventhouse enforcement.", "KqlTokenMissing");
        }

        var metadata = await GetKqlDatabaseAsync(credentials.FabricRestToken, target, ct).ConfigureAwait(false);
        if (!metadata.IsSuccess || metadata.Value is null)
        {
            return Result<DeltaTableSnapshot>.Failure(metadata.Error ?? "Unable to resolve KQL database metadata.", metadata.ErrorCode);
        }

        var tableName = FabricTargetPath.ParseSingleName(server.Path);
        // Control commands (.show ...) require /v1/rest/mgmt; data queries use /v2/rest/query.
        var command = $".show table ['{tableName.Replace("'", "\\'", StringComparison.Ordinal)}'] schema as json";
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{metadata.Value.QueryServiceUri.TrimEnd('/')}/v1/rest/mgmt");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", credentials.KustoToken);
        request.Content = new StringContent(
            JsonSerializer.Serialize(new { db = metadata.Value.DatabaseName, csl = command }),
            Encoding.UTF8,
            "application/json");

        using var response = await _httpClient.SendAsync(request, ct).ConfigureAwait(false);
        var body = await response.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
        if (!response.IsSuccessStatusCode)
        {
            return Result<DeltaTableSnapshot>.Failure($"KQL schema query failed with status {(int)response.StatusCode}.", "KqlSchemaQueryFailed");
        }

        var columns = KqlSchemaParser.ParseColumns(body);
        return columns.Count == 0
            ? Result<DeltaTableSnapshot>.Failure($"No KQL columns were returned for table '{tableName}'.", "KqlSchemaEmpty")
            : Result<DeltaTableSnapshot>.Success(new DeltaTableSnapshot
            {
                Version = 0,
                Schema = new DeltaSchema { Columns = columns },
                PartitionColumns = [],
                LastModifiedUtc = DateTimeOffset.UtcNow,
            });
    }

    private async Task<Result<KqlDatabaseMetadata>> GetKqlDatabaseAsync(string fabricRestToken, EnforcementTargetContext target, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{_fabricApiBase}/workspaces/{target.WorkspaceId}/kqlDatabases/{target.TargetItemId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", fabricRestToken);

        using var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct).ConfigureAwait(false);
        var body = await response.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
        if (!response.IsSuccessStatusCode)
        {
            return Result<KqlDatabaseMetadata>.Failure($"KQL database metadata request failed with status {(int)response.StatusCode}.", "KqlMetadataFailed");
        }

        using var document = JsonDocument.Parse(body);
        var root = document.RootElement;
        var databaseName = root.GetProperty("displayName").GetString();
        var queryServiceUri = root.GetProperty("properties").GetProperty("queryServiceUri").GetString();
        return string.IsNullOrWhiteSpace(databaseName) || string.IsNullOrWhiteSpace(queryServiceUri)
            ? Result<KqlDatabaseMetadata>.Failure("KQL database metadata did not include displayName and queryServiceUri.", "KqlMetadataIncomplete")
            : Result<KqlDatabaseMetadata>.Success(new KqlDatabaseMetadata(databaseName, queryServiceUri));
    }

    private sealed record KqlDatabaseMetadata(string DatabaseName, string QueryServiceUri);
}

public sealed class FabricSemanticModelSchemaReader : IFabricSemanticModelSchemaReader
{
    private const string _fabricApiBase = "https://api.fabric.microsoft.com/v1";
    private readonly HttpClient _httpClient;

    public FabricSemanticModelSchemaReader(HttpClient httpClient) => _httpClient = httpClient;

    public async Task<Result<DeltaTableSnapshot>> ReadAsync(
        ContractServer server,
        EnforcementCredentials credentials,
        EnforcementTargetContext target,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(credentials.FabricRestToken))
        {
            return Result<DeltaTableSnapshot>.Failure("A delegated Fabric REST token is required for Semantic Model enforcement.", "FabricRestTokenMissing");
        }

        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"{_fabricApiBase}/workspaces/{target.WorkspaceId}/semanticModels/{target.TargetItemId}/getDefinition?format=TMDL");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", credentials.FabricRestToken);

        using var response = await _httpClient.SendAsync(request, ct).ConfigureAwait(false);
        var body = await response.Content.ReadAsStringAsync(ct).ConfigureAwait(false);

        // getDefinition may return 202 Accepted with an async operation poll URL.
        if (response.StatusCode == System.Net.HttpStatusCode.Accepted)
        {
            var pollUrl = response.Headers.Location?.ToString()
                ?? (body.Length > 0 ? TryExtractPollUrl(body) : null);

            if (!string.IsNullOrWhiteSpace(pollUrl))
            {
                body = await PollDefinitionAsync(pollUrl, credentials.FabricRestToken, ct).ConfigureAwait(false) ?? body;
            }
        }
        else if (!response.IsSuccessStatusCode)
        {
            return Result<DeltaTableSnapshot>.Failure($"Semantic model definition request failed with status {(int)response.StatusCode}.", "SemanticModelDefinitionFailed");
        }

        var columns = SemanticModelDefinitionParser.ParseColumns(body, FabricTargetPath.ParseSingleName(server.Path));
        return columns.Count == 0
            ? Result<DeltaTableSnapshot>.Failure("Semantic model definition did not include matching table columns.", "SemanticModelSchemaEmpty")
            : Result<DeltaTableSnapshot>.Success(new DeltaTableSnapshot
            {
                Version = 0,
                Schema = new DeltaSchema { Columns = columns },
                PartitionColumns = [],
                LastModifiedUtc = DateTimeOffset.UtcNow,
            });
    }

    private static string? TryExtractPollUrl(string body)
    {
        try
        {
            using var doc = JsonDocument.Parse(body);
            return doc.RootElement.TryGetProperty("Location", out var loc) ? loc.GetString()
                : doc.RootElement.TryGetProperty("location", out var loc2) ? loc2.GetString()
                : null;
        }
        catch { return null; }
    }

    private async Task<string?> PollDefinitionAsync(string pollUrl, string token, CancellationToken ct)
    {
        // Poll up to 12 times with 3-second delays (36s total).
        // The Fabric operations endpoint returns 200 with {"status":"Running"/"Succeeded"/"Failed"}.
        for (var attempt = 0; attempt < 12; attempt++)
        {
            await Task.Delay(3000, ct).ConfigureAwait(false);
            using var poll = new HttpRequestMessage(HttpMethod.Get, pollUrl);
            poll.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            using var pollResp = await _httpClient.SendAsync(poll, ct).ConfigureAwait(false);

            if (!pollResp.IsSuccessStatusCode)
            {
                break;
            }

            var body = await pollResp.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
            try
            {
                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;
                if (!root.TryGetProperty("status", out var statusProp))
                {
                    // No status field — treat as the raw definition response.
                    return body;
                }

                var status = statusProp.GetString();
                if (status == "Succeeded")
                {
                    // The definition is nested: { "status": "Succeeded", "result": { "definition": {...} } }
                    // Unwrap to the definition level so the parser finds it directly.
                    if (root.TryGetProperty("result", out var result))
                    {
                        return result.ToString();
                    }
                    return body;
                }

                if (status == "Failed")
                {
                    return null;
                }

                // status == "Running" / "NotStarted" — keep polling.
            }
            catch
            {
                return body;
            }
        }

        return null;
    }
}

internal static class FabricTargetPath
{
    public static SqlSource ParseSql(string path)
    {
        var trimmed = path.Trim().Trim('/');
        var candidate = !trimmed.Contains("://", StringComparison.Ordinal) && trimmed.Contains('/', StringComparison.Ordinal)
            ? trimmed.Replace("/", ".", StringComparison.Ordinal)
            : ParseSingleName(path).Replace("/", ".", StringComparison.Ordinal);
        var segments = candidate.Split('.', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        return segments.Length >= 2
            ? new SqlSource(segments[^2], segments[^1])
            : new SqlSource("dbo", segments.Length == 1 ? segments[0] : candidate);
    }

    public static string ParseSingleName(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return "unknown";
        }

        var marker = "/Tables/";
        var markerIndex = path.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (markerIndex >= 0)
        {
            return path[(markerIndex + marker.Length)..].Trim('/').Split('/').LastOrDefault() ?? "unknown";
        }

        var trimmed = path.Trim().Trim('/');
        if (trimmed.Contains("://", StringComparison.Ordinal))
        {
            return trimmed.Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).LastOrDefault() ?? trimmed;
        }

        return trimmed.Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).LastOrDefault() ?? trimmed;
    }
}

internal sealed record SqlSource(string Schema, string Table);

internal static class KqlSchemaParser
{
    public static IReadOnlyList<DeltaColumn> ParseColumns(string responseBody)
    {
        // The Kusto .show table <T> schema as json response structure:
        //   Tables[0].Rows[0][1] = JSON string with { OrderedColumns: [{Name, CslType}] }
        using var document = JsonDocument.Parse(responseBody);
        var schemaJson = ExtractSchemaJson(document.RootElement);
        if (schemaJson is null)
        {
            return [];
        }

        using var schemaDoc = JsonDocument.Parse(schemaJson);
        if (!schemaDoc.RootElement.TryGetProperty("OrderedColumns", out var cols) ||
            cols.ValueKind != JsonValueKind.Array)
        {
            return [];
        }

        var columns = new List<DeltaColumn>();
        foreach (var col in cols.EnumerateArray())
        {
            var name = col.TryGetProperty("Name", out var n) ? n.GetString() : null;
            var type = col.TryGetProperty("CslType", out var t) ? t.GetString() : "string";
            if (!string.IsNullOrWhiteSpace(name))
            {
                columns.Add(new DeltaColumn { Name = name, Type = type ?? "string", Nullable = true });
            }
        }

        return columns;
    }

    private static string? ExtractSchemaJson(JsonElement root)
    {
        // Traverse Tables[].Rows[][1] to find the schema JSON string.
        if (!root.TryGetProperty("Tables", out var tables) || tables.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        foreach (var table in tables.EnumerateArray())
        {
            if (!table.TryGetProperty("Rows", out var rows) || rows.ValueKind != JsonValueKind.Array)
            {
                continue;
            }

            foreach (var row in rows.EnumerateArray())
            {
                if (row.ValueKind != JsonValueKind.Array)
                {
                    continue;
                }

                // The schema JSON string is always the second element (index 1).
                var items = row.EnumerateArray().ToList();
                if (items.Count > 1 && items[1].ValueKind == JsonValueKind.String)
                {
                    var candidate = items[1].GetString();
                    if (!string.IsNullOrWhiteSpace(candidate) && candidate.Contains("OrderedColumns", StringComparison.Ordinal))
                    {
                        return candidate;
                    }
                }
            }
        }

        return null;
    }
}

internal static class SemanticModelDefinitionParser
{
    public static IReadOnlyList<DeltaColumn> ParseColumns(string responseBody, string tableName)
    {
        using var document = JsonDocument.Parse(responseBody);
        var root = document.RootElement;

        // Handle both { "definition": { "parts": [...] } }
        // and the raw operation result { "parts": [...] } (when already unwrapped by the poller).
        JsonElement parts;
        if (root.TryGetProperty("definition", out var definition))
        {
            if (!definition.TryGetProperty("parts", out parts) || parts.ValueKind != JsonValueKind.Array)
            {
                return [];
            }
        }
        else if (root.TryGetProperty("parts", out parts) && parts.ValueKind == JsonValueKind.Array)
        {
            // Already at the parts level.
        }
        else
        {
            return [];
        }

        var columns = new List<DeltaColumn>();
        foreach (var part in parts.EnumerateArray())
        {
            var path = part.TryGetProperty("path", out var pathProperty) ? pathProperty.GetString() : null;
            // TMDL table path: "definition/tables/{tableName}.tmdl"
            // Check for both "tables/{name}" and "{name}.tmdl" patterns.
            if (string.IsNullOrWhiteSpace(path) ||
                !path.Contains("tables/", StringComparison.OrdinalIgnoreCase) ||
                !path.Contains(tableName, StringComparison.OrdinalIgnoreCase) ||
                !part.TryGetProperty("payload", out var payloadProperty))
            {
                continue;
            }

            // Payload may be base64 (InlineBase64) or raw text (PlainText).
            var payloadType = part.TryGetProperty("payloadType", out var pt) ? pt.GetString() : null;
            var rawPayload = payloadProperty.GetString() ?? string.Empty;
            string tmdlText;
            try
            {
                tmdlText = (payloadType?.Equals("InlineBase64", StringComparison.OrdinalIgnoreCase) == true)
                    || (!rawPayload.Contains('\n') && rawPayload.Length % 4 == 0)
                    ? Encoding.UTF8.GetString(Convert.FromBase64String(rawPayload))
                    : rawPayload;
            }
            catch
            {
                tmdlText = rawPayload;
            }

            foreach (var line in tmdlText.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                if (!line.StartsWith("column ", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                var segments = line.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                if (segments.Length >= 2)
                {
                    columns.Add(new DeltaColumn
                    {
                        Name = segments[1].Trim('\'', '"'),
                        Type = segments.Length >= 3 ? segments[2] : "semantic",
                        Nullable = true,
                    });
                }
            }
        }

        return columns;
    }
}
