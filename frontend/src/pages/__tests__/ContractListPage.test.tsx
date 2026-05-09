import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import { ContractListPage } from '@/pages/ContractListPage';
import { renderWithProviders } from '@/test/renderWithProviders';

const { refreshMock, runNowMock } = vi.hoisted(() => ({
  refreshMock: vi.fn().mockResolvedValue(undefined),
  runNowMock: vi.fn().mockResolvedValue({ runId: 'run-1', status: 'accepted' }),
}));

vi.mock('@/hooks/useFabricSdk', () => ({
  useFabricSdk: () => ({
    apiBaseUrl: '',
    correlationId: 'corr-list-test',
    getAccessToken: vi.fn().mockResolvedValue(''),
    isHosted: false,
    isReady: true,
    itemId: null,
    notifyError: vi.fn().mockResolvedValue(undefined),
    notifyInfo: vi.fn().mockResolvedValue(undefined),
    notifySuccess: vi.fn().mockResolvedValue(undefined),
    saveItemDefinition: vi.fn().mockResolvedValue(undefined),
    themeMode: 'light',
    workspaceId: '',
  }),
}));

vi.mock('@/hooks/useContract', () => ({
  useContracts: () => ({
    contracts: [
      {
        id: 'contract-1',
        lastRunAt: '2026-05-08T10:00:00Z',
        lastRunStatus: 'passed',
        name: 'Patient Encounters Contract',
        status: 'active',
        version: '1.0.0',
      },
    ],
    error: null,
    loading: false,
    refresh: refreshMock,
    runNow: runNowMock,
    saving: false,
  }),
}));

describe('ContractListPage', () => {
  it('renders the contract grid with key actions', () => {
    renderWithProviders(<ContractListPage />, { route: '/contracts' });

    expect(screen.getByText('Contract library')).toBeInTheDocument();
    expect(screen.getByText('Patient Encounters Contract')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create contract' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run now' })).toBeInTheDocument();
  });
});
