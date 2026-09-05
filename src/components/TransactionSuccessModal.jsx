import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, X, Sparkles, Coins, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { playApplePaySound, playBetclicBalanceSound } from '../utils/audioService';

/**
 * Modale de confirmation de transaction plein écran (Paiement envoyé ou reçu).
 * Utilisée pour une expérience Fintech immersive avec animation Betclic et feedback sensoriel.
 */
export default function TransactionSuccessModal({
  isOpen = true,
  type = 'sent', // 'sent' | 'received'
  amount = 1,
  currency = 'tokens', // 'tokens' | 'fiat'
  partnerName = '',
  onClose,
}) {
  useEffect(() => {
    if (isOpen) {
      try {
        if (type === 'received') {
          playBetclicBalanceSound(true);
        } else {
          playApplePaySound();
        }
      } catch (_) {}
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  const isReceived = type === 'received';
  const isTokens = currency === 'tokens' || currency === 'token';
  const numAmount = Number(amount) || 0;
  const tokenWord = numAmount > 1 ? 'jetons' : 'jeton';
  const formattedAmount = isTokens
    ? `${numAmount} ${tokenWord}`
    : `${numAmount.toFixed(2)} €`;

  const title = isReceived ? 'Paiement reçu !' : 'Transfert finalisé !';
  const subtitle = isReceived
    ? (partnerName
        ? `Vous avez reçu ${formattedAmount} de ${partnerName}.`
        : `Vous avez reçu ${formattedAmount}.`)
    : (partnerName
        ? `Vous avez envoyé ${formattedAmount} à ${partnerName}.`
        : `Vous avez envoyé ${formattedAmount}.`);

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        className="relative w-full max-w-md text-center"
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'var(--bg-card, #18181B)',
          borderRadius: '28px',
          padding: '32px 24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(16, 185, 129, 0.15)',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
          color: 'var(--text-main, #FFFFFF)',
          position: 'relative',
          animation: 'popIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* BOUTON FERMER HAUT-DROITE */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la confirmation"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            border: 'none',
            backgroundColor: 'var(--bg-subtle, rgba(255, 255, 255, 0.08))',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            color: 'var(--text-secondary, #A1A1AA)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
        >
          <X size={18} />
        </button>

        {/* GLOW & ICÔNE CENTRALE */}
        <div
          style={{
            position: 'relative',
            width: '84px',
            height: '84px',
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Halo lumineux */}
          <div
            style={{
              position: 'absolute',
              inset: '-8px',
              borderRadius: '50%',
              background: isReceived
                ? 'radial-gradient(circle, rgba(16, 185, 129, 0.35) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(14, 165, 233, 0.35) 0%, transparent 70%)',
              animation: 'pulseGlow 2s infinite ease-in-out',
            }}
          />

          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: isReceived
                ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                : 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isReceived
                ? '0 10px 25px -5px rgba(16, 185, 129, 0.5)'
                : '0 10px 25px -5px rgba(14, 165, 233, 0.5)',
              position: 'relative',
            }}
          >
            <CheckCircle2 size={44} strokeWidth={2.4} />
          </div>
        </div>

        {/* TITRE ET STATUT */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '3px 10px',
              borderRadius: '999px',
              backgroundColor: isReceived ? 'rgba(16, 185, 129, 0.15)' : 'rgba(14, 165, 233, 0.15)',
              color: isReceived ? '#10B981' : '#38BDF8',
              border: isReceived ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(14, 165, 233, 0.3)',
            }}
          >
            {isReceived ? 'Crédit Solde' : 'Débit Confirmé'}
          </span>
        </div>

        <h2
          style={{
            margin: '0 0 8px',
            fontSize: '24px',
            fontWeight: '800',
            letterSpacing: '-0.02em',
            color: 'var(--text-main, #FFFFFF)',
          }}
        >
          {title}
        </h2>

        <p
          style={{
            margin: '0 0 24px',
            fontSize: '14px',
            lineHeight: 1.5,
            color: 'var(--text-secondary, #A1A1AA)',
          }}
        >
          {subtitle}
        </p>

        {/* CARTE RÉCAPITULATIVE */}
        <div
          style={{
            backgroundColor: 'var(--bg-subtle, rgba(255, 255, 255, 0.04))',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            borderRadius: '20px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: isReceived ? 'rgba(16, 185, 129, 0.12)' : 'rgba(14, 165, 233, 0.12)',
                color: isReceived ? '#10B981' : '#0EA5E9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isTokens ? (
                <Sparkles size={20} />
              ) : (
                <Coins size={20} />
              )}
            </div>

            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary, #A1A1AA)', textTransform: 'uppercase' }}>
                {isTokens ? 'Monnaie Troco' : 'Euros Fiat'}
              </div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main, #FFFFFF)' }}>
                {isTokens ? 'Jetons de Temps' : 'Portefeuille'}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: '20px',
                fontWeight: '900',
                color: isReceived ? '#10B981' : 'var(--text-main, #FFFFFF)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                justifyContent: 'flex-end',
              }}
            >
              {isReceived ? (
                <>
                  <ArrowDownLeft size={16} /> +{numAmount}
                </>
              ) : (
                <>
                  <ArrowUpRight size={16} /> -{numAmount}
                </>
              )}
              {isTokens ? ' 🪙' : ' €'}
            </div>
            <div style={{ fontSize: '10px', color: '#10B981', fontWeight: '700' }}>
              Statut : Validé ⚡
            </div>
          </div>
        </div>

        {/* BOUTON FERMER */}
        <button
          type="button"
          onClick={onClose}
          className="premium-button"
          style={{
            width: '100%',
            backgroundColor: '#10B981',
            backgroundImage: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '16px',
            padding: '14px 20px',
            fontWeight: '800',
            fontSize: '15px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 10px 20px -5px rgba(16, 185, 129, 0.4)',
            transition: 'all 0.2s ease',
          }}
        >
          Fermer
        </button>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}
