import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Troco Runtime Error Caught:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0F172A',
          color: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          textAlign: 'center'
        }}>
          <div style={{
            backgroundColor: 'rgba(30, 41, 59, 0.85)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '520px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 12px', color: '#F87171' }}>
              Une erreur est survenue
            </h2>
            <p style={{ fontSize: '14px', color: '#94A3B8', lineHeight: 1.6, margin: '0 0 20px' }}>
              L'application a rencontré un problème inattendu lors de l'affichage.
            </p>
            <div style={{
              backgroundColor: '#020617',
              padding: '12px 16px',
              borderRadius: '12px',
              textAlign: 'left',
              fontSize: '12px',
              fontFamily: 'monospace',
              color: '#FCA5A5',
              margin: '0 0 24px',
              maxHeight: '120px',
              overflowY: 'auto'
            }}>
              {this.state.error && this.state.error.toString()}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  localStorage.removeItem('troco_user_listings');
                  window.location.reload();
                }}
                style={{
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '12px 20px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Réinitialiser & Recharger
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  backgroundColor: '#04265A',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '14px',
                  padding: '12px 20px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Recharger
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
