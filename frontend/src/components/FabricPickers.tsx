import { Combobox, Field, Link, MessageBar, MessageBarBody, Option, Spinner, makeStyles, tokens } from '@fluentui/react-components';
import { useFabricTargetItems, useLakehouses, useLakehouseTables } from '@/hooks/useFabricItems';
import type { ContractTargetType } from '@/models/Contract';
import { contractTargetTypeOptions, getContractTargetTypeLabel } from '@/models/ContractTarget';

const usePickerStyles = makeStyles({
  optionPrimary: {
    fontWeight: tokens.fontWeightSemibold,
  },
  optionCaption: {
    marginLeft: tokens.spacingHorizontalS,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
});

interface OptionWithCaptionProps {
  primary: string;
  caption?: string | null;
}

function OptionWithCaption({ primary, caption }: OptionWithCaptionProps) {
  const styles = usePickerStyles();
  return (
    <>
      <span className={styles.optionPrimary}>{primary}</span>
      {caption ? <span className={styles.optionCaption}>{caption}</span> : null}
    </>
  );
}

// ─── TargetTypePicker ────────────────────────────────────────────────────────

export interface TargetTypePickerProps {
  onChange: (targetType: ContractTargetType) => void;
  value: ContractTargetType;
}

export function TargetTypePicker({ onChange, value }: TargetTypePickerProps) {
  return (
    <Field label="Contract target type">
      <Combobox
        value={getContractTargetTypeLabel(value)}
        onOptionSelect={(_, data) => {
          const selected = data.optionValue as ContractTargetType | undefined;
          if (selected) {
            onChange(selected);
          }
        }}
      >
        {contractTargetTypeOptions.map((option) => (
          <Option key={option.value} text={option.label} value={option.value}>
            {option.label}
          </Option>
        ))}
      </Combobox>
    </Field>
  );
}

// ─── FabricTargetItemPicker ──────────────────────────────────────────────────

export interface FabricTargetItemPickerProps {
  apiBaseUrl: string;
  getToken: () => Promise<string>;
  isReady: boolean;
  onChange: (itemId: string) => void;
  targetType: ContractTargetType;
  value: string;
  workspaceId: string;
}

export function FabricTargetItemPicker({
  apiBaseUrl,
  getToken,
  isReady,
  onChange,
  targetType,
  value,
  workspaceId,
}: FabricTargetItemPickerProps) {
  const { isLoading, items, refetch } = useFabricTargetItems({
    baseUrl: apiBaseUrl,
    getToken,
    isReady,
    targetType,
    workspaceId,
  });

  const label = `Target ${getContractTargetTypeLabel(targetType).toLowerCase()}`;
  const selectedName = items.find((item) => item.id === value)?.displayName ?? (value || undefined);

  return (
    <Field label={label}>
      {items.length === 0 && !isLoading && isReady ? <PickerWarning onRetry={refetch} /> : null}
      <Combobox
        placeholder={isLoading ? 'Loading Fabric items…' : 'Select Fabric item'}
        value={selectedName ?? ''}
        onOptionSelect={(_, data) => {
          if (data.optionValue) {
            onChange(data.optionValue);
          }
        }}
      >
        {items.map((item) => (
          <Option key={item.id} text={item.displayName} value={item.id}>
            <OptionWithCaption primary={item.displayName} caption={item.type} />
          </Option>
        ))}
      </Combobox>
    </Field>
  );
}

// ─── LakehousePicker ──────────────────────────────────────────────────────────

export interface LakehousePickerProps {
  apiBaseUrl: string;
  getToken: () => Promise<string>;
  /** Pass sdk.isReady to prevent firing requests before the Fabric SDK token is available. */
  isReady: boolean;
  onChange: (lakehouseId: string) => void;
  value: string;
  workspaceId: string;
}

export function LakehousePicker({ apiBaseUrl, getToken, isReady, onChange, value, workspaceId }: LakehousePickerProps) {
  const { isLoading, lakehouses, refetch } = useLakehouses({ baseUrl: apiBaseUrl, getToken, isReady, workspaceId });

  const selectedName = lakehouses.find((l) => l.id === value)?.displayName ?? (value || undefined);

  return (
    <Field label="Target lakehouse">
      {lakehouses.length === 0 && !isLoading && isReady ? <PickerWarning onRetry={refetch} /> : null}
      <Combobox
        placeholder={isLoading ? 'Loading lakehouses…' : 'Select lakehouse'}
        value={selectedName ?? ''}
        onOptionSelect={(_, data) => {
          if (data.optionValue) {
            onChange(data.optionValue);
          }
        }}
      >
        {lakehouses.map((lakehouse) => (
          <Option key={lakehouse.id} text={lakehouse.displayName} value={lakehouse.id}>
            {lakehouse.displayName}
          </Option>
        ))}
      </Combobox>
    </Field>
  );
}

// ─── TablePicker ──────────────────────────────────────────────────────────────

export interface TablePickerProps {
  apiBaseUrl: string;
  getToken: () => Promise<string>;
  /** Pass sdk.isReady to prevent firing requests before the Fabric SDK token is available. */
  isReady: boolean;
  lakehouseId: string;
  onChange: (tablePath: string) => void;
  value: string;
  workspaceId: string;
}

export function TablePicker({ apiBaseUrl, getToken, isReady, lakehouseId, onChange, value, workspaceId }: TablePickerProps) {
  const { isLoading, tables, refetch } = useLakehouseTables({ baseUrl: apiBaseUrl, getToken, isReady, lakehouseId, workspaceId });

  const hasLakehouse = isGuid(lakehouseId);
  const placeholder = !hasLakehouse
    ? 'Select a lakehouse first'
    : isLoading
      ? 'Loading tables…'
      : tables.length > 0
        ? 'Select a table'
        : 'No tables found';

  // Show a human-readable display name (table name, not the full ABFSS path)
  const displayValue = deriveTableDisplayName(tables, value);

  return (
    <Field
      hint={!hasLakehouse ? undefined : 'The ABFSS path is auto-filled when you pick a table.'}
      label="Target table"
    >
      {tables.length === 0 && !isLoading && hasLakehouse && isReady ? <PickerWarning onRetry={refetch} /> : null}
      {isLoading && hasLakehouse ? (
        <Spinner size="tiny" label="Loading tables…" />
      ) : (
        <Combobox
          disabled={!hasLakehouse}
          placeholder={placeholder}
          value={displayValue}
          onOptionSelect={(_, data) => {
            if (data.optionValue) {
              onChange(data.optionValue);
            }
          }}
        >
          {tables.map((table) => (
            <Option key={table.name} text={table.name} value={table.location || table.name}>
              <OptionWithCaption primary={table.name} caption={table.type} />
            </Option>
          ))}
        </Combobox>
      )}
    </Field>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function PickerWarning({ onRetry }: { onRetry: () => void }) {
  return (
    <MessageBar intent="info" layout="multiline">
      <MessageBarBody>
        No items available in this workspace (or you don't have permission to list them). Paste the OneLake path manually below, or <Link onClick={onRetry}>retry</Link>.
      </MessageBarBody>
    </MessageBar>
  );
}

function deriveTableDisplayName(tables: { name: string; location?: string }[], value: string): string {
  if (!value) {
    return '';
  }
  // Check if the stored value matches a known table's location or name
  const match = tables.find((t) => (t.location || t.name) === value);
  if (match) {
    return match.name;
  }
  // Fallback: extract the last path segment from an ABFSS path
  const segments = value.split('/');
  return segments[segments.length - 1] || value;
}

function isGuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

