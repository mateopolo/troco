"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTransferParams = void 0;
const https_1 = require("firebase-functions/v2/https");
function validateTransferParams(params) {
    const { fromUid, toUid, tokens = 0, euros = 0, idempotencyKey } = params;
    if (!fromUid || typeof fromUid !== 'string') {
        throw new https_1.HttpsError('unauthenticated', 'Identifiant émetteur manquant.');
    }
    if (!toUid || typeof toUid !== 'string' || toUid === fromUid) {
        throw new https_1.HttpsError('invalid-argument', 'Destinataire invalide ou identique à l\'émetteur.');
    }
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'Clé d\'idempotence (idempotencyKey) obligatoire.');
    }
    if (tokens < 0 || euros < 0) {
        throw new https_1.HttpsError('invalid-argument', 'Les montants transférés ne peuvent pas être négatifs.');
    }
    if (tokens === 0 && euros === 0) {
        throw new https_1.HttpsError('invalid-argument', 'Le montant du transfert (jetons ou euros) doit être supérieur à zéro.');
    }
}
exports.validateTransferParams = validateTransferParams;
//# sourceMappingURL=validation.js.map