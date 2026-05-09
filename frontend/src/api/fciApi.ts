/**
 * Typed API client for the FCI backend. Sprint-04/05 will flesh this out.
 * Always send the X-Correlation-Id and bearer token from the workload-client.
 */
export interface FciApiOptions {
  baseUrl: string;
  /** Function returning a fresh user-bearer token. Implement via workload-client. */
  getAccessToken: () => Promise<string>;
  /** Workspace id to send as X-Workspace-Id. */
  workspaceId: string;
}

export class FciApi {
  constructor(private readonly opts: FciApiOptions) {}

  async ping(): Promise<{ service: string; version: string }> {
    const res = await fetch(`${this.opts.baseUrl}/api/v1/ping`);
    if (!res.ok) throw new Error(`ping failed: ${res.status}`);
    return res.json();
  }

  // TODO(sprint-04): listContracts, getContract, createContract, etc.
}
