/**
 * CookieBanner.jsx — Bannière Cookies & Traceurs CNIL/RGPD
 * Restauration esthétique du commit e8869bd
 * Injection au premier plan absolu via React Portal (document.body) avec centrage fluide
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
        // Afficher avec un léger délai pour une entrée fluide
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

  const bannerModal = (
    <div
      className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999999,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <div
        className="relative w-full max-w-lg bg-[var(--bg-card)] text-[var(--text-primary)] rounded-3xl shadow-2xl p-6 md:p-8 border border-white/10 flex flex-col items-center text-center animate-in zoom-in-95 duration-300"
        style={{
          backgroundColor: darkMode ? '#1A1715' : '#FFFFFF',
          color: darkMode ? '#FAF7F2' : '#1F2937',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.4)',
          border: darkMode ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* Bouton de fermeture en coin supérieur droit */}
        <button
          type="button"
          onClick={() => setIsVisible(false)}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          aria-label="Fermer la bannière"
        >
          <X size={18} />
        </button>

        {/* Badge / Icône de confiance */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 flex-shrink-0"
          style={{
            backgroundColor: darkMode ? 'rgba(198, 125, 91, 0.15)' : 'rgba(198, 125, 91, 0.1)',
            color: 'var(--accent-primary, #C67D5B)',
          }}
        >
          <ShieldCheck size={26} />
        </div>

        {/* Titre */}
        <h3 className="text-xl font-bold font-editorial-heading mb-2 flex items-center justify-center gap-2 m-0 text-inherit">
          <span>🍪</span>
          <span>Respect de votre vie privée & Cookies</span>
        </h3>

        {/* Description aérée */}
        <p className="mb-6 text-sm md:text-base text-gray-600 dark:text-gray-300 leading-relaxed max-w-md">
          Troco utilise des traceurs strictement nécessaires au bon fonctionnement de la plateforme et à la mesure d'audience anonyme. Vous pouvez personnaliser vos préférences ou continuer selon votre choix.
        </p>

        {/* Bloc des boutons d'action centrés en Flexbox strict */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-4 w-full">
          {/* Bouton Tout accepter */}
          <button
            type="button"
            onClick={handleAcceptAll}
            className="w-full md:w-auto px-6 py-2.5 bg-[var(--accent-primary)] text-white rounded-full font-semibold text-sm hover:opacity-90 transition-all cursor-pointer"
            style={{
              backgroundColor: 'var(--accent-primary, #C67D5B)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '999px',
              padding: '10px 24px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(198, 125, 91, 0.35)',
            }}
          >
            Tout accepter
          </button>

          {/* Bouton Décliner */}
          <button
            type="button"
            onClick={handleDeclineAll}
            className="w-full md:w-auto px-6 py-2.5 bg-transparent border border-white/20 text-[var(--text-secondary)] rounded-full font-semibold text-sm hover:bg-white/5 transition-all cursor-pointer"
            style={{
              background: 'transparent',
              border: darkMode ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.15)',
              color: darkMode ? '#D1D5DB' : '#4B5563',
              borderRadius: '999px',
              padding: '10px 20px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Décliner
          </button>

          {/* Bouton Personnaliser (si callback fourni) */}
          {typeof onOpenPrivacyCenter === 'function' && (
            <button
              type="button"
              onClick={() => {
                setIsVisible(false);
                onOpenPrivacyCenter();
              }}
              className="w-full md:w-auto px-6 py-2.5 bg-transparent border border-white/20 text-[var(--text-secondary)] rounded-full font-semibold text-sm hover:bg-white/5 transition-all flex items-center justify-center gap-2 cursor-pointer"
              style={{
                background: 'transparent',
                border: darkMode ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.15)',
                color: darkMode ? '#D1D5DB' : '#4B5563',
                borderRadius: '999px',
                padding: '10px 18px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Sliders size={15} />
              <span>Personnaliser</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(bannerModal, document.body);
}
