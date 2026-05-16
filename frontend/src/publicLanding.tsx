import React from 'react';
import ReactDOM from 'react-dom/client';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { BrowserRouter } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { LandingPage } from './pages/LandingPage';
import './index.css';

export function bootstrapPublicLanding(): void {
  const root = document.getElementById('root');
  if (!root) {
    console.error('[Orqentis] Unable to mount public landing: #root was not found.');
    return;
  }

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <FluentProvider theme={webLightTheme}>
          <BrowserRouter>
            <LandingPage />
          </BrowserRouter>
        </FluentProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
}
