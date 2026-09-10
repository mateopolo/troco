import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { RATE_LIMITS, getWindowStart } from './rateLimitHelper';

export interface CheckRateLimitData {
  action: string;
}

export interface CheckRateLimitResponse {
  allowed: boolean;
  retryAfter: number;
  remaining: number;
}

export async function handleCheckRateLimit(
  request: CallableRequest<CheckRateLimitData>,
  db: Firestore
): Promise<CheckRateLimitResponse> {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Authentification requise pour vérifier le quota d\'actions.');
  }

  const { action } = request.data || {};
  const config = RATE_LIMITS[action];

  if (!config) {
    throw new HttpsError('invalid-argument', `Action inconnue ou non soumise à quota : ${action}`);
  }

  const now = Date.now();
  const windowStart = getWindowStart(now, config.windowSeconds);
  const key = `${uid}_${action}_${windowStart}`;
  const ref = db.doc(`rate_limits/${key}`);

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? Number(snap.data()?.count || 0) : 0;

    if (current >= config.max) {
      const retryAfter = Math.max(1, Math.ceil((windowStart + config.windowSeconds * 1000 - now) / 1000));
      return { allowed: false, retryAfter, remaining: 0 };
    }

    tx.set(
      ref,
      {
        uid,
        action,
        count: current + 1,
        windowStart,
        expiresAt: Timestamp.fromMillis(windowStart + config.windowSeconds * 1000 + 60000),
      },
      { merge: true }
    );

    return { allowed: true, retryAfter: 0, remaining: config.max - current - 1 };
  });

  if (!result.allowed) {
    throw new HttpsError('resource-exhausted', `Fréquence trop élevée pour l'action "${action}". Réessayez dans ${result.retryAfter}s.`, {
      retryAfter: result.retryAfter,
      action,
    });
  }

  return result;
}
