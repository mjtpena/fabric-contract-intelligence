import { create } from 'zustand';
import type { RunClient } from '@/api/runClient';
import type { RunDetail, RunSummary } from '@/models/enforcement';

interface LoadOptions {
  background?: boolean;
}

interface RunStoreState {
  currentRun: RunDetail | null;
  error: string | null;
  loading: boolean;
  runs: RunSummary[];
  clear: () => void;
  loadRun: (client: RunClient, runId: string, options?: LoadOptions) => Promise<RunDetail | null>;
  loadRuns: (client: RunClient, contractId: string, options?: LoadOptions) => Promise<RunSummary[]>;
}

export const useRunStore = create<RunStoreState>((set) => ({
  currentRun: null,
  error: null,
  loading: false,
  runs: [],
  clear: () => {
    set({
      currentRun: null,
      error: null,
      loading: false,
      runs: [],
    });
  },
  loadRun: async (client, runId, options) => {
    if (!options?.background) {
      set({
        error: null,
        loading: true,
      });
    }

    try {
      const currentRun = await client.getRun(runId);

      set((state) => ({
        currentRun,
        error: null,
        loading: options?.background ? state.loading : false,
      }));

      return currentRun;
    } catch (error) {
      set((state) => ({
        error: error instanceof Error ? error.message : 'Unable to load the enforcement run.',
        loading: options?.background ? state.loading : false,
      }));

      return null;
    }
  },
  loadRuns: async (client, contractId, options) => {
    if (!options?.background) {
      set({
        error: null,
        loading: true,
      });
    }

    try {
      const runs = await client.listRuns(contractId);

      set((state) => ({
        error: null,
        loading: options?.background ? state.loading : false,
        runs,
      }));

      return runs;
    } catch (error) {
      set((state) => ({
        error: error instanceof Error ? error.message : 'Unable to load enforcement runs.',
        loading: options?.background ? state.loading : false,
      }));

      return [];
    }
  },
}));
