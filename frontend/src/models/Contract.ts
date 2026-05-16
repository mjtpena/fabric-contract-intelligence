export type ContractTargetType = 'lakehouse' | 'warehouse' | 'eventhouse' | 'semantic_model' | 'fabric_sql';

/**
 * Contract row returned by `GET /v1/contracts`.
 */
export interface ContractSummary {
  /** Persisted contract identifier. */
  id: string;
  /** Alternate contract identifier returned by federated APIs. */
  contractId?: string;
  /** Contract display name. */
  name: string;
  /** Fabric data product type targeted by the contract. */
  targetType: ContractTargetType;
  /** Owner email captured by list endpoints when available. */
  ownerEmail?: string;
  /** Alternate owner field returned by federated APIs. */
  owner?: string;
  /** Target object path returned by list endpoints when available. */
  targetTablePath?: string;
  /** Persisted lifecycle status. */
  status: string;
  /** Current contract version. */
  version: string;
  /** Latest run status for the contract, when available. */
  lastRunStatus: string | null;
  /** ISO-8601 timestamp of the latest run, when available. */
  lastRunAt: string | null;
  /** Latest run identifier for deep-linking to run history. */
  lastRunId?: string | null;
  /** Latest breach score returned by list endpoints when available. */
  breachScore?: number | null;
  /** Alternate latest breach score field returned by federated APIs. */
  lastRunBreachScore?: number | null;
}

/**
 * Full contract payload returned by `GET /v1/contracts/{id}`.
 */
export interface ContractDetail {
  /** Persisted contract identifier. */
  id: string;
  /** Contract display name. */
  name: string;
  /** Optional description shown in the editor shell. */
  description: string | null;
  /** Persisted lifecycle status. */
  status: string;
  /** Current contract version. */
  version: string;
  /** Canonical ODCS YAML for the current version. */
  odcsYaml: string;
  /** Owner email captured by the backend DTO. */
  ownerEmail: string;
  /** Fabric data product type targeted by the contract. */
  targetType: ContractTargetType;
  /** Target Fabric item identifier when available. */
  targetItemId: string | null;
  /** Target object path or identifier inside the Fabric item. */
  targetTablePath: string;
  /** Legacy target Fabric lakehouse identifier when available. */
  targetLakehouseId: string | null;
  /** Whether the contract originated from an AI suggestion. */
  aiSuggested: boolean;
  /** Creating actor identifier. */
  createdBy: string;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
  /** ISO-8601 update timestamp. */
  updatedAt: string;
}

/**
 * Immutable contract version payload returned by `GET /v1/contracts/{id}/versions`.
 */
export interface ContractVersion {
  /** Version row identifier. */
  id: string;
  /** Semantic version label. */
  version: string;
  /** Immutable YAML snapshot. */
  odcsYaml: string;
  /** Creating actor identifier. */
  createdBy: string;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
  /** Optional commit message captured during save. */
  commitMessage: string | null;
}

/**
 * Request body for `POST /v1/contracts`.
 */
export interface CreateContractRequest {
  /** Create mode expected by the backend (`direct` in Sprint 5). */
  mode: 'direct' | 'ai_generate';
  /** Contract display name. */
  name: string;
  /** Optional editor description. */
  description: string | null;
  /** Owner email captured in the contract metadata. */
  ownerEmail: string;
  /** Fabric data product type targeted by the contract. */
  targetType: ContractTargetType;
  /** Target Fabric item identifier. */
  targetItemId: string;
  /** Target object path or identifier inside the Fabric item. */
  targetTablePath: string;
  /** Legacy target Fabric lakehouse identifier. */
  targetLakehouseId?: string | null;
  /** ODCS YAML to persist. */
  odcsYaml: string;
  /** Optional AI hints for enterprise generation mode. */
  aiHints?: string | null;
}

/**
 * Request body for `PUT /v1/contracts/{id}`.
 */
export interface UpdateContractRequest {
  /** Contract display name. */
  name: string;
  /** Optional editor description. */
  description: string | null;
  /** Owner email captured in the contract metadata. */
  ownerEmail: string;
  /** Fabric data product type targeted by the contract. */
  targetType: ContractTargetType;
  /** Target Fabric item identifier. */
  targetItemId: string;
  /** Target object path or identifier inside the Fabric item. */
  targetTablePath: string;
  /** Legacy target Fabric lakehouse identifier. */
  targetLakehouseId?: string | null;
  /** ODCS YAML to persist. */
  odcsYaml: string;
  /** Optional version change note. */
  commitMessage?: string | null;
}

/**
 * Accepted response returned by `POST /v1/contracts/{id}/runs`.
 */
export interface RunAccepted {
  /** Newly created run identifier. */
  runId: string;
  /** Accepted processing status. */
  status: string;
}

/**
 * Editable client-side draft aligned to the backend DTOs.
 */
export interface ContractDraft {
  /** Optional persisted contract identifier. */
  id?: string;
  /** Contract display name. */
  name: string;
  /** Optional editor description. */
  description: string;
  /** Lifecycle status used to normalize the YAML before save. */
  status: string;
  /** Current semantic version. */
  version: string;
  /** Canonical ODCS YAML shown in Monaco. */
  odcsYaml: string;
  /** Owner email captured by the save form. */
  ownerEmail: string;
  /** Fabric data product type targeted by the contract. */
  targetType: ContractTargetType;
  /** Fabric item identifier targeted by the contract. */
  targetItemId: string;
  /** Target object path or identifier inside the Fabric item. */
  targetTablePath: string;
  /** Legacy Fabric lakehouse identifier used by existing item definitions. */
  targetLakehouseId: string;
  /** Optional version change note. */
  commitMessage: string;
  /**
   * Optional workspace GUID when the data store lives in a different workspace
   * than the one owning this Orqentis contract item. When non-empty, enforcement
   * calls Fabric REST APIs in this workspace instead of sdk.workspaceId.
   * Maps to the YAML `servers[0].workspaceId` field.
   */
  targetWorkspaceId?: string;
}

/**
 * Validation issue surfaced by the editor.
 */
export interface ValidationIssue {
  /** Best-effort path describing where the issue occurred. */
  path: string;
  /** Human-readable validation message. */
  message: string;
  /** Validation severity level. */
  severity: 'error' | 'warning';
}

/**
 * Lightweight schema preview row shown next to Monaco.
 */
export interface SchemaPreviewField {
  /** Column or property name. */
  name: string;
  /** Logical ODCS type, when present. */
  logicalType: string | null;
  /** Physical storage type, when present. */
  physicalType: string | null;
  /** Whether the field is required. */
  required: boolean;
  /** Whether the field is unique. */
  unique: boolean;
}

/**
 * Request body for `POST /v1/contracts/schema-preview`.
 */
export interface LivePreviewRequest {
  odcsYaml: string;
  targetItemId?: string;
  targetWorkspaceId?: string;
  targetType?: string;
}

/**
 * Debounced validation result emitted by the validation panel.
 */
export interface ContractValidationResult {
  /** Whether the current YAML passed local validation. */
  isValid: boolean;
  /** Structured validation issues. */
  issues: ValidationIssue[];
  /** Extracted schema preview rows. */
  schemaPreview: SchemaPreviewField[];
  /** ISO-8601 timestamp of the latest validation run. */
  validatedAt: string;
}
