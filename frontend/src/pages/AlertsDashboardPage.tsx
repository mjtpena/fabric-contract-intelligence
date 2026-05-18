import { type KeyboardEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Breadcrumb,
  BreadcrumbButton,
  BreadcrumbDivider,
  BreadcrumbItem,
  Button,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  Dropdown,
  Field,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Option,
  Spinner,
  createTableColumn,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { AlertOffRegular, ArrowClockwiseRegular } from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { createOpsClient } from '@/api/opsClient';
import { EmptyState } from '@/components/EmptyState';
import { ItemEditor, type RibbonAction } from '@/components/ItemEditor/ItemEditor';
import { StatusBadge } from '@/components/StatusBadge';
import { useFabricSdk } from '@/hooks/useFabricSdk';
import { formatDateTime } from '@/lib/formatDate';
import type { ReportAuditRow } from '@/models/ops';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  filters: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
    gap: tokens.spacingHorizontalL,
  },
});

export function AlertsDashboardPage() {
  const styles = useStyles();
  const navigate = useNavigate();
  const sdk = useFabricSdk();
  const [rows, setRows] = useState<ReportAuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('all');

  const opsClient = useMemo(
    () =>
      createOpsClient({
        baseUrl: sdk.apiBaseUrl,
        correlationId: sdk.correlationId,
        getAccessToken: sdk.getAccessToken,
        workspaceId: sdk.workspaceId,
      }),
    [sdk.apiBaseUrl, sdk.correlationId, sdk.getAccessToken, sdk.workspaceId],
  );

  const loadAlerts = useCallback(() => {
    setLoading(true);
    setError(null);
    void opsClient.listAuditRows()
      .then((nextRows) => {
        setRows(nextRows);
      })
      .catch((listError) => {
        setRows([]);
        setError(listError instanceof Error ? listError.message : 'Unable to load alerts.');
      })
      .finally(() => setLoading(false));
  }, [opsClient]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const filtered = rows.filter((row) => status === 'all' || row.status === status);

  const openRun = useCallback((row: ReportAuditRow) => {
    navigate(`/contracts/runs?contractId=${encodeURIComponent(row.contractId)}&runId=${encodeURIComponent(row.runId)}`);
  }, [navigate]);

  const columns = useMemo(
    () => [
      createTableColumn<ReportAuditRow>({
        columnId: 'contract',
        renderHeaderCell: () => 'Contract',
        renderCell: (row) => row.contractName,
      }),
      createTableColumn<ReportAuditRow>({
        columnId: 'status',
        renderHeaderCell: () => 'Status',
        renderCell: (row) => <StatusBadge status={row.status} />,
      }),
      createTableColumn<ReportAuditRow>({
        columnId: 'score',
        renderHeaderCell: () => 'Breach score',
        renderCell: (row) => row.breachScore != null ? row.breachScore.toFixed(2) : '—',
      }),
      createTableColumn<ReportAuditRow>({
        columnId: 'triggeredAt',
        renderHeaderCell: () => 'Triggered',
        renderCell: (row) => formatDateTime(row.triggeredAt),
      }),
      createTableColumn<ReportAuditRow>({
        columnId: 'actions',
        renderHeaderCell: () => 'Actions',
        renderCell: (row) => (
          <Button
            appearance="subtle"
            aria-label={`Open run ${row.runId.slice(0, 8)} for contract ${row.contractName}`}
            size="small"
            onClick={() => openRun(row)}
          >
            Open run
          </Button>
        ),
      }),
    ],
    [openRun],
  );

  const homeToolbarActions: RibbonAction[] = useMemo(() => [
    {
      key: 'refresh',
      label: 'Refresh',
      icon: <ArrowClockwiseRegular />,
      disabled: loading,
      onClick: () => loadAlerts(),
    },
  ], [loadAlerts, loading]);

  return (
    <ItemEditor
      title="Alerts dashboard"
      subtitle="Spot breached contracts and open the exact run that needs attention."
      homeToolbarActions={homeToolbarActions}
    >
      <div className={styles.root}>
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbButton onClick={() => navigate('/contracts')}>Contracts</BreadcrumbButton>
        </BreadcrumbItem>
        <BreadcrumbDivider />
        <BreadcrumbItem>
          <BreadcrumbButton current>Alerts</BreadcrumbButton>
        </BreadcrumbItem>
      </Breadcrumb>

      <div className={styles.filters}>
        <Field label="Status">
          <Dropdown
            selectedOptions={[status]}
            value={toStatusLabel(status)}
            onOptionSelect={(_, data) => setStatus(data.optionValue ?? 'all')}
          >
            <Option value="all">All statuses</Option>
            <Option value="passed">Passed</Option>
            <Option value="warned">Warned</Option>
            <Option value="failed">Failed</Option>
            <Option value="error">Error</Option>
          </Dropdown>
        </Field>
      </div>

      {loading ? (
        <Spinner label="Loading alerts…" />
      ) : filtered.length === 0 ? (
        <>
          <EmptyState
            description="When a contract breaches a quality, schema, or freshness rule, you’ll see it here with a one-click jump straight to the failing run. No alerts yet — that’s a good thing."
            hint="Tip: open a contract and click ‘Run now’ to generate sample alert history."
            icon={<AlertOffRegular />}
            title="All clear — no alerts to triage"
            tone="success"
          />
          {error ? (
            <MessageBar intent="error">
              <MessageBarBody>{error}</MessageBarBody>
              <MessageBarActions>
                <Button appearance="secondary" size="small" onClick={loadAlerts}>
                  Retry
                </Button>
              </MessageBarActions>
            </MessageBar>
          ) : null}
        </>
      ) : (
        <DataGrid items={filtered} columns={columns}>
          <DataGridHeader>
            <DataGridRow>
              {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<ReportAuditRow>>
            {({ item, rowId }) => (
              <DataGridRow<ReportAuditRow>
                key={rowId}
                tabIndex={0}
                onKeyDown={(event: KeyboardEvent) => {
                  if (event.key === 'Enter') {
                    openRun(item);
                  }
                }}
              >
                {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      )}
      </div>
    </ItemEditor>
  );
}

function toStatusLabel(status: string) {
  if (status === 'all') return 'All statuses';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default AlertsDashboardPage;
