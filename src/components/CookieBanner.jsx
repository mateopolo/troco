/**
 * CookieBanner.jsx — Bannière de Consentement Strict & Gestion des Traceurs
 * Strictement conforme aux directives ePrivacy et aux recommandations CNIL (septembre 2020) :
 * - Blocage pré-consentement absolu de tout traceur non strictement nécessaire.
 * - Le bouton de refus (« Continuer sans accepter ») est aussi facile d'accès que « Tout accepter ».
 * - Panneau de personnalisation granulaire avec explications claires et switchs désactivés par défaut.
 * - Respect du design system Troco (cartes flottantes, rounded-full pills, glassmorphism, thèmes clair/sombre).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, X, Sliders, ChevronDown, ChevronUp, Check, Lock, Info, ExternalLink } from 'lucide-react';
import {
  getConsentStatus,
  getPrivacySettings,
  saveConsent,
  revokeAllConsent,
} from '../services/consentManager';

export default function CookieBanner({
  darkMode = false,
  onOpenPrivacyCenter = null,
  onNavigate = null,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [mounted, setMounted] = useState(false);

  // État local des préférences personnalisées (Opt-in strict : tout à false par défaut sauf nécessaire)
  const [localSettings, setLocalSettings] = useState(() => ({
    necessary: true,
    analytics: false,
    proximityAlerts: false,
    marketingEmails: false,
  }));

  useEffect(() => {
    setMounted(true);
    const status = getConsentStatus();
    if (status === 'pending') {
      // Affichage fluide de la bannière avec un léger délai
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // Écoute des révocations manuelles depuis d'autres composants
  useEffect(() => {
    const handleConsentEvent = (e) => {
      if (e.detail?.status === 'pending') {
        setIsVisible(true);
      }
    };
    window.addEventListener('troco:consent_changed', handleConsentEvent);
    return () => window.removeEventListener('troco:consent_changed', handleConsentEvent);
  }, []);

  const handleAcceptAll = useCallback(() => {
    saveConsent('accepted', {
      necessary: true,
      analytics: true,
      proximityAlerts: true,
      marketingEmails: false,
    });
    setIsVisible(false);
    setIsCustomizing(false);
  }, []);

  const handleDeclineAll = useCallback(() => {
    revokeAllConsent();
    setIsVisible(false);
    setIsCustomizing(false);
  }, []);

  const handleSaveCustom = useCallback(() => {
    saveConsent('accepted', {
      necessary: true,
      analytics: Boolean(localSettings.analytics),
      proximityAlerts: Boolean(localSettings.proximityAlerts),
      marketingEmails: Boolean(localSettings.marketingEmails),
    });
    setIsVisible(false);
    setIsCustomizing(false);
  }, [localSettings]);

  const handlePolicyLinkClick = (e, tab) => {
    e.preventDefault();
    if (typeof onNavigate === 'function') {
      onNavigate(tab);
    } else if (typeof window !== 'undefined') {
      window.location.hash = tab;
    }
  };

  if (!mounted || !isVisible) return null;
  if (typeof document === 'undefined') return null;

  const bannerCard = (
    <aside
      id="troco-cookie-banner"
      role="region"
      aria-label="Gestion des cookies et traceurs de navigation"
      aria-live="polite"
      className="fixed bottom-4 md:bottom-6 left-3 right-3 md:left-6 md:right-6 max-w-[700px] mx-auto z-[9999999]"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '16px',
        right: '16px',
        maxWidth: '700px',
        margin: '0 auto',
        zIndex: 9999999,
        backgroundColor: darkMode ? '#1A1715' : '#FFFFFF',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '24px',
        padding: '20px 24px',
        boxShadow: darkMode
          ? '0 25px 50px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.12)'
          : '0 25px 50px -12px rgba(61, 53, 48, 0.2), 0 0 0 1px rgba(232, 221, 211, 0.8)',
        border: darkMode
          ? '1.5px solid rgba(255,255,255,0.12)'
          : '1.5px solid var(--border-color, #E8DDD3)',
        color: darkMode ? '#FAF7F2' : '#3D3530',
        pointerEvents: 'auto',
        fontFamily: 'var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
        {/* Badge Icône Bouclier (Gauche) */}
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            backgroundColor: darkMode ? 'rgba(198,125,91,0.18)' : '#F5EAE4',
            color: '#C67D5B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(198,125,91,0.2)',
          }}
          aria-hidden="true"
        >
          <ShieldCheck size={22} />
        </div>

        {/* Corps principal */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <h2
              style={{
                fontSize: '16.5px',
                fontWeight: '700',
                margin: 0,
                color: darkMode ? '#FAF7F2' : '#231E1B',
                letterSpacing: '-0.01em',
              }}
            >
              🍪 Protection de votre vie privée & Cookies
            </h2>

            {/* Bouton de fermeture d'urgence (équivaut à refuser selon CNIL) */}
            <button
              type="button"
              onClick={handleDeclineAll}
              aria-label="Fermer la bannière et refuser les traceurs"
              className="focus:ring-2"
              style={{
                border: 'none',
                background: 'transparent',
                color: darkMode ? '#A8998C' : '#8A7A6D',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
              }}
            >
              <X size={18} />
            </button>
          </div>

          <p
            style={{
              margin: '8px 0 10px',
              fontSize: '12.5px',
              color: darkMode ? '#D4C5B5' : '#6B5E54',
              lineHeight: 1.55,
            }}
          >
            Troco utilise des traceurs strictement nécessaires au fonctionnement du service (authentification sécurisée, gestion des deals et maintien de session). Aucun traceur d'analyse ou de mesure d'audience n'est activé sans votre accord préalable exprès.
          </p>

          <div style={{ marginBottom: '14px', fontSize: '11.5px', color: darkMode ? '#B9A89B' : '#7D6E63' }}>
            Pour en savoir plus, consultez notre{' '}
            <a
              href="#cookie-policy"
              onClick={(e) => handlePolicyLinkClick(e, 'cookie-policy')}
              style={{ color: '#C67D5B', textDecoration: 'underline', fontWeight: '600' }}
            >
              Politique des Cookies
            </a>{' '}
            et notre{' '}
            <a
              href="#privacy-policy"
              onClick={(e) => handlePolicyLinkClick(e, 'privacy-policy')}
              style={{ color: '#C67D5B', textDecoration: 'underline', fontWeight: '600' }}
            >
              Politique de Confidentialité
            </a>.
          </div>

          {/* VOLET DE PERSONNALISATION GRANULAIRE */}
          {isCustomizing && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '16px',
                backgroundColor: darkMode ? 'rgba(255,255,255,0.04)' : '#FAF7F2',
                border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E8DDD3',
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                animation: 'fadeIn 0.2s ease-out',
              }}
            >
              <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#C67D5B' }}>
                Préférences détaillées des traceurs :
              </div>

              {/* 1. Strictement nécessaires */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: '700' }}>
                    1. Traceurs strictement nécessaires (Obligatoires)
                  </div>
                  <div style={{ fontSize: '11px', color: darkMode ? '#A8998C' : '#7D6E63' }}>
                    Indispensables à la connexion sécurisée Firebase Auth et aux transactions d'heures.
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    color: '#10B981',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(16,185,129,0.12)',
                  }}
                >
                  Toujours actif
                </span>
              </div>

              {/* 2. Mesure d'audience */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: '700' }}>
                    2. Mesure d'audience & Performances
                  </div>
                  <div style={{ fontSize: '11px', color: darkMode ? '#A8998C' : '#7D6E63' }}>
                    Statistiques de navigation anonymisées et détection des bugs techniques.
                  </div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={localSettings.analytics}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, analytics: e.target.checked }))}
                    style={{ opacity: 0, width: 0, height: 0 }}
                    aria-label="Autoriser la mesure d'audience anonyme"
                  />
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '24px',
                      backgroundColor: localSettings.analytics ? '#C67D5B' : (darkMode ? '#3D3530' : '#D4C7B0'),
                      transition: 'background-color 0.2s ease',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      height: '18px',
                      width: '18px',
                      left: localSettings.analytics ? '22px' : '3px',
                      bottom: '3px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '50%',
                      transition: 'left 0.2s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }}
                  />
                </label>
              </div>

              {/* 3. Alertes géographiques de proximité */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: '700' }}>
                    3. Géolocalisation approximative de proximité
                  </div>
                  <div style={{ fontSize: '11px', color: darkMode ? '#A8998C' : '#7D6E63' }}>
                    Affichage des offres de voisins sans pistage continu de votre position exacte.
                  </div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={localSettings.proximityAlerts}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, proximityAlerts: e.target.checked }))}
                    style={{ opacity: 0, width: 0, height: 0 }}
                    aria-label="Autoriser les alertes de proximité géographique"
                  />
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '24px',
                      backgroundColor: localSettings.proximityAlerts ? '#C67D5B' : (darkMode ? '#3D3530' : '#D4C7B0'),
                      transition: 'background-color 0.2s ease',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      height: '18px',
                      width: '18px',
                      left: localSettings.proximityAlerts ? '22px' : '3px',
                      bottom: '3px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '50%',
                      transition: 'left 0.2s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }}
                  />
                </label>
              </div>
            </div>
          )}

          {/* RANGÉE DE BOUTONS D'ACTION */}
          <div
            style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            {/* Si en mode personnalisation : Bouton de validation des choix */}
            {isCustomizing ? (
              <button
                type="button"
                onClick={handleSaveCustom}
                className="premium-button focus:ring-2"
                style={{
                  border: 'none',
                  borderRadius: '999px',
                  padding: '9px 20px',
                  backgroundColor: '#C67D5B',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(198,125,91,0.3)',
                }}
              >
                Confirmer mes choix sélectionnés
              </button>
            ) : null}

            {/* Bouton Tout accepter */}
            <button
              type="button"
              onClick={handleAcceptAll}
              className="premium-button focus:ring-2"
              style={{
                border: 'none',
                borderRadius: '999px',
                padding: '9px 20px',
                background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)',
                backgroundColor: '#C67D5B',
                color: '#FFFFFF',
                fontWeight: '700',
                fontSize: '12.5px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(198,125,91,0.25)',
              }}
            >
              Tout accepter
            </button>

            {/* Bouton Continuer sans accepter (Obligation stricte CNIL : même visibilité) */}
            <button
              type="button"
              onClick={handleDeclineAll}
              className="premium-button focus:ring-2"
              style={{
                border: darkMode ? '1px solid rgba(255,255,255,0.18)' : '1px solid #D4C7B0',
                borderRadius: '999px',
                padding: '9px 18px',
                backgroundColor: 'transparent',
                color: darkMode ? '#FAF7F2' : '#3D3530',
                fontWeight: '700',
                fontSize: '12.5px',
                cursor: 'pointer',
              }}
            >
              Continuer sans accepter
            </button>

            {/* Bouton Personnaliser */}
            <button
              type="button"
              onClick={() => setIsCustomizing(prev => !prev)}
              className="premium-button focus:ring-2"
              style={{
                border: 'none',
                borderRadius: '999px',
                padding: '9px 14px',
                backgroundColor: darkMode ? 'rgba(198,125,91,0.14)' : '#F5EAE4',
                color: '#C67D5B',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              aria-expanded={isCustomizing}
            >
              <Sliders size={14} aria-hidden="true" />
              <span>{isCustomizing ? 'Masquer les options' : 'Personnaliser'}</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );

  return createPortal(bannerCard, document.body);
}
