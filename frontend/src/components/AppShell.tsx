import { FluentProvider, makeStyles, tokens, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';
import { NavShell } from './NavShell';
import { useFabricSdk } from '../hooks/useFabricSdk';

/**
 * Are we running inside the Fabric host iframe?
 *
 * Synchronous check used during the very first render to decide whether to
 * draw the internal NavShell sidebar. Inside Fabric, the host already
 * provides chrome (left rail, workspace switcher, item tab bar) and the
 * workload MUST NOT render its own top-level navigation (see App.tsx).
 *
 * `window.self !== window.top` is true only when we are inside an iframe;
 * the standalone mode (`?__standalone=1`) opens directly in a tab.
 */
function isHostedInFabric(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    // Cross-origin access to window.top can throw — that itself means we are
    // inside an iframe served by a different origin (i.e. Fabric).
    return true;
  }
}

const useStyles = makeStyles({
  hostedRoot: {
    height: '100%',
    width: '100%',
    backgroundColor: tokens.colorNeutralBackground2,
    overflow: 'hidden',
  },
});

export default function AppShell() {
  const { themeMode } = useFabricSdk();
  const styles = useStyles();
  const hosted = isHostedInFabric();

  return (
    <FluentProvider
      theme={themeMode === 'dark' ? webDarkTheme : webLightTheme}
      style={{ height: '100%' }}
    >
      <BrowserRouter>
        {hosted ? (
          <div className={styles.hostedRoot}>
            <App />
          </div>
        ) : (
          <NavShell />
        )}
      </BrowserRouter>
    </FluentProvider>
  );
}
