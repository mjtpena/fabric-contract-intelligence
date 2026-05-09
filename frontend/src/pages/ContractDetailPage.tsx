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
import { useNavigate, useParams } from 'react-router-dom';
import { EditRegular } from '@fluentui/react-icons';
import { createContractClient } from '@/api/contractClient';
import { StatusBadge } from '@/components/StatusBadge';
import { useContract } from '@/hooks/useContract';
import { useFabricSdk } from '@/hooks/useFabricSdk';
import type { ContractVersion } from '@/models/Contract';

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
  metadata: {
    display: 'grid',
    gap: tokens.spacingHorizontalL,
    gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
  },
  card: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    padding: tokens.spacingHorizontalL,
  },
  yaml: {
    whiteSpace: 'pre-wrap',
    fontFamily: tokens.fontFamilyMonospace,
    margin: 0,
  },
});

export function ContractDetailPage() {
  const styles = useStyles();
  const { id } = useParams();
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

  const { contract, error, loading, versions } = useContract(client, id);

  const columns = useMemo(
    () =>
      [
        createTableColumn<ContractVersion>({
          columnId: 'version',
          compare: (left, right) => left.version.localeCompare(right.version),
          renderCell: (item) => item.version,
          renderHeaderCell: () => 'Version',
        }),
        createTableColumn<ContractVersion>({
          columnId: 'createdAt',
          renderCell: (item) => formatDate(item.createdAt),
          renderHeaderCell: () => 'Created',
        }),
        createTableColumn<ContractVersion>({
          columnId: 'commitMessage',
          renderCell: (item) => item.commitMessage ?? '—',
          renderHeaderCell: () => 'Commit message',
        }),
      ],
    [],
  );

  return (
    <section className={styles.root}>
      <div className={styles.header}>
        <div>
          <Title2>{contract?.name ?? 'Contract detail'}</Title2>
          <Caption1>Read-only contract metadata with immutable version history.</Caption1>
        </div>
        {contract ? (
          <Button
            appearance="primary"
            icon={<EditRegular />}
            onClick={() => navigate(`/contracts/${contract.id}/edit`)}
          >
            Edit contract
          </Button>
        ) : null}
      </div>

      {loading ? <Spinner label="Loading contract…" /> : null}
      {error ? <Body1>{error}</Body1> : null}

      {contract ? (
        <>
          <div className={styles.metadata}>
            <div className={styles.card}>
              <Caption1>Status</Caption1>
              <StatusBadge status={contract.status} />
            </div>
            <div className={styles.card}>
              <Caption1>Owner</Caption1>
              <Body1>{contract.ownerEmail}</Body1>
            </div>
            <div className={styles.card}>
              <Caption1>Target table</Caption1>
              <Body1>{contract.targetTablePath}</Body1>
            </div>
            <div className={styles.card}>
              <Caption1>Version</Caption1>
              <Body1>{contract.version}</Body1>
            </div>
          </div>

          <div className={styles.card}>
            <Subtitle1>Version history</Subtitle1>
            <DataGrid items={versions} columns={columns}>
              <DataGridHeader>
                <DataGridRow>
                  {({ renderHeaderCell }) => (
                    <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                  )}
                </DataGridRow>
              </DataGridHeader>
              <DataGridBody<ContractVersion>>
                {({ item, rowId }) => (
                  <DataGridRow<ContractVersion> key={rowId}>
                    {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                  </DataGridRow>
                )}
              </DataGridBody>
            </DataGrid>
          </div>

          <div className={styles.card}>
            <Subtitle1>Current YAML</Subtitle1>
            <pre className={styles.yaml}>{contract.odcsYaml}</pre>
          </div>
        </>
      ) : null}
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
