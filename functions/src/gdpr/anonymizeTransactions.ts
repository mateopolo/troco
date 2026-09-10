import { Firestore } from 'firebase-admin/firestore';
import * as crypto from 'crypto';

/**
 * Anonymise les transactions pour respecter le droit à l'oubli (RGPD art. 17)
 * tout en conservant l'intégrité comptable légale (obligation 10 ans).
 */
export async function anonymizeTransactions(uid: string, db: Firestore): Promise<number> {
  if (!uid) return 0;

  const anonymizedId = 'deleted_' + crypto.createHash('sha256').update(uid).digest('hex').substring(0, 12);
  let totalAnonymized = 0;

  // 1. Transactions où l'utilisateur est initiateur (userId)
  const userTxSnap = await db.collection('transactions').where('userId', '==', uid).get();
  if (!userTxSnap.empty) {
    const batch = db.batch();
    userTxSnap.docs.forEach((doc) => {
      batch.update(doc.ref, {
        userId: anonymizedId,
        userName: 'Utilisateur supprimé',
        userEmail: '',
        anonymized: true,
      });
    });
    await batch.commit();
    totalAnonymized += userTxSnap.size;
  }

  // 2. Transactions où l'utilisateur est contrepartie (partnerUid)
  const partnerTxSnap = await db.collection('transactions').where('partnerUid', '==', uid).get();
  if (!partnerTxSnap.empty) {
    const batch = db.batch();
    partnerTxSnap.docs.forEach((doc) => {
      batch.update(doc.ref, {
        partnerUid: anonymizedId,
        partnerName: 'Utilisateur supprimé',
        anonymized: true,
      });
    });
    await batch.commit();
    totalAnonymized += partnerTxSnap.size;
  }

  return totalAnonymized;
}
