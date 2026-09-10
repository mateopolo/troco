import { Firestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { checkIdempotency } from './idempotency';
import { getProvider } from './providers';
import { structLog } from '../utils/logger';

export interface ApplyPaymentData {
  paymentIntentId: string;
  mode?: string;
  metadata?: Record<string, unknown>;
}

export interface ApplyPaymentResponse {
  success: boolean;
  newEuroBalance: number;
  newTrocoTokens: number;
  transactionId: string;
}

export async function handleApplyPayment(
  request: CallableRequest<ApplyPaymentData>,
  db: Firestore
): Promise<ApplyPaymentResponse> {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Authentification requise pour valider un paiement.');
  }

  const { paymentIntentId, mode = 'topup', metadata = {} } = request.data || {};
  if (!paymentIntentId || typeof paymentIntentId !== 'string') {
    throw new HttpsError('invalid-argument', 'L\'identifiant de paiement (paymentIntentId) est requis.');
  }

  // 1. Contrôle strict d'idempotence (évite tout double crédit)
  const existingResult = await checkIdempotency<ApplyPaymentResponse>(paymentIntentId, db);
  if (existingResult) {
    return existingResult;
  }

  // 2. Vérification auprès du prestataire de paiement (Mock ou Stripe)
  const provider = getProvider();
  const payment = await provider.verifyPayment(paymentIntentId, db);

  if (!payment || payment.status !== 'succeeded') {
    throw new HttpsError(
      'failed-precondition',
      'Le paiement n\'a pas été validé ou a échoué auprès du prestataire.'
    );
  }

  // 3. Transaction Firestore atomique (mise à jour du solde et traçabilité)
  const result = await db.runTransaction(async (tx) => {
    const userRef = db.doc(`users/${uid}`);
    const userSnap = await tx.get(userRef);

    if (!userSnap.exists) {
      throw new HttpsError('not-found', 'Profil utilisateur introuvable.');
    }

    const userData = userSnap.data() || {};
    const curEuro = Number(userData.euroBalance || 0);
    const curTokens = Number(userData.trocoTokens || 0);

    let newEuro = curEuro;
    let newTokens = curTokens;

    if (payment.currency === 'EUR') {
      newEuro = Number((curEuro + payment.amount).toFixed(2));
    } else if (payment.currency === 'TOKENS') {
      newTokens = curTokens + payment.amount;
    }

    // Mise à jour sécurisée du solde utilisateur
    tx.update(userRef, {
      euroBalance: newEuro,
      trocoTokens: newTokens,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Enregistrement de la transaction financière
    const txRef = db.collection('transactions').doc();
    tx.set(txRef, {
      type: mode,
      userId: uid,
      amountTtc: payment.amount,
      currency: payment.currency,
      paymentProvider: provider.name,
      paymentIntentId,
      status: 'completed',
      metadata: metadata || {},
      createdAt: FieldValue.serverTimestamp(),
    });

    // Enregistrement de la clé d'idempotence dans la transaction (TTL 24h)
    const idempotencyPayload: ApplyPaymentResponse = {
      success: true,
      newEuroBalance: newEuro,
      newTrocoTokens: newTokens,
      transactionId: txRef.id,
    };

    const idemRef = db.doc(`idempotency_keys/${paymentIntentId}`);
    tx.set(idemRef, {
      result: idempotencyPayload,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
    });

    return idempotencyPayload;
  });

  // Journalisation d'audit Cloud Logging
  await structLog('applyPayment', {
    uid,
    paymentIntentId,
    amount: payment.amount,
    currency: payment.currency,
    provider: provider.name,
    transactionId: result.transactionId,
  });

  return result;
}
