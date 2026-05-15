import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import { WorkspaceSettingsPage } from '@/pages/WorkspaceSettingsPage';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('@/hooks/useFabricSdk', () => ({
  useFabricSdk: () => ({
    apiBaseUrl: '',
    correlationId: 'corr-settings-page',
    getAccessToken: vi.fn().mockResolvedValue(''),
    isHosted: true,
    isReady: true,
    itemId: null,
    notifyError: vi.fn().mockResolvedValue(undefined),
    notifyInfo: vi.fn().mockResolvedValue(undefined),
    notifySuccess: vi.fn().mockResolvedValue(undefined),
    saveItemDefinition: vi.fn().mockResolvedValue(undefined),
    themeMode: 'light',
    workspaceId: 'workspace-123',
  }),
}));

describe('WorkspaceSettingsPage', () => {
  it('renders the workspace settings placeholders for tiering and integrations', () => {
    renderWithProviders(<WorkspaceSettingsPage />, { route: '/workspace/settings' });

    expect(screen.getByText('Workspace settings')).toBeInTheDocument();
    expect(screen.getByText('Current tier')).toBeInTheDocument();
    expect(screen.getByText('Community')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage API keys' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open contracts & policies' })).toBeInTheDocument();
    expect(screen.getByText('Not connected')).toBeInTheDocument();
  });
});
