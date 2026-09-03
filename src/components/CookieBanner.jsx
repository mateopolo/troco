/**
 * CookieBanner.jsx — Bannière Cookies & Traceurs CNIL/RGPD (Phase 104)
 * Centrage global absolu, flexbox responsive et boutons sans wrapping disgracieux
 */

import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, Sliders } from 'lucide-react';

export default function CookieBanner({
  darkMode = false,
  onOpenPrivacyCenter = null,
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('troco_cookie_consent');
      if (!consent) {
        // Afficher avec un léger délai pour une entrée fluide
        const timer = setTimeout(() => setIsVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      setIsVisible(false);
    }
  }, []);

  if (!isVisible) return null;

  const handleAcceptAll = () => {
    try {
      localStorage.setItem('troco_cookie_consent', 'accepted');
      localStorage.setItem('troco_privacy_settings', JSON.stringify({
        necessary: true,
        analytics: true,
        proximityAlerts: true,
        marketingEmails: true,
      }));
    } catch (e) {}
    setIsVisible(false);
  };

  const handleDeclineAll = () => {
    try {
      localStorage.setItem('troco_cookie_consent', 'declined');
      localStorage.setItem('troco_privacy_settings', JSON.stringify({
        necessary: true,
        analytics: false,
        proximityAlerts: false,
        marketingEmails: false,
      }));
    } catch (e) {}
    setIsVisible(false);
  };

  return (
    <div
      className="fixed bottom-0 inset-x-0 mx-auto max-w-4xl p-4 md:p-6 bg-white dark:bg-[#1A1715] rounded-t-2xl shadow-2xl z-[999999] flex flex-col items-center text-center"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        margin: '0 auto',
        maxWidth: '896px',
        width: '100%',
        boxSizing: 'border-box',
        zIndex: 999999,
        backgroundColor: darkMode ? '#1A1715' : '#FFFFFF',
        color: darkMode ? '#FAF7F2' : '#2D2520',
        borderTop: darkMode ? '1.5px solid rgba(255,255,255,0.08)' : '1.5px solid rgba(0,0,0,0.08)',
        borderLeft: darkMode ? '1.5px solid rgba(255,255,255,0.08)' : '1.5px solid rgba(0,0,0,0.08)',
        borderRight: darkMode ? '1.5px solid rgba(255,255,255,0.08)' : '1.5px solid rgba(0,0,0,0.08)',
        borderTopLeftRadius: '20px',
        borderTopRightLeftRadius: '20px',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.18)',
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      {/* Bouton fermeture discret en coin supérieur droit */}
      <button
        type="button"
        onClick={() => setIsVisible(false)}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          border: 'none',
          background: 'transparent',
          color: darkMode ? '#A89F91' : '#8A7E73',
          cursor: 'pointer',
          padding: '6px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label="Fermer la bannière"
      >
        <X size={18} />
      </button>

      {/* En-tête centré */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', maxWidth: '640px', width: '100%' }}>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(198,125,91,0.2) 0%, rgba(198,125,91,0.1) 100%)',
            color: 'var(--accent-primary, #C67D5B)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '4px',
          }}
        >
          <ShieldCheck size={24} />
        </div>

        <div className="font-editorial-heading" style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.3px', margin: 0 }}>
          🍪 Respect de votre vie privée & Cookies
        </div>

        <p style={{ margin: 0, fontSize: '13px', color: darkMode ? '#B8ABA0' : '#6B5E54', lineHeight: 1.5 }}>
          Troco utilise des traceurs strictement nécessaires au fonctionnement du service et à la mesure anonyme d'audience. Vous pouvez faire votre choix ou personnaliser à tout moment.
        </p>
      </div>

      {/* Conteneur des boutons centré Flexbox */}
      <div className="flex flex-row flex-wrap items-center justify-center gap-3 w-full mt-4" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '12px', width: '100%', marginTop: '16px' }}>
        <button
          type="button"
          onClick={handleAcceptAll}
          className="premium-button whitespace-nowrap text-sm md:text-base px-4 py-2 flex-1 min-w-[120px] max-w-[200px] text-center justify-center"
          style={{
            border: 'none',
            borderRadius: '999px',
            padding: '10px 20px',
            background: 'linear-gradient(135deg, var(--accent-primary, #C67D5B) 0%, var(--accent-primary-hover, #A8644A) 100%)',
            color: '#FFFFFF',
            fontWeight: '800',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(198,125,91,0.3)',
          }}
        >
          Tout accepter
        </button>

        <button
          type="button"
          onClick={handleDeclineAll}
          className="premium-button whitespace-nowrap text-sm md:text-base px-4 py-2 flex-1 min-w-[120px] max-w-[200px] text-center justify-center"
          style={{
            border: darkMode ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid rgba(0,0,0,0.12)',
            borderRadius: '999px',
            padding: '10px 20px',
            backgroundColor: 'transparent',
            color: 'inherit',
            fontWeight: '700',
            cursor: 'pointer',
          }}
        >
          Continuer sans accepter
        </button>

        {typeof onOpenPrivacyCenter === 'function' && (
          <button
            type="button"
            onClick={() => {
              setIsVisible(false);
              onOpenPrivacyCenter();
            }}
            className="premium-button whitespace-nowrap text-sm md:text-base px-4 py-2 flex-1 min-w-[120px] max-w-[200px] text-center justify-center"
            style={{
              border: 'none',
              borderRadius: '999px',
              padding: '10px 18px',
              backgroundColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
              color: 'var(--accent-primary, #C67D5B)',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sliders size={14} /> Personnaliser
          </button>
        )}
      </div>
    </div>
  );
}
