import type { ContractTargetType } from '@/models/Contract';

export interface FabricLakehouse {
  id: string;
  displayName: string;
  workspaceId: string;
}

export interface FabricWorkspaceItem {
  id: string;
  displayName: string;
  type: string;
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
    const response = await fetch(`${baseUrl}/v1/ops/workspaces/${workspaceId}/fabric-items?type=Lakehouse`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      return [];
    }

    return normalizeItems(await response.json()) as FabricLakehouse[];
  } catch {
    return [];
  }
}

/**
 * Lists workspace items that can act as a contract target for a Fabric data product type.
 */
export async function listWorkspaceTargetItems(
  baseUrl: string,
  workspaceId: string,
  targetType: ContractTargetType,
  getToken: () => Promise<string>,
): Promise<FabricWorkspaceItem[]> {
  if (!baseUrl || !workspaceId || !targetType) {
    return [];
  }

  const token = await getToken();
  if (!token) {
    return [];
  }

  try {
    const response = await fetch(`${baseUrl}/v1/ops/workspaces/${workspaceId}/fabric-items?type=${encodeURIComponent(toFabricItemType(targetType))}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      return [];
    }

    return normalizeItems(await response.json()) as FabricWorkspaceItem[];
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
      `${baseUrl}/v1/ops/lakehouses/${lakehouseId}/tables?workspaceId=${encodeURIComponent(workspaceId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!response.ok) {
      return [];
    }

    return normalizeItems(await response.json()) as FabricLakehouseTable[];
  } catch {
    return [];
  }
}

function toFabricItemType(targetType: ContractTargetType) {
  switch (targetType) {
    case 'warehouse':
      return 'Warehouse';
    case 'eventhouse':
      return 'KQLDatabase';
    case 'semantic_model':
      return 'SemanticModel';
    case 'fabric_sql':
      return 'SQLDatabase';
    case 'lakehouse':
    default:
      return 'Lakehouse';
  }
}

function normalizeItems<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { items?: unknown[] }).items)) {
    return (payload as { items: T[] }).items;
  }
  if (payload && typeof payload === 'object' && Array.isArray((payload as { value?: unknown[] }).value)) {
    return (payload as { value: T[] }).value;
  }
  return [];
}
