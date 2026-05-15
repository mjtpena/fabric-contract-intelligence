import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { EnforcementRunPage } from '@/pages/EnforcementRunPage';

const {
  getAccessTokenMock,
  loadItemDefinitionMock,
  notifyInfoMock,
  notifySuccessMock,
  notifyErrorMock,
  refreshMock,
  saveItemDefinitionMock,
  useEnforcementRunMock,
} = vi.hoisted(() => ({
  getAccessTokenMock: vi.fn().mockResolvedValue(''),
  loadItemDefinitionMock: vi.fn().mockResolvedValue(null),
  notifyErrorMock: vi.fn().mockResolvedValue(undefined),
  notifyInfoMock: vi.fn().mockResolvedValue(undefined),
  notifySuccessMock: vi.fn().mockResolvedValue(undefined),
  refreshMock: vi.fn().mockResolvedValue(undefined),
  saveItemDefinitionMock: vi.fn().mockResolvedValue(undefined),
  useEnforcementRunMock: vi.fn(),
}));

vi.mock('@/hooks/useFabricSdk', () => ({
  useFabricSdk: () => ({
    apiBaseUrl: '',
    correlationId: 'corr-run-page',
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
    workspaceId: 'workspace-1',
  }),
}));

vi.mock('@/hooks/useContract', () => ({
  useContract: () => ({
    contract: {
      aiSuggested: false,
      createdAt: '2026-05-08T10:00:00Z',
      createdBy: 'owner@example.com',
      description: 'Contract detail',
      id: 'contract-1',
      name: 'Patient Encounters Contract',
      odcsYaml: 'apiVersion: v3.1.0',
      ownerEmail: 'owner@example.com',
      status: 'active',
      targetItemId: 'lakehouse-1',
      targetLakehouseId: 'lakehouse-1',
      targetTablePath:
        'abfss://workspace@onelake.dfs.fabric.microsoft.com/Lakehouse.Lakehouse/Tables/patient_encounters',
      targetType: 'lakehouse',
      updatedAt: '2026-05-08T10:00:00Z',
      version: '2.0.0',
    },
    error: null,
    loading: false,
    refresh: vi.fn().mockResolvedValue(undefined),
    saving: false,
    versions: [
      {
        commitMessage: 'Initial version',
        createdAt: '2026-05-01T10:00:00Z',
        createdBy: 'owner@example.com',
        id: 'version-1',
        odcsYaml: 'name: v1',
        version: '1.0.0',
      },
      {
        commitMessage: 'Current version',
        createdAt: '2026-05-08T10:00:00Z',
        createdBy: 'owner@example.com',
        id: 'version-2',
        odcsYaml: 'name: v2',
        version: '2.0.0',
      },
    ],
  }),
}));

vi.mock('@/hooks/useEnforcementRun', () => ({
  useEnforcementRun: useEnforcementRunMock,
}));

vi.mock('@/components/RunResult/SchemaDiffViewer', () => ({
  SchemaDiffViewer: (props: { modifiedYaml: string; originalYaml: string }) => (
    <div data-testid="schema-diff-viewer">
      {props.originalYaml} :: {props.modifiedYaml}
    </div>
  ),
}));

describe('EnforcementRunPage', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    useEnforcementRunMock.mockReturnValue(createRunPageState());
  });

  it('renders all result sections across the run tabs', () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <MemoryRouter
          future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
          initialEntries={['/contracts/contract-1/runs/run-1']}
        >
          <Routes>
            <Route path="/contracts/:id/runs/:runId" element={<EnforcementRunPage />} />
          </Routes>
        </MemoryRouter>
      </FluentProvider>,
    );

    expect(screen.getAllByText('Patient Encounters Contract').length).toBeGreaterThan(0);
    expect(screen.getByText('schema.column.nullable')).toBeInTheDocument();
    expect(screen.getByText('AI breach score')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Quality Rules' }));
    expect(screen.getByText('quality.null_rate')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Freshness' }));
    expect(screen.getByText('freshness.max_age_hours')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Schema Diff' }));
    expect(screen.getByText('middle_name')).toBeInTheDocument();
    expect(screen.getByTestId('schema-diff-viewer')).toHaveTextContent('name: v1 :: name: v2');

    fireEvent.click(screen.getByRole('tab', { name: 'Remediation' }));
    expect(screen.getByText('Add NOT NULL constraint to customer_id.')).toBeInTheDocument();
    expect(screen.getByText('Investigate null order_date values.')).toBeInTheDocument();
  });

  it('shows workspace report rows when a Fabric report item has no pinned run', async () => {
    useEnforcementRunMock.mockReturnValue({
      error: null,
      loading: false,
      refresh: refreshMock,
      run: null,
      runs: [],
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              breachScore: 91,
              completedAt: '2026-05-08T10:05:00Z',
              contractId: 'contract-1',
              contractName: 'OWID CO2 Contract',
              correlationId: 'corr-run-page',
              deltaTableVersion: 0,
              runId: 'run-1',
              status: 'passed',
              triggeredAt: '2026-05-08T10:00:00Z',
              triggeredBy: 'manual',
            },
          ]),
          { headers: { 'Content-Type': 'application/json' }, status: 200 },
        ),
      ),
    );

    render(
      <FluentProvider theme={webLightTheme}>
        <MemoryRouter
          future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
          initialEntries={['/contracts/runs/report-item-1']}
        >
          <Routes>
            <Route path="/contracts/runs/:itemObjectId" element={<EnforcementRunPage />} />
          </Routes>
        </MemoryRouter>
      </FluentProvider>,
    );

    await waitFor(() => expect(screen.getByText('Contract reports')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('OWID CO2 Contract')).toBeInTheDocument());
    expect(screen.queryByText(/provide `contractId` and `runId`/i)).not.toBeInTheDocument();
  });
});

function createRunPageState() {
  return {
    error: null,
    loading: false,
    refresh: refreshMock,
    run: {
      breachScore: 72,
      completedAt: '2026-05-08T10:05:00Z',
      contractId: 'contract-1',
      correlationId: 'corr-run-page',
      deltaTableVersion: 42,
      id: 'run-1',
      resultJson: {
        breachScore: 72,
        completedAt: '2026-05-08T10:05:00Z',
        contractId: 'contract-1',
        overallStatus: 'failed',
        qualityRules: [
          {
            actual: 0.047,
            column: 'order_date',
            message: 'Null rate 4.7% exceeds threshold',
            ruleId: 'quality.null_rate',
            status: 'failed',
            threshold: 0.01,
          },
        ],
        freshnessRule: {
          ageHours: 18.4,
          lastModifiedUtc: '2026-05-08T10:00:00Z',
          maxAgeHours: 24,
          message: 'Freshness within SLA',
          ruleId: 'freshness.max_age_hours',
          status: 'passed',
        },
        remediationSuggestions: [
          'Add NOT NULL constraint to customer_id.',
          'Investigate null order_date values.',
        ],
        runId: 'run-1',
        schemaDiff: {
          addedColumns: ['middle_name'],
          nullabilityChanges: [
            {
              actualRequired: false,
              column: 'customer_id',
              expectedRequired: true,
            },
          ],
          partitionChange: {
            actual: ['ingest_date'],
            expected: ['encounter_date'],
          },
          removedColumns: [],
          typeChanges: [
            {
              actualType: 'STRING NULLABLE',
              column: 'customer_id',
              expectedType: 'STRING NOT NULL',
            },
          ],
        },
        schemaRules: [
          {
            actual: 'STRING NULLABLE',
            column: 'customer_id',
            expected: 'STRING NOT NULL',
            message: 'Column customer_id is nullable',
            ruleId: 'schema.column.nullable',
            status: 'failed',
          },
        ],
        tableVersion: 42,
      },
      status: 'failed',
      triggeredAt: '2026-05-08T10:00:00Z',
      triggeredBy: 'manual',
      versionId: 'version-2',
    },
    runs: [
      {
        completedAt: '2026-05-08T10:05:00Z',
        contractId: 'contract-1',
        correlationId: 'corr-run-page',
        id: 'run-1',
        status: 'failed',
        triggeredAt: '2026-05-08T10:00:00Z',
        triggeredBy: 'manual',
        versionId: 'version-2',
      },
    ],
  };
}
