"""
Massive multi-domain Orqentis production stress test.

Creates 5 industry-realistic Delta tables in a fresh Fabric Lakehouse, then
publishes ODCS v3.1.0 contracts against each, runs enforcement, and reports.
"""
from __future__ import annotations

import datetime as dt
import io
import json
import os
import random
import subprocess
import sys
import time
import urllib.error
import urllib.request

import pyarrow as pa
import pyarrow.parquet as pq

# ─── config ───────────────────────────────────────────────────────────────────

WORKSPACE_ID   = "30eedabb-47c6-49ef-89af-7bb7cd9ba364"
WORKSPACE_NAME = "Orqentis-Demo-202605170902"
LAKEHOUSE_ID   = "abdf591d-0606-4970-ad7e-fc55f458b181"
LAKEHOUSE_NAME = "DemoLakehouse"
ONELAKE_HOST   = "onelake.dfs.fabric.microsoft.com"
ABFSS_BASE     = f"abfss://{WORKSPACE_NAME}@{ONELAKE_HOST}/{LAKEHOUSE_NAME}.Lakehouse/Tables"
API_BASE       = "https://orqentis-production-api.azurewebsites.net"
API_RESOURCE   = "api://7a234404-ea08-454c-b2b5-0acb523f0417"

BATCH_SIZE = 500_000

# Industry-flavoured datasets. Each gets a custom schema, a custom Parquet
# generator, an ODCS YAML, and an enforcement run.
DATASETS = [
    {"name": "fin_payments",       "rows": 100_000, "generator": "fin"},
    {"name": "health_claims",      "rows":  80_000, "generator": "health"},
    {"name": "iot_telemetry",      "rows": 150_000, "generator": "iot"},
    {"name": "retail_orders",      "rows":  60_000, "generator": "retail"},
    {"name": "co2_emissions_wide", "rows":  80_000, "generator": "co2"},
]
# Total: ~470k rows — keeps demo workspace small enough for fast review.

REGIONS    = ["AU","US","DE","JP","IN","GB","CA","BR","SG","ZA","FR","NL","SE","KR","MX"]
CHANNELS   = ["web","mobile","pos","api","partner"]
PAYMENT    = ["card","ach","wire","wallet","crypto"]
ICDS       = ["A01","B02","C34","D50","E11","F32","G40","H25","I10","J45"]
DEVICETYPE = ["sensor","gateway","actuator","camera","controller"]
PRODCATS   = ["electronics","apparel","grocery","home","sports","beauty","toys"]

# ─── token helpers ────────────────────────────────────────────────────────────

def get_token(resource: str) -> str:
    az = r"C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd"
    r = subprocess.run(
        [az, "account", "get-access-token", "--resource", resource,
         "--query", "accessToken", "-o", "tsv"],
        capture_output=True, text=True, check=True, shell=False,
    )
    return r.stdout.strip()


# ─── per-domain Parquet generation ────────────────────────────────────────────

def _utc_now():
    return dt.datetime.now(dt.timezone.utc)


def gen_fin(batch_id: int, n: int) -> pa.Table:
    rng = random.Random(batch_id * 7919)
    base = batch_id * BATCH_SIZE
    return pa.table({
        "payment_id":     pa.array([f"pay_{base+i:012d}" for i in range(n)], pa.string()),
        "tenant_id":      pa.array([f"tenant-{rng.randint(1, 50):04d}" for _ in range(n)], pa.string()),
        "customer_id":    pa.array([f"cust_{rng.randint(1, 1_000_000):08d}" for _ in range(n)], pa.string()),
        "amount":         pa.array([round(rng.expovariate(1/250), 2) for _ in range(n)], pa.float64()),
        "currency":       pa.array([rng.choice(["AUD","USD","EUR","GBP","JPY","SGD"]) for _ in range(n)], pa.string()),
        "channel":        pa.array([rng.choice(CHANNELS) for _ in range(n)], pa.string()),
        "method":         pa.array([rng.choice(PAYMENT) for _ in range(n)], pa.string()),
        "merchant_id":    pa.array([f"mer_{rng.randint(1, 5000):05d}" for _ in range(n)], pa.string()),
        "status":         pa.array([rng.choices(["settled","pending","failed","refunded"], weights=[90,5,3,2])[0] for _ in range(n)], pa.string()),
        "is_fraud":       pa.array([rng.random() < 0.002 for _ in range(n)], pa.bool_()),
        "occurred_at":    pa.array([_utc_now() - dt.timedelta(seconds=rng.randint(0, 60*60*24*365)) for _ in range(n)], pa.timestamp("us", tz="UTC")),
        "ingested_at":    pa.array([_utc_now()] * n, pa.timestamp("us", tz="UTC")),
    })


def gen_health(batch_id: int, n: int) -> pa.Table:
    rng = random.Random(batch_id * 6151)
    base = batch_id * BATCH_SIZE
    return pa.table({
        "claim_id":        pa.array([f"clm_{base+i:012d}" for i in range(n)], pa.string()),
        "patient_id":      pa.array([f"pat_{rng.randint(1, 500_000):08d}" for _ in range(n)], pa.string()),
        "provider_npi":    pa.array([f"{rng.randint(10**9, 10**10 - 1)}" for _ in range(n)], pa.string()),
        "icd10_primary":   pa.array([rng.choice(ICDS) for _ in range(n)], pa.string()),
        "claim_amount":    pa.array([round(rng.uniform(50, 75000), 2) for _ in range(n)], pa.float64()),
        "paid_amount":     pa.array([round(rng.uniform(0, 75000), 2) for _ in range(n)], pa.float64()),
        "service_date":    pa.array([dt.date.today() - dt.timedelta(days=rng.randint(0, 365*3)) for _ in range(n)], pa.date32()),
        "is_inpatient":    pa.array([rng.random() < 0.18 for _ in range(n)], pa.bool_()),
        "los_days":        pa.array([rng.randint(0, 30) for _ in range(n)], pa.int32()),
        "region_code":     pa.array([rng.choice(REGIONS) for _ in range(n)], pa.string()),
        "ingested_at":     pa.array([_utc_now()] * n, pa.timestamp("us", tz="UTC")),
    })


def gen_iot(batch_id: int, n: int) -> pa.Table:
    rng = random.Random(batch_id * 5273)
    base = batch_id * BATCH_SIZE
    return pa.table({
        "event_id":     pa.array([base + i for i in range(n)], pa.int64()),
        "device_id":    pa.array([f"dev_{rng.randint(1, 250_000):07d}" for _ in range(n)], pa.string()),
        "device_type":  pa.array([rng.choice(DEVICETYPE) for _ in range(n)], pa.string()),
        "site_code":    pa.array([f"site_{rng.randint(1, 8000):05d}" for _ in range(n)], pa.string()),
        "metric_name":  pa.array([rng.choice(["temperature","humidity","pressure","voltage","amperage","rpm"]) for _ in range(n)], pa.string()),
        "metric_value": pa.array([round(rng.gauss(50, 12), 4) for _ in range(n)], pa.float64()),
        "unit":         pa.array([rng.choice(["C","RH%","kPa","V","A","rpm"]) for _ in range(n)], pa.string()),
        "is_anomaly":   pa.array([rng.random() < 0.01 for _ in range(n)], pa.bool_()),
        "captured_at":  pa.array([_utc_now() - dt.timedelta(seconds=rng.randint(0, 60*60*24*30)) for _ in range(n)], pa.timestamp("us", tz="UTC")),
        "ingested_at":  pa.array([_utc_now()] * n, pa.timestamp("us", tz="UTC")),
    })


def gen_retail(batch_id: int, n: int) -> pa.Table:
    rng = random.Random(batch_id * 4093)
    base = batch_id * BATCH_SIZE
    return pa.table({
        "order_id":      pa.array([f"ord_{base+i:012d}" for i in range(n)], pa.string()),
        "customer_id":   pa.array([f"cust_{rng.randint(1, 800_000):08d}" for _ in range(n)], pa.string()),
        "store_id":      pa.array([f"store_{rng.randint(1, 1200):05d}" for _ in range(n)], pa.string()),
        "channel":       pa.array([rng.choice(CHANNELS) for _ in range(n)], pa.string()),
        "category":      pa.array([rng.choice(PRODCATS) for _ in range(n)], pa.string()),
        "subtotal":      pa.array([round(rng.uniform(5, 5000), 2) for _ in range(n)], pa.float64()),
        "tax":           pa.array([round(rng.uniform(0, 500), 2) for _ in range(n)], pa.float64()),
        "discount":      pa.array([round(rng.uniform(0, 200), 2) for _ in range(n)], pa.float64()),
        "total":         pa.array([round(rng.uniform(5, 5500), 2) for _ in range(n)], pa.float64()),
        "item_count":    pa.array([rng.randint(1, 25) for _ in range(n)], pa.int32()),
        "status":        pa.array([rng.choices(["placed","picked","shipped","delivered","returned","cancelled"], weights=[5,10,30,45,5,5])[0] for _ in range(n)], pa.string()),
        "placed_at":     pa.array([_utc_now() - dt.timedelta(seconds=rng.randint(0, 60*60*24*200)) for _ in range(n)], pa.timestamp("us", tz="UTC")),
        "ingested_at":   pa.array([_utc_now()] * n, pa.timestamp("us", tz="UTC")),
    })


def gen_co2(batch_id: int, n: int) -> pa.Table:
    rng = random.Random(batch_id * 3001)
    base = batch_id * BATCH_SIZE
    return pa.table({
        "record_id":     pa.array([base + i for i in range(n)], pa.int64()),
        "country":       pa.array([rng.choice(REGIONS) for _ in range(n)], pa.string()),
        "year":          pa.array([rng.randint(1990, 2025) for _ in range(n)], pa.int32()),
        "sector":        pa.array([rng.choice(["energy","industry","transport","buildings","agriculture","waste"]) for _ in range(n)], pa.string()),
        "co2_tonnes":    pa.array([round(rng.uniform(0, 500_000), 2) for _ in range(n)], pa.float64()),
        "ch4_tonnes":    pa.array([round(rng.uniform(0, 50_000), 2) for _ in range(n)], pa.float64()),
        "n2o_tonnes":    pa.array([round(rng.uniform(0, 5_000), 2) for _ in range(n)], pa.float64()),
        "gdp_billion":   pa.array([round(rng.uniform(1, 25_000), 2) for _ in range(n)], pa.float64()),
        "population":    pa.array([rng.randint(50_000, 1_500_000_000) for _ in range(n)], pa.int64()),
        "is_estimated":  pa.array([rng.random() < 0.20 for _ in range(n)], pa.bool_()),
        "ingested_at":   pa.array([_utc_now()] * n, pa.timestamp("us", tz="UTC")),
    })


GENERATORS = {
    "fin":    gen_fin,
    "health": gen_health,
    "iot":    gen_iot,
    "retail": gen_retail,
    "co2":    gen_co2,
}

# Match generator output to a Delta schemaString.
def delta_schema(sample: pa.Table) -> str:
    type_map = {
        pa.int32():   "integer",
        pa.int64():   "long",
        pa.float32(): "float",
        pa.float64(): "double",
        pa.bool_():   "boolean",
        pa.string():  "string",
        pa.date32():  "date",
    }
    fields = []
    for fld in sample.schema:
        t = fld.type
        if pa.types.is_timestamp(t):
            tname = "timestamp"
        elif t in type_map:
            tname = type_map[t]
        else:
            tname = "string"
        fields.append({"name": fld.name, "type": tname, "nullable": fld.nullable, "metadata": {}})
    return json.dumps({"type": "struct", "fields": fields})


# ─── OneLake upload ───────────────────────────────────────────────────────────

def _onelake_url(path: str) -> str:
    return f"https://{ONELAKE_HOST}/{WORKSPACE_NAME}/{LAKEHOUSE_NAME}.Lakehouse/{path}"


def create_directory(path: str, tok: str) -> None:
    url = _onelake_url(path) + "?resource=directory"
    req = urllib.request.Request(url, method="PUT", headers={
        "Authorization": f"Bearer {tok}",
        "x-ms-version":  "2023-11-03",
        "Content-Length": "0",
    })
    try:
        urllib.request.urlopen(req).close()
    except urllib.error.HTTPError as e:
        if e.code not in (409,):
            raise


def upload_file(path: str, data: bytes, tok: str) -> None:
    base = _onelake_url(path)
    headers = {"Authorization": f"Bearer {tok}", "x-ms-version": "2023-11-03"}
    # 1) create+overwrite
    req = urllib.request.Request(base + "?resource=file&overwrite=true", method="PUT",
                                 headers={**headers, "Content-Length": "0"})
    urllib.request.urlopen(req).close()
    # 2) append
    req = urllib.request.Request(base + "?action=append&position=0", method="PATCH",
                                 data=data,
                                 headers={**headers,
                                          "Content-Length": str(len(data)),
                                          "Content-Type": "application/octet-stream"})
    urllib.request.urlopen(req).close()
    # 3) flush
    req = urllib.request.Request(base + f"?action=flush&position={len(data)}", method="PATCH",
                                 headers={**headers, "Content-Length": "0"})
    urllib.request.urlopen(req).close()


# ─── Delta log helpers ────────────────────────────────────────────────────────

def build_delta_log(parquet_files: list[dict], schema_str: str, table_name: str) -> bytes:
    ts = int(time.time() * 1000)
    lines = [
        json.dumps({"protocol": {"minReaderVersion": 1, "minWriterVersion": 2}}),
        json.dumps({"metaData": {
            "id": f"orqentis-massive-{table_name}",
            "format": {"provider": "parquet"},
            "schemaString": schema_str,
            "partitionColumns": [],
            "configuration": {},
            "createdTime": ts,
        }}),
    ]
    for f in parquet_files:
        lines.append(json.dumps({"add": {
            "path": f["path"],
            "size": f["size"],
            "modificationTime": ts,
            "dataChange": True,
            "stats": json.dumps({"numRecords": f["rows"]}),
        }}))
    lines.append(json.dumps({"commitInfo": {
        "timestamp": ts,
        "operation": "WRITE",
        "operationParameters": {"mode": "Overwrite"},
    }}))
    return "\n".join(lines).encode("utf-8")


# ─── Load one table ───────────────────────────────────────────────────────────

def load_table(dataset: dict, storage_tok: str) -> dict:
    name = dataset["name"]
    total = dataset["rows"]
    gen   = GENERATORS[dataset["generator"]]
    print(f"\n{'='*64}\n  Loading {name}: {total:,} rows\n{'='*64}")
    t0 = time.time()

    create_directory(f"Tables/{name}", storage_tok)
    create_directory(f"Tables/{name}/_delta_log", storage_tok)

    batches: list[tuple[int, int]] = []
    remaining, bid = total, 0
    while remaining > 0:
        batches.append((bid, min(remaining, BATCH_SIZE)))
        remaining -= BATCH_SIZE
        bid += 1
    print(f"  {len(batches)} Parquet batches x up to {BATCH_SIZE:,} rows")

    parquet_files = []
    schema_str = None
    for bid, n in batches:
        gt0 = time.time()
        tbl = gen(bid, n)
        if schema_str is None:
            schema_str = delta_schema(tbl)
        buf = io.BytesIO()
        pq.write_table(tbl, buf, compression="snappy", row_group_size=100_000)
        data = buf.getvalue()
        gen_ms = (time.time() - gt0) * 1000
        size_mb = len(data) / 1_048_576

        fname = f"part-{bid:05d}-0000.snappy.parquet"
        ut0 = time.time()
        upload_file(f"Tables/{name}/{fname}", data, storage_tok)
        up_ms = (time.time() - ut0) * 1000
        print(f"  batch {bid:>3}: gen {gen_ms:5.0f}ms | up {up_ms:5.0f}ms | {size_mb:5.1f} MB | {n:,} rows OK")
        parquet_files.append({"path": fname, "size": len(data), "rows": n})

    log_bytes = build_delta_log(parquet_files, schema_str or "{}", name)
    upload_file(f"Tables/{name}/_delta_log/00000000000000000000.json", log_bytes, storage_tok)
    elapsed = time.time() - t0
    bytes_total = sum(f["size"] for f in parquet_files)
    print(f"  Delta log OK  total {bytes_total/1_048_576:.1f} MB Parquet in {elapsed:.1f}s")
    return {
        "name": name,
        "rows": total,
        "bytes": bytes_total,
        "elapsed_s": elapsed,
        "abfss": f"{ABFSS_BASE}/{name}",
    }


# ─── Orqentis API: register contract + run ────────────────────────────────────

def build_odcs_yaml(name: str, abfss: str, sample_columns: list[tuple[str, str, bool]]) -> str:
    cols = "\n".join(
        f"      - name: {c}\n        logicalType: {t}\n        physicalType: {t.upper()}\n        required: {'true' if required else 'false'}"
        for c, t, required in sample_columns
    )
    return f"""apiVersion: v3.1.0
kind: DataContract
id: urn:orqentis:massive:{name}:v1
name: Massive {name}
version: 1.0.0
status: active
description:
  purpose: Synthetic massive-scale dataset for Orqentis enforcement validation.
  usage: Internal benchmark — not production data.
servers:
  - server: massive-onelake
    type: azure
    location: {abfss}
    format: delta
schema:
  - name: {name}
    physicalType: table
    description: Synthetic table for massive-scale enforcement.
    properties:
{cols}
slaProperties:
  - property: latency
    value: 24
    unit: hours
customProperties:
  - property: orqentisInfo
    value:
      title: Massive {name}
      description: Synthetic stress contract.
      owner: stress-test@orqentis.com
      contact:
        - name: Orqentis Stress
          email: stress-test@orqentis.com
          role: producer
  - property: orqentisQuality
    value:
      - type: nullRate
        column: {sample_columns[0][0]}
        threshold: 0.0
        severity: warning
      - type: uniqueness
        column: {sample_columns[0][0]}
        threshold: 1.0
        severity: warning
  - property: orqentisFreshness
    value:
      maxAgeHours: 168
      severity: warning
"""


def api_call(method: str, path: str, tok: str, body: bytes | None = None) -> dict:
    req = urllib.request.Request(
        f"{API_BASE}{path}",
        method=method,
        data=body,
        headers={
            "Authorization":    f"Bearer {tok}",
            "Content-Type":     "application/json",
            "Accept":           "application/json",
            "X-Workspace-Id":   WORKSPACE_ID,
            "X-Correlation-Id": f"massive-{int(time.time()*1000)}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            raw = resp.read()
            return {"status": resp.status, "body": json.loads(raw) if raw else None}
    except urllib.error.HTTPError as e:
        return {"status": e.code, "body": e.read().decode("utf-8", "replace")}
    except Exception as e:
        return {"status": -1, "body": str(e)}


SCHEMAS = {
    "fin_payments": [
        ("payment_id", "string", False), ("tenant_id", "string", False),
        ("customer_id", "string", False), ("amount", "number", False),
        ("currency", "string", False), ("channel", "string", False),
        ("method", "string", False), ("merchant_id", "string", False),
        ("status", "string", False), ("is_fraud", "boolean", False),
        ("occurred_at", "timestamp", False), ("ingested_at", "timestamp", False),
    ],
    "health_claims": [
        ("claim_id", "string", False), ("patient_id", "string", False),
        ("provider_npi", "string", False), ("icd10_primary", "string", False),
        ("claim_amount", "number", False), ("paid_amount", "number", False),
        ("service_date", "date", False), ("is_inpatient", "boolean", False),
        ("los_days", "integer", False), ("region_code", "string", False),
        ("ingested_at", "timestamp", False),
    ],
    "iot_telemetry": [
        ("event_id", "integer", False), ("device_id", "string", False),
        ("device_type", "string", False), ("site_code", "string", False),
        ("metric_name", "string", False), ("metric_value", "number", False),
        ("unit", "string", False), ("is_anomaly", "boolean", False),
        ("captured_at", "timestamp", False), ("ingested_at", "timestamp", False),
    ],
    "retail_orders": [
        ("order_id", "string", False), ("customer_id", "string", False),
        ("store_id", "string", False), ("channel", "string", False),
        ("category", "string", False), ("subtotal", "number", False),
        ("tax", "number", False), ("discount", "number", False),
        ("total", "number", False), ("item_count", "integer", False),
        ("status", "string", False), ("placed_at", "timestamp", False),
        ("ingested_at", "timestamp", False),
    ],
    "co2_emissions_wide": [
        ("record_id", "integer", False), ("country", "string", False),
        ("year", "integer", False), ("sector", "string", False),
        ("co2_tonnes", "number", False), ("ch4_tonnes", "number", False),
        ("n2o_tonnes", "number", False), ("gdp_billion", "number", False),
        ("population", "integer", False), ("is_estimated", "boolean", False),
        ("ingested_at", "timestamp", False),
    ],
}


def main():
    print(f"Workspace:  {WORKSPACE_NAME}  ({WORKSPACE_ID})")
    print(f"Lakehouse:  {LAKEHOUSE_NAME}  ({LAKEHOUSE_ID})")

    storage_tok = get_token("https://storage.azure.com")
    api_tok     = get_token(API_RESOURCE)

    summaries = []
    for ds in DATASETS:
        try:
            s = load_table(ds, storage_tok)
            summaries.append(s)
        except Exception as e:
            print(f"  ERROR loading {ds['name']}: {e}")
            summaries.append({"name": ds["name"], "error": str(e)})

    print(f"\n{'='*64}\n  Registering Orqentis contracts + running enforcement\n{'='*64}")
    runs = []
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%H%M%S")
    for s in summaries:
        if "error" in s:
            continue
        name = s["name"]
        yaml = build_odcs_yaml(name, s["abfss"], SCHEMAS[name])
        body = json.dumps({
            "mode":              "direct",
            "name":              f"Massive — {name} — {stamp}",
            "description":       f"Synthetic {s['rows']:,}-row contract for Orqentis massive-scale test.",
            "ownerEmail":        "stress-test@orqentis.com",
            "targetType":        "lakehouse",
            "targetItemId":      LAKEHOUSE_ID,
            "targetLakehouseId": LAKEHOUSE_ID,
            "targetTablePath":   s["abfss"],
            "odcsYaml":          yaml,
        }).encode("utf-8")

        t0 = time.time()
        c = api_call("POST", "/v1/contracts", api_tok, body)
        if c["status"] not in (200, 201):
            print(f"  {name}: contract create FAILED ({c['status']}): {c['body']}")
            runs.append({"name": name, "stage": "create", "status": c["status"], "body": c["body"]})
            continue
        cid = c["body"].get("id") or c["body"].get("contractId")
        print(f"  {name}: contract {cid} created in {(time.time()-t0)*1000:.0f}ms")

        # Trigger an enforcement run
        rt0 = time.time()
        r = api_call("POST", f"/v1/contracts/{cid}/runs", api_tok, b"{}")
        if r["status"] not in (200, 201, 202):
            print(f"  {name}: run trigger FAILED ({r['status']}): {r['body']}")
            runs.append({"name": name, "stage": "run", "status": r["status"], "body": r["body"]})
            continue
        rid = (r["body"] or {}).get("id") or (r["body"] or {}).get("runId")
        print(f"  {name}: run {rid} triggered in {(time.time()-rt0)*1000:.0f}ms  -> status {(r['body'] or {}).get('status')}")
        runs.append({"name": name, "contract_id": cid, "run_id": rid, "trigger_ms": (time.time()-rt0)*1000})

    out = {
        "workspace_id": WORKSPACE_ID,
        "workspace_name": WORKSPACE_NAME,
        "lakehouse_id": LAKEHOUSE_ID,
        "loads": summaries,
        "runs":  runs,
    }
    out_path = r"C:\Users\mjtpena\AppData\Local\Temp\orq-massive-summary.json"
    with open(out_path, "w") as f:
        json.dump(out, f, indent=2, default=str)
    print(f"\nWrote summary -> {out_path}")


if __name__ == "__main__":
    main()
