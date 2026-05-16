import { lazy, Suspense, type ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PageSpinner } from './components/PageSpinner';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
import { useFabricSdk } from './hooks/useFabricSdk';

const ContractDetailPage = lazy(() => import('./pages/ContractDetailPage'));
const ContractEditorPage = lazy(() => import('./pages/ContractEditorPage'));
const ContractListPage = lazy(() => import('./pages/ContractListPage'));
const EnforcementRunPage = lazy(() => import('./pages/EnforcementRunPage'));
const WorkspaceSettingsPage = lazy(() => import('./pages/WorkspaceSettingsPage'));
const AISuggestPage = lazy(() => import('./pages/AISuggestPage'));
const NLQueryPage = lazy(() => import('./pages/NLQueryPage'));
const PolicyEditorPage = lazy(() => import('./pages/PolicyEditorPage'));
const AlertsDashboardPage = lazy(() => import('./pages/AlertsDashboardPage'));

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
  const { correlationId } = useFabricSdk();
  const routeElement = (element: ReactElement) => (
    <RouteErrorBoundary correlationId={correlationId}>{element}</RouteErrorBoundary>
  );

  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route path="/" element={<Navigate to="/contracts" replace />} />

        {/* ── Fabric item editor routes (opened by Fabric's navigation) ────── */}
        {/* Contract item: manifest editor path = /contracts/editor */}
        <Route path="/contracts/editor" element={routeElement(<ContractEditorPage />)} />
        <Route path="/contracts/editor/:itemObjectId" element={routeElement(<ContractEditorPage />)} />

        {/* ContractPolicy item: manifest editor path = /contracts/policies */}
        <Route path="/contracts/policies" element={routeElement(<PolicyEditorPage />)} />
        <Route path="/contracts/policies/:itemObjectId" element={routeElement(<PolicyEditorPage />)} />

        {/* ContractReport item: manifest editor path = /contracts/runs */}
        <Route path="/contracts/runs" element={routeElement(<EnforcementRunPage />)} />
        <Route path="/contracts/runs/:itemObjectId" element={routeElement(<EnforcementRunPage />)} />

        {/* ── Supplementary workload routes (in-workload navigation) ────────── */}
        <Route path="/contracts" element={routeElement(<ContractListPage />)} />
        <Route path="/contracts/new" element={routeElement(<ContractEditorPage />)} />
        <Route path="/contracts/ai-suggest" element={routeElement(<AISuggestPage />)} />
        <Route path="/contracts/ai-query" element={routeElement(<NLQueryPage />)} />
        <Route path="/contracts/alerts" element={routeElement(<AlertsDashboardPage />)} />
        <Route path="/contracts/:id" element={routeElement(<ContractDetailPage />)} />
        <Route path="/contracts/:id/edit" element={routeElement(<ContractEditorPage />)} />
        <Route path="/contracts/:id/runs" element={routeElement(<EnforcementRunPage />)} />
        <Route path="/contracts/:id/runs/:runId" element={routeElement(<EnforcementRunPage />)} />
        <Route path="/workspace/settings" element={routeElement(<WorkspaceSettingsPage />)} />

        {/* Default: redirect to contract list */}
        <Route path="*" element={<Navigate to="/contracts" replace />} />
      </Routes>
    </Suspense>
  );
}
