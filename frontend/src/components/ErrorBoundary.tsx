import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level error boundary that catches synchronous React render errors.
 *
 * Without this, React 18 unmounts the entire tree on an uncaught render error,
 * resulting in a blank page with no indication of what went wrong. This boundary
 * shows a visible error panel instead, which can be seen in the iframe's DevTools.
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
      return (
        <div
          style={{
            padding: '24px',
            fontFamily: 'Consolas, monospace',
            color: '#c00',
            background: '#fff',
            minHeight: '100vh',
          }}
        >
          <h2 style={{ fontSize: '16px', marginBottom: '12px' }}>
            Orqentis workload encountered an error
          </h2>
          <pre style={{ fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {this.state.error.message}
          </pre>
          {import.meta.env.PROD ? null : (
            <pre
              style={{
                fontSize: '11px',
                color: '#888',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {this.state.error.stack}
            </pre>
          )}
          <details hidden>
            <summary>Error details</summary>
            <pre>{this.state.error.stack}</pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}
