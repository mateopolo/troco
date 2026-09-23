import React from 'react';
import { createPortal } from 'react-dom';
import { Scale, CheckCircle } from 'lucide-react';

export default function CguConsentModal({
  isOpen,
  onAccept,
  profile,
  darkMode = false,
  t = (k) => k,
}) {
  const isSessionDismissed = typeof window !== 'undefined' && (
    window.sessionStorage?.getItem('troco_cgu_dismissed') === 'true' ||
    window.localStorage?.getItem('troco_cgu_dismissed') === 'true'
  );

  if (!isOpen || isSessionDismissed) return null;

  const handleAcceptClick = (e) => {
    try {
      window.sessionStorage?.setItem('troco_cgu_dismissed', 'true');
      window.localStorage?.setItem('troco_cgu_dismissed', 'true');
    } catch (_) {}
    onAccept?.(e);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 pb-[calc(76px+env(safe-area-inset-bottom,12px))] box-border /* bg-black/95 */"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        paddingBottom: 'calc(76px + env(safe-area-inset-bottom, 12px))',
        boxSizing: 'border-box',
        animation: 'fadeSlideUp 0.3s ease both',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Conditions Générales & RGPD"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[calc(100dvh-120px)] flex flex-col rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden border border-[var(--border-color,#E8DDD3)] bg-[var(--bg-card,#FAF7F2)] text-[var(--text-main,#3D3530)]"
        style={{
          maxWidth: '672px',
          width: '100%',
          maxHeight: 'calc(100dvh - 120px)',
          backgroundColor: darkMode ? '#231E1B' : '#FAF7F2',
          borderRadius: '24px',
          border: darkMode ? '1px solid rgba(232, 221, 211, 0.15)' : '1px solid #E8DDD3',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
          color: darkMode ? '#FAF7F2' : '#3D3530',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #C67D5B, #A8644A)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              flexShrink: 0,
              boxShadow: '0 4px 14px rgba(198,125,91,0.35)',
            }}>
              <Scale size={22} />
            </div>
            <div>
              <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530' }}>
                Conditions Générales & RGPD
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>
                Cadre juridique et engagement communautaire
              </p>
            </div>
          </div>

          <div style={{
            backgroundColor: darkMode ? '#1A1715' : '#F5F0E8',
            borderRadius: '16px',
            padding: '16px',
            fontSize: '13px',
            lineHeight: 1.65,
            color: darkMode ? '#D4C5B5' : '#6B5E54',
            border: darkMode ? '1px solid rgba(232, 221, 211, 0.12)' : '1px solid #E8DDD3',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <div>
              <strong style={{ color: darkMode ? '#FAF7F2' : '#3D3530' }}>1. Plateforme d'intermédiation technique</strong>
              <p style={{ margin: '4px 0 0' }}>
                Troco met à disposition une infrastructure logicielle permettant aux utilisateurs de publier des annonces, échanger des services et communiquer. Troco n'est pas partie prenante aux contrats conclus entre utilisateurs.
              </p>
            </div>

            <div>
              <strong style={{ color: darkMode ? '#FAF7F2' : '#3D3530' }}>2. Clause de non-responsabilité (P2P)</strong>
              <p style={{ margin: '4px 0 0' }}>
                Les échanges, interventions physiques et prêts de matériel relèvent de la responsabilité exclusive des parties prenantes. Chaque membre s'engage à faire preuve de prudence et de diligence.
              </p>
            </div>

            <div>
              <strong style={{ color: darkMode ? '#FAF7F2' : '#3D3530' }}>3. Protection des données & RGPD</strong>
              <p style={{ margin: '4px 0 0' }}>
                Vos données personnelles (nom, email, ville, compétences) sont strictement isolées sur votre espace sécurisé <code>users/{profile?.uid || 'uid'}</code> et ne sont jamais revendues à des tiers.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAcceptClick}
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
              gap: '8px',
              marginTop: 'auto',
            }}
          >
            <CheckCircle size={18} /> J'accepte les CGU et la Politique RGPD
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
