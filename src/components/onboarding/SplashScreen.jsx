import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TrocoLogoNativeSvg from '../common/TrocoLogoNativeSvg';
import CRTOverlay from './CRTOverlay';
import { applyDitherToImageData } from '../../utils/crtEffects';
import { playSplashSound } from '../../services/audioService';

/**
 * SplashScreen.jsx
 * Écran d'accueil interactif immersif avec esthétique CRT 1-bit Dither.
 * 3 états : 'idle' -> 'animating' -> 'exiting'
 */
export default function SplashScreen({
  onComplete,
  darkMode = true,
  t = (k, def) => def || k,
}) {
  const [phase, setPhase] = useState('idle'); // 'idle' | 'animating' | 'exiting'
  const [typewriterLength, setTypewriterLength] = useState(5);
  const [isGlitching, setIsGlitching] = useState(false);
  const canvasRef = useRef(null);

  const fullWord = 'TROCO';

  // Dessin du motif 1-bit dither abstrait sur le canvas 256x256
  const renderDitherCanvas = (contrast = 1) => {
    try {
      const canvas = canvasRef.current;
      if (!canvas || typeof canvas.getContext !== 'function') return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Dégradé radial
    const grad = ctx.createRadialGradient(w / 2, h / 2, 8, w / 2, h / 2, w / 2);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.4, '#888888');
    grad.addColorStop(1, '#000000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Ondes et cercles géométriques concentriques
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3 * contrast;
    for (let r = 24; r < w / 2; r += 26) {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Lignes de quadrillage
    ctx.lineWidth = 1 * contrast;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();

    // Application de la matrice de Bayer 1-bit Dither
    try {
      const imgData = ctx.getImageData(0, 0, w, h);
      applyDitherToImageData(imgData, 128 / contrast);
      ctx.putImageData(imgData, 0, 0);
    } catch (_) {}
    } catch (_) {}
  };

  useEffect(() => {
    renderDitherCanvas(1);
  }, []);

  const handleStart = async () => {
    if (phase !== 'idle') return;

    setPhase('animating');
    setIsGlitching(true);
    setTypewriterLength(0);

    // Déclenchement du son et du dither renforcé
    playSplashSound().catch(() => {});
    renderDitherCanvas(1.35);

    // Arrêt du glitch initial après 300ms
    setTimeout(() => {
      setIsGlitching(false);
    }, 300);

    // Effet typewriter sur TROCO (+50ms par lettre)
    for (let i = 1; i <= fullWord.length; i++) {
      setTimeout(() => {
        setTypewriterLength(i);
      }, 350 + i * 50);
    }

    // Passage à la phase exiting après 2000ms
    setTimeout(() => {
      setPhase('exiting');
      setIsGlitching(true);
      // Sécurité : déclenchement garanti de onComplete même sans événement CSS/motion
      setTimeout(() => {
        if (typeof onComplete === 'function') {
          onComplete();
        }
      }, 700);
    }, 2000);
  };

  useEffect(() => {
    const handleKeyDown = () => {
      if (phase === 'idle') {
        handleStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase]);

  const handleAnimationEnd = () => {
    if (phase === 'exiting') {
      if (typeof onComplete === 'function') {
        onComplete();
      }
    }
  };

  // 12 particules de convergence
  const particles = Array.from({ length: 12 }).map((_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const distance = 260 + (i % 3) * 40;
    return {
      startX: Math.cos(angle) * distance,
      startY: Math.sin(angle) * distance,
      delay: i * 0.04,
    };
  });

  return (
    <div
      id="troco-crt-splash-screen"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999999,
        backgroundColor: '#0A0A0A',
        color: '#E5F2E5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        userSelect: 'none',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      }}
    >
      <style>{`
        @keyframes crtLogoFlicker {
          0% { opacity: 0.88; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.005); }
          75% { opacity: 0.85; transform: scale(0.998); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes crtGlitchShake {
          0% { transform: translate(0, 0); clip-path: inset(0 0 0 0); }
          20% { transform: translate(-3px, 1px); clip-path: polygon(0 15%, 100% 15%, 100% 30%, 0 30%); }
          40% { transform: translate(2px, -1px); clip-path: polygon(0 60%, 100% 60%, 100% 75%, 0 75%); }
          60% { transform: translate(-2px, 2px); clip-path: polygon(0 40%, 100% 40%, 100% 55%, 0 55%); }
          80% { transform: translate(3px, -2px); clip-path: inset(0 0 0 0); }
          100% { transform: translate(0, 0); clip-path: inset(0 0 0 0); }
        }
      `}</style>

      <CRTOverlay intensity={0.18} showScanlines={true} showNoise={true}>
        <motion.div
          animate={
            phase === 'exiting'
              ? { opacity: [1, 0.9, 0], y: [0, -4, -12], scale: [1, 1.02, 0.98] }
              : isGlitching
              ? { x: [-2, 2, -1, 1, 0], y: [1, -1, 0] }
              : { opacity: 1, x: 0, y: 0 }
          }
          transition={
            phase === 'exiting'
              ? { duration: 0.6, ease: [0.19, 1, 0.22, 1] }
              : { duration: 0.25 }
          }
          onAnimationComplete={handleAnimationEnd}
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100vw',
            height: '100vh',
            animation: isGlitching ? 'crtGlitchShake 0.25s infinite' : 'none',
          }}
        >
          {/* Canvas dither 256x256 en arrière-plan */}
          <motion.div
            animate={{
              opacity: phase === 'idle' ? 0.35 : 0.85,
              scale: phase === 'animating' ? [1, 1.08, 1.02] : 1,
            }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              width: '256px',
              height: '256px',
              borderRadius: '24px',
              overflow: 'hidden',
              filter: 'contrast(160%) brightness(95%) drop-shadow(0 0 30px rgba(229, 242, 229, 0.15))',
              mixBlendMode: 'screen',
              zIndex: 1,
            }}
          >
            <canvas ref={canvasRef} width={256} height={256} style={{ width: '100%', height: '100%' }} />
          </motion.div>

          {/* Particules de convergence lors du clic */}
          {phase === 'animating' && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}>
              {particles.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ x: p.startX, y: p.startY, opacity: 0, scale: 1.8 }}
                  animate={{ x: 0, y: 0, opacity: [0, 1, 0], scale: [1.8, 1, 0.2] }}
                  transition={{
                    duration: 0.8,
                    delay: p.delay,
                    ease: [0.19, 1, 0.22, 1],
                  }}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#E5F2E5',
                    boxShadow: '0 0 10px #E5F2E5',
                    mixBlendMode: 'screen',
                  }}
                />
              ))}
            </div>
          )}

          {/* Contenu central */}
          <div
            style={{
              position: 'relative',
              zIndex: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              padding: '24px',
            }}
          >
            {/* Logo Troco avec animation de flicker CRT */}
            <motion.div
              animate={
                phase === 'animating'
                  ? { scale: [1, 1.12, 1.04], filter: ['brightness(1)', 'brightness(1.8)', 'brightness(1.2)'] }
                  : { scale: 1 }
              }
              transition={{ duration: 0.7, ease: [0.19, 1, 0.22, 1] }}
              style={{
                animation: 'crtLogoFlicker 0.09s infinite',
                filter: 'drop-shadow(0 0 16px rgba(229, 242, 229, 0.4))',
                marginBottom: '16px',
              }}
            >
              <TrocoLogoNativeSvg size={74} animated={false} />
            </motion.div>

            {/* Texte "TROCO" en typographie monospace rétro */}
            <h1
              style={{
                margin: '0 0 8px 0',
                fontSize: 'clamp(44px, 11vw, 76px)',
                fontWeight: '900',
                letterSpacing: '0.3em',
                color: '#E5F2E5',
                textShadow: '0 0 12px rgba(229, 242, 229, 0.7), 0 0 28px rgba(198, 125, 91, 0.45)',
                textTransform: 'uppercase',
                lineHeight: 1.1,
              }}
            >
              {phase === 'animating' ? fullWord.slice(0, typewriterLength) : fullWord}
            </h1>

            {/* Sous-titre rétro */}
            <p
              style={{
                fontSize: '13px',
                letterSpacing: '0.18em',
                color: 'rgba(229, 242, 229, 0.75)',
                margin: '0 0 36px 0',
                textTransform: 'uppercase',
                maxWidth: '420px',
              }}
            >
              {t('splashSubtitle', "L'économie circulaire commence ici")}
            </p>

            {/* Bouton "Entrer sur Troco" */}
            <AnimatePresence>
              {phase === 'idle' && (
                <motion.button
                  key="splash-enter-btn"
                  onClick={handleStart}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    backgroundColor: 'transparent',
                    border: '2px solid #E5F2E5',
                    color: '#E5F2E5',
                    padding: '14px 34px',
                    fontSize: '14px',
                    fontWeight: '800',
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 0 12px rgba(229, 242, 229, 0.25)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#E5F2E5';
                    e.currentTarget.style.color = '#0A0A0A';
                    e.currentTarget.style.boxShadow = '0 0 24px rgba(229, 242, 229, 0.75)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#E5F2E5';
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(229, 242, 229, 0.25)';
                  }}
                >
                  {t('splashEnter', 'Entrer sur Troco')}
                </motion.button>
              )}
            </AnimatePresence>

            {phase === 'idle' && (
              <span
                style={{
                  fontSize: '11px',
                  letterSpacing: '0.15em',
                  opacity: 0.5,
                  marginTop: '12px',
                  textTransform: 'uppercase',
                }}
              >
                {t('splashPressAnyKey', 'Appuyez pour commencer')}
              </span>
            )}

            {/* Message d'initialisation en phase animating */}
            {phase === 'animating' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.6] }}
                transition={{ duration: 0.5 }}
                style={{
                  fontSize: '12px',
                  letterSpacing: '0.25em',
                  color: '#E5F2E5',
                  textTransform: 'uppercase',
                  marginTop: '12px',
                }}
              >
                {t('splashLoading', 'Initialisation...')}
              </motion.div>
            )}
          </div>
        </motion.div>
      </CRTOverlay>
    </div>
  );
}
