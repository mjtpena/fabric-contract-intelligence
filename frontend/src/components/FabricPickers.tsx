import { Combobox, Field, Option, Spinner } from '@fluentui/react-components';
import { useLakehouses, useLakehouseTables } from '@/hooks/useFabricItems';

// ─── LakehousePicker ──────────────────────────────────────────────────────────

export interface LakehousePickerProps {
  apiBaseUrl: string;
  getToken: () => Promise<string>;
  onChange: (lakehouseId: string) => void;
  value: string;
  workspaceId: string;
}

export function LakehousePicker({ apiBaseUrl, getToken, onChange, value, workspaceId }: LakehousePickerProps) {
  const { isLoading, lakehouses } = useLakehouses({ baseUrl: apiBaseUrl, getToken, workspaceId });

  const selectedName = lakehouses.find((l) => l.id === value)?.displayName ?? (value || undefined);

  return (
    <Field
      hint={lakehouses.length === 0 && !isLoading ? 'Paste a lakehouse GUID if the list is unavailable.' : undefined}
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
  lakehouseId: string;
  onChange: (tablePath: string) => void;
  value: string;
  workspaceId: string;
}

export function TablePicker({ apiBaseUrl, getToken, lakehouseId, onChange, value, workspaceId }: TablePickerProps) {
  const { isLoading, tables } = useLakehouseTables({ baseUrl: apiBaseUrl, getToken, lakehouseId, workspaceId });

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
