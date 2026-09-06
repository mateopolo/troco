/**
 * CookieBanner.jsx — Bannière Cookies & Traceurs CNIL/RGPD
 * Phase 125 : Refonte thème global — variables CSS app, glassmorphism, pills, dark-first.
 */

import React, { useState, useEffect } from 'react';
import { X, Sliders } from 'lucide-react';

export default function CookieBanner({
  darkMode = false,
  onOpenPrivacyCenter = null,
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('troco_cookie_consent');
      if (!consent) {
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
      className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90vw] max-w-md z-[999999] rounded-3xl p-5 shadow-2xl flex flex-col gap-4 backdrop-blur-xl"
      style={{
        background: 'rgba(26, 23, 21, 0.90)',
        border: '1px solid rgba(255, 255, 255, 0.10)',
        boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Bouton fermeture discret en coin supérieur droit */}
      <button
        type="button"
        onClick={() => setIsVisible(false)}
        className="absolute top-3 right-3 p-1.5 rounded-full transition-colors"
        style={{
          color: 'var(--text-secondary)',
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.10)',
        }}
        aria-label="Fermer la bannière"
      >
        <X size={16} />
      </button>

      {/* Titre */}
      <h3
        className="font-editorial-heading flex items-center gap-2 m-0"
        style={{
          fontSize: '15px',
          fontWeight: '700',
          color: 'var(--text-main, #FAF7F2)',
          letterSpacing: '-0.01em',
        }}
      >
        <span>🍪</span>
        <span>Respect de votre vie privée</span>
      </h3>

      {/* Texte explicatif */}
      <p
        className="m-0 leading-relaxed"
        style={{
          fontSize: '12px',
          color: 'var(--text-secondary, rgba(250,247,242,0.55))',
          lineHeight: '1.6',
        }}
      >
        Troco utilise des traceurs strictement nécessaires au fonctionnement du service
        et à la mesure anonyme d'audience. Vous pouvez faire votre choix ou personnaliser
        à tout moment.
      </p>

      {/* Boutons */}
      <div className="flex flex-row flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleAcceptAll}
          className="px-6 py-2.5 rounded-full font-semibold text-sm shadow-lg hover:opacity-90 transition-all whitespace-nowrap"
          style={{
            background: 'var(--accent-primary, #C67D5B)',
            color: '#fff',
          }}
        >
          Tout accepter
        </button>

        <button
          type="button"
          onClick={handleDeclineAll}
          className="px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-white/5 transition-all whitespace-nowrap"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.20)',
            color: 'var(--text-secondary, rgba(250,247,242,0.7))',
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
            className="px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-white/5 transition-all flex items-center gap-1.5 whitespace-nowrap"
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.20)',
              color: 'var(--text-secondary, rgba(250,247,242,0.7))',
            }}
          >
            <Sliders size={13} />
            <span>Personnaliser</span>
          </button>
        )}
      </div>
    </div>
  );
}
