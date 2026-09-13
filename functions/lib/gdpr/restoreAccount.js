"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRestoreAccount = void 0;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const logger_1 = require("../utils/logger");
async function handleRestoreAccount(request, db) {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'Authentification requise pour restaurer votre compte.');
    }
    const userRef = db.doc(`users/${uid}`);
    const snap = await userRef.get();
    if (!snap.exists) {
        throw new https_1.HttpsError('not-found', 'Compte utilisateur introuvable.');
    }
    const data = snap.data() || {};
    if (!data.pendingDeletion) {
        return {
            success: true,
            message: 'Votre compte est déjà actif et ne fait l\'objet d\'aucune procédure de suppression.',
        };
    }
    await userRef.update({
        pendingDeletion: false,
        deletionScheduledAt: firestore_1.FieldValue.delete(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    await (0, logger_1.structLog)('restoreAccount', { uid });
    return {
        success: true,
        message: 'La procédure de suppression a été annulée avec succès. Votre compte est pleinement restauré.',
    };
}
exports.handleRestoreAccount = handleRestoreAccount;
//# sourceMappingURL=restoreAccount.js.map