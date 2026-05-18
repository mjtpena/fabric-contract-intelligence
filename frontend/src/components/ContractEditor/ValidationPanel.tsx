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
  Spinner,
  Subtitle2,
  createTableColumn,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import type {
  ContractValidationResult,
  SchemaPreviewField,
} from '@/models/Contract';
import { validateContractYaml } from '@/api/contractClient';

interface ValidationPanelProps {
  /** Async callback that fetches live schema fields from the target Fabric table. */
  getLivePreview?: () => Promise<SchemaPreviewField[]>;
  onValidationChange?: (result: ContractValidationResult) => void;
  validateYaml?: (yaml: string) => Promise<ContractValidationResult>;
  yaml: string;
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    height: '100%',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    padding: tokens.spacingHorizontalL,
    boxSizing: 'border-box',
    overflow: 'auto',
  },
  issues: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  issue: {
    padding: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorStatusDangerBackground1,
    border: `1px solid ${tokens.colorStatusDangerBorder1}`,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
  sectionTitleGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
  liveTag: {
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
});

const schemaColumns = [
  createTableColumn<SchemaPreviewField>({
    columnId: 'name',
    compare: (left, right) => left.name.localeCompare(right.name),
    renderCell: (item) => item.name,
    renderHeaderCell: () => 'Field',
  }),
  createTableColumn<SchemaPreviewField>({
    columnId: 'logicalType',
    renderCell: (item) => item.logicalType ?? '—',
    renderHeaderCell: () => 'Logical type',
  }),
  createTableColumn<SchemaPreviewField>({
    columnId: 'physicalType',
    renderCell: (item) => item.physicalType ?? '—',
    renderHeaderCell: () => 'Physical type',
  }),
  createTableColumn<SchemaPreviewField>({
    columnId: 'required',
    renderCell: (item) => (item.required ? 'Yes' : 'No'),
    renderHeaderCell: () => 'Required',
  }),
];

export function ValidationPanel({
  getLivePreview,
  onValidationChange,
  validateYaml = validateContractYaml,
  yaml,
}: ValidationPanelProps) {
  const styles = useStyles();
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<ContractValidationResult | null>(null);
  const [liveFields, setLiveFields] = useState<SchemaPreviewField[] | null>(null);
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    setIsValidating(true);

    const timer = window.setTimeout(() => {
      void validateYaml(yaml).then((nextResult) => {
        if (!isActive) {
          return;
        }

        setIsValidating(false);
        setResult(nextResult);
        onValidationChange?.(nextResult);
      });
    }, 500);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [onValidationChange, validateYaml, yaml]);

  // Reset live preview when YAML changes so stale data is not shown.
  useEffect(() => {
    setLiveFields(null);
    setLiveError(null);
  }, [yaml]);

  const handleLivePreview = async () => {
    if (!getLivePreview || isLoadingLive) {
      return;
    }

    setIsLoadingLive(true);
    setLiveError(null);

    try {
      const fields = await getLivePreview();
      setLiveFields(fields);
    } catch (err) {
      setLiveError(err instanceof Error ? err.message : 'Preview failed. Check network access and token permissions.');
    } finally {
      setIsLoadingLive(false);
    }
  };

  const issueSummary = useMemo(() => {
    if (!result) {
      return 'Waiting for validation...';
    }

    return result.isValid
      ? 'The current YAML passes local ODCS validation.'
      : `${result.issues.length} validation issue${result.issues.length === 1 ? '' : 's'} found.`;
  }, [result]);

  const displayedSchema = liveFields ?? result?.schemaPreview ?? [];
  const schemaLabel = liveFields != null ? (
    <span><span className={styles.liveTag}>Live </span>schema from Fabric target</span>
  ) : 'Schema preview (from YAML)';

  return (
    <aside className={styles.root}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitleGroup}>
          <Subtitle2 as="h3">Validation panel</Subtitle2>
          <Caption1>{issueSummary}</Caption1>
        </div>
        <Button
          appearance="secondary"
          disabled={!getLivePreview || isLoadingLive}
          onClick={() => void handleLivePreview()}
        >
          {isLoadingLive ? <Spinner size="tiny" /> : null}
          Preview against live table
        </Button>
      </div>

      {isValidating ? <Spinner label="Refreshing validation…" size="small" /> : null}

      {liveError ? (
        <div className={styles.issue}>
          <Body1>Live preview error: {liveError}</Body1>
        </div>
      ) : null}

      <section className={styles.issues}>
        {result?.issues.length ? (
          result.issues.map((issue) => (
            <div key={`${issue.path}-${issue.message}`} className={styles.issue}>
              <Body1>{issue.message}</Body1>
              <Caption1>{issue.path}</Caption1>
            </div>
          ))
        ) : (
          <Body1>{result ? 'No validation errors.' : 'Validation results will appear here.'}</Body1>
        )}
      </section>

      <section>
        <Subtitle2 as="h3">{schemaLabel}</Subtitle2>
        <DataGrid items={displayedSchema} columns={schemaColumns}>
          <DataGridHeader>
            <DataGridRow>
              {({ renderHeaderCell }) => (
                <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
              )}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<SchemaPreviewField>>
            {({ item, rowId }) => (
              <DataGridRow<SchemaPreviewField> key={rowId}>
                {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      </section>
    </aside>
  );
}
