import { Navigate, Route, Routes } from 'react-router-dom';
import { ContractDetailPage } from './pages/ContractDetailPage';
import { ContractEditorPage } from './pages/ContractEditorPage';
import { ContractListPage } from './pages/ContractListPage';
import { EnforcementRunPage } from './pages/EnforcementRunPage';
import { WorkspaceSettingsPage } from './pages/WorkspaceSettingsPage';
import { AISuggestPage } from './pages/AISuggestPage';
import { NLQueryPage } from './pages/NLQueryPage';
import { PolicyEditorPage } from './pages/PolicyEditorPage';
import { AlertsDashboardPage } from './pages/AlertsDashboardPage';
import { LandingPage } from './pages/LandingPage';

/**
 * App routes for the Fabric workload iframe.
 *
 * Fabric navigates the workload by sending onNavigate events that call
 * history.replace(route.targetUrl) — see fabricRuntime.ts.
 *
 * Item editor routes follow the Fabric convention:
 *   manifest "editor.path": "/contracts/editor"
 *   → Fabric sends targetUrl: "/contracts/editor/{fabricObjectId}"
 *   → route: /contracts/editor/:itemObjectId
 *
 * Fabric provides its own top-level chrome (nav bar, workspace switcher, item
 * tab bar). The workload MUST NOT render its own top-level navigation.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      {/* ── Fabric item editor routes (opened by Fabric's navigation) ────── */}
      {/* Contract item: manifest editor path = /contracts/editor */}
      <Route path="/contracts/editor/:itemObjectId" element={<ContractEditorPage />} />

      {/* ContractPolicy item: manifest editor path = /contracts/policies */}
      <Route path="/contracts/policies/:itemObjectId" element={<PolicyEditorPage />} />

      {/* ContractReport item: manifest editor path = /contracts/runs */}
      <Route path="/contracts/runs/:itemObjectId" element={<EnforcementRunPage />} />

      {/* ── Supplementary workload routes (in-workload navigation) ────────── */}
      <Route path="/contracts" element={<ContractListPage />} />
      <Route path="/contracts/new" element={<ContractEditorPage />} />
      <Route path="/contracts/ai-suggest" element={<AISuggestPage />} />
      <Route path="/contracts/ai-query" element={<NLQueryPage />} />
      <Route path="/contracts/alerts" element={<AlertsDashboardPage />} />
      <Route path="/contracts/:id" element={<ContractDetailPage />} />
      <Route path="/contracts/:id/edit" element={<ContractEditorPage />} />
      <Route path="/contracts/:id/runs/:runId" element={<EnforcementRunPage />} />
      <Route path="/workspace/settings" element={<WorkspaceSettingsPage />} />

      {/* Default: redirect to contract list */}
      <Route path="*" element={<Navigate to="/contracts" replace />} />
    </Routes>
  );
}
