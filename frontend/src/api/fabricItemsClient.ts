const FABRIC_API = 'https://api.fabric.microsoft.com/v1';

export interface FabricLakehouse {
  id: string;
  displayName: string;
  description?: string;
  workspaceId: string;
}

export interface FabricLakehouseTable {
  name: string;
  type: string;
  location: string;
}

/**
 * Lists all Lakehouse items in the given workspace.
 * Returns an empty array on auth failure or network error — callers should fall back gracefully.
 */
export async function listWorkspaceLakehouses(
  workspaceId: string,
  getToken: () => Promise<string>,
): Promise<FabricLakehouse[]> {
  if (!workspaceId) {
    return [];
  }

  const token = await getToken();
  if (!token) {
    return [];
  }

  try {
    const response = await fetch(`${FABRIC_API}/workspaces/${workspaceId}/lakehouses`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      return [];
    }

    const json = (await response.json()) as { value?: FabricLakehouse[] };
    return json.value ?? [];
  } catch {
    return [];
  }
}

/**
 * Lists Delta/Parquet tables inside a specific Lakehouse.
 * Returns an empty array on auth failure or network error.
 */
export async function listLakehouseTables(
  workspaceId: string,
  lakehouseId: string,
  getToken: () => Promise<string>,
): Promise<FabricLakehouseTable[]> {
  if (!workspaceId || !lakehouseId) {
    return [];
  }

  const token = await getToken();
  if (!token) {
    return [];
  }

  try {
    const response = await fetch(
      `${FABRIC_API}/workspaces/${workspaceId}/lakehouses/${lakehouseId}/tables`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!response.ok) {
      return [];
    }

    const json = (await response.json()) as { data?: FabricLakehouseTable[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}
