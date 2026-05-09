import { useMemo } from 'react';
import {
  Body1,
  Caption1,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  createTableColumn,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { StatusBadge } from '@/components/StatusBadge';
import type { RuleResult } from '@/models/enforcement';

interface RuleResultsTableProps {
  emptyMessage: string;
  rules: RuleResult[];
}

const useStyles = makeStyles({
  emptyState: {
    border: `1px dashed ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  table: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
  },
});

export function RuleResultsTable({ emptyMessage, rules }: RuleResultsTableProps) {
  const styles = useStyles();

  const columns = useMemo(
    () => [
      createTableColumn<RuleResult>({
        columnId: 'ruleId',
        renderCell: (item) => item.ruleId,
        renderHeaderCell: () => 'Rule',
      }),
      createTableColumn<RuleResult>({
        columnId: 'column',
        renderCell: (item) => item.column ?? '—',
        renderHeaderCell: () => 'Column',
      }),
      createTableColumn<RuleResult>({
        columnId: 'status',
        renderCell: (item) => <StatusBadge status={item.status} />,
        renderHeaderCell: () => 'Status',
      }),
      createTableColumn<RuleResult>({
        columnId: 'message',
        renderCell: (item) => item.message,
        renderHeaderCell: () => 'Message',
      }),
      createTableColumn<RuleResult>({
        columnId: 'expected',
        renderCell: (item) => formatRuleValue(item.expected ?? item.threshold ?? item.maxAgeHours),
        renderHeaderCell: () => 'Expected / threshold',
      }),
      createTableColumn<RuleResult>({
        columnId: 'actual',
        renderCell: (item) => formatRuleValue(item.actual ?? item.ageHours ?? item.lastModifiedUtc),
        renderHeaderCell: () => 'Actual',
      }),
    ],
    [],
  );

  if (rules.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Caption1>No rule results</Caption1>
        <Body1>{emptyMessage}</Body1>
      </div>
    );
  }

  return (
    <div className={styles.table}>
      <DataGrid items={rules} columns={columns}>
        <DataGridHeader>
          <DataGridRow>
            {({ renderHeaderCell }) => (
              <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
            )}
          </DataGridRow>
        </DataGridHeader>
        <DataGridBody<RuleResult>>
          {({ item, rowId }) => (
            <DataGridRow<RuleResult> key={rowId}>
              {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
            </DataGridRow>
          )}
        </DataGridBody>
      </DataGrid>
    </div>
  );
}

function formatRuleValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}
