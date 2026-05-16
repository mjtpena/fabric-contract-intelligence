"""Probe live AI suggest endpoint to verify real LLM (not fallback-template)."""
import json, subprocess, urllib.request

API_BASE = "https://orqentis-production-api.azurewebsites.net"
API_RESOURCE = "api://7a234404-ea08-454c-b2b5-0acb523f0417"
AZ = r"C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd"

def token():
    r = subprocess.run(
        [AZ, "account", "get-access-token", "--resource", API_RESOURCE,
         "--query", "accessToken", "-o", "tsv"],
        capture_output=True, text=True, check=True, shell=False)
    return r.stdout.strip()

payload = {
    "tableName": "fin_payments",
    "abfssUri": "abfss://probe@onelake.dfs.fabric.microsoft.com/Lakehouse.Lakehouse/Tables/fin_payments",
    "columns": [
        {"name": "payment_id", "type": "string", "nullable": False, "distinctCount": 1000, "nullCount": 0},
        {"name": "amount_usd", "type": "decimal", "nullable": False, "distinctCount": 950, "nullCount": 0},
        {"name": "currency", "type": "string", "nullable": False, "distinctCount": 5, "nullCount": 0},
        {"name": "payment_method", "type": "string", "nullable": False, "distinctCount": 5, "nullCount": 0},
        {"name": "country_iso2", "type": "string", "nullable": False, "distinctCount": 15, "nullCount": 0},
        {"name": "created_at", "type": "timestamp", "nullable": False, "distinctCount": 999, "nullCount": 0},
    ],
    "sampleRows": [
        {"payment_id": "p_001", "amount_usd": "124.50", "currency": "USD", "payment_method": "card", "country_iso2": "US", "created_at": "2026-05-15T10:11:12Z"},
        {"payment_id": "p_002", "amount_usd": "892.10", "currency": "EUR", "payment_method": "wire", "country_iso2": "DE", "created_at": "2026-05-15T11:12:13Z"},
        {"payment_id": "p_003", "amount_usd": "12.00",  "currency": "AUD", "payment_method": "wallet", "country_iso2": "AU", "created_at": "2026-05-15T12:13:14Z"},
    ],
}

req = urllib.request.Request(
    f"{API_BASE}/v1/ai/suggest-contract",
    data=json.dumps(payload).encode("utf-8"),
    method="POST",
    headers={
        "Authorization": f"Bearer {token()}",
        "Content-Type": "application/json",
        "X-Workspace-Id": "c20fb549-0b1f-4e75-93f1-7860137b2e94",
    },
)
try:
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = json.loads(resp.read())
        print(f"HTTP {resp.status}")
        print(f"ModelUsed:  {body.get('modelUsed')}")
        print(f"LatencyMs:  {body.get('latencyMs')}")
        print(f"Rationale:  {body.get('rationale')}")
        print(f"--- ODCS YAML (first 400 chars) ---")
        print((body.get('odcsYaml') or '')[:400])
except urllib.error.HTTPError as e:
    print(f"HTTP {e.code} {e.reason}")
    print(e.read().decode("utf-8", errors="replace")[:1200])
