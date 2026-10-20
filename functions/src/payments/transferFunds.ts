import { Firestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { stripeProvider, TransferFundsResult } from './providers';
import { structLog } from '../utils/logger';

export interface TransferFundsData {
  amount: number;
  destinationAccountId: string;
  currency?: string;
  description?: string;
  dealId?: string;
  sourceTransaction?: string;
  metadata?: Record<string, string>;
}

export async function handleTransferFunds(
  request: CallableRequest<TransferFundsData>,
  _db: Firestore
): Promise<TransferFundsResult> {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Authentification requise pour effectuer un virement.');
  }

  const data = request.data || {};
  const numAmount = Number(data.amount);

  if (isNaN(numAmount) || numAmount <= 0) {
    throw new HttpsError('invalid-argument', 'Le montant du virement doit être strictement supérieur à zéro.');
  }

  if (!data.destinationAccountId || typeof data.destinationAccountId !== 'string') {
    throw new HttpsError('invalid-argument', 'L\'identifiant du compte de destination (destinationAccountId) est requis.');
  }

  const result = await stripeProvider.transferFunds({
    amount: numAmount,
    destinationAccountId: data.destinationAccountId,
    currency: data.currency || 'EUR',
    description: data.description || `Virement escrow TROCO deal ${data.dealId || ''}`,
    sourceTransaction: data.sourceTransaction,
    metadata: {
      ...(data.metadata || {}),
      initiatorUid: uid,
      dealId: data.dealId || '',
    },
  });

  await structLog('transferFunds', {
    uid,
    transferId: result.transferId,
    amount: numAmount,
    destination: data.destinationAccountId,
    currency: result.currency,
    isRealStripe: stripeProvider.isConfigured(),
  });

  return result;
}
