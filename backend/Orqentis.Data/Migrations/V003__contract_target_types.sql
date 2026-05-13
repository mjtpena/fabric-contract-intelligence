-- =====================================================================================
-- Orqentis — Fabric-wide contract targets (V003)
-- Adds a generic target type beside the existing Fabric item ID so contracts can bind to
-- Lakehouses, Warehouses, Eventhouse/KQL databases, Semantic Models, and Fabric SQL.
-- =====================================================================================

ALTER TABLE contracts
    ADD COLUMN IF NOT EXISTS target_type TEXT NOT NULL DEFAULT 'lakehouse';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_contracts_target_type'
    ) THEN
        ALTER TABLE contracts
            ADD CONSTRAINT ck_contracts_target_type CHECK (
                target_type IN ('lakehouse','warehouse','eventhouse','semantic_model','fabric_sql')
            );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_contracts_target_type
    ON contracts(target_type) WHERE deleted_at IS NULL;
