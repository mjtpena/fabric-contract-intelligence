import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { BrowserRouter } from 'react-router-dom';
import { NavShell } from './NavShell';
import { useFabricSdk } from '../hooks/useFabricSdk';

export default function AppShell() {
  const { themeMode } = useFabricSdk();

  return (
    <FluentProvider
      theme={themeMode === 'dark' ? webDarkTheme : webLightTheme}
      style={{ height: '100%' }}
    >
      <BrowserRouter>
        <NavShell />
      </BrowserRouter>
    </FluentProvider>
  );
}
