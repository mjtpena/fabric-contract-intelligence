import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';
import { useFabricSdk } from '../hooks/useFabricSdk';

export default function AppShell() {
  const { themeMode } = useFabricSdk();

  return (
    <FluentProvider theme={themeMode === 'dark' ? webDarkTheme : webLightTheme}>
      <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <App />
      </BrowserRouter>
    </FluentProvider>
  );
}
