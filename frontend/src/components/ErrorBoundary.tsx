import React from 'react';
import {
  Body1,
  Button,
  Caption1,
  Title3,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { ArrowClockwiseRegular, ErrorCircleRegular } from '@fluentui/react-icons';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: tokens.spacingHorizontalXXL,
    backgroundColor: tokens.colorNeutralBackground3,
    fontFamily: tokens.fontFamilyBase,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    maxWidth: '40rem',
    width: '100%',
    padding: tokens.spacingHorizontalXL,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow4,
  },
  heading: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    color: tokens.colorStatusDangerForeground1,
  },
  detail: {
    color: tokens.colorNeutralForeground3,
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingHorizontalS,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    margin: 0,
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
  },
});

function ErrorPanel({ error }: { error: Error }) {
  const styles = useStyles();
  return (
    <div className={styles.root} role="alert" aria-live="assertive">
      <div className={styles.card}>
        <div className={styles.heading}>
          <ErrorCircleRegular fontSize={24} />
          <Title3 as="h2">Orqentis workload encountered an error</Title3>
        </div>
        <Body1>
          The workload couldn&apos;t render this view. Reload to try again, or contact your
          administrator if the problem persists.
        </Body1>
        <pre className={styles.detail}>{error.message}</pre>
        {!import.meta.env.PROD && error.stack ? (
          <details>
            <summary>
              <Caption1>Stack trace (development only)</Caption1>
            </summary>
            <pre className={styles.detail}>{error.stack}</pre>
          </details>
        ) : null}
        <div className={styles.actions}>
          <Button
            appearance="primary"
            icon={<ArrowClockwiseRegular />}
            onClick={() => window.location.reload()}
          >
            Reload workload
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Top-level error boundary that catches synchronous React render errors.
 * Renders a Fabric-themed error surface instead of a blank iframe.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Orqentis] Unhandled render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <ErrorPanel error={this.state.error} />;
    }
    return this.props.children;
  }
}
