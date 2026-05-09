import {
  Badge,
  Body1,
  Button,
  Caption1,
  Title2,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  KeyRegular,
  LinkRegular,
  PlugDisconnectedRegular,
  RocketRegular,
} from '@fluentui/react-icons';
import { useFabricSdk } from '@/hooks/useFabricSdk';

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
});

export function WorkspaceSettingsPage() {
  const styles = useStyles();
  const sdk = useFabricSdk();

  return (
    <section className={styles.root}>
      <div>
        <Title2>Workspace settings</Title2>
        <Caption1>
          Sprint 6 establishes the workspace-level experience for tiering, API access, Activator,
          and Purview connectivity.
        </Caption1>
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <Caption1>Current tier</Caption1>
              <div className={styles.value}>{sdk.isHosted ? 'Community' : 'Local preview'}</div>
            </div>
            <Badge appearance="filled" color="informative" shape="rounded">
              Pending billing API
            </Badge>
          </div>
          <Body1>
            Enterprise renewal and grace-period telemetry will be wired once tenant settings land
            in the backend.
          </Body1>
          <Body1>
            Workspace: {sdk.workspaceId || 'Not supplied by the host context'}
          </Body1>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <Caption1>Machine-to-machine API key</Caption1>
              <div className={styles.value}>Not generated</div>
            </div>
            <KeyRegular />
          </div>
          <Body1>
            API key issuance is a tenant-controlled enterprise capability. The UI is ready for the
            future backend endpoint without storing secrets in the browser.
          </Body1>
          <Button
            appearance="secondary"
            onClick={() => {
              void sdk.notifyInfo(
                'API key generation pending',
                'Sprint 6 ships the workspace UX only. Secure key issuance requires a server-side tenant settings endpoint.',
              );
            }}
          >
            Request API key
          </Button>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <Caption1>Activator setup</Caption1>
              <div className={styles.value}>Launch later sprint</div>
            </div>
            <RocketRegular />
          </div>
          <Body1>
            The policy editor and Activator routing wizard arrive in Sprint 9. This launcher keeps
            the navigation affordance visible today.
          </Body1>
          <Button
            appearance="primary"
            icon={<LinkRegular />}
            onClick={() => {
              void sdk.notifyInfo(
                'Activator wizard pending',
                'Deep-link support will activate when the Sprint 9 policy editor route is available.',
              );
            }}
          >
            Open Activator setup
          </Button>
        </article>

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
            Purview lineage and catalog linking remain optional. This placeholder status pill keeps
            the workspace surface aligned with the product roadmap.
          </Body1>
        </article>
      </div>
    </section>
  );
}
