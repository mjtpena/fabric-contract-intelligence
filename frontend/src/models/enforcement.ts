/** Mirrors backend FCI.Engine.Models.EnforcementResult (spec §5.2). */
export type EnforcementStatus = 'passed' | 'warned' | 'failed' | 'error';
export type RuleStatus = 'passed' | 'warned' | 'failed' | 'skipped';

export interface RuleResult {
  ruleId: string;
  column?: string;
  status: RuleStatus;
  message: string;
  expected?: unknown;
  actual?: unknown;
}

export interface SchemaDiff {
  addedColumns: string[];
  removedColumns: string[];
  typeChanges: { column: string; expectedType: string; actualType: string }[];
  nullabilityChanges: { column: string; expectedRequired: boolean; actualRequired: boolean }[];
  partitionChange?: { expected: string[]; actual: string[] };
}

export interface EnforcementResult {
  runId: string;
  contractId: string;
  overallStatus: EnforcementStatus;
  deltaTableVersion: number;
  schemaRules: RuleResult[];
  qualityRules: RuleResult[];
  freshnessRule?: RuleResult;
  schemaDiff?: SchemaDiff;
  breachScore?: number;
  remediationSuggestions: string[];
  completedAt: string;
  errorMessage?: string;
}
