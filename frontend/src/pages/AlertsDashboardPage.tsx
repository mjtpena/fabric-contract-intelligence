import { useEffect, useMemo, useState } from 'react';
import {
  Body1,
  Caption1,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  Dropdown,
  Field,
  Option,
  Spinner,
  Title2,
  createTableColumn,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { AlertOffRegular } from '@fluentui/react-icons';
import { createOpsClient } from '@/api/opsClient';
import { StatusBadge } from '@/components/StatusBadge';
import { useFabricSdk } from '@/hooks/useFabricSdk';
import type { ReportAuditRow } from '@/models/ops';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    padding: tokens.spacingHorizontalXXL,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  filters: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
    gap: tokens.spacingHorizontalL,
  },
  emptyState: {
    border: `1px dashed ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingHorizontalXXL,
    backgroundColor: tokens.colorNeutralBackground2,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalM,
    textAlign: 'center',
  },
  emptyIcon: {
    color: tokens.colorNeutralForeground3,
    fontSize: '40px',
  },
});

export function AlertsDashboardPage() {
  const styles = useStyles();
  const sdk = useFabricSdk();
  const [rows, setRows] = useState<ReportAuditRow[]>([]);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    setLoading(true);
    void opsClient.listAuditRows()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [opsClient]);

  const filtered = rows.filter((row) => status === 'all' || row.status === status);

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
        renderCell: (row) => row.breachScore != null ? row.breachScore.toFixed(2) : 'n/a',
      }),
      createTableColumn<ReportAuditRow>({
        columnId: 'triggeredAt',
        renderHeaderCell: () => 'Triggered',
        renderCell: (row) => row.triggeredAt ? formatDate(row.triggeredAt) : '—',
      }),
    ],
    [],
  );

  return (
    <section className={styles.root}>
      <div className={styles.header}>
        <Title2>Alerts dashboard</Title2>
        <Caption1>Audit log of all enforcement runs and their breach scores.</Caption1>
      </div>

      <div className={styles.filters}>
        <Field label="Status">
          <Dropdown
            selectedOptions={[status]}
            value={status === 'all' ? 'All statuses' : status}
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
        <div className={styles.emptyState}>
          <AlertOffRegular className={styles.emptyIcon} />
          <Body1>No alerts matched the selected filters.</Body1>
        </div>
      ) : (
        <DataGrid items={filtered} columns={columns}>
          <DataGridHeader>
            <DataGridRow>
              {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<ReportAuditRow>>
            {({ item, rowId }) => (
              <DataGridRow<ReportAuditRow> key={rowId}>
                {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      )}
    </section>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}