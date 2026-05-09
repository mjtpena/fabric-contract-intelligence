# Sprint 2 — Engine Foundations: Delta Log Reader, ODCS Parser, ODCS Validator

## Goal

Implement the **read** half of the Enforcement Engine: open a Delta table at an
`abfss://` URI using an OBO token, parse its `_delta_log/*.json` commits into a typed
`DeltaTableSnapshot`, and round-trip an ODCS v3.1.0 YAML contract through a parser and a
JSON-Schema-backed validator.

**Spec sections:** §4.2 steps 4–5, §6, §9.1, §9.2, §16.2 Sprint 2.
**FR coverage:** FR-001 (partial — validation half), FR-006 (freshness inputs).

## Pre-requisites

Sprint 1 (scaffold) merged.

## Files to create / modify

### `backend/FCI.Engine/Delta/`

- `DeltaTableSnapshot.cs` — record exposing `Version`, `Schema`, `PartitionColumns`, `LastModifiedUtc`.
- `DeltaSchema.cs` — record: `IReadOnlyList<DeltaColumn>`.
- `DeltaColumn.cs` — record: `Name`, `Type`, `Nullable`, `Metadata`.
- `IDeltaLogReader.cs` — `Task<DeltaTableSnapshot> ReadAsync(string abfssUri, string oboToken, CancellationToken ct)`.
- `DeltaLogReader.cs` — implementation using `Azure.Storage.Files.DataLake` with the OBO token.
- `ISchemaExtractor.cs` + `SchemaExtractor.cs` — extract `DeltaSchema` from the latest
  `metaData` action in the log JSONs.
- `TransactionLogParser.cs` — internal helper parsing the JSONL commit files.

### `backend/FCI.Engine/Odcs/`

- `ContractDefinition.cs` — record matching ODCS v3.1.0 sections we use (`apiVersion`,
  `kind`, `id`, `name`, `version`, `status`, `info`, `servers`, `schema`, `quality`,
  `freshness`, `sla`).
- `IOdcsContractParser.cs` + `OdcsContractParser.cs` — YAML → `ContractDefinition` via YamlDotNet.
- `IOdcsContractValidator.cs` + `OdcsContractValidator.cs` — JSON-Schema validation via NJsonSchema.
- `Schema/odcs-v3.1.0.json` — paste the official schema from
  https://github.com/bitol-io/open-data-contract-standard. Embed as resource.
- `OdcsContractSerializer.cs` — `ContractDefinition` → YAML (used when saving AI-generated drafts).

### Tests (`backend/FCI.Tests/FCI.Engine.Tests/`)

- `Delta/TransactionLogParserTests.cs` — parses fixture files in
  `backend/FCI.Tests/Fixtures/delta/01-create/`, `02-add-column/`, `03-drop-column/`.
- `Delta/SchemaExtractorTests.cs` — covers `metaData`, `add`, `remove`, partition columns.
- `Odcs/OdcsContractParserTests.cs` — round-trip the healthcare sample contract.
- `Odcs/OdcsContractValidatorTests.cs` — known-good (healthcare) passes; known-bad
  (missing `apiVersion`) fails with a precise error path.

## Interface signatures

```csharp
namespace FCI.Engine.Delta;

public interface IDeltaLogReader
{
    Task<Result<DeltaTableSnapshot>> ReadAsync(
        string abfssUri,
        string oneLakeOboToken,
        CancellationToken ct = default);
}

public sealed record DeltaTableSnapshot
{
    public required long Version { get; init; }
    public required DeltaSchema Schema { get; init; }
    public required IReadOnlyList<string> PartitionColumns { get; init; }
    public required DateTimeOffset LastModifiedUtc { get; init; }
}
```

```csharp
namespace FCI.Engine.Odcs;

public interface IOdcsContractValidator
{
    /// <summary>Validate raw ODCS YAML against the v3.1.0 JSON Schema.</summary>
    /// <returns>Empty list = valid. Each entry = one schema violation (path + message).</returns>
    IReadOnlyList<OdcsValidationError> Validate(string odcsYaml);
}

public sealed record OdcsValidationError(string JsonPath, string Message);
```

## Acceptance criteria

- [ ] `IDeltaLogReader.ReadAsync` returns the correct `Version`, `Schema`, partition cols,
      and `LastModifiedUtc` for the three fixture transaction logs.
- [ ] `OdcsContractParser` round-trips `healthcare.contract.yaml` with no information loss
      (parse → serialize → parse equals original parsed object via `BeEquivalentTo`).
- [ ] `OdcsContractValidator` returns `[]` for the healthcare contract.
- [ ] `OdcsContractValidator` returns a list including a `JsonPath="$.apiVersion"` error
      for a contract missing `apiVersion`.
- [ ] Unit test coverage on `FCI.Engine` ≥ 85 %.
- [ ] No new warnings on `dotnet build`.

## Test plan

- Fixtures committed under `backend/FCI.Tests/Fixtures/delta/{scenario}/_delta_log/000…0.json`.
- A private `FakeDeltaLakeServer` spins up over `WireMock.Net` to serve fixture bytes;
  `DeltaLogReader` is wired against it via a `HttpClient` dependency.
- Property-based tests with `Bogus` for Schema → ContractDefinition mappings.

## Out-of-scope

- Schema rule evaluation → Sprint 3.
- Quality rule evaluation → Sprint 7.
- Hooking up to the API → Sprint 4.
