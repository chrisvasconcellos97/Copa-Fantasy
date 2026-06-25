import React from 'react';

/**
 * Catches render-time errors anywhere below it so one bad component can't
 * white-screen the entire SPA. Shows a recovery card with a reload action.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Surface to the console for debugging; a real logger could hook in here.
    console.error('Render error caught by ErrorBoundary:', error, info);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="page page-narrow" style={{ paddingTop: 64, textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</div>
          <h1 style={{ fontWeight: 800, fontSize: '1.3rem', marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 20 }}>
            The app hit an unexpected error. Your progress is saved — try reloading.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              🔄 Reload
            </button>
            <a href="/" className="btn" style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', textDecoration: 'none' }}>
              ← Home
            </a>
          </div>
          {this.state.error?.message && (
            <p style={{ marginTop: 24, fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace', wordBreak: 'break-word' }}>
              {this.state.error.message}
            </p>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
