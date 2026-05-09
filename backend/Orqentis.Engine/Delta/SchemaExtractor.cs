using Orqentis.Engine.Common;

namespace Orqentis.Engine.Delta;

/// <summary>Extracts Delta schema information from the latest <c>metaData</c> action.</summary>
internal sealed class SchemaExtractor : ISchemaExtractor
{
    /// <inheritdoc />
    public Result<DeltaSchemaDetails> Extract(IReadOnlyList<TransactionLogCommit> commits)
    {
        ArgumentNullException.ThrowIfNull(commits);

        var metadata = commits
            .OrderByDescending(static commit => commit.Version)
            .Select(static commit => commit.Metadata)
            .FirstOrDefault(static metadata => metadata is not null);

        if (metadata is null)
        {
            return Result<DeltaSchemaDetails>.Failure(
                "No metaData action was found in the Delta transaction log.",
                "DeltaMetadataMissing");
        }

        return Result<DeltaSchemaDetails>.Success(new DeltaSchemaDetails
        {
            Schema = metadata.Schema,
            PartitionColumns = metadata.PartitionColumns,
        });
    }
}
