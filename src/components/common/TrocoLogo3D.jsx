import React, { useId, useState, useEffect, useRef } from 'react';

/**
 * 🎨 Helpers colorimétriques pour dériver des nuances chromées et irisées fascinantes
 */
function normalizeHex(hex) {
  if (!hex || typeof hex !== 'string') return '#C67D5B';
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return ('#' + h).toUpperCase();
}

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalizeHex(hex));
  if (!m) return { r: 198, g: 125, b: 91 };
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16)
  };
}

function adjustHex(hex, percent) {
  try {
    const { r, g, b } = hexToRgb(hex);
    const amount = Math.round((percent / 100) * 255);
    const clamp = (v) => Math.max(0, Math.min(255, v));
    const toHex = (v) => clamp(v).toString(16).padStart(2, '0');
    return `#${toHex(r + amount)}${toHex(g + amount)}${toHex(b + amount)}`.toUpperCase();
  } catch (_) {
    return hex;
  }
}

function parseGradientColors(gradientStr) {
  if (!gradientStr || typeof gradientStr !== 'string' || !gradientStr.startsWith('linear-gradient')) {
    return null;
  }
  const matches = gradientStr.match(/#(?:[0-9a-fA-F]{3}){1,2}/g);
  if (matches && matches.length >= 2) {
    return {
      from: normalizeHex(matches[0]),
      to: normalizeHex(matches[1])
    };
  }
  return null;
}

/**
 * 🌟 TrocoLogo3D — Ruban de Möbius en Chrome Liquide & Verre Irisé
 *
 * 🎨 RENDU HAUTE FIDÉLITÉ :
 *  - Chrome liquide : gradient vertical à "ligne d'horizon" (effet métal liquide ultra-poli)
 *  - Cœur iridescent à dérive liquide (ondulation SMIL sur desktop)
 *  - Flux lumineux voyageant le long du ruban (stroke-dashoffset fluide)
 *  - Grain métallique feTurbulence borné & texture brossée fine (desktop)
 *  - Étincelles spéculaires stellaires + ombre portée dynamique au sol
 *  - Tilt 3D + glare directionnel réactif au pointeur (via refs, zéro re-render)
 *  - Rétrocompatibilité & réactivité chromatique 100% dynamique (variables CSS ou prop customColor)
 *
 * 🧠 PERFORMANCE (Phase 87/88) :
 *  - Smart Fallback Mobile : mobile (<768px) ou faible RAM (≤3Go) → zéro filtre SVG lourd
 *  - Respect strict de prefers-reduced-motion
 *
 * @param {number|string} size - Taille en pixels (défaut: 42)
 * @param {boolean} animated - Flottement 3D + flux lumineux + étincelles
 * @param {boolean} interactive - Tilt 3D + reflet glare au survol (desktop)
 * @param {string|null} customColor - Couleur personnalisée (hex ou linear-gradient)
 * @param {string|null} color - Alias de customColor
 * @param {string} className - Classes CSS additionnelles
 * @param {object} style - Styles inline optionnels
 */
export default function TrocoLogo3D({
  size = 42,
  animated = false,
  interactive = false,
  customColor = null,
  color = null,
  className = '',
  style = {}
}) {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, '');

  const tiltRef = useRef(null);
  const glareRef = useRef(null);

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [reducedMotion, setReducedMotion] = useState(false);
  const [lowMemory] = useState(() =>
    typeof navigator !== 'undefined' && navigator.deviceMemory ? navigator.deviceMemory <= 3 : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize, { passive: true });

    let cleanupMotion = null;
    if (typeof window.matchMedia === 'function') {
      try {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReducedMotion(Boolean(mq.matches));
        const onMotion = (e) => setReducedMotion(Boolean(e.matches));
        if (mq.addEventListener) {
          mq.addEventListener('change', onMotion);
          cleanupMotion = () => mq.removeEventListener('change', onMotion);
        } else if (mq.addListener) {
          mq.addListener(onMotion);
          cleanupMotion = () => mq.removeListener(onMotion);
        }
      } catch (_) {}
    }

    return () => {
      window.removeEventListener('resize', onResize);
      if (cleanupMotion) cleanupMotion();
    };
  }, []);

  // Mode allégé pour mobile / faible RAM (zéro filtre lourd feTurbulence, zéro crash OOM iOS)
  const lite = isMobile || lowMemory;
  const shouldAnimate = animated && !reducedMotion;
  const canTilt = interactive && !lite && !reducedMotion;

  const computedWidth = typeof size === 'number' ? `${size * 1.3}px` : size;
  const computedHeight = typeof size === 'number' ? `${size * 0.85}px` : size;

  // ── Palette chromatique adaptative (Thème CSS ou Prop Utilisateur) ──
  const effectiveColorProp = customColor || color;
  const gradientParsed = parseGradientColors(effectiveColorProp);

  const primaryColor = gradientParsed
    ? gradientParsed.from
    : (effectiveColorProp ? normalizeHex(effectiveColorProp) : 'var(--accent-primary, #C67D5B)');

  const secondaryColor = gradientParsed
    ? gradientParsed.to
    : (effectiveColorProp ? adjustHex(normalizeHex(effectiveColorProp), 20) : 'var(--accent-secondary, #DDBEA9)');

  const primaryHoverColor = effectiveColorProp
    ? adjustHex(primaryColor, -15)
    : 'var(--accent-primary-hover, #A8644A)';

  const primaryHighlightColor = effectiveColorProp
    ? adjustHex(primaryColor, 35)
    : 'var(--accent-warning, #FAF7F2)';

  const textMainColor = 'var(--text-main, #3D3530)';

  // ── Tilt 3D + glare : mutation directe du DOM (zéro setState) ──
  const handlePointerMove = (e) => {
    const el = tiltRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(550px) rotateX(${(-py * 16).toFixed(2)}deg) rotateY(${(px * 18).toFixed(2)}deg) scale(1.05)`;
    if (glareRef.current) {
      glareRef.current.style.background = `radial-gradient(circle at ${((px + 0.5) * 100).toFixed(1)}% ${((py + 0.5) * 100).toFixed(1)}%, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0) 65%)`;
    }
  };

  const handlePointerLeave = () => {
    if (tiltRef.current) tiltRef.current.style.transform = '';
    if (glareRef.current) glareRef.current.style.background = 'transparent';
  };

  // ── Paths géométriques du Ruban de Möbius ──
  const RIBBON = 'M 38 42 C 65 22, 100 48, 120 75 C 140 102, 175 128, 202 108 C 229 88, 225 52, 198 38 C 171 24, 138 52, 120 75 C 102 98, 69 126, 42 112 C 15 98, 11 62, 38 42 Z';
  const BACK_LEFT = 'M 120 75 C 95 45, 60 25, 35 45 C 10 65, 12 110, 42 122 C 72 134, 102 105, 120 75 Z';
  const BACK_RIGHT = 'M 120 75 C 145 105, 175 134, 205 122 C 235 110, 237 65, 212 45 C 187 25, 152 45, 120 75 Z';
  const TOP_FACE = 'M 45 40 C 72 26, 102 52, 120 75 C 138 98, 168 124, 195 110 C 222 96, 218 64, 198 48 C 178 32, 142 54, 120 75';
  const STAR = 'M 0 -7 L 1.8 -1.8 L 7 0 L 1.8 1.8 L 0 7 L -1.8 1.8 L -7 0 L -1.8 -1.8 Z';

  return (
    <div
      ref={tiltRef}
      onPointerMove={canTilt ? handlePointerMove : undefined}
      onPointerLeave={canTilt ? handlePointerLeave : undefined}
      className={`troco-infinity-wrapper ${className}`}
      role="img"
      aria-label="Troco — logo infini chromé"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: computedWidth,
        height: computedHeight,
        flexShrink: 0,
        position: 'relative',
        transition: canTilt ? 'transform 0.18s ease-out' : undefined,
        ...style
      }}
    >
      {shouldAnimate && (
        <style>{`
          @keyframes tlFloat-${uid} { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-4.5px); } }
          @keyframes tlShadow-${uid} { 0%,100% { transform: scaleX(1); opacity: 0.35; } 50% { transform: scaleX(0.82); opacity: 0.16; } }
          @keyframes tlSheen-${uid} { to { stroke-dashoffset: -100; } }
          @keyframes tlTwinkle-${uid} { 0%,100% { opacity: 0; transform: scale(0.2) rotate(0deg); } 50% { opacity: 0.95; transform: scale(1) rotate(90deg); } }
          .tl-float-${uid} { animation: tlFloat-${uid} 3.6s ease-in-out infinite; will-change: transform; }
          .tl-shadow-${uid} { animation: tlShadow-${uid} 3.6s ease-in-out infinite; }
          .tl-sheen-${uid} { stroke-dasharray: 14 86; animation: tlSheen-${uid} 3.4s linear infinite; }
          .tl-star-${uid} { transform-box: fill-box; transform-origin: center; animation: tlTwinkle-${uid} 2.8s ease-in-out infinite; }
        `}</style>
      )}

      {/* ═══ OMBRE PORTÉE AU SOL (désynchronisée du flottement → véritable effet 3D) ═══ */}
      <div
        className={shouldAnimate ? `tl-shadow-${uid}` : ''}
        style={{
          position: 'absolute',
          left: '12%',
          right: '12%',
          bottom: '-8%',
          height: '16%',
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.40), transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className={shouldAnimate ? `tl-float-${uid}` : ''}
        style={{ display: 'inline-flex', width: '100%', height: '100%', position: 'relative' }}
      >
        <svg
          viewBox="0 0 240 150"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            width: '100%',
            height: '100%',
            filter: lite ? 'none' : 'drop-shadow(0 6px 14px rgba(0, 0, 0, 0.25))',
            overflow: 'visible'
          }}
        >
          <defs>
            {/* 0. Halo ambiant coloré réactif */}
            <radialGradient id={`ambientGlow-${uid}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={primaryColor} stopOpacity="0.45" />
              <stop offset="60%" stopColor={primaryColor} stopOpacity="0.15" />
              <stop offset="100%" stopColor={primaryColor} stopOpacity="0" />
            </radialGradient>

            {/* 1. ★ CHROME LIQUIDE — gradient vertical à ligne d'horizon (secret du métal miroitant) */}
            <linearGradient id={`chromeMain-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="14%" stopColor={secondaryColor} />
              <stop offset="32%" stopColor={primaryColor} />
              <stop offset="47%" stopColor={primaryHoverColor} />
              <stop offset="49.5%" stopColor="#FFFFFF" />
              <stop offset="50.5%" stopColor={textMainColor} />
              <stop offset="66%" stopColor={primaryColor} />
              <stop offset="84%" stopColor={secondaryColor} />
              <stop offset="100%" stopColor={primaryHoverColor} />
            </linearGradient>

            {/* 2. Boucles arrière volumétriques */}
            <linearGradient id={`backLoopLeft-${uid}`} x1="20%" y1="10%" x2="90%" y2="90%">
              <stop offset="0%" stopColor={secondaryColor} stopOpacity="0.4" />
              <stop offset="50%" stopColor={primaryColor} stopOpacity="0.65" />
              <stop offset="100%" stopColor={textMainColor} stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id={`backLoopRight-${uid}`} x1="80%" y1="10%" x2="10%" y2="90%">
              <stop offset="0%" stopColor={primaryHighlightColor} stopOpacity="0.8" />
              <stop offset="45%" stopColor={primaryColor} stopOpacity="0.7" />
              <stop offset="100%" stopColor={secondaryColor} stopOpacity="0.4" />
            </linearGradient>

            {/* 3. Cœur iridescent (+ ondulation SMIL sur desktop animé) */}
            <linearGradient id={`iridescentCore-${uid}`} x1="15%" y1="0%" x2="85%" y2="100%">
              <stop offset="0%" stopColor={secondaryColor} stopOpacity="0.75" />
              <stop offset="30%" stopColor={primaryColor} stopOpacity="0.9" />
              <stop offset="60%" stopColor={primaryHighlightColor} stopOpacity="0.85" />
              <stop offset="100%" stopColor={textMainColor} stopOpacity="0.6" />
              {!lite && shouldAnimate && (
                <>
                  <animate attributeName="x1" values="15%;32%;15%" dur="7s" repeatCount="indefinite" />
                  <animate attributeName="x2" values="85%;68%;85%" dur="7s" repeatCount="indefinite" />
                </>
              )}
            </linearGradient>

            {/* 4. Spéculaire verre pur */}
            <linearGradient id={`glassSpecular-${uid}`} x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.3" />
              <stop offset="70%" stopColor="#FFFFFF" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.1" />
            </linearGradient>

            {/* 5. Ombre interne du nœud central */}
            <linearGradient id={`innerShadow-${uid}`} x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="100%" stopColor={textMainColor} stopOpacity="0.6" />
            </linearGradient>

            {/* 6. Texture brossée (pattern tuilé, peint une fois — desktop) */}
            {!lite && (
              <pattern id={`brush-${uid}`} width="3" height="1.4" patternUnits="userSpaceOnUse">
                <rect width="3" height="0.45" fill="#FFFFFF" opacity="0.06" />
                <rect y="0.9" width="3" height="0.3" fill="#000000" opacity="0.05" />
              </pattern>
            )}

            {/* 7. Grain métallique feTurbulence borné (desktop) */}
            {!lite && (
              <filter id={`grain-${uid}`} x="-5%" y="-5%" width="110%" height="110%">
                <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="7" result="n" />
                <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.07 0" result="na" />
                <feComposite in="na" in2="SourceGraphic" operator="in" />
              </filter>
            )}
          </defs>

          {/* ═══ COUCHE 0 : HALO AMBIANT COLORÉ ═══ */}
          <ellipse cx="120" cy="76" rx="108" ry="60" fill={`url(#ambientGlow-${uid})`} />

          {/* ═══ COUCHE 1 : BOUCLES ARRIÈRE (PROFONDEUR SPATIALE) ═══ */}
          <path d={BACK_LEFT} fill={`url(#backLoopLeft-${uid})`} opacity="0.75" />
          <path d={BACK_RIGHT} fill={`url(#backLoopRight-${uid})`} opacity="0.8" />

          {/* ═══ COUCHE 2 : RUBAN DE MÖBIUS — REMPLISSAGE IRIDESCENT + CONTOUR CHROMÉ ═══ */}
          <path
            d={RIBBON}
            fill={`url(#iridescentCore-${uid})`}
            stroke={`url(#chromeMain-${uid})`}
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* ═══ COUCHE 3 : TEXTURES MÉTAL (desktop : brossé + micro-grain) ═══ */}
          {!lite && <path d={RIBBON} fill={`url(#brush-${uid})`} />}
          {!lite && <path d={RIBBON} fill="#FFFFFF" filter={`url(#grain-${uid})`} />}

          {/* ═══ COUCHE 4 : FACE SUPÉRIEURE CHROMÉE (verre bombé) ═══ */}
          <path
            d={TOP_FACE}
            fill="none"
            stroke={`url(#chromeMain-${uid})`}
            strokeWidth="7.5"
            strokeLinecap="round"
            opacity="0.92"
          />

          {/* ═══ COUCHE 5 : FLUX LUMINEUX VOYAGEANT (dashoffset fluide) ═══ */}
          {shouldAnimate && (
            <path
              d={RIBBON}
              className={`tl-sheen-${uid}`}
              fill="none"
              stroke="#FFFFFF"
              strokeOpacity="0.55"
              strokeWidth="11"
              strokeLinecap="round"
              pathLength="100"
            />
          )}

          {/* ═══ COUCHE 6 : REFLETS SPÉCULAIRES & CAUSTIQUES ═══ */}
          <path
            d="M 52 35 C 75 24, 104 48, 120 70 C 136 92, 165 116, 188 105"
            fill="none"
            stroke={`url(#glassSpecular-${uid})`}
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <path
            d="M 180 40 C 205 32, 222 55, 212 85 C 202 115, 175 120, 155 105"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.65"
          />
          <path
            d="M 28 85 C 18 55, 35 32, 60 40"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.55"
          />

          {/* ═══ COUCHE 7 : NŒUD CENTRAL D'OMBRE INTERNE ═══ */}
          <path
            d="M 105 85 C 115 95, 125 95, 135 85 C 125 75, 115 75, 105 85 Z"
            fill={`url(#innerShadow-${uid})`}
            opacity="0.45"
          />

          {/* ═══ COUCHE 8 : ÉTINCELLES SPÉCULAIRES SCINTILLANTES ═══ */}
          {shouldAnimate && (
            <>
              <path d={STAR} transform="translate(26 30)" fill="#FFFFFF" className={`tl-star-${uid}`} />
              <path d={STAR} transform="translate(214 52) scale(0.8)" fill="#FFFFFF" className={`tl-star-${uid}`} style={{ animationDelay: '1.1s' }} />
              <path d={STAR} transform="translate(120 14) scale(0.65)" fill="#FFFFFF" className={`tl-star-${uid}`} style={{ animationDelay: '2.2s' }} />
            </>
          )}
        </svg>

        {/* ═══ GLARE DYNAMIQUE DIRECTIONNEL (suit le pointeur sur desktop interactif) ═══ */}
        {canTilt && (
          <div
            ref={glareRef}
            style={{
              position: 'absolute',
              inset: '-15%',
              pointerEvents: 'none',
              mixBlendMode: 'soft-light',
              transition: 'background 0.25s ease-out',
            }}
          />
        )}
      </div>
    </div>
  );
}
