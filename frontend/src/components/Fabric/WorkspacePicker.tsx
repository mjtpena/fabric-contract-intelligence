import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Combobox,
  Field,
  Option,
  Spinner,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import type { OpsClient } from '@/api/opsClient';
import type { WorkspaceSummary } from '@/models/ops';

export interface WorkspacePickerProps {
  client: Pick<OpsClient, 'listWorkspaces'>;
  currentWorkspaceId: string;
  isReady: boolean;
  onChange: (workspaceId: string) => void;
  value: string;
}

const useStyles = makeStyles({
  option: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXXS },
  titleRow: { display: 'flex', gap: tokens.spacingHorizontalXS, alignItems: 'center' },
  subtitle: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
});

export function WorkspacePicker({ client, currentWorkspaceId, isReady, onChange, value }: WorkspacePickerProps) {
  const styles = useStyles();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;
    setLoading(true);
    void client.listWorkspaces()
      .then((rows) => {
        if (!cancelled) setWorkspaces(rows);
      })
      .catch(() => {
        if (!cancelled) setWorkspaces([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [client, isReady]);

  const ordered = useMemo(() => {
    const current = workspaces.find((workspace) => workspace.id === currentWorkspaceId);
    const rest = workspaces.filter((workspace) => workspace.id !== currentWorkspaceId);
    return current ? [current, ...rest] : rest;
  }, [currentWorkspaceId, workspaces]);

  const selected = ordered.find((workspace) => workspace.id === value);
  const displayName = selected ? getWorkspaceName(selected) : '';

  return (
    <Field label="Target workspace" hint="Choose the workspace that contains the data store.">
      {loading ? <Spinner size="tiny" label="Loading workspaces…" /> : null}
      <Combobox
        placeholder="Search workspaces"
        selectedOptions={value ? [value] : []}
        value={displayName}
        onOptionSelect={(_, data) => {
          if (data.optionValue) onChange(data.optionValue);
        }}
      >
        {ordered.map((workspace) => (
          <Option key={workspace.id} text={getWorkspaceName(workspace)} value={workspace.id}>
            <div className={styles.option}>
              <span className={styles.titleRow}>
                <strong>{getWorkspaceName(workspace)}</strong>
                {workspace.id === currentWorkspaceId ? <Badge appearance="tint" size="small">current</Badge> : null}
              </span>
              <span className={styles.subtitle}>{workspace.tier}</span>
            </div>
          </Option>
        ))}
      </Combobox>
    </Field>
  );
}

function getWorkspaceName(workspace: WorkspaceSummary) {
  return workspace.displayName ?? workspace.name ?? workspace.id;
}
