using System.Text.Json;
using Azure;
using Azure.Core;
using Azure.Storage.Files.DataLake;
using Microsoft.Extensions.Logging;
using Orqentis.Engine.Common;

namespace Orqentis.Engine.Delta;

/// <summary>
/// Sprint 2 implementation target. Stub today.
/// Reads <c>_delta_log/*.json</c> from OneLake via Azure.Storage.Files.DataLake using
/// the supplied OBO token. Parses the JSONL commit files into a <see cref="DeltaTableSnapshot"/>.
/// </summary>
internal sealed class DeltaLogReader : IDeltaLogReader
{
    private const string _deltaLogFolderName = "_delta_log";

    private readonly HttpClient _httpClient;
    private readonly ISchemaExtractor _schemaExtractor;
    private readonly ILogger<DeltaLogReader> _logger;
    private readonly TransactionLogParser _parser = new();

    public DeltaLogReader(
        HttpClient httpClient,
        ISchemaExtractor schemaExtractor,
        ILogger<DeltaLogReader> logger)
    {
        _httpClient = httpClient;
        _schemaExtractor = schemaExtractor;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<Result<DeltaTableSnapshot>> ReadAsync(
        string abfssUri,
        string oneLakeOboToken,
        CancellationToken ct = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(abfssUri);
        ArgumentException.ThrowIfNullOrWhiteSpace(oneLakeOboToken);

        try
        {
            var logFiles = IsHttpUri(abfssUri)
                ? await ReadHttpLogFilesAsync(abfssUri, ct).ConfigureAwait(false)
                : await ReadAbfssLogFilesAsync(abfssUri, oneLakeOboToken, ct).ConfigureAwait(false);

            if (logFiles.Count == 0)
            {
                return Result<DeltaTableSnapshot>.Failure(
                    $"No Delta transaction-log files were found for '{abfssUri}'.",
                    "DeltaLogMissing");
            }

            var commits = logFiles
                .OrderBy(static file => file.Version)
                .Select(file => _parser.Parse(file.Version, file.Content))
                .ToArray();

            var schemaResult = _schemaExtractor.Extract(commits);
            if (!schemaResult.IsSuccess || schemaResult.Value is null)
            {
                return Result<DeltaTableSnapshot>.Failure(
                    schemaResult.Error ?? "Unable to extract the Delta schema.",
                    schemaResult.ErrorCode);
            }

            var latestCommit = commits.MaxBy(static commit => commit.Version)!;
            var lastModifiedUtc = latestCommit.CommitTimestampUtc;
            if (lastModifiedUtc is null)
            {
                return Result<DeltaTableSnapshot>.Failure(
                    $"The latest Delta commit for '{abfssUri}' did not include a commitInfo timestamp.",
                    "DeltaCommitTimestampMissing");
            }

            _logger.LogInformation(
                "DeltaLog-Read Uri={Uri} Version={Version} ColumnCount={ColumnCount}",
                abfssUri,
                latestCommit.Version,
                schemaResult.Value.Schema.Columns.Count);

            return Result<DeltaTableSnapshot>.Success(new DeltaTableSnapshot
            {
                Version = latestCommit.Version,
                Schema = schemaResult.Value.Schema,
                PartitionColumns = schemaResult.Value.PartitionColumns,
                LastModifiedUtc = lastModifiedUtc.Value,
            });
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "DeltaLog-ReadFailed Uri={Uri}", abfssUri);
            return Result<DeltaTableSnapshot>.Failure(
                $"Failed to read the Delta transaction log for '{abfssUri}': {ex.Message}",
                "DeltaReadFailed");
        }
    }

    private static bool IsHttpUri(string uri) =>
        uri.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
        uri.StartsWith("https://", StringComparison.OrdinalIgnoreCase);

    private async Task<IReadOnlyList<TransactionLogFile>> ReadHttpLogFilesAsync(string tableUri, CancellationToken ct)
    {
        var files = new List<TransactionLogFile>();
        var baseUri = EnsureTrailingSlash(tableUri);

        var startVersion = await TryReadHttpCheckpointVersionAsync(baseUri, ct).ConfigureAwait(false) is { } checkpointVersion
            ? checkpointVersion + 1
            : 0;

        for (long version = startVersion; ; version++)
        {
            var fileName = $"{version:D20}.json";
            var requestUri = new Uri(new Uri(baseUri), $"{_deltaLogFolderName}/{fileName}");

            using var response = await _httpClient.GetAsync(requestUri, ct).ConfigureAwait(false);
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                break;
            }

            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
            files.Add(new TransactionLogFile(version, content));
        }

        return files;
    }

    private async Task<long?> TryReadHttpCheckpointVersionAsync(string baseUri, CancellationToken ct)
    {
        using var response = await _httpClient.GetAsync(new Uri(new Uri(baseUri), $"{_deltaLogFolderName}/_last_checkpoint"), ct).ConfigureAwait(false);
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }

        response.EnsureSuccessStatusCode();
        var content = await response.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
        return TryParseCheckpointVersion(content);
    }

    private static async Task<IReadOnlyList<TransactionLogFile>> ReadAbfssLogFilesAsync(
        string abfssUri,
        string oneLakeOboToken,
        CancellationToken ct)
    {
        var descriptor = AbfssUriDescriptor.Parse(abfssUri);
        var credential = new StaticTokenCredential(oneLakeOboToken);
        var serviceClient = new DataLakeServiceClient(new Uri($"https://{descriptor.Host}"), credential);
        var fileSystemClient = serviceClient.GetFileSystemClient(descriptor.FileSystem);
        var deltaLogPath = string.IsNullOrWhiteSpace(descriptor.TablePath)
            ? _deltaLogFolderName
            : $"{descriptor.TablePath.TrimEnd('/')}/{_deltaLogFolderName}";

        var files = new List<TransactionLogFile>();
        var checkpointVersion = await TryReadAbfssCheckpointVersionAsync(fileSystemClient, deltaLogPath, ct).ConfigureAwait(false);

        await foreach (var pathItem in fileSystemClient.GetPathsAsync(
            path: deltaLogPath,
            recursive: false,
            cancellationToken: ct))
        {
            if (pathItem.IsDirectory == true)
            {
                continue;
            }

            var fileName = Path.GetFileName(pathItem.Name);
            if (!fileName.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (!TryParseVersion(fileName, out var version))
            {
                continue;
            }

            if (checkpointVersion.HasValue && version <= checkpointVersion.Value)
            {
                continue;
            }

            var fileClient = fileSystemClient.GetFileClient(pathItem.Name);
            var response = await fileClient.ReadAsync(cancellationToken: ct).ConfigureAwait(false);
            using var stream = response.Value.Content;
            using var reader = new StreamReader(stream);
            var content = await reader.ReadToEndAsync(ct).ConfigureAwait(false);

            files.Add(new TransactionLogFile(version, content));
        }

        return files;
    }

    private static async Task<long?> TryReadAbfssCheckpointVersionAsync(
        Azure.Storage.Files.DataLake.DataLakeFileSystemClient fileSystemClient,
        string deltaLogPath,
        CancellationToken ct)
    {
        try
        {
            var checkpointPath = $"{deltaLogPath.TrimEnd('/')}/_last_checkpoint";
            var fileClient = fileSystemClient.GetFileClient(checkpointPath);
            var response = await fileClient.ReadAsync(cancellationToken: ct).ConfigureAwait(false);
            using var stream = response.Value.Content;
            using var reader = new StreamReader(stream);
            return TryParseCheckpointVersion(await reader.ReadToEndAsync(ct).ConfigureAwait(false));
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            return null;
        }
    }

    private static long? TryParseCheckpointVersion(string checkpointJson)
    {
        using var document = JsonDocument.Parse(checkpointJson);
        return document.RootElement.TryGetProperty("version", out var versionElement) && versionElement.TryGetInt64(out var version)
            ? version
            : null;
    }

    private static string EnsureTrailingSlash(string uri) =>
        uri.EndsWith("/", StringComparison.Ordinal) ? uri : $"{uri}/";

    private static bool TryParseVersion(string fileName, out long version)
    {
        var versionText = Path.GetFileNameWithoutExtension(fileName);
        return long.TryParse(versionText, out version);
    }

    private sealed record TransactionLogFile(long Version, string Content);

    private sealed class StaticTokenCredential : TokenCredential
    {
        private readonly AccessToken _token;

        public StaticTokenCredential(string token)
        {
            _token = new AccessToken(token, DateTimeOffset.UtcNow.AddMinutes(15));
        }

        public override AccessToken GetToken(TokenRequestContext requestContext, CancellationToken cancellationToken) => _token;

        public override ValueTask<AccessToken> GetTokenAsync(
            TokenRequestContext requestContext,
            CancellationToken cancellationToken) => ValueTask.FromResult(_token);
    }

    private sealed record AbfssUriDescriptor(string FileSystem, string Host, string TablePath)
    {
        public static AbfssUriDescriptor Parse(string abfssUri)
        {
            const string schemeSeparator = "://";
            var schemeIndex = abfssUri.IndexOf(schemeSeparator, StringComparison.Ordinal);
            if (schemeIndex < 0)
            {
                throw new InvalidOperationException($"The URI '{abfssUri}' is not a valid abfss URI.");
            }

            var remainder = abfssUri[(schemeIndex + schemeSeparator.Length)..];
            var slashIndex = remainder.IndexOf('/', StringComparison.Ordinal);
            var authority = slashIndex >= 0 ? remainder[..slashIndex] : remainder;
            var tablePath = slashIndex >= 0 ? remainder[(slashIndex + 1)..] : string.Empty;

            var authorityParts = authority.Split('@', 2, StringSplitOptions.TrimEntries);
            if (authorityParts.Length != 2 || string.IsNullOrWhiteSpace(authorityParts[0]) || string.IsNullOrWhiteSpace(authorityParts[1]))
            {
                throw new InvalidOperationException($"The URI '{abfssUri}' must be in the form abfss://<filesystem>@<host>/<path>.");
            }

            return new AbfssUriDescriptor(authorityParts[0], authorityParts[1], tablePath);
        }
    }
}
