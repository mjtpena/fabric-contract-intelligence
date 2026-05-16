import type {
  ActivatorRule,
  FederatedContractsResponse,
  PolicyRequest,
  PolicyResponse,
  ReportAuditRow,
  WorkspaceSummary,
} from '@/models/ops';

export interface OpsClientOptions {
  baseUrl: string;
  getAccessToken: () => Promise<string>;
  workspaceId?: string;
  correlationId?: string;
}

export interface OpsClient {
  listWorkspaces: () => Promise<WorkspaceSummary[]>;
  listFederatedContracts: (cursor?: string) => Promise<FederatedContractsResponse>;
  listActivatorRules: () => Promise<ActivatorRule[]>;
  createPolicy: (request: PolicyRequest) => Promise<PolicyResponse>;
  listAuditRows: () => Promise<ReportAuditRow[]>;
  testWebhook: (url: string, type: string) => Promise<void>;
}

export function createOpsClient(options: OpsClientOptions): OpsClient {
  const baseUrl = options.baseUrl.replace(/\/+$/, '');

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await options.getAccessToken();
    const headers = new Headers(init?.headers);
    headers.set('Accept', 'application/json');
    if (!(init?.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (options.workspaceId) {
      headers.set('X-Workspace-Id', options.workspaceId);
    }
    if (options.correlationId) {
      headers.set('X-Correlation-Id', options.correlationId);
    }

    const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}.`);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  return {
    listWorkspaces: () => request<WorkspaceSummary[]>('/v1/ops/workspaces'),
    listFederatedContracts: (cursor) =>
      request<FederatedContractsResponse>(`/v1/federation/contracts${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
    listActivatorRules: () => request<ActivatorRule[]>('/v1/activator/rules'),
    createPolicy: (body) =>
      request<PolicyResponse>('/v1/policies', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    listAuditRows: () => request<ReportAuditRow[]>('/v1/reports/audit'),
    testWebhook: (url, type) =>
      request<void>('/v1/policies/webhooks/test', {
        method: 'POST',
        body: JSON.stringify({ type, url }),
      }),
  };
}
