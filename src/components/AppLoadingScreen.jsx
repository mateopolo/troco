import React, { Suspense } from 'react';
import TrocoLogoNativeSvg from './common/TrocoLogoNativeSvg';

const TrocoLogo3D = React.lazy(() => import('./common/TrocoLogo3D'));

export default function AppLoadingScreen({ isTouchDevice, isMobileDevice }) {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-global)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'var(--font-family-main)',
      zIndex: 999999
    }}>
      {/* FOND LIQUIDE IRIDESCENT : DÉGRADÉ STATIQUE LÉGER SUR MOBILE & TACTILE POUR ÉVITER LE CRASH iOS */}
      {(isTouchDevice || isMobileDevice) ? (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at top right, var(--bg-subtle), var(--bg-global))',
          pointerEvents: 'none',
          zIndex: 0
        }} />
      ) : (
        <div className="liquid-iridescence-container" style={{ opacity: 0.92, background: 'radial-gradient(circle at 50% 50%, var(--bg-subtle) 0%, var(--bg-global) 100%)' }}>
          <div className="liquid-blob liquid-blob-1" style={{ width: '750px', height: '750px' }} />
          <div className="liquid-blob liquid-blob-2" style={{ width: '800px', height: '800px' }} />
          <div className="liquid-blob liquid-blob-3" style={{ width: '680px', height: '680px' }} />
        </div>
      )}

      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '30px',
        animation: 'modalSlideIn 0.8s var(--ease-monopo) both'
      }}>
        {/* 🚨 PHASE 108 & 114 : ÉRADICATION DU CRASH OOM iOS (LAZY LOADING & DÉMONTAGE WEBGL STRICT) */}
        {(!isTouchDevice && !isMobileDevice) ? (
          <Suspense fallback={null}>
            <TrocoLogo3D size={100} animated={true} style={{ marginBottom: '28px' }} />
          </Suspense>
        ) : (
          <TrocoLogoNativeSvg size={100} animated={true} style={{ marginBottom: '28px' }} />
        )}
        <div style={{
          fontSize: 'clamp(56px, 14vw, 92px)',
          fontFamily: 'var(--font-editorial)',
          fontWeight: 300,
          letterSpacing: '0.22em',
          color: 'var(--text-main)',
          lineHeight: 1,
          textTransform: 'uppercase',
          marginBottom: '16px',
          textShadow: '0 10px 40px rgba(0,0,0,0.06)'
        }}>
          Troco
        </div>

        <div style={{
          fontSize: '12px',
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          fontWeight: '700',
          color: 'var(--accent-primary)',
          marginBottom: '36px'
        }}>
          Liberté d'Échange & Savoir-Faire
        </div>

        {/* INDICATEUR DE CHARGEMENT HAUTE-COUTURE */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '9px 20px',
          borderRadius: '999px',
          backgroundColor: 'var(--bg-glass)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-secondary)',
          fontSize: '11px',
          fontWeight: '700',
          letterSpacing: '0.06em',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-primary)',
            boxShadow: '0 0 12px var(--accent-primary)',
            animation: 'pulse 1.2s infinite ease-in-out'
          }} />
          <span style={{ textTransform: 'uppercase' }}>Vérification de la session...</span>
        </div>
      </div>
    </div>
  );
}
