/**
 * Configuration Sentry pour TROCO
 * P2-OBS-02: Intégration Sentry production
 */

import * as Sentry from '@sentry/react';
import { setSentryInstance } from './logger';

/**
 * Initialise Sentry avec la configuration adaptée
 * - Désactivé si VITE_SENTRY_DSN n'est pas défini (dev local)
 * - tracesSampleRate: 0.1 (10% des traces)
 * - environment: basé sur import.meta.env.MODE
 * - Filtre les erreurs de dev
 */
export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  // Ne pas initialiser si pas de DSN (dev local)
  if (!dsn) {
    return null;
  }

  // Filtre pour exclure les erreurs de développement
  const isDevError = (event) => {
    // Exclure les erreurs de scripts de dev
    if (event.request?.url?.includes('localhost') || 
        event.request?.url?.includes('127.0.0.1')) {
      return null;
    }
    return event;
  };

  // Configuration de base
  const config = {
    dsn: dsn,
    tracesSampleRate: 0.1,
    environment: import.meta.env.MODE || 'production',
    
    // Désactiver en développement (sauf si explicitement activé)
    enabled: !import.meta.env.DEV,
    
    // Filtres
    beforeSend: (event) => {
      // Appliquer le filtre dev
      const filtered = isDevError(event);
      if (filtered === null) {
        return null;
      }
      return filtered;
    },
  };

  try {
    Sentry.init(config);
    
    // Configurer l'instance dans logger
    setSentryInstance(Sentry);
    
    console.log('[Sentry] Initialisé avec succès', {
      environment: config.environment,
      tracesSampleRate: config.tracesSampleRate,
      enabled: config.enabled,
    });
    
    return Sentry;
  } catch (err) {
    console.error('[Sentry] Échec initialisation:', err);
    return null;
  }
};

/**
 * Configure le contexte utilisateur dans Sentry
 * @param {object} user - Objet utilisateur
 * @param {string} user.uid - ID utilisateur (sera hashé)
 */
export const setSentryUserContext = (user) => {
  const sentry = getSentryInstance();
  if (!sentry || !user?.uid) return;

  // Hash de l'uid pour éviter les PII
  const hashUid = (str) => {
    if (!str) return 'unknown';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `user_${Math.abs(hash).toString(16).substring(0, 8)}`;
  };

  sentry.setUser({
    id: hashUid(user.uid),
    // Ne JAMAIS envoyer d'email ou autres PII
  });
};

/**
 * Supprime le contexte utilisateur
 */
export const clearSentryUserContext = () => {
  const sentry = getSentryInstance();
  if (sentry) {
    sentry.setUser(null);
  }
};

/**
 * Retourne l'instance Sentry
 * @returns {object|null}
 */
export const getSentryInstance = () => {
  // Essayer de retourner l'instance globale si elle existe
  try {
    return Sentry;
  } catch {
    return null;
  }
};

export default Sentry;
