"""Smoke test: 50k rows per dataset, validate the full massive pipeline."""
import importlib.util, sys, os
spec = importlib.util.spec_from_file_location("massive", r"C:\Users\mjtpena\dev\fabric-workloads\fabric-contract-intelligence\scripts\Stress-Massive-Production.py")
m = importlib.util.module_from_spec(spec)
# Shrink datasets BEFORE loading by patching after import
sys.modules["massive"] = m
spec.loader.exec_module(m)
m.DATASETS = [
    {"name": "fin_payments",       "rows": 50_000, "generator": "fin"},
    {"name": "health_claims",      "rows": 50_000, "generator": "health"},
]
m.main()
