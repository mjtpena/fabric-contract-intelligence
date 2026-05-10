import { useEffect, useMemo, useState } from 'react';
import {
  Body1,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  Dropdown,
  Field,
  Option,
  Title2,
  createTableColumn,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { createOpsClient } from '@/api/opsClient';
import { useFabricSdk } from '@/hooks/useFabricSdk';
import type { ReportAuditRow } from '@/models/ops';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    padding: tokens.spacingHorizontalXXL,
  },
  filters: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
    gap: tokens.spacingHorizontalL,
  },
});

export function AlertsDashboardPage() {
  const styles = useStyles();
  const sdk = useFabricSdk();
  const [rows, setRows] = useState<ReportAuditRow[]>([]);
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
    void opsClient.listAuditRows().then(setRows).catch(() => setRows([]));
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
        renderCell: (row) => row.status,
      }),
      createTableColumn<ReportAuditRow>({
        columnId: 'score',
        renderHeaderCell: () => 'Breach score',
        renderCell: (row) => row.breachScore?.toFixed(2) ?? 'n/a',
      }),
      createTableColumn<ReportAuditRow>({
        columnId: 'triggeredAt',
        renderHeaderCell: () => 'Triggered',
        renderCell: (row) => new Date(row.triggeredAt).toLocaleString(),
      }),
    ],
    [],
  );

  return (
    <section className={styles.root}>
      <Title2>Alerts dashboard</Title2>
      <div className={styles.filters}>
        <Field label="Status">
          <Dropdown selectedOptions={[status]} value={status} onOptionSelect={(_, data) => setStatus(data.optionValue ?? 'all')}>
            <Option value="all">all</Option>
            <Option value="failed">failed</Option>
            <Option value="warned">warned</Option>
            <Option value="passed">passed</Option>
            <Option value="error">error</Option>
          </Dropdown>
        </Field>
      </div>
      {filtered.length === 0 ? (
        <Body1>No alerts matched the selected filters.</Body1>
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
