import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, runTransaction, serverTimestamp, increment, collection } from 'firebase/firestore';
import { db, auth, functions } from '../firebase';
import { generateUUID } from '../utils/uuid';

/**
 * Wallet Service calling Cloud Function transferAtomically or Firestore runTransaction fallback.
 * Unifies all peer-to-peer balance operations (calls, deals, tokens).
 */
export const walletService = {
  /**
   * Transfers cash or tokens atomically between users.
   */
  async transferAtomically({
    receiverUid,
    senderUid = null,
    currency = 'tokens', // 'tokens' | 'EUR'
    amount,
    type = 'token_transfer', // 'call_tokens' | 'deal' | 'tip'
    metadata = {},
    idempotencyKey = generateUUID(),
  }) {
    // 1. Force impérativement le parsing du montant avec Number(amount)
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Montant invalide pour la transaction');
    }

    const resolvedSenderUid = String(senderUid || auth?.currentUser?.uid || '').trim();
    const resolvedReceiverUid = String(receiverUid || '').trim();

    if (!resolvedSenderUid) {
      throw new Error('Expéditeur non authentifié');
    }
    if (!resolvedReceiverUid) {
      throw new Error('Destinataire introuvable pour ce transfert');
    }
    if (resolvedSenderUid === resolvedReceiverUid) {
      throw new Error('Impossible de transférer des jetons à soi-même');
    }

    if (!db) {
      throw new Error('Base de données Firestore non initialisée');
    }

    // 2. Vérifie strictement que senderRef et receiverRef sont valides avant d'appeler runTransaction
    const senderRef = doc(db, 'users', resolvedSenderUid);
    const receiverRef = doc(db, 'users', resolvedReceiverUid);

    if (!senderRef || !receiverRef || !senderRef.id || !receiverRef.id) {
      throw new Error('Références utilisateur senderRef ou receiverRef invalides');
    }

    // 3. Tenter la Cloud Function si disponible
    try {
      if (functions) {
        const fn = httpsCallable(functions, 'transferAtomically');
        const response = await fn({
          idempotencyKey,
          receiverUid: resolvedReceiverUid,
          currency,
          amount: Number(parsedAmount),
          type,
          metadata,
        });
        if (response?.data) return response.data;
      }
    } catch (cfErr) {
      console.warn('[walletService] Cloud Function unavailable/failed, executing Firestore runTransaction fallback:', cfErr);
    }

    // 4. Transaction Firestore atomique native (runTransaction)
    return await runTransaction(db, async (transaction) => {
      const [senderSnap, receiverSnap] = await Promise.all([
        transaction.get(senderRef),
        transaction.get(receiverRef),
      ]);

      if (!senderSnap.exists()) {
        throw new Error('Compte expéditeur introuvable');
      }

      const senderData = senderSnap.data() || {};
      const balanceField = currency === 'EUR' ? 'euroBalance' : 'trocoTokens';
      const currentBalance = Number(senderData[balanceField] || 0);

      if (currentBalance < parsedAmount) {
        throw new Error('Solde insuffisant pour effectuer ce transfert');
      }

      const newSenderBalance = Math.max(0, currentBalance - parsedAmount);

      transaction.update(senderRef, {
        [balanceField]: increment(-Number(parsedAmount)),
        updatedAt: serverTimestamp(),
      });

      if (receiverSnap.exists()) {
        transaction.update(receiverRef, {
          [balanceField]: increment(Number(parsedAmount)),
          updatedAt: serverTimestamp(),
        });
      } else {
        transaction.set(receiverRef, {
          [balanceField]: Number(parsedAmount),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      // Notification de traçabilité destinataire
      const notifRef = doc(collection(db, 'users', resolvedReceiverUid, 'notifications'));
      transaction.set(notifRef, {
        type: 'tokens_received',
        amount: Number(parsedAmount),
        currency,
        from: resolvedSenderUid,
        metadata,
        read: false,
        timestamp: serverTimestamp(),
      });

      return {
        success: true,
        newSenderTokens: currency === 'tokens' ? newSenderBalance : Number(senderData.trocoTokens || 0),
        newSenderEuro: currency === 'EUR' ? newSenderBalance : Number(senderData.euroBalance || 0),
      };
    });
  },

  /**
   * Fetches latest user balances from Firestore
   */
  async getBalance(uid) {
    if (!uid || !db) return { euroBalance: 0, trocoTokens: 0 };
    const userSnap = await getDoc(doc(db, 'users', String(uid)));
    if (!userSnap.exists()) return { euroBalance: 0, trocoTokens: 0 };
    const data = userSnap.data();
    return {
      euroBalance: Number(data.euroBalance) || 0,
      trocoTokens: Number(data.trocoTokens) || 0,
    };
  },
};
