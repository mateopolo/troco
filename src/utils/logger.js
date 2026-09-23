/**
 * Logger centralisé pour TROCO
 * Gère l'output conditionnel selon l'environnement
 * P2-OBS-01: Observabilité production
 */

// State global pour Sentry (initialisé via initSentry)
let sentryInstance = null;

/**
 * Configure l'instance Sentry (appelée depuis sentry.js)
 * @param {object} sentry - Instance Sentry initialisée
 */
export const setSentryInstance = (sentry) => {
  sentryInstance = sentry;
};

/**
 * Retourne l'instance Sentry si disponible
 * @returns {object|null} Instance Sentry ou null
 */
export const getSentryInstance = () => sentryInstance;

/**
 * Hash simple pour anonymiser les IDs utilisateurs
 * @param {string} str - Chaîne à hasher
 * @returns {string} Hash simple (non cryptographique)
 */
const simpleHash = (str) => {
  if (!str) return 'unknown';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `user_${Math.abs(hash).toString(16).substring(0, 8)}`;
};

/**
 * Envoie une erreur à Sentry si disponible et configuré
 * @param {Error|any} error - L'erreur à capturer
 * @param {object} context - Contexte supplémentaire (sans PII)
 */
const captureToSentry = (error, context = {}) => {
  if (!sentryInstance) {
    // Sentry non initialisé : silencieux en local/dev pour éviter le bruit dans la console
    return;
  }

  // Nettoyage du contexte pour éviter les PII
  const cleanContext = { ...context };
  
  // Suppression des champs sensibles
  delete cleanContext.email;
  delete cleanContext.password;
  delete cleanContext.token;
  delete cleanContext.phone;
  delete cleanContext.uid;
  
  // Ajout du hash utilisateur si uid présent
  if (context.uid) {
    cleanContext.hashedUserId = simpleHash(context.uid);
  }

  try {
    sentryInstance.captureException(error, { contexts: cleanContext });
  } catch (sentryErr) {
    console.error('[Sentry Capture Error]', sentryErr, error, cleanContext);
  }
};

/**
 * Logger principal
 * - DEV: sort vers console
 * - PROD: warn/info silencieux, error vers Sentry
 */
const logger = {
  /**
   * Log une information (silencieux en prod)
   * @param {...any} args - Arguments à logger
   */
  info: (...args) => {
    const isDev = typeof process !== 'undefined' ? process.env.NODE_ENV !== 'production' : true;
    if (isDev) {
      console.log('[INFO]', ...args);
    }
    // En prod, info est silencieux
  },

  /**
   * Log un warning (silencieux en prod)
   * @param {...any} args - Arguments à logger
   */
  warn: (...args) => {
    const isDev = typeof process !== 'undefined' ? process.env.NODE_ENV !== 'production' : true;
    if (isDev) {
      console.warn('[WARN]', ...args);
    }
    // En prod, warn est silencieux
  },

  /**
   * Log une erreur
   * - DEV: console.error
   * - PROD: envoi à Sentry + fallback console.error
   * @param {...any} args - Arguments à logger
   */
  error: (...args) => {
    const error = args[0];
    const context = args.length > 1 ? args[1] : undefined;
    const isDev = typeof process !== 'undefined' ? process.env.NODE_ENV !== 'production' : true;

    if (isDev) {
      console.error('[ERROR]', ...args);
    } else {
      // En prod, envoyer à Sentry
      if (error instanceof Error) {
        captureToSentry(error, context);
      } else {
        // Si ce n'est pas une instance Error, créer une Error
        const errorObj = new Error(String(error));
        captureToSentry(errorObj, context);
      }
    }
  },

  /**
   * Capture une exception directement (pour usage avancé)
   * @param {Error} error - L'erreur à capturer
   * @param {object} context - Contexte supplémentaire
   */
  captureException: (error, context = {}) => {
    captureToSentry(error, context);
  },
};

export default logger;
