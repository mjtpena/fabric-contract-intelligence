import { useCallback, useEffect } from 'react';
import type { ContractDraft } from '@/models/Contract';
import type { ContractClient } from '@/api/contractClient';
import { useContractStore } from '@/store/contractStore';

export function useContracts(client: ContractClient) {
  const contracts = useContractStore((state) => state.contracts);
  const error = useContractStore((state) => state.error);
  const loading = useContractStore((state) => state.loading);
  const saving = useContractStore((state) => state.saving);
  const loadAll = useContractStore((state) => state.loadAll);
  const runNow = useContractStore((state) => state.runNow);

  useEffect(() => {
    void loadAll(client);
  }, [client, loadAll]);

  return {
    contracts,
    error,
    loading,
    refresh: useCallback(() => loadAll(client), [client, loadAll]),
    runNow: useCallback((contractId: string) => runNow(client, contractId), [client, runNow]),
    saving,
  };
}

export function useContract(client: ContractClient, contractId?: string | null) {
  const contract = useContractStore((state) => state.activeContract);
  const error = useContractStore((state) => state.error);
  const loading = useContractStore((state) => state.loading);
  const saving = useContractStore((state) => state.saving);
  const versions = useContractStore((state) => state.versions);
  const clearActive = useContractStore((state) => state.clearActive);
  const loadOne = useContractStore((state) => state.loadOne);
  const loadVersions = useContractStore((state) => state.loadVersions);

  useEffect(() => {
    if (!contractId) {
      clearActive();
      return;
    }

    let cancelled = false;
    const abort = new AbortController();

    useContractStore.setState({
      error: null,
      loading: true,
    });

    void (async () => {
      try {
        const [activeContract, loadedVersions] = await Promise.all([
          client.getContract(contractId, { signal: abort.signal }),
          client.listVersions(contractId, { signal: abort.signal }),
        ]);

        if (!cancelled) {
          useContractStore.setState({
            activeContract,
            error: null,
            loading: false,
            versions: loadedVersions,
          });
        }
      } catch (err) {
        if (!cancelled && !abort.signal.aborted) {
          useContractStore.setState({
            error: err instanceof Error ? err.message : 'Unable to load the selected contract.',
            loading: false,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      abort.abort();
    };
  }, [clearActive, client, contractId]);

  return {
    contract,
    error,
    loading,
    refresh: useCallback(async () => {
      if (!contractId) {
        return;
      }

      await Promise.all([loadOne(client, contractId), loadVersions(client, contractId)]);
    }, [client, contractId, loadOne, loadVersions]),
    saving,
    versions,
  };
}

export function useContractActions(client: ContractClient) {
  const saveContract = useContractStore((state) => state.save);
  const runContract = useContractStore((state) => state.runNow);

  return {
    activate: useCallback(
      (draft: ContractDraft) =>
        saveContract(client, {
          ...draft,
          status: 'active',
        }),
      [client, saveContract],
    ),
    runNow: useCallback((contractId: string) => runContract(client, contractId), [client, runContract]),
    save: useCallback((draft: ContractDraft) => saveContract(client, draft), [client, saveContract]),
  };
}
