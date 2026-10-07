import React from 'react';

/**
 * CRTOverlay.jsx
 * Composant de surcouche cathodique (CRT) rétro léger
 * Inclut scanlines, aberration chromatique, vignette et flicker
 */
export default function CRTOverlay({
  children,
  intensity = 0.15,
  showNoise = true,
  showScanlines = true,
  className = '',
  style = {},
}) {
  const scaledOpacity = Math.max(0, Math.min(1, intensity));

  return (
    <div
      className={`crt-overlay-container ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        ...style,
      }}
    >
      <style>{`
        @keyframes crtFlickerAnimation {
          0% { opacity: 0.98; }
          25% { opacity: 1; }
          50% { opacity: 0.97; }
          75% { opacity: 0.99; }
          100% { opacity: 1; }
        }
      `}</style>

      {/* Contenu enfant au premier plan */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
        {children}
      </div>

      {/* Couche d'effet CRT */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 2,
          animation: 'crtFlickerAnimation 100ms infinite',
          opacity: scaledOpacity > 0 ? 1 : 0,
        }}
      >
        {/* 1. Scanlines horizontales à espacement 3px */}
        {showScanlines && (
          <svg
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: scaledOpacity,
            }}
          >
            <defs>
              <pattern id="crt-overlay-lines" width="100%" height="3" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="100%" y2="0" stroke="white" strokeWidth="1" strokeOpacity="0.15" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#crt-overlay-lines)" />
          </svg>
        )}

        {/* 2. Neige / Bruit statique via feTurbulence */}
        {showNoise && (
          <svg
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: scaledOpacity * 0.4,
              mixBlendMode: 'screen',
            }}
          >
            <filter id="crt-overlay-noise">
              <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
              <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.15 0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#crt-overlay-noise)" />
          </svg>
        )}

        {/* 3. Aberration chromatique légère (RGB split) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            mixBlendMode: 'screen',
            opacity: scaledOpacity,
            filter: 'hue-rotate(180deg)',
          }}
        />

        {/* 4. Vignette CRT incurvée */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at center, transparent 55%, rgba(0, 0, 0, 0.5) 100%)',
          }}
        />
      </div>
    </div>
  );
}
