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
        breachScore: 12,
        lastRunAt: '2026-05-08T10:00:00Z',
        lastRunStatus: 'passed',
        name: 'Patient Encounters Contract',
        ownerEmail: 'quality@example.com',
        status: 'active',
        targetTablePath: 'Tables/patient_encounters',
        targetType: 'lakehouse',
        version: '1.0.0',
      },
      {
        breachScore: 88,
        id: 'contract-2',
        lastRunAt: '2026-05-09T10:00:00Z',
        lastRunStatus: 'failed',
        name: 'Billing Claims Contract',
        ownerEmail: 'finance@example.com',
        status: 'draft',
        targetTablePath: 'Tables/billing_claims',
        targetType: 'lakehouse',
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
    expect(screen.getByRole('link', { name: 'Patient Encounters Contract' })).toHaveAttribute('href', '/contracts/contract-1');
    expect(screen.getByText('Billing Claims Contract')).toBeInTheDocument();
    expect(screen.getByText('Showing 2 of 2 contracts')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create contract' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Open' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Run now' })).toHaveLength(2);
  });

  it('filters contracts from the URL search query', () => {
    renderWithProviders(<ContractListPage />, { route: '/contracts?q=billing' });

    expect(screen.getByText('Billing Claims Contract')).toBeInTheDocument();
    expect(screen.queryByText('Patient Encounters Contract')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 1 of 2 contracts')).toBeInTheDocument();
  });
});
