import type {
  NaturalLanguageQueryRequest,
  NaturalLanguageQueryResponse,
  SuggestContractRequest,
  SuggestContractResponse,
} from '@/models/Ai';

export interface AiClientOptions {
  baseUrl: string;
  getAccessToken: () => Promise<string>;
  workspaceId?: string;
  correlationId?: string;
}

export interface AiClient {
  suggestContract: (request: SuggestContractRequest) => Promise<SuggestContractResponse>;
  queryContracts: (request: NaturalLanguageQueryRequest) => Promise<NaturalLanguageQueryResponse>;
}

export function createAiClient(options: AiClientOptions): AiClient {
  const baseUrl = options.baseUrl.replace(/\/+$/, '');

  async function request<T>(path: string, body: unknown): Promise<T> {
    const token = await options.getAccessToken();
    const headers = new Headers({
      Accept: 'application/json',
      'Content-Type': 'application/json',
    });

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
      body: JSON.stringify(body),
      headers,
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`AI request failed with status ${response.status}.`);
    }

    return (await response.json()) as T;
  }

  return {
    suggestContract: (requestBody) => request<SuggestContractResponse>('/v1/ai/suggest-contract', requestBody),
    queryContracts: (requestBody) => request<NaturalLanguageQueryResponse>('/v1/ai/query', requestBody),
  };
}
