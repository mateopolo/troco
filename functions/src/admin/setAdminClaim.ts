import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { CallableRequest } from 'firebase-functions/v2/https';
import { throwForbidden, throwBadRequest, throwUnauthorized } from '../utils/errors';
import { logAdminAction } from '../utils/logger';
import { enforceAdminRateLimit } from '../middleware/rateLimit';

export interface SetAdminClaimRequest {
  uid: string;
  admin: boolean;
}

export interface SetAdminClaimResponse {
  success: boolean;
  uid: string;
  admin: boolean;
}

/**
 * 👑 Cloud Function Callable : setAdminClaim
 * Permet à un administrateur vérifié d'accorder ou de révoquer les privilèges Admin (Custom Claim).
 * Met à jour le claim cryptographique dans Firebase Auth et synchronise le profil Firestore.
 */
export async function handleSetAdminClaim(
  request: CallableRequest<SetAdminClaimRequest>,
  db: Firestore
): Promise<SetAdminClaimResponse> {
  const authContext = request.auth;
  if (!authContext || !authContext.uid) {
    throwUnauthorized('Authentification obligatoire.');
  }

  // Vérification stricte du claim admin signé
  if (authContext.token?.admin !== true) {
    logAdminAction({
      action: 'setAdminClaim',
      by: authContext.uid,
      status: 'failure',
      error: 'Tentative non autorisée par un utilisateur non-admin'
    });
    throwForbidden('Accès réservé exclusivement aux administrateurs certifiés.');
  }

  // Middleware Rate-Limiting (max 10 appels/minute)
  await enforceAdminRateLimit(db, authContext.uid);

  const { uid, admin: grantAdmin } = request.data || {};
  if (!uid || typeof uid !== 'string' || typeof grantAdmin !== 'boolean') {
    throwBadRequest('Paramètres uid (string) et admin (boolean) requis.');
  }

  try {
    const authAdmin = getAuth();

    // 1. Définition du Custom Claim dans Firebase Auth
    const existingUser = await authAdmin.getUser(uid);
    const currentClaims = existingUser.customClaims || {};
    const updatedClaims = {
      ...currentClaims,
      admin: grantAdmin
    };

    await authAdmin.setCustomUserClaims(uid, updatedClaims);

    // 2. Synchronisation sur le profil Firestore
    const userRef = db.collection('users').doc(uid);
    await userRef.set({
      isAdmin: grantAdmin,
      role: grantAdmin ? 'admin' : 'user',
      adminGrantedBy: authContext.uid,
      adminUpdatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    // 3. Journalisation d'audit Cloud Logging
    logAdminAction({
      action: 'setAdminClaim',
      by: authContext.uid,
      target: uid,
      details: { granted: grantAdmin, targetEmail: existingUser.email || null },
      status: 'success'
    });

    return {
      success: true,
      uid,
      admin: grantAdmin
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logAdminAction({
      action: 'setAdminClaim',
      by: authContext.uid,
      target: uid,
      status: 'failure',
      error: errorMsg
    });
    throw err;
  }
}
