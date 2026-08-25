import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class SectoralErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[SectoralErrorBoundary] Error caught in sector "${this.props.moduleName || 'Isolated Module'}":`, error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback({ error: this.state.error, reset: this.handleReset })
          : this.props.fallback;
      }

      return (
        <div
          className="sectoral-error-boundary"
          style={{
            padding: '24px 20px',
            borderRadius: '20px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-card)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            margin: '12px auto',
            maxWidth: '520px',
            width: '100%',
            boxSizing: 'border-box',
            ...this.props.style,
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: 'var(--accent-danger, #EF4444)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(239, 68, 68, 0.25)',
            }}
          >
            <AlertTriangle size={22} />
          </div>

          <div>
            <h4
              className="font-editorial-heading"
              style={{
                margin: '0 0 4px',
                fontSize: '16px',
                fontWeight: '700',
                color: 'var(--text-main)',
              }}
            >
              {this.props.moduleName || 'Module momentanément indisponible'}
            </h4>
            <p
              style={{
                margin: 0,
                fontSize: '12.5px',
                color: 'var(--text-secondary)',
                lineHeight: 1.45,
              }}
            >
              {this.props.customMessage || "Un incident mineur est survenu dans cette section sans impacter le reste de votre session."}
            </p>
          </div>

          <button
            type="button"
            onClick={this.handleReset}
            className="premium-button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '12px',
              backgroundColor: 'var(--accent-primary)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-accent)',
              marginTop: '4px',
            }}
          >
            <RefreshCw size={14} /> Réessayer
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SectoralErrorBoundary;
