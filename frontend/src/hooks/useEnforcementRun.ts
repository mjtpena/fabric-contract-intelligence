import { useCallback, useEffect, useRef, useState } from 'react';
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
  const clearError = useRunStore((state) => state.clearError);
  const loadRun = useRunStore((state) => state.loadRun);
  const loadRuns = useRunStore((state) => state.loadRuns);
  const setError = useRunStore((state) => state.setError);
  const [pollFailureCount, setPollFailureCount] = useState(0);
  const [visibilityTick, setVisibilityTick] = useState(0);
  const runRef = useRef(currentRun);
  runRef.current = currentRun;

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
    setPollFailureCount(0);
  }, [currentRun?.id, runId]);

  useEffect(() => {
    const activeRunId = runId ?? currentRun?.id;
    const resolvedContractId = contractId ?? currentRun?.contractId;

    if (!activeRunId || !currentRun || currentRun.status !== 'running' || pollFailureCount >= 6) {
      return;
    }

    const delay = Math.min(3000 * 2 ** pollFailureCount, 60000);
    const timer = window.setTimeout(() => {
      if (document.hidden) {
        return;
      }

      void (async () => {
        const [loadedRun] = await Promise.all([
          loadRun(client, activeRunId, { background: true, suppressError: true }),
          resolvedContractId
            ? loadRuns(client, resolvedContractId, { background: true, suppressError: true })
            : Promise.resolve([]),
        ]);

        if (loadedRun) {
          setPollFailureCount(0);
          return;
        }

        setPollFailureCount((current) => {
          const next = current + 1;
          if (next >= 6) {
            setError('Polling paused — click Resume');
          }
          return next;
        });
      })();
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [client, contractId, currentRun, loadRun, loadRuns, pollFailureCount, runId, setError, visibilityTick]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setVisibilityTick((current) => current + 1);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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

  const resumePolling = useCallback(async () => {
    setPollFailureCount(0);
    clearError();

    const latestRun = runRef.current;
    const resolvedContractId = contractId ?? latestRun?.contractId;
    const activeRunId = runId ?? latestRun?.id ?? runs[0]?.id;

    if (activeRunId) {
      await loadRun(client, activeRunId);
    }

    if (resolvedContractId) {
      await loadRuns(client, resolvedContractId);
    }
  }, [clearError, client, contractId, loadRun, loadRuns, runId, runs]);

  return {
    clearError,
    error,
    isPollingPaused: pollFailureCount >= 6,
    loading,
    refresh,
    resumePolling,
    run: currentRun,
    runs,
  };
}
