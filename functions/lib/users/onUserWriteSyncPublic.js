"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUserWriteSyncPublic = void 0;
const publicUserFields_1 = require("../utils/publicUserFields");
const logger_1 = require("../utils/logger");
/**
 * 🔄 Cloud Function Handler : onUserWriteSyncPublic
 * Déclenché lors de toute écriture (création, modification, suppression) sur users/{uid}.
 * Maintient le miroir public sécurisé dans la collection users_public/{uid}.
 */
async function handleUserWriteSyncPublic(event, db) {
    const uid = event.params?.uid;
    if (!uid)
        return;
    const publicRef = db.collection('users_public').doc(uid);
    // Cas 1 : Suppression de l'utilisateur
    if (!event.data || !event.data.after || !event.data.after.exists) {
        try {
            await publicRef.delete();
            (0, logger_1.logAdminAction)({
                action: 'syncPublicUser_delete',
                by: 'system_trigger',
                target: uid,
                status: 'success',
            });
        }
        catch (err) {
            console.error(`[onUserWriteSyncPublic] Erreur suppression users_public/${uid}:`, err);
        }
        return;
    }
    // Cas 2 : Création ou mise à jour
    try {
        const rawData = event.data.after.data() || {};
        const publicProfile = (0, publicUserFields_1.extractPublicUserFields)(rawData);
        await publicRef.set(publicProfile, { merge: true });
        (0, logger_1.logAdminAction)({
            action: 'syncPublicUser_upsert',
            by: 'system_trigger',
            target: uid,
            details: { username: publicProfile.username, name: publicProfile.name },
            status: 'success',
        });
    }
    catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[onUserWriteSyncPublic] Erreur synchronisation users_public/${uid}:`, errorMsg);
        (0, logger_1.logAdminAction)({
            action: 'syncPublicUser_upsert',
            by: 'system_trigger',
            target: uid,
            status: 'failure',
            error: errorMsg,
        });
        throw err;
    }
}
exports.handleUserWriteSyncPublic = handleUserWriteSyncPublic;
//# sourceMappingURL=onUserWriteSyncPublic.js.map