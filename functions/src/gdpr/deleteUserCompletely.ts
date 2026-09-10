import { Firestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { anonymizeTransactions } from './anonymizeTransactions';
import { sendDeletionEmail } from './sendDeletionEmail';
import { structLog } from '../utils/logger';

export interface DeleteUserRequestData {
  confirm: boolean;
  immediate?: boolean;
}

export interface DeleteUserResponse {
  success: boolean;
  mode: 'soft' | 'immediate';
  restoreUntil?: string;
}

/**
 * Exécute la suppression complète et irréversible d'un compte utilisateur.
 */
export async function executeHardDeletion(uid: string, db: Firestore): Promise<void> {
  // 1. Anonymisation légale des transactions comptables
  await anonymizeTransactions(uid, db);

  // 2. Suppression de la sous-collection notifications
  const notifsSnap = await db.collection(`users/${uid}/notifications`).get();
  if (!notifsSnap.empty) {
    const batch = db.batch();
    notifsSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  // 3. Suppression des annonces créées par l'utilisateur
  const listingsSnap = await db.collection('listings').where('authorUid', '==', uid).get();
  if (!listingsSnap.empty) {
    const batch = db.batch();
    listingsSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  // 4. Retrait de l'utilisateur des chats partagés (sans supprimer l'historique de l'autre participant)
  const chatsSnap = await db.collection('chats').where('participants', 'array-contains', uid).get();
  if (!chatsSnap.empty) {
    const batch = db.batch();
    chatsSnap.docs.forEach((d) => {
      batch.update(d.ref, {
        participants: FieldValue.arrayRemove(uid),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
  }

  // 5. Suppression des documents profil users/{uid} et users_public/{uid}
  await Promise.all([
    db.doc(`users/${uid}`).delete().catch(() => {}),
    db.doc(`users_public/${uid}`).delete().catch(() => {}),
  ]);

  // 6. Suppression du compte dans Firebase Authentication
  await getAuth().deleteUser(uid).catch((err) => {
    console.warn(`[GDPR Auth] Failed to delete auth user ${uid}:`, err);
  });

  // 7. Inscription au registre d'audit légal RGPD (sans données identifiantes)
  await db.collection('audit_logs').add({
    action: 'gdpr_account_deletion',
    targetUid: uid,
    deletedAt: FieldValue.serverTimestamp(),
    anonymized: true,
  });

  await structLog('deleteUser_real', { uid });
}

export async function handleDeleteUserCompletely(
  request: CallableRequest<DeleteUserRequestData>,
  db: Firestore
): Promise<DeleteUserResponse> {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Authentification requise pour supprimer votre compte.');
  }

  const { confirm, immediate = false } = request.data || {};
  if (confirm !== true) {
    throw new HttpsError('invalid-argument', 'Une confirmation explicite (confirm: true) est obligatoire.');
  }

  if (!immediate) {
    // Soft delete (Délai de rétractation de 30 jours)
    const deletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.doc(`users/${uid}`).update({
      pendingDeletion: true,
      deletionScheduledAt: Timestamp.fromDate(deletionDate),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await sendDeletionEmail(uid, db);
    await structLog('deleteUser_soft', { uid, scheduledFor: deletionDate.toISOString() });

    return {
      success: true,
      mode: 'soft',
      restoreUntil: deletionDate.toISOString(),
    };
  }

  // Suppression immédiate
  await executeHardDeletion(uid, db);

  return {
    success: true,
    mode: 'immediate',
  };
}
