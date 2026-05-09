import React from 'react';
import ReactDOM from 'react-dom/client';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { useFabricSdk } from './hooks/useFabricSdk';
import './index.css';

function AppShell() {
  const { themeMode } = useFabricSdk();

  return (
    <FluentProvider theme={themeMode === 'dark' ? webDarkTheme : webLightTheme}>
      <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <App />
      </BrowserRouter>
    </FluentProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppShell />
  </React.StrictMode>,
);
