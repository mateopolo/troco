/**
 * 🛡️ TROCO — Filtres et Gestionnaire d'Alertes Sentry [VERIF-03]
 * Centralise le filtrage du bruit, l'enrichissement de contexte et les alertes Firestore.
 */

// Liste blanche des patterns d'erreur Firestore à capturer en haute priorité
const CRITICAL_FIRESTORE_PATTERNS = [
  'permission-denied',
  'failed-precondition',
  'resource-exhausted',
  'unauthenticated',
  'deadline-exceeded',
];

// Patterns d'erreurs non critiques à ignorer (bruit réseau classique)
const IGNORED_ERROR_PATTERNS = [
  'ResizeObserver loop completed with undelivered notifications',
  'AbortError: The user aborted a request',
  'The play() request was interrupted by a call to pause()',
];

/**
 * Filtre personnalisé beforeSend pour l'initialisation Sentry
 */
export function createSentryBeforeSend() {
  return function beforeSend(event, hint) {
    const error = hint?.originalException;
    const message = error?.message || (typeof error === 'string' ? error : event?.message) || '';

    // 1. Ignorer le bruit non pertinent du navigateur
    for (const pattern of IGNORED_ERROR_PATTERNS) {
      if (message.includes(pattern)) {
        return null;
      }
    }

    // 2. Taguer et enrichir les anomalies Firestore critiques
    for (const pattern of CRITICAL_FIRESTORE_PATTERNS) {
      if (message.includes(pattern)) {
        event.tags = {
          ...(event.tags || {}),
          firestore_error_category: pattern,
          subsystem: 'firestore_health',
        };
        event.level = 'error';
        break;
      }
    }

    // 3. Masquer d'éventuelles clés sensibles ou tokens dans les breadcrumbs
    if (event.breadcrumbs && Array.isArray(event.breadcrumbs)) {
      event.breadcrumbs = event.breadcrumbs.map((crumb) => {
        if (crumb.data && typeof crumb.data === 'object') {
          const sanitized = { ...crumb.data };
          ['password', 'stripeKey', 'token', 'authKey'].forEach((key) => {
            if (sanitized[key]) sanitized[key] = '[REDACTED]';
          });
          return { ...crumb, data: sanitized };
        }
        return crumb;
      });
    }

    return event;
  };
}

/**
 * Émet une alerte ciblée vers Sentry ou la console d'audit
 */
export function captureFirestoreAlert(title, extra = {}, level = 'error') {
  if (typeof window !== 'undefined' && window.Sentry?.captureMessage) {
    window.Sentry.captureMessage(title, {
      level,
      tags: { category: 'firestore-health' },
      extra,
    });
  } else {
    console.warn(`[SENTRY-ALERT] [${level.toUpperCase()}] ${title}`, extra);
  }
}
