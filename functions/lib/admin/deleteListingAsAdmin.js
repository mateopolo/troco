"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDeleteListingAsAdmin = void 0;
const firestore_1 = require("firebase-admin/firestore");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const rateLimit_1 = require("../middleware/rateLimit");
/**
 * 🗑️ Cloud Function Callable : deleteListingAsAdmin
 * Permet à un administrateur vérifié de supprimer un listing illicite ou frauduleux.
 * Supprime le document principal, notifie l'auteur et enregistre l'action dans les logs d'audit.
 */
async function handleDeleteListingAsAdmin(request, db) {
    const auth = request.auth;
    if (!auth || !auth.uid) {
        (0, errors_1.throwUnauthorized)('Authentification requise.');
    }
    // Vérification de sécurité Admin
    if (auth.token?.admin !== true) {
        (0, logger_1.logAdminAction)({
            action: 'deleteListingAsAdmin',
            by: auth.uid,
            status: 'failure',
            error: 'Tentative de suppression sans privilèges administrateur'
        });
        (0, errors_1.throwForbidden)('Accès réservé exclusivement aux administrateurs certifiés.');
    }
    // Middleware Rate-Limiting (max 10 requêtes/minute)
    await (0, rateLimit_1.enforceAdminRateLimit)(db, auth.uid);
    const { listingId, reason = 'Non respect de la charte de la communauté' } = request.data || {};
    if (!listingId || typeof listingId !== 'string') {
        (0, errors_1.throwBadRequest)('Identifiant de listing manquant ou invalide.');
    }
    try {
        const listingRef = db.collection('listings').doc(listingId);
        const listingSnap = await listingRef.get();
        if (!listingSnap.exists) {
            (0, errors_1.throwNotFound)(`L'annonce avec l'identifiant "${listingId}" n'existe pas.`);
        }
        const listingData = listingSnap.data() || {};
        const authorUid = listingData.authorUid || listingData.userId;
        // 1. Suppression du listing principal
        await listingRef.delete();
        // 2. Notification interne sécurisée déposée à l'auteur si identifié
        if (authorUid && typeof authorUid === 'string') {
            const notifRef = db.collection('users').doc(authorUid).collection('notifications').doc();
            await notifRef.set({
                title: 'Annonce retirée par la modération',
                body: `Votre annonce "${listingData.title || listingId}" a été retirée : ${reason}`,
                type: 'admin_moderation',
                relatedListingId: listingId,
                read: false,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        // 3. Log d'audit Cloud Logging
        (0, logger_1.logAdminAction)({
            action: 'deleteListingAsAdmin',
            by: auth.uid,
            target: listingId,
            details: {
                authorUid: authorUid || null,
                listingTitle: listingData.title || null,
                reason,
            },
            status: 'success'
        });
        return {
            success: true,
            deletedId: listingId,
            reason
        };
    }
    catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        (0, logger_1.logAdminAction)({
            action: 'deleteListingAsAdmin',
            by: auth.uid,
            target: listingId,
            status: 'failure',
            error: errorMsg
        });
        throw err;
    }
}
exports.handleDeleteListingAsAdmin = handleDeleteListingAsAdmin;
//# sourceMappingURL=deleteListingAsAdmin.js.map