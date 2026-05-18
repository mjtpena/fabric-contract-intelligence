import type { ReactNode } from 'react';
import {
  Body1,
  Subtitle2Stronger,
  Title2,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowRightRegular,
  CheckmarkCircle24Filled,
  Sparkle24Filled,
  Table24Filled,
} from '@fluentui/react-icons';

interface WelcomeHeroProps {
  onStartFromTable: () => void;
  onOpenAiSuggest: () => void;
  onOpenTemplates: () => void;
}

const useStyles = makeStyles({
  root: {
    display: 'grid',
    gridTemplateColumns: '1.05fr 1fr',
    gap: tokens.spacingHorizontalXXL,
    alignItems: 'stretch',
    backgroundColor: tokens.colorNeutralBackground1,
    backgroundImage: `radial-gradient(circle at 0% 0%, ${tokens.colorBrandBackground2} 0%, transparent 55%), radial-gradient(circle at 100% 100%, #eaf4ff 0%, transparent 50%)`,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusXLarge,
    padding: `${tokens.spacingVerticalXXL} ${tokens.spacingHorizontalXXL}`,
    overflow: 'hidden',
    '@media (max-width: 960px)': {
      gridTemplateColumns: '1fr',
    },
  },
  copy: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    justifyContent: 'center',
    minWidth: 0,
  },
  eyebrowRow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    color: tokens.colorBrandForeground1,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  heading: {
    margin: 0,
    color: tokens.colorNeutralForeground1,
    lineHeight: 1.15,
  },
  blurb: {
    color: tokens.colorNeutralForeground2,
    maxWidth: '52ch',
    fontSize: tokens.fontSizeBase400,
    lineHeight: 1.55,
  },
  bullets: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase300,
    margin: 0,
    paddingLeft: 0,
    listStyle: 'none',
  },
  bullet: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  checkIcon: {
    color: tokens.colorPaletteGreenForeground1,
    flexShrink: 0,
  },
  steps: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    justifyContent: 'center',
    minWidth: 0,
  },
  stepCard: {
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: '3rem 1fr auto',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    transitionDuration: tokens.durationFast,
    transitionProperty: 'transform, box-shadow, border-color',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    fontFamily: 'inherit',
    ':hover': {
      transform: 'translateY(-2px)',
      border: `1px solid ${tokens.colorBrandStroke1}`,
      boxShadow: tokens.shadow8,
    },
    ':focus-visible': {
      outline: `2px solid ${tokens.colorBrandStroke1}`,
      outlineOffset: '2px',
    },
  },
  stepIconWrap: {
    width: '3rem',
    height: '3rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.borderRadiusCircular,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  stepIconBlue: {
    backgroundImage: 'linear-gradient(135deg, #1177D1 0%, #0B5CA8 100%)',
  },
  stepIconTeal: {
    backgroundImage: 'linear-gradient(135deg, #12B79C 0%, #0F8E7B 100%)',
  },
  stepIconAmber: {
    backgroundImage: 'linear-gradient(135deg, #F2A31B 0%, #C97E0E 100%)',
  },
  stepBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  stepTitle: {
    color: tokens.colorNeutralForeground1,
    margin: 0,
  },
  stepDesc: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
  },
  stepArrow: {
    color: tokens.colorNeutralForeground3,
    transitionDuration: tokens.durationFast,
    transitionProperty: 'transform, color',
  },
  helpRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    marginTop: tokens.spacingVerticalS,
  },
});

interface Step {
  key: string;
  icon: ReactNode;
  iconClass: string;
  title: string;
  description: string;
  onClick: () => void;
}

export function WelcomeHero({ onStartFromTable, onOpenAiSuggest, onOpenTemplates }: WelcomeHeroProps) {
  const styles = useStyles();

  const steps: Step[] = [
    {
      key: 'table',
      iconClass: styles.stepIconBlue,
      icon: <Table24Filled aria-hidden />,
      title: 'Start from a Fabric table',
      description: 'Point at a Lakehouse or Warehouse — we read the schema and draft the contract.',
      onClick: onStartFromTable,
    },
    {
      key: 'ai',
      iconClass: styles.stepIconTeal,
      icon: <Sparkle24Filled aria-hidden />,
      title: 'Describe it in plain English',
      description: 'Say what the table is for. AI Suggest writes a complete ODCS YAML.',
      onClick: onOpenAiSuggest,
    },
    {
      key: 'template',
      iconClass: styles.stepIconAmber,
      icon: (
        <span aria-hidden style={{ fontWeight: 700, fontSize: '1rem' }}>
          T
        </span>
      ),
      title: 'Pick a ready-made template',
      description: 'Customer 360, Orders, IoT events, Knowledge graph — pre-tuned for common shapes.',
      onClick: onOpenTemplates,
    },
  ];

  return (
    <section className={styles.root} aria-label="Welcome to Orqentis">
      <div className={styles.copy}>
        <span className={styles.eyebrowRow}>
          <Sparkle24Filled aria-hidden style={{ fontSize: '0.95rem' }} />
          Welcome to Orqentis
        </span>
        <Title2 as="h2" className={styles.heading}>
          Data contracts that keep your dashboards <br /> and AI honest.
        </Title2>
        <Body1 className={styles.blurb}>
          A data contract is like a service-level agreement for a table. You promise what the
          columns mean, what good data looks like, and how fresh it is — Orqentis enforces it
          every time the data changes.
        </Body1>
        <ul className={styles.bullets}>
          <li className={styles.bullet}>
            <CheckmarkCircle24Filled className={styles.checkIcon} aria-hidden />
            Native to Microsoft Fabric — runs on your OneLake data
          </li>
          <li className={styles.bullet}>
            <CheckmarkCircle24Filled className={styles.checkIcon} aria-hidden />
            Open ODCS v3.1.0 — portable, vendor-neutral
          </li>
          <li className={styles.bullet}>
            <CheckmarkCircle24Filled className={styles.checkIcon} aria-hidden />
            Catches bad data before it reaches a dashboard or model
          </li>
        </ul>
        <div className={styles.helpRow}>
          Pick how you want to start →
        </div>
      </div>
      <div className={styles.steps}>
        {steps.map((step, idx) => (
          <button
            key={step.key}
            type="button"
            className={styles.stepCard}
            onClick={step.onClick}
          >
            <span className={`${styles.stepIconWrap} ${step.iconClass}`}>{step.icon}</span>
            <span className={styles.stepBody}>
              <Subtitle2Stronger as="h3" className={styles.stepTitle}>
                {`${idx + 1}. ${step.title}`}
              </Subtitle2Stronger>
              <span className={styles.stepDesc}>{step.description}</span>
            </span>
            <ArrowRightRegular className={styles.stepArrow} aria-hidden />
          </button>
        ))}
      </div>
    </section>
  );
}
