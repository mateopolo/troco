import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { executeHardDeletion } from './deleteUserCompletely';

export async function executeScheduledDeletion(db: Firestore): Promise<number> {
  const now = Timestamp.now();
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
      await executeHardDeletion(doc.id, db);
      count++;
    } catch (err) {
      console.error(`[Scheduled Deletion] Error executing hard deletion on user ${doc.id}:`, err);
    }
  }

  return count;
}

export const createScheduledDeletion = (db: Firestore) =>
  onSchedule(
    {
      schedule: '0 3 * * *', // Tous les jours à 03h00 du matin
      timeZone: 'Europe/Paris',
    },
    async () => {
      const deletedCount = await executeScheduledDeletion(db);
      if (deletedCount > 0) {
        console.log(`[Scheduled Deletion] Purged ${deletedCount} users whose 30-day grace period expired.`);
      }
    }
  );
