import type { ContractTargetType } from '@/models/Contract';

export interface WorkspaceSummary {
  displayName?: string;
  id: string;
  name?: string;
  tier: 'community' | 'enterprise' | string;
}

export interface FederatedContractsResponse {
  contracts: Array<{
    id: string;
    contractId?: string;
    name: string;
    targetType: ContractTargetType;
    status: string;
    version: string;
    lastRunStatus: string | null;
    lastRunAt: string | null;
    lastRunId?: string | null;
  }>;
  nextCursor: string | null;
}

export interface ActivatorRule {
  id: string;
  name: string;
}

export interface PolicyRequest {
  contractId: string;
  activatorRuleId?: string | null;
  triggerEvent: string;
  actionType: string;
  actionConfigJson?: string;
  enabled: boolean;
}

export interface PolicyResponse {
  id: string;
  contractId: string;
  activatorRuleId: string | null;
  triggerEvent: string;
  actionType: string;
  actionConfigJson: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReportAuditRow {
  runId: string;
  contractId: string;
  contractName: string;
  status: string;
  triggeredBy: string;
  triggeredAt: string;
  completedAt: string | null;
  deltaTableVersion: number | null;
  breachScore: number | null;
  correlationId: string;
}
