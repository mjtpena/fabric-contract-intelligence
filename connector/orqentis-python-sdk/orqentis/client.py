"""HTTP client for the Orqentis API.

Designed for Fabric Notebook / Spark job contexts: a thin wrapper over
``urllib`` so the SDK can ship with **zero third-party runtime dependencies**.
Authentication is via the ``X-Api-Key`` header issued by the Orqentis
workspace (``GET /v1/workspaces/api-keys``).
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
import uuid
from dataclasses import dataclass
from typing import Any, Mapping, Optional


class OrqentisError(RuntimeError):
    """Raised for any non-block error talking to the Orqentis API."""


class ContractBlockedError(OrqentisError):
    """Raised by ``@orqentis_gate`` when a contract forbids the call.

    Attributes
    ----------
    contract_id : str
        The ODCS contract that triggered the block.
    status : str
        Contract status as returned by the API (``violated``, ``deprecated`` …).
    last_run_status : str | None
        Status of the most recent enforcement run, if any.
    correlation_id : str
        The ``X-Correlation-Id`` of the API call that produced the verdict.
    """

    def __init__(
        self,
        message: str,
        *,
        contract_id: str,
        status: str,
        last_run_status: Optional[str],
        correlation_id: str,
    ) -> None:
        super().__init__(message)
        self.contract_id = contract_id
        self.status = status
        self.last_run_status = last_run_status
        self.correlation_id = correlation_id


@dataclass(frozen=True)
class ContractSnapshot:
    """Minimal projection of ``GET /v1/contracts/{id}`` used by the gate."""

    id: str
    name: str
    status: str
    last_run_status: Optional[str]
    correlation_id: str


class OrqentisClient:
    """Synchronous client for the Orqentis API.

    Parameters
    ----------
    base_url:
        Root of the Orqentis API (no trailing slash). Defaults to the
        ``ORQENTIS_API_URL`` environment variable.
    api_key:
        Workspace API key. Defaults to ``ORQENTIS_API_KEY``.
    timeout:
        Per-request timeout in seconds. Defaults to 15s (spec §3 rule 5).
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        *,
        timeout: float = 15.0,
    ) -> None:
        resolved_base = base_url or os.environ.get("ORQENTIS_API_URL")
        resolved_key = api_key or os.environ.get("ORQENTIS_API_KEY")
        if not resolved_base:
            raise OrqentisError(
                "Orqentis base URL not set. Pass base_url=... or set ORQENTIS_API_URL."
            )
        if not resolved_key:
            raise OrqentisError(
                "Orqentis API key not set. Pass api_key=... or set ORQENTIS_API_KEY."
            )
        self._base_url = resolved_base.rstrip("/")
        self._api_key = resolved_key
        self._timeout = timeout

    def get_contract(self, contract_id: str) -> ContractSnapshot:
        """Fetch a single contract by GUID and project to a snapshot."""
        payload, correlation_id = self._get(f"/v1/contracts/{contract_id}")
        return ContractSnapshot(
            id=str(payload.get("id", contract_id)),
            name=str(payload.get("name", "")),
            status=str(payload.get("status", "unknown")),
            last_run_status=_optional_str(payload.get("lastRunStatus")),
            correlation_id=correlation_id,
        )

    def _get(self, path: str) -> tuple[Mapping[str, Any], str]:
        correlation_id = str(uuid.uuid4())
        request = urllib.request.Request(
            url=f"{self._base_url}{path}",
            method="GET",
            headers={
                "X-Api-Key": self._api_key,
                "X-Correlation-Id": correlation_id,
                "Accept": "application/json",
                "User-Agent": "orqentis-python-sdk/0.1.0",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=self._timeout) as response:
                body = response.read().decode("utf-8")
                returned_id = response.headers.get("X-Correlation-Id") or correlation_id
        except urllib.error.HTTPError as http_err:
            detail = http_err.read().decode("utf-8", errors="replace") if http_err.fp else ""
            raise OrqentisError(
                f"Orqentis API returned {http_err.code} for GET {path}: {detail}"
            ) from http_err
        except urllib.error.URLError as url_err:
            raise OrqentisError(
                f"Failed to reach Orqentis API at {self._base_url}{path}: {url_err.reason}"
            ) from url_err

        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError as decode_err:
            raise OrqentisError(
                f"Orqentis API returned non-JSON body for GET {path}"
            ) from decode_err

        if not isinstance(data, dict):
            raise OrqentisError(
                f"Orqentis API returned unexpected payload shape for GET {path}"
            )
        return data, returned_id


def _optional_str(value: Any) -> Optional[str]:
    if value is None:
        return None
    return str(value)
