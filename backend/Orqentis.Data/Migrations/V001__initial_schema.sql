-- =====================================================================================
-- Orqentis — Initial Schema (V001)
-- Spec §5.1. Postgres 16+. Idempotent. Run by DbUp from Orqentis.Api at startup.
-- Conventions: snake_case, UUID PKs supplied by the application, TIMESTAMPTZ, soft-delete.
-- =====================================================================================

-- ───── tenants ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
    tenant_id        UUID         PRIMARY KEY,
    entra_tenant_id  UUID         NOT NULL UNIQUE,
    display_name     TEXT         NOT NULL,
    tier             TEXT         NOT NULL CHECK (tier IN ('community','enterprise')),
    region           TEXT         NOT NULL DEFAULT 'australiaeast',
    status           TEXT         NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('active','suspended','deleted')),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ───── contracts ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contracts (
    contract_id      UUID         PRIMARY KEY,
    tenant_id        UUID         NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,
    workspace_id     UUID         NOT NULL,
    fabric_item_id   UUID         NULL,
    name             TEXT         NOT NULL,
    status           TEXT         NOT NULL DEFAULT 'draft'
                                  CHECK (status IN ('draft','active','deprecated','archived')),
    current_version  TEXT         NOT NULL DEFAULT '0.1.0',
    owner_email      TEXT         NOT NULL,
    created_by       TEXT         NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ  NULL,
    UNIQUE (tenant_id, workspace_id, name)
);

CREATE INDEX IF NOT EXISTS ix_contracts_tenant_workspace
    ON contracts(tenant_id, workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_contracts_status
    ON contracts(status) WHERE deleted_at IS NULL;

-- ───── contract_versions ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contract_versions (
    version_id       UUID         PRIMARY KEY,
    contract_id      UUID         NOT NULL REFERENCES contracts(contract_id) ON DELETE CASCADE,
    version          TEXT         NOT NULL,
    odcs_yaml        TEXT         NOT NULL,
    odcs_hash        TEXT         NOT NULL,
    created_by       TEXT         NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    commit_message   TEXT         NULL,
    UNIQUE (contract_id, version)
);

CREATE INDEX IF NOT EXISTS ix_contract_versions_contract
    ON contract_versions(contract_id, created_at DESC);

-- ───── enforcement_runs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enforcement_runs (
    run_id              UUID         PRIMARY KEY,
    contract_id         UUID         NOT NULL REFERENCES contracts(contract_id) ON DELETE CASCADE,
    version_id          UUID         NOT NULL REFERENCES contract_versions(version_id) ON DELETE RESTRICT,
    triggered_by        TEXT         NOT NULL CHECK (triggered_by IN ('manual','schedule','webhook','api')),
    triggered_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ  NULL,
    status              TEXT         NOT NULL DEFAULT 'running'
                                     CHECK (status IN ('running','passed','warned','failed','error')),
    delta_table_version BIGINT       NULL,
    breach_score        NUMERIC(5,2) NULL CHECK (breach_score IS NULL OR (breach_score >= 0 AND breach_score <= 100)),
    result_json         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    correlation_id      TEXT         NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_enforcement_runs_contract_time
    ON enforcement_runs(contract_id, triggered_at DESC);
CREATE INDEX IF NOT EXISTS ix_enforcement_runs_correlation
    ON enforcement_runs(correlation_id);
CREATE INDEX IF NOT EXISTS ix_enforcement_runs_status
    ON enforcement_runs(status, triggered_at DESC);

-- ───── contract_policies ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contract_policies (
    policy_id          UUID         PRIMARY KEY,
    contract_id        UUID         NOT NULL REFERENCES contracts(contract_id) ON DELETE CASCADE,
    activator_rule_id  UUID         NULL,
    trigger_event      TEXT         NOT NULL CHECK (trigger_event IN
                                       ('enforcement.failed','enforcement.warned','schema.drifted','freshness.breached')),
    action_type        TEXT         NOT NULL CHECK (action_type IN ('notify','quarantine','block','webhook')),
    action_config_json JSONB        NOT NULL DEFAULT '{}'::jsonb,
    enabled            BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_contract_policies_contract
    ON contract_policies(contract_id) WHERE enabled = TRUE;

-- ───── updated_at triggers ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION orqentis_set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tenants_updated_at ON tenants;
CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION orqentis_set_updated_at();

DROP TRIGGER IF EXISTS trg_contracts_updated_at ON contracts;
CREATE TRIGGER trg_contracts_updated_at BEFORE UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION orqentis_set_updated_at();

DROP TRIGGER IF EXISTS trg_contract_policies_updated_at ON contract_policies;
CREATE TRIGGER trg_contract_policies_updated_at BEFORE UPDATE ON contract_policies
    FOR EACH ROW EXECUTE FUNCTION orqentis_set_updated_at();
