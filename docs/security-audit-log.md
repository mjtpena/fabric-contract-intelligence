# Audit log immutability plan

Orqentis audit logging will become tamper-evident by storing a per-row SHA-256 hash chain. Each row's hash will cover `audit_log.created_at + actor + action + payload_hash + previous_hash`, where `payload_hash` is the SHA-256 digest of the canonical JSON payload and `previous_hash` is the prior audit row hash for the same tenant/workspace stream.

Retention will default to seven years for enterprise tenants and one year for community tenants, with legal-hold overrides preventing expiry. Future archival jobs should soft-delete only after retention has elapsed and after immutable export to tenant-controlled storage.

A future infrastructure change will enable the PostgreSQL `pgaudit` extension in Bicep and configure audit settings for DDL, write operations, and privileged access events.
