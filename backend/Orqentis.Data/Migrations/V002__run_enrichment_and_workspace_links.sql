-- =====================================================================================
-- Orqentis — Run enrichment + federation foundation (V002)
-- Adds breach breakdown + activator flag to enforcement runs and workspace links table.
-- =====================================================================================

ALTER TABLE enforcement_runs
    ADD COLUMN IF NOT EXISTS breach_score_breakdown JSONB NULL;

ALTER TABLE enforcement_runs
    ADD COLUMN IF NOT EXISTS activator_triggered BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS workspace_links (
    link_id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            UUID         NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    workspace_id         UUID         NOT NULL,
    linked_workspace_id  UUID         NOT NULL,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, workspace_id, linked_workspace_id)
);

CREATE INDEX IF NOT EXISTS ix_workspace_links_tenant_workspace
    ON workspace_links(tenant_id, workspace_id);

DROP TRIGGER IF EXISTS trg_workspace_links_updated_at ON workspace_links;
CREATE TRIGGER trg_workspace_links_updated_at BEFORE UPDATE ON workspace_links
    FOR EACH ROW EXECUTE FUNCTION orqentis_set_updated_at();
