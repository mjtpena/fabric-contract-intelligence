/**
 * Persisted run status values surfaced by the backend run endpoints.
 */
export type RunStatus = 'running' | 'passed' | 'warned' | 'failed' | 'error';

/**
 * Overall enforcement outcome stored inside `resultJson`.
 */
export type EnforcementStatus = 'passed' | 'warned' | 'failed' | 'error';

/**
 * Per-rule evaluation status stored inside `resultJson`.
 */
export type RuleStatus = 'passed' | 'warned' | 'failed' | 'skipped';

/**
 * Mirrors backend `Orqentis.Engine.Models.RuleResult`.
 */
export interface RuleResult {
  /** Stable rule identifier, for example `schema.column.present`. */
  ruleId: string;
  /** Column associated with the rule when applicable. */
  column?: string;
  /** Expected contract-side value. */
  expected?: unknown;
  /** Threshold value used by quality rules. */
  threshold?: number;
  /** Maximum age in hours used by freshness rules. */
  maxAgeHours?: number;
  /** Latest observed Delta modification time. */
  lastModifiedUtc?: string;
  /** Computed age in hours for freshness evaluation. */
  ageHours?: number;
  /** Actual live-table value. */
  actual?: unknown;
  /** Outcome for this rule. */
  status: RuleStatus;
  /** Human-readable summary of the outcome. */
  message: string;
}

/**
 * Mirrors backend `Orqentis.Engine.Models.TypeChange`.
 */
export interface TypeChange {
  /** Column name whose data type drifted. */
  column: string;
  /** Contract-side type. */
  expectedType: string;
  /** Live-table type. */
  actualType: string;
}

/**
 * Mirrors backend `Orqentis.Engine.Models.NullabilityChange`.
 */
export interface NullabilityChange {
  /** Column name whose required/nullable expectation drifted. */
  column: string;
  /** Expected required flag from the contract. */
  expectedRequired: boolean;
  /** Actual required flag inferred from the live table. */
  actualRequired: boolean;
}

/**
 * Mirrors backend `Orqentis.Engine.Models.PartitionChange`.
 */
export interface PartitionChange {
  /** Partition columns expected by the contract. */
  expected: string[];
  /** Partition columns observed in the live table. */
  actual: string[];
}

/**
 * Mirrors backend `Orqentis.Engine.Models.SchemaDiff`.
 */
export interface SchemaDiff {
  /** Live-only columns not present in the contract. */
  addedColumns: string[];
  /** Contract-only columns missing from the live table. */
  removedColumns: string[];
  /** Column type drifts. */
  typeChanges: TypeChange[];
  /** Nullability drifts. */
  nullabilityChanges: NullabilityChange[];
  /** Partition drift, when detected. */
  partitionChange?: PartitionChange;
}

/**
 * Mirrors backend `Orqentis.Engine.Models.EnforcementResult`.
 */
export interface EnforcementResult {
  /** Contract identifier evaluated by the engine. */
  contractId: string;
  /** Run identifier generated for this execution. */
  runId: string;
  /** Delta table version read during the run. */
  tableVersion: number;
  /** Overall run result. */
  overallStatus: EnforcementStatus;
  /** Schema-rule outcomes. */
  schemaRules: RuleResult[];
  /** Quality-rule outcomes. */
  qualityRules: RuleResult[];
  /** Freshness-rule outcome, when configured. */
  freshnessRule?: RuleResult;
  /** Structured live-versus-contract schema diff. */
  schemaDiff?: SchemaDiff;
  /** Optional AI-generated severity score. */
  breachScore?: number;
  /** Suggested remediation actions for operators. */
  remediationSuggestions: string[];
  /** Completion timestamp for the evaluation. */
  completedAt: string;
  /** Error summary when the run completed in an error state. */
  errorMessage?: string;
}

/**
 * Mirrors backend `Orqentis.Api.Dtos.RunSummaryDto`.
 */
export interface RunSummary {
  /** Persisted run identifier. */
  id: string;
  /** Contract identifier associated with the run. */
  contractId: string;
  /** Contract version snapshot identifier evaluated by the run. */
  versionId: string;
  /** Persisted run status. */
  status: RunStatus;
  /** Origin of the run trigger. */
  triggeredBy: string;
  /** ISO-8601 trigger timestamp. */
  triggeredAt: string;
  /** ISO-8601 completion timestamp when available. */
  completedAt: string | null;
  /** Correlation id echoed by the backend. */
  correlationId: string;
  /** True when an Activator rule was triggered for this run. */
  activatorTriggered?: boolean;
}

/**
 * Mirrors backend `Orqentis.Api.Dtos.RunDetailDto`.
 */
export interface RunDetail extends RunSummary {
  /** Delta table version recorded by the API. */
  deltaTableVersion: number | null;
  /** API-level breach score copy for convenience. */
  breachScore: number | null;
  /** Optional persisted breach score breakdown payload. */
  breachScoreBreakdown?: unknown;
  /** Full persisted enforcement payload. */
  resultJson: EnforcementResult;
}
