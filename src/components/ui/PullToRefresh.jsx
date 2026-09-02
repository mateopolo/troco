import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { RefreshCw, ArrowDown } from 'lucide-react';
import { hapticLight, hapticSuccess } from '../../utils/haptics';

/**
 * PullToRefresh.jsx
 * Composant élastique "Tirer pour actualiser" (Apple-grade Spring Physics)
 * 
 * @param {Object} props
 * @param {() => Promise<any>} props.onRefresh - Fonction asynchrone de rafraîchissement
 * @param {React.ReactNode} props.children - Contenu de la liste ou du flux
 * @param {number} [props.threshold=65] - Distance de tirage en px pour déclencher l'action
 * @param {number} [props.maxPull=120] - Étirement maximal autorisé
 * @param {boolean} [props.disabled=false] - Désactiver le geste (ex: sur desktop non-touch si souhaité)
 * @param {string} [props.className='']
 * @param {Object} [props.style={}]
 */
export function PullToRefresh({
  onRefresh,
  children,
  threshold = 65,
  maxPull = 120,
  disabled = false,
  className = '',
  style = {},
}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canRelease, setCanRelease] = useState(false);

  const containerRef = useRef(null);
  const startYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const canReleaseRef = useRef(false);
  const hasTriggeredHapticRef = useRef(false);
  const controls = useAnimation();

  // Calcul logarithmique de résistance élastique
  const calculateRubberbandDistance = useCallback((deltaY) => {
    if (deltaY <= 0) return 0;
    // Résistance progressive type iOS
    const tension = 0.5;
    return Math.min(maxPull, deltaY * tension * (1 - Math.min(deltaY / (maxPull * 3), 0.5)));
  }, [maxPull]);

  const getClientY = (e) => {
    if (e.touches && e.touches.length > 0) return e.touches[0].clientY;
    if (e.changedTouches && e.changedTouches.length > 0) return e.changedTouches[0].clientY;
    return typeof e.clientY === 'number' ? e.clientY : 0;
  };

  const handleTouchStart = (e) => {
    if (disabled || isRefreshing) return;

    // Vérifier si le conteneur ou la fenêtre est tout en haut
    const scrollTop = window.scrollY || document.documentElement.scrollTop || (containerRef.current ? containerRef.current.scrollTop : 0);
    if (scrollTop > 5) return;

    startYRef.current = getClientY(e);
    isDraggingRef.current = true;
    canReleaseRef.current = false;
    hasTriggeredHapticRef.current = false;
  };

  const handleTouchMove = (e) => {
    if (!isDraggingRef.current || disabled || isRefreshing) return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop || (containerRef.current ? containerRef.current.scrollTop : 0);
    if (scrollTop > 5) {
      if (pullDistance > 0) {
        setPullDistance(0);
        setCanRelease(false);
        canReleaseRef.current = false;
      }
      return;
    }

    const currentY = getClientY(e);
    const rawDelta = currentY - startYRef.current;

    if (rawDelta > 0) {
      const damped = calculateRubberbandDistance(rawDelta);
      setPullDistance(damped);

      const isReady = damped >= threshold;
      setCanRelease(isReady);
      canReleaseRef.current = isReady;

      if (isReady && !hasTriggeredHapticRef.current) {
        hapticLight();
        hasTriggeredHapticRef.current = true;
      } else if (!isReady && hasTriggeredHapticRef.current) {
        hasTriggeredHapticRef.current = false;
      }
    } else {
      setPullDistance(0);
      setCanRelease(false);
      canReleaseRef.current = false;
    }
  };

  const handleTouchEnd = async () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const shouldTrigger = canReleaseRef.current || canRelease;

    if (shouldTrigger && !isRefreshing && typeof onRefresh === 'function') {
      setIsRefreshing(true);
      setCanRelease(false);
      canReleaseRef.current = false;
      hapticSuccess();

      // Animer la liste vers la hauteur du seuil pendant le chargement
      controls.start({
        y: threshold,
        transition: { type: 'spring', stiffness: 350, damping: 25 },
      });

      try {
        await Promise.all([
          onRefresh(),
          new Promise((resolve) => setTimeout(resolve, 500)),
        ]);
      } catch (err) {
        console.warn('[PullToRefresh] Refresh failed:', err);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        controls.start({
          y: 0,
          transition: { type: 'spring', stiffness: 400, damping: 30 },
        });
      }
    } else {
      setPullDistance(0);
      setCanRelease(false);
      controls.start({
        y: 0,
        transition: { type: 'spring', stiffness: 450, damping: 30 },
      });
    }
  };

  // Synchroniser la position manuelle pendant le glissement
  useEffect(() => {
    if (!isRefreshing && isDraggingRef.current) {
      controls.set({ y: pullDistance });
    }
  }, [pullDistance, isRefreshing, controls]);

  const progress = Math.min(1, pullDistance / threshold);
  const rotationAngle = progress * 180;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`pull-to-refresh-container ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100%',
        touchAction: 'pan-y',
        ...style,
      }}
    >
      {/* INDICATEUR DE CHARGEMENT PREMIUM (SPINNER & HALO SOUS LA NAV) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: `${threshold}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 40,
          opacity: isRefreshing ? 1 : Math.max(0, (pullDistance - 10) / (threshold - 10)),
          transform: `translateY(${Math.min(pullDistance - threshold, 0)}px)`,
          transition: isRefreshing ? 'opacity 0.2s ease' : 'none',
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12), 0 0 12px var(--accent-primary, #C67D5B)33',
            border: '1px solid var(--border-color, rgba(0,0,0,0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-primary, #C67D5B)',
            transform: `scale(${isRefreshing ? 1 : 0.7 + progress * 0.3})`,
            transition: 'transform 0.15s ease',
          }}
        >
          {isRefreshing ? (
            <RefreshCw
              size={18}
              strokeWidth={2.5}
              style={{ animation: 'ptr-spin 0.8s linear infinite' }}
            />
          ) : (
            <ArrowDown
              size={18}
              strokeWidth={2.5}
              style={{
                transform: `rotate(${rotationAngle}deg)`,
                transition: 'transform 0.1s linear',
              }}
            />
          )}
        </div>
      </div>

      {/* CONTENU ANIMÉ ÉLASTIQUE */}
      <motion.div
        animate={controls}
        initial={{ y: 0 }}
        style={{ width: '100%', height: '100%' }}
      >
        {children}
      </motion.div>

      <style>{`
        @keyframes ptr-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default PullToRefresh;
