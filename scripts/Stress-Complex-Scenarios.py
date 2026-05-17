"""Complex-scenario stress tests against the live Orqentis production environment.

Covers:
  A. Wide-schema contract (60-column table)
  B. Type-drift breach (Parquet says number, contract says string)
  C. Freshness SLA breach (maxAgeHours=0.0001)
  D. Missing-table run (contract points at a path that doesn't exist)
  E. Concurrent runs (20 parallel)
  F. AI suggest-contract from live profile
  G. AI improve-contract on a barebones YAML
  H. NL Query (5 different phrasings)
  I. Reports + workspace listings
  J. Contract versioning (update -> v1.1.0)

Run:
    python scripts/Stress-Complex-Scenarios.py
"""

from __future__ import annotations

import datetime as dt
import json
import os
import random
import string
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

import pyarrow as pa
import pyarrow.parquet as pq

# Re-use the heavy lifting from the massive script
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib.util
_spec = importlib.util.spec_from_file_location(
    "massive",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "Stress-Massive-Production.py"),
)
massive = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(massive)  # type: ignore[union-attr]

API_BASE     = massive.API_BASE
API_RESOURCE = massive.API_RESOURCE
WS_ID        = massive.WORKSPACE_ID
WS_NAME      = massive.WORKSPACE_NAME
LH_ID        = massive.LAKEHOUSE_ID
LH_NAME      = massive.LAKEHOUSE_NAME

REPORT: dict = {"scenarios": {}}


def stamp() -> str:
    return dt.datetime.now(dt.timezone.utc).strftime("%H%M%S%f")[:9]


def get_token(resource: str) -> str:
    return massive.get_token(resource)


def api(method: str, path: str, tok: str, body: dict | None = None, timeout: int = 180) -> dict:
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(
        f"{API_BASE}{path}",
        method=method,
        data=data,
        headers={
            "Authorization":    f"Bearer {tok}",
            "Content-Type":     "application/json",
            "Accept":           "application/json",
            "X-Workspace-Id":   WS_ID,
            "X-Correlation-Id": f"cplx-{stamp()}",
        },
    )
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            return {
                "ok": True,
                "status": resp.status,
                "body": json.loads(raw) if raw else None,
                "ms": int((time.perf_counter() - t0) * 1000),
            }
    except urllib.error.HTTPError as e:
        return {"ok": False, "status": e.code, "body": e.read().decode("utf-8", "replace"),
                "ms": int((time.perf_counter() - t0) * 1000)}
    except Exception as e:
        return {"ok": False, "status": -1, "body": str(e),
                "ms": int((time.perf_counter() - t0) * 1000)}


def wait_for_run(run_id: str, tok: str, max_seconds: int = 60) -> dict:
    deadline = time.time() + max_seconds
    last = None
    while time.time() < deadline:
        last = api("GET", f"/v1/runs/{run_id}", tok)
        if last["ok"] and isinstance(last["body"], dict):
            status = (last["body"] or {}).get("status")
            if status not in (None, "queued", "running"):
                return last
        time.sleep(2)
    return last or {"ok": False, "status": -1, "body": "timeout"}


# -----------------------------------------------------------------------------
# Scenario A: Wide-schema contract (60 columns)
# -----------------------------------------------------------------------------

def make_wide_table(n_rows: int = 200_000, n_cols: int = 60) -> pa.Table:
    rng = random.Random(7331)
    cols: dict = {"row_id": pa.array(list(range(n_rows)), pa.int64())}
    for i in range(n_cols - 1):
        if i % 5 == 0:
            cols[f"str_{i:02d}"] = pa.array(
                ["".join(rng.choices(string.ascii_lowercase, k=8)) for _ in range(n_rows)], pa.string())
        elif i % 5 == 1:
            cols[f"int_{i:02d}"] = pa.array([rng.randint(0, 1_000_000) for _ in range(n_rows)], pa.int64())
        elif i % 5 == 2:
            cols[f"num_{i:02d}"] = pa.array([round(rng.gauss(100, 25), 4) for _ in range(n_rows)], pa.float64())
        elif i % 5 == 3:
            cols[f"bool_{i:02d}"] = pa.array([rng.random() < 0.5 for _ in range(n_rows)], pa.bool_())
        else:
            cols[f"ts_{i:02d}"] = pa.array(
                [massive._utc_now() - dt.timedelta(seconds=rng.randint(0, 86400)) for _ in range(n_rows)],
                pa.timestamp("us", tz="UTC"))
    return pa.table(cols)


def _upload_one_parquet_table(table_name: str, tbl: pa.Table, storage_tok: str) -> tuple[str, int]:
    """Upload a single PyArrow table as one Parquet file + Delta log v0. Returns (abfss, bytes)."""
    import io
    massive.create_directory(f"Tables/{table_name}", storage_tok)
    massive.create_directory(f"Tables/{table_name}/_delta_log", storage_tok)
    buf = io.BytesIO()
    pq.write_table(tbl, buf, compression="snappy", row_group_size=100_000)
    data = buf.getvalue()
    fname = "part-00000-0000.snappy.parquet"
    massive.upload_file(f"Tables/{table_name}/{fname}", data, storage_tok)
    schema_str = massive.delta_schema(tbl)
    log_bytes = massive.build_delta_log(
        [{"path": fname, "size": len(data), "rows": tbl.num_rows}],
        schema_str,
        table_name,
    )
    massive.upload_file(f"Tables/{table_name}/_delta_log/00000000000000000000.json", log_bytes, storage_tok)
    abfss = f"{massive.ABFSS_BASE}/{table_name}"
    return abfss, len(data)


def scenario_a_wide(storage_tok: str, api_tok: str) -> dict:
    print("\n[A] Wide-schema (60 cols, 200k rows)")
    table_name = f"wide_{stamp()}"
    tbl = make_wide_table()
    abfss, _ = _upload_one_parquet_table(table_name, tbl, storage_tok)

    # Build ODCS YAML with all 60 columns
    props_yaml_lines = []
    for field in tbl.schema:
        lt = {
            pa.string(): "string",
            pa.int64(): "integer",
            pa.float64(): "number",
            pa.bool_(): "boolean",
        }.get(field.type, None)
        if lt is None:
            if pa.types.is_timestamp(field.type):
                lt = "timestamp"
            else:
                lt = "string"
        props_yaml_lines.append(
            f"      - name: {field.name}\n"
            f"        logicalType: {lt}\n"
            f"        physicalType: {lt.upper()}\n"
            f"        required: false")
    props_yaml = "\n".join(props_yaml_lines)
    yaml = f"""apiVersion: v3.1.0
kind: DataContract
id: urn:orqentis:complex:wide:{stamp()}
name: Wide Schema Test
version: 1.0.0
status: active
description:
  purpose: 60-column wide-schema enforcement test.
servers:
  - server: massive-onelake
    type: azure
    location: {abfss}
    format: delta
schema:
  - name: {table_name}
    physicalType: table
    properties:
{props_yaml}
customProperties:
  - property: orqentisFreshness
    value:
      maxAgeHours: 24
      severity: warning
"""
    create = api("POST", "/v1/contracts", api_tok, {
        "mode": "direct", "name": f"WideSchema {stamp()}", "ownerEmail": "stress-test@orqentis.com",
        "targetType": "lakehouse", "targetItemId": LH_ID, "targetLakehouseId": LH_ID,
        "targetTablePath": abfss, "odcsYaml": yaml,
    })
    if not create["ok"]:
        return {"ok": False, "error": "create failed", "detail": create}
    cid = create["body"]["id"]
    run = api("POST", f"/v1/contracts/{cid}/runs", api_tok, {})
    if not run["ok"]:
        return {"ok": False, "error": "run trigger failed", "detail": run}
    final = wait_for_run(run["body"]["runId"], api_tok, 120)
    rj = (final["body"] or {}).get("resultJson") or {}
    return {
        "ok": True,
        "contractId": cid,
        "runId": run["body"]["runId"],
        "rowCount": tbl.num_rows,
        "colCount": tbl.num_columns,
        "overall": rj.get("overallStatus"),
        "schemaPassed": sum(1 for r in rj.get("schemaRules", []) if r.get("status") == "passed"),
        "schemaFailed": sum(1 for r in rj.get("schemaRules", []) if r.get("status") == "failed"),
        "schemaWarned": sum(1 for r in rj.get("schemaRules", []) if r.get("status") == "warned"),
        "freshness":   (rj.get("freshnessRule") or {}).get("status"),
        "createMs": create["ms"], "runTriggerMs": run["ms"],
    }


# -----------------------------------------------------------------------------
# Scenario B: Type drift breach
# -----------------------------------------------------------------------------

def scenario_b_type_drift(storage_tok: str, api_tok: str) -> dict:
    print("\n[B] Type-drift breach (Parquet number, contract string)")
    table_name = f"type_drift_{stamp()}"
    rng = random.Random(42)
    n = 50_000
    tbl = pa.table({
        "id":     pa.array(list(range(n)), pa.int64()),
        "amount": pa.array([round(rng.gauss(100, 10), 2) for _ in range(n)], pa.float64()),
        "label":  pa.array(["x"] * n, pa.string()),
    })
    abfss, _ = _upload_one_parquet_table(table_name, tbl, storage_tok)
    # Contract claims `amount` is STRING and `id` is STRING — both wrong on purpose
    yaml = f"""apiVersion: v3.1.0
kind: DataContract
id: urn:orqentis:complex:typedrift:{stamp()}
name: Type Drift Test
version: 1.0.0
status: active
description:
  purpose: Detect type-mismatch between contract and Delta schema.
servers:
  - server: massive-onelake
    type: azure
    location: {abfss}
    format: delta
schema:
  - name: {table_name}
    physicalType: table
    properties:
      - name: id
        logicalType: string
        physicalType: STRING
        required: false
      - name: amount
        logicalType: string
        physicalType: STRING
        required: false
      - name: label
        logicalType: string
        physicalType: STRING
        required: false
"""
    create = api("POST", "/v1/contracts", api_tok, {
        "mode": "direct", "name": f"TypeDrift {stamp()}", "ownerEmail": "stress-test@orqentis.com",
        "targetType": "lakehouse", "targetItemId": LH_ID, "targetLakehouseId": LH_ID,
        "targetTablePath": abfss, "odcsYaml": yaml,
    })
    if not create["ok"]:
        return {"ok": False, "error": "create failed", "detail": create}
    cid = create["body"]["id"]
    run = api("POST", f"/v1/contracts/{cid}/runs", api_tok, {})
    final = wait_for_run(run["body"]["runId"], api_tok, 60)
    rj = (final["body"] or {}).get("resultJson") or {}
    type_fails = [r for r in rj.get("schemaRules", []) if r.get("ruleId") == "schema.column.type" and r.get("status") == "failed"]
    return {
        "ok": True,
        "contractId": cid, "runId": run["body"]["runId"],
        "overall": rj.get("overallStatus"),
        "typeFailures": [{"col": r["column"], "expected": r["expected"], "actual": r["actual"]} for r in type_fails],
        "expectedAtLeast": 2,
        "passed": len(type_fails) >= 2,
    }


# -----------------------------------------------------------------------------
# Scenario C: Freshness breach
# -----------------------------------------------------------------------------

def scenario_c_freshness(api_tok: str, target_abfss: str) -> dict:
    print("\n[C] Freshness SLA breach (maxAgeHours=0.0001)")
    yaml = f"""apiVersion: v3.1.0
kind: DataContract
id: urn:orqentis:complex:freshness:{stamp()}
name: Freshness Breach Test
version: 1.0.0
status: active
description:
  purpose: Force a freshness violation with a 0.36-second SLA.
servers:
  - server: massive-onelake
    type: azure
    location: {target_abfss}
    format: delta
schema:
  - name: fin_payments
    physicalType: table
    properties:
      - name: payment_id
        logicalType: string
        physicalType: STRING
        required: false
customProperties:
  - property: orqentisFreshness
    value:
      maxAgeHours: 0.0001
      severity: error
"""
    create = api("POST", "/v1/contracts", api_tok, {
        "mode": "direct", "name": f"FreshBreach {stamp()}", "ownerEmail": "stress-test@orqentis.com",
        "targetType": "lakehouse", "targetItemId": LH_ID, "targetLakehouseId": LH_ID,
        "targetTablePath": target_abfss, "odcsYaml": yaml,
    })
    if not create["ok"]:
        return {"ok": False, "error": "create failed", "detail": create}
    cid = create["body"]["id"]
    run = api("POST", f"/v1/contracts/{cid}/runs", api_tok, {})
    final = wait_for_run(run["body"]["runId"], api_tok, 60)
    rj = (final["body"] or {}).get("resultJson") or {}
    fresh = rj.get("freshnessRule") or {}
    return {
        "ok": True, "contractId": cid, "runId": run["body"]["runId"],
        "overall": rj.get("overallStatus"),
        "freshnessStatus": fresh.get("status"),
        "ageHours": fresh.get("ageHours"),
        "maxAgeHours": fresh.get("maxAgeHours"),
        "passed": fresh.get("status") == "failed",
    }


# -----------------------------------------------------------------------------
# Scenario D: Missing table
# -----------------------------------------------------------------------------

def scenario_d_missing_table(api_tok: str) -> dict:
    print("\n[D] Missing-table run (path does not exist)")
    bogus = f"abfss://{WS_NAME}@onelake.dfs.fabric.microsoft.com/{LH_NAME}.Lakehouse/Tables/does_not_exist_{stamp()}"
    yaml = f"""apiVersion: v3.1.0
kind: DataContract
id: urn:orqentis:complex:missing:{stamp()}
name: Missing Table Test
version: 1.0.0
status: active
description:
  purpose: Enforce against a Delta table that doesn't exist.
servers:
  - server: massive-onelake
    type: azure
    location: {bogus}
    format: delta
schema:
  - name: ghost
    physicalType: table
    properties:
      - name: x
        logicalType: string
        physicalType: STRING
        required: false
"""
    create = api("POST", "/v1/contracts", api_tok, {
        "mode": "direct", "name": f"GhostTable {stamp()}", "ownerEmail": "stress-test@orqentis.com",
        "targetType": "lakehouse", "targetItemId": LH_ID, "targetLakehouseId": LH_ID,
        "targetTablePath": bogus, "odcsYaml": yaml,
    })
    if not create["ok"]:
        return {"ok": False, "error": "create failed", "detail": create}
    cid = create["body"]["id"]
    run = api("POST", f"/v1/contracts/{cid}/runs", api_tok, {})
    final = wait_for_run(run["body"]["runId"], api_tok, 90)
    return {
        "ok": True, "contractId": cid, "runId": run["body"]["runId"],
        "status": (final["body"] or {}).get("status"),
        "resultJsonNull": (final["body"] or {}).get("resultJson") is None,
        "errorMessage": str((final["body"] or {}).get("resultJson") or "")[:300],
    }


# -----------------------------------------------------------------------------
# Scenario E: Concurrent runs
# -----------------------------------------------------------------------------

def scenario_e_concurrent(api_tok: str, contract_ids: list[str], parallelism: int = 20) -> dict:
    print(f"\n[E] Concurrent runs (n={parallelism}) across {len(contract_ids)} contracts")
    results: list[dict] = []
    lock = threading.Lock()

    def worker(idx: int):
        cid = contract_ids[idx % len(contract_ids)]
        t0 = time.perf_counter()
        r = api("POST", f"/v1/contracts/{cid}/runs", api_tok, {})
        with lock:
            results.append({"idx": idx, "cid": cid, "ms": int((time.perf_counter() - t0) * 1000),
                            "status": r["status"], "ok": r["ok"],
                            "runId": (r["body"] or {}).get("runId") if r["ok"] else None})

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(parallelism)]
    t0 = time.perf_counter()
    for t in threads: t.start()
    for t in threads: t.join()
    wall_ms = int((time.perf_counter() - t0) * 1000)
    accepted = sum(1 for r in results if r["ok"])
    return {
        "ok": True, "parallelism": parallelism, "wallMs": wall_ms,
        "accepted": accepted, "rejected": parallelism - accepted,
        "p50_ms": sorted(r["ms"] for r in results)[len(results) // 2],
        "p95_ms": sorted(r["ms"] for r in results)[int(len(results) * 0.95)],
        "passed": accepted == parallelism,
    }


# -----------------------------------------------------------------------------
# Scenario F: AI suggest-contract
# -----------------------------------------------------------------------------

def scenario_f_ai_suggest(api_tok: str, target_abfss: str) -> dict:
    print("\n[F] AI suggest-contract")
    body = {
        "tableName": "fin_payments",
        "abfssUri": target_abfss,
        "columns": [
            {"name": "payment_id",  "type": "string",    "nullable": False, "distinctCount": 5_000_000, "nullCount": 0},
            {"name": "customer_id", "type": "string",    "nullable": True,  "distinctCount":   800_000, "nullCount": 0},
            {"name": "amount",      "type": "number",    "nullable": False, "distinctCount": 2_500_000, "nullCount": 0},
            {"name": "currency",    "type": "string",    "nullable": False, "distinctCount": 6,         "nullCount": 0},
            {"name": "status",      "type": "string",    "nullable": False, "distinctCount": 4,         "nullCount": 0},
            {"name": "is_fraud",    "type": "boolean",   "nullable": True,  "distinctCount": 2,         "nullCount": 0},
            {"name": "occurred_at", "type": "timestamp", "nullable": False, "distinctCount": 4_900_000, "nullCount": 0},
        ],
        "sampleRows": [
            {"payment_id": "pay_000000000001", "customer_id": "cust_00000123", "amount": "127.50",
             "currency": "AUD", "status": "settled", "is_fraud": "false", "occurred_at": "2026-05-16T03:21:09Z"},
            {"payment_id": "pay_000000000002", "customer_id": "cust_00099812", "amount": "23.10",
             "currency": "USD", "status": "settled", "is_fraud": "false", "occurred_at": "2026-05-16T03:21:11Z"},
        ],
    }
    r = api("POST", "/v1/ai/suggest-contract", api_tok, body, timeout=60)
    if not r["ok"]:
        return {"ok": False, "detail": r}
    yaml = (r["body"] or {}).get("odcsYaml", "")
    return {
        "ok": True,
        "ms": r["ms"],
        "model": (r["body"] or {}).get("modelUsed"),
        "yamlLen": len(yaml),
        "hasQuality": "orqentisQuality" in yaml,
        "hasFreshness": "orqentisFreshness" in yaml,
        "mentionsPii": "pii" in yaml.lower() or "customer_id" in yaml.lower(),
        "yamlFirstLine": yaml.split("\n")[0] if yaml else None,
    }


# -----------------------------------------------------------------------------
# Scenario G: AI improve-contract
# -----------------------------------------------------------------------------

def scenario_g_ai_improve(api_tok: str) -> dict:
    print("\n[G] AI improve-contract")
    barebones = """apiVersion: v3.1.0
kind: DataContract
id: urn:orqentis:demo:bare
name: Bare Contract
version: 1.0.0
status: active
description:
  purpose: Track customer purchases.
servers:
  - server: prod
    type: azure
    location: abfss://example@onelake.dfs.fabric.microsoft.com/Lakehouse.Lakehouse/Tables/purchases
    format: delta
schema:
  - name: purchases
    physicalType: table
    properties:
      - name: purchase_id
        logicalType: string
        physicalType: STRING
        required: true
      - name: customer_email
        logicalType: string
        physicalType: STRING
        required: true
      - name: amount
        logicalType: number
        physicalType: NUMBER
        required: true
"""
    r = api("POST", "/v1/ai/improve-contract", api_tok, {"odcsYaml": barebones}, timeout=60)
    if not r["ok"]:
        return {"ok": False, "detail": r}
    out = (r["body"] or {}).get("odcsYaml", "")
    return {
        "ok": True,
        "ms": r["ms"],
        "model": (r["body"] or {}).get("modelUsed"),
        "lenDelta": len(out) - len(barebones),
        "addedQuality": "orqentisQuality" in out and "orqentisQuality" not in barebones,
        "addedFreshness": "orqentisFreshness" in out and "orqentisFreshness" not in barebones,
        "mentionsPiiOnEmail": "customer_email" in out and ("pii" in out.lower()),
    }


# -----------------------------------------------------------------------------
# Scenario H: NL Query
# -----------------------------------------------------------------------------

def scenario_h_nl_query(api_tok: str) -> dict:
    print("\n[H] NL Query (5 phrasings)")
    queries = [
        "Show me all payment-related contracts",
        "Which contracts cover healthcare data?",
        "What governs sensor or telemetry data?",
        "Are there any retail or order contracts?",
        "Contracts for environmental emissions data",
    ]
    out = []
    for q in queries:
        r = api("POST", "/v1/ai/query", api_tok, {"query": q}, timeout=60)
        body = r.get("body") or {}
        out.append({
            "q": q,
            "ms": r["ms"],
            "ok": r["ok"],
            "model": body.get("modelUsed") if isinstance(body, dict) else None,
            "matches": len((body.get("matches") or [])) if isinstance(body, dict) else 0,
            "topMatchName": (((body.get("matches") or [{}])[:1] or [{}])[0].get("name")) if isinstance(body, dict) else None,
        })
    return {"ok": all(o["ok"] for o in out), "queries": out,
            "passed": all(o["ok"] and o["matches"] > 0 for o in out)}


# -----------------------------------------------------------------------------
# Scenario I: Reports + workspace listing
# -----------------------------------------------------------------------------

def scenario_i_reports(api_tok: str) -> dict:
    print("\n[I] Reports + workspace listings")
    summary = api("GET", "/v1/reports/summary", api_tok)
    audit   = api("GET", "/v1/reports/audit",   api_tok)
    list_c  = api("GET", "/v1/contracts",       api_tok)
    list_p  = api("GET", "/v1/policies",        api_tok)
    return {
        "ok": all(x["ok"] for x in [summary, audit, list_c, list_p]),
        "summary": {
            "ok": summary["ok"], "ms": summary["ms"],
            "contractsTotal": (summary["body"] or {}).get("contractsTotal") if summary["ok"] else None,
            "runsLast7d":     (summary["body"] or {}).get("runsLast7Days")  if summary["ok"] else None,
        },
        "audit": {"ok": audit["ok"], "ms": audit["ms"], "rowCount": len(audit["body"] or []) if audit["ok"] else None},
        "contracts": {"ok": list_c["ok"], "count": len(list_c["body"] or []) if list_c["ok"] else None},
        "policies": {"ok": list_p["ok"], "count": len(list_p["body"] or []) if list_p["ok"] else None},
    }


# -----------------------------------------------------------------------------
# Scenario J: Contract versioning
# -----------------------------------------------------------------------------

def scenario_j_versioning(api_tok: str, target_abfss: str) -> dict:
    print("\n[J] Contract versioning (v1.0.0 -> v1.1.0)")
    sfx = stamp()
    yaml_v1 = f"""apiVersion: v3.1.0
kind: DataContract
id: urn:orqentis:complex:vers:{sfx}
name: Version Test
version: 1.0.0
status: active
description:
  purpose: Test versioning.
servers:
  - server: massive-onelake
    type: azure
    location: {target_abfss}
    format: delta
schema:
  - name: fin_payments
    physicalType: table
    properties:
      - name: payment_id
        logicalType: string
        physicalType: STRING
        required: false
"""
    create = api("POST", "/v1/contracts", api_tok, {
        "mode": "direct", "name": f"Versioning {sfx}", "ownerEmail": "stress-test@orqentis.com",
        "targetType": "lakehouse", "targetItemId": LH_ID, "targetLakehouseId": LH_ID,
        "targetTablePath": target_abfss, "odcsYaml": yaml_v1,
    })
    if not create["ok"]:
        return {"ok": False, "error": "create v1 failed", "detail": create}
    cid = create["body"]["id"]
    yaml_v11 = yaml_v1.replace("version: 1.0.0", "version: 1.1.0").replace(
        "        required: false\n",
        "        required: false\n      - name: customer_id\n        logicalType: string\n        physicalType: STRING\n        required: false\n",
        1)
    upd = api("PUT", f"/v1/contracts/{cid}", api_tok, {
        "name": f"Versioning {sfx}", "ownerEmail": "stress-test@orqentis.com",
        "targetType": "lakehouse", "targetItemId": LH_ID, "targetLakehouseId": LH_ID,
        "targetTablePath": target_abfss, "odcsYaml": yaml_v11,
        "commitMessage": "Add customer_id to schema",
    })
    versions = api("GET", f"/v1/contracts/{cid}/versions", api_tok)
    vcount = len(versions["body"] or []) if versions["ok"] else None
    return {
        "ok": create["ok"] and upd["ok"] and versions["ok"],
        "contractId": cid,
        "createOk": create["ok"], "updateOk": upd["ok"], "updateStatus": upd["status"],
        "versionCount": vcount, "passed": (vcount or 0) >= 2,
    }


# -----------------------------------------------------------------------------
# Driver
# -----------------------------------------------------------------------------

def main():
    print(f"Workspace:  {WS_NAME}  ({WS_ID})")
    print(f"Lakehouse:  {LH_NAME}  ({LH_ID})")
    storage_tok = get_token("https://storage.azure.com")
    api_tok     = get_token(API_RESOURCE)

    fin_abfss = f"abfss://{WS_NAME}@onelake.dfs.fabric.microsoft.com/{LH_NAME}.Lakehouse/Tables/fin_payments"

    REPORT["scenarios"]["A_wide_schema"]      = scenario_a_wide(storage_tok, api_tok)
    REPORT["scenarios"]["B_type_drift"]       = scenario_b_type_drift(storage_tok, api_tok)
    REPORT["scenarios"]["C_freshness_breach"] = scenario_c_freshness(api_tok, fin_abfss)
    REPORT["scenarios"]["D_missing_table"]    = scenario_d_missing_table(api_tok)
    list_c = api("GET", "/v1/contracts", api_tok)
    cids = [c["id"] for c in (list_c["body"] or []) if "Massive" in (c.get("name") or "")][:5]
    REPORT["scenarios"]["E_concurrent_runs"]  = scenario_e_concurrent(api_tok, cids, parallelism=20) if cids else {"ok": False, "skip": True}
    REPORT["scenarios"]["F_ai_suggest"]       = scenario_f_ai_suggest(api_tok, fin_abfss)
    REPORT["scenarios"]["G_ai_improve"]       = scenario_g_ai_improve(api_tok)
    REPORT["scenarios"]["H_nl_query"]         = scenario_h_nl_query(api_tok)
    REPORT["scenarios"]["I_reports"]          = scenario_i_reports(api_tok)
    REPORT["scenarios"]["J_versioning"]       = scenario_j_versioning(api_tok, fin_abfss)

    out_path = os.path.join(os.environ.get("TEMP", "/tmp"), "orq-complex-scenarios.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(REPORT, f, indent=2, default=str)
    print(f"\nReport -> {out_path}")
    for name, res in REPORT["scenarios"].items():
        print(f"  {name:25} -> {json.dumps({k: v for k, v in res.items() if k != 'detail'}, default=str)[:200]}")


if __name__ == "__main__":
    main()
