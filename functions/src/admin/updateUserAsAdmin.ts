import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { CallableRequest } from 'firebase-functions/v2/https';
import { throwForbidden, throwBadRequest, throwUnauthorized, throwNotFound } from '../utils/errors';
import { logAdminAction } from '../utils/logger';
import { enforceAdminRateLimit } from '../middleware/rateLimit';

export interface UpdateUserAsAdminRequest {
  uid: string;
  updates: Record<string, any>;
}

export interface UpdateUserAsAdminResponse {
  success: boolean;
  uid: string;
  updatedFields: string[];
}

// Champs sensibles interdits à l'injection arbitraire non contrôlée
const FORBIDDEN_FIELDS = ['password', 'hash', 'salt'];

/**
 * 👤 Cloud Function Callable : updateUserAsAdmin
 * Permet à un administrateur vérifié de mettre à jour les propriétés administratives d'un profil utilisateur.
 */
export async function handleUpdateUserAsAdmin(
  request: CallableRequest<UpdateUserAsAdminRequest>,
  db: Firestore
): Promise<UpdateUserAsAdminResponse> {
  const auth = request.auth;
  if (!auth || !auth.uid) {
    throwUnauthorized('Authentification requise.');
  }

  if (auth.token?.admin !== true) {
    logAdminAction({
      action: 'updateUserAsAdmin',
      by: auth.uid,
      status: 'failure',
      error: 'Tentative non autorisée par un utilisateur non-admin'
    });
    throwForbidden('Accès réservé aux administrateurs certifiés.');
  }

  // Middleware Rate-Limiting (max 10 appels/minute)
  await enforceAdminRateLimit(db, auth.uid);

  const { uid, updates } = request.data || {};
  if (!uid || typeof uid !== 'string' || !updates || typeof updates !== 'object') {
    throwBadRequest('Paramètres uid (string) et updates (object) requis.');
  }

  // Filtrage des champs interdits
  const cleanUpdates: Record<string, any> = {};
  for (const [key, val] of Object.entries(updates)) {
    if (!FORBIDDEN_FIELDS.includes(key)) {
      cleanUpdates[key] = val;
    }
  }

  if (Object.keys(cleanUpdates).length === 0) {
    throwBadRequest('Aucun champ valide à mettre à jour.');
  }

  try {
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      throwNotFound(`Utilisateur #${uid} introuvable dans Firestore.`);
    }

    cleanUpdates.adminUpdatedBy = auth.uid;
    cleanUpdates.updatedAt = FieldValue.serverTimestamp();

    await userRef.update(cleanUpdates);

    // Si le statut de bannissement a changé, synchroniser l'Auth Firebase
    if (typeof cleanUpdates.isBanned === 'boolean') {
      try {
        await getAuth().updateUser(uid, { disabled: cleanUpdates.isBanned });
      } catch (authErr) {
        console.warn(`[Admin] Impossible de mettre à jour le statut auth de l'utilisateur ${uid}:`, authErr);
      }
    }

    logAdminAction({
      action: 'updateUserAsAdmin',
      by: auth.uid,
      target: uid,
      details: { modifiedKeys: Object.keys(cleanUpdates) },
      status: 'success',
    });

    return {
      success: true,
      uid,
      updatedFields: Object.keys(cleanUpdates),
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logAdminAction({
      action: 'updateUserAsAdmin',
      by: auth.uid,
      target: uid,
      status: 'failure',
      error: errorMsg,
    });
    throw err;
  }
}
