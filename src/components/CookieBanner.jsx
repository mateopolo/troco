/**
 * CookieBanner.jsx — Bannière Cookies & Traceurs CNIL/RGPD
 * Modale compacte flottante parfaitement centrée avec boutons sur une seule ligne
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
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999999] w-[90%] max-w-2xl bg-white dark:bg-[#1A1715] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 p-5 flex flex-col gap-3 items-center text-center animate-fadeIn"
      style={{
        boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.25)',
      }}
    >
      {/* Bouton fermeture discret en coin supérieur droit */}
      <button
        type="button"
        onClick={() => setIsVisible(false)}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
        aria-label="Fermer la bannière"
      >
        <X size={18} />
      </button>

      {/* Titre discret et centré */}
      <h3 className="text-lg font-semibold flex items-center justify-center gap-2 text-gray-900 dark:text-gray-100 m-0">
        <span>🍪</span>
        <span>Respect de votre vie privée & Cookies</span>
      </h3>

      {/* Texte explicatif petit et lisible */}
      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 m-0 max-w-xl leading-relaxed">
        Troco utilise des traceurs strictement nécessaires au fonctionnement du service et à la mesure anonyme d'audience. Vous pouvez faire votre choix ou personnaliser à tout moment.
      </p>

      {/* Boutons compacts sur une seule ligne */}
      <div className="flex flex-row flex-nowrap items-center justify-center gap-2 w-full mt-2">
        <button
          type="button"
          onClick={handleAcceptAll}
          className="px-4 py-2 text-sm font-medium bg-[var(--accent-primary,#C67D5B)] text-white rounded-full whitespace-nowrap hover:opacity-90 transition-opacity"
        >
          Tout accepter
        </button>

        <button
          type="button"
          onClick={handleDeclineAll}
          className="px-4 py-2 text-sm font-medium bg-transparent border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-full whitespace-nowrap hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
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
            className="px-4 py-2 text-sm font-medium bg-transparent border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-full whitespace-nowrap hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5"
          >
            <Sliders size={14} />
            <span>Personnaliser</span>
          </button>
        )}
      </div>
    </div>
  );
}
