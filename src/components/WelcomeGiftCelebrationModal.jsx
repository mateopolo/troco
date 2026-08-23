import React, { useEffect, useState } from 'react';
import {
  Coins, Sparkles, Check, ArrowRight,
  ShieldCheck, Clock, X
} from 'lucide-react';

export default function WelcomeGiftCelebrationModal({
  isOpen,
  onClose,
  trocoTokens = 10,
  euroBalance = 0,
  darkMode = false,
}) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'var(--overlay-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.3s ease-out',
      }}
    >
      {/* EFFET VISUEL DE PARTICULES SOLAIRES / FESTIVES */}
      {showConfetti && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          {Array.from({ length: 28 }).map((_, i) => {
            const left = Math.random() * 100;
            const delay = Math.random() * 1.5;
            const duration = 2 + Math.random() * 2;
            const colors = ['var(--accent-primary)', 'var(--accent-success)', 'var(--accent-warning)', 'var(--border-color)', 'var(--bg-card)'];
            const color = colors[i % colors.length];
            const size = 6 + Math.random() * 8;

            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: '-20px',
                  left: `${left}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  backgroundColor: color,
                  borderRadius: i % 2 === 0 ? '50%' : '2px',
                  opacity: 0.85,
                  transform: `rotate(${Math.random() * 360}deg)`,
                  animation: `confettiFall ${duration}s ease-in ${delay}s infinite`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* MODAL CONTAINER */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '32px',
          padding: '32px 24px',
          maxWidth: '460px',
          width: '100%',
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-main)',
          textAlign: 'center',
          position: 'relative',
          animation: 'scaleUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* BOUTON DE FERMETURE RAPIDE */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            border: 'none',
            background: 'var(--bg-subtle)',
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-main)',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>

        {/* BADGE VOLANT ET ICONE DE JETON SCINTILLANT */}
        <div style={{ position: 'relative', display: 'inline-block', margin: '10px 0 18px' }}>
          <div
            style={{
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-warning), var(--accent-primary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-accent)',
              margin: '0 auto',
              border: '3px solid var(--border-color)',
            }}
          >
            <Coins size={44} color="#FFF" />
          </div>

          {/* BADGE FLOTTANT +10 */}
          <div
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-16px',
              backgroundColor: 'var(--accent-success)',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: '900',
              padding: '4px 12px',
              borderRadius: '999px',
              boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
              border: '2px solid var(--bg-card)',
              letterSpacing: '0.02em',
            }}
          >
            +{trocoTokens} Jetons
          </div>
        </div>

        {/* TITRE & SOUS-TITRE */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
          <Sparkles size={20} color="var(--accent-primary)" />
          <h2 className="font-editorial-heading" style={{ fontSize: '26px', fontWeight: '600', margin: 0, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
            Cadeau de Bienvenue !
          </h2>
          <Sparkles size={20} color="var(--accent-primary)" />
        </div>

        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 22px' }}>
          Votre compte est prêt. Nous vous offrons <strong style={{ color: 'var(--accent-primary)' }}>{trocoTokens} Jetons Troco</strong> pour démarrer vos premiers échanges en toute liberté.
        </p>

        {/* RÉSUMÉ DU PORTEFEUILLE INITIAL */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: '20px',
            padding: '14px',
            border: '1px solid var(--border-color)',
            marginBottom: '22px',
          }}
        >
          <div style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)', paddingRight: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Solde Porte-monnaie
            </div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--accent-success)', marginTop: '4px' }}>
              {euroBalance.toFixed(2)} €
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Zéro frais caché
            </div>
          </div>

          <div style={{ textAlign: 'center', paddingLeft: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-warning)', textTransform: 'uppercase' }}>
              Solde Jetons Troco
            </div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--accent-warning)', marginTop: '4px' }}>
              {trocoTokens} Jetons 🪙
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              = {trocoTokens}h de services
            </div>
          </div>
        </div>

        {/* AVANTAGES IMMÉDIATS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Check size={12} color="var(--accent-success)" />
            </div>
            <span>Réservez des cours, du matériel ou des services sans carte bancaire</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clock size={12} color="var(--accent-success)" />
            </div>
            <span>1 Jeton = 1 heure de prestation solidaire ou de prêt</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldCheck size={12} color="var(--accent-success)" />
            </div>
            <span>Gagnez de nouveaux jetons dès que vous rendez service</span>
          </div>
        </div>

        {/* BOUTON D'ACTION PRINCIPALE */}
        <button
          onClick={onClose}
          className="premium-button"
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '16px',
            padding: '14px 20px',
            fontSize: '15px',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: 'var(--shadow-accent)',
            transition: 'all 0.2s ease',
          }}
        >
          <span>Accéder à mes 10 Jetons</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

