import { useEffect, useState } from 'react';
import { listLakehouseTables, listWorkspaceLakehouses, listWorkspaceTargetItems } from '@/api/fabricItemsClient';
import type { FabricLakehouse, FabricLakehouseTable, FabricWorkspaceItem } from '@/api/fabricItemsClient';
import type { ContractTargetType } from '@/models/Contract';

export type { FabricLakehouse, FabricLakehouseTable, FabricWorkspaceItem };

interface UseLakehousesParams {
  baseUrl: string;
  getToken: () => Promise<string>;
  /** Pass sdk.isReady so the effect re-fires once the Fabric SDK has initialised and the token is available. */
  isReady: boolean;
  workspaceId: string;
}

interface UseLakehousesResult {
  isLoading: boolean;
  lakehouses: FabricLakehouse[];
}

/**
 * Fetches Lakehouse items for the given workspace via the Orqentis backend proxy.
 * Returns empty list if baseUrl/workspaceId are absent or the token can't be obtained.
 * isReady MUST be true before fetching — this prevents wasting a request with an
 * empty token during the SDK initialisation window.
 */
export function useLakehouses({ baseUrl, getToken, isReady, workspaceId }: UseLakehousesParams): UseLakehousesResult {
  const [lakehouses, setLakehouses] = useState<FabricLakehouse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!baseUrl || !workspaceId || !isReady) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void listWorkspaceLakehouses(baseUrl, workspaceId, getToken)
      .then((items) => {
        if (!cancelled) {
          setLakehouses(items);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  // getToken is a stable callback from useFabricSdk — intentionally excluded from deps.
  // isReady is included so the effect re-fires after the SDK initialises.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, isReady, workspaceId]);

  return { isLoading, lakehouses };
}

interface UseFabricTargetItemsParams {
  baseUrl: string;
  getToken: () => Promise<string>;
  isReady: boolean;
  targetType: ContractTargetType;
  workspaceId: string;
}

interface UseFabricTargetItemsResult {
  isLoading: boolean;
  items: FabricWorkspaceItem[];
}

/**
 * Fetches Fabric items eligible for the selected contract target type.
 */
export function useFabricTargetItems({
  baseUrl,
  getToken,
  isReady,
  targetType,
  workspaceId,
}: UseFabricTargetItemsParams): UseFabricTargetItemsResult {
  const [items, setItems] = useState<FabricWorkspaceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!baseUrl || !workspaceId || !isReady) {
      setItems([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void listWorkspaceTargetItems(baseUrl, workspaceId, targetType, getToken)
      .then((nextItems) => {
        if (!cancelled) {
          setItems(nextItems);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  // getToken is stable — intentionally excluded. isReady triggers re-fetch on SDK init.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, isReady, targetType, workspaceId]);

  return { isLoading, items };
}

interface UseLakehouseTablesParams {
  baseUrl: string;
  getToken: () => Promise<string>;
  /** Pass sdk.isReady so the effect re-fires once the Fabric SDK has initialised. */
  isReady: boolean;
  lakehouseId: string;
  workspaceId: string;
}

interface UseLakehouseTablesResult {
  isLoading: boolean;
  tables: FabricLakehouseTable[];
}

/**
 * Fetches Delta/Parquet tables for the given Lakehouse via the Orqentis backend proxy.
 * Clears the list and skips fetching if lakehouseId is not a valid GUID or isReady is false.
 */
export function useLakehouseTables({
  baseUrl,
  getToken,
  isReady,
  lakehouseId,
  workspaceId,
}: UseLakehouseTablesParams): UseLakehouseTablesResult {
  const [tables, setTables] = useState<FabricLakehouseTable[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!baseUrl || !workspaceId || !isReady || !isGuid(lakehouseId)) {
      setTables([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void listLakehouseTables(baseUrl, workspaceId, lakehouseId, getToken)
      .then((items) => {
        if (!cancelled) {
          setTables(items);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  // getToken is stable — intentionally excluded. isReady triggers re-fetch on SDK init.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, isReady, lakehouseId, workspaceId]);

  return { isLoading, tables };
}

function isGuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
