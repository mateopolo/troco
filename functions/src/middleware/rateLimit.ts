import { FieldValue, Firestore, Transaction } from 'firebase-admin/firestore';
import { throwRateLimited } from '../utils/errors';
import { logAdminAction } from '../utils/logger';

const MAX_ADMIN_CALLS_PER_MINUTE = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

/**
 * ⏱️ Middleware de limitation de débit (Rate Limiting) pour actions administrateur
 * Règle stricte : 10 requêtes par minute par UID administrateur
 * Enregistrement dans une collection technique privée Firestore '_admin_rate_limits'
 */
export async function enforceAdminRateLimit(db: Firestore, callerUid: string): Promise<void> {
  if (!callerUid) return;

  const limitRef = db.collection('_admin_rate_limits').doc(callerUid);
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  await db.runTransaction(async (transaction: Transaction) => {
    const docSnap = await transaction.get(limitRef);
    let timestamps: number[] = [];

    if (docSnap.exists) {
      const data = docSnap.data();
      if (Array.isArray(data?.timestamps)) {
        // Filtrer les appels survenus dans la dernière minute glissante
        timestamps = data.timestamps.filter((ts: unknown) => typeof ts === 'number' && ts > windowStart);
      }
    }

    if (timestamps.length >= MAX_ADMIN_CALLS_PER_MINUTE) {
      logAdminAction({
        action: 'RATE_LIMIT_EXCEEDED',
        by: callerUid,
        status: 'warning',
        details: { count: timestamps.length, limit: MAX_ADMIN_CALLS_PER_MINUTE }
      });
      throwRateLimited(`Limite de ${MAX_ADMIN_CALLS_PER_MINUTE} opérations administrateur par minute dépassée.`);
    }

    timestamps.push(now);

    transaction.set(limitRef, {
      timestamps,
      lastCallAt: FieldValue.serverTimestamp(),
      count: timestamps.length
    }, { merge: true });
  });
}
