import { makeStyles, tokens } from '@fluentui/react-components';
import {
  Button,
  Body1,
  Body1Strong,
  Caption1,
  Display,
  LargeTitle,
  Title2,
} from '@fluentui/react-components';
import {
  DocumentCheckmarkRegular,
  ShieldCheckmarkRegular,
  ChartMultipleRegular,
  ArrowRightRegular,
  OpenRegular,
  CheckmarkCircleRegular,
  TableLightningRegular,
  DatabaseLinkRegular,
  ClipboardTaskRegular,
  SparkleRegular,
} from '@fluentui/react-icons';

const FABRIC_URL = 'https://app.fabric.microsoft.com/workloadhub/Org.Orqentis';
const GETTING_STARTED_URL = '/docs/getting-started.html';
const SUPPORT_URL = '/support.html';

const useStyles = makeStyles({
  root: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#0a0e1a',
    color: '#ffffff',
    fontFamily: tokens.fontFamilyBase,
    overflowX: 'hidden',
  },

  /* ---- Nav ---- */
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 48px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(12px)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backgroundColor: 'rgba(10,14,26,0.85)',
  },
  navLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  navLogoMark: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #0F6CBD 0%, #115ea3 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ---- Hero ---- */
  hero: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '100px 48px 80px',
    position: 'relative',
  },
  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 16px',
    borderRadius: '999px',
    border: '1px solid rgba(15,108,189,0.5)',
    backgroundColor: 'rgba(15,108,189,0.12)',
    marginBottom: '28px',
    fontSize: '13px',
    color: '#6cb4f5',
    fontWeight: 600,
  },
  heroTitle: {
    maxWidth: '760px',
    lineHeight: '1.1',
    marginBottom: '24px',
    background: 'linear-gradient(135deg, #ffffff 0%, #a8c8f0 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  heroSub: {
    maxWidth: '600px',
    marginBottom: '44px',
    color: 'rgba(255,255,255,0.65)',
    fontSize: '18px',
    lineHeight: '1.6',
  },
  heroActions: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  heroGlow: {
    position: 'absolute',
    top: '60px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '800px',
    height: '400px',
    background: 'radial-gradient(ellipse at center, rgba(15,108,189,0.18) 0%, transparent 70%)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },

  /* ---- Stats Bar ---- */
  statsBar: {
    display: 'flex',
    justifyContent: 'center',
    gap: '64px',
    padding: '40px 48px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    flexWrap: 'wrap',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#0F6CBD',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: '13px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },

  /* ---- Items Section ---- */
  section: {
    padding: '96px 48px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  sectionLabel: {
    color: '#0F6CBD',
    fontWeight: 700,
    fontSize: '13px',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '16px',
  },
  sectionTitle: {
    marginBottom: '16px',
    color: '#ffffff',
  },
  sectionSub: {
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '56px',
    fontSize: '17px',
    maxWidth: '600px',
    lineHeight: '1.6',
  },
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
  },
  quickCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
    marginTop: '24px',
  },
  quickCard: {
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  quickCardTitle: {
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '15px',
  },
  quickCardText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '13px',
    lineHeight: '1.5',
  },
  quickCardActions: {
    display: 'flex',
    justifyContent: 'flex-start',
    marginTop: '6px',
  },
  card: {
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    backdropFilter: 'blur(8px)',
    transition: 'border-color 0.2s, background-color 0.2s',
    ':hover': {
      backgroundColor: 'rgba(15,108,189,0.08)',
    },
  },
  cardIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: 'rgba(15,108,189,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#0F6CBD',
    fontSize: '24px',
  },
  cardTitle: {
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '18px',
    marginBottom: '4px',
  },
  cardBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    backgroundColor: 'rgba(15,108,189,0.25)',
    color: '#6cb4f5',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '8px',
  },
  cardDesc: {
    color: 'rgba(255,255,255,0.6)',
    lineHeight: '1.6',
    fontSize: '14px',
  },

  /* ---- Features ---- */
  featuresBg: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    width: '100%',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '32px',
  },
  feature: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  featureIcon: {
    color: '#0F6CBD',
    fontSize: '28px',
  },
  featureTitle: {
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '16px',
  },
  featureDesc: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: '14px',
    lineHeight: '1.6',
  },

  /* ---- CTA ---- */
  ctaBg: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    padding: '96px 48px',
  },
  ctaBox: {
    maxWidth: '720px',
    width: '100%',
    textAlign: 'center',
    borderRadius: '24px',
    border: '1px solid rgba(15,108,189,0.35)',
    background: 'linear-gradient(135deg, rgba(15,108,189,0.15) 0%, rgba(17,94,163,0.08) 100%)',
    padding: '64px 48px',
    backdropFilter: 'blur(8px)',
  },
  ctaTitle: {
    color: '#ffffff',
    marginBottom: '16px',
  },
  ctaSub: {
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '40px',
    fontSize: '16px',
    lineHeight: '1.6',
  },
  stepGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '18px',
    marginTop: '28px',
  },
  stepCard: {
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: '18px',
  },
  stepNumber: {
    color: '#6cb4f5',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: '8px',
  },
  stepTitle: {
    color: '#ffffff',
    fontWeight: 600,
    marginBottom: '6px',
  },
  stepText: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: '13px',
    lineHeight: '1.5',
  },
  screenshotGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },
  screenshotCard: {
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  screenshotImage: {
    width: '100%',
    height: 'auto',
    display: 'block',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  screenshotBody: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  screenshotTitle: {
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '15px',
  },
  screenshotText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '13px',
    lineHeight: '1.5',
  },

  /* ---- Footer ---- */
  footer: {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    padding: '32px 48px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '13px',
    flexWrap: 'wrap',
    gap: '12px',
  },
});

interface ItemCardProps {
  icon: React.ReactElement;
  title: string;
  description: string;
  badge?: string;
}

function ItemCard({ icon, title, description, badge }: ItemCardProps) {
  const styles = useStyles();
  return (
    <div className={styles.card}>
      <div className={styles.cardIcon}>{icon}</div>
      <div>
        {badge ? <span className={styles.cardBadge}>{badge}</span> : null}
        <div className={styles.cardTitle}>{title}</div>
      </div>
      <Body1 className={styles.cardDesc}>{description}</Body1>
    </div>
  );
}

interface FeatureProps {
  icon: React.ReactElement;
  title: string;
  description: string;
}

function Feature({ icon, title, description }: FeatureProps) {
  const styles = useStyles();
  return (
    <div className={styles.feature}>
      <div className={styles.featureIcon}>{icon}</div>
      <div className={styles.featureTitle}>{title}</div>
      <div className={styles.featureDesc}>{description}</div>
    </div>
  );
}

export function LandingPage() {
  const styles = useStyles();
  const openExternal = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');
  const productShots = [
    {
      src: '/images/screenshots/fabric-contract-editor.png',
      alt: 'Orqentis Showcase Contract editor running inside Microsoft Fabric',
      title: 'Active contract editor in Fabric',
      text: 'The production Fabric item restores the active Orqentis Showcase Contract, including Lakehouse/table selectors, validation, and schema preview.',
    },
    {
      src: '/images/screenshots/fabric-contract-report.png',
      alt: 'Orqentis Contract Report item running inside Microsoft Fabric',
      title: 'Persisted enforcement report',
      text: 'The report item shows the real persisted OWID CO2 enforcement run with passed status, breach score, and run timestamp.',
    },
    {
      src: '/images/screenshots/fabric-lakehouse-table.png',
      alt: 'Orqentis showcase Lakehouse table open in Microsoft Fabric',
      title: 'Real Lakehouse table evidence',
      text: 'The showcase Lakehouse contains the owid_co2_demo Delta table with 25 public OWID rows used by the live contract.',
    },
  ];

  return (
    <div className={styles.root}>
      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navLogo}>
          <div className={styles.navLogoMark}>
            <DocumentCheckmarkRegular style={{ fontSize: 20, color: '#fff' }} />
          </div>
          <Body1Strong style={{ color: '#fff', fontSize: 18 }}>Orqentis</Body1Strong>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button appearance="secondary" onClick={() => openExternal(GETTING_STARTED_URL)}>
            Getting started
          </Button>
          <Button
            appearance="primary"
            icon={<OpenRegular />}
            iconPosition="after"
            onClick={() => openExternal(FABRIC_URL)}
          >
            Open in Fabric
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <SparkleRegular style={{ fontSize: 14 }} />
            AI-native contract intelligence for Microsoft Fabric
          </div>
          <Display className={styles.heroTitle}>
            The AI control plane for trusted Fabric data products
          </Display>
          <div className={styles.heroSub}>
            Orqentis binds contracts across Lakehouses, Warehouses, Eventhouse/KQL databases,
            Semantic Models, and Fabric SQL using delegated Fabric adapters, while AI drafts
            contracts, explains risk, and recommends remediation.
          </div>
          <div className={styles.heroActions}>
            <Button
              appearance="primary"
              size="large"
              icon={<ArrowRightRegular />}
              iconPosition="after"
              onClick={() => openExternal(FABRIC_URL)}
            >
              Open in Fabric
            </Button>
            <Button
              appearance="secondary"
              size="large"
              icon={<ClipboardTaskRegular />}
              onClick={() => openExternal(GETTING_STARTED_URL)}
            >
              Getting started
            </Button>
            <Button
              appearance="outline"
              size="large"
              style={{ borderColor: 'rgba(255,255,255,0.25)', color: '#fff' }}
              onClick={() => openExternal(SUPPORT_URL)}
            >
              Support
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statValue}>5</span>
          <span className={styles.statLabel}>Fabric target types</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>25</span>
          <span className={styles.statLabel}>OWID Delta rows</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>AI</span>
          <span className={styles.statLabel}>Author / score / remediate</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>ODCS v3.1.0</span>
          <span className={styles.statLabel}>Schema standard</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <section className={styles.section}>
          <div className={styles.sectionLabel}>AI value proposition</div>
          <Title2 className={styles.sectionTitle}>From static contracts to AI-assisted governance</Title2>
          <div className={styles.sectionSub}>
            The investable wedge is not "AI writes YAML". It is a governed feedback loop that helps
            Fabric teams create contracts faster, understand blast radius, and move from breach
            detection to recommended action.
          </div>
          <div className={styles.cards}>
            <ItemCard
              badge="Author"
              icon={<SparkleRegular />}
              title="Contract co-author"
              description="Generate ODCS drafts from Fabric target metadata and let teams refine the contract instead of starting from a blank YAML file."
            />
            <ItemCard
              badge="Prioritize"
              icon={<ChartMultipleRegular />}
              title="Breach impact scoring"
              description="Convert validation failures into explainable risk scores so data teams know which issues threaten downstream analytics, SLAs, and executive reports first."
            />
            <ItemCard
              badge="Resolve"
              icon={<ClipboardTaskRegular />}
              title="Remediation advisor"
              description="Translate schema, freshness, and quality failures into concrete producer actions, reducing mean time to restore trusted data products."
            />
            <ItemCard
              badge="Ask"
              icon={<DatabaseLinkRegular />}
              title="Natural-language governance"
              description="Let platform owners query contracts, owners, runs, and policies in plain English across Fabric workspaces instead of spelunking YAML and logs."
            />
          </div>
        </section>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <section className={styles.section}>
          <div className={styles.sectionLabel}>Quick start</div>
          <Title2 className={styles.sectionTitle}>Launch in three steps</Title2>
          <div className={styles.sectionSub}>
            This is the verified path in the production showcase workspace.
          </div>
          <div className={styles.stepGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>Step 1</div>
                <div className={styles.stepTitle}>Create or import a contract</div>
                <div className={styles.stepText}>
                  Open the Orqentis Showcase Contract and bind it to the OWID CO2 Delta table.
              </div>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>Step 2</div>
                <div className={styles.stepTitle}>Define enforcement policy</div>
                <div className={styles.stepText}>
                  Attach policy configuration for enforcement thresholds and alert routing.
              </div>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>Step 3</div>
                <div className={styles.stepTitle}>Run and triage</div>
                <div className={styles.stepText}>
                  Review the persisted Contract Report and Lakehouse data used by the run.
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Browser captures */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <section className={styles.section}>
          <div className={styles.sectionLabel}>Production evidence</div>
          <Title2 className={styles.sectionTitle}>Screenshots from the live Fabric tenant</Title2>
          <div className={styles.sectionSub}>
            Captured from Microsoft Fabric after the latest production deployment, not mock standalone routes.
          </div>
          <div className={styles.screenshotGrid}>
            {productShots.map((shot) => (
              <article className={styles.screenshotCard} key={shot.src}>
                <img className={styles.screenshotImage} src={shot.src} alt={shot.alt} loading="lazy" />
                <div className={styles.screenshotBody}>
                  <div className={styles.screenshotTitle}>{shot.title}</div>
                  <div className={styles.screenshotText}>{shot.text}</div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {/* Workload Items */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <section className={styles.section}>
          <div className={styles.sectionLabel}>Fabric workload items</div>
          <Title2 className={styles.sectionTitle}>Three items, one workflow</Title2>
          <div className={styles.sectionSub}>
            Create, enforce, and audit data contracts end-to-end without leaving Microsoft Fabric.
          </div>
          <div className={styles.cards}>
            <ItemCard
              badge="Fabric item"
              icon={<DocumentCheckmarkRegular />}
              title="Data Contract"
              description="Author and restore ODCS v3.1.0 contracts with Lakehouse/table dropdowns, Monaco YAML, and inline JSON Schema validation."
            />
            <ItemCard
              badge="Fabric item"
              icon={<ShieldCheckmarkRegular />}
              title="Contract Policy"
              description="Configure enforcement thresholds and policy routing for contract breach handling."
            />
            <ItemCard
              badge="Fabric item"
              icon={<ChartMultipleRegular />}
              title="Contract Report"
              description="Open persisted run history with status, breach score, trigger timestamp, and audit drill-through."
            />
          </div>
        </section>
      </div>

      {/* Features */}
      <div className={styles.featuresBg}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <section className={styles.section}>
            <div className={styles.sectionLabel}>Platform capabilities</div>
            <Title2 className={styles.sectionTitle}>Built for the Fabric ecosystem</Title2>
            <div className={styles.sectionSub}>
              Orqentis uses Fabric's extensibility APIs, OneLake OBO tokens, and native Fluent UI theming.
            </div>
            <div className={styles.featuresGrid}>
              <Feature
                icon={<ShieldCheckmarkRegular style={{ fontSize: 28 }} />}
                title="OBO token security"
                description="Every Delta read uses the calling user's delegated On-Behalf-Of token. Application identity never touches data-plane operations."
              />
              <Feature
                icon={<TableLightningRegular style={{ fontSize: 28 }} />}
                title="AI governance loop"
                description="AI-assisted authoring, breach scoring, remediation, and natural-language query are implemented with timeout, retry, and fallback behavior."
              />
              <Feature
                icon={<DatabaseLinkRegular style={{ fontSize: 28 }} />}
                title="Delta table enforcement"
                description="Enforcement runs read live Delta log snapshots from OneLake and evaluate schema, freshness, nullability, and custom rule sets."
              />
              <Feature
                icon={<CheckmarkCircleRegular style={{ fontSize: 28 }} />}
                title="ODCS v3.1.0 standard"
                description="Contracts are validated against the Open Data Contract Standard v3.1.0 JSON Schema. Non-conformant YAML is never persisted as active."
              />
              <Feature
                icon={<ArrowRightRegular style={{ fontSize: 28 }} />}
                title="Activator integration"
                description="Policy-based breach dispatch supports Activator/webhook-style routing with correlation-aware logging."
              />
              <Feature
                icon={<ChartMultipleRegular style={{ fontSize: 28 }} />}
                title="Correlation tracing"
                description="Every API response carries X-Correlation-Id, propagated to all downstream calls — OpenAI, OneLake, Activator — for end-to-end observability."
              />
            </div>

            <div className={styles.quickCards}>
              <div className={styles.quickCard}>
                <div className={styles.quickCardTitle}>Contracts</div>
                <div className={styles.quickCardText}>Author, validate, activate, and run ODCS contracts.</div>
                <div className={styles.quickCardActions}>
                  <Button size="small" appearance="secondary" onClick={() => openExternal(FABRIC_URL)}>
                    Open in Fabric
                  </Button>
                </div>
              </div>
              <div className={styles.quickCard}>
                <div className={styles.quickCardTitle}>Policies</div>
                <div className={styles.quickCardText}>Configure thresholds and dispatch channels per workspace.</div>
                <div className={styles.quickCardActions}>
                  <Button size="small" appearance="secondary" onClick={() => openExternal(GETTING_STARTED_URL)}>
                    Learn more
                  </Button>
                </div>
              </div>
              <div className={styles.quickCard}>
                <div className={styles.quickCardTitle}>Alerts</div>
                <div className={styles.quickCardText}>Review recent breaches and operational routing outcomes.</div>
                <div className={styles.quickCardActions}>
                  <Button size="small" appearance="secondary" onClick={() => openExternal(SUPPORT_URL)}>
                    Support
                  </Button>
                </div>
              </div>
              <div className={styles.quickCard}>
                <div className={styles.quickCardTitle}>AI query</div>
                <div className={styles.quickCardText}>Ask natural-language questions across contract metadata.</div>
                <div className={styles.quickCardActions}>
                  <Button size="small" appearance="secondary" onClick={() => openExternal(GETTING_STARTED_URL)}>
                    Learn more
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* CTA */}
      <div className={styles.ctaBg}>
        <div className={styles.ctaBox}>
          <LargeTitle className={styles.ctaTitle}>Ready to enforce your first contract?</LargeTitle>
          <div className={styles.ctaSub}>
            Orqentis is live in your Microsoft Fabric tenant. Open your workspace, click{' '}
            <strong style={{ color: '#fff' }}>+ New item</strong>, and select{' '}
            <strong style={{ color: '#fff' }}>Data Contract</strong>.
          </div>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              appearance="primary"
              size="large"
              icon={<ArrowRightRegular />}
              iconPosition="after"
              onClick={() => openExternal(FABRIC_URL)}
            >
              Open in Fabric
            </Button>
            <Button
              appearance="outline"
              size="large"
              icon={<ClipboardTaskRegular />}
              style={{ borderColor: 'rgba(255,255,255,0.25)', color: '#fff' }}
              onClick={() => openExternal(GETTING_STARTED_URL)}
            >
              View guide
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: 'linear-gradient(135deg, #0F6CBD, #115ea3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DocumentCheckmarkRegular style={{ fontSize: 12, color: '#fff' }} />
          </div>
          <span>Orqentis · Microsoft Fabric ISV Workload</span>
        </div>
        <Caption1 style={{ color: 'rgba(255,255,255,0.35)' }}>
          © {new Date().getFullYear()} Orqentis. ODCS v3.1.0 enforced.
        </Caption1>
      </footer>
    </div>
  );
}
