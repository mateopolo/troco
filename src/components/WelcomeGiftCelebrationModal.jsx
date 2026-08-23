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
        backgroundColor: 'rgba(61, 53, 48, 0.72)',
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
            const colors = ['#C67D5B', '#9CAF88', '#D97706', '#E8DDD3', '#FAF7F2'];
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
          backgroundColor: darkMode ? '#231E1B' : '#FAF7F2',
          borderRadius: '32px',
          padding: '32px 24px',
          maxWidth: '460px',
          width: '100%',
          boxShadow: darkMode ? '0 30px 60px -12px rgba(0, 0, 0, 0.8), 0 0 35px rgba(198,125,91,0.2)' : '0 30px 60px -12px rgba(61, 53, 48, 0.25)',
          border: darkMode ? '1px solid rgba(232, 221, 211, 0.15)' : '1px solid #E8DDD3',
          color: darkMode ? '#FAF7F2' : '#3D3530',
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
            background: darkMode ? 'rgba(232,221,211,0.1)' : '#F5EAE4',
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: darkMode ? '#FAF7F2' : '#3D3530',
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
              background: 'linear-gradient(135deg, #D97706, #B45309)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 12px 30px rgba(217,119,6,0.4)',
              margin: '0 auto',
              border: '3px solid #FDE68A',
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
              backgroundColor: '#9CAF88',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: '900',
              padding: '4px 12px',
              borderRadius: '999px',
              boxShadow: '0 6px 16px rgba(156,175,136,0.5)',
              border: '2px solid #FFFFFF',
              letterSpacing: '0.02em',
            }}
          >
            +{trocoTokens} Jetons
          </div>
        </div>

        {/* TITRE & SOUS-TITRE */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
          <Sparkles size={20} color="#C67D5B" />
          <h2 className="font-editorial-heading" style={{ fontSize: '26px', fontWeight: '600', margin: 0, letterSpacing: '-0.02em', color: darkMode ? '#FAF7F2' : '#3D3530' }}>
            Cadeau de Bienvenue !
          </h2>
          <Sparkles size={20} color="#C67D5B" />
        </div>

        <p style={{ fontSize: '14px', color: darkMode ? '#D4C5B5' : '#6B5E54', lineHeight: '1.5', margin: '0 0 22px' }}>
          Votre compte est prêt. Nous vous offrons <strong style={{ color: '#C67D5B' }}>{trocoTokens} Jetons Troco</strong> pour démarrer vos premiers échanges en toute liberté.
        </p>

        {/* RÉSUMÉ DU PORTEFEUILLE INITIAL */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            backgroundColor: darkMode ? '#1A1715' : '#FFF',
            borderRadius: '20px',
            padding: '14px',
            border: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3',
            marginBottom: '22px',
          }}
        >
          <div style={{ textAlign: 'center', borderRight: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3', paddingRight: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: darkMode ? '#D4C5B5' : '#6B5E54', textTransform: 'uppercase' }}>
              Solde Porte-monnaie
            </div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#7A8F6A', marginTop: '4px' }}>
              {euroBalance.toFixed(2)} €
            </div>
            <div style={{ fontSize: '10px', color: darkMode ? '#9A8E84' : '#6B5E54', marginTop: '2px' }}>
              Zéro frais caché
            </div>
          </div>

          <div style={{ textAlign: 'center', paddingLeft: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#D97706', textTransform: 'uppercase' }}>
              Solde Jetons Troco
            </div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#D97706', marginTop: '4px' }}>
              {trocoTokens} Jetons 🪙
            </div>
            <div style={{ fontSize: '10px', color: darkMode ? '#9A8E84' : '#6B5E54', marginTop: '2px' }}>
              = {trocoTokens}h de services
            </div>
          </div>
        </div>

        {/* AVANTAGES IMMÉDIATS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: darkMode ? 'rgba(156,175,136,0.25)' : '#EBF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Check size={12} color="#7A8F6A" />
            </div>
            <span>Réservez des cours, du matériel ou des services sans carte bancaire</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: darkMode ? 'rgba(156,175,136,0.25)' : '#EBF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clock size={12} color="#7A8F6A" />
            </div>
            <span>1 Jeton = 1 heure de prestation solidaire ou de prêt</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: darkMode ? 'rgba(156,175,136,0.25)' : '#EBF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldCheck size={12} color="#7A8F6A" />
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
            background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)',
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
            boxShadow: '0 10px 24px rgba(198,125,91,0.3)',
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
