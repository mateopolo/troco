import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';

export async function executeCleanupRateLimits(db: Firestore): Promise<number> {
  const now = Timestamp.now();
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

export const createCleanupRateLimits = (db: Firestore) =>
  onSchedule(
    {
      schedule: 'every 1 hours',
      timeZone: 'Europe/Paris',
    },
    async () => {
      const deletedCount = await executeCleanupRateLimits(db);
      if (deletedCount > 0) {
        console.log(`[RateLimit Cleanup] Purged ${deletedCount} expired rate limit entries.`);
      }
    }
  );
