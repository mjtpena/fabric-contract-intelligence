import type { CreateApiKeyResponse, WorkspaceApiKey } from '@/models/Workspace';

export interface WorkspaceClientOptions {
  baseUrl: string;
  getAccessToken: () => Promise<string>;
  workspaceId?: string;
  correlationId?: string;
}

export interface WorkspaceClient {
  listApiKeys: () => Promise<WorkspaceApiKey[]>;
  createApiKey: (displayName: string) => Promise<CreateApiKeyResponse>;
  deleteApiKey: (keyId: string) => Promise<void>;
}

export function createWorkspaceClient(options: WorkspaceClientOptions): WorkspaceClient {
  const base = options.baseUrl.replace(/\/$/, '');

  async function headers(): Promise<Record<string, string>> {
    const token = await options.getAccessToken();
    const h: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    if (options.correlationId) h['X-Correlation-Id'] = options.correlationId;
    if (options.workspaceId) h['X-Workspace-Id'] = options.workspaceId;
    return h;
  }

  async function throwOnError(res: Response): Promise<void> {
    if (res.ok) return;
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`[${res.status}] ${text}`);
  }

  return {
    async listApiKeys() {
      const res = await fetch(`${base}/v1/workspaces/api-keys`, { headers: await headers() });
      await throwOnError(res);
      return res.json() as Promise<WorkspaceApiKey[]>;
    },
    async createApiKey(displayName) {
      const res = await fetch(`${base}/v1/workspaces/api-keys`, {
        method: 'POST',
        headers: await headers(),
        body: JSON.stringify({ displayName }),
      });
      await throwOnError(res);
      return res.json() as Promise<CreateApiKeyResponse>;
    },
    async deleteApiKey(keyId) {
      const res = await fetch(`${base}/v1/workspaces/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: await headers(),
      });
      await throwOnError(res);
    },
  };
}
