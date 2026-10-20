import { Firestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { stripeProvider, CreatePaymentIntentResult } from './providers';
import { structLog } from '../utils/logger';

export interface CreatePaymentIntentData {
  amount: number;
  currency?: string;
  mode?: string;
  metadata?: Record<string, string>;
  customerEmail?: string;
  customerId?: string;
  connectedAccountId?: string;
  applicationFeeAmount?: number;
  description?: string;
  successUrl?: string;
  cancelUrl?: string;
  clientReferenceId?: string;
}

export async function handleCreatePaymentIntent(
  request: CallableRequest<CreatePaymentIntentData>,
  _db: Firestore
): Promise<CreatePaymentIntentResult> {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Authentification requise pour initier un paiement.');
  }

  const data = request.data || {};
  const numAmount = Number(data.amount);

  if (isNaN(numAmount) || numAmount <= 0) {
    throw new HttpsError('invalid-argument', 'Le montant spécifié doit être un nombre positif supérieur à zéro.');
  }

  const result = await stripeProvider.createPaymentIntent({
    amount: numAmount,
    currency: data.currency || 'EUR',
    mode: data.mode || 'topup-cash',
    metadata: {
      ...(data.metadata || {}),
      userId: uid,
    },
    customerEmail: data.customerEmail || request.auth?.token.email,
    customerId: data.customerId,
    connectedAccountId: data.connectedAccountId,
    applicationFeeAmount: data.applicationFeeAmount,
    description: data.description,
    successUrl: data.successUrl,
    cancelUrl: data.cancelUrl,
    clientReferenceId: data.clientReferenceId || uid,
  });

  await structLog('createPaymentIntent', {
    uid,
    amount: numAmount,
    currency: data.currency || 'EUR',
    mode: data.mode || 'topup-cash',
    paymentIntentId: result.paymentIntentId,
    sessionId: result.sessionId,
    isRealStripe: stripeProvider.isConfigured(),
  });

  return result;
}
