"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUpdateUserAsAdmin = void 0;
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const rateLimit_1 = require("../middleware/rateLimit");
// Champs sensibles interdits à l'injection arbitraire non contrôlée
const FORBIDDEN_FIELDS = ['password', 'hash', 'salt'];
/**
 * 👤 Cloud Function Callable : updateUserAsAdmin
 * Permet à un administrateur vérifié de mettre à jour les propriétés administratives d'un profil utilisateur.
 */
async function handleUpdateUserAsAdmin(request, db) {
    const auth = request.auth;
    if (!auth || !auth.uid) {
        (0, errors_1.throwUnauthorized)('Authentification requise.');
    }
    if (auth.token?.admin !== true) {
        (0, logger_1.logAdminAction)({
            action: 'updateUserAsAdmin',
            by: auth.uid,
            status: 'failure',
            error: 'Tentative non autorisée par un utilisateur non-admin'
        });
        (0, errors_1.throwForbidden)('Accès réservé aux administrateurs certifiés.');
    }
    // Middleware Rate-Limiting (max 10 appels/minute)
    await (0, rateLimit_1.enforceAdminRateLimit)(db, auth.uid);
    const { uid, updates } = request.data || {};
    if (!uid || typeof uid !== 'string' || !updates || typeof updates !== 'object') {
        (0, errors_1.throwBadRequest)('Paramètres uid (string) et updates (object) requis.');
    }
    // Filtrage des champs interdits
    const cleanUpdates = {};
    for (const [key, val] of Object.entries(updates)) {
        if (!FORBIDDEN_FIELDS.includes(key)) {
            cleanUpdates[key] = val;
        }
    }
    if (Object.keys(cleanUpdates).length === 0) {
        (0, errors_1.throwBadRequest)('Aucun champ valide à mettre à jour.');
    }
    try {
        const userRef = db.collection('users').doc(uid);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
            (0, errors_1.throwNotFound)(`Utilisateur #${uid} introuvable dans Firestore.`);
        }
        cleanUpdates.adminUpdatedBy = auth.uid;
        cleanUpdates.updatedAt = firestore_1.FieldValue.serverTimestamp();
        await userRef.update(cleanUpdates);
        // Si le statut de bannissement a changé, synchroniser l'Auth Firebase
        if (typeof cleanUpdates.isBanned === 'boolean') {
            try {
                await (0, auth_1.getAuth)().updateUser(uid, { disabled: cleanUpdates.isBanned });
            }
            catch (authErr) {
                console.warn(`[Admin] Impossible de mettre à jour le statut auth de l'utilisateur ${uid}:`, authErr);
            }
        }
        (0, logger_1.logAdminAction)({
            action: 'updateUserAsAdmin',
            by: auth.uid,
            target: uid,
            details: { modifiedKeys: Object.keys(cleanUpdates) },
            status: 'success',
        });
        return {
            success: true,
            uid,
            updatedFields: Object.keys(cleanUpdates),
        };
    }
    catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        (0, logger_1.logAdminAction)({
            action: 'updateUserAsAdmin',
            by: auth.uid,
            target: uid,
            status: 'failure',
            error: errorMsg,
        });
        throw err;
    }
}
exports.handleUpdateUserAsAdmin = handleUpdateUserAsAdmin;
//# sourceMappingURL=updateUserAsAdmin.js.map