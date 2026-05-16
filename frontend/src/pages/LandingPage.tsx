import { makeStyles, tokens } from '@fluentui/react-components';
import {
  Button,
  Body1Strong,
  Caption1,
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
  LockClosedRegular,
  AlertRegular,
  BrainCircuitRegular,
  CodeRegular,
  LayerRegular,
} from '@fluentui/react-icons';

const FABRIC_URL = 'https://app.fabric.microsoft.com/workloadhub/Org.Orqentis';
const GETTING_STARTED_URL = '/docs/getting-started.html';
const SUPPORT_URL = '/support.html';
const GITHUB_URL = 'https://github.com/mjtpena/fabric-contract-intelligence';

/* ─────────────────────────────────────────────────────────────────────────────
   Styles
───────────────────────────────────────────────────────────────────────────── */
const useStyles = makeStyles({
  root: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#060912',
    color: '#ffffff',
    fontFamily: tokens.fontFamilyBase,
    overflowX: 'hidden',
  },

  /* NAV */
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 56px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    backdropFilter: 'blur(16px)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backgroundColor: 'rgba(6,9,18,0.9)',
  },
  navLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textDecoration: 'none',
  },
  navLogoMark: {
    width: '34px',
    height: '34px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #0F6CBD 0%, #3a96dd 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  navLinkText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '14px',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    textDecoration: 'none',
    ':hover': { color: '#fff', backgroundColor: 'rgba(255,255,255,0.06)' },
  },

  /* HERO */
  hero: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '88px 48px 0',
    position: 'relative',
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '900px',
    height: '500px',
    background: 'radial-gradient(ellipse at 50% 0%, rgba(15,108,189,0.22) 0%, transparent 68%)',
    pointerEvents: 'none',
  },
  heroGlow2: {
    position: 'absolute',
    top: '120px',
    left: '20%',
    width: '400px',
    height: '300px',
    background: 'radial-gradient(ellipse, rgba(100,60,200,0.08) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: '820px',
  },
  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 14px',
    borderRadius: '999px',
    border: '1px solid rgba(15,108,189,0.45)',
    backgroundColor: 'rgba(15,108,189,0.1)',
    marginBottom: '28px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#6cb4f5',
    letterSpacing: '0.03em',
  },
  heroHeadline: {
    fontSize: 'clamp(38px, 5.5vw, 68px)',
    fontWeight: 800,
    lineHeight: 1.08,
    letterSpacing: '-0.025em',
    marginBottom: '24px',
    background: 'linear-gradient(160deg, #ffffff 30%, #7ab8e8 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  heroSub: {
    fontSize: '19px',
    lineHeight: '1.65',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '44px',
    maxWidth: '620px',
  },
  heroActions: {
    display: 'flex',
    gap: '14px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: '64px',
  },

  /* BROWSER CHROME MOCKUP */
  browserWrap: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: '1100px',
    margin: '0 auto',
    borderRadius: '14px 14px 0 0',
    border: '1px solid rgba(255,255,255,0.12)',
    borderBottom: 'none',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
    overflow: 'hidden',
    boxShadow: '0 -20px 80px rgba(15,108,189,0.15), 0 0 0 1px rgba(255,255,255,0.05)',
  },
  browserBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 18px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  browserDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  browserUrl: {
    flex: 1,
    height: '22px',
    borderRadius: '6px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 10px',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.35)',
    marginLeft: '8px',
    fontFamily: tokens.fontFamilyMonospace,
  },
  browserScreenshot: {
    width: '100%',
    display: 'block',
    objectFit: 'cover',
  },

  /* TRUST BAR */
  trustBar: {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.015)',
    padding: '24px 48px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0px',
    flexWrap: 'wrap',
  },
  trustItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 28px',
    color: 'rgba(255,255,255,0.45)',
    fontSize: '13px',
    fontWeight: 500,
    borderRight: '1px solid rgba(255,255,255,0.08)',
    ':last-child': { borderRight: 'none' },
  },
  trustItemIcon: {
    color: '#0F6CBD',
    fontSize: '16px',
    flexShrink: 0,
  },

  /* SECTION BASE */
  sectionWrapper: {
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
  },
  section: {
    padding: '96px 56px',
    maxWidth: '1160px',
    width: '100%',
    boxSizing: 'border-box',
  },
  sectionNarrow: {
    padding: '96px 56px',
    maxWidth: '860px',
    width: '100%',
    boxSizing: 'border-box',
    textAlign: 'center',
    margin: '0 auto',
  },
  eyebrow: {
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: '#0F6CBD',
    marginBottom: '16px',
  },
  heading2: {
    fontSize: 'clamp(28px, 3.5vw, 42px)',
    fontWeight: 800,
    lineHeight: 1.15,
    letterSpacing: '-0.02em',
    color: '#fff',
    marginBottom: '20px',
  },
  headingSub: {
    fontSize: '17px',
    lineHeight: '1.65',
    color: 'rgba(255,255,255,0.55)',
    maxWidth: '540px',
    marginBottom: '56px',
  },

  /* PROBLEM CARDS */
  problemGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
  },
  problemCard: {
    borderRadius: '16px',
    border: '1px solid rgba(255,80,80,0.15)',
    backgroundColor: 'rgba(255,40,40,0.04)',
    padding: '28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  problemIcon: {
    fontSize: '22px',
    color: '#ff6b6b',
    marginBottom: '4px',
  },
  problemTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#fff',
  },
  problemText: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: 'rgba(255,255,255,0.55)',
  },

  /* ALTERNATING FEATURE ROWS */
  featureRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '64px',
    alignItems: 'center',
    marginBottom: '96px',
    ':last-child': { marginBottom: 0 },
  },
  featureRowReverse: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '64px',
    alignItems: 'center',
    marginBottom: '96px',
    direction: 'rtl' as const,
  },
  featureRowText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    direction: 'ltr' as const,
  },
  featureTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: '999px',
    border: '1px solid rgba(15,108,189,0.4)',
    backgroundColor: 'rgba(15,108,189,0.1)',
    fontSize: '12px',
    fontWeight: 700,
    color: '#6cb4f5',
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    width: 'fit-content',
  },
  featureHeading: {
    fontSize: '28px',
    fontWeight: 800,
    lineHeight: 1.2,
    color: '#fff',
    letterSpacing: '-0.015em',
  },
  featureBody: {
    fontSize: '16px',
    lineHeight: '1.7',
    color: 'rgba(255,255,255,0.58)',
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '4px',
  },
  featureListItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    fontSize: '14px',
    color: 'rgba(255,255,255,0.65)',
    lineHeight: '1.5',
  },
  featureListCheck: {
    color: '#0F6CBD',
    fontSize: '16px',
    flexShrink: 0,
    marginTop: '1px',
  },
  featureImageWrap: {
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.1)',
    overflow: 'hidden',
    direction: 'ltr' as const,
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
  },
  featureImage: {
    width: '100%',
    display: 'block',
  },

  /* ITEMS CARDS */
  itemsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '24px',
  },
  itemCard: {
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    transition: 'border-color 0.2s, background-color 0.2s',
    ':hover': {
      backgroundColor: 'rgba(15,108,189,0.06)',
    },
  },
  itemCardIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: 'rgba(15,108,189,0.18)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#3a96dd',
    fontSize: '24px',
  },
  itemCardBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    backgroundColor: 'rgba(15,108,189,0.2)',
    color: '#6cb4f5',
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    marginBottom: '6px',
    width: 'fit-content',
  },
  itemCardTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#fff',
  },
  itemCardDesc: {
    fontSize: '14px',
    lineHeight: '1.65',
    color: 'rgba(255,255,255,0.55)',
  },

  /* PLATFORM FEATURES GRID */
  platformBg: {
    backgroundColor: 'rgba(255,255,255,0.018)',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    width: '100%',
  },
  platformGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '2px',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '16px',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginTop: '0px',
  },
  platformCell: {
    backgroundColor: '#0a0f1e',
    padding: '32px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  platformIcon: {
    color: '#0F6CBD',
    fontSize: '26px',
    marginBottom: '4px',
  },
  platformTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#fff',
  },
  platformDesc: {
    fontSize: '13px',
    lineHeight: '1.6',
    color: 'rgba(255,255,255,0.5)',
  },

  /* STATS STRIP */
  statsStrip: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0',
    padding: '0',
    backgroundColor: 'rgba(15,108,189,0.08)',
    borderTop: '1px solid rgba(15,108,189,0.2)',
    borderBottom: '1px solid rgba(15,108,189,0.2)',
    flexWrap: 'wrap',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '36px 56px',
    borderRight: '1px solid rgba(15,108,189,0.15)',
    ':last-child': { borderRight: 'none' },
  },
  statNum: {
    fontSize: '38px',
    fontWeight: 800,
    color: '#3a96dd',
    lineHeight: 1,
    marginBottom: '6px',
  },
  statLabel: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
    fontWeight: 600,
    textAlign: 'center' as const,
  },

  /* HOW IT WORKS */
  stepsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '2px',
    position: 'relative',
  },
  step: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    padding: '36px',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    position: 'relative',
  },
  stepNum: {
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: '#0F6CBD',
    marginBottom: '4px',
  },
  stepTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#fff',
  },
  stepText: {
    fontSize: '14px',
    lineHeight: '1.65',
    color: 'rgba(255,255,255,0.55)',
  },
  stepConnector: {
    position: 'absolute',
    top: '50px',
    right: '-18px',
    color: 'rgba(255,255,255,0.15)',
    zIndex: 2,
    fontSize: '20px',
  },

  /* CTA */
  ctaWrap: {
    display: 'flex',
    justifyContent: 'center',
    padding: '0 48px 96px',
  },
  ctaBox: {
    maxWidth: '780px',
    width: '100%',
    textAlign: 'center',
    borderRadius: '24px',
    border: '1px solid rgba(15,108,189,0.3)',
    background:
      'linear-gradient(135deg, rgba(15,108,189,0.14) 0%, rgba(17,50,100,0.1) 100%)',
    padding: '72px 56px',
    position: 'relative',
    overflow: 'hidden',
  },
  ctaGlow: {
    position: 'absolute',
    top: '-60px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '500px',
    height: '300px',
    background:
      'radial-gradient(ellipse, rgba(15,108,189,0.2) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  ctaHeading: {
    fontSize: '36px',
    fontWeight: 800,
    color: '#fff',
    lineHeight: 1.15,
    marginBottom: '16px',
    position: 'relative',
  },
  ctaSub: {
    fontSize: '17px',
    color: 'rgba(255,255,255,0.58)',
    lineHeight: '1.65',
    marginBottom: '40px',
    position: 'relative',
  },
  ctaButtons: {
    display: 'flex',
    gap: '14px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    position: 'relative',
  },

  /* FOOTER */
  footer: {
    borderTop: '1px solid rgba(255,255,255,0.07)',
    padding: '32px 56px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: 'rgba(255,255,255,0.35)',
    fontSize: '13px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  footerLinks: {
    display: 'flex',
    gap: '24px',
  },
  footerLink: {
    color: 'rgba(255,255,255,0.35)',
    textDecoration: 'none',
    ':hover': { color: 'rgba(255,255,255,0.7)' },
  },
});

/* ─────────────────────────────────────────────────────────────────────────────
   Small reusable components
───────────────────────────────────────────────────────────────────────────── */

function BrowserMockup({ src, alt }: { src: string; alt: string }) {
  const styles = useStyles();
  return (
    <div className={styles.browserWrap}>
      <div className={styles.browserBar}>
        <div className={styles.browserDot} style={{ backgroundColor: '#ff5f57' }} />
        <div className={styles.browserDot} style={{ backgroundColor: '#ffbd2e' }} />
        <div className={styles.browserDot} style={{ backgroundColor: '#28c840' }} />
        <div className={styles.browserUrl}>
          app.fabric.microsoft.com · Orqentis Showcase
        </div>
      </div>
      <img src={src} alt={alt} className={styles.browserScreenshot} loading="eager" />
    </div>
  );
}

interface FeatureRowProps {
  eyebrow: string;
  heading: string;
  body: string;
  bullets: string[];
  imgSrc: string;
  imgAlt: string;
  reverse?: boolean;
  tag?: React.ReactElement;
}

function FeatureRow({ eyebrow, heading, body, bullets, imgSrc, imgAlt, reverse }: FeatureRowProps) {
  const styles = useStyles();
  const text = (
    <div className={styles.featureRowText}>
      <span className={styles.eyebrow}>{eyebrow}</span>
      <div className={styles.featureHeading}>{heading}</div>
      <div className={styles.featureBody}>{body}</div>
      <div className={styles.featureList}>
        {bullets.map((b) => (
          <div key={b} className={styles.featureListItem}>
            <CheckmarkCircleRegular className={styles.featureListCheck} />
            <span>{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
  const image = (
    <div className={styles.featureImageWrap}>
      <img src={imgSrc} alt={imgAlt} className={styles.featureImage} loading="lazy" />
    </div>
  );
  return (
    <div className={reverse ? styles.featureRowReverse : styles.featureRow}>
      {text}
      {image}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────────────────────── */
export function LandingPage() {
  const styles = useStyles();
  const open = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

  return (
    <div className={styles.root}>

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav className={styles.nav}>
        <div className={styles.navLogo}>
          <div className={styles.navLogoMark}>
            <DocumentCheckmarkRegular style={{ fontSize: 18, color: '#fff' }} />
          </div>
          <Body1Strong style={{ color: '#fff', fontSize: 17 }}>Orqentis</Body1Strong>
        </div>
        <div className={styles.navLinks}>
          <a className={styles.navLinkText} href={GETTING_STARTED_URL} target="_blank" rel="noopener noreferrer">Docs</a>
          <a className={styles.navLinkText} href={GITHUB_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
          <a className={styles.navLinkText} href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">Support</a>
          <Button
            appearance="primary"
            icon={<OpenRegular />}
            iconPosition="after"
            size="small"
            style={{ marginLeft: 8 }}
            onClick={() => open(FABRIC_URL)}
          >
            Open in Fabric
          </Button>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroGlow2} />
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <SparkleRegular style={{ fontSize: 13 }} />
            Native Microsoft Fabric Workload · ODCS v3.1.0
          </div>
          <h1 className={styles.heroHeadline}>
            Data contracts that<br />live inside Fabric
          </h1>
          <p className={styles.heroSub}>
            Orqentis enforces Open Data Contract Standard contracts at the Delta table layer —
            authored by AI, validated in real-time, and visible across every Fabric workspace.
            No external pipelines. No YAML spelunking.
          </p>
          <div className={styles.heroActions}>
            <Button
              appearance="primary"
              size="large"
              icon={<ArrowRightRegular />}
              iconPosition="after"
              onClick={() => open(FABRIC_URL)}
            >
              Get started free
            </Button>
            <Button
              appearance="secondary"
              size="large"
              icon={<ClipboardTaskRegular />}
              onClick={() => open(GETTING_STARTED_URL)}
            >
              View documentation
            </Button>
          </div>
        </div>
        <BrowserMockup
          src="/images/screenshots/fabric-contract-editor.png"
          alt="Orqentis contract editor open inside Microsoft Fabric showing a YAML data contract with live validation"
        />
      </section>

      {/* ── TRUST BAR ────────────────────────────────────────────────────── */}
      <div className={styles.trustBar}>
        {[
          { icon: <TableLightningRegular />, text: 'Lakehouse · Warehouse · Eventhouse · SQL DB' },
          { icon: <LockClosedRegular />, text: 'OBO token — no app identity on data plane' },
          { icon: <CodeRegular />, text: 'ODCS v3.1.0 JSON Schema enforced' },
          { icon: <BrainCircuitRegular />, text: 'GPT-4o authoring, scoring & remediation' },
          { icon: <LayerRegular />, text: 'Fabric-native Fluent UI theming' },
        ].map(({ icon, text }) => (
          <div key={text} className={styles.trustItem}>
            <span className={styles.trustItemIcon}>{icon}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>

      {/* ── PROBLEM ──────────────────────────────────────────────────────── */}
      <div className={styles.sectionWrapper}>
        <div className={styles.section}>
          <div className={styles.eyebrow}>The problem</div>
          <h2 className={styles.heading2}>Data quality issues cost millions — and stay invisible</h2>
          <div className={styles.headingSub}>
            Most data teams detect contract breaches in dashboards, not at the source.
            By then, downstream consumers are already wrong.
          </div>
          <div className={styles.problemGrid}>
            {[
              {
                icon: <AlertRegular />,
                title: 'Breaches discovered downstream',
                text: 'Schema changes, null fields, and stale data surface in executive reports — hours or days after the damage is done.',
              },
              {
                icon: <DatabaseLinkRegular />,
                title: 'Contracts live outside your data platform',
                text: 'Spreadsheets, Confluence pages, and standalone YAML repos have no runtime connection to your actual Delta tables.',
              },
              {
                icon: <ClipboardTaskRegular />,
                title: 'Governance is manual and tribal',
                text: 'Data producers and consumers rely on Slack threads and emails to agree on data shape. No audit trail. No enforcement.',
              },
            ].map(({ icon, title, text }) => (
              <div key={title} className={styles.problemCard}>
                <div className={styles.problemIcon}>{icon}</div>
                <div className={styles.problemTitle}>{title}</div>
                <div className={styles.problemText}>{text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── STATS STRIP ──────────────────────────────────────────────────── */}
      <div className={styles.statsStrip}>
        {[
          { num: '5', label: 'Fabric target types' },
          { num: 'ODCS v3.1', label: 'Contract standard' },
          { num: '< 15s', label: 'AI response SLA' },
          { num: '3', label: 'Native Fabric items' },
          { num: 'OBO', label: 'Zero app-identity on data plane' },
        ].map(({ num, label }) => (
          <div key={label} className={styles.statItem}>
            <div className={styles.statNum}>{num}</div>
            <div className={styles.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── FEATURE ROWS ─────────────────────────────────────────────────── */}
      <div className={styles.sectionWrapper}>
        <div className={styles.section} style={{ paddingBottom: 0 }}>
          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <div className={styles.eyebrow}>How it works</div>
            <h2 className={styles.heading2}>
              Author, enforce, and audit — without leaving Fabric
            </h2>
          </div>

          <FeatureRow
            eyebrow="Contract editor"
            heading="Monaco YAML editor with live ODCS validation"
            body="Write or paste your ODCS v3.1.0 contract directly inside the Fabric portal. Every keystroke is validated against the full JSON Schema, with inline markers, hover tooltips, and field autocomplete."
            bullets={[
              'Schema preview pulls real column names from your Delta table',
              'Validation panel shows errors with line pointers before you save',
              'AI Improve rewrites failing sections with one click',
              'Version history tracks every change with timestamp and author',
            ]}
            imgSrc="/images/screenshots/fabric-contract-editor.png"
            imgAlt="Monaco YAML editor inside Fabric showing ODCS contract validation"
          />

          <FeatureRow
            eyebrow="Enforcement reports"
            heading="Every run persisted as a native Fabric report item"
            body="When a contract runs — on schedule, on demand, or triggered by a pipeline — the result is stored as a Contract Report item in your workspace. Breach score, rule-by-rule results, and remediation hints in one place."
            bullets={[
              'Breach score 0–100 with rule-level drill-through',
              'Run history with timestamp, trigger source, and duration',
              'Download full JSON audit log for compliance workflows',
              'Webhook dispatch via policy routing on breach threshold',
            ]}
            imgSrc="/images/screenshots/fabric-contract-report.png"
            imgAlt="Contract enforcement report showing breach score and run history"
            reverse
          />

          <FeatureRow
            eyebrow="Fabric workspace"
            heading="Three native item types — one coherent workflow"
            body="Orqentis registers Data Contract, Contract Policy, and Contract Report as first-class Fabric item types. They appear in your workspace alongside Lakehouses, Notebooks, and Pipelines — no external portals."
            bullets={[
              'Fabric item permissions inherit workspace RBAC automatically',
              'Items are searchable in Fabric universal search',
              'Lineage graph connects contracts to their target Delta tables',
              'Open via Fabric workload hub — one-click install for every tenant',
            ]}
            imgSrc="/images/screenshots/fabric-workspace.png"
            imgAlt="Microsoft Fabric workspace showing Orqentis contract and report items"
          />

          <FeatureRow
            eyebrow="AI authoring"
            heading="GPT-4o drafts contracts from your table metadata"
            body="Point AI Suggest at any Lakehouse table and it reads the Delta log schema, row counts, null rates, and sample values — then generates a complete ODCS draft. You review and activate; AI does the boilerplate."
            bullets={[
              'Reads live Delta metadata from OneLake via OBO token',
              'Generates schema, freshness, and quality rule sections',
              'Fallback templates keep authoring responsive during provider timeouts',
              '15-second SLA with retry/backoff — never blocks the UI',
            ]}
            imgSrc="/images/screenshots/ai-suggest-workflow.png"
            imgAlt="AI Suggest workflow generating ODCS contract from Delta table schema"
            reverse
          />
        </div>
      </div>

      {/* ── FABRIC ITEMS ─────────────────────────────────────────────────── */}
      <div className={styles.sectionWrapper}>
        <div className={styles.section}>
          <div className={styles.eyebrow}>Fabric workload items</div>
          <h2 className={styles.heading2}>Three items. One workflow.</h2>
          <div className={styles.headingSub}>
            Install once from the Fabric workload hub. All three items appear natively in every workspace.
          </div>
          <div className={styles.itemsGrid}>
            {[
              {
                icon: <DocumentCheckmarkRegular />,
                badge: 'Fabric item',
                title: 'Data Contract',
                desc: 'Author ODCS v3.1.0 contracts with Monaco YAML, inline JSON Schema validation, AI authoring, Lakehouse/Warehouse table pickers, and one-click activation.',
              },
              {
                icon: <ShieldCheckmarkRegular />,
                badge: 'Fabric item',
                title: 'Contract Policy',
                desc: 'Configure enforcement schedules, breach thresholds, alert routing channels, and policy behavior per workspace. Supports Activator webhooks.',
              },
              {
                icon: <ChartMultipleRegular />,
                badge: 'Fabric item',
                title: 'Contract Report',
                desc: 'Persisted run history with breach score 0–100, rule-by-rule drill-through, trigger source, duration, and downloadable JSON audit log.',
              },
            ].map(({ icon, badge, title, desc }) => (
              <div key={title} className={styles.itemCard}>
                <div className={styles.itemCardIcon}>{icon}</div>
                <div>
                  <div className={styles.itemCardBadge}>{badge}</div>
                  <div className={styles.itemCardTitle}>{title}</div>
                </div>
                <div className={styles.itemCardDesc}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PLATFORM FEATURES ────────────────────────────────────────────── */}
      <div className={styles.platformBg}>
        <div className={styles.sectionWrapper}>
          <div className={styles.section}>
            <div className={styles.eyebrow}>Platform engineering</div>
            <h2 className={styles.heading2}>Built for enterprise Fabric deployments</h2>
            <div className={styles.platformGrid}>
              {[
                {
                  icon: <LockClosedRegular />,
                  title: 'OBO-only data plane',
                  desc: 'Every Delta read and OneLake write uses the calling user\'s delegated On-Behalf-Of token. Application identity never touches data. Entra ID end-to-end.',
                },
                {
                  icon: <TableLightningRegular />,
                  title: 'Delta enforcement engine',
                  desc: 'Reads live Delta log snapshots from OneLake. Evaluates schema types, nullability, row freshness, and custom rule sets against the ODCS contract.',
                },
                {
                  icon: <SparkleRegular />,
                  title: 'AI with guaranteed fallback',
                  desc: 'All LLM calls use a 15-second timeout, retry safely, and fall back to a deterministic template when providers are unavailable.',
                },
                {
                  icon: <DatabaseLinkRegular />,
                  title: 'X-Correlation-Id tracing',
                  desc: 'Generated in middleware, propagated to OpenAI, OneLake, and Activator calls. Echoed in every API response header and logged on every Serilog entry.',
                },
                {
                  icon: <AlertRegular />,
                  title: 'Activator integration',
                  desc: 'Policy-based breach dispatch routes alerts to Teams, email, or any webhook endpoint via Fabric Activator. Configurable per contract, per workspace.',
                },
                {
                  icon: <CheckmarkCircleRegular />,
                  title: 'Soft-delete + audit trail',
                  desc: 'No destructive deletes. Every mutation records deleted_at timestamp with actor. Default EF Core query filters hide deleted rows automatically.',
                },
              ].map(({ icon, title, desc }) => (
                <div key={title} className={styles.platformCell}>
                  <div className={styles.platformIcon}>{icon}</div>
                  <div className={styles.platformTitle}>{title}</div>
                  <div className={styles.platformDesc}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <div className={styles.sectionWrapper}>
        <div className={styles.section}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className={styles.eyebrow}>Quick start</div>
            <h2 className={styles.heading2}>Live in your Fabric tenant in three steps</h2>
          </div>
          <div className={styles.stepsGrid}>
            {[
              {
                num: 'Step 01',
                title: 'Install from workload hub',
                text: 'Open the Fabric workload hub and install Orqentis with one click. All three item types appear in your workspace immediately — no infrastructure setup.',
              },
              {
                num: 'Step 02',
                title: 'Create your first contract',
                text: 'Click "+ New item → Data Contract", select your Lakehouse table, and let AI Suggest generate an ODCS draft from your live schema. Review and activate.',
              },
              {
                num: 'Step 03',
                title: 'Run and triage',
                text: 'Trigger enforcement manually or set a Hangfire schedule. The Contract Report item shows breach score, rule failures, and AI-generated remediation steps.',
              },
            ].map(({ num, title, text }, i) => (
              <div key={num} className={styles.step} style={{ position: 'relative' }}>
                {i < 2 && (
                  <ArrowRightRegular className={styles.stepConnector} />
                )}
                <div className={styles.stepNum}>{num}</div>
                <div className={styles.stepTitle}>{title}</div>
                <div className={styles.stepText}>{text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── EVIDENCE SCREENSHOTS ─────────────────────────────────────────── */}
      <div className={styles.sectionWrapper}>
        <div className={styles.section} style={{ paddingTop: 0 }}>
          <div className={styles.eyebrow}>Live evidence</div>
          <h2 className={styles.heading2} style={{ marginBottom: 12 }}>Captured from the production Fabric tenant</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 40, fontSize: 15 }}>
            Not mock routes. Real screenshots from app.fabric.microsoft.com after the latest deployment.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.09)',
              overflow: 'hidden',
              boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
            }}>
              <div style={{
                padding: '10px 16px',
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                fontSize: 12,
                color: 'rgba(255,255,255,0.5)',
                fontWeight: 600,
              }}>
                Lakehouse table · owid_co2_demo Delta table
              </div>
              <img
                src="/images/screenshots/fabric-lakehouse-table.png"
                alt="owid_co2_demo Delta table in Microsoft Fabric Lakehouse"
                style={{ width: '100%', display: 'block' }}
                loading="lazy"
              />
            </div>
            <div style={{
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.09)',
              overflow: 'hidden',
              boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
            }}>
              <div style={{
                padding: '10px 16px',
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                fontSize: 12,
                color: 'rgba(255,255,255,0.5)',
                fontWeight: 600,
              }}>
                Contract Report · OWID CO2 enforcement run
              </div>
              <img
                src="/images/screenshots/fabric-contract-report.png"
                alt="Contract enforcement report showing breach score and run history"
                style={{ width: '100%', display: 'block' }}
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <div className={styles.ctaWrap}>
        <div className={styles.ctaBox}>
          <div className={styles.ctaGlow} />
          <h2 className={styles.ctaHeading}>
            Stop finding breaches in dashboards.<br />Catch them at the source.
          </h2>
          <p className={styles.ctaSub}>
            Orqentis is live in your Microsoft Fabric tenant right now. Open your workspace,
            click <strong style={{ color: '#fff' }}>+ New item</strong>, and create your first
            data contract in under five minutes.
          </p>
          <div className={styles.ctaButtons}>
            <Button
              appearance="primary"
              size="large"
              icon={<ArrowRightRegular />}
              iconPosition="after"
              onClick={() => open(FABRIC_URL)}
            >
              Open in Fabric
            </Button>
            <Button
              appearance="outline"
              size="large"
              icon={<CodeRegular />}
              style={{ borderColor: 'rgba(255,255,255,0.22)', color: '#fff' }}
              onClick={() => open(GITHUB_URL)}
            >
              View on GitHub
            </Button>
          </div>
        </div>
      </div>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: 'linear-gradient(135deg, #0F6CBD, #3a96dd)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <DocumentCheckmarkRegular style={{ fontSize: 12, color: '#fff' }} />
          </div>
          <span>Orqentis · Native Microsoft Fabric ISV Workload</span>
        </div>
        <div className={styles.footerLinks}>
          <a className={styles.footerLink} href="/legal/privacy.html" target="_blank" rel="noopener noreferrer">Privacy</a>
          <a className={styles.footerLink} href="/legal/terms.html" target="_blank" rel="noopener noreferrer">Terms</a>
          <a className={styles.footerLink} href="/legal/security.html" target="_blank" rel="noopener noreferrer">Security</a>
          <a className={styles.footerLink} href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">Support</a>
          <a className={styles.footerLink} href={GITHUB_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
        <Caption1 style={{ color: 'rgba(255,255,255,0.25)' }}>
          © {new Date().getFullYear()} Orqentis. ODCS v3.1.0 enforced.
        </Caption1>
      </footer>
    </div>
  );
}
