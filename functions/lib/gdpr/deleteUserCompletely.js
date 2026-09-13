"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDeleteUserCompletely = exports.executeHardDeletion = void 0;
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const https_1 = require("firebase-functions/v2/https");
const anonymizeTransactions_1 = require("./anonymizeTransactions");
const sendDeletionEmail_1 = require("./sendDeletionEmail");
const logger_1 = require("../utils/logger");
/**
 * Exécute la suppression complète et irréversible d'un compte utilisateur.
 */
async function executeHardDeletion(uid, db) {
    // 1. Anonymisation légale des transactions comptables
    await (0, anonymizeTransactions_1.anonymizeTransactions)(uid, db);
    // 2. Suppression de la sous-collection notifications
    const notifsSnap = await db.collection(`users/${uid}/notifications`).get();
    if (!notifsSnap.empty) {
        const batch = db.batch();
        notifsSnap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
    }
    // 3. Suppression des annonces créées par l'utilisateur
    const listingsSnap = await db.collection('listings').where('authorUid', '==', uid).get();
    if (!listingsSnap.empty) {
        const batch = db.batch();
        listingsSnap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
    }
    // 4. Retrait de l'utilisateur des chats partagés (sans supprimer l'historique de l'autre participant)
    const chatsSnap = await db.collection('chats').where('participants', 'array-contains', uid).get();
    if (!chatsSnap.empty) {
        const batch = db.batch();
        chatsSnap.docs.forEach((d) => {
            batch.update(d.ref, {
                participants: firestore_1.FieldValue.arrayRemove(uid),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        });
        await batch.commit();
    }
    // 5. Suppression des documents profil users/{uid} et users_public/{uid}
    await Promise.all([
        db.doc(`users/${uid}`).delete().catch(() => { }),
        db.doc(`users_public/${uid}`).delete().catch(() => { }),
    ]);
    // 6. Suppression du compte dans Firebase Authentication
    await (0, auth_1.getAuth)().deleteUser(uid).catch((err) => {
        console.warn(`[GDPR Auth] Failed to delete auth user ${uid}:`, err);
    });
    // 7. Inscription au registre d'audit légal RGPD (sans données identifiantes)
    await db.collection('audit_logs').add({
        action: 'gdpr_account_deletion',
        targetUid: uid,
        deletedAt: firestore_1.FieldValue.serverTimestamp(),
        anonymized: true,
    });
    await (0, logger_1.structLog)('deleteUser_real', { uid });
}
exports.executeHardDeletion = executeHardDeletion;
async function handleDeleteUserCompletely(request, db) {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'Authentification requise pour supprimer votre compte.');
    }
    const { confirm, immediate = false } = request.data || {};
    if (confirm !== true) {
        throw new https_1.HttpsError('invalid-argument', 'Une confirmation explicite (confirm: true) est obligatoire.');
    }
    if (!immediate) {
        // Soft delete (Délai de rétractation de 30 jours)
        const deletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await db.doc(`users/${uid}`).update({
            pendingDeletion: true,
            deletionScheduledAt: firestore_1.Timestamp.fromDate(deletionDate),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        await (0, sendDeletionEmail_1.sendDeletionEmail)(uid, db);
        await (0, logger_1.structLog)('deleteUser_soft', { uid, scheduledFor: deletionDate.toISOString() });
        return {
            success: true,
            mode: 'soft',
            restoreUntil: deletionDate.toISOString(),
        };
    }
    // Suppression immédiate
    await executeHardDeletion(uid, db);
    return {
        success: true,
        mode: 'immediate',
    };
}
exports.handleDeleteUserCompletely = handleDeleteUserCompletely;
//# sourceMappingURL=deleteUserCompletely.js.map