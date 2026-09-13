"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createScheduledDeletion = exports.executeScheduledDeletion = void 0;
const firestore_1 = require("firebase-admin/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const deleteUserCompletely_1 = require("./deleteUserCompletely");
async function executeScheduledDeletion(db) {
    const now = firestore_1.Timestamp.now();
    const snap = await db
        .collection('users')
        .where('pendingDeletion', '==', true)
        .where('deletionScheduledAt', '<=', now)
        .limit(50)
        .get();
    if (snap.empty) {
        return 0;
    }
    let count = 0;
    for (const doc of snap.docs) {
        try {
            await (0, deleteUserCompletely_1.executeHardDeletion)(doc.id, db);
            count++;
        }
        catch (err) {
            console.error(`[Scheduled Deletion] Error executing hard deletion on user ${doc.id}:`, err);
        }
    }
    return count;
}
exports.executeScheduledDeletion = executeScheduledDeletion;
const createScheduledDeletion = (db) => (0, scheduler_1.onSchedule)({
    schedule: '0 3 * * *',
    timeZone: 'Europe/Paris',
}, async () => {
    const deletedCount = await executeScheduledDeletion(db);
    if (deletedCount > 0) {
        console.log(`[Scheduled Deletion] Purged ${deletedCount} users whose 30-day grace period expired.`);
    }
});
exports.createScheduledDeletion = createScheduledDeletion;
//# sourceMappingURL=scheduledDeletion.js.map