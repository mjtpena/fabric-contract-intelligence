import { create } from 'zustand';

interface AppState {
  workspaceId: string | null;
  setWorkspaceId: (id: string) => void;
  correlationId: string | null;
  setCorrelationId: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  workspaceId: null,
  setWorkspaceId: (id) => set({ workspaceId: id }),
  correlationId: null,
  setCorrelationId: (id) => set({ correlationId: id }),
}));
