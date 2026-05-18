/**
 * Mirrors `Orqentis.Engine.Odcs.Extensions.AiContextExtension` (backend DTO 1:1
 * per copilot-instructions §4). Surfaces the ODCS `orqentisAiContext` extension
 * authored under `customProperties[]`.
 */
export interface AiContext {
  useCases: AiUseCaseRef[];
  permittedUses: string[];
  prohibitedUses: string[];
  permittedAgents: string[];
  retentionForTraining: AiRetentionPolicy | null;
}

export type AiTier = 'minimal' | 'limited' | 'high-risk' | 'prohibited';

export interface AiUseCaseRef {
  id: string;
  tier: AiTier | null;
  jurisdictions: string[];
  regulations: string[];
}

export interface AiRetentionPolicy {
  maxAgeDays: number | null;
}

/**
 * Mirrors `Orqentis.Engine.Scoring.ContractHealthScore`. Returned by the
 * forthcoming `GET /v1/contracts/{id}/health` endpoint (Phase 1 Epic 1.4 UI surface).
 */
export interface ContractHealthScore {
  score: number;
  grade: 'green' | 'amber' | 'red';
  dimensions: {
    schemaValidity: number;
    qualityRulePassRate: number;
    freshnessSlaMet: number;
    sensitivityLabelSet: number;
    approvalUpToDate: number;
    lineageCompleteness: number;
    evidenceCitedRatio: number;
  };
}
