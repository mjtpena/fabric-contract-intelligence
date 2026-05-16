# ADR 0004: YAML as contract language

## Context

Contracts must be readable by data producers, platform engineers, and auditors while remaining machine-validated.

## Decision

Use ODCS v3.1.0 YAML as the contract language and validate with the repository JSON Schema before activation.

## Status

Accepted.

## Consequences

The ODCS validator is authoritative. Invalid YAML cannot become active. Tooling must keep schema IntelliSense and backend validation aligned with ODCS v3.1.0.
