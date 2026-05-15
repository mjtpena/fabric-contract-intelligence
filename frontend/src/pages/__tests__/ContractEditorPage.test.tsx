import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, vi } from 'vitest';
import { ContractEditorPage } from '@/pages/ContractEditorPage';
import { useContractStore } from '@/store/contractStore';

const {
  readySdk,
  sdkReady,
  unreadySdk,
} = vi.hoisted(() => {
  const getAccessToken = vi.fn().mockResolvedValue('token');
  const loadItemDefinition = vi.fn().mockResolvedValue(null);
  const loadItemMetadata = vi.fn().mockResolvedValue(null);
  const notifyError = vi.fn().mockResolvedValue(undefined);
  const notifyInfo = vi.fn().mockResolvedValue(undefined);
  const notifySuccess = vi.fn().mockResolvedValue(undefined);
  const saveItemDefinition = vi.fn().mockResolvedValue(undefined);
  const ready = {
    apiBaseUrl: 'https://api.example.test',
    correlationId: 'corr-editor-page',
    getAccessToken,
    isHosted: true,
    isReady: true,
    loadItemDefinition,
    loadItemMetadata,
    notifyError,
    notifyInfo,
    notifySuccess,
    saveItemDefinition,
    themeMode: 'light',
    workspaceId: 'workspace-1',
  };

  return {
    getAccessTokenMock: getAccessToken,
    loadItemDefinitionMock: loadItemDefinition,
    loadItemMetadataMock: loadItemMetadata,
    notifyErrorMock: notifyError,
    notifyInfoMock: notifyInfo,
    notifySuccessMock: notifySuccess,
    readySdk: ready,
    saveItemDefinitionMock: saveItemDefinition,
    sdkReady: { value: true },
    unreadySdk: {
      ...ready,
      isHosted: false,
      isReady: false,
    },
  };
});

vi.mock('@/hooks/useFabricSdk', () => ({
  useFabricSdk: () => (sdkReady.value ? readySdk : unreadySdk),
}));

vi.mock('@/components/ContractEditor/MonacoYamlEditor', () => ({
  MonacoYamlEditor: (props: { value: string }) => <textarea aria-label="ODCS YAML" readOnly value={props.value} />,
}));

vi.mock('@/components/ContractEditor/ValidationPanel', () => ({
  ValidationPanel: () => <div>Validation panel</div>,
}));

vi.mock('@/components/ContractEditor/NewContractTypeSelector', () => ({
  NewContractTypeSelector: ({ onConfirm }: { onConfirm: (type: string) => void }) => (
    <div>
      <div>Choose contract target type</div>
      <button onClick={() => onConfirm('lakehouse')}>Create contract</button>
    </div>
  ),
}));

vi.mock('@/components/FabricPickers', () => ({
  FabricTargetItemPicker: () => <div>Fabric target item picker</div>,
  TargetTypePicker: () => <div>Target type picker</div>,
  TablePicker: () => <div>Table picker</div>,
  getContractTargetTypeLabel: () => 'Lakehouse',
}));

describe('ContractEditorPage', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    sdkReady.value = true;
    useContractStore.setState({
      activeContract: null,
      contracts: [],
      error: null,
      loading: false,
      saving: false,
      versions: [],
    });
  });

  it('restores the only workspace contract for a Fabric item after the SDK is ready', async () => {
    sdkReady.value = false;
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.endsWith('/v1/contracts')) {
        return jsonResponse([
          {
            id: 'fb929a52-b626-424c-88c4-67ce5337fc60',
            lastRunAt: '2026-05-12T01:53:33.8820040Z',
            lastRunStatus: 'passed',
            name: 'Orqentis Showcase Contract',
            status: 'active',
            version: '1.0.0',
          },
        ]);
      }

      if (url.endsWith('/v1/contracts/fb929a52-b626-424c-88c4-67ce5337fc60/versions')) {
        return jsonResponse([]);
      }

      if (url.endsWith('/v1/contracts/fb929a52-b626-424c-88c4-67ce5337fc60')) {
        return jsonResponse({
          aiSuggested: false,
          createdAt: '2026-05-12T01:53:33.8820040Z',
          createdBy: 'owner@example.com',
          description: 'Showcase contract',
          id: 'fb929a52-b626-424c-88c4-67ce5337fc60',
          name: 'Orqentis Showcase Contract',
          odcsYaml: 'apiVersion: v3.1.0\nkind: DataContract\nname: Orqentis Showcase Contract',
          ownerEmail: 'owner@example.com',
          status: 'active',
          targetItemId: '2404814f-f2a1-48c0-b758-3a7f481d29d0',
          targetLakehouseId: '2404814f-f2a1-48c0-b758-3a7f481d29d0',
          targetTablePath:
            'abfss://workspace@onelake.dfs.fabric.microsoft.com/OrqentisShowcaseLakehouse.Lakehouse/Tables/owid_co2_demo',
          targetType: 'lakehouse',
          updatedAt: '2026-05-12T01:53:33.8820040Z',
          version: '1.0.0',
        });
      }

      return jsonResponse({ title: 'not found' }, 404);
    });
    vi.stubGlobal('fetch', fetchMock);

    const view = renderEditor();
    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());

    sdkReady.value = true;
    view.rerender(editorTree());

    expect(await screen.findAllByText('Orqentis Showcase Contract')).not.toHaveLength(0);
    expect(await screen.findByText('Validation panel')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/v1/contracts/fb929a52-b626-424c-88c4-67ce5337fc60',
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
  });

  it('shows the type selector for a brand-new item with no existing contract', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.endsWith('/v1/contracts')) {
        return jsonResponse([]);
      }
      return jsonResponse({ title: 'not found' }, 404);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(editorTree());

    expect(await screen.findByText('Choose contract target type')).toBeInTheDocument();
  });

  it('opens the editor after the user confirms a type in the type selector', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.endsWith('/v1/contracts')) {
        return jsonResponse([]);
      }
      return jsonResponse({ title: 'not found' }, 404);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(editorTree());
    expect(await screen.findByText('Choose contract target type')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create contract' }));

    expect(await screen.findByLabelText('ODCS YAML')).toBeInTheDocument();
  });
});

function renderEditor() {
  return render(editorTree());
}

function editorTree() {
  return (
    <FluentProvider theme={webLightTheme}>
      <MemoryRouter
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
        initialEntries={['/contracts/editor/64aad0c5-cb6e-443b-b20c-995b95d6f1e3']}
      >
        <Routes>
          <Route path="/contracts/editor/:itemObjectId" element={<ContractEditorPage />} />
        </Routes>
      </MemoryRouter>
    </FluentProvider>
  );
}

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json' },
      status,
    }),
  );
}
