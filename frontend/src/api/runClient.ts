import { ContractClientError } from '@/api/contractClient';
import type { RunAccepted } from '@/models/Contract';
import type { RunDetail, RunSummary } from '@/models/enforcement';

export interface RunClientOptions {
  baseUrl: string;
  correlationId?: string;
  getAccessToken: () => Promise<string>;
  workspaceId?: string;
}

export interface RunClient {
  getRun: (runId: string) => Promise<RunDetail>;
  listRuns: (contractId: string) => Promise<RunSummary[]>;
  runNow: (contractId: string) => Promise<RunAccepted>;
}

interface ProblemDetails {
  detail?: string;
  errors?: Record<string, string[]>;
  title?: string;
}

export function createRunClient(options: RunClientOptions): RunClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl);

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    const token = await options.getAccessToken();

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

    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
    });

    if (!response.ok) {
      throw await toRunClientError(response);
    }

    return (await response.json()) as T;
  }

  return {
    getRun: (runId) => request<RunDetail>(`/v1/runs/${runId}`),
    listRuns: (contractId) => request<RunSummary[]>(`/v1/contracts/${contractId}/runs`),
    runNow: (contractId) =>
      request<RunAccepted>(`/v1/contracts/${contractId}/runs`, {
        body: JSON.stringify({}),
        method: 'POST',
      }),
  };
}

async function toRunClientError(response: Response): Promise<ContractClientError> {
  let payload: ProblemDetails | null = null;

  try {
    payload = (await response.json()) as ProblemDetails;
  } catch {
    payload = null;
  }

  const validationDetails = payload?.errors
    ? Object.entries(payload.errors).flatMap(([path, messages]) =>
        messages.map((message) => `${path}: ${message}`),
      )
    : [];

  return new ContractClientError(
    getClientErrorMessage(response, payload),
    response.status,
    payload?.detail ? [payload.detail, ...validationDetails] : validationDetails,
  );
}

function getClientErrorMessage(response: Response, payload: ProblemDetails | null): string {
  if (response.status === 401) {
    return 'Authorization required. Open Orqentis from Microsoft Fabric or sign in again, then refresh.';
  }

  return payload?.title ?? `Request failed with status ${response.status}.`;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}
