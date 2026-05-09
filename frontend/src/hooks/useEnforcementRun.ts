import { useCallback, useEffect } from 'react';
import type { RunClient } from '@/api/runClient';
import { useRunStore } from '@/store/runStore';

export function useEnforcementRun(
  client: RunClient,
  contractId?: string | null,
  runId?: string | null,
) {
  const currentRun = useRunStore((state) => state.currentRun);
  const error = useRunStore((state) => state.error);
  const loading = useRunStore((state) => state.loading);
  const runs = useRunStore((state) => state.runs);
  const clear = useRunStore((state) => state.clear);
  const loadRun = useRunStore((state) => state.loadRun);
  const loadRuns = useRunStore((state) => state.loadRuns);

  useEffect(() => {
    if (!contractId && !runId) {
      clear();
      return;
    }

    void (async () => {
      if (runId) {
        const loadedRun = await loadRun(client, runId);
        const resolvedContractId = contractId ?? loadedRun?.contractId;

        if (resolvedContractId) {
          await loadRuns(client, resolvedContractId);
        }

        return;
      }

      if (!contractId) {
        return;
      }

      const loadedRuns = await loadRuns(client, contractId);
      const latestRunId = loadedRuns[0]?.id;

      if (latestRunId) {
        await loadRun(client, latestRunId);
        return;
      }

      clear();
    })();
  }, [clear, client, contractId, loadRun, loadRuns, runId]);

  useEffect(() => {
    const activeRunId = runId ?? currentRun?.id;
    const resolvedContractId = contractId ?? currentRun?.contractId;

    if (!activeRunId || !currentRun || currentRun.status !== 'running') {
      return;
    }

    const timer = window.setTimeout(() => {
      void Promise.all([
        loadRun(client, activeRunId, { background: true }),
        resolvedContractId
          ? loadRuns(client, resolvedContractId, { background: true })
          : Promise.resolve([]),
      ]);
    }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [client, contractId, currentRun, loadRun, loadRuns, runId]);

  const refresh = useCallback(async () => {
    const resolvedContractId = contractId ?? currentRun?.contractId;
    const activeRunId = runId ?? currentRun?.id ?? runs[0]?.id;

    if (resolvedContractId) {
      await loadRuns(client, resolvedContractId);
    }

    if (activeRunId) {
      await loadRun(client, activeRunId);
    }
  }, [client, contractId, currentRun?.contractId, currentRun?.id, loadRun, loadRuns, runId, runs]);

  return {
    error,
    loading,
    refresh,
    run: currentRun,
    runs,
  };
}
