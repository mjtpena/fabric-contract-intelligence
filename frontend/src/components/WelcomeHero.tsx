import {
  Body1,
  Button,
  Caption1,
  Link,
  Title2,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  CheckmarkCircle20Filled,
  DatabaseArrowRight24Regular,
  Sparkle16Filled,
} from '@fluentui/react-icons';

interface WelcomeHeroProps {
  onStartFromTable: () => void;
  onOpenAiSuggest: () => void;
  onOpenTemplates: () => void;
}

const useStyles = makeStyles({
  root: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)',
    gap: tokens.spacingHorizontalXXL,
    alignItems: 'center',
    backgroundColor: tokens.colorNeutralBackground1,
    backgroundImage: `radial-gradient(circle at 0% 0%, ${tokens.colorBrandBackground2} 0%, transparent 55%)`,
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
    maxWidth: '56ch',
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
  actions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: tokens.spacingVerticalS,
    marginTop: tokens.spacingVerticalS,
  },
  secondary: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  sep: {
    color: tokens.colorNeutralForeground4,
  },
  illoFrame: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingVerticalL,
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: tokens.shadow4,
    minWidth: 0,
  },
  illoHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground2,
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
  },
  dot: {
    width: '0.5rem',
    height: '0.5rem',
    borderRadius: tokens.borderRadiusCircular,
  },
  dotRed: { backgroundColor: '#ff5f57' },
  dotAmber: { backgroundColor: '#febc2e' },
  dotGreen: { backgroundColor: '#28c840' },
  illoCode: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    lineHeight: 1.55,
    whiteSpace: 'pre-wrap',
    margin: 0,
  },
  illoKey: {
    color: tokens.colorBrandForeground1,
  },
  illoStr: {
    color: tokens.colorPaletteGreenForeground1,
  },
  illoBadge: {
    alignSelf: 'flex-start',
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    padding: `2px ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorPaletteGreenBackground2,
    color: tokens.colorPaletteGreenForeground2,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
  },
});

export function WelcomeHero({ onStartFromTable, onOpenAiSuggest, onOpenTemplates }: WelcomeHeroProps) {
  const styles = useStyles();

  return (
    <section className={styles.root} aria-label="Welcome to Orqentis">
      <div className={styles.copy}>
        <span className={styles.eyebrowRow}>
          <Sparkle16Filled aria-hidden />
          Welcome to Orqentis
        </span>
        <Title2 as="h2" className={styles.heading}>
          Data contracts that keep your dashboards and AI honest.
        </Title2>
        <Body1 className={styles.blurb}>
          A data contract is a promise about a table — what its columns mean, what good data looks
          like, and how fresh it should be. Orqentis enforces that promise on every change in
          OneLake, so bad data never reaches a dashboard or model.
        </Body1>
        <ul className={styles.bullets}>
          <li className={styles.bullet}>
            <CheckmarkCircle20Filled className={styles.checkIcon} aria-hidden />
            Native to Microsoft Fabric — runs on your OneLake data
          </li>
          <li className={styles.bullet}>
            <CheckmarkCircle20Filled className={styles.checkIcon} aria-hidden />
            Open ODCS v3.1.0 — portable and vendor-neutral
          </li>
          <li className={styles.bullet}>
            <CheckmarkCircle20Filled className={styles.checkIcon} aria-hidden />
            Catches bad data before it reaches a dashboard or model
          </li>
        </ul>
        <div className={styles.actions}>
          <Button
            appearance="primary"
            size="large"
            icon={<DatabaseArrowRight24Regular />}
            onClick={onStartFromTable}
          >
            Start from a Fabric table
          </Button>
          <div className={styles.secondary}>
            <span>or</span>
            <Link as="button" onClick={onOpenAiSuggest}>
              describe it in plain English
            </Link>
            <span className={styles.sep}>·</span>
            <Link as="button" onClick={onOpenTemplates}>
              browse templates
            </Link>
          </div>
        </div>
      </div>
      <div className={styles.illoFrame} aria-hidden>
        <div className={styles.illoHeader}>
          <span className={`${styles.dot} ${styles.dotRed}`} />
          <span className={`${styles.dot} ${styles.dotAmber}`} />
          <span className={`${styles.dot} ${styles.dotGreen}`} />
          <span>customer_orders.contract.yaml</span>
        </div>
        <pre className={styles.illoCode}>
          <span className={styles.illoKey}>kind</span>: DataContract{'\n'}
          <span className={styles.illoKey}>apiVersion</span>: v3.1.0{'\n'}
          <span className={styles.illoKey}>schema</span>:{'\n'}
          {'  - '}
          <span className={styles.illoKey}>name</span>: order_id{'\n'}
          {'    '}
          <span className={styles.illoKey}>required</span>: <span className={styles.illoStr}>true</span>{'\n'}
          {'  - '}
          <span className={styles.illoKey}>name</span>: total_amount{'\n'}
          {'    '}
          <span className={styles.illoKey}>quality</span>: <span className={styles.illoStr}>{'> 0'}</span>
        </pre>
        <span className={styles.illoBadge}>
          <CheckmarkCircle20Filled aria-hidden />
          124 rows passed all checks
        </span>
        <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
          A small slice of what a contract looks like — you don&apos;t have to write the YAML.
        </Caption1>
      </div>
    </section>
  );
}
