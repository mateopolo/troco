import React, { Suspense } from 'react';
import CookieBanner from './CookieBanner';
import OfflineScreen from './common/OfflineScreen';
import PWAInstallBanner from './PWAInstallBanner';
import OfflineBanner from './common/OfflineBanner';
import NotificationPill from './ui/NotificationPill';
import { isIosOrTouchDevice } from '../utils/deviceDetection';

const GeometricBackground = React.lazy(() => import('./layout/GeometricBackground'));

export default function AppOverlays({
  darkMode,
  isTouchDevice,
  isMobileDevice,
  isPending,
  setIsPrivacyCenterOpen,
  setActiveTab,
}) {
  return (
    <>
      {/* 🚨 PHASE 49 & 82 : ÉCRAN & BANNIÈRE HORS-LIGNE INTERACTIFS */}
      <OfflineBanner />
      <OfflineScreen />

      {/* 🚨 PHASE 55 : NOTIFICATIONS DYNAMIC ISLAND / TOASTS PREMIUM */}
      <NotificationPill />

      {/* 🚨 PHASE 114 : EXTINCTION DU CANVAS WEBRGL SUR IOS (VRAM FIX) */}
      {!isIosOrTouchDevice() ? (
        <Suspense fallback={null}>
          <GeometricBackground darkMode={darkMode} />
        </Suspense>
      ) : (
        /* FALLBACK CSS PREMIUM POUR LE BACKGROUND : DÉGRADÉ RADIAL RICHE SANS AUCUN CANVAS */
        <div
          data-testid="ios-touch-background-fallback"
          style={{
            position: 'fixed',
            inset: 0,
            background: darkMode
              ? 'radial-gradient(circle at 50% 10%, rgba(198, 125, 91, 0.18) 0%, rgba(26, 22, 19, 0.95) 60%, #12100E 100%)'
              : 'radial-gradient(circle at 50% 10%, rgba(198, 125, 91, 0.14) 0%, rgba(250, 247, 242, 0.95) 65%, #FAF7F2 100%)',
            pointerEvents: 'none',
            zIndex: -100,
          }}
        />
      )}

      {/* FOND LIQUIDE IRIDESCENT : DÉGRADÉ STATIQUE SUR MOBILE / TACTILE POUR ÉVITER LE DÉPASSEMENT VRAM iOS */}
      {(isTouchDevice || isMobileDevice) ? (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(circle at top right, var(--bg-subtle), var(--bg-global))',
          pointerEvents: 'none',
          zIndex: 0
        }} />
      ) : (
        <div className="liquid-iridescence-container">
          <div className="liquid-blob liquid-blob-1" />
          <div className="liquid-blob liquid-blob-2" />
          <div className="liquid-blob liquid-blob-3" />
        </div>
      )}

      {/* MICRO-INDICATEUR ULTRA-FIN DE CHARGEMENT DE ROUTE (FLUIDITÉ INSTANTANÉE) */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          zIndex: 99999,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, var(--accent-primary, #C67D5B) 0%, #F59E0B 60%, #EC4899 100%)',
            transformOrigin: 'left center',
            transform: isPending ? 'scaleX(0.85)' : 'scaleX(0)',
            opacity: isPending ? 1 : 0,
            transition: isPending
              ? 'transform 1.4s cubic-bezier(0.1, 0.4, 0.2, 1), opacity 0.1s ease'
              : 'transform 0.15s ease, opacity 0.3s ease 0.1s',
            boxShadow: isPending ? '0 0 10px rgba(198,125,91,0.6)' : 'none',
          }}
        />
      </div>

      {/* BANNIÈRE COOKIES & TRACEURS CONFORME CNIL / RGPD (BLOC 6) */}
      <CookieBanner
        darkMode={darkMode}
        onOpenPrivacyCenter={() => setIsPrivacyCenterOpen(true)}
        onNavigate={(tab) => {
          if (typeof window !== 'undefined') window.location.hash = tab;
          setActiveTab(tab);
        }}
      />

      {/* BANNIÈRE D'INSTALLATION PWA MOBILE 1-CLIC */}
      <PWAInstallBanner />
    </>
  );
}
