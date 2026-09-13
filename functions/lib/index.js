"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateChatParticipants = exports.health = exports.cleanupRateLimits = exports.checkRateLimit = exports.scheduledDeletion = exports.restoreAccount = exports.deleteUserCompletely = exports.cleanupIdempotency = exports.transferAtomically = exports.claimBonus = exports.applyPayment = exports.migrateUsersPublic = exports.onUserWriteSyncPublic = exports.updateUserAsAdmin = exports.toggleHideListingAsAdmin = exports.resolveReport = exports.resetUserSafely = exports.deleteListingAsAdmin = exports.setAdminClaim = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const firestore_2 = require("firebase-functions/v2/firestore");
// Initialisation unique du SDK Firebase Admin
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
const db = (0, firestore_1.getFirestore)();
// Handlers d'administration
const setAdminClaim_1 = require("./admin/setAdminClaim");
const deleteListingAsAdmin_1 = require("./admin/deleteListingAsAdmin");
const resetUserSafely_1 = require("./admin/resetUserSafely");
const resolveReport_1 = require("./admin/resolveReport");
const toggleHideListingAsAdmin_1 = require("./admin/toggleHideListingAsAdmin");
const updateUserAsAdmin_1 = require("./admin/updateUserAsAdmin");
// Handlers synchronisation & migration users_public (RGPD)
const onUserWriteSyncPublic_1 = require("./users/onUserWriteSyncPublic");
const migrateUsersPublic_1 = require("./users/migrateUsersPublic");
// Handlers paiements & transferts
const applyPayment_1 = require("./payments/applyPayment");
const claimBonus_1 = require("./payments/claimBonus");
const transferAtomically_1 = require("./payments/transferAtomically");
const cleanupIdempotency_1 = require("./payments/cleanupIdempotency");
// Handlers conformité RGPD (Suppression & Rétractation)
const deleteUserCompletely_1 = require("./gdpr/deleteUserCompletely");
const restoreAccount_1 = require("./gdpr/restoreAccount");
const scheduledDeletion_1 = require("./gdpr/scheduledDeletion");
// Handlers sécurité & limitation de débit
const checkRateLimit_1 = require("./security/checkRateLimit");
const cleanupRateLimits_1 = require("./security/cleanupRateLimits");
const healthCheck_1 = require("./health/healthCheck");
Object.defineProperty(exports, "health", { enumerable: true, get: function () { return healthCheck_1.health; } });
/**
 * 👑 Cloud Function 1 : setAdminClaim
 * Définition ou révocation des Custom Claims Admin par un administrateur accrédité.
 */
exports.setAdminClaim = (0, https_1.onCall)({ cors: true }, async (request) => {
    return (0, setAdminClaim_1.handleSetAdminClaim)(request, db);
});
/**
 * 🗑️ Cloud Function 2 : deleteListingAsAdmin
 * Suppression administrative d'une annonce, notification de l'auteur et traçabilité.
 */
exports.deleteListingAsAdmin = (0, https_1.onCall)({ cors: true }, async (request) => {
    return (0, deleteListingAsAdmin_1.handleDeleteListingAsAdmin)(request, db);
});
/**
 * 🛡️ Cloud Function 3 : resetUserSafely
 * Réinitialisation sécurisée d'un utilisateur avec protection du wallet par défaut.
 */
exports.resetUserSafely = (0, https_1.onCall)({ cors: true }, async (request) => {
    return (0, resetUserSafely_1.handleResetUserSafely)(request, db);
});
/**
 * ⚖️ Cloud Function 4 : resolveReport
 * Traitement et résolution des signalements avec motif et audit trail.
 */
exports.resolveReport = (0, https_1.onCall)({ cors: true }, async (request) => {
    return (0, resolveReport_1.handleResolveReport)(request, db);
});
/**
 * 👁️ Cloud Function 5 : toggleHideListingAsAdmin
 * Masquage / démasquage modérateur d'une annonce dans le feed public.
 */
exports.toggleHideListingAsAdmin = (0, https_1.onCall)({ cors: true }, async (request) => {
    return (0, toggleHideListingAsAdmin_1.handleToggleHideListing)(request, db);
});
/**
 * 👤 Cloud Function 6 : updateUserAsAdmin
 * Mise à jour administrative sécurisée d'un profil utilisateur.
 */
exports.updateUserAsAdmin = (0, https_1.onCall)({ cors: true }, async (request) => {
    return (0, updateUserAsAdmin_1.handleUpdateUserAsAdmin)(request, db);
});
/**
 * 🔄 Cloud Function 7 : onUserWriteSyncPublic (Trigger Firestore)
 * Déclenché en temps réel lors de toute modification sur users/{uid} pour mettre à jour users_public/{uid}.
 */
exports.onUserWriteSyncPublic = (0, firestore_2.onDocumentWritten)('users/{uid}', async (event) => {
    return (0, onUserWriteSyncPublic_1.handleUserWriteSyncPublic)(event, db);
});
/**
 * 📦 Cloud Function 8 : migrateUsersPublic (Callable Admin)
 * Backfill / migration idempotent de tous les utilisateurs existants vers users_public.
 */
exports.migrateUsersPublic = (0, https_1.onCall)({ cors: true }, async (request) => {
    return (0, migrateUsersPublic_1.handleMigrateUsersPublic)(request, db);
});
/**
 * 💳 Cloud Function 9 : applyPayment (Callable)
 * Validation serveur de rechargement/achat de jetons avec idempotence 24h.
 */
exports.applyPayment = (0, https_1.onCall)({ cors: true }, async (request) => {
    return (0, applyPayment_1.handleApplyPayment)(request, db);
});
/**
 * 🎁 Cloud Function 10 : claimBonus (Callable)
 * Réclamation sécurisée anti-double-crédit de bonus partenaire.
 */
exports.claimBonus = (0, https_1.onCall)({ cors: true }, async (request) => {
    return (0, claimBonus_1.handleClaimBonus)(request, db);
});
/**
 * ⚡ Cloud Function 11 : transferAtomically (Callable)
 * Transfert atomique universel de soldes (visio, deal chat, checkout).
 */
exports.transferAtomically = (0, https_1.onCall)({ cors: true }, async (request) => {
    return (0, transferAtomically_1.handleTransferAtomically)(request, db);
});
/**
 * 🧹 Cloud Function 12 : cleanupIdempotency (Scheduled)
 * Nettoyage horaire des clés d'idempotence expirées.
 */
exports.cleanupIdempotency = (0, cleanupIdempotency_1.createCleanupIdempotency)(db);
/**
 * 🔒 Cloud Function 13 : deleteUserCompletely (Callable RGPD)
 * Suppression de compte conforme RGPD art. 17 (soft delete 30j ou réel).
 */
exports.deleteUserCompletely = (0, https_1.onCall)({ cors: true }, async (request) => {
    return (0, deleteUserCompletely_1.handleDeleteUserCompletely)(request, db);
});
/**
 * 🔄 Cloud Function 14 : restoreAccount (Callable RGPD)
 * Rétractation et annulation de suppression dans le délai de 30 jours.
 */
exports.restoreAccount = (0, https_1.onCall)({ cors: true }, async (request) => {
    return (0, restoreAccount_1.handleRestoreAccount)(request, db);
});
/**
 * 🗑️ Cloud Function 15 : scheduledDeletion (Scheduled RGPD)
 * Purge quotidienne à 03h00 des comptes dont le délai de rétractation a expiré.
 */
exports.scheduledDeletion = (0, scheduledDeletion_1.createScheduledDeletion)(db);
/**
 * ⏱️ Cloud Function 16 : checkRateLimit (Callable)
 * Contrôle de quota côté serveur pour actions sensibles avec fenêtres glissantes.
 */
exports.checkRateLimit = (0, https_1.onCall)({ cors: true }, async (request) => {
    return (0, checkRateLimit_1.handleCheckRateLimit)(request, db);
});
/**
 * 🧹 Cloud Function 17 : cleanupRateLimits (Scheduled)
 * Purge horaire des compteurs de rate limit expirés.
 */
exports.cleanupRateLimits = (0, cleanupRateLimits_1.createCleanupRateLimits)(db);
/**
 * 👥 Cloud Function 18 : migrateChatParticipants (Callable Admin - VERIF-02)
 * Migration des participants de chats (noms -> Firebase Auth UIDs) et traçabilité orphelins.
 */
var migrateChatParticipants_1 = require("./migration/migrateChatParticipants");
Object.defineProperty(exports, "migrateChatParticipants", { enumerable: true, get: function () { return migrateChatParticipants_1.migrateChatParticipants; } });
//# sourceMappingURL=index.js.map