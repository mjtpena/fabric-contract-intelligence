# ADR 0005: Fabric iframe hosting

## Context

Orqentis is a native Microsoft Fabric workload surfaced inside the Fabric portal, not a standalone SaaS UI.

## Decision

Host the frontend as a Fabric iframe workload using the workload-client SDK and enforce CSP `frame-ancestors` for approved Fabric origins.

## Status

Accepted.

## Consequences

The frontend must use the Fabric SDK for host integration, theme, item context, and auth. Security headers and allowed origins must be reviewed whenever Fabric hosting endpoints change.
