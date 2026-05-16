-- =====================================================================================
-- Orqentis — Idempotency keys (V005)
-- Stores scoped, 24-hour replay responses for mutating run requests.
-- =====================================================================================

CREATE TABLE IF NOT EXISTS idempotency_keys (
    key           TEXT        NOT NULL,
    workspace_id  UUID        NOT NULL,
    user_oid      UUID        NOT NULL,
    response_body JSONB       NOT NULL,
    status        INT         NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at    TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (workspace_id, user_oid, key)
);

CREATE INDEX IF NOT EXISTS ix_idempotency_keys_expires_at
    ON idempotency_keys (expires_at);
