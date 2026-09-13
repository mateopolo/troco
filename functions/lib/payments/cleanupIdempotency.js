"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCleanupIdempotency = exports.executeCleanupIdempotency = void 0;
const firestore_1 = require("firebase-admin/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
async function executeCleanupIdempotency(db) {
    const now = firestore_1.Timestamp.now();
    const snap = await db
        .collection('idempotency_keys')
        .where('expiresAt', '<=', now)
        .limit(400)
        .get();
    if (snap.empty) {
        return 0;
    }
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    return snap.size;
}
exports.executeCleanupIdempotency = executeCleanupIdempotency;
const createCleanupIdempotency = (db) => (0, scheduler_1.onSchedule)({
    schedule: 'every 1 hours',
    timeZone: 'Europe/Paris',
}, async () => {
    const deletedCount = await executeCleanupIdempotency(db);
    if (deletedCount > 0) {
        console.log(`[Idempotency Cleanup] Deleted ${deletedCount} expired idempotency keys.`);
    }
});
exports.createCleanupIdempotency = createCleanupIdempotency;
//# sourceMappingURL=cleanupIdempotency.js.map