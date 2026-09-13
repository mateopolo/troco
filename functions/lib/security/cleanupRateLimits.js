"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCleanupRateLimits = exports.executeCleanupRateLimits = void 0;
const firestore_1 = require("firebase-admin/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
async function executeCleanupRateLimits(db) {
    const now = firestore_1.Timestamp.now();
    const snap = await db
        .collection('rate_limits')
        .where('expiresAt', '<=', now)
        .limit(400)
        .get();
    if (snap.empty) {
        return 0;
    }
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    return snap.size;
}
exports.executeCleanupRateLimits = executeCleanupRateLimits;
const createCleanupRateLimits = (db) => (0, scheduler_1.onSchedule)({
    schedule: 'every 1 hours',
    timeZone: 'Europe/Paris',
}, async () => {
    const deletedCount = await executeCleanupRateLimits(db);
    if (deletedCount > 0) {
        console.log(`[RateLimit Cleanup] Purged ${deletedCount} expired rate limit entries.`);
    }
});
exports.createCleanupRateLimits = createCleanupRateLimits;
//# sourceMappingURL=cleanupRateLimits.js.map