"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleToggleHideListing = void 0;
const firestore_1 = require("firebase-admin/firestore");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const rateLimit_1 = require("../middleware/rateLimit");
/**
 * 👁️ Cloud Function Callable : toggleHideListingAsAdmin
 * Permet à un administrateur de masquer ou rendre visible un listing sur la plateforme.
 */
async function handleToggleHideListing(request, db) {
    const auth = request.auth;
    if (!auth || !auth.uid) {
        (0, errors_1.throwUnauthorized)('Authentification requise.');
    }
    if (auth.token?.admin !== true) {
        (0, logger_1.logAdminAction)({
            action: 'toggleHideListingAsAdmin',
            by: auth.uid,
            status: 'failure',
            error: 'Tentative non autorisée par un utilisateur non-admin'
        });
        (0, errors_1.throwForbidden)('Accès réservé aux administrateurs certifiés.');
    }
    // Middleware Rate-Limiting (max 10 appels/minute)
    await (0, rateLimit_1.enforceAdminRateLimit)(db, auth.uid);
    const { listingId, isHidden: explicitHidden } = request.data || {};
    if (!listingId || typeof listingId !== 'string') {
        (0, errors_1.throwBadRequest)('Paramètre listingId (string) requis.');
    }
    try {
        const listingRef = db.collection('listings').doc(listingId);
        const listingSnap = await listingRef.get();
        if (!listingSnap.exists) {
            (0, errors_1.throwNotFound)(`Annonce #${listingId} introuvable.`);
        }
        const currentData = listingSnap.data() || {};
        const newHidden = typeof explicitHidden === 'boolean' ? explicitHidden : !Boolean(currentData.isHidden);
        await listingRef.update({
            isHidden: newHidden,
            hiddenBy: newHidden ? auth.uid : null,
            hiddenAt: newHidden ? firestore_1.FieldValue.serverTimestamp() : null,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        (0, logger_1.logAdminAction)({
            action: 'toggleHideListingAsAdmin',
            by: auth.uid,
            target: listingId,
            details: {
                title: currentData.title || null,
                authorUid: currentData.authorUid || currentData.userId || null,
                isHidden: newHidden,
            },
            status: 'success',
        });
        return {
            success: true,
            listingId,
            isHidden: newHidden,
        };
    }
    catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        (0, logger_1.logAdminAction)({
            action: 'toggleHideListingAsAdmin',
            by: auth.uid,
            target: listingId,
            status: 'failure',
            error: errorMsg,
        });
        throw err;
    }
}
exports.handleToggleHideListing = handleToggleHideListing;
//# sourceMappingURL=toggleHideListingAsAdmin.js.map