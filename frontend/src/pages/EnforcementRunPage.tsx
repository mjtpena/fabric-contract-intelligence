import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Body1,
  Breadcrumb,
  BreadcrumbButton,
  BreadcrumbDivider,
  BreadcrumbItem,
  Button,
  Caption1,
  Card,
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
  Subtitle2Stronger,
  Tab,
  TabList,
  createTableColumn,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { ArrowClockwiseRegular, ArrowDownloadRegular, ArrowLeftRegular, CopyRegular, LinkRegular, PlayRegular } from '@fluentui/react-icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { createContractClient } from '@/api/contractClient';
import { createOpsClient } from '@/api/opsClient';
import { createRunClient } from '@/api/runClient';
import { BreachScoreGauge } from '@/components/RunResult/BreachScoreGauge';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBanner } from '@/components/ErrorBanner';
import { ItemEditor, type RibbonAction } from '@/components/ItemEditor/ItemEditor';
import { RuleResultsTable } from '@/components/RunResult/RuleResultsTable';
import { SchemaDiffViewer } from '@/components/RunResult/SchemaDiffViewer';
import { StatusBadge } from '@/components/StatusBadge';
import { VisuallyHidden } from '@/components/VisuallyHidden';
import { useContract } from '@/hooks/useContract';
import { useEnforcementRun } from '@/hooks/useEnforcementRun';
import { useFabricSdk } from '@/hooks/useFabricSdk';
import { formatDateTime } from '@/lib/formatDate';
import type { RuleResult, RunDetail, RunSummary, SchemaDiff } from '@/models/enforcement';
import type { ReportAuditRow } from '@/models/ops';

type RunTab = 'schema-rules' | 'quality-rules' | 'freshness' | 'schema-diff' | 'remediation';

interface PersistedReportState {
  contractId: string | null;
  runId: string | null;
}

const noop = () => undefined;

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    height: '100%',
    boxSizing: 'border-box',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalL,
    flexWrap: 'wrap',
  },
  headerActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'center',
  },
  titleRow: {
    alignItems: 'center',
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
  },
  subtitle: {
    display: 'block',
    color: tokens.colorNeutralForeground3,
    marginTop: tokens.spacingVerticalXS,
  },
  summary: {
    display: 'grid',
    gap: tokens.spacingHorizontalL,
    gridTemplateColumns: 'minmax(18rem, 1.4fr) minmax(16rem, 1fr)',
  },
  heroCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  metricsStrip: {
    display: 'grid',
    gap: tokens.spacingVerticalM,
    gridTemplateColumns: 'repeat(auto-fit, minmax(8rem, 1fr))',
  },
  metricItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  scoreDelta: {
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  tabCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  historyActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
  },
  inlineGrid: {
    display: 'grid',
    gap: tokens.spacingHorizontalL,
    gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))',
  },
  checklist: {
    display: 'grid',
    gap: tokens.spacingVerticalS,
    margin: 0,
    paddingLeft: tokens.spacingHorizontalL,
  },
  diffSummaryList: {
    margin: 0,
    paddingLeft: tokens.spacingHorizontalL,
  },
  emptyState: {
    padding: tokens.spacingHorizontalXXL,
    backgroundColor: tokens.colorNeutralBackground2,
  },
});

export function EnforcementRunPage() {
  const styles = useStyles();
  const navigate = useNavigate();
  const { id: routeContractId, itemObjectId, runId: routeRunId } = useParams();
  const [searchParams] = useSearchParams();
  const sdk = useFabricSdk();
  const [selectedTab, setSelectedTab] = useState<RunTab>('schema-rules');
  const [leftVersionId, setLeftVersionId] = useState<string>('');
  const [rightVersionId, setRightVersionId] = useState<string>('');
  const [persistedReportState, setPersistedReportState] = useState<PersistedReportState | null>(null);
  const [itemDefinitionLoaded, setItemDefinitionLoaded] = useState(false);
  const [auditRows, setAuditRows] = useState<ReportAuditRow[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState('');
  const [secondaryActionInFlight, setSecondaryActionInFlight] = useState(false);

  const requestedContractId = routeContractId ?? searchParams.get('contractId') ?? persistedReportState?.contractId ?? null;
  const requestedRunId = routeRunId ?? searchParams.get('runId') ?? persistedReportState?.runId ?? null;
  const compareRequested = searchParams.get('compare') === '1';
  const requestedLeftVersion = searchParams.get('left');
  const requestedRightVersion = searchParams.get('right');

  const contractClient = useMemo(
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

  const { clearError = noop, error, isPollingPaused, loading, refresh, resumePolling, run, runs } = useEnforcementRun(
    runClient,
    requestedContractId,
    requestedRunId,
  );
  const resolvedContractId = requestedContractId ?? run?.contractId ?? null;
  const { contract, versions } = useContract(contractClient, resolvedContractId);

  const openWorkloadRoute = useCallback(async (path: string, mode: 'append' | 'replaceAll' = 'replaceAll') => {
    if (!(await sdk.openWorkloadRoute(path, mode))) {
      navigate(path);
    }
  }, [navigate, sdk]);

  const sortedVersions = useMemo(
    () =>
      [...versions].sort(
        (left, right) =>
          new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
      ),
    [versions],
  );

  useEffect(() => {
    if (sortedVersions.length === 0) {
      setLeftVersionId('');
      setRightVersionId('');
      return;
    }

    const leftVersionFromQuery = requestedLeftVersion
      ? sortedVersions.find((version) => version.version === requestedLeftVersion)?.id
      : null;
    const rightVersionFromQuery = requestedRightVersion
      ? sortedVersions.find((version) => version.version === requestedRightVersion)?.id
      : null;

    setLeftVersionId((current) => {
      if (leftVersionFromQuery) {
        return leftVersionFromQuery;
      }

      if (current && sortedVersions.some((version) => version.id === current)) {
        return current;
      }

      return sortedVersions[Math.max(0, sortedVersions.length - 2)]?.id ?? sortedVersions[0].id;
    });

    setRightVersionId((current) => {
      if (rightVersionFromQuery) {
        return rightVersionFromQuery;
      }

      if (current && sortedVersions.some((version) => version.id === current)) {
        return current;
      }

      return sortedVersions[sortedVersions.length - 1].id;
    });
  }, [requestedLeftVersion, requestedRightVersion, sortedVersions]);

  useEffect(() => {
    if (compareRequested) {
      setSelectedTab('schema-diff');
    }
  }, [compareRequested]);

  useEffect(() => {
    clearError();
  }, [clearError, requestedRunId]);

  useEffect(() => {
    if (run) {
      setLiveMessage(`Run ${run.id.slice(0, 8)} is ${run.status}.`);
    }
  }, [run]);

  const selectedLeftVersion = sortedVersions.find((version) => version.id === leftVersionId) ?? null;
  const selectedRightVersion = sortedVersions.find((version) => version.id === rightVersionId) ?? null;
  const versionLookup = useMemo(
    () => new Map(versions.map((version) => [version.id, version.version])),
    [versions],
  );

  useEffect(() => {
    let cancelled = false;

    if (!itemObjectId) {
      setItemDefinitionLoaded(true);
      return;
    }

    setItemDefinitionLoaded(false);
    void sdk.loadItemDefinition(itemObjectId)
      .then((persisted) => {
        if (cancelled) {
          return;
        }

        setPersistedReportState(persisted ? parsePersistedReportState(persisted) : null);
        setItemDefinitionLoaded(true);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setPersistedReportState(null);
        setItemDefinitionLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [itemObjectId, sdk.loadItemDefinition]);

  useEffect(() => {
    let cancelled = false;

    if (requestedRunId || !itemDefinitionLoaded) {
      return;
    }

    setAuditLoading(true);
    setAuditError(null);
    void opsClient.listAuditRows()
      .then((rows) => {
        if (!cancelled) {
          setAuditRows(rows);
        }
      })
      .catch((auditListError) => {
        if (!cancelled) {
          setAuditRows([]);
          setAuditError(auditListError instanceof Error ? auditListError.message : 'Unable to load report audit rows.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAuditLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [itemDefinitionLoaded, opsClient, requestedRunId]);

  const runSecondaryAction = useCallback(async (action: () => Promise<void>) => {
    setSecondaryActionInFlight(true);
    try {
      await action();
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : 'The run action could not be completed.';
      await sdk.notifyError('Run action failed', message);
    } finally {
      setSecondaryActionInFlight(false);
    }
  }, [sdk]);

  const copyText = useCallback(async (value: string) => {
    await navigator.clipboard.writeText(value);
  }, []);

  const openAuditRow = async (row: ReportAuditRow) => {
    if (itemObjectId) {
      const persistedState: PersistedReportState = {
        contractId: row.contractId,
        runId: row.runId,
      };

      try {
        await sdk.saveItemDefinition(itemObjectId, JSON.stringify(persistedState));
      } catch {
        await sdk.notifyInfo('Report item not synced', 'The run can be opened, but Fabric item metadata could not be updated.');
      }
    }

    await openWorkloadRoute(buildRunLink(row.contractId, row.runId), 'append');
  };

  const historyColumns = useMemo(
    () => [
      createTableColumn<RunSummary>({
        columnId: 'status',
        renderCell: (item) => <StatusBadge status={item.status} />,
        renderHeaderCell: () => 'Status',
      }),
      createTableColumn<RunSummary>({
        columnId: 'version',
        renderCell: (item) => versionLookup.get(item.versionId) ?? item.versionId,
        renderHeaderCell: () => 'Contract version',
      }),
      createTableColumn<RunSummary>({
        columnId: 'triggeredAt',
        renderCell: (item) => formatDateTime(item.triggeredAt),
        renderHeaderCell: () => 'Triggered',
      }),
      createTableColumn<RunSummary>({
        columnId: 'actions',
        renderCell: (item) => (
          <div className={styles.historyActions}>
            <Button
              appearance="subtle"
              onClick={() => {
                void openWorkloadRoute(buildRunLink(item.contractId, item.id), 'append');
              }}
            >
              Open
            </Button>
          </div>
        ),
        renderHeaderCell: () => 'Actions',
      }),
    ],
    [openWorkloadRoute, styles.historyActions, versionLookup],
  );

  if ((itemObjectId && !itemDefinitionLoaded) || (loading && !run)) {
    return (
      <ItemEditor title="Enforcement run" homeToolbarActions={[]}>
        <div className={styles.root}>
          <VisuallyHidden liveRegion>{liveMessage}</VisuallyHidden>
          <Spinner label="Loading enforcement run…" />
        </div>
      </ItemEditor>
    );
  }

  if (!run) {
    return (
      <ItemEditor
        title="Contract reports"
        subtitle="Review enforcement history and open the breached runs that need attention."
        homeToolbarActions={[]}
      >
        <div className={styles.root}>
          <VisuallyHidden liveRegion>{liveMessage}</VisuallyHidden>
          <ReportItemDashboard
            auditError={auditError ?? error}
            auditLoading={auditLoading}
            rows={auditRows}
            styles={styles}
            onOpenRun={(row) => {
              void openAuditRow(row);
            }}
          />
        </div>
      </ItemEditor>
    );
  }

  const remediationSuggestions = resolveRemediationSuggestions(run);
  const displayBreachScore = resolveDisplayBreachScore(run);
  const previousRun = runs
    .filter((candidate) => candidate.id !== run.id && new Date(candidate.triggeredAt).getTime() <= new Date(run.triggeredAt).getTime())
    .sort((left, right) => new Date(right.triggeredAt).getTime() - new Date(left.triggeredAt).getTime())[0];
  const previousScore = resolveSummaryBreachScore(previousRun);
  const breachDelta = displayBreachScore != null && previousScore != null
    ? formatBreachDelta(displayBreachScore - previousScore)
    : null;

  const homeToolbarActions: RibbonAction[] = useMemo(() => {
    const actions: RibbonAction[] = [];
    if (resolvedContractId) {
      actions.push({
        key: 'back',
        label: 'Back to contract',
        icon: <ArrowLeftRegular />,
        onClick: () => { void openWorkloadRoute(`/contracts/${resolvedContractId}/edit`); },
      });
    }
    actions.push({
      key: 'refresh',
      label: 'Refresh',
      icon: <ArrowClockwiseRegular />,
      onClick: () => { void refresh(); },
    });
    if (isPollingPaused) {
      actions.push({
        key: 'resume-polling',
        label: 'Resume polling',
        icon: <ArrowClockwiseRegular />,
        appearance: 'primary',
        onClick: () => { void resumePolling(); },
      });
    }
    if (resolvedContractId) {
      actions.push({
        key: 'run-again',
        label: 'Run again',
        icon: <PlayRegular />,
        appearance: 'primary',
        disabled: secondaryActionInFlight,
        onClick: () => {
          void runSecondaryAction(async () => {
            if (!resolvedContractId) return;
            const nextRun = await runClient.runNow(resolvedContractId);
            await sdk.notifySuccess('Run requested', 'The enforcement run was queued successfully.');
            await openWorkloadRoute(buildRunLink(resolvedContractId, nextRun.runId), 'append');
          });
        },
      });
    }
    if (run) {
      actions.push({
        key: 'download',
        label: 'Download',
        icon: <ArrowDownloadRegular />,
        tooltip: 'Download run result JSON',
        disabled: secondaryActionInFlight,
        onClick: () => {
          void runSecondaryAction(async () => {
            downloadJson(run, `run-${run.id}.json`);
            await sdk.notifySuccess('Downloaded', 'Run result JSON download started.');
          });
        },
      });
      actions.push({
        key: 'copy-link',
        label: 'Copy link',
        icon: <LinkRegular />,
        tooltip: 'Copy shareable link',
        disabled: secondaryActionInFlight,
        onClick: () => {
          void runSecondaryAction(async () => {
            await copyText(window.location.href);
            await sdk.notifySuccess('Copied', 'Shareable link copied to clipboard.');
          });
        },
      });
      actions.push({
        key: 'copy-correlation',
        label: 'Copy correlation ID',
        icon: <CopyRegular />,
        disabled: secondaryActionInFlight || !run.correlationId,
        onClick: () => {
          void runSecondaryAction(async () => {
            await copyText(run.correlationId);
            await sdk.notifySuccess('Copied', 'Correlation ID copied to clipboard.');
          });
        },
      });
    }
    return actions;
  }, [isPollingPaused, openWorkloadRoute, refresh, resolvedContractId, resumePolling, run, runClient, runSecondaryAction, sdk, secondaryActionInFlight]);

  return (
    <ItemEditor
      title={contract?.name ?? 'Enforcement run'}
      subtitle={contract?.targetTablePath ?? 'Review failed rules and remediation guidance for this run.'}
      homeToolbarActions={homeToolbarActions}
      statusSlot={<StatusBadge status={run.status} />}
    >
      <div className={styles.root}>
      <VisuallyHidden liveRegion>{liveMessage}</VisuallyHidden>
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbButton onClick={() => { void openWorkloadRoute('/contracts'); }}>Contracts</BreadcrumbButton>
        </BreadcrumbItem>
        <BreadcrumbDivider />
        {resolvedContractId && contract ? (
          <>
            <BreadcrumbItem>
              <BreadcrumbButton onClick={() => { void openWorkloadRoute(`/contracts/${resolvedContractId}/edit`); }}>
                {contract.name}
              </BreadcrumbButton>
            </BreadcrumbItem>
            <BreadcrumbDivider />
          </>
        ) : null}
        <BreadcrumbItem>
          <BreadcrumbButton current>Run {run.id.slice(0, 8)}</BreadcrumbButton>
        </BreadcrumbItem>
      </Breadcrumb>

      {error ? <ErrorBanner message={error} /> : null}

      <div className={styles.summary}>
        <Card className={styles.heroCard}>
          <BreachScoreGauge score={displayBreachScore} />
          {breachDelta ? <Caption1 className={styles.scoreDelta}>{breachDelta}</Caption1> : null}
        </Card>

        <Card className={styles.metricsStrip}>
          <div className={styles.metricItem}>
            <Caption1>Status</Caption1>
            <StatusBadge status={run.status} />
            <Body1>Overall: {run.resultJson.overallStatus}</Body1>
          </div>
          <div className={styles.metricItem}>
            <Caption1>Started</Caption1>
            <Body1>{formatDateTime(run.triggeredAt)}</Body1>
          </div>
          <div className={styles.metricItem}>
            <Caption1>Duration</Caption1>
            <Body1>{formatDuration(run.triggeredAt, run.completedAt)}</Body1>
          </div>
          <div className={styles.metricItem}>
            <Caption1>Mode</Caption1>
            <Body1>{formatRunMode(run.triggeredBy)}</Body1>
          </div>
        </Card>
      </div>

      <Card className={styles.card}>
        <Subtitle2Stronger>Run history</Subtitle2Stronger>
        {runs.length === 0 ? (
          <EmptyState
            description="No persisted runs were returned for this contract."
            title="No runs yet"
          />
        ) : (
          <DataGrid items={runs} columns={historyColumns}>
            <DataGridHeader>
              <DataGridRow>
                {({ renderHeaderCell }) => (
                  <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                )}
              </DataGridRow>
            </DataGridHeader>
            <DataGridBody<RunSummary>>
              {({ item, rowId }) => (
                <DataGridRow<RunSummary> key={rowId}>
                  {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                </DataGridRow>
              )}
            </DataGridBody>
          </DataGrid>
        )}
      </Card>

      <Card className={styles.tabCard}>
        <TabList
          selectedValue={selectedTab}
          onTabSelect={(_, data) => setSelectedTab(data.value as RunTab)}
        >
          <Tab value="schema-rules">Schema Rules</Tab>
          <Tab value="quality-rules">Quality Rules</Tab>
          <Tab value="freshness">Freshness</Tab>
          <Tab value="schema-diff">Schema Diff</Tab>
          <Tab value="remediation">Remediation</Tab>
        </TabList>

        {selectedTab === 'schema-rules' ? (
          <RuleResultsTable
            emptyMessage="This run did not return schema-rule results."
            rules={run.resultJson.schemaRules}
          />
        ) : null}

        {selectedTab === 'quality-rules' ? (
          <RuleResultsTable
            emptyMessage="Quality-rule data will populate once the contract includes quality rules."
            rules={run.resultJson.qualityRules}
          />
        ) : null}

        {selectedTab === 'freshness' ? (
          run.resultJson.freshnessRule ? (
            <RuleResultsTable
              emptyMessage="No freshness rule was configured for this run."
              rules={[run.resultJson.freshnessRule]}
            />
          ) : (
            <EmptyState
              description="No freshness rule was returned for this run."
              title="No freshness data"
            />
          )
        ) : null}

        {selectedTab === 'schema-diff' ? (
          <>
            <div className={styles.inlineGrid}>
              <Field label="Compare left version">
                <Dropdown
                  selectedOptions={selectedLeftVersion ? [selectedLeftVersion.id] : []}
                  value={selectedLeftVersion?.version ?? 'Select version'}
                  onOptionSelect={(_, data) => setLeftVersionId(data.optionValue ?? '')}
                >
                  {sortedVersions.map((version) => (
                    <Option key={version.id} value={version.id}>
                      {version.version}
                    </Option>
                  ))}
                </Dropdown>
              </Field>
              <Field label="Compare right version">
                <Dropdown
                  selectedOptions={selectedRightVersion ? [selectedRightVersion.id] : []}
                  value={selectedRightVersion?.version ?? 'Select version'}
                  onOptionSelect={(_, data) => setRightVersionId(data.optionValue ?? '')}
                >
                  {sortedVersions.map((version) => (
                    <Option key={version.id} value={version.id}>
                      {version.version}
                    </Option>
                  ))}
                </Dropdown>
              </Field>
            </div>

            <SchemaDiffSummary schemaDiff={run.resultJson.schemaDiff} schemaRules={run.resultJson.schemaRules} />

            {selectedLeftVersion && selectedRightVersion ? (
              <SchemaDiffViewer
                modifiedYaml={selectedRightVersion?.odcsYaml ?? ''}
                originalYaml={selectedLeftVersion?.odcsYaml ?? ''}
                themeMode={sdk.themeMode}
              />
            ) : (
              <EmptyState
                description="Select two contract versions to compare their YAML side by side."
                title="Choose versions to compare"
              />
            )}
          </>
        ) : null}

        {selectedTab === 'remediation' ? (
          <>
            {remediationSuggestions.length > 0 ? (
              <ul className={styles.checklist}>
                {remediationSuggestions.map((suggestion, index) => (
                  <li key={`${suggestion}-${index}`}>
                    <Body1>{suggestion}</Body1>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                description="No remediation is needed for this run."
                title="All clear"
              />
            )}
            {run.resultJson.errorMessage ? (
              <Card className={styles.card}>
                <Caption1>Run error</Caption1>
                <Body1>{run.resultJson.errorMessage}</Body1>
              </Card>
            ) : null}
          </>
        ) : null}
      </Card>
      </div>
    </ItemEditor>
  );
}

interface ReportItemDashboardProps {
  auditError: string | null;
  auditLoading: boolean;
  rows: ReportAuditRow[];
  styles: ReturnType<typeof useStyles>;
  onOpenRun: (row: ReportAuditRow) => void;
}

function ReportItemDashboard({
  auditError,
  auditLoading,
  rows,
  onOpenRun,
}: ReportItemDashboardProps) {
  const columns = useMemo(
    () => [
      createTableColumn<ReportAuditRow>({
        columnId: 'contract',
        renderCell: (row) => row.contractName,
        renderHeaderCell: () => 'Contract',
      }),
      createTableColumn<ReportAuditRow>({
        columnId: 'status',
        renderCell: (row) => <StatusBadge status={row.status} />,
        renderHeaderCell: () => 'Status',
      }),
      createTableColumn<ReportAuditRow>({
        columnId: 'score',
        renderCell: (row) => (row.breachScore != null ? row.breachScore.toFixed(2) : '—'),
        renderHeaderCell: () => 'Breach score',
      }),
      createTableColumn<ReportAuditRow>({
        columnId: 'triggeredAt',
        renderCell: (row) => formatDateTime(row.triggeredAt),
        renderHeaderCell: () => 'Triggered',
      }),
      createTableColumn<ReportAuditRow>({
        columnId: 'actions',
        renderCell: (row) => (
          <Button appearance="subtle" onClick={() => onOpenRun(row)}>
            Open
          </Button>
        ),
        renderHeaderCell: () => 'Actions',
      }),
    ],
    [onOpenRun],
  );

  return (
    <>
      {auditError ? <ErrorBanner message={auditError} /> : null}

      {auditLoading ? (
        <Spinner label="Loading contract reports…" />
      ) : rows.length === 0 ? (
        <EmptyState
          description="No enforcement reports have been recorded for this workspace yet."
          title="No reports yet"
        />
      ) : (
        <DataGrid items={rows} columns={columns}>
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
    </>
  );
}

interface SchemaDiffSummaryProps {
  schemaDiff: SchemaDiff | undefined;
  schemaRules: RuleResult[];
}

function SchemaDiffSummary({ schemaDiff, schemaRules }: SchemaDiffSummaryProps) {
  const styles = useStyles();

  if (!schemaDiff) {
    const driftRules = schemaRules.filter((rule) => rule.status === 'failed' || rule.status === 'warned');

    if (driftRules.length === 0) {
      return <Body1>No schema drift was detected for this run.</Body1>;
    }

    return (
      <Card className={styles.card}>
        <Caption1>Schema drift from rule results</Caption1>
        <ul className={styles.diffSummaryList}>
          {driftRules.map((rule) => (
            <li key={`${rule.ruleId}-${rule.column ?? 'table'}-${rule.message}`}>
              <Body1>
                {rule.column ? `${rule.column}: ` : ''}
                {rule.message}
                {formatExpectedActual(rule)}
              </Body1>
            </li>
          ))}
        </ul>
      </Card>
    );
  }

  return (
    <div className={styles.inlineGrid}>
      <Card className={styles.card}>
        <Caption1>Added columns</Caption1>
        <Body1>{schemaDiff.addedColumns.length > 0 ? schemaDiff.addedColumns.join(', ') : 'None'}</Body1>
      </Card>
      <Card className={styles.card}>
        <Caption1>Removed columns</Caption1>
        <Body1>{schemaDiff.removedColumns.length > 0 ? schemaDiff.removedColumns.join(', ') : 'None'}</Body1>
      </Card>
      <Card className={styles.card}>
        <Caption1>Type changes</Caption1>
        {schemaDiff.typeChanges.length > 0 ? (
          <ul className={styles.diffSummaryList}>
            {schemaDiff.typeChanges.map((change) => (
              <li key={`${change.column}-${change.expectedType}-${change.actualType}`}>
                <Body1>
                  {change.column}: {change.expectedType} → {change.actualType}
                </Body1>
              </li>
            ))}
          </ul>
        ) : (
          <Body1>None</Body1>
        )}
      </Card>
      <Card className={styles.card}>
        <Caption1>Nullability / partitions</Caption1>
        {schemaDiff.nullabilityChanges.length > 0 ? (
          <ul className={styles.diffSummaryList}>
            {schemaDiff.nullabilityChanges.map((change) => (
              <li key={`${change.column}-${change.expectedRequired}-${change.actualRequired}`}>
                <Body1>
                  {change.column}: expected {String(change.expectedRequired)} / actual{' '}
                  {String(change.actualRequired)}
                </Body1>
              </li>
            ))}
          </ul>
        ) : (
          <Body1>No nullability drift.</Body1>
        )}
        {schemaDiff.partitionChange ? (
          <Body1>
            Partition drift: expected [{schemaDiff.partitionChange.expected.join(', ')}], actual [
            {schemaDiff.partitionChange.actual.join(', ')}]
          </Body1>
        ) : null}
      </Card>
    </div>
  );
}

function formatExpectedActual(rule: RuleResult) {
  const expected = formatDriftValue(rule.expected);
  const actual = formatDriftValue(rule.actual);

  if (expected === null && actual === null) {
    return '';
  }

  return ` Expected: ${expected ?? '—'}; actual: ${actual ?? '—'}.`;
}

function formatDriftValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : 'None';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}

function resolveRemediationSuggestions(run: RunDetail) {
  const aiSuggestions = run.resultJson.remediationSuggestions.filter(
    (suggestion) => suggestion.trim().length > 0,
  );

  if (aiSuggestions.length > 0) {
    return aiSuggestions;
  }

  return getActionableRules(run).map(buildFallbackRemediation);
}

function getActionableRules(run: RunDetail) {
  return [
    ...run.resultJson.schemaRules,
    ...run.resultJson.qualityRules,
    ...(run.resultJson.freshnessRule ? [run.resultJson.freshnessRule] : []),
  ].filter((rule) => rule.status === 'failed' || rule.status === 'warned');
}

function buildFallbackRemediation(rule: RuleResult) {
  const subject = rule.column ? `column ${rule.column}` : 'the table';
  const details = formatExpectedActual(rule).trim();
  const suffix = details ? ` ${details}` : '';

  if (rule.ruleId === 'schema.column.present') {
    return `Restore ${subject} in the source table or publish a new contract version if the removal was intentional.${suffix}`;
  }

  if (rule.ruleId === 'schema.column.type') {
    return `Align the data type for ${subject} with the contract expectation, or version the contract for the new type.${suffix}`;
  }

  if (rule.ruleId === 'schema.column.nullable') {
    return `Enforce the required nullability for ${subject} upstream, or relax the contract if nulls are allowed.${suffix}`;
  }

  if (rule.ruleId === 'schema.column.extra') {
    return `Add ${subject} to the contract if it is intentional, or remove it from the source table.${suffix}`;
  }

  if (rule.ruleId === 'schema.partition.match') {
    return `Align table partitioning with the contract definition before the next run.${suffix}`;
  }

  if (rule.ruleId.startsWith('quality.')) {
    return `Investigate the quality rule ${rule.ruleId} for ${subject}; ${rule.message}${suffix}`;
  }

  if (rule.ruleId.startsWith('freshness.')) {
    return `Refresh the table or repair the upstream pipeline so freshness satisfies the contract; ${rule.message}${suffix}`;
  }

  return `Review ${rule.ruleId} for ${subject}; ${rule.message}${suffix}`;
}

function buildRunLink(contractId: string | null | undefined, runId: string) {
  return contractId
    ? `/contracts/${contractId}/runs/${runId}`
    : `/contracts/runs?runId=${encodeURIComponent(runId)}`;
}

function downloadJson(value: unknown, fileName: string) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function resolveDisplayBreachScore(run: RunDetail) {
  const persistedScore = run.resultJson.breachScore ?? run.breachScore;
  if (persistedScore !== null && persistedScore !== undefined) {
    return persistedScore;
  }

  return hasBreach(run) ? null : 0;
}

function hasBreach(run: RunDetail) {
  if (run.resultJson.overallStatus !== 'passed') {
    return true;
  }

  return getActionableRules(run).length > 0;
}

function parsePersistedReportState(raw: string): PersistedReportState | null {
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedReportState>;
    const contractId = typeof parsed.contractId === 'string' ? parsed.contractId : null;
    const runId = typeof parsed.runId === 'string' ? parsed.runId : null;

    if (!contractId && !runId) {
      return null;
    }

    return {
      contractId,
      runId,
    };
  } catch {
    return null;
  }
}

function resolveSummaryBreachScore(run: RunSummary | undefined) {
  const candidate = run as (RunSummary & { breachScore?: number | null; resultJson?: { breachScore?: number | null } }) | undefined;
  return candidate?.breachScore ?? candidate?.resultJson?.breachScore ?? null;
}

function formatBreachDelta(delta: number) {
  if (Math.abs(delta) < 0.5) {
    return 'No meaningful change from last run';
  }

  const rounded = Math.abs(Math.round(delta));
  return delta < 0
    ? `${rounded}% better than last run`
    : `${rounded}% worse than last run`;
}

function formatDuration(start: string, end: string | null) {
  if (!end) {
    return 'Still running';
  }

  const elapsedMs = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
    return '—';
  }

  const seconds = Math.round(elapsedMs / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

function formatRunMode(value: string | null | undefined) {
  if (!value) {
    return '—';
  }

  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ');
}

export default EnforcementRunPage;
