import { useCallback, useMemo, useState } from 'react';
import {
  Badge,
  Body1,
  Button,
  Caption1,
  Card,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Spinner,
  Subtitle2Stronger,
  createTableColumn,
  makeStyles,
  tokens,
  type TableColumnDefinition,
} from '@fluentui/react-components';
import {
  CopyRegular,
  DeleteRegular,
  Key20Regular,
  KeyRegular,
  PlugDisconnected20Regular,
  Rocket20Regular,
  RocketRegular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { createWorkspaceClient } from '@/api/workspaceClient';
import { ItemEditor, type RibbonAction } from '@/components/ItemEditor/ItemEditor';
import { useFabricSdk } from '@/hooks/useFabricSdk';
import type { CreateApiKeyResponse, WorkspaceApiKey } from '@/models/Workspace';

const SUPPORT_URL = 'https://fabric.orqentis.com/support.html';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
  subtitle: {
    color: tokens.colorNeutralForeground3,
  },
  grid: {
    display: 'grid',
    gap: tokens.spacingHorizontalL,
    gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    alignItems: 'flex-start',
  },
  cardTitleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
  value: {
    fontSize: tokens.fontSizeHero700,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightHero700,
  },
  inlineBadge: {
    alignSelf: 'flex-start',
  },
  rawKeyBox: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalS}`,
    wordBreak: 'break-all',
  },
  keyWarning: {
    color: tokens.colorStatusDangerForeground1,
    fontWeight: tokens.fontWeightSemibold,
    margin: 0,
  },
  newKeyBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    marginBottom: tokens.spacingVerticalM,
  },
  generateButton: {
    marginTop: tokens.spacingVerticalS,
    alignSelf: 'flex-start',
  },
  dialogSurface: {
    maxWidth: '38rem',
  },
  keyTableWrap: {
    marginTop: tokens.spacingVerticalL,
  },
});

export function WorkspaceSettingsPage() {
  const styles = useStyles();
  const sdk = useFabricSdk();
  const navigate = useNavigate();

  const client = useMemo(
    () =>
      createWorkspaceClient({
        baseUrl: sdk.apiBaseUrl,
        correlationId: sdk.correlationId,
        getAccessToken: sdk.getAccessToken,
        workspaceId: sdk.workspaceId,
      }),
    [sdk.apiBaseUrl, sdk.correlationId, sdk.getAccessToken, sdk.workspaceId],
  );

  // ── API key state ──────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [keys, setKeys] = useState<WorkspaceApiKey[] | null>(null);
  const [newKey, setNewKey] = useState<CreateApiKeyResponse | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);

  const openDialog = useCallback(async () => {
    setNewKey(null);
    setKeyName('');
    setKeyError(null);
    setDialogOpen(true);
    try {
      const list = await client.listApiKeys();
      setKeys(list);
    } catch {
      setKeys([]);
    }
  }, [client]);

  const handleCreate = useCallback(async () => {
    if (!keyName.trim()) {
      setKeyError('Name is required.');
      return;
    }
    setIsCreating(true);
    setKeyError(null);
    try {
      const created = await client.createApiKey(keyName.trim());
      setNewKey(created);
      setKeyName('');
      setKeys(prev => [
        {
          id: created.id,
          displayName: created.displayName,
          keyHint: created.keyHint,
          createdAt: created.createdAt,
          lastUsedAt: null,
        },
        ...(prev ?? []),
      ]);
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : 'Failed to create key.');
    } finally {
      setIsCreating(false);
    }
  }, [client, keyName]);

  const handleRevoke = useCallback(
    async (keyId: string) => {
      try {
        await client.deleteApiKey(keyId);
        setKeys(prev => prev?.filter(k => k.id !== keyId) ?? []);
      } catch (err) {
        await sdk.notifyError('Revoke failed', err instanceof Error ? err.message : 'Unknown error.');
      }
    },
    [client, sdk],
  );

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      await sdk.notifySuccess('Copied', 'API key copied to clipboard.');
    } catch {
      await sdk.notifyError('Copy failed', 'Clipboard access denied. Select and copy manually.');
    }
  }, [sdk]);

  const apiKeyColumns = useMemo(
    () => makeApiKeyColumns((id) => { void handleRevoke(id); }),
    [handleRevoke],
  );

  const homeToolbarActions: RibbonAction[] = useMemo(() => [
    {
      key: 'manage-keys',
      label: 'Manage API keys',
      appearance: 'primary',
      icon: <KeyRegular />,
      onClick: openDialog,
    },
    {
      key: 'open-contracts',
      label: 'Open contracts & policies',
      icon: <RocketRegular />,
      onClick: () => navigate('/contracts'),
    },
  ], [navigate, openDialog]);

  return (
    <ItemEditor
      title="Workspace settings"
      subtitle="Configure workspace access, policy routing, and catalog integrations."
      homeToolbarActions={homeToolbarActions}
    >
      <div className={styles.root}>
      <div className={styles.grid}>
        {/* Current tier */}
        <Card className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleBlock}>
              <Caption1>Current tier</Caption1>
              <div className={styles.value}>{sdk.isHosted ? 'Community' : 'Developer'}</div>
            </div>
            <Badge appearance="tint" color="informative" shape="rounded">
              {sdk.isHosted ? 'Manual upgrade' : 'Local preview'}
            </Badge>
          </div>
          <Body1>
            Enterprise upgrades are provisioned manually until marketplace billing is live. Contact
            support with your tenant ID and workspace ID to request an upgrade.
          </Body1>
          <Body1>Workspace: {sdk.workspaceId || 'Not supplied by the host context'}</Body1>
          <Button
            appearance="primary"
            onClick={() => window.open(SUPPORT_URL, '_blank', 'noopener,noreferrer')}
          >
            Contact support to upgrade
          </Button>
        </Card>

        {/* M2M API keys */}
        <Card className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleBlock}>
              <Caption1>Machine-to-machine API key</Caption1>
              <div className={styles.value}>{keys == null ? 'Loading…' : `${keys.length} active`}</div>
            </div>
            <Key20Regular />
          </div>
          <Body1>
            Generate API keys to call the Orqentis API from notebooks, pipelines, or CI/CD without
            interactive Entra login. Keys are scoped to this workspace.
          </Body1>
        </Card>

        {/* Activator setup */}
        <Card className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleBlock}>
              <Caption1>Activator setup</Caption1>
              <div className={styles.value}>Policy routing</div>
            </div>
            <Rocket20Regular />
          </div>
          <Body1>
            Configure which Activator rules fire when a contract is breached. Open a Contract Policy
            item to set triggers, actions, and webhook routing.
          </Body1>
        </Card>

        {/* Microsoft Purview */}
        <Card className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleBlock}>
              <Caption1>Microsoft Purview</Caption1>
              <div className={styles.value}>Disconnected</div>
            </div>
            <PlugDisconnected20Regular />
          </div>
          <Badge appearance="tint" color="warning" shape="rounded" className={styles.inlineBadge}>
            Not connected
          </Badge>
          <Body1>
            Purview lineage and catalog linking are optional and provisioned on request. Contact
            support to enable automatic data lineage export for this workspace.
          </Body1>
          <Button
            appearance="secondary"
            onClick={() => window.open(SUPPORT_URL, '_blank', 'noopener,noreferrer')}
          >
            Contact support to connect
          </Button>
        </Card>
      </div>

      {/* API key dialog */}
      <Dialog open={dialogOpen} onOpenChange={(_, d) => setDialogOpen(d.open)}>
        <DialogSurface className={styles.dialogSurface}>
          <DialogBody>
            <DialogTitle>Manage API keys</DialogTitle>
            <DialogContent>
              {newKey && (
                <div className={styles.newKeyBlock}>
                  <MessageBar intent="warning" role="alert">
                    <MessageBarBody>Copy this key now — it will not be shown again.</MessageBarBody>
                  </MessageBar>
                  <div className={styles.rawKeyBox}>{newKey.rawKey}</div>
                  <Button
                    appearance="subtle"
                    icon={<CopyRegular />}
                    onClick={() => { void copyToClipboard(newKey.rawKey); }}
                  >
                    Copy to clipboard
                  </Button>
                </div>
              )}

              <Field
                label="New key name"
                validationMessage={keyError ?? undefined}
                validationState={keyError ? 'error' : 'none'}
              >
                <Input
                  placeholder="e.g. Fabric pipeline prod"
                  value={keyName}
                  onChange={(_, d) => setKeyName(d.value)}
                  onKeyDown={e => e.key === 'Enter' && void handleCreate()}
                />
              </Field>
              <Button
                appearance="primary"
                icon={isCreating ? <Spinner size="tiny" /> : <KeyRegular />}
                disabled={isCreating}
                onClick={handleCreate}
                className={styles.generateButton}
              >
                {isCreating ? 'Generating…' : 'Generate key'}
              </Button>

              {keys && keys.length > 0 && (
                <div className={styles.keyTableWrap}>
                  <Subtitle2Stronger as="h3">Existing keys</Subtitle2Stronger>
                  <DataGrid items={keys} columns={apiKeyColumns} getRowId={(k) => k.id}>
                    <DataGridHeader>
                      <DataGridRow>
                        {({ renderHeaderCell }) => (
                          <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                        )}
                      </DataGridRow>
                    </DataGridHeader>
                    <DataGridBody<WorkspaceApiKey>>
                      {({ item, rowId }) => (
                        <DataGridRow<WorkspaceApiKey> key={rowId}>
                          {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                        </DataGridRow>
                      )}
                    </DataGridBody>
                  </DataGrid>
                </div>
              )}
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setDialogOpen(false)}>
                Close
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
      </div>
    </ItemEditor>
  );
}

function makeApiKeyColumns(
  onRevoke: (id: string) => void,
): TableColumnDefinition<WorkspaceApiKey>[] {
  return [
    createTableColumn<WorkspaceApiKey>({
      columnId: 'name',
      renderHeaderCell: () => 'Name',
      renderCell: (k) => k.displayName,
    }),
    createTableColumn<WorkspaceApiKey>({
      columnId: 'keyHint',
      renderHeaderCell: () => 'Key hint',
      renderCell: (k) => <code>{k.keyHint}</code>,
    }),
    createTableColumn<WorkspaceApiKey>({
      columnId: 'createdAt',
      renderHeaderCell: () => 'Created',
      renderCell: (k) => new Date(k.createdAt).toLocaleDateString(),
    }),
    createTableColumn<WorkspaceApiKey>({
      columnId: 'actions',
      renderHeaderCell: () => '',
      renderCell: (k) => (
        <Dialog>
          <DialogTrigger disableButtonEnhancement>
            <Button appearance="subtle" icon={<DeleteRegular />} aria-label={`Revoke ${k.displayName}`} />
          </DialogTrigger>
          <DialogSurface>
            <DialogBody>
              <DialogTitle>Revoke API key?</DialogTitle>
              <DialogContent>
                This will immediately invalidate the key. Any scripts or pipelines using it will
                fail. This action cannot be undone.
              </DialogContent>
              <DialogActions>
                <DialogTrigger disableButtonEnhancement>
                  <Button appearance="secondary">Cancel</Button>
                </DialogTrigger>
                <Button
                  appearance="primary"
                  icon={<DeleteRegular />}
                  onClick={() => onRevoke(k.id)}
                >
                  Revoke key
                </Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      ),
    }),
  ];
}

export default WorkspaceSettingsPage;
