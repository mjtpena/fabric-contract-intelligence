import { useEffect, useState } from 'react';
import { listLakehouseTables, listWorkspaceLakehouses } from '@/api/fabricItemsClient';
import type { FabricLakehouse, FabricLakehouseTable } from '@/api/fabricItemsClient';

export type { FabricLakehouse, FabricLakehouseTable };

interface UseLakehousesParams {
  getToken: () => Promise<string>;
  workspaceId: string;
}

interface UseLakehousesResult {
  isLoading: boolean;
  lakehouses: FabricLakehouse[];
}

/**
 * Fetches Lakehouse items for the given workspace.
 * Returns empty list if the workspace ID is absent or the token can't be obtained.
 */
export function useLakehouses({ getToken, workspaceId }: UseLakehousesParams): UseLakehousesResult {
  const [lakehouses, setLakehouses] = useState<FabricLakehouse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!workspaceId) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void listWorkspaceLakehouses(workspaceId, getToken)
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
  // getToken is a stable callback from useFabricSdk — intentionally excluded from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  return { isLoading, lakehouses };
}

interface UseLakehouseTablesParams {
  getToken: () => Promise<string>;
  lakehouseId: string;
  workspaceId: string;
}

interface UseLakehouseTablesResult {
  isLoading: boolean;
  tables: FabricLakehouseTable[];
}

/**
 * Fetches Delta/Parquet tables for the given Lakehouse.
 * Clears the list and skips fetching if lakehouseId is not a valid GUID.
 */
export function useLakehouseTables({
  getToken,
  lakehouseId,
  workspaceId,
}: UseLakehouseTablesParams): UseLakehouseTablesResult {
  const [tables, setTables] = useState<FabricLakehouseTable[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!workspaceId || !isGuid(lakehouseId)) {
      setTables([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void listLakehouseTables(workspaceId, lakehouseId, getToken)
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
  // getToken is a stable callback from useFabricSdk — intentionally excluded from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, lakehouseId]);

  return { isLoading, tables };
}

function isGuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
