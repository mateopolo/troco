import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { structLog } from '../utils/logger';

export interface RestoreAccountResponse {
  success: boolean;
  message: string;
}

export async function handleRestoreAccount(
  request: CallableRequest<Record<string, unknown>>,
  db: Firestore
): Promise<RestoreAccountResponse> {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Authentification requise pour restaurer votre compte.');
  }

  const userRef = db.doc(`users/${uid}`);
  const snap = await userRef.get();

  if (!snap.exists) {
    throw new HttpsError('not-found', 'Compte utilisateur introuvable.');
  }

  const data = snap.data() || {};
  if (!data.pendingDeletion) {
    return {
      success: true,
      message: 'Votre compte est déjà actif et ne fait l\'objet d\'aucune procédure de suppression.',
    };
  }

  await userRef.update({
    pendingDeletion: false,
    deletionScheduledAt: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await structLog('restoreAccount', { uid });

  return {
    success: true,
    message: 'La procédure de suppression a été annulée avec succès. Votre compte est pleinement restauré.',
  };
}
