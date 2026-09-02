import React from 'react';

/**
 * 🌟 TrocoLogo — Logo SVG vectoriel officiel de Troco (Ruban de Möbius Liquid Infinity)
 * 
 * Réagit dynamiquement à la couleur du thème via fill="currentColor" ou fill="var(--accent-primary)".
 */
export default function TrocoLogo({
  size = 48,
  className = '',
  style = {},
  color = 'var(--accent-primary, #C67D5B)',
  ...props
}) {
  const computedWidth = typeof size === 'number' ? `${size * 1.4}px` : size;
  const computedHeight = typeof size === 'number' ? `${size}px` : size;

  return (
    <svg
      viewBox="0 0 240 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        width: computedWidth,
        height: computedHeight,
        display: 'inline-block',
        color: color,
        overflow: 'visible',
        flexShrink: 0,
        ...style,
      }}
      aria-label="Logo Troco"
      {...props}
    >
      {/* Boucle arrière gauche (Profondeur) */}
      <path
        d="M 120 75 C 95 45, 60 25, 35 45 C 10 65, 12 110, 42 122 C 72 134, 102 105, 120 75 Z"
        fill="var(--accent-primary, currentColor)"
        opacity="0.72"
      />
      {/* Boucle arrière droite (Profondeur) */}
      <path
        d="M 120 75 C 145 105, 175 134, 205 122 C 235 110, 237 65, 212 45 C 187 25, 152 45, 120 75 Z"
        fill="var(--accent-primary, currentColor)"
        opacity="0.82"
      />
      {/* Ruban de Möbius principal (Volume central) */}
      <path
        d="M 38 42 C 65 22, 100 48, 120 75 C 140 102, 175 128, 202 108 C 229 88, 225 52, 198 38 C 171 24, 138 52, 120 75 C 102 98, 69 126, 42 112 C 15 98, 11 62, 38 42 Z"
        fill="var(--accent-primary, currentColor)"
        stroke="var(--accent-primary, currentColor)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Face supérieure éclairée & reflet spéculaire */}
      <path
        d="M 45 40 C 72 26, 102 52, 120 75 C 138 98, 168 124, 195 110 C 222 96, 218 64, 198 48 C 178 32, 142 54, 120 75"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}
