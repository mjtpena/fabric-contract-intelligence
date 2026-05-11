import { useEffect, useMemo, useState } from 'react';
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
  Dropdown,
  Field,
  Option,
  Spinner,
  Subtitle1,
  Tab,
  TabList,
  Title2,
  createTableColumn,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { ArrowClockwiseRegular, ArrowLeftRegular } from '@fluentui/react-icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { createContractClient } from '@/api/contractClient';
import { createOpsClient } from '@/api/opsClient';
import { createRunClient } from '@/api/runClient';
import { BreachScoreGauge } from '@/components/RunResult/BreachScoreGauge';
import { RuleResultsTable } from '@/components/RunResult/RuleResultsTable';
import { SchemaDiffViewer } from '@/components/RunResult/SchemaDiffViewer';
import { StatusBadge } from '@/components/StatusBadge';
import { useContract } from '@/hooks/useContract';
import { useEnforcementRun } from '@/hooks/useEnforcementRun';
import { useFabricSdk } from '@/hooks/useFabricSdk';
import type { RunSummary, SchemaDiff } from '@/models/enforcement';
import type { ReportAuditRow } from '@/models/ops';

type RunTab = 'schema-rules' | 'quality-rules' | 'freshness' | 'schema-diff' | 'remediation';

interface PersistedReportState {
  contractId: string | null;
  runId: string | null;
}

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
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalL,
    flexWrap: 'wrap',
  },
  headerActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'center',
  },
  summary: {
    display: 'grid',
    gap: tokens.spacingHorizontalL,
    gridTemplateColumns: '2fr 1fr',
  },
  summaryCards: {
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
    gap: tokens.spacingVerticalS,
  },
  tabCard: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    padding: tokens.spacingHorizontalL,
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
    border: `1px dashed ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
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

  const requestedContractId = routeContractId ?? searchParams.get('contractId') ?? persistedReportState?.contractId ?? null;
  const requestedRunId = routeRunId ?? searchParams.get('runId') ?? persistedReportState?.runId ?? null;

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

  const { error, loading, refresh, run, runs } = useEnforcementRun(
    runClient,
    requestedContractId,
    requestedRunId,
  );
  const resolvedContractId = requestedContractId ?? run?.contractId ?? null;
  const { contract, versions } = useContract(contractClient, resolvedContractId);

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

    setLeftVersionId((current) => {
      if (current && sortedVersions.some((version) => version.id === current)) {
        return current;
      }

      return sortedVersions[Math.max(0, sortedVersions.length - 2)]?.id ?? sortedVersions[0].id;
    });

    setRightVersionId((current) => {
      if (current && sortedVersions.some((version) => version.id === current)) {
        return current;
      }

      return sortedVersions[sortedVersions.length - 1].id;
    });
  }, [sortedVersions]);

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
  }, [itemObjectId, sdk]);

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

    navigate(buildRunLink(row.contractId, row.runId));
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
        renderCell: (item) => formatDate(item.triggeredAt),
        renderHeaderCell: () => 'Triggered',
      }),
      createTableColumn<RunSummary>({
        columnId: 'actions',
        renderCell: (item) => (
          <div className={styles.historyActions}>
            <Button
              appearance="subtle"
              onClick={() => navigate(buildRunLink(item.contractId, item.id))}
            >
              Open
            </Button>
          </div>
        ),
        renderHeaderCell: () => 'Actions',
      }),
    ],
    [navigate, styles.historyActions, versionLookup],
  );

  if ((itemObjectId && !itemDefinitionLoaded) || (loading && !run)) {
    return (
      <section className={styles.root}>
        <Spinner label="Loading enforcement run…" />
      </section>
    );
  }

  if (!run) {
    return (
      <section className={styles.root}>
        <ReportItemDashboard
          auditError={auditError ?? error}
          auditLoading={auditLoading}
          rows={auditRows}
          styles={styles}
          onOpenRun={(row) => {
            void openAuditRow(row);
          }}
        />
      </section>
    );
  }

  return (
    <section className={styles.root}>
      <div className={styles.header}>
        <div>
          <Title2>{contract?.name ?? 'Enforcement run'}</Title2>
          <Caption1>
            {contract?.targetTablePath ??
              'Review schema rules, quality rules, freshness, diff, and remediation guidance.'}
          </Caption1>
        </div>
        <div className={styles.headerActions}>
          {resolvedContractId ? (
            <Button
              appearance="secondary"
              icon={<ArrowLeftRegular />}
              onClick={() => navigate(`/contracts/${resolvedContractId}`)}
            >
              Back to contract
            </Button>
          ) : null}
          <Button
            appearance="secondary"
            icon={<ArrowClockwiseRegular />}
            onClick={() => {
              void refresh();
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error ? <Body1>{error}</Body1> : null}

      <div className={styles.summary}>
        <div className={styles.summaryCards}>
          <div className={styles.card}>
            <Caption1>Status</Caption1>
            <StatusBadge status={run.status} />
            <Body1>Overall result: {run.resultJson.overallStatus}</Body1>
          </div>
          <div className={styles.card}>
            <Caption1>Started</Caption1>
            <Body1>{formatDate(run.triggeredAt)}</Body1>
            <Caption1>Completed</Caption1>
            <Body1>{run.completedAt ? formatDate(run.completedAt) : 'Still running'}</Body1>
          </div>
          <div className={styles.card}>
            <Caption1>Table version</Caption1>
            <Body1>{String(run.resultJson.tableVersion ?? run.deltaTableVersion ?? '—')}</Body1>
            <Caption1>Triggered by</Caption1>
            <Body1>{run.triggeredBy}</Body1>
          </div>
          <div className={styles.card}>
            <Caption1>Correlation ID</Caption1>
            <Body1>{run.correlationId}</Body1>
          </div>
        </div>

        <div className={styles.card}>
          <BreachScoreGauge score={run.resultJson.breachScore ?? run.breachScore} />
        </div>
      </div>

      <div className={styles.card}>
        <Subtitle1>Run history</Subtitle1>
        {runs.length === 0 ? (
          <Body1>No persisted runs were returned for this contract.</Body1>
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
      </div>

      <div className={styles.tabCard}>
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
            <Body1>No freshness rule was returned for this run.</Body1>
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

            <SchemaDiffSummary schemaDiff={run.resultJson.schemaDiff} />

            {selectedLeftVersion && selectedRightVersion ? (
              <SchemaDiffViewer
                modifiedYaml={selectedRightVersion?.odcsYaml ?? ''}
                originalYaml={selectedLeftVersion?.odcsYaml ?? ''}
                themeMode={sdk.themeMode}
              />
            ) : (
              <Body1>Select two contract versions to compare their YAML side by side.</Body1>
            )}
          </>
        ) : null}

        {selectedTab === 'remediation' ? (
          <>
            {run.resultJson.remediationSuggestions.length > 0 ? (
              <ul className={styles.checklist}>
                {run.resultJson.remediationSuggestions.map((suggestion) => (
                  <li key={suggestion}>
                    <Body1>{suggestion}</Body1>
                  </li>
                ))}
              </ul>
            ) : (
              <Body1>No remediation suggestions were returned for this run.</Body1>
            )}
            {run.resultJson.errorMessage ? (
              <div className={styles.card}>
                <Caption1>Run error</Caption1>
                <Body1>{run.resultJson.errorMessage}</Body1>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
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
  styles,
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
        renderCell: (row) => (row.breachScore != null ? row.breachScore.toFixed(2) : 'n/a'),
        renderHeaderCell: () => 'Breach score',
      }),
      createTableColumn<ReportAuditRow>({
        columnId: 'triggeredAt',
        renderCell: (row) => formatDate(row.triggeredAt),
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
      <div className={styles.header}>
        <div>
          <Title2>Contract reports</Title2>
          <Caption1>Open persisted enforcement runs and breach reports for this workspace.</Caption1>
        </div>
      </div>

      {auditError ? <Body1>{auditError}</Body1> : null}

      {auditLoading ? (
        <Spinner label="Loading contract reports…" />
      ) : rows.length === 0 ? (
        <div className={styles.emptyState}>
          <Body1>No enforcement reports have been recorded for this workspace yet.</Body1>
        </div>
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
}

function SchemaDiffSummary({ schemaDiff }: SchemaDiffSummaryProps) {
  const styles = useStyles();

  if (!schemaDiff) {
    return <Body1>No structured schema diff was stored for this run.</Body1>;
  }

  return (
    <div className={styles.inlineGrid}>
      <div className={styles.card}>
        <Caption1>Added columns</Caption1>
        <Body1>{schemaDiff.addedColumns.length > 0 ? schemaDiff.addedColumns.join(', ') : 'None'}</Body1>
      </div>
      <div className={styles.card}>
        <Caption1>Removed columns</Caption1>
        <Body1>{schemaDiff.removedColumns.length > 0 ? schemaDiff.removedColumns.join(', ') : 'None'}</Body1>
      </div>
      <div className={styles.card}>
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
      </div>
      <div className={styles.card}>
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
      </div>
    </div>
  );
}

function buildRunLink(contractId: string | null | undefined, runId: string) {
  return contractId
    ? `/contracts/${contractId}/runs/${runId}`
    : `/contracts/runs?runId=${encodeURIComponent(runId)}`;
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
