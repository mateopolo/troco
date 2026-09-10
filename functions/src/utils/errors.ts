import { HttpsError } from 'firebase-functions/v2/https';

/**
 * 🚨 Utilitaires de levée d'erreurs typées HttpsError
 * Conformité aux standards API de Firebase Cloud Functions
 */

export function throwUnauthorized(message = 'Authentification requise pour effectuer cette opération'): never {
  throw new HttpsError('unauthenticated', message);
}

export function throwForbidden(message = 'Privilèges administrateur requis pour cette action'): never {
  throw new HttpsError('permission-denied', message);
}

export function throwNotFound(message = 'La ressource demandée est introuvable'): never {
  throw new HttpsError('not-found', message);
}

export function throwBadRequest(message = 'Paramètres d appel invalides ou manquants'): never {
  throw new HttpsError('invalid-argument', message);
}

export function throwRateLimited(message = 'Limite de 10 opérations administrateur par minute dépassée'): never {
  throw new HttpsError('resource-exhausted', message);
}

export function throwInternal(message = 'Une erreur interne est survenue lors de l exécution'): never {
  throw new HttpsError('internal', message);
}
