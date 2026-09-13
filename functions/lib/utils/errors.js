"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.throwInternal = exports.throwRateLimited = exports.throwBadRequest = exports.throwNotFound = exports.throwForbidden = exports.throwUnauthorized = void 0;
const https_1 = require("firebase-functions/v2/https");
/**
 * 🚨 Utilitaires de levée d'erreurs typées HttpsError
 * Conformité aux standards API de Firebase Cloud Functions
 */
function throwUnauthorized(message = 'Authentification requise pour effectuer cette opération') {
    throw new https_1.HttpsError('unauthenticated', message);
}
exports.throwUnauthorized = throwUnauthorized;
function throwForbidden(message = 'Privilèges administrateur requis pour cette action') {
    throw new https_1.HttpsError('permission-denied', message);
}
exports.throwForbidden = throwForbidden;
function throwNotFound(message = 'La ressource demandée est introuvable') {
    throw new https_1.HttpsError('not-found', message);
}
exports.throwNotFound = throwNotFound;
function throwBadRequest(message = 'Paramètres d appel invalides ou manquants') {
    throw new https_1.HttpsError('invalid-argument', message);
}
exports.throwBadRequest = throwBadRequest;
function throwRateLimited(message = 'Limite de 10 opérations administrateur par minute dépassée') {
    throw new https_1.HttpsError('resource-exhausted', message);
}
exports.throwRateLimited = throwRateLimited;
function throwInternal(message = 'Une erreur interne est survenue lors de l exécution') {
    throw new https_1.HttpsError('internal', message);
}
exports.throwInternal = throwInternal;
//# sourceMappingURL=errors.js.map