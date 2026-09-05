import React, { useState, useEffect, useRef } from 'react';
import { Coins, Sparkles } from 'lucide-react';
import { playBetclicBalanceSound } from '../utils/audioService';

/**
 * Composant d'affichage de solde avec animation flottante Betclic (+X Jetons/Euros).
 * Écoute les augmentations de solde et projette un montant vert flottant disparaissant après 2 secondes.
 */
export default function BalanceDisplay({
  euroBalance = 0,
  trocoTokens = 0,
  onOpenWallet,
  onOpenTrocoPlus,
  isMobile = false,
  className = '',
  style = {},
}) {
  const [floatingTokenGain, setFloatingTokenGain] = useState(null);
  const [floatingEuroGain, setFloatingEuroGain] = useState(null);

  const prevTokensRef = useRef(trocoTokens);
  const prevEuroRef = useRef(euroBalance);

  // Écoute des gains de jetons Troco
  useEffect(() => {
    const cur = Number(trocoTokens);
    const prev = Number(prevTokensRef.current);
    if (!isNaN(cur) && !isNaN(prev) && cur > prev) {
      const diff = cur - prev;
      setFloatingTokenGain({ amount: diff, type: 'token' });
      try {
        playBetclicBalanceSound(true);
      } catch (_) {}

      const timer = setTimeout(() => {
        setFloatingTokenGain(null);
      }, 2000);
      prevTokensRef.current = cur;
      return () => clearTimeout(timer);
    }
    prevTokensRef.current = cur;
  }, [trocoTokens]);

  // Écoute des gains d'euros
  useEffect(() => {
    const cur = Number(euroBalance);
    const prev = Number(prevEuroRef.current);
    if (!isNaN(cur) && !isNaN(prev) && cur > prev) {
      const diff = Number((cur - prev).toFixed(2));
      setFloatingEuroGain({ amount: diff, type: 'fiat' });
      try {
        playBetclicBalanceSound(true);
      } catch (_) {}

      const timer = setTimeout(() => {
        setFloatingEuroGain(null);
      }, 2000);
      prevEuroRef.current = cur;
      return () => clearTimeout(timer);
    }
    prevEuroRef.current = cur;
  }, [euroBalance]);

  return (
    <div
      className={`balance-display-container inline-flex items-center gap-2 ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', ...style }}
    >
      {/* BOUTON SOLDE EUROS */}
      <div style={{ position: 'relative' }}>
        {floatingEuroGain && (
          <div
            className="absolute -top-6 left-0 text-green-500 font-bold text-lg animate-float-up-fade"
            style={{
              position: 'absolute',
              top: '-24px',
              left: 0,
              color: '#10B981',
              fontWeight: 'bold',
              fontSize: '18px',
              pointerEvents: 'none',
              zIndex: 50,
              whiteSpace: 'nowrap',
              textShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
            }}
          >
            +{floatingEuroGain.amount} €
          </div>
        )}

        <button
          type="button"
          onClick={onOpenWallet}
          title="Solde Portefeuille Euros"
          style={{
            border: '1px solid var(--accent-primary, #3B82F6)',
            borderRadius: '999px',
            padding: isMobile ? '5px 8px' : '6px 12px',
            backgroundColor: 'var(--bg-subtle, rgba(255, 255, 255, 0.05))',
            color: 'var(--accent-primary, #3B82F6)',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            position: 'relative',
            whiteSpace: 'nowrap',
          }}
        >
          <Coins size={13} style={{ flexShrink: 0 }} />
          <span>{isMobile ? '€' : '€ '}{Number(euroBalance).toFixed(2)}</span>
        </button>
      </div>

      {/* BOUTON SOLDE JETONS */}
      <div style={{ position: 'relative' }}>
        {floatingTokenGain && (
          <div
            className="absolute -top-6 left-0 text-green-500 font-bold text-lg animate-float-up-fade"
            style={{
              position: 'absolute',
              top: '-24px',
              left: 0,
              color: '#10B981',
              fontWeight: 'bold',
              fontSize: '18px',
              pointerEvents: 'none',
              zIndex: 50,
              whiteSpace: 'nowrap',
              textShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
            }}
          >
            +{floatingTokenGain.amount}
          </div>
        )}

        <button
          type="button"
          onClick={onOpenTrocoPlus}
          title="Jetons Troco"
          style={{
            border: '1px solid var(--accent-primary, #3B82F6)',
            borderRadius: '999px',
            padding: isMobile ? '5px 8px' : '6px 12px',
            backgroundColor: 'var(--bg-subtle, rgba(255, 255, 255, 0.05))',
            color: 'var(--accent-primary, #3B82F6)',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            position: 'relative',
            whiteSpace: 'nowrap',
          }}
        >
          <Sparkles size={13} color="var(--accent-primary, #3B82F6)" style={{ flexShrink: 0 }} />
          <span>{trocoTokens} {isMobile ? '' : 'Jetons'}</span>
        </button>
      </div>
    </div>
  );
}
