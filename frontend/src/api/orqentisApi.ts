/**
 * Typed API client for the Orqentis backend. Sprint-04/05 will flesh this out.
 * Always send the X-Correlation-Id and bearer token from the workload-client.
 */
export interface OrqentisApiOptions {
  baseUrl: string;
  /** Function returning a fresh user-bearer token. Implement via workload-client. */
  getAccessToken: () => Promise<string>;
  /** Workspace id to send as X-Workspace-Id. */
  workspaceId: string;
}

export class OrqentisApi {
  constructor(private readonly opts: OrqentisApiOptions) {}

  async ping(): Promise<{ service: string; version: string }> {
    const res = await fetch(`${this.opts.baseUrl}/api/v1/ping`);
    if (!res.ok) throw new Error(`ping failed: ${res.status}`);
    return res.json();
  }

  // TODO(sprint-04): listContracts, getContract, createContract, etc.
}
