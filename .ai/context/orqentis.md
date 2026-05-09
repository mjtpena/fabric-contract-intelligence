# Orqentis Domain Language

This file defines the vocabulary of the Orqentis product. Agents should use these terms exactly —
they appear in API names, table names, log messages, and UI labels.

## Core entities

| Term | Meaning |
|---|---|
| **Tenant** | A Microsoft Fabric / Entra tenant that has installed Orqentis. One row in `tenants`. |
| **Contract** | A persisted ODCS v3.1.0 data contract bound to a single OneLake Delta table. |
| **Contract Version** | An immutable snapshot of a contract's YAML. Created on every `PUT /contracts/{id}`. |
| **Enforcement Run** (or **Run**) | A single execution of the engine against a contract + live table. Has status `running\|passed\|warned\|failed\|error`. |
| **Contract Policy** | Configuration that governs *how* a contract is enforced: cron schedule, alert routing, Activator rule binding. |
| **Rule Result** | The outcome of evaluating one rule (schema, quality, freshness) within a Run. |
| **Schema Diff** | Structured delta between live Delta schema and contract schema. |
| **Breach** | A Run whose `overallStatus` is `failed` (or `warned` if the policy alerts on warns). |
| **Breach Score** | An AI-computed 0–100 severity score on a breach. See spec §10.3. |

## Contract lifecycle

```
draft  ──save──►  draft        (every PUT keeps the contract in draft until activated)
draft  ──activate──►  active   (must pass OdcsContractValidator)
active ──supersede──►  deprecated  (when a newer version is activated)
any    ──soft-delete──►  archived  (deleted_at set; never returned by default queries)
```

## ODCS (Open Data Contract Standard)

- **Version:** 3.1.0 only. We do not support 2.x and we do not extend 3.1.0.
- **Governance:** Linux Foundation / Bitol project.
- **Schema source:** https://github.com/bitol-io/open-data-contract-standard
- **Media type:** `application/odcs+yaml;version=3.1.0`
- **Sections we use:** `apiVersion`, `kind`, `id`, `name`, `version`, `status`, `info`,
  `servers`, `schema`, `quality`, `freshness`, `sla`.

A canonical example lives at `contracts/examples/healthcare.contract.yaml`.

## Delta layer

- **OneLake Delta tables** are stored as Parquet + a `_delta_log/` directory of JSON
  transaction commits. Orqentis reads only the **transaction log** for schema/freshness; quality
  rules go through the Fabric **SQL endpoint** to avoid full table scans.
- **Schema source of truth:** the latest `metaData` action in `_delta_log/*.json`.
- **Last-modified source of truth:** the timestamp of the most recent commit (not Parquet
  file mtime, which is unreliable in OneLake).
- **Versions:** Delta versions are monotonic `BIGINT`. Stored in `enforcement_runs.delta_snapshot_version`.

## Rule taxonomy (spec §9.4)

| Rule ID | Type | Failing status |
|---|---|---|
| `schema.column.present` | Schema | Failed |
| `schema.column.type` | Schema | Failed |
| `schema.column.nullable` | Schema | Failed (per contract `required`) |
| `schema.column.extra` | Schema | Warned (configurable) |
| `schema.partition.match` | Schema | Warned |
| `quality.null_rate` | Quality | Per contract severity |
| `quality.uniqueness` | Quality | Per contract severity |
| `quality.regex` | Quality | Per contract severity |
| `quality.custom_sql` | Quality | Per contract severity |
| `freshness.max_age` | Freshness | Per contract severity |

## Tier gating

Two tiers exist: **Community** (free, single workspace, ≤20 contracts) and **Enterprise**
(paid). Enterprise-only features are gated server-side by the `tenants.tier` column. The
`[Enterprise]` C# attribute on a controller / handler returns 402 Payment Required for
Community tenants. See spec §3.2 for the full feature matrix.

## What Orqentis is *not*

- Not a data catalog. Use Microsoft Purview for that.
- Not a data quality monitoring product. (Great Expectations / Monte Carlo do that.)
- Not a pipeline orchestrator. Use Fabric Data Pipelines.
- Orqentis is exclusively a **contract definition + enforcement** layer.
