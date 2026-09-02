import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import useNetworkStatus from '../../hooks/useNetworkStatus';
import { hapticError, hapticSuccess } from '../../utils/haptics';

/**
 * OfflineBanner.jsx
 * Bannière persistante en haut de l'écran (z-index maximal) alertant l'utilisateur
 * de la perte de connexion internet, avec transition douce de reconnexion.
 */
export function OfflineBanner() {
  const { isOnline, isOffline, wasOffline } = useNetworkStatus();
  const [showReconnectedToast, setShowReconnectedToast] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (isOffline) {
      hapticError();
      setShowReconnectedToast(false);
    } else if (wasOffline) {
      hapticSuccess();
      setShowReconnectedToast(true);
      const timer = setTimeout(() => {
        setShowReconnectedToast(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isOffline, wasOffline]);

  const handleManualRetry = async () => {
    setIsRetrying(true);
    try {
      await fetch('/favicon.ico', { method: 'HEAD', cache: 'no-store' });
      window.location.reload();
    } catch (_) {
      hapticError();
    } finally {
      setIsRetrying(false);
    }
  };

  if (!isOffline && !showReconnectedToast) {
    return null;
  }

  const isWarning = isOffline;

  return (
    <div
      role="status"
      aria-live="assertive"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999999,
        paddingTop: 'max(8px, env(safe-area-inset-top, 8px))',
        paddingBottom: '8px',
        paddingLeft: '16px',
        paddingRight: '16px',
        backgroundColor: isWarning ? '#EF4444' : '#10B981',
        color: '#FFFFFF',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        fontSize: '13px',
        fontWeight: '700',
        animation: 'slideDownBanner 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {isWarning ? (
          <WifiOff size={17} strokeWidth={2.5} style={{ flexShrink: 0 }} />
        ) : (
          <Wifi size={17} strokeWidth={2.5} style={{ flexShrink: 0 }} />
        )}
        <span>
          {isWarning
            ? 'Connexion internet perdue. Mode hors-ligne.'
            : 'Connexion internet rétablie.'}
        </span>
      </div>

      {isWarning && (
        <button
          type="button"
          onClick={handleManualRetry}
          disabled={isRetrying}
          style={{
            border: '1px solid rgba(255, 255, 255, 0.4)',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            color: '#FFFFFF',
            borderRadius: '999px',
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backdropFilter: 'blur(4px)',
          }}
        >
          <RefreshCw
            size={11}
            style={{
              animation: isRetrying ? 'spin 1s linear infinite' : 'none',
            }}
          />
          <span>{isRetrying ? 'Test...' : 'Réessayer'}</span>
        </button>
      )}

      <style>{`
        @keyframes slideDownBanner {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default OfflineBanner;
