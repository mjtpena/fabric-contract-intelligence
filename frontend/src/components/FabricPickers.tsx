import { Combobox, Field, Option, Spinner } from '@fluentui/react-components';
import { useFabricTargetItems, useLakehouses, useLakehouseTables } from '@/hooks/useFabricItems';
import type { ContractTargetType } from '@/models/Contract';
import { contractTargetTypeOptions, getContractTargetTypeLabel } from '@/models/ContractTarget';

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
  const { isLoading, items } = useFabricTargetItems({
    baseUrl: apiBaseUrl,
    getToken,
    isReady,
    targetType,
    workspaceId,
  });

  const label = `Target ${getContractTargetTypeLabel(targetType).toLowerCase()}`;
  const selectedName = items.find((item) => item.id === value)?.displayName ?? (value || undefined);

  return (
    <Field
      hint={items.length === 0 && !isLoading && isReady ? 'Paste a Fabric item GUID if the list is unavailable.' : undefined}
      label={label}
    >
      <Combobox
        freeform
        placeholder={isLoading ? 'Loading Fabric items…' : 'Select or paste Fabric item ID'}
        value={selectedName ?? ''}
        onOptionSelect={(_, data) => {
          if (data.optionValue) {
            onChange(data.optionValue);
          }
        }}
        onChange={(e) => {
          onChange(e.currentTarget.value);
        }}
      >
        {items.map((item) => (
          <Option key={item.id} text={item.displayName} value={item.id}>
            <span style={{ fontWeight: 600 }}>{item.displayName}</span>
            <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.6 }}>{item.type}</span>
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
  const { isLoading, lakehouses } = useLakehouses({ baseUrl: apiBaseUrl, getToken, isReady, workspaceId });

  const selectedName = lakehouses.find((l) => l.id === value)?.displayName ?? (value || undefined);

  return (
    <Field
      hint={lakehouses.length === 0 && !isLoading && isReady ? 'Paste a lakehouse GUID if the list is unavailable.' : undefined}
      label="Target lakehouse"
    >
      <Combobox
        freeform
        placeholder={isLoading ? 'Loading lakehouses…' : 'Select or paste lakehouse ID'}
        value={selectedName ?? ''}
        onOptionSelect={(_, data) => {
          if (data.optionValue) {
            onChange(data.optionValue);
          }
        }}
        onChange={(e) => {
          onChange(e.currentTarget.value);
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
  const { isLoading, tables } = useLakehouseTables({ baseUrl: apiBaseUrl, getToken, isReady, lakehouseId, workspaceId });

  const hasLakehouse = isGuid(lakehouseId);
  const placeholder = !hasLakehouse
    ? 'Select a lakehouse first'
    : isLoading
      ? 'Loading tables…'
      : tables.length > 0
        ? 'Select a table'
        : 'No tables found — enter path manually';

  // Show a human-readable display name (table name, not the full ABFSS path)
  const displayValue = deriveTableDisplayName(tables, value);

  return (
    <Field
      hint={!hasLakehouse ? undefined : 'The ABFSS path is auto-filled when you pick a table.'}
      label="Target table"
    >
      {isLoading && hasLakehouse ? (
        <Spinner size="tiny" label="Loading tables…" />
      ) : (
        <Combobox
          disabled={!hasLakehouse}
          freeform
          placeholder={placeholder}
          value={displayValue}
          onOptionSelect={(_, data) => {
            if (data.optionValue) {
              onChange(data.optionValue);
            }
          }}
          onChange={(e) => {
            onChange(e.currentTarget.value);
          }}
        >
          {tables.map((table) => (
            <Option key={table.name} text={table.name} value={table.location || table.name}>
              <span style={{ fontWeight: 600 }}>{table.name}</span>
              {table.type ? (
                <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.6 }}>{table.type}</span>
              ) : null}
            </Option>
          ))}
        </Combobox>
      )}
    </Field>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

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
