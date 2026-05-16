import React from 'react';
import { Body1, Button, Caption1, makeStyles, tokens } from '@fluentui/react-components';

interface RouteErrorBoundaryProps {
  children: React.ReactNode;
  correlationId?: string;
}

interface RouteErrorBoundaryState {
  error: Error | null;
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    margin: tokens.spacingHorizontalXXL,
    padding: tokens.spacingHorizontalXL,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
  },
});

class RouteErrorBoundaryClass extends React.Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Orqentis] Route render error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <RouteErrorFallback
        correlationId={this.props.correlationId}
        onReload={() => window.location.reload()}
      />
    );
  }
}

function RouteErrorFallback({
  correlationId,
  onReload,
}: {
  correlationId?: string;
  onReload: () => void;
}) {
  const styles = useStyles();

  return (
    <section className={styles.root} role="alert">
      <Body1>We couldn’t load this page. Reload the page and try again.</Body1>
      {correlationId ? <Caption1>Correlation ID: {correlationId}</Caption1> : null}
      <div className={styles.actions}>
        <Button appearance="primary" onClick={onReload}>Reload page</Button>
      </div>
    </section>
  );
}

export { RouteErrorBoundaryClass as RouteErrorBoundary };
