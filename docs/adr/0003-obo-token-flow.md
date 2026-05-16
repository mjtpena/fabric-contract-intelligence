# ADR 0003: OBO token flow

## Context

Orqentis enforces contracts at the Delta table layer inside customer OneLake data. Data plane reads must honor the user's delegated permissions.

## Decision

Use Microsoft Entra ID On-Behalf-Of token exchange for OneLake and Fabric data plane access.

## Status

Accepted.

## Consequences

The API must validate caller tokens, exchange delegated tokens, and propagate correlation IDs. Application identity is forbidden for OneLake data plane operations, so credential health and tenant consent are critical operational dependencies.
