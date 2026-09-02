import React, { useId } from 'react';

/**
 * 🌟 TrocoLogo3D — Liquid Infinity (Ruban de Möbius en Verre Irisé)
 * 
 * Illusion 3D volumétrique, réfractions chromatiques et reflets spéculaires
 * 100% dynamiques et réactifs au Theme Engine via CSS variables.
 *
 * @param {number|string} size - Taille en pixels (défaut: 42)
 * @param {boolean} animated - Active l'animation de flottaison liquide 3D
 * @param {string} className - Classes CSS optionnelles
 * @param {object} style - Styles inline optionnels
 */
export default function TrocoLogo3D({
  size = 42,
  animated = false,
  className = '',
  style = {}
}) {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, '');
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  const shouldAnimate = animated && !isMobile;

  const computedWidth = typeof size === 'number' ? `${size * 1.3}px` : size;
  const computedHeight = typeof size === 'number' ? `${size * 0.85}px` : size;

  return (
    <div
      className={`troco-infinity-wrapper ${shouldAnimate ? 'troco-infinity-animated' : ''} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: computedWidth,
        height: computedHeight,
        flexShrink: 0,
        position: 'relative',
        ...style
      }}
    >
      <svg
        viewBox="0 0 240 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: '100%',
          height: '100%',
          filter: isMobile ? 'none' : 'drop-shadow(0 6px 14px rgba(0, 0, 0, 0.28)) drop-shadow(0 0 18px var(--accent-primary, #C67D5B))',
          overflow: 'visible'
        }}
      >
        <defs>
          {/* 1. Réfraction de fond (Boucle arrière gauche) */}
          <linearGradient id={`backLoopLeft-${uid}`} x1="20%" y1="10%" x2="90%" y2="90%">
            <stop offset="0%" stopColor="var(--accent-secondary, #A5A58D)" stopOpacity="0.4" />
            <stop offset="50%" stopColor="var(--accent-primary, #C67D5B)" stopOpacity="0.65" />
            <stop offset="100%" stopColor="var(--text-main, #3D3530)" stopOpacity="0.85" />
          </linearGradient>

          {/* 2. Réfraction de fond (Boucle arrière droite) */}
          <linearGradient id={`backLoopRight-${uid}`} x1="80%" y1="10%" x2="10%" y2="90%">
            <stop offset="0%" stopColor="var(--accent-warning, #DDBEA9)" stopOpacity="0.8" />
            <stop offset="45%" stopColor="var(--accent-primary, #C67D5B)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="var(--accent-secondary, #6B705C)" stopOpacity="0.4" />
          </linearGradient>

          {/* 3. Ruban avant (Torsion Möbius centrale & Arche supérieure) */}
          <linearGradient id={`frontRibbon-${uid}`} x1="0%" y1="20%" x2="100%" y2="80%">
            <stop offset="0%" stopColor="var(--accent-primary, #C67D5B)" stopOpacity="0.95" />
            <stop offset="35%" stopColor="var(--accent-secondary, #DDBEA9)" stopOpacity="0.8" />
            <stop offset="70%" stopColor="var(--accent-primary-hover, #A8644A)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--accent-warning, #FAF7F2)" stopOpacity="0.95" />
          </linearGradient>

          {/* 4. Coeur Iridescent / Prisme chromatique */}
          <linearGradient id={`iridescentCore-${uid}`} x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-secondary, #9CAF88)" stopOpacity="0.75" />
            <stop offset="30%" stopColor="var(--accent-primary, #C67D5B)" stopOpacity="0.9" />
            <stop offset="60%" stopColor="var(--accent-warning, #E8DDD3)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="var(--text-secondary, #6B705C)" stopOpacity="0.6" />
          </linearGradient>

          {/* 5. Éclat spéculaire de surface (Lumière de verre pure) */}
          <linearGradient id={`glassSpecular-${uid}`} x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.3" />
            <stop offset="70%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.1" />
          </linearGradient>

          {/* 6. Liseré sombre pour contraste de profondeur */}
          <linearGradient id={`innerShadow-${uid}`} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="100%" stopColor="var(--text-main, #1A1715)" stopOpacity="0.6" />
          </linearGradient>

          {/* Filtre de brillance & dispersion */}
          <filter id={`glassGlow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ═══ COUCHE 1 : BOUCLES ARRIÈRE (PROFONDEUR & TRANSPARENCE) ═══ */}
        {/* Boucle arrière gauche */}
        <path
          d="M 120 75 C 95 45, 60 25, 35 45 C 10 65, 12 110, 42 122 C 72 134, 102 105, 120 75 Z"
          fill={`url(#backLoopLeft-${uid})`}
          opacity="0.75"
        />

        {/* Boucle arrière droite */}
        <path
          d="M 120 75 C 145 105, 175 134, 205 122 C 235 110, 237 65, 212 45 C 187 25, 152 45, 120 75 Z"
          fill={`url(#backLoopRight-${uid})`}
          opacity="0.8"
        />

        {/* ═══ COUCHE 2 : VOLUME DU RUBAN DE MÖBIUS PRINCIPAL ═══ */}
        {/* Arche fluide gauche -> croisement central */}
        <path
          d="M 38 42 C 65 22, 100 48, 120 75 C 140 102, 175 128, 202 108 C 229 88, 225 52, 198 38 C 171 24, 138 52, 120 75 C 102 98, 69 126, 42 112 C 15 98, 11 62, 38 42 Z"
          fill={`url(#iridescentCore-${uid})`}
          stroke={`url(#frontRibbon-${uid})`}
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* ═══ COUCHE 3 : FACE SUPÉRIEURE ÉCLAIRÉE (EFFET VERRE BOMBÉ) ═══ */}
        {/* Ruban supérieur avant qui passe au premier plan */}
        <path
          d="M 45 40 C 72 26, 102 52, 120 75 C 138 98, 168 124, 195 110 C 222 96, 218 64, 198 48 C 178 32, 142 54, 120 75"
          fill="none"
          stroke={`url(#frontRibbon-${uid})`}
          strokeWidth="7.5"
          strokeLinecap="round"
          opacity="0.92"
        />

        {/* ═══ COUCHE 4 : REFLETS SPÉCULAIRES & CAUSTIQUES (LUSTRE DE VERRE) ═══ */}
        {/* Ligne de reflet blanc pur ultra-brillant au sommet */}
        <path
          d="M 52 35 C 75 24, 104 48, 120 70 C 136 92, 165 116, 188 105"
          fill="none"
          stroke={`url(#glassSpecular-${uid})`}
          strokeWidth="2.8"
          strokeLinecap="round"
        />

        {/* Reflet secondaire sur la boucle inférieure droite */}
        <path
          d="M 180 40 C 205 32, 222 55, 212 85 C 202 115, 175 120, 155 105"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.65"
        />

        {/* Reflet sur la boucle inférieure gauche */}
        <path
          d="M 28 85 C 18 55, 35 32, 60 40"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.55"
        />

        {/* Ombrage interne de courbure */}
        <path
          d="M 105 85 C 115 95, 125 95, 135 85 C 125 75, 115 75, 105 85 Z"
          fill={`url(#innerShadow-${uid})`}
          opacity="0.45"
        />
      </svg>
    </div>
  );
}
