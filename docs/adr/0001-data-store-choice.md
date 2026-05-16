# ADR 0001: Data store choice

## Context

Orqentis needs durable metadata for contracts, enforcement runs, tenants, audit trails, and scheduler state. The platform runs on Azure App Service and must support relational querying, transactional updates, backup/restore, and managed operations.

## Decision

Use Azure Database for PostgreSQL Flexible Server as the primary operational data store.

## Status

Accepted.

## Consequences

PostgreSQL provides strong relational semantics, managed backups, HA options, and EF Core support. Operations must maintain failover and restore runbooks, monitor CPU/storage/connections, and keep migrations append-only through DbUp.
