import { Routes, Route, Link } from 'react-router-dom';
import { Title1, Body1, Subtitle2, makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  root: {
    padding: tokens.spacingHorizontalXXL,
    fontFamily: tokens.fontFamilyBase,
  },
  nav: {
    display: 'flex',
    gap: tokens.spacingHorizontalL,
    marginBlock: tokens.spacingVerticalL,
  },
  card: {
    marginTop: tokens.spacingVerticalL,
    padding: tokens.spacingHorizontalL,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
  },
});

function Home() {
  const styles = useStyles();
  return (
    <section className={styles.card}>
      <Subtitle2>Welcome</Subtitle2>
      <Body1>
        Fabric Contract Intelligence — scaffold ready. Sprint runbooks live in <code>.ai/commands/</code>.
        Implement Sprint 5 (Frontend Editor) to replace this placeholder.
      </Body1>
    </section>
  );
}

function ContractsPlaceholder() {
  const styles = useStyles();
  return (
    <section className={styles.card}>
      <Subtitle2>Contracts</Subtitle2>
      <Body1>TODO(sprint-05): list contracts here.</Body1>
    </section>
  );
}

function RunsPlaceholder() {
  const styles = useStyles();
  return (
    <section className={styles.card}>
      <Subtitle2>Enforcement Runs</Subtitle2>
      <Body1>TODO(sprint-06): list enforcement runs here.</Body1>
    </section>
  );
}

export default function App() {
  const styles = useStyles();
  return (
    <main className={styles.root}>
      <Title1>Fabric Contract Intelligence</Title1>
      <nav className={styles.nav}>
        <Link to="/">Home</Link>
        <Link to="/contracts">Contracts</Link>
        <Link to="/runs">Runs</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/contracts" element={<ContractsPlaceholder />} />
        <Route path="/runs" element={<RunsPlaceholder />} />
      </Routes>
    </main>
  );
}
