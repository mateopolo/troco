import React, { useEffect } from 'react';
import { Sparkles, Coins, Check, ArrowRight, ShieldCheck, Clock, X } from 'lucide-react';

export default function WelcomeGiftCelebrationModal({
  isOpen,
  onClose,
  darkMode = false,
  trocoTokens = 10,
  euroBalance = 0,
}) {
  useEffect(() => {
    if (isOpen) {
      if (navigator.vibrate) navigator.vibrate([100, 50, 150, 50, 200]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 5000,
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <div
        style={{
          position: 'relative',
          backgroundColor: darkMode ? '#0F172A' : '#FFFFFF',
          color: darkMode ? '#F8FAFC' : '#0F172A',
          borderRadius: '32px',
          padding: '36px 28px',
          maxWidth: '460px',
          width: '100%',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(245,158,11,0.25)',
          border: '2px solid rgba(245,158,11,0.4)',
          textAlign: 'center',
          overflow: 'hidden',
          animation: 'scaleUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* HALO LUMINEUX DORÉ D'ARRIÈRE-PLAN */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245,158,11,0.35) 0%, rgba(245,158,11,0) 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* BOUTON FERMER */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: darkMode ? '#94A3B8' : '#64748B',
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
              background: 'linear-gradient(135deg, #F59E0B, #D97706, #B45309)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 12px 30px rgba(245,158,11,0.5)',
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
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: '900',
              padding: '4px 12px',
              borderRadius: '999px',
              boxShadow: '0 6px 16px rgba(16,185,129,0.5)',
              border: '2px solid #FFFFFF',
              letterSpacing: '0.02em',
            }}
          >
            +{trocoTokens} Jetons
          </div>
        </div>

        {/* TITRE & SOUS-TITRE */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
          <Sparkles size={20} color="#F59E0B" />
          <h2 style={{ fontSize: '24px', fontWeight: '900', margin: 0, letterSpacing: '-0.02em' }}>
            Cadeau de Bienvenue !
          </h2>
          <Sparkles size={20} color="#F59E0B" />
        </div>

        <p style={{ fontSize: '14px', color: darkMode ? '#94A3B8' : '#64748B', lineHeight: '1.5', margin: '0 0 22px' }}>
          Votre compte est prêt. Nous vous offrons <strong style={{ color: darkMode ? '#FDE68A' : '#D97706' }}>{trocoTokens} Jetons Troco</strong> pour démarrer vos premiers échanges en toute liberté.
        </p>

        {/* RÉSUMÉ DU PORTEFEUILLE INITIAL */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            backgroundColor: darkMode ? 'rgba(30,41,59,0.7)' : '#F8FAFC',
            borderRadius: '20px',
            padding: '14px',
            border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
            marginBottom: '22px',
          }}
        >
          <div style={{ textAlign: 'center', borderRight: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0', paddingRight: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: darkMode ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>
              Solde Porte-monnaie
            </div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#10B981', marginTop: '4px' }}>
              {euroBalance.toFixed(2)} €
            </div>
            <div style={{ fontSize: '10px', color: darkMode ? '#64748B' : '#94A3B8', marginTop: '2px' }}>
              Zéro frais caché
            </div>
          </div>

          <div style={{ textAlign: 'center', paddingLeft: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: darkMode ? '#FDE68A' : '#D97706', textTransform: 'uppercase' }}>
              Solde Jetons Troco
            </div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: darkMode ? '#FDE68A' : '#D97706', marginTop: '4px' }}>
              {trocoTokens} Jetons 🪙
            </div>
            <div style={{ fontSize: '10px', color: darkMode ? '#64748B' : '#94A3B8', marginTop: '2px' }}>
              = {trocoTokens}h de services
            </div>
          </div>
        </div>

        {/* AVANTAGES IMMÉDIATS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: darkMode ? '#CBD5E1' : '#475569' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Check size={12} color="#10B981" />
            </div>
            <span>Réservez des cours, du matériel ou des services sans carte bancaire</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: darkMode ? '#CBD5E1' : '#475569' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clock size={12} color="#10B981" />
            </div>
            <span>1 Jeton = 1 heure de prestation solidaire ou de prêt</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: darkMode ? '#CBD5E1' : '#475569' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldCheck size={12} color="#10B981" />
            </div>
            <span>Gagnez de nouveaux jetons dès que vous rendez service</span>
          </div>
        </div>

        {/* BOUTON D'ACTION PRINCIPALE */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            backgroundColor: '#04265A',
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
            boxShadow: '0 10px 24px rgba(4,38,90,0.3)',
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
