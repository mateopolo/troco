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
          backgroundColor: '#14100E',
          color: '#FAF7F2',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          textAlign: 'center'
        }}>
          <div style={{
            backgroundColor: '#231E1B',
            border: '1px solid rgba(232, 221, 211, 0.2)',
            borderRadius: '28px',
            padding: '36px',
            maxWidth: '520px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 className="font-editorial-heading" style={{ fontSize: '26px', fontWeight: '600', margin: '0 0 12px', color: '#C67D5B' }}>
              Une erreur est survenue
            </h2>
            <p style={{ fontSize: '14px', color: '#D4C5B5', lineHeight: 1.6, margin: '0 0 20px' }}>
              L'application a rencontré un problème inattendu lors de l'affichage.
            </p>
            <div style={{
              backgroundColor: '#1A1715',
              padding: '12px 16px',
              borderRadius: '14px',
              textAlign: 'left',
              fontSize: '12px',
              fontFamily: 'monospace',
              color: '#FDE68A',
              margin: '0 0 24px',
              maxHeight: '120px',
              overflowY: 'auto',
              border: '1px solid rgba(232, 221, 211, 0.1)'
            }}>
              {this.state.error && this.state.error.toString()}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  localStorage.removeItem('troco_user_listings');
                  window.location.reload();
                }}
                className="premium-button"
                style={{
                  backgroundColor: '#2A1A14',
                  color: '#FAF7F2',
                  border: '1px solid rgba(232,221,211,0.25)',
                  borderRadius: '999px',
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
                className="premium-button"
                style={{
                  background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '12px 20px',
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(198,125,91,0.35)'
                }}
              >
                Rafraîchir la page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
