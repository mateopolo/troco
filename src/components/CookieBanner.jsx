/**
 * CookieBanner.jsx — Bannière Cookies & Traceurs CNIL/RGPD
 * Restauration fidèle et exacte de la référence visuelle (Commit e8869bd / Photo 2)
 * Carte flottante élégante au premier plan absolu via React Portal (document.body) avec z-[9999999]
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, X, Sliders } from 'lucide-react';

export default function CookieBanner({
  darkMode = false,
  onOpenPrivacyCenter = null,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const consent = localStorage.getItem('troco_cookie_consent');
      if (!consent) {
        // Affichage fluide avec léger délai
        const timer = setTimeout(() => setIsVisible(true), 1000);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      setIsVisible(false);
    }
  }, []);

  if (!mounted || !isVisible) return null;
  if (typeof document === 'undefined') return null;

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

  const bannerCard = (
    <div
      id="troco-cookie-banner"
      className="fixed bottom-[86px] left-4 right-4 max-w-[640px] mx-auto z-[9999999]"
      style={{
        position: 'fixed',
        bottom: '86px',
        left: '16px',
        right: '16px',
        maxWidth: '640px',
        margin: '0 auto',
        zIndex: 9999999,
        backgroundColor: darkMode ? '#1A1715' : '#FFFFFF',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '24px',
        padding: '18px 22px',
        boxShadow: darkMode
          ? '0 20px 40px -10px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)'
          : 'var(--shadow-modal, 0 20px 40px -10px rgba(0,0,0,0.15))',
        border: darkMode
          ? '1.5px solid rgba(255,255,255,0.12)'
          : '1.5px solid var(--border-color, rgba(0,0,0,0.08))',
        color: darkMode ? '#FAF7F2' : 'var(--text-main, #1F2937)',
        pointerEvents: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
        {/* Badge Icône Bouclier (Gauche) */}
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            backgroundColor: darkMode ? 'rgba(198,125,91,0.15)' : 'var(--bg-subtle, #F5EBE1)',
            color: 'var(--accent-primary, #C67D5B)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ShieldCheck size={22} />
        </div>

        {/* Corps de texte et boutons (Centre) */}
        <div style={{ flex: 1 }}>
          <div
            className="font-editorial-heading"
            style={{
              fontSize: '17px',
              fontWeight: '600',
              marginBottom: '4px',
              color: darkMode ? '#FAF7F2' : 'var(--text-main, #1F2937)',
            }}
          >
            🍪 Respect de votre vie privée & Cookies
          </div>

          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: darkMode ? '#A8998C' : 'var(--text-secondary, #6B7280)',
              lineHeight: 1.5,
            }}
          >
            Troco utilise des traceurs nécessaires au bon fonctionnement de la plateforme et à la mesure d'audience anonyme. Vous pouvez personnaliser vos choix à tout moment.
          </p>

          {/* Rangée de boutons pilule */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              marginTop: '14px',
              alignItems: 'center',
            }}
          >
            {/* Bouton Tout accepter */}
            <button
              type="button"
              onClick={handleAcceptAll}
              className="premium-button"
              style={{
                border: 'none',
                borderRadius: '999px',
                padding: '8px 18px',
                background: 'linear-gradient(135deg, var(--accent-primary, #C67D5B) 0%, var(--accent-primary-hover, #B36846) 100%)',
                backgroundColor: 'var(--accent-primary, #C67D5B)',
                color: 'var(--accent-contrast-text, #FFF)',
                fontWeight: '800',
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-accent, 0 4px 12px rgba(198,125,91,0.3))',
              }}
            >
              Tout accepter
            </button>

            {/* Bouton Continuer sans accepter */}
            <button
              type="button"
              onClick={handleDeclineAll}
              className="premium-button"
              style={{
                border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--border-color, rgba(0,0,0,0.15))',
                borderRadius: '999px',
                padding: '8px 14px',
                backgroundColor: 'transparent',
                color: darkMode ? '#FAF7F2' : 'var(--text-secondary, #4B5563)',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Continuer sans accepter
            </button>

            {/* Bouton Personnaliser (si handler disponible) */}
            {typeof onOpenPrivacyCenter === 'function' && (
              <button
                type="button"
                onClick={() => {
                  setIsVisible(false);
                  onOpenPrivacyCenter();
                }}
                className="premium-button"
                style={{
                  border: 'none',
                  borderRadius: '999px',
                  padding: '8px 12px',
                  backgroundColor: darkMode ? 'rgba(198,125,91,0.15)' : 'var(--bg-subtle, #F5EBE1)',
                  color: 'var(--accent-primary, #C67D5B)',
                  fontWeight: '700',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Sliders size={13} />
                <span>Personnaliser</span>
              </button>
            )}
          </div>
        </div>

        {/* Bouton de fermeture (Droite) */}
        <button
          type="button"
          onClick={() => setIsVisible(false)}
          aria-label="Fermer la bannière"
          style={{
            border: 'none',
            background: 'transparent',
            color: darkMode ? '#9CA3AF' : 'var(--text-secondary, #9CA3AF)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );

  return createPortal(bannerCard, document.body);
}
