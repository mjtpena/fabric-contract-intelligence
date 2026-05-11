export interface FabricLakehouse {
  id: string;
  displayName: string;
  workspaceId: string;
}

export interface FabricLakehouseTable {
  name: string;
  type: string;
  location: string;
}

/**
 * Lists all Lakehouse items in the given workspace.
 * Calls the Orqentis backend proxy (which uses OBO to reach the Fabric REST API),
 * because the frontend cannot call api.fabric.microsoft.com directly from the Fabric iframe.
 * Returns an empty array on auth failure or network error — callers should fall back gracefully.
 */
export async function listWorkspaceLakehouses(
  baseUrl: string,
  workspaceId: string,
  getToken: () => Promise<string>,
): Promise<FabricLakehouse[]> {
  if (!baseUrl || !workspaceId) {
    return [];
  }

  const token = await getToken();
  if (!token) {
    return [];
  }

  try {
    const response = await fetch(`${baseUrl}/v1/fabric/${workspaceId}/lakehouses`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      return [];
    }

    return (await response.json()) as FabricLakehouse[];
  } catch {
    return [];
  }
}

/**
 * Lists Delta/Parquet tables inside a specific Lakehouse.
 * Calls the Orqentis backend proxy (OBO → Fabric REST API).
 * Returns an empty array on auth failure or network error.
 */
export async function listLakehouseTables(
  baseUrl: string,
  workspaceId: string,
  lakehouseId: string,
  getToken: () => Promise<string>,
): Promise<FabricLakehouseTable[]> {
  if (!baseUrl || !workspaceId || !lakehouseId) {
    return [];
  }

  const token = await getToken();
  if (!token) {
    return [];
  }

  try {
    const response = await fetch(
      `${baseUrl}/v1/fabric/${workspaceId}/lakehouses/${lakehouseId}/tables`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!response.ok) {
      return [];
    }

    return (await response.json()) as FabricLakehouseTable[];
  } catch {
    return [];
  }
}
