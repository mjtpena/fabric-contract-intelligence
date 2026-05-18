"""``@orqentis_gate`` decorator: Notebook / Spark read-gate.

Wraps any callable with a pre-call check against an Orqentis contract.
If the contract is in a blocking state (``violated`` by default, or the
latest enforcement run failed), the wrapper raises
:class:`ContractBlockedError` *before* the underlying function runs.

Example
-------
.. code-block:: python

    from orqentis import orqentis_gate

    @orqentis_gate("9a1f2c3d-...-...")
    def load_claims(spark):
        return spark.read.format("delta").load("Tables/claims")
"""

from __future__ import annotations

from functools import wraps
from typing import Any, Callable, Iterable, Optional, TypeVar

from .client import ContractBlockedError, ContractSnapshot, OrqentisClient

F = TypeVar("F", bound=Callable[..., Any])

DEFAULT_BLOCKING_STATUSES: frozenset[str] = frozenset({"violated", "blocked", "archived"})
DEFAULT_BLOCKING_RUN_STATUSES: frozenset[str] = frozenset({"failed", "blocked"})


def orqentis_gate(
    contract_id: str,
    *,
    client: Optional[OrqentisClient] = None,
    blocking_statuses: Iterable[str] = DEFAULT_BLOCKING_STATUSES,
    blocking_run_statuses: Iterable[str] = DEFAULT_BLOCKING_RUN_STATUSES,
    allow_offline: bool = False,
) -> Callable[[F], F]:
    """Decorator factory: check contract state before executing a function.

    Parameters
    ----------
    contract_id:
        GUID of the ODCS contract to enforce.
    client:
        Optional pre-configured :class:`OrqentisClient`. If omitted, a new
        client is constructed lazily from environment variables on the
        first call (so importing the decorator never blocks).
    blocking_statuses:
        Contract statuses that cause an immediate block. Case-insensitive.
    blocking_run_statuses:
        Latest-run statuses that cause an immediate block. Case-insensitive.
    allow_offline:
        If True, swallow transport errors (network down, API unreachable)
        and let the wrapped function run. Defaults to False: fail closed.
    """

    blocking_status_set = {s.lower() for s in blocking_statuses}
    blocking_run_set = {s.lower() for s in blocking_run_statuses}

    def decorator(func: F) -> F:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            snapshot = _fetch_snapshot(contract_id, client, allow_offline)
            if snapshot is None:
                return func(*args, **kwargs)

            status_lc = snapshot.status.lower()
            run_lc = (snapshot.last_run_status or "").lower()

            if status_lc in blocking_status_set:
                raise ContractBlockedError(
                    f"Contract '{snapshot.name}' ({snapshot.id}) is in status "
                    f"'{snapshot.status}' and cannot be read.",
                    contract_id=snapshot.id,
                    status=snapshot.status,
                    last_run_status=snapshot.last_run_status,
                    correlation_id=snapshot.correlation_id,
                )
            if run_lc in blocking_run_set:
                raise ContractBlockedError(
                    f"Contract '{snapshot.name}' ({snapshot.id}) last enforcement "
                    f"run is '{snapshot.last_run_status}'.",
                    contract_id=snapshot.id,
                    status=snapshot.status,
                    last_run_status=snapshot.last_run_status,
                    correlation_id=snapshot.correlation_id,
                )
            return func(*args, **kwargs)

        return wrapper  # type: ignore[return-value]

    return decorator


def _fetch_snapshot(
    contract_id: str,
    client: Optional[OrqentisClient],
    allow_offline: bool,
) -> Optional[ContractSnapshot]:
    try:
        resolved = client or OrqentisClient()
        return resolved.get_contract(contract_id)
    except Exception:
        if allow_offline:
            return None
        raise
