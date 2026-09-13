"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleResetUserSafely = void 0;
const firestore_1 = require("firebase-admin/firestore");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const rateLimit_1 = require("../middleware/rateLimit");
/**
 * 🔄 Cloud Function Callable : resetUserSafely
 * Permet à un administrateur de réinitialiser le profil d'un utilisateur en toute sécurité.
 * Règle d'or : Préserve obligatoirement le solde financier (euroBalance & trocoTokens)
 * si preserveWallet est actif (comportement par défaut).
 */
async function handleResetUserSafely(request, db) {
    const auth = request.auth;
    if (!auth || !auth.uid) {
        (0, errors_1.throwUnauthorized)('Authentification obligatoire.');
    }
    // Vérification de sécurité Admin
    if (auth.token?.admin !== true) {
        (0, logger_1.logAdminAction)({
            action: 'resetUserSafely',
            by: auth.uid,
            status: 'failure',
            error: 'Tentative de reset utilisateur sans privilèges administrateur'
        });
        (0, errors_1.throwForbidden)('Accès réservé exclusivement aux administrateurs certifiés.');
    }
    // Middleware Rate-Limiting (max 10 appels/minute)
    await (0, rateLimit_1.enforceAdminRateLimit)(db, auth.uid);
    const { uid, preserveWallet = true } = request.data || {};
    if (!uid || typeof uid !== 'string') {
        (0, errors_1.throwBadRequest)('Paramètre uid (string) manquant ou invalide.');
    }
    try {
        const userRef = db.collection('users').doc(uid);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
            (0, errors_1.throwNotFound)(`L'utilisateur "${uid}" n'existe pas.`);
        }
        const currentProfile = userSnap.data() || {};
        // Données de base réinitialisées
        const resetData = {
            dealsCompleted: 0,
            dealsInProgress: 0,
            skills: [],
            equipment: [],
            bio: 'Nouvel utilisateur sur Troco ! Prêt à partager mes compétences et échanger des services.',
            kycVerified: false,
            onboardingCompleted: false,
            hasClaimedWelcomeGift: false,
            isBanned: false,
            isShadowBanned: false,
            resetAt: firestore_1.FieldValue.serverTimestamp(),
            resetBy: auth.uid,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        // Préservation stricte du solde financier selon paramètre
        if (preserveWallet) {
            resetData.euroBalance = typeof currentProfile.euroBalance === 'number' ? currentProfile.euroBalance : 0.00;
            resetData.trocoTokens = typeof currentProfile.trocoTokens === 'number' ? currentProfile.trocoTokens : 10;
        }
        else {
            // Si réinitialisation financière expressément demandée par l'admin
            resetData.euroBalance = 0.00;
            resetData.trocoTokens = 10;
        }
        // 1. Mise à jour du profil utilisateur dans Firestore
        await userRef.update(resetData);
        // 2. Nettoyage des annonces actives de cet utilisateur
        const listingsQuery = await db.collection('listings').where('authorUid', '==', uid).get();
        let listingsDeletedCount = 0;
        const batch = db.batch();
        listingsQuery.docs.forEach((docSnap) => {
            batch.delete(docSnap.ref);
            listingsDeletedCount++;
        });
        if (listingsDeletedCount > 0) {
            await batch.commit();
        }
        // 3. Journalisation Cloud Logging
        (0, logger_1.logAdminAction)({
            action: 'resetUserSafely',
            by: auth.uid,
            target: uid,
            details: { preserveWallet, listingsDeletedCount, keptEuro: resetData.euroBalance, keptTokens: resetData.trocoTokens },
            status: 'success'
        });
        return {
            success: true,
            newProfile: resetData,
            preservedWallet: Boolean(preserveWallet),
            listingsDeletedCount
        };
    }
    catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        (0, logger_1.logAdminAction)({
            action: 'resetUserSafely',
            by: auth.uid,
            target: uid,
            status: 'failure',
            error: errorMsg
        });
        throw err;
    }
}
exports.handleResetUserSafely = handleResetUserSafely;
//# sourceMappingURL=resetUserSafely.js.map