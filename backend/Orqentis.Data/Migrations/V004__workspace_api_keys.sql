-- =====================================================================================
-- Orqentis — Workspace API keys (V004)
-- M2M keys for pipeline/notebook access to the Orqentis API.
-- Key hash stored as SHA-256 hex; only the prefix is returned after creation.
-- =====================================================================================

CREATE TABLE IF NOT EXISTS workspace_api_keys (
    key_id          UUID         PRIMARY KEY,
    tenant_id       UUID         NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    workspace_id    UUID         NOT NULL,
    display_name    TEXT         NOT NULL,
    key_prefix      TEXT         NOT NULL,
    key_hash        TEXT         NOT NULL,
    created_by      TEXT         NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_used_at    TIMESTAMPTZ  NULL,
    deleted_at      TIMESTAMPTZ  NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_workspace_api_keys_hash
    ON workspace_api_keys (key_hash)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_workspace_api_keys_workspace
    ON workspace_api_keys (tenant_id, workspace_id)
    WHERE deleted_at IS NULL;
