import { useCallback, useMemo, useState } from 'react';
import {
  Badge,
  Body1,
  Button,
  Caption1,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Field,
  Input,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Title2,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  CopyRegular,
  DeleteRegular,
  KeyRegular,
  PlugDisconnectedRegular,
  RocketRegular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { createWorkspaceClient } from '@/api/workspaceClient';
import { useFabricSdk } from '@/hooks/useFabricSdk';
import type { CreateApiKeyResponse, WorkspaceApiKey } from '@/models/Workspace';

const SUPPORT_URL = 'https://fabric.orqentis.com/support.html';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    padding: tokens.spacingHorizontalXXL,
  },
  grid: {
    display: 'grid',
    gap: tokens.spacingHorizontalL,
    gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))',
  },
  subtitle: {
    color: tokens.colorNeutralForeground3,
    marginTop: tokens.spacingVerticalXS,
  },
  card: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalL,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    alignItems: 'center',
  },
  value: {
    fontSize: tokens.fontSizeHero700,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightHero700,
  },
  rawKeyBox: {
    fontFamily: 'monospace',
    fontSize: tokens.fontSizeBase200,
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalS}`,
    wordBreak: 'break-all',
  },
  keyWarning: {
    color: tokens.colorPaletteRedForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  tableWrap: {
    overflowX: 'auto',
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

  return (
    <section className={styles.root}>
      <div>
        <Title2>Workspace settings</Title2>
        <Caption1 className={styles.subtitle}>
          Configure workspace access, policy routing, and catalog integrations.
        </Caption1>
      </div>

      <div className={styles.grid}>
        {/* Current tier */}
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <Caption1>Current tier</Caption1>
              <div className={styles.value}>{sdk.isHosted ? 'Community' : 'Developer'}</div>
            </div>
            <Badge appearance="filled" color="informative" shape="rounded">
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
        </article>

        {/* M2M API keys */}
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <Caption1>Machine-to-machine API key</Caption1>
              <div className={styles.value}>{keys?.length ?? '—'} active</div>
            </div>
            <KeyRegular />
          </div>
          <Body1>
            Generate API keys to call the Orqentis API from notebooks, pipelines, or CI/CD without
            interactive Entra login. Keys are scoped to this workspace.
          </Body1>
          <Button appearance="secondary" icon={<KeyRegular />} onClick={openDialog}>
            Manage API keys
          </Button>
        </article>

        {/* Activator setup */}
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <Caption1>Activator setup</Caption1>
              <div className={styles.value}>Policy routing</div>
            </div>
            <RocketRegular />
          </div>
          <Body1>
            Configure which Activator rules fire when a contract is breached. Open a Contract Policy
            item to set triggers, actions, and webhook routing.
          </Body1>
          <Button
            appearance="primary"
            icon={<RocketRegular />}
            onClick={() => navigate('/contracts')}
          >
            Open contracts &amp; policies
          </Button>
        </article>

        {/* Microsoft Purview */}
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <Caption1>Microsoft Purview</Caption1>
              <div className={styles.value}>Disconnected</div>
            </div>
            <PlugDisconnectedRegular />
          </div>
          <Badge appearance="filled" color="warning" shape="rounded">
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
        </article>
      </div>

      {/* API key dialog */}
      <Dialog open={dialogOpen} onOpenChange={(_, d) => setDialogOpen(d.open)}>
        <DialogSurface style={{ maxWidth: 600 }}>
          <DialogBody>
            <DialogTitle>Manage API keys</DialogTitle>
            <DialogContent>
              {newKey && (
                <div style={{ marginBottom: tokens.spacingVerticalM }}>
                  <p className={styles.keyWarning}>
                    Copy this key now — it will not be shown again.
                  </p>
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
                style={{ marginTop: tokens.spacingVerticalS }}
              >
                {isCreating ? 'Generating…' : 'Generate key'}
              </Button>

              {keys && keys.length > 0 && (
                <div className={styles.tableWrap} style={{ marginTop: tokens.spacingVerticalL }}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHeaderCell>Name</TableHeaderCell>
                        <TableHeaderCell>Key hint</TableHeaderCell>
                        <TableHeaderCell>Created</TableHeaderCell>
                        <TableHeaderCell />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {keys.map(k => (
                        <TableRow key={k.id}>
                          <TableCell>{k.displayName}</TableCell>
                          <TableCell>
                            <code>{k.keyHint}</code>
                          </TableCell>
                          <TableCell>{new Date(k.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger disableButtonEnhancement>
                                <Button
                                  appearance="subtle"
                                  icon={<DeleteRegular />}
                                  aria-label="Revoke"
                                />
                              </DialogTrigger>
                              <DialogSurface>
                                <DialogBody>
                                  <DialogTitle>Revoke API key?</DialogTitle>
                                  <DialogContent>
                                    This will immediately invalidate the key. Any scripts or pipelines using it will fail. This action cannot be undone.
                                  </DialogContent>
                                  <DialogActions>
                                    <DialogTrigger disableButtonEnhancement>
                                      <Button appearance="secondary">Cancel</Button>
                                    </DialogTrigger>
                                    <Button
                                      appearance="primary"
                                      icon={<DeleteRegular />}
                                      onClick={() => { void handleRevoke(k.id); }}
                                    >
                                      Revoke key
                                    </Button>
                                  </DialogActions>
                                </DialogBody>
                              </DialogSurface>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
    </section>
  );
}

export default WorkspaceSettingsPage;
