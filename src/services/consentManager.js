/**
 * consentManager.js — Gestionnaire Centralisé du Consentement & Gardien Anti-Trackers
 * Strictement conforme aux standards RGPD (Art. 4-11, 7) et aux recommandations CNIL de septembre 2020.
 * 
 * RÈGLE FONDAMENTALE : Aucun traceur ou script tiers ne doit s'exécuter sans consentement préalable (Opt-in strict).
 * Les valeurs par défaut sont TOUJOURS désactivées (false) pour tout ce qui n'est pas strictement nécessaire.
 */

export const COOKIE_CONSENT_KEY = 'troco_cookie_consent';
export const PRIVACY_SETTINGS_KEY = 'troco_privacy_settings';
export const CONSENT_TIMESTAMP_KEY = 'troco_consent_timestamp';

// Durée maximale de validité du consentement selon la recommandation CNIL : 6 mois (en millisecondes)
export const MAX_CONSENT_DURATION_MS = 6 * 30 * 24 * 60 * 60 * 1000;

export const DEFAULT_STRICT_SETTINGS = Object.freeze({
  necessary: true,          // Strictement nécessaire au fonctionnement (Session, CSRF, Panier/Deals)
  analytics: false,         // Bloqué par défaut (Mesure d'audience, télémétrie)
  proximityAlerts: false,   // Bloqué par défaut (Géolocalisation externe par IP)
  marketingEmails: false,   // Bloqué par défaut (Communications promotionnelles)
});

/**
 * Récupère le statut global du consentement : 'accepted' | 'declined' | 'pending'
 */
export function getConsentStatus() {
  if (typeof window === 'undefined' || !window.localStorage) return 'pending';

  try {
    const rawStatus = localStorage.getItem(COOKIE_CONSENT_KEY);
    const rawTimestamp = localStorage.getItem(CONSENT_TIMESTAMP_KEY);

    if (!rawStatus) return 'pending';

    // Vérification de la péremption du consentement (6 mois max CNIL)
    if (rawTimestamp) {
      const consentAge = Date.now() - Number(rawTimestamp);
      if (consentAge > MAX_CONSENT_DURATION_MS) {
        // Le consentement a expiré, on force le renouvellement
        localStorage.removeItem(COOKIE_CONSENT_KEY);
        localStorage.removeItem(CONSENT_TIMESTAMP_KEY);
        return 'pending';
      }
    }

    if (rawStatus === 'accepted' || rawStatus === 'declined') {
      return rawStatus;
    }
    return 'pending';
  } catch (e) {
    return 'pending';
  }
}

/**
 * Récupère les réglages de confidentialité détaillés.
 * En l'absence de consentement préalable, renvoie STRICTEMENT les valeurs par défaut (tout désactivé sauf nécessaire).
 */
export function getPrivacySettings() {
  if (typeof window === 'undefined' || !window.localStorage) return { ...DEFAULT_STRICT_SETTINGS };

  try {
    const status = getConsentStatus();
    if (status === 'pending') {
      // Aucun choix effectué : blocage strict pré-consentement
      return { ...DEFAULT_STRICT_SETTINGS };
    }

    const saved = localStorage.getItem(PRIVACY_SETTINGS_KEY);
    if (!saved) {
      return status === 'accepted'
        ? { necessary: true, analytics: true, proximityAlerts: true, marketingEmails: false }
        : { ...DEFAULT_STRICT_SETTINGS };
    }

    const parsed = JSON.parse(saved);
    return {
      necessary: true, // Toujours vrai
      analytics: Boolean(parsed.analytics),
      proximityAlerts: Boolean(parsed.proximityAlerts),
      marketingEmails: Boolean(parsed.marketingEmails),
    };
  } catch (e) {
    return { ...DEFAULT_STRICT_SETTINGS };
  }
}

/**
 * Vérifie si une catégorie spécifique de traceur / requête externe est autorisée.
 * @param {'necessary' | 'analytics' | 'proximityAlerts' | 'marketingEmails' | 'external_geoip'} category 
 * @returns {boolean}
 */
export function isTrackerAllowed(category) {
  if (category === 'necessary') return true;

  const status = getConsentStatus();
  if (status !== 'accepted') {
    // Si l'utilisateur n'a pas expressément accepté ou a refusé, TOUT est bloqué
    return false;
  }

  const settings = getPrivacySettings();

  if (category === 'external_geoip') {
    return Boolean(settings.proximityAlerts || settings.analytics);
  }

  return Boolean(settings[category]);
}

/**
 * Enregistre le consentement de l'utilisateur et synchronise l'environnement
 * @param {'accepted' | 'declined'} status 
 * @param {Object} customSettings 
 */
export function saveConsent(status, customSettings = null) {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const finalSettings = customSettings
      ? { ...DEFAULT_STRICT_SETTINGS, ...customSettings, necessary: true }
      : (status === 'accepted'
          ? { necessary: true, analytics: true, proximityAlerts: true, marketingEmails: false }
          : { ...DEFAULT_STRICT_SETTINGS });

    localStorage.setItem(COOKIE_CONSENT_KEY, status);
    localStorage.setItem(CONSENT_TIMESTAMP_KEY, String(Date.now()));
    localStorage.setItem(PRIVACY_SETTINGS_KEY, JSON.stringify(finalSettings));

    // Si l'utilisateur refuse les analytics, on neutralise immédiatement les trackers
    if (!finalSettings.analytics) {
      purgeTrackers();
    }

    // Diffusion de l'événement système pour que l'application réagisse en temps réel
    window.dispatchEvent(new CustomEvent('troco:consent_changed', {
      detail: { status, settings: finalSettings }
    }));
  } catch (e) {
    console.warn('[ConsentManager] Erreur lors de l\'enregistrement du consentement:', e);
  }
}

/**
 * Révocation complète et immédiate de tous les consentements
 */
export function revokeAllConsent() {
  saveConsent('declined', { ...DEFAULT_STRICT_SETTINGS });
}

/**
 * Neutralise tous les traceurs et variables globales de suivi si le consentement est refusé ou révoqué.
 */
export function purgeTrackers() {
  if (typeof window === 'undefined') return;

  try {
    // 1. Désactivation de Google Analytics / Firebase Analytics si configuré
    const measurementId = process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || 'G-N0XT6XXYSZ';
    window[`ga-disable-${measurementId}`] = true;

    // 2. Nettoyage des métriques de tracking mémoire
    if (window.__TROCO_PERF_METRICS__) {
      window.__TROCO_PERF_METRICS__ = [];
    }
  } catch (e) {}
}

// Initialisation au chargement du module
if (typeof window !== 'undefined') {
  if (!isTrackerAllowed('analytics')) {
    purgeTrackers();
  }
}
