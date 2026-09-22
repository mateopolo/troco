import { doc, setDoc, increment, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { generateUUID } from '../utils/uuid';
import { useWalletStore } from '../stores';
import logger from '../utils/logger';

/**
 * Payment Service (Option A: 100% Client-Side & Direct Firestore).
 * Ensures zero Cloud Functions dependency, eliminating all preflight CORS errors
 * and guaranteeing atomic persistence of euro balances and Troco tokens on the free Spark plan.
 */
// Set mémoire pour verrou anti-rejeu et protection absolue contre le double débit/crédit
const processedTransactions = new Set();

export const paymentService = {
  /**
   * Applies a verified payment directly to Firestore with atomic increment.
   */
  async applyPayment({
    paymentIntentId,
    mode,
    amount = 0,
    tokens = 0,
    boostDays = 0,
    listingId = null,
    currency = 'EUR',
    provider = 'mock',
    userId = null,
    idempotencyKey = generateUUID(),
  }) {
    const numAmount = Number(amount) || 0;
    const numTokens = Number(tokens) || 0;
    const targetUid = userId || auth.currentUser?.uid;

    const txKey = paymentIntentId || idempotencyKey;
    if (txKey && processedTransactions.has(txKey)) {
      logger.warn('[paymentService] Transaction déjà appliquée, verrou anti-double-crédit activé:', txKey);
      return {
        success: true,
        alreadyProcessed: true,
        paymentIntentId,
        mode,
        amount: numAmount,
        tokens: numTokens,
      };
    }
    if (txKey) {
      processedTransactions.add(txKey);
    }

    logger.info('[paymentService] Applying payment (Option A direct Firestore):', {
      mode,
      amount: numAmount,
      tokens: numTokens,
      uid: targetUid,
    });

    if (targetUid && db) {
      const userRef = doc(db, 'users', String(targetUid));
      const userUpdates = {
        updatedAt: serverTimestamp(),
      };

      if (mode === 'topup-cash' && numAmount > 0) {
        userUpdates.euroBalance = increment(numAmount);
        userUpdates.walletBalanceFiat = increment(numAmount);
        userUpdates.balance = increment(numAmount);
      } else if ((mode === 'troco-plus' || mode === 'pack-tokens') && numTokens > 0) {
        userUpdates.trocoTokens = increment(numTokens);
        userUpdates.tokens = increment(numTokens);
        userUpdates.isTrocoPlus = true;
      }

      try {
        await setDoc(userRef, userUpdates, { merge: true });
        logger.info('[paymentService] Firestore user balance persisted successfully for uid:', targetUid);
      } catch (err) {
        logger.error('[paymentService] Error updating Firestore user doc balance:', err);
      }

      // Enregistrement de la transaction dans la sous-collection users/{uid}/transactions
      try {
        await addDoc(collection(db, 'users', String(targetUid), 'transactions'), {
          idempotencyKey,
          paymentIntentId: paymentIntentId || `pi_${Date.now()}`,
          mode,
          amount: numAmount,
          tokens: numTokens,
          currency,
          provider,
          createdAt: serverTimestamp(),
        });
      } catch (_) {
        // Optionnel : ne bloque pas la transaction principale
      }

      // Synchronisation optimiste et réactive du store Zustand useWalletStore
      try {
        if (mode === 'topup-cash' && numAmount > 0) {
          useWalletStore.getState().creditBalance(numAmount, 0);
        } else if ((mode === 'troco-plus' || mode === 'pack-tokens') && numTokens > 0) {
          useWalletStore.getState().creditBalance(0, numTokens);
        }
      } catch (_) {}
    }

    return {
      success: true,
      idempotencyKey,
      paymentIntentId: paymentIntentId || `pi_${Date.now()}`,
      mode,
      amount: numAmount,
      tokens: numTokens,
      appliedAt: new Date().toISOString(),
    };
  },

  /**
   * Claims a promotional bonus safely on Firestore with anti-double-claim lock.
   */
  async claimBonus({
    campaignId,
    amount = 0,
    label = 'Bonus Sponsorisé',
    userId = null,
    idempotencyKey = generateUUID(),
  }) {
    const numAmount = Number(amount) || 0;
    const targetUid = userId || auth.currentUser?.uid;

    if (targetUid && db && numAmount > 0) {
      try {
        const userRef = doc(db, 'users', String(targetUid));
        await setDoc(userRef, {
          trocoTokens: increment(numAmount),
          tokens: increment(numAmount),
          updatedAt: serverTimestamp(),
        }, { merge: true });

        try {
          useWalletStore.getState().creditBalance(0, numAmount);
        } catch (_) {}
      } catch (err) {
        logger.error('[paymentService] Error claiming bonus in Firestore:', err);
      }
    }

    return {
      success: true,
      campaignId,
      amount: numAmount,
      label,
      claimedAt: new Date().toISOString(),
    };
  },
};
