import { Firestore, Transaction, Timestamp, FieldValue } from 'firebase-admin/firestore';

export interface IdempotencyRecord<T = unknown> {
  result: T;
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  expiresAt: FirebaseFirestore.Timestamp;
}

const IDEMPOTENCY_COLLECTION = 'idempotency_keys';
const TTL_HOURS = 24;

/**
 * Vérifie si une clé d'idempotence a déjà été traitée et n'est pas expirée.
 * @returns Le résultat précédemment calculé, ou null si la clé n'existe pas ou est expirée.
 */
export async function checkIdempotency<T = unknown>(
  key: string,
  db: Firestore
): Promise<T | null> {
  if (!key || typeof key !== 'string') return null;

  try {
    const docRef = db.doc(`${IDEMPOTENCY_COLLECTION}/${key}`);
    const snap = await docRef.get();

    if (!snap.exists) return null;

    const data = snap.data() as IdempotencyRecord<T>;
    const now = Date.now();

    if (data.expiresAt && data.expiresAt.toMillis() < now) {
      // Clé expirée : suppression silencieuse en tâche de fond
      docRef.delete().catch(() => {});
      return null;
    }

    return (data.result as T) ?? null;
  } catch (err) {
    console.warn(`[Idempotency] Failed to check key ${key}:`, err);
    return null;
  }
}

/**
 * Enregistre le résultat d'une opération idempotente avec un TTL de 24h.
 * Utilisable directement ou au sein d'une transaction Firestore existante.
 */
export function storeIdempotency<T = unknown>(
  key: string,
  result: T,
  db: Firestore,
  tx?: Transaction
): void {
  if (!key || typeof key !== 'string') return;

  const docRef = db.doc(`${IDEMPOTENCY_COLLECTION}/${key}`);
  const expiresAt = Timestamp.fromMillis(Date.now() + TTL_HOURS * 60 * 60 * 1000);

  const payload: IdempotencyRecord<T> = {
    result,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
  };

  if (tx) {
    tx.set(docRef, payload);
  } else {
    docRef.set(payload).catch((e) => {
      console.warn(`[Idempotency] Failed to store key ${key}:`, e);
    });
  }
}
