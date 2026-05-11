import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { unstable_HistoryRouter as HistoryRouter } from 'react-router-dom';
import App from '../App';
import { useFabricSdk } from '../hooks/useFabricSdk';
import { fabricHistory } from '../lib/fabricRuntime';

export default function AppShell() {
  const { themeMode } = useFabricSdk();

  return (
    <FluentProvider theme={themeMode === 'dark' ? webDarkTheme : webLightTheme}>
      <HistoryRouter history={fabricHistory}>
        <App />
      </HistoryRouter>
    </FluentProvider>
  );
}
