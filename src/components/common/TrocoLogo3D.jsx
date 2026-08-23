import React, { useId } from 'react';

/**
 * Composant Logo 3D Isométrique "T" Troco
 * 
 * Totalement dynamique : réagit instantanément aux modifications du Theme Engine
 * grâce aux variables CSS (--accent-primary, --accent-secondary, --text-main, etc.)
 *
 * @param {number|string} size - Largeur/hauteur en pixels (défaut: 28)
 * @param {boolean} animated - Active l'animation de flottaison douce
 * @param {string} className - Classes CSS optionnelles
 * @param {object} style - Styles inline optionnels
 */
export default function TrocoLogo3D({
  size = 28,
  animated = false,
  className = '',
  style = {}
}) {
  const rawId = useId();
  // Nettoyage de l'ID pour les sélecteurs SVG valides
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, '');

  return (
    <div
      className={`troco-logo-3d-wrapper ${animated ? 'troco-logo-3d-floating' : ''} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: typeof size === 'number' ? `${size}px` : size,
        height: typeof size === 'number' ? `${size}px` : size,
        flexShrink: 0,
        ...style
      }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: '100%',
          height: '100%',
          filter: 'drop-shadow(0 3px 6px rgba(0, 0, 0, 0.22))',
          overflow: 'visible'
        }}
      >
        <defs>
          {/* Top Face : Dégradé doux basé sur l'accent secondaire et les tons clairs */}
          <linearGradient id={`facetTop-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-secondary, #DDBEA9)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--accent-secondary, #D4C7B0)" stopOpacity="0.65" />
          </linearGradient>

          {/* Left Ribbon Face : Dégradé vif basé sur l'accent primaire */}
          <linearGradient id={`facetLeft-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-primary, #C67D5B)" />
            <stop offset="100%" stopColor="var(--accent-primary-hover, #A8644A)" />
          </linearGradient>

          {/* Right Ribbon Face : Dégradé basé sur l'accent secondaire vers les tons neutres */}
          <linearGradient id={`facetRight-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-secondary, #A5A58D)" />
            <stop offset="100%" stopColor="var(--text-secondary, #6B705C)" />
          </linearGradient>

          {/* Stem Left Face : Accent primaire assombri vers le texte principal */}
          <linearGradient id={`stemLeft-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-primary-hover, #A8644A)" />
            <stop offset="100%" stopColor="var(--text-main, #3D3530)" />
          </linearGradient>

          {/* Stem Right Face : Neutre sombre vers noir d'accentuation */}
          <linearGradient id={`stemRight-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--text-secondary, #6B705C)" />
            <stop offset="100%" stopColor="var(--text-main, #3F4238)" />
          </linearGradient>
        </defs>

        {/* T Top Bar - Top Face */}
        <polygon points="20,30 50,15 80,30 50,45" fill={`url(#facetTop-${uid})`} />

        {/* T Top Bar - Left Ribbon */}
        <polygon points="20,30 50,45 50,57 20,42" fill={`url(#facetLeft-${uid})`} />

        {/* T Top Bar - Right Ribbon */}
        <polygon points="50,45 80,30 80,42 50,57" fill={`url(#facetRight-${uid})`} />

        {/* T Vertical Stem - Left Face */}
        <polygon points="38,51 50,57 50,90 38,84" fill={`url(#stemLeft-${uid})`} />

        {/* T Vertical Stem - Right Face */}
        <polygon points="50,57 62,51 62,84 50,90" fill={`url(#stemRight-${uid})`} />
      </svg>
    </div>
  );
}
