import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { CallableRequest } from 'firebase-functions/v2/https';
import { throwForbidden, throwBadRequest, throwNotFound, throwUnauthorized } from '../utils/errors';
import { logAdminAction } from '../utils/logger';
import { enforceAdminRateLimit } from '../middleware/rateLimit';

export interface DeleteListingAsAdminRequest {
  listingId: string;
  reason?: string;
}

export interface DeleteListingAsAdminResponse {
  success: boolean;
  deletedId: string;
  reason: string;
}

/**
 * 🗑️ Cloud Function Callable : deleteListingAsAdmin
 * Permet à un administrateur vérifié de supprimer un listing illicite ou frauduleux.
 * Supprime le document principal, notifie l'auteur et enregistre l'action dans les logs d'audit.
 */
export async function handleDeleteListingAsAdmin(
  request: CallableRequest<DeleteListingAsAdminRequest>,
  db: Firestore
): Promise<DeleteListingAsAdminResponse> {
  const auth = request.auth;
  if (!auth || !auth.uid) {
    throwUnauthorized('Authentification requise.');
  }

  // Vérification de sécurité Admin
  if (auth.token?.admin !== true) {
    logAdminAction({
      action: 'deleteListingAsAdmin',
      by: auth.uid,
      status: 'failure',
      error: 'Tentative de suppression sans privilèges administrateur'
    });
    throwForbidden('Accès réservé exclusivement aux administrateurs certifiés.');
  }

  // Middleware Rate-Limiting (max 10 requêtes/minute)
  await enforceAdminRateLimit(db, auth.uid);

  const { listingId, reason = 'Non respect de la charte de la communauté' } = request.data || {};
  if (!listingId || typeof listingId !== 'string') {
    throwBadRequest('Identifiant de listing manquant ou invalide.');
  }

  try {
    const listingRef = db.collection('listings').doc(listingId);
    const listingSnap = await listingRef.get();

    if (!listingSnap.exists) {
      throwNotFound(`L'annonce avec l'identifiant "${listingId}" n'existe pas.`);
    }

    const listingData = listingSnap.data() || {};
    const authorUid = listingData.authorUid || listingData.userId;

    // 1. Suppression du listing principal
    await listingRef.delete();

    // 2. Notification interne sécurisée déposée à l'auteur si identifié
    if (authorUid && typeof authorUid === 'string') {
      const notifRef = db.collection('users').doc(authorUid).collection('notifications').doc();
      await notifRef.set({
        title: 'Annonce retirée par la modération',
        body: `Votre annonce "${listingData.title || listingId}" a été retirée : ${reason}`,
        type: 'admin_moderation',
        relatedListingId: listingId,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    // 3. Log d'audit Cloud Logging
    logAdminAction({
      action: 'deleteListingAsAdmin',
      by: auth.uid,
      target: listingId,
      details: {
        authorUid: authorUid || null,
        listingTitle: listingData.title || null,
        reason,
      },
      status: 'success'
    });

    return {
      success: true,
      deletedId: listingId,
      reason
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logAdminAction({
      action: 'deleteListingAsAdmin',
      by: auth.uid,
      target: listingId,
      status: 'failure',
      error: errorMsg
    });
    throw err;
  }
}
