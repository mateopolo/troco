import { doc, collection, runTransaction, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Deal Service - Moteur transactionnel atomique unifié
 * Centralise TOUS les transferts de jetons/euros entre utilisateurs
 * avec gestion de deal, chat, notifications et traçabilité.
 * 
 * @critical NE PAS MODIFIER cette logique - intégrité financière dépend de runTransaction
 */

export const dealService = {
  /**
   * Transfère des jetons et/ou euros de manière atomique entre deux utilisateurs
   * dans le contexte d'un deal.
   * 
   * @param {Object} params
   * @param {string} params.fromUid - UID de l'expéditeur (sera débité)
   * @param {string} params.toUid - UID du destinataire (sera crédité)
   * @param {number} params.tokens - Montant en jetons Troco à transférer
   * @param {number} params.euros - Montant en euros à transférer
   * @param {string} [params.method='deal'] - Type de transaction ('deal', 'call_tokens', 'token_transfer', etc.)
   * @param {string} [params.dealId] - ID du message deal dans la collection messages
   * @param {string} [params.chatId] - ID du chat parent
   * @param {Object} [params.notifPayload] - Payload additionnel pour la notification
   * @param {Object} [params.metadata] - Métadonnées supplémentaires (partnerName, terms, etc.)
   * @returns {Promise<{success: boolean, error?: Error, newSenderTokens?: number, newSenderEuro?: number}>}
   */
  async transferTokensAtomically({
    fromUid,
    toUid,
    tokens = 0,
    euros = 0,
    method = 'deal',
    dealId,
    chatId,
    notifPayload = {},
    metadata = {},
  }) {
    const finalTokens = Number(tokens) || 0;
    const finalEuros = Number(euros) || 0;

    // Normalisation des UIDs
    const normalizedFromUid = String(fromUid || '').trim();
    const normalizedToUid = String(toUid || '').trim();

    // Validation critique : pas de transfert vers soi-même
    if (!normalizedFromUid || !normalizedToUid) {
      throw new Error('Expéditeur et destinataire sont obligatoires pour la transaction.');
    }

    if (normalizedFromUid === normalizedToUid) {
      throw new Error('Impossible de transférer des fonds à soi-même.');
    }

    // Validation critique : au moins un montant doit être > 0
    if (finalTokens <= 0 && finalEuros <= 0) {
      throw new Error('Montant invalide : au moins un montant (jetons ou euros) doit être positif.');
    }

    // Vérification que db est disponible
    if (!db) {
      throw new Error('Base de données Firestore non initialisée.');
    }

    // Variables pour stocker les nouveaux soldes (seront remplies dans la transaction)
    let resultNewSenderTokens = 0;
    let resultNewSenderEuro = 0;

    // Exécution atomique unique
    try {
      await runTransaction(db, async (transaction) => {
        // 1. RÉFÉRENCES FIRESTORE (toutes les refs sont créées AVANT les gets)
        const fromRef = doc(db, 'users', normalizedFromUid);
        const toRef = doc(db, 'users', normalizedToUid);
        const dealMsgRef = dealId && chatId ? doc(db, 'chats', String(chatId), 'messages', String(dealId)) : null;
        const chatRef = chatId ? doc(db, 'chats', String(chatId)) : null;

        // 2. LECTURES ATOMIQUES (tous les gets en parallèle)
        const [fromDoc, toDoc, dealMsgDoc] = await Promise.all([
          transaction.get(fromRef),
          transaction.get(toRef),
          dealMsgRef ? transaction.get(dealMsgRef) : Promise.resolve(null),
        ]);

        // 3. VALIDATION DE L'EXISTENCE DES UTILISATEURS
        if (!fromDoc.exists()) {
          throw new Error(`Profil expéditeur (${normalizedFromUid}) introuvable.`);
        }

        if (!toDoc.exists()) {
          throw new Error(`Profil destinataire (${normalizedToUid}) introuvable.`);
        }

        // 4. VÉRIFICATION DE SOLVABILITÉ (AVANT tout écriture)
        const fromData = fromDoc.data() || {};
        const toData = toDoc.data() || {};

        const currentFromTokens = Number(fromData.trocoTokens || 0);
        const currentFromEuros = Number(fromData.euroBalance || fromData.walletBalanceFiat || 0);
        const currentToEuros = Number(toData.euroBalance || toData.walletBalanceFiat || 0);
        const currentFromDeals = Number(fromData.dealsCompleted || 0);
        const currentToDeals = Number(toData.dealsCompleted || 0);

        // Vérification solvabilité tokens
        if (finalTokens > 0 && currentFromTokens < finalTokens) {
          throw new Error(`Solde de jetons insuffisant (${currentFromTokens} disponible(s), ${finalTokens} requis).`);
        }

        // Vérification solvabilité euros
        if (finalEuros > 0 && currentFromEuros < finalEuros) {
          throw new Error(`Solde d'euros insuffisant (${currentFromEuros.toFixed(2)}€ disponible(s), ${finalEuros.toFixed(2)}€ requis).`);
        }

        // 5. CALCUL DES NOUVEAUX SOLDES
        resultNewSenderTokens = Math.max(0, currentFromTokens - finalTokens);
        resultNewSenderEuro = Math.max(0, currentFromEuros - finalEuros);
        const newToEuros = currentToEuros + finalEuros;

        // 6. ÉCRITURES ATOMIQUES (toutes les writes après toutes les reads)

        // 6a. Débit expéditeur (toujours avec increment pour atomicité)
        transaction.update(fromRef, {
          trocoTokens: increment(-finalTokens),
          euroBalance: Number(resultNewSenderEuro.toFixed(2)),
          walletBalanceFiat: Number(resultNewSenderEuro.toFixed(2)),
          dealsCompleted: currentFromDeals + 1,
          updatedAt: serverTimestamp(),
        });

        // 6b. Crédit destinataire (toujours avec increment pour atomicité)
        transaction.update(toRef, {
          trocoTokens: increment(finalTokens),
          euroBalance: Number(newToEuros.toFixed(2)),
          walletBalanceFiat: Number(newToEuros.toFixed(2)),
          dealsCompleted: currentToDeals + 1,
          updatedAt: serverTimestamp(),
        });

        // 6c. Mise à jour du message deal si dealId et chatId fournis
        if (dealMsgRef && dealMsgDoc) {
          transaction.update(dealMsgRef, {
            status: 'confirmed',
            updatedAt: serverTimestamp(),
          });
        }

        // 6d. Mise à jour du chat parent si chatId fourni
        if (chatRef) {
          transaction.set(chatRef, {
            lastDealStatus: 'confirmed',
            lastMessage: `🤝 Deal validé ! ${finalTokens > 0 ? `${finalTokens}🪙 ` : ''}${finalEuros > 0 ? `${finalEuros}€` : ''}`,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }

        // 6e. Création transaction débit (traçabilité)
        const txDebitRef = doc(collection(db, 'transactions'));
        transaction.set(txDebitRef, {
          type: method || 'deal',
          mode: 'debit',
          userId: normalizedFromUid,
          userName: fromData.name || metadata.partnerName || 'Utilisateur',
          partnerUid: normalizedToUid,
          partnerName: toData.name || metadata.partnerName || 'Partenaire',
          tokens: finalTokens,
          amount: finalEuros,
          currency: finalTokens > 0 ? 'tokens' : 'EUR',
          status: 'completed',
          metadata: {
            ...metadata,
            chatId,
            dealId,
            method,
          },
          createdAt: serverTimestamp(),
        });

        // 6f. Création transaction crédit (traçabilité)
        const txCreditRef = doc(collection(db, 'transactions'));
        transaction.set(txCreditRef, {
          type: method || 'deal',
          mode: 'credit',
          userId: normalizedToUid,
          userName: toData.name || metadata.partnerName || 'Partenaire',
          partnerUid: normalizedFromUid,
          partnerName: fromData.name || metadata.partnerName || 'Utilisateur',
          tokens: finalTokens,
          amount: finalEuros,
          currency: finalTokens > 0 ? 'tokens' : 'EUR',
          status: 'completed',
          metadata: {
            ...metadata,
            chatId,
            dealId,
            method,
          },
          createdAt: serverTimestamp(),
        });

        // 6g. Notification temps réel pour le destinataire
        const notifRef = doc(collection(db, 'users', normalizedToUid, 'notifications'));
        transaction.set(notifRef, {
          type: 'payment_received',
          amount: finalTokens > 0 ? finalTokens : finalEuros,
          currency: finalTokens > 0 ? 'tokens' : 'EUR',
          from: normalizedFromUid,
          fromName: fromData.name || metadata.partnerName || 'Utilisateur',
          read: false,
          timestamp: serverTimestamp(),
          ...notifPayload,
        });
      });

      return {
        success: true,
        newSenderTokens: resultNewSenderTokens,
        newSenderEuro: resultNewSenderEuro,
      };
    } catch (error) {
      console.error('[dealService] transferTokensAtomically error:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },
};

export default dealService;
