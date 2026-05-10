import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { Body1, Title1, makeStyles, tokens } from '@fluentui/react-components';
import { ContractDetailPage } from './pages/ContractDetailPage';
import { ContractEditorPage } from './pages/ContractEditorPage';
import { ContractListPage } from './pages/ContractListPage';
import { EnforcementRunPage } from './pages/EnforcementRunPage';
import { WorkspaceSettingsPage } from './pages/WorkspaceSettingsPage';
import { LandingPage } from './pages/LandingPage';
import { AISuggestPage } from './pages/AISuggestPage';
import { NLQueryPage } from './pages/NLQueryPage';
import { PolicyEditorPage } from './pages/PolicyEditorPage';
import { AlertsDashboardPage } from './pages/AlertsDashboardPage';
import { resolveWorkloadRouteForItemType } from './utils/fabricPathContext';

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

/** Fabric workload layout — wraps all item-level routes with the shared header/nav. */
function WorkloadLayout() {
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
          <Link to="/contracts/ai-suggest">AI Suggest</Link>
          <Link to="/contracts/ai-query">AI Query</Link>
          <Link to="/contracts/policies">Policies</Link>
          <Link to="/contracts/alerts">Alerts</Link>
          <Link to="/workspace/settings">Workspace settings</Link>
        </nav>
      </header>
      <div className={styles.content}>
        <Routes>
          <Route index element={<ContractListPage />} />
          <Route path="ai-suggest" element={<AISuggestPage />} />
          <Route path="ai-query" element={<NLQueryPage />} />
          <Route path="policies" element={<PolicyEditorPage />} />
          <Route path="alerts" element={<AlertsDashboardPage />} />
          <Route path="new" element={<ContractEditorPage />} />
          <Route path="editor" element={<ContractEditorPage />} />
          <Route path="runs" element={<EnforcementRunPage />} />
          <Route path=":id" element={<ContractDetailPage />} />
          <Route path=":id/edit" element={<ContractEditorPage />} />
          <Route path=":id/runs/:runId" element={<EnforcementRunPage />} />
        </Routes>
      </div>
    </main>
  );
}

function FabricDeepLinkRoute() {
  const { id, itemType } = useParams();
  const route = resolveWorkloadRouteForItemType(itemType ?? '');

  if (!route) {
    return <Navigate to="/contracts" replace />;
  }

  if (!id) {
    return <Navigate to={route} replace />;
  }

  if (route === '/contracts/runs') {
    return <Navigate to={`/contracts/runs?contractId=${encodeURIComponent(id)}`} replace />;
  }

  return <Navigate to={`${route}?id=${encodeURIComponent(id)}`} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Fabric deep-link route shape when opening items from workspace list */}
      <Route path="/groups/:workspaceId/:itemType/:id/*" element={<FabricDeepLinkRoute />} />

      {/* Public landing page at / */}
      <Route path="/" element={<LandingPage />} />

      {/* Workload routes inside Fabric iframe */}
      <Route path="/contracts/*" element={<WorkloadLayout />} />
      <Route path="/workspace/settings" element={<WorkspaceSettingsPage />} />

      {/* Legacy fallback: policy/report item routes Fabric may deep-link to */}
      <Route path="/contracts/editor" element={<ContractEditorPage />} />
      <Route path="/contracts/runs" element={<EnforcementRunPage />} />
      <Route path="*" element={<Navigate to="/contracts" replace />} />
    </Routes>
  );
}
