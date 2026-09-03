import React, { useState, useEffect, useRef } from 'react';
import { playBetclicBalanceSound } from '../utils/audioService';

// ---- COMPOSANT SOLDE ANIMÉ (ANIMATION ROULEAU STYLE BETCLIC & BADGE VOLANT) ----
export const AnimatedEuroBalance = ({ value, style, prefix = '', suffix = ' €', showBadge = true }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [badgeInfo, setBadgeInfo] = useState(null); // { delta, id }
  const prevValueRef = useRef(value);

  useEffect(() => {
    let rafId = null;
    let timerId = null;
    const prev = prevValueRef.current;
    if (typeof value === 'number' && !isNaN(value) && prev !== value) {
      const diff = Number((value - prev).toFixed(2));
      setBadgeInfo({ delta: diff, id: prev + '_' + value }); // stable id per transition
      playBetclicBalanceSound(diff > 0);

      const startTime = performance.now();
      const duration = 900;
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Number((prev + diff * ease).toFixed(2)));
        if (progress < 1) {
          rafId = requestAnimationFrame(animate);
        } else {
          setDisplayValue(value);
          timerId = setTimeout(() => setBadgeInfo(null), 1900);
        }
      };
      rafId = requestAnimationFrame(animate);
      prevValueRef.current = value;
    } else {
      setDisplayValue(value);
    }
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (timerId) clearTimeout(timerId);
    };
  }, [value]);

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '3px', ...style }}>
      {prefix}{displayValue.toFixed(2)}{suffix}
      {showBadge && badgeInfo !== null && (
        <span
          key={badgeInfo.id}
          style={{
            position: 'absolute',
            top: '-22px',
            right: '-12px',
            backgroundColor: badgeInfo.delta > 0 ? '#10B981' : '#EF4444',
            color: '#FFFFFF',
            fontSize: '11px',
            fontWeight: '900',
            padding: '2px 8px',
            borderRadius: '999px',
            boxShadow: badgeInfo.delta > 0 ? '0 4px 14px rgba(16,185,129,0.4)' : '0 4px 14px rgba(239,68,68,0.4)',
            zIndex: 20,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            animation: 'betclicBadgeAnim 1.8s ease-out forwards',
          }}
        >
          {badgeInfo.delta > 0 ? `+${badgeInfo.delta.toFixed(2)} €` : `${badgeInfo.delta.toFixed(2)} €`}
        </span>
      )}
    </span>
  );
};

// ---- COMPOSANT SOLDE JETONS ANIMÉ ----
export const AnimatedTokenBalance = ({ value, style, formatFn }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [badgeInfo, setBadgeInfo] = useState(null); // { delta, id }
  const prevValueRef = useRef(value);

  useEffect(() => {
    let rafId = null;
    let timerId = null;
    const prev = prevValueRef.current;
    if (typeof value === 'number' && !isNaN(value) && prev !== value) {
      const diff = value - prev;
      setBadgeInfo({ delta: diff, id: prev + '_' + value });
      playBetclicBalanceSound(diff > 0);

      const startTime = performance.now();
      const duration = 750;
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.round(prev + diff * ease));
        if (progress < 1) {
          rafId = requestAnimationFrame(animate);
        } else {
          setDisplayValue(value);
          timerId = setTimeout(() => setBadgeInfo(null), 2000);
        }
      };
      rafId = requestAnimationFrame(animate);
      prevValueRef.current = value;
    } else {
      setDisplayValue(value);
    }
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (timerId) clearTimeout(timerId);
    };
  }, [value]);

  const formatted = formatFn ? formatFn(displayValue) : `${displayValue} Jetons`;

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', ...style }}>
      {formatted}
      {badgeInfo !== null && badgeInfo.delta !== 0 && (
        <span
          key={badgeInfo.id}
          style={{
            position: 'absolute',
            top: '-22px',
            right: '-12px',
            backgroundColor: badgeInfo.delta > 0 ? '#10B981' : '#EF4444',
            color: '#FFFFFF',
            fontSize: '11px',
            fontWeight: '900',
            padding: '2px 8px',
            borderRadius: '999px',
            boxShadow: badgeInfo.delta > 0 ? '0 4px 14px rgba(16,185,129,0.5)' : '0 4px 14px rgba(239,68,68,0.4)',
            zIndex: 20,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            animation: 'betclicBadgeAnim 2s ease-out forwards',
          }}
        >
          {badgeInfo.delta > 0 ? `+${badgeInfo.delta} Jeton${badgeInfo.delta > 1 ? 's' : ''}` : `${badgeInfo.delta} Jeton${Math.abs(badgeInfo.delta) > 1 ? 's' : ''}`}
        </span>
      )}
    </span>
  );
};
