import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';

export async function executeCleanupIdempotency(db: Firestore): Promise<number> {
  const now = Timestamp.now();
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

export const createCleanupIdempotency = (db: Firestore) =>
  onSchedule(
    {
      schedule: 'every 1 hours',
      timeZone: 'Europe/Paris',
    },
    async () => {
      const deletedCount = await executeCleanupIdempotency(db);
      if (deletedCount > 0) {
        console.log(`[Idempotency Cleanup] Deleted ${deletedCount} expired idempotency keys.`);
      }
    }
  );
