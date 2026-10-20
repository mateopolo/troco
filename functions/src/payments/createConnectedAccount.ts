import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { stripeProvider, CreateConnectedAccountResult } from './providers';
import { structLog } from '../utils/logger';

export interface CreateConnectedAccountData {
  email?: string;
  country?: string;
  businessType?: 'individual' | 'company';
  refreshUrl?: string;
  returnUrl?: string;
  metadata?: Record<string, string>;
}

export async function handleCreateConnectedAccount(
  request: CallableRequest<CreateConnectedAccountData>,
  db: Firestore
): Promise<CreateConnectedAccountResult> {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Authentification requise pour configurer Stripe Connect.');
  }

  const data = request.data || {};
  const email = data.email || request.auth?.token.email;

  const result = await stripeProvider.createConnectedAccount({
    userId: uid,
    email,
    country: data.country || 'FR',
    businessType: data.businessType || 'individual',
    refreshUrl: data.refreshUrl,
    returnUrl: data.returnUrl,
    metadata: data.metadata,
  });

  // Persistance de l'ID de compte connecté sur le document utilisateur Firestore
  try {
    const userRef = db.doc(`users/${uid}`);
    await userRef.set(
      {
        stripeConnectedAccountId: result.accountId,
        stripeOnboardingComplete: Boolean(result.detailsSubmitted),
        stripePayoutsEnabled: Boolean(result.payoutsEnabled),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err: any) {
    console.warn(`[createConnectedAccount] Could not update user doc for ${uid}:`, err.message);
  }

  await structLog('createConnectedAccount', {
    uid,
    accountId: result.accountId,
    hasOnboardingUrl: Boolean(result.onboardingUrl),
    isRealStripe: stripeProvider.isConfigured(),
  });

  return result;
}
