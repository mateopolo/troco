"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSetAdminClaim = void 0;
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const rateLimit_1 = require("../middleware/rateLimit");
/**
 * 👑 Cloud Function Callable : setAdminClaim
 * Permet à un administrateur vérifié d'accorder ou de révoquer les privilèges Admin (Custom Claim).
 * Met à jour le claim cryptographique dans Firebase Auth et synchronise le profil Firestore.
 */
async function handleSetAdminClaim(request, db) {
    const authContext = request.auth;
    if (!authContext || !authContext.uid) {
        (0, errors_1.throwUnauthorized)('Authentification obligatoire.');
    }
    // Vérification stricte du claim admin signé
    if (authContext.token?.admin !== true) {
        (0, logger_1.logAdminAction)({
            action: 'setAdminClaim',
            by: authContext.uid,
            status: 'failure',
            error: 'Tentative non autorisée par un utilisateur non-admin'
        });
        (0, errors_1.throwForbidden)('Accès réservé exclusivement aux administrateurs certifiés.');
    }
    // Middleware Rate-Limiting (max 10 appels/minute)
    await (0, rateLimit_1.enforceAdminRateLimit)(db, authContext.uid);
    const { uid, admin: grantAdmin } = request.data || {};
    if (!uid || typeof uid !== 'string' || typeof grantAdmin !== 'boolean') {
        (0, errors_1.throwBadRequest)('Paramètres uid (string) et admin (boolean) requis.');
    }
    try {
        const authAdmin = (0, auth_1.getAuth)();
        // 1. Définition du Custom Claim dans Firebase Auth
        const existingUser = await authAdmin.getUser(uid);
        const currentClaims = existingUser.customClaims || {};
        const updatedClaims = {
            ...currentClaims,
            admin: grantAdmin
        };
        await authAdmin.setCustomUserClaims(uid, updatedClaims);
        // 2. Synchronisation sur le profil Firestore
        const userRef = db.collection('users').doc(uid);
        await userRef.set({
            isAdmin: grantAdmin,
            role: grantAdmin ? 'admin' : 'user',
            adminGrantedBy: authContext.uid,
            adminUpdatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        // 3. Journalisation d'audit Cloud Logging
        (0, logger_1.logAdminAction)({
            action: 'setAdminClaim',
            by: authContext.uid,
            target: uid,
            details: { granted: grantAdmin, targetEmail: existingUser.email || null },
            status: 'success'
        });
        return {
            success: true,
            uid,
            admin: grantAdmin
        };
    }
    catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        (0, logger_1.logAdminAction)({
            action: 'setAdminClaim',
            by: authContext.uid,
            target: uid,
            status: 'failure',
            error: errorMsg
        });
        throw err;
    }
}
exports.handleSetAdminClaim = handleSetAdminClaim;
//# sourceMappingURL=setAdminClaim.js.map