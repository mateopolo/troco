import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { functions } from '../firebase';
import { generateUUID } from '../utils/uuid';

/**
 * Wallet Service calling Cloud Function transferAtomically.
 * Unifies all peer-to-peer balance operations (calls, deals, tokens).
 */
export const walletService = {
  /**
   * Transfers cash or tokens atomically between users.
   */
  async transferAtomically({
    receiverUid,
    currency, // 'tokens' | 'EUR'
    amount,
    type, // 'call_tokens' | 'deal' | 'tip'
    metadata = {},
    idempotencyKey = generateUUID(),
  }) {
    const fn = httpsCallable(functions, 'transferAtomically');
    const response = await fn({
      idempotencyKey,
      receiverUid,
      currency,
      amount: Number(amount) || 0,
      type,
      metadata,
    });
    return response.data;
  },

  /**
   * Fetches latest user balances from Firestore
   */
  async getBalance(uid) {
    if (!uid) return { euroBalance: 0, trocoTokens: 0 };
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) return { euroBalance: 0, trocoTokens: 0 };
    const data = userSnap.data();
    return {
      euroBalance: Number(data.euroBalance) || 0,
      trocoTokens: Number(data.trocoTokens) || 0,
    };
  },
};
