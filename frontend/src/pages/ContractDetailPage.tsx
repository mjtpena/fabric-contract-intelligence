import { useCallback, useMemo, useState } from 'react';
import {
  Body1,
  Breadcrumb,
  BreadcrumbButton,
  BreadcrumbDivider,
  BreadcrumbItem,
  Button,
  Caption1,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Spinner,
  Subtitle1,
  Title2,
  Tooltip,
  createTableColumn,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { useNavigate, useParams } from 'react-router-dom';
import { EditRegular } from '@fluentui/react-icons';
import { MonacoYamlEditor } from '@/components/ContractEditor/MonacoYamlEditor';
import { ContractClientError, createContractClient } from '@/api/contractClient';
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
  subtitle: {
    color: tokens.colorNeutralForeground3,
    marginTop: tokens.spacingVerticalXS,
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
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  yaml: {
    height: '32rem',
    minHeight: '20rem',
  },
  statusFlow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    flexWrap: 'wrap',
  },
  statusPill: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusCircular,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  currentStatusPill: {
    border: `1px solid ${tokens.colorBrandStroke1}`,
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  flowConnector: {
    color: tokens.colorNeutralForeground3,
  },
  lifecycleActions: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    alignItems: 'center',
    flexWrap: 'wrap',
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

  const { contract, error, loading, refresh, versions } = useContract(client, id);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const sortedVersions = useMemo(() => [...versions].sort(compareContractVersions), [versions]);
  const previousVersionByVersion = useMemo(
    () => new Map(sortedVersions.map((version, index) => [version.version, sortedVersions[index - 1]?.version ?? null])),
    [sortedVersions],
  );

  const openWorkloadRoute = useCallback(async (path: string) => {
    if (!(await sdk.openWorkloadRoute(path))) {
      navigate(path);
    }
  }, [navigate, sdk]);

  const handleStatusChange = useCallback(async (status: string) => {
    if (!contract) {
      return;
    }

    setStatusUpdating(true);
    try {
      await client.updateStatus(contract.id, status);
      await sdk.notifySuccess('Status updated', `Contract moved to ${status}.`);
      await refresh();
    } catch (statusError) {
      if (statusError instanceof ContractClientError && statusError.status === 404) {
        await sdk.notifyInfo('Status workflow not yet enabled on the server', 'The frontend workflow is ready, but the API endpoint is not deployed yet.');
      } else {
        const message = statusError instanceof Error ? statusError.message : 'Unable to update contract status.';
        await sdk.notifyError('Status update failed', message);
      }
    } finally {
      setStatusUpdating(false);
    }
  }, [client, contract, refresh, sdk]);

  const statusActions = useMemo(
    () => (contract ? getStatusActions(contract.status) : []),
    [contract],
  );

  const columns = useMemo(
    () =>
      [
        createTableColumn<ContractVersion>({
          columnId: 'version',
          compare: compareContractVersions,
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
        createTableColumn<ContractVersion>({
          columnId: 'actions',
          renderCell: (item) => {
            const previousVersion = previousVersionByVersion.get(item.version);
            const contractId = contract?.id ?? id;
            const comparePath = contractId && previousVersion
              ? `/contracts/${encodeURIComponent(contractId)}/runs?compare=1&right=${encodeURIComponent(item.version)}&left=${encodeURIComponent(previousVersion)}`
              : null;

            return (
              <Tooltip
                content={previousVersion ? 'Compare this version with the previous version.' : 'No older version to compare.'}
                relationship="label"
              >
                <Button
                  appearance="subtle"
                  aria-disabled={!previousVersion}
                  disabled={!previousVersion}
                  size="small"
                  onClick={() => {
                    if (comparePath) {
                      void openWorkloadRoute(comparePath);
                    }
                  }}
                >
                  Compare with previous
                </Button>
              </Tooltip>
            );
          },
          renderHeaderCell: () => 'Actions',
        }),
      ],
    [contract?.id, id, openWorkloadRoute, previousVersionByVersion],
  );

  return (
    <section className={styles.root}>
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbButton onClick={() => { void openWorkloadRoute('/contracts'); }}>Contracts</BreadcrumbButton>
        </BreadcrumbItem>
        <BreadcrumbDivider />
        <BreadcrumbItem>
          <BreadcrumbButton current>{contract?.name ?? id ?? 'Contract'}</BreadcrumbButton>
        </BreadcrumbItem>
      </Breadcrumb>

      <div className={styles.header}>
        <div>
          <Title2>{contract?.name ?? 'Contract detail'}</Title2>
          <Caption1 className={styles.subtitle}>Review contract metadata and compare immutable versions.</Caption1>
        </div>
        {contract ? (
          <Button
            appearance="primary"
            icon={<EditRegular />}
            onClick={() => {
              void openWorkloadRoute(`/contracts/${contract.id}/edit`);
            }}
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
              <Caption1>Target</Caption1>
              <Body1>{contract.targetTablePath}</Body1>
            </div>
            <div className={styles.card}>
              <Caption1>Version</Caption1>
              <Body1>{contract.version}</Body1>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.lifecycleActions}>
              <div>
                <Subtitle1>Lifecycle status</Subtitle1>
                <Caption1>Draft → Review → Active → Deprecated → Archived</Caption1>
              </div>
              <Menu>
                <MenuTrigger disableButtonEnhancement>
                  <MenuButton disabled={statusUpdating || statusActions.length === 0}>Change status</MenuButton>
                </MenuTrigger>
                <MenuPopover>
                  <MenuList>
                    {statusActions.map((action) => (
                      <MenuItem
                        key={action.status}
                        onClick={() => {
                          void handleStatusChange(action.status);
                        }}
                      >
                        {action.label}
                      </MenuItem>
                    ))}
                  </MenuList>
                </MenuPopover>
              </Menu>
            </div>
            <div className={styles.statusFlow} aria-label="Contract lifecycle status flow">
              {statusFlow.map((status, index) => (
                <StatusFlowStep
                  key={status}
                  currentStatus={contract.status}
                  index={index}
                  status={status}
                  styles={styles}
                />
              ))}
            </div>
          </div>

          <div className={styles.card}>
            <Subtitle1>Version history</Subtitle1>
            <Body1>Tip: open any run to view a side-by-side schema diff between any two versions.</Body1>
            <DataGrid items={sortedVersions} columns={columns}>
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
            <div className={styles.yaml}>
              <MonacoYamlEditor
                readOnly
                themeMode={sdk.themeMode}
                value={contract.odcsYaml}
                onChange={() => undefined}
              />
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

const statusFlow = ['draft', 'review', 'active', 'deprecated', 'archived'] as const;

function StatusFlowStep({
  currentStatus,
  index,
  status,
  styles,
}: {
  currentStatus: string;
  index: number;
  status: (typeof statusFlow)[number];
  styles: ReturnType<typeof useStyles>;
}) {
  const isCurrent = currentStatus.toLowerCase() === status;

  return (
    <>
      {index > 0 ? <span className={styles.flowConnector}>→</span> : null}
      <span className={`${styles.statusPill} ${isCurrent ? styles.currentStatusPill : ''}`} aria-current={isCurrent ? 'step' : undefined}>
        {toStatusLabel(status)}
      </span>
    </>
  );
}

function getStatusActions(status: string) {
  switch (status.toLowerCase()) {
    case 'draft':
      return [{ label: 'Move to Review', status: 'review' }];
    case 'review':
      return [{ label: 'Activate', status: 'active' }];
    case 'active':
      return [{ label: 'Deprecate', status: 'deprecated' }];
    case 'deprecated':
      return [{ label: 'Archive', status: 'archived' }];
    default:
      return [];
  }
}

function toStatusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function compareContractVersions(left: ContractVersion, right: ContractVersion) {
  return left.version.localeCompare(right.version, undefined, { numeric: true, sensitivity: 'base' });
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

export default ContractDetailPage;
