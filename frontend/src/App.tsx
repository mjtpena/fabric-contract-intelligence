import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { Body1, Title1, makeStyles, tokens } from '@fluentui/react-components';
import { ContractDetailPage } from './pages/ContractDetailPage';
import { ContractEditorPage } from './pages/ContractEditorPage';
import { ContractListPage } from './pages/ContractListPage';
import { EnforcementRunPage } from './pages/EnforcementRunPage';
import { WorkspaceSettingsPage } from './pages/WorkspaceSettingsPage';

const useStyles = makeStyles({
  root: {
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalXXL}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    gap: tokens.spacingHorizontalL,
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
  nav: {
    display: 'flex',
    gap: tokens.spacingHorizontalL,
    fontWeight: tokens.fontWeightSemibold,
  },
  content: {
    flex: 1,
    fontFamily: tokens.fontFamilyBase,
    minHeight: 0,
  },
});

export default function App() {
  const styles = useStyles();

  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Title1>Orqentis</Title1>
          <Body1>Author, validate and manage ODCS v3.1.0 contracts inside Fabric.</Body1>
        </div>
        <nav className={styles.nav}>
          <Link to="/contracts">Contracts</Link>
          <Link to="/workspace/settings">Workspace settings</Link>
        </nav>
      </header>
      <div className={styles.content}>
        <Routes>
          <Route path="/" element={<Navigate replace to="/contracts" />} />
          <Route path="/contracts" element={<ContractListPage />} />
          <Route path="/contracts/new" element={<ContractEditorPage />} />
          <Route path="/contracts/editor" element={<ContractEditorPage />} />
          <Route path="/contracts/runs" element={<EnforcementRunPage />} />
          <Route path="/contracts/:id" element={<ContractDetailPage />} />
          <Route path="/contracts/:id/edit" element={<ContractEditorPage />} />
          <Route path="/contracts/:id/runs/:runId" element={<EnforcementRunPage />} />
          <Route path="/workspace/settings" element={<WorkspaceSettingsPage />} />
          <Route path="*" element={<Navigate replace to="/contracts" />} />
        </Routes>
      </div>
    </main>
  );
}
