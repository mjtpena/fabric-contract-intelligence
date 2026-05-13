import React from 'react';
import ReactDOM from 'react-dom/client';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { BrowserRouter } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { LandingPage } from './pages/LandingPage';
import './index.css';

export function bootstrapPublicLanding(): void {
  ReactDOM.createRoot(document.getElementById('root')!).render(
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
