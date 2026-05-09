import { useMemo } from 'react';
import {
  Body1,
  Button,
  Caption1,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  Spinner,
  Subtitle1,
  Title2,
  createTableColumn,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { useNavigate } from 'react-router-dom';
import { AddRegular, ArrowClockwiseRegular, PlayRegular } from '@fluentui/react-icons';
import { createContractClient } from '@/api/contractClient';
import { StatusBadge } from '@/components/StatusBadge';
import { useContracts } from '@/hooks/useContract';
import { useFabricSdk } from '@/hooks/useFabricSdk';
import type { ContractSummary } from '@/models/Contract';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    padding: tokens.spacingHorizontalXXL,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacingHorizontalL,
    flexWrap: 'wrap',
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'center',
  },
  surface: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    alignItems: 'flex-start',
  },
  rowActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
  },
});

export function ContractListPage() {
  const styles = useStyles();
  const navigate = useNavigate();
  const sdk = useFabricSdk();

  const client = useMemo(
    () =>
      createContractClient({
        baseUrl: sdk.apiBaseUrl,
        correlationId: sdk.correlationId,
        getAccessToken: sdk.getAccessToken,
        workspaceId: sdk.workspaceId,
      }),
    [sdk.apiBaseUrl, sdk.correlationId, sdk.getAccessToken, sdk.workspaceId],
  );

  const { contracts, error, loading, refresh, runNow } = useContracts(client);

  const columns = useMemo(
    () =>
      [
        createTableColumn<ContractSummary>({
          columnId: 'name',
          compare: (left, right) => left.name.localeCompare(right.name),
          renderCell: (item) => item.name,
          renderHeaderCell: () => 'Name',
        }),
        createTableColumn<ContractSummary>({
          columnId: 'status',
          renderCell: (item) => <StatusBadge status={item.status} />,
          renderHeaderCell: () => 'Status',
        }),
        createTableColumn<ContractSummary>({
          columnId: 'lastRun',
          renderCell: (item) => item.lastRunAt ? formatDate(item.lastRunAt) : 'Not run yet',
          renderHeaderCell: () => 'Last run',
        }),
        createTableColumn<ContractSummary>({
          columnId: 'version',
          renderCell: (item) => item.version,
          renderHeaderCell: () => 'Version',
        }),
        createTableColumn<ContractSummary>({
          columnId: 'actions',
          renderCell: (item) => (
            <div className={styles.rowActions}>
              <Button appearance="subtle" onClick={() => navigate(`/contracts/${item.id}`)}>
                Open
              </Button>
              <Button
                appearance="subtle"
                icon={<PlayRegular />}
                onClick={() => {
                  void handleRunNow(item.id);
                }}
              >
                Run now
              </Button>
            </div>
          ),
          renderHeaderCell: () => 'Actions',
        }),
      ],
    [navigate, styles.rowActions],
  );

  const handleRunNow = async (contractId: string) => {
    try {
      const run = await runNow(contractId);
      await sdk.notifySuccess('Run requested', 'The enforcement run was queued successfully.');
      await refresh();
      navigate(`/contracts/${contractId}/runs/${run.runId}`);
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : 'Unable to queue the run.';
      await sdk.notifyError('Run failed', message);
    }
  };

  return (
    <section className={styles.root}>
      <div className={styles.header}>
        <div>
          <Title2>Contract library</Title2>
          <Caption1>Manage contract definitions, statuses, versions and quick runs.</Caption1>
        </div>
        <div className={styles.actions}>
          <Button
            appearance="secondary"
            icon={<ArrowClockwiseRegular />}
            onClick={() => {
              void refresh();
            }}
          >
            Refresh
          </Button>
          <Button appearance="primary" icon={<AddRegular />} onClick={() => navigate('/contracts/new')}>
            Create contract
          </Button>
        </div>
      </div>

      <div className={styles.surface}>
        {loading ? <Spinner label="Loading contracts…" /> : null}
        {error ? <Body1>{error}</Body1> : null}
        {!loading && contracts.length === 0 ? (
          <div className={styles.emptyState}>
            <Subtitle1>No contracts yet — create one</Subtitle1>
            <Body1>Start with a draft contract and validate the YAML before saving.</Body1>
            <Button appearance="primary" onClick={() => navigate('/contracts/new')}>
              Create contract
            </Button>
          </div>
        ) : null}

        {!loading && contracts.length > 0 ? (
          <DataGrid items={contracts} columns={columns}>
            <DataGridHeader>
              <DataGridRow>
                {({ renderHeaderCell }) => (
                  <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                )}
              </DataGridRow>
            </DataGridHeader>
            <DataGridBody<ContractSummary>>
              {({ item, rowId }) => (
                <DataGridRow<ContractSummary> key={rowId}>
                  {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                </DataGridRow>
              )}
            </DataGridBody>
          </DataGrid>
        ) : null}
      </div>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
