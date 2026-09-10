import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';

// Initialisation unique du SDK Firebase Admin
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

// Handlers d'administration
import { handleSetAdminClaim } from './admin/setAdminClaim';
import { handleDeleteListingAsAdmin } from './admin/deleteListingAsAdmin';
import { handleResetUserSafely } from './admin/resetUserSafely';
import { handleResolveReport } from './admin/resolveReport';
import { handleToggleHideListing } from './admin/toggleHideListingAsAdmin';
import { handleUpdateUserAsAdmin } from './admin/updateUserAsAdmin';

// Handlers synchronisation & migration users_public (RGPD)
import { handleUserWriteSyncPublic } from './users/onUserWriteSyncPublic';
import { handleMigrateUsersPublic } from './users/migrateUsersPublic';

// Handlers paiements & transferts
import { handleApplyPayment } from './payments/applyPayment';
import { handleClaimBonus } from './payments/claimBonus';
import { handleTransferAtomically } from './payments/transferAtomically';
import { createCleanupIdempotency } from './payments/cleanupIdempotency';

// Handlers conformité RGPD (Suppression & Rétractation)
import { handleDeleteUserCompletely } from './gdpr/deleteUserCompletely';
import { handleRestoreAccount } from './gdpr/restoreAccount';
import { createScheduledDeletion } from './gdpr/scheduledDeletion';

// Handlers sécurité & limitation de débit
import { handleCheckRateLimit } from './security/checkRateLimit';
import { createCleanupRateLimits } from './security/cleanupRateLimits';


/**
 * 👑 Cloud Function 1 : setAdminClaim
 * Définition ou révocation des Custom Claims Admin par un administrateur accrédité.
 */
export const setAdminClaim = onCall({ cors: true }, async (request) => {
  return handleSetAdminClaim(request, db);
});

/**
 * 🗑️ Cloud Function 2 : deleteListingAsAdmin
 * Suppression administrative d'une annonce, notification de l'auteur et traçabilité.
 */
export const deleteListingAsAdmin = onCall({ cors: true }, async (request) => {
  return handleDeleteListingAsAdmin(request, db);
});

/**
 * 🛡️ Cloud Function 3 : resetUserSafely
 * Réinitialisation sécurisée d'un utilisateur avec protection du wallet par défaut.
 */
export const resetUserSafely = onCall({ cors: true }, async (request) => {
  return handleResetUserSafely(request, db);
});

/**
 * ⚖️ Cloud Function 4 : resolveReport
 * Traitement et résolution des signalements avec motif et audit trail.
 */
export const resolveReport = onCall({ cors: true }, async (request) => {
  return handleResolveReport(request, db);
});

/**
 * 👁️ Cloud Function 5 : toggleHideListingAsAdmin
 * Masquage / démasquage modérateur d'une annonce dans le feed public.
 */
export const toggleHideListingAsAdmin = onCall({ cors: true }, async (request) => {
  return handleToggleHideListing(request, db);
});

/**
 * 👤 Cloud Function 6 : updateUserAsAdmin
 * Mise à jour administrative sécurisée d'un profil utilisateur.
 */
export const updateUserAsAdmin = onCall({ cors: true }, async (request) => {
  return handleUpdateUserAsAdmin(request, db);
});

/**
 * 🔄 Cloud Function 7 : onUserWriteSyncPublic (Trigger Firestore)
 * Déclenché en temps réel lors de toute modification sur users/{uid} pour mettre à jour users_public/{uid}.
 */
export const onUserWriteSyncPublic = onDocumentWritten('users/{uid}', async (event) => {
  return handleUserWriteSyncPublic(event, db);
});

/**
 * 📦 Cloud Function 8 : migrateUsersPublic (Callable Admin)
 * Backfill / migration idempotent de tous les utilisateurs existants vers users_public.
 */
export const migrateUsersPublic = onCall({ cors: true }, async (request) => {
  return handleMigrateUsersPublic(request, db);
});

/**
 * 💳 Cloud Function 9 : applyPayment (Callable)
 * Validation serveur de rechargement/achat de jetons avec idempotence 24h.
 */
export const applyPayment = onCall({ cors: true }, async (request) => {
  return handleApplyPayment(request, db);
});

/**
 * 🎁 Cloud Function 10 : claimBonus (Callable)
 * Réclamation sécurisée anti-double-crédit de bonus partenaire.
 */
export const claimBonus = onCall({ cors: true }, async (request) => {
  return handleClaimBonus(request, db);
});

/**
 * ⚡ Cloud Function 11 : transferAtomically (Callable)
 * Transfert atomique universel de soldes (visio, deal chat, checkout).
 */
export const transferAtomically = onCall({ cors: true }, async (request) => {
  return handleTransferAtomically(request, db);
});

/**
 * 🧹 Cloud Function 12 : cleanupIdempotency (Scheduled)
 * Nettoyage horaire des clés d'idempotence expirées.
 */
export const cleanupIdempotency = createCleanupIdempotency(db);

/**
 * 🔒 Cloud Function 13 : deleteUserCompletely (Callable RGPD)
 * Suppression de compte conforme RGPD art. 17 (soft delete 30j ou réel).
 */
export const deleteUserCompletely = onCall({ cors: true }, async (request) => {
  return handleDeleteUserCompletely(request, db);
});

/**
 * 🔄 Cloud Function 14 : restoreAccount (Callable RGPD)
 * Rétractation et annulation de suppression dans le délai de 30 jours.
 */
export const restoreAccount = onCall({ cors: true }, async (request) => {
  return handleRestoreAccount(request, db);
});

/**
 * 🗑️ Cloud Function 15 : scheduledDeletion (Scheduled RGPD)
 * Purge quotidienne à 03h00 des comptes dont le délai de rétractation a expiré.
 */
export const scheduledDeletion = createScheduledDeletion(db);

/**
 * ⏱️ Cloud Function 16 : checkRateLimit (Callable)
 * Contrôle de quota côté serveur pour actions sensibles avec fenêtres glissantes.
 */
export const checkRateLimit = onCall({ cors: true }, async (request) => {
  return handleCheckRateLimit(request, db);
});

/**
 * 🧹 Cloud Function 17 : cleanupRateLimits (Scheduled)
 * Purge horaire des compteurs de rate limit expirés.
 */
export const cleanupRateLimits = createCleanupRateLimits(db);

