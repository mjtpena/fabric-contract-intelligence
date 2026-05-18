import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Body1,
  Button,
  Caption1,
  Card,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  Dropdown,
  Field,
  Option,
  SearchBox,
  Spinner,
  Subtitle2,
  Title3,
  createTableColumn,
  makeStyles,
  tokens,
  type TableRowId,
} from '@fluentui/react-components';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { downloadZip } from 'client-zip';
import { AddRegular, ArrowClockwiseRegular, ChevronLeftRegular, ChevronRightRegular, DocumentBulletListRegular, PlayRegular } from '@fluentui/react-icons';
import { createContractClient } from '@/api/contractClient';
import { createOpsClient } from '@/api/opsClient';
import { createRunClient } from '@/api/runClient';
import { EmptyState } from '@/components/EmptyState';
import { FabricLink } from '@/components/FabricLink';
import { StatusBadge } from '@/components/StatusBadge';
import { VisuallyHidden } from '@/components/VisuallyHidden';
import { useContracts } from '@/hooks/useContract';
import { useFabricSdk } from '@/hooks/useFabricSdk';
import { aiDescriptionTemplates } from '@/lib/aiTemplates';
import { formatRelative } from '@/lib/formatDate';
import type { ContractSummary } from '@/models/Contract';
import { getContractTargetTypeLabel } from '@/models/ContractTarget';
import type { WorkspaceSummary } from '@/models/ops';

type StatusFilter = 'all' | 'active' | 'draft' | 'deprecated';
type TargetFilter = 'all' | 'delta';
type LastRunFilter = 'all' | 'passed' | 'failed' | 'warned' | 'error';

const pageSize = 25;
const statusFilters: StatusFilter[] = ['all', 'active', 'draft', 'deprecated'];
const targetFilters: TargetFilter[] = ['all', 'delta'];
const lastRunFilters: LastRunFilter[] = ['all', 'passed', 'failed', 'warned', 'error'];

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
  subtitle: {
    color: tokens.colorNeutralForeground3,
    marginTop: tokens.spacingVerticalXS,
  },
  filters: {
    display: 'grid',
    gridTemplateColumns: 'minmax(16rem, 2fr) repeat(3, minmax(10rem, 1fr)) auto',
    gap: tokens.spacingHorizontalM,
    alignItems: 'end',
    marginBottom: tokens.spacingVerticalM,
  },
  resultCount: {
    justifySelf: 'end',
    whiteSpace: 'nowrap',
    color: tokens.colorNeutralForeground2,
  },
  bulkBar: {
    position: 'sticky',
    top: 0,
    zIndex: 1,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    marginBottom: tokens.spacingVerticalM,
    border: `1px solid ${tokens.colorBrandStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow4,
  },
  bulkActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'center',
  },
  rowActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
  },
  onboarding: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
    gap: tokens.spacingHorizontalM,
  },
  onboardingCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingHorizontalL,
  },
  pagination: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: tokens.spacingHorizontalXS,
    alignItems: 'center',
    marginTop: tokens.spacingVerticalM,
  },
  link: {
    color: tokens.colorBrandForegroundLink,
    textDecorationLine: 'none',
    ':hover': {
      textDecorationLine: 'underline',
    },
  },
});

export function ContractListPage() {
  const styles = useStyles();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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

  const runClient = useMemo(
    () =>
      createRunClient({
        baseUrl: sdk.apiBaseUrl,
        correlationId: sdk.correlationId,
        getAccessToken: sdk.getAccessToken,
        workspaceId: sdk.workspaceId,
      }),
    [sdk.apiBaseUrl, sdk.correlationId, sdk.getAccessToken, sdk.workspaceId],
  );

  const { contracts, error, loading, refresh, runNow } = useContracts(client);
  const [workspaceScope, setWorkspaceScope] = useState<'current' | 'linked'>('current');
  const [tier, setTier] = useState<string>('community');
  const [federatedContracts, setFederatedContracts] = useState<ContractSummary[]>([]);
  const [federatedLoading, setFederatedLoading] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');
  const [searchInput, setSearchInput] = useState(() => searchParams.get('q') ?? '');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => parseFilter(searchParams.get('status'), statusFilters, 'all'));
  const [targetFilter, setTargetFilter] = useState<TargetFilter>(() => parseFilter(searchParams.get('target'), targetFilters, 'all'));
  const [lastRunFilter, setLastRunFilter] = useState<LastRunFilter>(() => parseFilter(searchParams.get('lastRun'), lastRunFilters, 'all'));
  const [selectedItems, setSelectedItems] = useState<Set<TableRowId>>(() => new Set());
  const [isBulkRunning, setIsBulkRunning] = useState(false);
  const [isBulkExporting, setIsBulkExporting] = useState(false);

  const currentPage = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);

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
    void opsClient.listWorkspaces().then((workspaces: WorkspaceSummary[]) => {
      setTier(workspaces[0]?.tier ?? 'community');
    }).catch(() => setTier('community'));
  }, [opsClient]);

  useEffect(() => {
    if (!(tier.toLowerCase() === 'enterprise' && workspaceScope === 'linked')) {
      return;
    }

    setFederatedLoading(true);
    void opsClient
      .listFederatedContracts()
      .then((response) => setFederatedContracts(response.contracts))
      .catch(() => setFederatedContracts([]))
      .finally(() => setFederatedLoading(false));
  }, [opsClient, tier, workspaceScope]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        setDefaultedParam(next, 'q', searchInput.trim(), '');
        setDefaultedParam(next, 'status', statusFilter, 'all');
        setDefaultedParam(next, 'target', targetFilter, 'all');
        setDefaultedParam(next, 'lastRun', lastRunFilter, 'all');
        next.delete('page');
        return next;
      }, { replace: true });
    }, 200);

    return () => window.clearTimeout(timeoutId);
  }, [lastRunFilter, searchInput, setSearchParams, statusFilter, targetFilter]);

  const openWorkloadRoute = useCallback(async (path: string, mode: 'append' | 'replaceAll' = 'replaceAll') => {
    if (!(await sdk.openWorkloadRoute(path, mode))) {
      navigate(path);
    }
  }, [navigate, sdk]);

  const displayedContracts = tier.toLowerCase() === 'enterprise' && workspaceScope === 'linked'
    ? federatedContracts
    : contracts;

  const filteredContracts = useMemo(
    () => filterContracts(displayedContracts, searchInput, statusFilter, targetFilter, lastRunFilter),
    [displayedContracts, lastRunFilter, searchInput, statusFilter, targetFilter],
  );
  const pageCount = Math.max(1, Math.ceil(filteredContracts.length / pageSize));
  const boundedPage = Math.min(currentPage, pageCount);
  const pagedContracts = useMemo(
    () => filteredContracts.slice((boundedPage - 1) * pageSize, boundedPage * pageSize),
    [boundedPage, filteredContracts],
  );
  const selectedContracts = useMemo(() => {
    const selected = new Set(Array.from(selectedItems).map(String));
    return displayedContracts.filter((contract) => selected.has(contract.id));
  }, [displayedContracts, selectedItems]);
  const filtersAreActive = searchInput.trim().length > 0 || statusFilter !== 'all' || targetFilter !== 'all' || lastRunFilter !== 'all';
  const bulkBusy = isBulkRunning || isBulkExporting;

  useEffect(() => {
    if (!loading && !federatedLoading) {
      setLiveMessage(`Loaded ${filteredContracts.length} of ${displayedContracts.length} contracts.`);
    }
  }, [displayedContracts.length, federatedLoading, filteredContracts.length, loading]);

  useEffect(() => {
    setSelectedItems((current) => {
      const visibleIds = new Set(displayedContracts.map((contract) => contract.id));
      const next = new Set(Array.from(current).filter((id) => visibleIds.has(String(id))));
      return next.size === current.size ? current : next;
    });
  }, [displayedContracts]);

  useEffect(() => {
    if (currentPage > pageCount) {
      setPage(pageCount, setSearchParams);
    }
  }, [currentPage, pageCount, setSearchParams]);

  const handleRunNow = useCallback(async (contractId: string) => {
    try {
      const run = await runNow(contractId);
      await sdk.notifySuccess('Run requested', 'The enforcement run was queued successfully.');
      if (tier.toLowerCase() === 'enterprise' && workspaceScope === 'linked') {
        const response = await opsClient.listFederatedContracts();
        setFederatedContracts(response.contracts);
      } else {
        await refresh();
      }
      await openWorkloadRoute(`/contracts/runs?contractId=${encodeURIComponent(contractId)}&runId=${encodeURIComponent(run.runId)}`, 'append');
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : 'Unable to queue the run.';
      await sdk.notifyError('Run failed', message);
    }
  }, [openWorkloadRoute, opsClient, refresh, runNow, sdk, tier, workspaceScope]);

  const handleBulkRun = useCallback(async () => {
    if (selectedContracts.length === 0) {
      return;
    }

    setIsBulkRunning(true);
    try {
      const results = await runWithConcurrency(selectedContracts, 3, (contract) => runClient.runNow(contract.id));
      const started = results.filter((result) => result.status === 'fulfilled').length;
      const failed = results.length - started;
      await sdk.notifySuccess('Bulk runs requested', `Started ${started} runs · ${failed} failed`);
      await refresh();
    } catch (bulkError) {
      const message = bulkError instanceof Error ? bulkError.message : 'Unable to start selected runs.';
      await sdk.notifyError('Bulk run failed', message);
    } finally {
      setIsBulkRunning(false);
    }
  }, [refresh, runClient, sdk, selectedContracts]);

  const handleBulkExport = useCallback(async () => {
    if (selectedContracts.length === 0) {
      return;
    }

    setIsBulkExporting(true);
    try {
      const details = await Promise.all(selectedContracts.map(async (contract) => ({
        contract,
        detail: await client.getContract(contract.id),
      })));
      const blob = await downloadZip(details.map(({ contract, detail }) => ({
        input: detail.odcsYaml,
        name: `${safeFileName(contract.name || contract.id)}.contract.yaml`,
      }))).blob();
      triggerDownload(blob, 'contracts-export.zip');
      await sdk.notifySuccess('Contracts exported', `Exported ${details.length} contract YAML files.`);
    } catch (exportError) {
      const message = exportError instanceof Error ? exportError.message : 'Unable to export selected contracts.';
      await sdk.notifyError('Export failed', message);
    } finally {
      setIsBulkExporting(false);
    }
  }, [client, sdk, selectedContracts]);

  const openTemplate = useCallback((yaml: string) => {
    sessionStorage.setItem('orqentis.contract.templateYaml', yaml);
    void openWorkloadRoute('/contracts/editor?template=1');
  }, [openWorkloadRoute]);

  const columns = useMemo(
    () =>
      [
        createTableColumn<ContractSummary>({
          columnId: 'name',
          compare: (left, right) => left.name.localeCompare(right.name),
          renderCell: (item) => (
            <FabricLink className={styles.link} to={`/contracts/${encodeURIComponent(item.id)}`}>
              {item.name}
            </FabricLink>
          ),
          renderHeaderCell: () => 'Name',
        }),
        createTableColumn<ContractSummary>({
          columnId: 'owner',
          compare: (left, right) => getOwner(left).localeCompare(getOwner(right)),
          renderCell: (item) => getOwner(item) || '—',
          renderHeaderCell: () => 'Owner',
        }),
        createTableColumn<ContractSummary>({
          columnId: 'targetType',
          compare: (left, right) => getTargetText(left).localeCompare(getTargetText(right)),
          renderCell: (item) => getTargetText(item),
          renderHeaderCell: () => 'Target',
        }),
        createTableColumn<ContractSummary>({
          columnId: 'status',
          compare: (left, right) => left.status.localeCompare(right.status),
          renderCell: (item) => <StatusBadge status={item.status} />,
          renderHeaderCell: () => 'Status',
        }),
        createTableColumn<ContractSummary>({
          columnId: 'lastRunStatus',
          compare: (left, right) => (left.lastRunStatus ?? '').localeCompare(right.lastRunStatus ?? ''),
          renderCell: (item) => (item.lastRunStatus ? <StatusBadge status={item.lastRunStatus} /> : <Body1>—</Body1>),
          renderHeaderCell: () => 'Last run status',
        }),
        createTableColumn<ContractSummary>({
          columnId: 'breachScore',
          compare: (left, right) => (getBreachScore(left) ?? -1) - (getBreachScore(right) ?? -1),
          renderCell: (item) => <BreachScoreBadge score={getBreachScore(item)} />,
          renderHeaderCell: () => 'Breach score',
        }),
        createTableColumn<ContractSummary>({
          columnId: 'lastRun',
          compare: (left, right) => getDateTime(left.lastRunAt) - getDateTime(right.lastRunAt),
          renderCell: (item) => {
            if (!item.lastRunAt) {
              return <Body1>—</Body1>;
            }

            const contractId = item.contractId ?? item.id;
            const runId = item.lastRunId ?? '';
            const runPath = `/contracts/runs?contractId=${encodeURIComponent(contractId)}&runId=${encodeURIComponent(runId)}`;

            return (
              <FabricLink
                aria-label={`View last enforcement run for ${item.name}, status ${item.lastRunStatus ?? 'unknown'}`}
                className={styles.link}
                mode="append"
                to={runPath}
              >
                {formatRelative(item.lastRunAt)}
              </FabricLink>
            );
          },
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
              <Button
                appearance="subtle"
                onClick={() => {
                  void openWorkloadRoute(`/contracts/${item.id}/edit`);
                }}
              >
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
    [handleRunNow, openWorkloadRoute, styles.link, styles.rowActions],
  );



  return (
    <section className={styles.root}>
      <div className={styles.header}>
        <div>
          <Title3>Contract library</Title3>
          <Caption1 className={styles.subtitle}>Author, version, and run data contracts across your workspace.</Caption1>
        </div>
        <div className={styles.actions}>
          {tier.toLowerCase() === 'enterprise' ? (
            <Field label="Workspace scope">
              <Dropdown
                selectedOptions={[workspaceScope]}
                value={workspaceScope === 'linked' ? 'Current + linked workspaces' : 'Current workspace'}
                onOptionSelect={(_, data) => setWorkspaceScope((data.optionValue as 'current' | 'linked') ?? 'current')}
              >
                <Option value="current">Current workspace</Option>
                <Option value="linked">Current + linked workspaces</Option>
              </Dropdown>
            </Field>
          ) : null}
          <Button
            appearance="secondary"
            icon={<ArrowClockwiseRegular />}
            onClick={() => {
              if (tier.toLowerCase() === 'enterprise' && workspaceScope === 'linked') {
                void opsClient.listFederatedContracts().then((response) => setFederatedContracts(response.contracts));
              } else {
                void refresh();
              }
            }}
          >
            Refresh
          </Button>
          <Button
            appearance="primary"
            icon={<AddRegular />}
            onClick={() => {
              void openWorkloadRoute('/contracts/editor');
            }}
          >
            Create contract
          </Button>
        </div>
      </div>

      <VisuallyHidden liveRegion>{liveMessage}</VisuallyHidden>

      <div className={styles.surface}>
        {loading || federatedLoading ? <Spinner label="Loading contracts…" /> : null}
        {error ? <Body1>{error}</Body1> : null}
        {!loading && !federatedLoading && displayedContracts.length === 0 ? (
          sdk.isReady ? (
            <div>
              <Title3 as="h2">Author your first contract</Title3>
              <div className={styles.onboarding}>
                <Card className={styles.onboardingCard}>
                  <Subtitle2>From a Fabric table</Subtitle2>
                  <Body1>Choose a Lakehouse or Warehouse target, then start with picker-driven metadata.</Body1>
                  <Button appearance="primary" onClick={() => { void openWorkloadRoute('/contracts/editor?targetType=lakehouse'); }}>Start from table</Button>
                </Card>
                <Card className={styles.onboardingCard}>
                  <Subtitle2>From a description (AI)</Subtitle2>
                  <Body1>Describe the data product and let Orqentis draft the ODCS YAML.</Body1>
                  <Button onClick={() => { void openWorkloadRoute('/contracts/ai-suggest'); }}>Open AI Suggest</Button>
                </Card>
                <Card className={styles.onboardingCard}>
                  <Subtitle2>From a template</Subtitle2>
                  <Body1>Pick a ready-made YAML contract and customize it in the editor.</Body1>
                  <TemplateDialog openTemplate={(yaml) => openTemplate(yaml)} />
                </Card>
              </div>
            </div>
          ) : (
            <EmptyState
              actionIcon={<AddRegular />}
              actionLabel="Create contract"
              description="Define an ODCS contract to start enforcing data quality at the Delta table layer."
              icon={<DocumentBulletListRegular />}
              title="No contracts yet"
              onAction={() => {
                void openWorkloadRoute('/contracts/editor');
              }}
            />
          )
        ) : null}

        {!loading && !federatedLoading && displayedContracts.length > 0 ? (
          <>
            <div className={styles.filters}>
              <Field label="Search contracts">
                <SearchBox
                  aria-label="Search contracts"
                  placeholder="Search name, owner, target, or id"
                  value={searchInput}
                  onChange={(_, data) => setSearchInput(data.value)}
                />
              </Field>
              <Field label="Status">
                <Dropdown
                  selectedOptions={[statusFilter]}
                  value={toFilterLabel(statusFilter)}
                  onOptionSelect={(_, data) => setStatusFilter(parseFilter(data.optionValue, statusFilters, 'all'))}
                >
                  <Option value="all">All statuses</Option>
                  <Option value="active">Active</Option>
                  <Option value="draft">Draft</Option>
                  <Option value="deprecated">Deprecated</Option>
                </Dropdown>
              </Field>
              <Field label="Target type">
                <Dropdown
                  selectedOptions={[targetFilter]}
                  value={targetFilter === 'delta' ? 'Delta' : 'All targets'}
                  onOptionSelect={(_, data) => setTargetFilter(parseFilter(data.optionValue, targetFilters, 'all'))}
                >
                  <Option value="all">All targets</Option>
                  <Option value="delta">Delta</Option>
                </Dropdown>
              </Field>
              <Field label="Last run status">
                <Dropdown
                  selectedOptions={[lastRunFilter]}
                  value={toFilterLabel(lastRunFilter)}
                  onOptionSelect={(_, data) => setLastRunFilter(parseFilter(data.optionValue, lastRunFilters, 'all'))}
                >
                  <Option value="all">All run statuses</Option>
                  <Option value="passed">Passed</Option>
                  <Option value="failed">Failed</Option>
                  <Option value="warned">Warned</Option>
                  <Option value="error">Error</Option>
                </Dropdown>
              </Field>
              <Caption1 className={styles.resultCount}>Showing {filteredContracts.length} of {displayedContracts.length} contracts</Caption1>
            </div>

            {selectedContracts.length > 0 ? (
              <div className={styles.bulkBar}>
                <Body1>{selectedContracts.length} selected</Body1>
                <div className={styles.bulkActions}>
                  <Button disabled={bulkBusy} appearance="primary" onClick={() => { void handleBulkRun(); }}>Run all</Button>
                  <Button disabled={bulkBusy} onClick={() => { void handleBulkExport(); }}>Export YAML</Button>
                  <Button disabled={bulkBusy} appearance="subtle" onClick={() => setSelectedItems(new Set())}>Clear</Button>
                </div>
              </div>
            ) : null}

            {filteredContracts.length === 0 ? (
              <EmptyState
                actionLabel="Clear filters"
                description="Broaden the search or reset filters to see more contracts."
                icon={<DocumentBulletListRegular />}
                title="No contracts match your filters"
                onAction={() => clearFilters(setSearchInput, setStatusFilter, setTargetFilter, setLastRunFilter, setSearchParams)}
              />
            ) : (
              <>
                <DataGrid
                  sortable
                  columns={columns}
                  getRowId={(item) => item.id}
                  items={pagedContracts}
                  selectedItems={selectedItems}
                  selectionMode="multiselect"
                  onSelectionChange={(_, data) => setSelectedItems(new Set(data.selectedItems))}
                >
                  <DataGridHeader>
                    <DataGridRow selectionCell={{ checkboxIndicator: { 'aria-label': 'Select all contracts' } }}>
                      {({ renderHeaderCell }) => (
                        <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                      )}
                    </DataGridRow>
                  </DataGridHeader>
                  <DataGridBody<ContractSummary>>
                    {({ item, rowId }) => (
                      <DataGridRow<ContractSummary>
                        key={rowId}
                        selectionCell={{ checkboxIndicator: { 'aria-label': `Select ${item.name}` } }}
                      >
                        {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                      </DataGridRow>
                    )}
                  </DataGridBody>
                </DataGrid>
                {pageCount > 1 ? (
                  <div className={styles.pagination} aria-label="Contract list pagination">
                    <Button
                      aria-label="Previous page"
                      disabled={boundedPage === 1}
                      icon={<ChevronLeftRegular />}
                      onClick={() => setPage(boundedPage - 1, setSearchParams)}
                    />
                    {getPageButtons(boundedPage, pageCount).map((page) => (
                      <Button
                        key={page}
                        appearance={page === boundedPage ? 'primary' : 'secondary'}
                        aria-current={page === boundedPage ? 'page' : undefined}
                        onClick={() => setPage(page, setSearchParams)}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      aria-label="Next page"
                      disabled={boundedPage === pageCount}
                      icon={<ChevronRightRegular />}
                      onClick={() => setPage(boundedPage + 1, setSearchParams)}
                    />
                  </div>
                ) : null}
              </>
            )}
            {filtersAreActive ? null : null}
          </>
        ) : null}
      </div>
    </section>
  );
}

function TemplateDialog({ openTemplate }: { openTemplate: (yaml: string) => void }) {
  return (
    <Dialog>
      <DialogTrigger disableButtonEnhancement>
        <Button>Browse templates</Button>
      </DialogTrigger>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Choose contract template</DialogTitle>
          <DialogContent>
            <div style={{ display: 'grid', gap: tokens.spacingVerticalS }}>
              {aiDescriptionTemplates.slice(0, 6).map((template) => (
                <Button key={template.id} appearance="secondary" onClick={() => openTemplate(template.yaml)}>
                  {template.label}
                </Button>
              ))}
            </div>
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary">Close</Button>
            </DialogTrigger>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

function filterContracts(
  contracts: ContractSummary[],
  searchValue: string,
  statusFilter: StatusFilter,
  targetFilter: TargetFilter,
  lastRunFilter: LastRunFilter,
) {
  const query = searchValue.trim().toLowerCase();

  return contracts.filter((contract) => {
    const matchesSearch = query.length === 0 || [contract.name, getOwner(contract), getTargetText(contract), contract.id, contract.contractId ?? '']
      .some((value) => value.toLowerCase().includes(query));
    const matchesStatus = statusFilter === 'all' || contract.status.toLowerCase() === statusFilter;
    const matchesTarget = targetFilter === 'all' || contract.targetType === 'lakehouse' || getTargetText(contract).toLowerCase().includes('delta');
    const matchesLastRun = lastRunFilter === 'all' || contract.lastRunStatus?.toLowerCase() === lastRunFilter;

    return matchesSearch && matchesStatus && matchesTarget && matchesLastRun;
  });
}

function getOwner(contract: ContractSummary) {
  return contract.ownerEmail ?? contract.owner ?? '';
}

function getTargetText(contract: ContractSummary) {
  return contract.targetTablePath ?? getContractTargetTypeLabel(contract.targetType ?? 'lakehouse');
}

function getBreachScore(contract: ContractSummary) {
  return contract.breachScore ?? contract.lastRunBreachScore ?? null;
}

function BreachScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return <Body1>—</Body1>;
  }

  return (
    <Badge appearance="tint" color={score >= 80 ? 'danger' : score >= 50 ? 'warning' : 'success'}>
      {score}
    </Badge>
  );
}

function getDateTime(value: string | null | undefined) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}


function parseFilter<T extends string>(value: string | null | undefined, allowed: readonly T[], fallback: T) {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function toFilterLabel(value: string) {
  if (value === 'all') return 'All';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function setDefaultedParam(params: URLSearchParams, key: string, value: string, defaultValue: string) {
  if (!value || value === defaultValue) {
    params.delete(key);
  } else {
    params.set(key, value);
  }
}

function setPage(page: number, setSearchParams: ReturnType<typeof useSearchParams>[1]) {
  setSearchParams((current) => {
    const next = new URLSearchParams(current);
    if (page <= 1) {
      next.delete('page');
    } else {
      next.set('page', String(page));
    }
    return next;
  });
}

function getPageButtons(currentPage: number, pageCount: number) {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(pageCount, currentPage + 2);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function clearFilters(
  setSearchInput: (value: string) => void,
  setStatusFilter: (value: StatusFilter) => void,
  setTargetFilter: (value: TargetFilter) => void,
  setLastRunFilter: (value: LastRunFilter) => void,
  setSearchParams: ReturnType<typeof useSearchParams>[1],
) {
  setSearchInput('');
  setStatusFilter('all');
  setTargetFilter('all');
  setLastRunFilter('all');
  setSearchParams((current) => {
    const next = new URLSearchParams(current);
    next.delete('q');
    next.delete('status');
    next.delete('target');
    next.delete('lastRun');
    next.delete('page');
    return next;
  }, { replace: true });
}

async function runWithConcurrency<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>) {
  const results: Array<PromiseSettledResult<R>> = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = { status: 'fulfilled', value: await task(items[index]) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function safeFileName(value: string) {
  return value.trim().replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'contract';
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default ContractListPage;
