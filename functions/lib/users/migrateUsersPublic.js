"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMigrateUsersPublic = void 0;
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const rateLimit_1 = require("../middleware/rateLimit");
const publicUserFields_1 = require("../utils/publicUserFields");
/**
 * 📦 Cloud Function Callable : migrateUsersPublic
 * Migration one-shot / backfill idempotent pour initialiser la collection users_public.
 * Réservé exclusivement aux administrateurs certifiés (Custom Claims).
 */
async function handleMigrateUsersPublic(request, db) {
    const auth = request.auth;
    if (!auth || !auth.uid) {
        (0, errors_1.throwUnauthorized)('Authentification requise.');
    }
    if (auth.token?.admin !== true) {
        (0, logger_1.logAdminAction)({
            action: 'migrateUsersPublic',
            by: auth.uid,
            status: 'failure',
            error: 'Tentative de migration par un non-admin',
        });
        (0, errors_1.throwForbidden)('Accès réservé exclusivement aux administrateurs certifiés.');
    }
    // Rate limiting admin
    await (0, rateLimit_1.enforceAdminRateLimit)(db, auth.uid);
    try {
        const usersSnapshot = await db.collection('users').get();
        const totalUsers = usersSnapshot.size;
        if (totalUsers === 0) {
            return {
                success: true,
                totalUsersFound: 0,
                migratedCount: 0,
                batchCount: 0,
            };
        }
        // Traitement par batches de 450 documents (limite Firestore = 500 ops/batch)
        const BATCH_SIZE = 450;
        let currentBatch = db.batch();
        let opsInCurrentBatch = 0;
        let batchCount = 0;
        let migratedCount = 0;
        for (const docSnap of usersSnapshot.docs) {
            const uid = docSnap.id;
            const rawData = docSnap.data() || {};
            const publicData = (0, publicUserFields_1.extractPublicUserFields)(rawData);
            const publicRef = db.collection('users_public').doc(uid);
            currentBatch.set(publicRef, publicData, { merge: true });
            opsInCurrentBatch++;
            migratedCount++;
            if (opsInCurrentBatch >= BATCH_SIZE) {
                await currentBatch.commit();
                batchCount++;
                currentBatch = db.batch();
                opsInCurrentBatch = 0;
            }
        }
        if (opsInCurrentBatch > 0) {
            await currentBatch.commit();
            batchCount++;
        }
        (0, logger_1.logAdminAction)({
            action: 'migrateUsersPublic',
            by: auth.uid,
            details: { totalUsers, migratedCount, batchCount },
            status: 'success',
        });
        return {
            success: true,
            totalUsersFound: totalUsers,
            migratedCount,
            batchCount,
        };
    }
    catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        (0, logger_1.logAdminAction)({
            action: 'migrateUsersPublic',
            by: auth.uid,
            status: 'failure',
            error: errorMsg,
        });
        throw err;
    }
}
exports.handleMigrateUsersPublic = handleMigrateUsersPublic;
//# sourceMappingURL=migrateUsersPublic.js.map