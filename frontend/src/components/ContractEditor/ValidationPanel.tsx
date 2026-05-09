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
import { createContractClient } from '@/api/contractClient';

interface ValidationPanelProps {
  onPreviewAgainstLiveTable?: () => void;
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
    backgroundColor: tokens.colorPaletteRedBackground1,
    border: `1px solid ${tokens.colorPaletteRedBorder1}`,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
});

const columns = [
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

const fallbackValidator = createContractClient({
  baseUrl: '',
  getAccessToken: async () => '',
}).validate;

export function ValidationPanel({
  onPreviewAgainstLiveTable,
  onValidationChange,
  validateYaml = fallbackValidator,
  yaml,
}: ValidationPanelProps) {
  const styles = useStyles();
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<ContractValidationResult | null>(null);

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

  const issueSummary = useMemo(() => {
    if (!result) {
      return 'Waiting for validation...';
    }

    return result.isValid
      ? 'The current YAML passes local ODCS validation.'
      : `${result.issues.length} validation issue${result.issues.length === 1 ? '' : 's'} found.`;
  }, [result]);

  return (
    <aside className={styles.root}>
      <div className={styles.sectionHeader}>
        <div>
          <Subtitle2>Validation panel</Subtitle2>
          <Caption1>{issueSummary}</Caption1>
        </div>
        <Button appearance="secondary" onClick={onPreviewAgainstLiveTable}>
          Preview against live table
        </Button>
      </div>

      {isValidating ? <Spinner label="Refreshing validation…" size="small" /> : null}

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
        <Subtitle2>Schema preview</Subtitle2>
        <DataGrid items={result?.schemaPreview ?? []} columns={columns}>
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
