/**
 * TrocoLogoNativeSvg.jsx — Logo Troco Vectoriel Pur & Léger (Phase 108)
 * Zéro canvas, zéro WebGL, zéro shader — 100% SVG natif sans impact VRAM sur mobile
 */

import React, { useId } from 'react';

export default function TrocoLogoNativeSvg({
  size = 42,
  animated = false,
  className = '',
  style = {},
}) {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, '');

  const computedWidth = typeof size === 'number' ? `${size * 1.3}px` : size;
  const computedHeight = typeof size === 'number' ? `${size * 0.85}px` : size;

  return (
    <div
      className={`troco-logo-native-svg ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: computedWidth,
        height: computedHeight,
        flexShrink: 0,
        position: 'relative',
        animation: animated ? 'nativeLogoFloat 3s ease-in-out infinite alternate' : 'none',
        ...style,
      }}
    >
      <style>{`
        @keyframes nativeLogoFloat {
          0% { transform: translateY(0px) scale(1); }
          100% { transform: translateY(-4px) scale(1.02); }
        }
      `}</style>
      <svg
        viewBox="0 0 240 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: '100%',
          height: '100%',
          overflow: 'visible',
        }}
      >
        <defs>
          <linearGradient id={`nativeGrad1-${uid}`} x1="0%" y1="20%" x2="100%" y2="80%">
            <stop offset="0%" stopColor="var(--accent-primary, #C67D5B)" />
            <stop offset="50%" stopColor="var(--accent-secondary, #DDBEA9)" />
            <stop offset="100%" stopColor="var(--accent-primary-hover, #A8644A)" />
          </linearGradient>
          <linearGradient id={`nativeGrad2-${uid}`} x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-secondary, #9CAF88)" stopOpacity="0.8" />
            <stop offset="50%" stopColor="var(--accent-primary, #C67D5B)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--accent-warning, #E8DDD3)" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        {/* Boucle arrière gauche & droite */}
        <path
          d="M 120 75 C 95 45, 60 25, 35 45 C 10 65, 12 110, 42 122 C 72 134, 102 105, 120 75 Z"
          fill={`url(#nativeGrad1-${uid})`}
          opacity="0.75"
        />
        <path
          d="M 120 75 C 145 105, 175 134, 205 122 C 235 110, 237 65, 212 45 C 187 25, 152 45, 120 75 Z"
          fill={`url(#nativeGrad2-${uid})`}
          opacity="0.8"
        />
        {/* Ruban de Möbius principal */}
        <path
          d="M 38 42 C 65 22, 100 48, 120 75 C 140 102, 175 128, 202 108 C 229 88, 225 52, 198 38 C 171 24, 138 52, 120 75 C 102 98, 69 126, 42 112 C 15 98, 11 62, 38 42 Z"
          fill={`url(#nativeGrad2-${uid})`}
          stroke={`url(#nativeGrad1-${uid})`}
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Reflet spéculaire doux */}
        <path
          d="M 45 40 C 72 26, 102 52, 120 75 C 138 98, 168 124, 195 110 C 222 96, 218 64, 198 48 C 178 32, 142 54, 120 75"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.8"
        />
      </svg>
    </div>
  );
}
