import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { generateUUID } from '../utils/uuid';

/**
 * Payment Service calling Cloud Functions applyPayment and claimBonus.
 * Never performs direct client-side balance mutations.
 */
export const paymentService = {
  /**
   * Applies a verified payment on the backend.
   */
  async applyPayment({
    paymentIntentId,
    mode,
    amount,
    tokens,
    boostDays,
    listingId,
    currency = 'EUR',
    provider = 'mock',
    idempotencyKey = generateUUID(),
  }) {
    const fn = httpsCallable(functions, 'applyPayment');
    const response = await fn({
      idempotencyKey,
      paymentIntentId,
      mode,
      amount: Number(amount) || 0,
      tokens: Number(tokens) || 0,
      boostDays: Number(boostDays) || 0,
      listingId: listingId ? String(listingId) : null,
      currency,
      provider,
    });
    return response.data;
  },

  /**
   * Claims a promotional bonus safely on the backend with anti-double-claim lock.
   */
  async claimBonus({
    campaignId,
    amount,
    label = 'Bonus Sponsorisé',
    idempotencyKey = generateUUID(),
  }) {
    const fn = httpsCallable(functions, 'claimBonus');
    const response = await fn({
      idempotencyKey,
      campaignId,
      amount: Number(amount) || 0,
      label,
    });
    return response.data;
  },
};
