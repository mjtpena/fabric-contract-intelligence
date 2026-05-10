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
  it('renders the contracts workspace shell', () => {
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

    expect(screen.getByText('Orqentis')).toBeInTheDocument();
    expect(screen.getByText('Contract library')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contracts' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Workspace settings' })).toBeInTheDocument();
  });

  it('resolves Fabric workspace deep links to the contract editor', () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <MemoryRouter
          future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
          initialEntries={[
            '/groups/8e15a176-ac93-4ed2-9540-818214ab1199/Org.Orqentis.Contract/64aad0c5-cb6e-443b-b20c-995b95d6f1e3?experience=fabric-developer',
          ]}
        >
          <App />
        </MemoryRouter>
      </FluentProvider>,
    );

    expect(screen.getByText('Start drafting')).toBeInTheDocument();
  });
});
