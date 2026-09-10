import { Firestore } from 'firebase-admin/firestore';
import { FirestoreEvent, Change, DocumentSnapshot } from 'firebase-functions/v2/firestore';
import { extractPublicUserFields } from '../utils/publicUserFields';
import { logAdminAction } from '../utils/logger';

/**
 * 🔄 Cloud Function Handler : onUserWriteSyncPublic
 * Déclenché lors de toute écriture (création, modification, suppression) sur users/{uid}.
 * Maintient le miroir public sécurisé dans la collection users_public/{uid}.
 */
export async function handleUserWriteSyncPublic(
  event: FirestoreEvent<Change<DocumentSnapshot> | undefined, { uid: string }>,
  db: Firestore
): Promise<void> {
  const uid = event.params?.uid;
  if (!uid) return;

  const publicRef = db.collection('users_public').doc(uid);

  // Cas 1 : Suppression de l'utilisateur
  if (!event.data || !event.data.after || !event.data.after.exists) {
    try {
      await publicRef.delete();
      logAdminAction({
        action: 'syncPublicUser_delete',
        by: 'system_trigger',
        target: uid,
        status: 'success',
      });
    } catch (err: unknown) {
      console.error(`[onUserWriteSyncPublic] Erreur suppression users_public/${uid}:`, err);
    }
    return;
  }

  // Cas 2 : Création ou mise à jour
  try {
    const rawData = event.data.after.data() || {};
    const publicProfile = extractPublicUserFields(rawData);

    await publicRef.set(publicProfile, { merge: true });

    logAdminAction({
      action: 'syncPublicUser_upsert',
      by: 'system_trigger',
      target: uid,
      details: { username: publicProfile.username, name: publicProfile.name },
      status: 'success',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[onUserWriteSyncPublic] Erreur synchronisation users_public/${uid}:`, errorMsg);
    logAdminAction({
      action: 'syncPublicUser_upsert',
      by: 'system_trigger',
      target: uid,
      status: 'failure',
      error: errorMsg,
    });
    throw err;
  }
}
