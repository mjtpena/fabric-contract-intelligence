import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import App from './App';

const {
  getAccessTokenMock,
  loadItemDefinitionMock,
  notifyErrorMock,
  notifyInfoMock,
  notifySuccessMock,
  runNowMock,
  saveActionMock,
  saveItemDefinitionMock,
} = vi.hoisted(() => ({
  getAccessTokenMock: vi.fn().mockResolvedValue(''),
  loadItemDefinitionMock: vi.fn().mockResolvedValue(null),
  notifyErrorMock: vi.fn().mockResolvedValue(undefined),
  notifyInfoMock: vi.fn().mockResolvedValue(undefined),
  notifySuccessMock: vi.fn().mockResolvedValue(undefined),
  runNowMock: vi.fn().mockResolvedValue({ runId: 'run-1', status: 'accepted' }),
  saveActionMock: vi.fn().mockResolvedValue(undefined),
  saveItemDefinitionMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./hooks/useFabricSdk', () => ({
  useFabricSdk: () => ({
    apiBaseUrl: '',
    correlationId: 'corr-app-test',
    getAccessToken: getAccessTokenMock,
    isHosted: false,
    isReady: true,
    itemId: null,
    loadItemDefinition: loadItemDefinitionMock,
    notifyError: notifyErrorMock,
    notifyInfo: notifyInfoMock,
    notifySuccess: notifySuccessMock,
    saveItemDefinition: saveItemDefinitionMock,
    themeMode: 'light',
    workspaceId: '',
  }),
}));

vi.mock('./hooks/useContract', () => ({
  useContracts: () => ({
    contracts: [],
    error: null,
    loading: false,
    refresh: vi.fn().mockResolvedValue(undefined),
    runNow: vi.fn().mockResolvedValue({ runId: 'run-1', status: 'accepted' }),
    saving: false,
  }),
  useContract: () => ({
    contract: null,
    error: null,
    loading: false,
    refresh: vi.fn().mockResolvedValue(undefined),
    saving: false,
    versions: [],
  }),
  useContractActions: () => ({
    activate: saveActionMock,
    runNow: runNowMock,
    save: saveActionMock,
  }),
}));

vi.mock('./pages/EnforcementRunPage', () => ({
  EnforcementRunPage: () => <div>Enforcement run page</div>,
}));

vi.mock('./pages/WorkspaceSettingsPage', () => ({
  WorkspaceSettingsPage: () => <div>Workspace settings page</div>,
}));

describe('App', () => {
  it('renders the contract list at /contracts', () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <MemoryRouter
          future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
          initialEntries={['/contracts']}
        >
          <App />
        </MemoryRouter>
      </FluentProvider>,
    );

    // Fabric provides its own chrome; the workload renders only the item content area.
    // ContractListPage is the default view at /contracts.
    expect(screen.getByText('Contract library')).toBeInTheDocument();
  });

  it('renders the contract editor when navigating to a Fabric item editor URL', () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <MemoryRouter
          future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
          initialEntries={['/contracts/editor/64aad0c5-cb6e-443b-b20c-995b95d6f1e3']}
        >
          <App />
        </MemoryRouter>
      </FluentProvider>,
    );

    // ContractEditorPage empty state is shown when no contract is loaded yet.
    expect(screen.getByText('Start drafting')).toBeInTheDocument();
  });
});
