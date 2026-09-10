import { Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { CallableRequest } from 'firebase-functions/v2/https';
import { throwForbidden, throwUnauthorized } from '../utils/errors';
import { logAdminAction } from '../utils/logger';
import { enforceAdminRateLimit } from '../middleware/rateLimit';
import { extractPublicUserFields } from '../utils/publicUserFields';

export interface MigrateUsersPublicResponse {
  success: boolean;
  totalUsersFound: number;
  migratedCount: number;
  batchCount: number;
}

/**
 * 📦 Cloud Function Callable : migrateUsersPublic
 * Migration one-shot / backfill idempotent pour initialiser la collection users_public.
 * Réservé exclusivement aux administrateurs certifiés (Custom Claims).
 */
export async function handleMigrateUsersPublic(
  request: CallableRequest<void>,
  db: Firestore
): Promise<MigrateUsersPublicResponse> {
  const auth = request.auth;
  if (!auth || !auth.uid) {
    throwUnauthorized('Authentification requise.');
  }

  if (auth.token?.admin !== true) {
    logAdminAction({
      action: 'migrateUsersPublic',
      by: auth.uid,
      status: 'failure',
      error: 'Tentative de migration par un non-admin',
    });
    throwForbidden('Accès réservé exclusivement aux administrateurs certifiés.');
  }

  // Rate limiting admin
  await enforceAdminRateLimit(db, auth.uid);

  try {
    const usersSnapshot = await db.collection('users').get();
    const totalUsers = usersSnapshot.size;

    if (totalUsers === 0) {
      return {
        success: true,
        totalUsersFound: 0,
        migratedCount: 0,
        batchCount: 0,
      };
    }

    // Traitement par batches de 450 documents (limite Firestore = 500 ops/batch)
    const BATCH_SIZE = 450;
    let currentBatch = db.batch();
    let opsInCurrentBatch = 0;
    let batchCount = 0;
    let migratedCount = 0;

    for (const docSnap of usersSnapshot.docs as QueryDocumentSnapshot[]) {
      const uid = docSnap.id;
      const rawData = docSnap.data() || {};
      const publicData = extractPublicUserFields(rawData);

      const publicRef = db.collection('users_public').doc(uid);
      currentBatch.set(publicRef, publicData, { merge: true });
      opsInCurrentBatch++;
      migratedCount++;

      if (opsInCurrentBatch >= BATCH_SIZE) {
        await currentBatch.commit();
        batchCount++;
        currentBatch = db.batch();
        opsInCurrentBatch = 0;
      }
    }

    if (opsInCurrentBatch > 0) {
      await currentBatch.commit();
      batchCount++;
    }

    logAdminAction({
      action: 'migrateUsersPublic',
      by: auth.uid,
      details: { totalUsers, migratedCount, batchCount },
      status: 'success',
    });

    return {
      success: true,
      totalUsersFound: totalUsers,
      migratedCount,
      batchCount,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logAdminAction({
      action: 'migrateUsersPublic',
      by: auth.uid,
      status: 'failure',
      error: errorMsg,
    });
    throw err;
  }
}
