/**
 * Contract row returned by `GET /v1/contracts`.
 */
export interface ContractSummary {
  /** Persisted contract identifier. */
  id: string;
  /** Contract display name. */
  name: string;
  /** Persisted lifecycle status. */
  status: string;
  /** Current contract version. */
  version: string;
  /** Latest run status for the contract, when available. */
  lastRunStatus: string | null;
  /** ISO-8601 timestamp of the latest run, when available. */
  lastRunAt: string | null;
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
  /** OneLake table path targeted by the contract. */
  targetTablePath: string;
  /** Target Fabric lakehouse identifier when available. */
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
  /** OneLake table path. */
  targetTablePath: string;
  /** Target Fabric lakehouse identifier. */
  targetLakehouseId: string;
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
  /** OneLake table path. */
  targetTablePath: string;
  /** Target Fabric lakehouse identifier. */
  targetLakehouseId: string;
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
  /** OneLake table path. */
  targetTablePath: string;
  /** Fabric lakehouse identifier. */
  targetLakehouseId: string;
  /** Optional version change note. */
  commitMessage: string;
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
