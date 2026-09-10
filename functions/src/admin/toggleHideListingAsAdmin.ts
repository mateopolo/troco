import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { CallableRequest } from 'firebase-functions/v2/https';
import { throwForbidden, throwBadRequest, throwUnauthorized, throwNotFound } from '../utils/errors';
import { logAdminAction } from '../utils/logger';
import { enforceAdminRateLimit } from '../middleware/rateLimit';

export interface ToggleHideListingRequest {
  listingId: string;
  isHidden?: boolean;
}

export interface ToggleHideListingResponse {
  success: boolean;
  listingId: string;
  isHidden: boolean;
}

/**
 * 👁️ Cloud Function Callable : toggleHideListingAsAdmin
 * Permet à un administrateur de masquer ou rendre visible un listing sur la plateforme.
 */
export async function handleToggleHideListing(
  request: CallableRequest<ToggleHideListingRequest>,
  db: Firestore
): Promise<ToggleHideListingResponse> {
  const auth = request.auth;
  if (!auth || !auth.uid) {
    throwUnauthorized('Authentification requise.');
  }

  if (auth.token?.admin !== true) {
    logAdminAction({
      action: 'toggleHideListingAsAdmin',
      by: auth.uid,
      status: 'failure',
      error: 'Tentative non autorisée par un utilisateur non-admin'
    });
    throwForbidden('Accès réservé aux administrateurs certifiés.');
  }

  // Middleware Rate-Limiting (max 10 appels/minute)
  await enforceAdminRateLimit(db, auth.uid);

  const { listingId, isHidden: explicitHidden } = request.data || {};
  if (!listingId || typeof listingId !== 'string') {
    throwBadRequest('Paramètre listingId (string) requis.');
  }

  try {
    const listingRef = db.collection('listings').doc(listingId);
    const listingSnap = await listingRef.get();

    if (!listingSnap.exists) {
      throwNotFound(`Annonce #${listingId} introuvable.`);
    }

    const currentData = listingSnap.data() || {};
    const newHidden = typeof explicitHidden === 'boolean' ? explicitHidden : !Boolean(currentData.isHidden);

    await listingRef.update({
      isHidden: newHidden,
      hiddenBy: newHidden ? auth.uid : null,
      hiddenAt: newHidden ? FieldValue.serverTimestamp() : null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    logAdminAction({
      action: 'toggleHideListingAsAdmin',
      by: auth.uid,
      target: listingId,
      details: {
        title: currentData.title || null,
        authorUid: currentData.authorUid || currentData.userId || null,
        isHidden: newHidden,
      },
      status: 'success',
    });

    return {
      success: true,
      listingId,
      isHidden: newHidden,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logAdminAction({
      action: 'toggleHideListingAsAdmin',
      by: auth.uid,
      target: listingId,
      status: 'failure',
      error: errorMsg,
    });
    throw err;
  }
}
