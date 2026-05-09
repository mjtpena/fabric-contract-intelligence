import { create } from 'zustand';
import type {
  ContractDetail,
  ContractDraft,
  ContractSummary,
  ContractVersion,
  RunAccepted,
} from '@/models/Contract';
import type { ContractClient } from '@/api/contractClient';

interface ContractStoreState {
  activeContract: ContractDetail | null;
  contracts: ContractSummary[];
  error: string | null;
  loading: boolean;
  saving: boolean;
  versions: ContractVersion[];
  clearActive: () => void;
  loadAll: (client: ContractClient) => Promise<void>;
  loadOne: (client: ContractClient, contractId: string) => Promise<void>;
  loadVersions: (client: ContractClient, contractId: string) => Promise<void>;
  runNow: (client: ContractClient, contractId: string) => Promise<RunAccepted>;
  save: (client: ContractClient, draft: ContractDraft) => Promise<ContractDetail>;
}

export const useContractStore = create<ContractStoreState>((set) => ({
  activeContract: null,
  contracts: [],
  error: null,
  loading: false,
  saving: false,
  versions: [],
  clearActive: () => {
    set({
      activeContract: null,
      versions: [],
    });
  },
  loadAll: async (client) => {
    set({
      error: null,
      loading: true,
    });

    try {
      const contracts = await client.listContracts();

      set({
        contracts,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unable to load contracts.',
        loading: false,
      });
    }
  },
  loadOne: async (client, contractId) => {
    set({
      error: null,
      loading: true,
    });

    try {
      const activeContract = await client.getContract(contractId);

      set({
        activeContract,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unable to load the selected contract.',
        loading: false,
      });
    }
  },
  loadVersions: async (client, contractId) => {
    set({
      error: null,
      loading: true,
    });

    try {
      const versions = await client.listVersions(contractId);

      set({
        loading: false,
        versions,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unable to load contract versions.',
        loading: false,
      });
    }
  },
  runNow: async (client, contractId) => {
    const result = await client.runNow(contractId);
    const contracts = await client.listContracts();

    set({
      contracts,
      error: null,
    });

    return result;
  },
  save: async (client, draft) => {
    set({
      error: null,
      saving: true,
    });

    try {
      const activeContract = draft.id
        ? await client.updateContract(draft.id, {
            name: draft.name,
            description: draft.description || null,
            ownerEmail: draft.ownerEmail,
            targetLakehouseId: draft.targetLakehouseId,
            targetTablePath: draft.targetTablePath,
            odcsYaml: draft.odcsYaml,
            commitMessage: draft.commitMessage || null,
          })
        : await client.createContract({
            mode: 'direct',
            name: draft.name,
            description: draft.description || null,
            ownerEmail: draft.ownerEmail,
            targetLakehouseId: draft.targetLakehouseId,
            targetTablePath: draft.targetTablePath,
            odcsYaml: draft.odcsYaml,
          });

      const [contracts, versions] = await Promise.all([
        client.listContracts(),
        client.listVersions(activeContract.id),
      ]);

      set({
        activeContract,
        contracts,
        error: null,
        saving: false,
        versions,
      });

      return activeContract;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save the contract.';

      set({
        error: message,
        saving: false,
      });

      throw error;
    }
  },
}));
