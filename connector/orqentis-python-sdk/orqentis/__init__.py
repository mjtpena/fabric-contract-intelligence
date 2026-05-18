"""Orqentis Python SDK.

Read-gate decorator for Fabric Notebooks. Wraps any function with an ODCS
contract check: the function is permitted to run only if the contract's
last enforcement run did not fail and the contract is not soft-deleted.

See: docs/spec.md and Phase 1 Epic 1.3 of the data-security-for-AI plan.
"""

from .client import OrqentisClient, OrqentisError, ContractBlockedError
from .gate import orqentis_gate

__all__ = [
    "OrqentisClient",
    "OrqentisError",
    "ContractBlockedError",
    "orqentis_gate",
]

__version__ = "0.1.0"
