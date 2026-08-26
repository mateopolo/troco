import React from 'react';
import { Scale, CheckCircle } from 'lucide-react';

export default function CguConsentModal({
  isOpen,
  onAccept,
  profile,
  darkMode = false,
  t = (k) => k,
}) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      backgroundColor: 'var(--overlay-bg, rgba(28, 24, 22, 0.72))',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      animation: 'fadeSlideUp 0.3s ease both'
    }}>
      <div style={{
        maxWidth: '560px',
        width: '100%',
        backgroundColor: 'var(--bg-card, #FAF7F2)',
        borderRadius: '28px',
        padding: '28px',
        border: '1px solid var(--border-color, #E8DDD3)',
        boxShadow: 'var(--shadow-modal, 0 30px 90px rgba(0,0,0,0.25))',
        color: 'var(--text-main, #3D3530)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'var(--bg-subtle, #F5F0E8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary, #C67D5B)' }}>
            <Scale size={22} />
          </div>
          <div>
            <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '22px', fontWeight: '600', color: 'var(--text-main, #3D3530)' }}>
              Conditions Générales & RGPD
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary, #6B5E54)' }}>
              Cadre juridique et engagement communautaire
            </p>
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-subtle, #F5F0E8)',
          borderRadius: '16px',
          padding: '16px',
          fontSize: '13px',
          lineHeight: 1.65,
          color: 'var(--text-secondary, #6B5E54)',
          border: '1px solid var(--border-color, #E8DDD3)',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div>
            <strong style={{ color: 'var(--text-main, #3D3530)' }}>1. Plateforme d'intermédiation technique</strong>
            <p style={{ margin: '4px 0 0' }}>
              Troco met à disposition une infrastructure logicielle permettant aux utilisateurs de publier des annonces, échanger des services et communiquer. Troco n'est pas partie prenante aux contrats conclus entre utilisateurs.
            </p>
          </div>

          <div>
            <strong style={{ color: 'var(--text-main, #3D3530)' }}>2. Clause de non-responsabilité (P2P)</strong>
            <p style={{ margin: '4px 0 0' }}>
              Les échanges, interventions physiques et prêts de matériel relèvent de la responsabilité exclusive des parties prenantes. Chaque membre s'engage à faire preuve de prudence et de diligence.
            </p>
          </div>

          <div>
            <strong style={{ color: 'var(--text-main, #3D3530)' }}>3. Protection des données & RGPD</strong>
            <p style={{ margin: '4px 0 0' }}>
              Vos données personnelles (nom, email, ville, compétences) sont strictement isolées sur votre espace sécurisé <code>users/{profile?.uid || 'uid'}</code> et ne sont jamais revendues à des tiers.
            </p>
          </div>
        </div>

        <button
          onClick={onAccept}
          className="premium-button"
          style={{
            width: '100%',
            border: 'none',
            borderRadius: '16px',
            padding: '14px',
            background: 'linear-gradient(135deg, var(--accent-primary, #C67D5B) 0%, var(--accent-primary-hover, #A8644A) 100%)',
            color: '#FFF',
            fontWeight: '800',
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <CheckCircle size={18} /> J'accepte les CGU et la Politique RGPD
        </button>
      </div>
    </div>
  );
}
