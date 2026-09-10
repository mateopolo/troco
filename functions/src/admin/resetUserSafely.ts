import { Firestore, FieldValue, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { CallableRequest } from 'firebase-functions/v2/https';
import { throwForbidden, throwBadRequest, throwNotFound, throwUnauthorized } from '../utils/errors';
import { logAdminAction } from '../utils/logger';
import { enforceAdminRateLimit } from '../middleware/rateLimit';

export interface ResetUserSafelyRequest {
  uid: string;
  preserveWallet?: boolean;
}

export interface ResetUserSafelyResponse {
  success: boolean;
  newProfile: Record<string, unknown>;
  preservedWallet: boolean;
  listingsDeletedCount: number;
}

/**
 * 🔄 Cloud Function Callable : resetUserSafely
 * Permet à un administrateur de réinitialiser le profil d'un utilisateur en toute sécurité.
 * Règle d'or : Préserve obligatoirement le solde financier (euroBalance & trocoTokens)
 * si preserveWallet est actif (comportement par défaut).
 */
export async function handleResetUserSafely(
  request: CallableRequest<ResetUserSafelyRequest>,
  db: Firestore
): Promise<ResetUserSafelyResponse> {
  const auth = request.auth;
  if (!auth || !auth.uid) {
    throwUnauthorized('Authentification obligatoire.');
  }

  // Vérification de sécurité Admin
  if (auth.token?.admin !== true) {
    logAdminAction({
      action: 'resetUserSafely',
      by: auth.uid,
      status: 'failure',
      error: 'Tentative de reset utilisateur sans privilèges administrateur'
    });
    throwForbidden('Accès réservé exclusivement aux administrateurs certifiés.');
  }

  // Middleware Rate-Limiting (max 10 appels/minute)
  await enforceAdminRateLimit(db, auth.uid);

  const { uid, preserveWallet = true } = request.data || {};
  if (!uid || typeof uid !== 'string') {
    throwBadRequest('Paramètre uid (string) manquant ou invalide.');
  }

  try {
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      throwNotFound(`L'utilisateur "${uid}" n'existe pas.`);
    }

    const currentProfile = userSnap.data() || {};

    // Données de base réinitialisées
    const resetData: Record<string, unknown> = {
      dealsCompleted: 0,
      dealsInProgress: 0,
      skills: [],
      equipment: [],
      bio: 'Nouvel utilisateur sur Troco ! Prêt à partager mes compétences et échanger des services.',
      kycVerified: false,
      onboardingCompleted: false,
      hasClaimedWelcomeGift: false,
      isBanned: false,
      isShadowBanned: false,
      resetAt: FieldValue.serverTimestamp(),
      resetBy: auth.uid,
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Préservation stricte du solde financier selon paramètre
    if (preserveWallet) {
      resetData.euroBalance = typeof currentProfile.euroBalance === 'number' ? currentProfile.euroBalance : 0.00;
      resetData.trocoTokens = typeof currentProfile.trocoTokens === 'number' ? currentProfile.trocoTokens : 10;
    } else {
      // Si réinitialisation financière expressément demandée par l'admin
      resetData.euroBalance = 0.00;
      resetData.trocoTokens = 10;
    }

    // 1. Mise à jour du profil utilisateur dans Firestore
    await userRef.update(resetData);

    // 2. Nettoyage des annonces actives de cet utilisateur
    const listingsQuery = await db.collection('listings').where('authorUid', '==', uid).get();
    let listingsDeletedCount = 0;
    const batch = db.batch();

    listingsQuery.docs.forEach((docSnap: QueryDocumentSnapshot) => {
      batch.delete(docSnap.ref);
      listingsDeletedCount++;
    });

    if (listingsDeletedCount > 0) {
      await batch.commit();
    }

    // 3. Journalisation Cloud Logging
    logAdminAction({
      action: 'resetUserSafely',
      by: auth.uid,
      target: uid,
      details: { preserveWallet, listingsDeletedCount, keptEuro: resetData.euroBalance, keptTokens: resetData.trocoTokens },
      status: 'success'
    });

    return {
      success: true,
      newProfile: resetData,
      preservedWallet: Boolean(preserveWallet),
      listingsDeletedCount
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logAdminAction({
      action: 'resetUserSafely',
      by: auth.uid,
      target: uid,
      status: 'failure',
      error: errorMsg
    });
    throw err;
  }
}
