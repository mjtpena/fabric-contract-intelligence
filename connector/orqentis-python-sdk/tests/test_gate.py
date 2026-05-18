"""Unit tests for the @orqentis_gate decorator.

Uses a fake client (no network) so tests run on any developer machine.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import pytest

from orqentis import ContractBlockedError, OrqentisError, orqentis_gate
from orqentis.client import ContractSnapshot, OrqentisClient


@dataclass
class _FakeClient:
    snapshot: ContractSnapshot

    def get_contract(self, contract_id: str) -> ContractSnapshot:
        return self.snapshot


def _snapshot(status: str = "active", last_run: Optional[str] = "passed") -> ContractSnapshot:
    return ContractSnapshot(
        id="11111111-1111-1111-1111-111111111111",
        name="Claims",
        status=status,
        last_run_status=last_run,
        correlation_id="test-corr",
    )


def test_gate_passes_through_for_active_contract() -> None:
    fake = _FakeClient(_snapshot(status="active", last_run="passed"))

    @orqentis_gate("11111111-1111-1111-1111-111111111111", client=fake)  # type: ignore[arg-type]
    def loader() -> str:
        return "rows"

    assert loader() == "rows"


def test_gate_blocks_on_violated_status() -> None:
    fake = _FakeClient(_snapshot(status="violated", last_run="passed"))

    @orqentis_gate("11111111-1111-1111-1111-111111111111", client=fake)  # type: ignore[arg-type]
    def loader() -> str:
        return "rows"

    with pytest.raises(ContractBlockedError) as exc_info:
        loader()
    assert exc_info.value.status == "violated"
    assert exc_info.value.correlation_id == "test-corr"


def test_gate_blocks_on_failed_run() -> None:
    fake = _FakeClient(_snapshot(status="active", last_run="failed"))

    @orqentis_gate("11111111-1111-1111-1111-111111111111", client=fake)  # type: ignore[arg-type]
    def loader() -> str:
        return "rows"

    with pytest.raises(ContractBlockedError):
        loader()


def test_gate_status_check_is_case_insensitive() -> None:
    fake = _FakeClient(_snapshot(status="VIOLATED", last_run=None))

    @orqentis_gate("11111111-1111-1111-1111-111111111111", client=fake)  # type: ignore[arg-type]
    def loader() -> str:
        return "rows"

    with pytest.raises(ContractBlockedError):
        loader()


def test_gate_passes_through_when_no_last_run() -> None:
    fake = _FakeClient(_snapshot(status="active", last_run=None))

    @orqentis_gate("11111111-1111-1111-1111-111111111111", client=fake)  # type: ignore[arg-type]
    def loader() -> int:
        return 42

    assert loader() == 42


def test_gate_propagates_client_errors_by_default() -> None:
    class _BoomClient:
        def get_contract(self, contract_id: str) -> ContractSnapshot:
            raise OrqentisError("network down")

    @orqentis_gate("id", client=_BoomClient())  # type: ignore[arg-type]
    def loader() -> str:
        return "rows"

    with pytest.raises(OrqentisError):
        loader()


def test_gate_allow_offline_runs_function_on_transport_error() -> None:
    class _BoomClient:
        def get_contract(self, contract_id: str) -> ContractSnapshot:
            raise OrqentisError("network down")

    @orqentis_gate("id", client=_BoomClient(), allow_offline=True)  # type: ignore[arg-type]
    def loader() -> str:
        return "rows"

    assert loader() == "rows"


def test_client_requires_base_url_and_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ORQENTIS_API_URL", raising=False)
    monkeypatch.delenv("ORQENTIS_API_KEY", raising=False)
    with pytest.raises(OrqentisError):
        OrqentisClient()
