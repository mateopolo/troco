import {
  collection,
  doc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * ==============================================================================
 * FIRESTORE SERVICE — ENTERPRISE DATA ACCESS LAYER (DAL)
 * ==============================================================================
 * Centralise tous les appels Firestore avec validation de type, gestion d'erreurs
 * atomique et désabonnements propres pour éliminer les fuites mémoire.
 */

// ------------------------------------------------------------------------------
// 1. GESTION DES ANNONCES (LISTINGS)
// ------------------------------------------------------------------------------

/**
 * Écoute en temps réel les annonces Firestore
 * @param {Function} onUpdate Callback avec les annonces formatées
 * @param {Function} onError Callback en cas d'erreur
 * @returns {Function} Fonction de désabonnement propre (unsubscribe)
 */
export const subscribeToListings = (onUpdate, onError) => {
  try {
    const q = query(collection(db, 'listings'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      onUpdate(items);
    }, (error) => {
      console.warn('[FirestoreService] subscribeToListings error:', error);
      if (onError) onError(error);
    });
  } catch (err) {
    console.warn('[FirestoreService] subscribeToListings setup failed:', err);
    return () => {};
  }
};

/**
 * Crée une nouvelle annonce dans Firestore
 */
export const createListing = async (listingData) => {
  try {
    const docRef = await addDoc(collection(db, 'listings'), {
      ...listingData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('[FirestoreService] createListing error:', error);
    return { success: false, error };
  }
};

/**
 * Supprime une annonce
 */
export const deleteListing = async (listingId) => {
  try {
    await deleteDoc(doc(db, 'listings', String(listingId)));
    return { success: true };
  } catch (error) {
    console.error('[FirestoreService] deleteListing error:', error);
    return { success: false, error };
  }
};

// ------------------------------------------------------------------------------
// 2. GESTION DES DISCUSSIONS & MESSAGES (CHATS)
// ------------------------------------------------------------------------------

/**
 * Écoute les discussions de l'utilisateur connecté
 */
export const subscribeToUserChats = (userName, onUpdate, onError) => {
  if (!userName || typeof userName !== 'string') return () => {};
  try {
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userName.trim())
    );
    return onSnapshot(q, (snapshot) => {
      const chats = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      onUpdate(chats);
    }, (error) => {
      console.warn('[FirestoreService] subscribeToUserChats error:', error);
      if (onError) onError(error);
    });
  } catch (err) {
    console.warn('[FirestoreService] subscribeToUserChats setup failed:', err);
    return () => {};
  }
};

/**
 * Écoute les messages d'une discussion spécifique
 */
export const subscribeToChatMessages = (chatId, onUpdate, onError) => {
  if (!chatId) return () => {};
  try {
    const q = query(
      collection(db, 'chats', String(chatId), 'messages'),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      onUpdate(messages);
    }, (error) => {
      console.warn('[FirestoreService] subscribeToChatMessages error:', error);
      if (onError) onError(error);
    });
  } catch (err) {
    console.warn('[FirestoreService] subscribeToChatMessages setup failed:', err);
    return () => {};
  }
};

/**
 * Envoie un message dans un chat Firestore
 */
export const sendChatMessage = async (chatId, messageData) => {
  if (!chatId || !messageData) return { success: false };
  try {
    const messagesRef = collection(db, 'chats', String(chatId), 'messages');
    const docRef = await addDoc(messagesRef, {
      ...messageData,
      createdAt: serverTimestamp(),
    });

    // Mise à jour de l'aperçu du chat
    const chatDocRef = doc(db, 'chats', String(chatId));
    await setDoc(chatDocRef, {
      lastMessage: messageData.text || 'Message',
      lastSenderName: messageData.senderName || 'Utilisateur',
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('[FirestoreService] sendChatMessage error:', error);
    return { success: false, error };
  }
};

// ------------------------------------------------------------------------------
// 3. NÉGOCIATION DE DEALS ET TRANSACTIONS ATOMIQUES
// ------------------------------------------------------------------------------

/**
 * Valide un deal et exécute le transfert de soldes de façon atomique
 */
export const executeDealTransaction = async ({
  chatId,
  dealId,
  buyerUid,
  sellerUid,
  euroAmount = 0,
  trocoTokens = 0,
}) => {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. Mise à jour de l'état du deal dans le chat
      const msgRef = doc(db, 'chats', String(chatId), 'messages', String(dealId));
      transaction.update(msgRef, {
        status: 'confirmed',
        updatedAt: serverTimestamp(),
      });

      // 2. Transfert de solde si les UIDs sont présents
      if (buyerUid && sellerUid) {
        const buyerRef = doc(db, 'users', String(buyerUid));
        const sellerRef = doc(db, 'users', String(sellerUid));

        const buyerDoc = await transaction.get(buyerRef);
        const sellerDoc = await transaction.get(sellerRef);

        if (buyerDoc.exists() && sellerDoc.exists()) {
          const buyerData = buyerDoc.data();
          const sellerData = sellerDoc.data();

          const newBuyerTokens = Math.max(0, (buyerData.trocoTokens || 0) - trocoTokens);
          const newBuyerEuro = Math.max(0, (buyerData.euroBalance || 0) - euroAmount);
          const newSellerTokens = (sellerData.trocoTokens || 0) + trocoTokens;
          const newSellerEuro = (sellerData.euroBalance || 0) + euroAmount;

          transaction.update(buyerRef, {
            trocoTokens: newBuyerTokens,
            euroBalance: newBuyerEuro,
            updatedAt: serverTimestamp(),
          });

          transaction.update(sellerRef, {
            trocoTokens: newSellerTokens,
            euroBalance: newSellerEuro,
            updatedAt: serverTimestamp(),
          });
        }
      }
    });

    return { success: true };
  } catch (error) {
    console.error('[FirestoreService] executeDealTransaction error:', error);
    return { success: false, error };
  }
};

/**
 * Libère les fonds sous séquestre au profit du prestataire
 */
export const releaseEscrowTransaction = async ({
  chatId,
  dealId,
  buyerUid,
  sellerUid,
  euroAmount = 0,
  trocoTokens = 0,
}) => {
  try {
    await runTransaction(db, async (transaction) => {
      const msgRef = doc(db, 'chats', String(chatId), 'messages', String(dealId));
      transaction.update(msgRef, {
        status: 'confirmed',
        'escrow.status': 'released',
        releasedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (sellerUid) {
        const sellerRef = doc(db, 'users', String(sellerUid));
        const sellerDoc = await transaction.get(sellerRef);
        if (sellerDoc.exists()) {
          const sellerData = sellerDoc.data();
          transaction.update(sellerRef, {
            trocoTokens: (sellerData.trocoTokens || 0) + trocoTokens,
            euroBalance: Number(((sellerData.euroBalance || 0) + euroAmount).toFixed(2)),
            dealsCompleted: (sellerData.dealsCompleted || 0) + 1,
            updatedAt: serverTimestamp(),
          });
        }
      }

      if (buyerUid) {
        const buyerRef = doc(db, 'users', String(buyerUid));
        const buyerDoc = await transaction.get(buyerRef);
        if (buyerDoc.exists()) {
          transaction.update(buyerRef, {
            dealsCompleted: (buyerDoc.data().dealsCompleted || 0) + 1,
            updatedAt: serverTimestamp(),
          });
        }
      }
    });

    return { success: true };
  } catch (error) {
    console.error('[FirestoreService] releaseEscrowTransaction error:', error);
    return { success: false, error };
  }
};

// ------------------------------------------------------------------------------
// 4. STATUT EN LIGNE (PRESENCE) & FRAPPE (TYPING)
// ------------------------------------------------------------------------------

/**
 * Met à jour l'indicateur de frappe dans un chat
 */
export const setChatTypingStatus = async (chatId, userName, isTyping) => {
  if (!chatId || !userName) return;
  try {
    const typingRef = doc(db, 'chats', String(chatId), 'typing', userName.trim());
    if (isTyping) {
      await setDoc(typingRef, { isTyping: true, updatedAt: serverTimestamp() });
    } else {
      await deleteDoc(typingRef);
    }
  } catch (e) {
    // Silencieux
  }
};

/**
 * Écoute si l'interlocuteur est en train d'écrire
 */
export const subscribeToTyping = (chatId, currentUserName, onTypingChange) => {
  if (!chatId || !currentUserName) return () => {};
  try {
    const typingCollRef = collection(db, 'chats', String(chatId), 'typing');
    return onSnapshot(typingCollRef, (snapshot) => {
      const otherTyping = snapshot.docs.some(
        d => d.id !== currentUserName.trim() && d.data()?.isTyping
      );
      onTypingChange(otherTyping);
    }, () => onTypingChange(false));
  } catch (e) {
    return () => {};
  }
};

// ------------------------------------------------------------------------------
// 5. TRANSFERTS DIRECTS DE JETONS TROCO
// ------------------------------------------------------------------------------

/**
 * Exécute un transfert direct de jetons de façon atomique (débit expéditeur + crédit destinataire)
 */
export const executeDirectTokenTransfer = async ({
  senderUid,
  senderName,
  recipientUid,
  recipientName,
  chatId,
  tokenAmount = 1,
  comment = '',
}) => {
  if (!senderUid || tokenAmount <= 0) {
    return { success: false, error: 'Paramètres invalides pour le transfert.' };
  }

  try {
    let targetRecipientUid = recipientUid;

    // Si recipientUid n'est pas fourni mais qu'on a le nom, recherche dans la collection 'users'
    if (!targetRecipientUid && recipientName && db) {
      try {
        const uQuery = query(collection(db, 'users'), where('name', '==', recipientName), limit(1));
        const uSnap = await getDocs(uQuery);
        if (!uSnap.empty) {
          targetRecipientUid = uSnap.docs[0].id;
        }
      } catch (_) {}
    }

    await runTransaction(db, async (transaction) => {
      // 1. Débit Expéditeur
      const senderRef = doc(db, 'users', String(senderUid));
      const senderDoc = await transaction.get(senderRef);
      if (senderDoc.exists()) {
        const senderData = senderDoc.data();
        const currentSenderTokens = Number(senderData.trocoTokens || 0);
        const newSenderTokens = Math.max(0, currentSenderTokens - tokenAmount);
        transaction.update(senderRef, {
          trocoTokens: newSenderTokens,
          updatedAt: serverTimestamp(),
        });
      }

      // 2. Crédit Destinataire
      if (targetRecipientUid) {
        const recipientRef = doc(db, 'users', String(targetRecipientUid));
        const recipientDoc = await transaction.get(recipientRef);
        if (recipientDoc.exists()) {
          const recipientData = recipientDoc.data();
          const currentRecipientTokens = Number(recipientData.trocoTokens || 0);
          transaction.update(recipientRef, {
            trocoTokens: currentRecipientTokens + tokenAmount,
            updatedAt: serverTimestamp(),
          });
        } else {
          transaction.set(recipientRef, {
            name: recipientName || 'Utilisateur Troco',
            trocoTokens: tokenAmount,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      }
    });

    // 3. Messages et enregistrement de transaction
    if (chatId && db) {
      const transferText = `🪙 ${senderName || 'Moi'} a envoyé ${tokenAmount} Jeton${tokenAmount > 1 ? 's' : ''} Troco à ${recipientName || 'Interlocuteur'}${comment ? ` (« ${comment} »)` : ''} !`;
      await addDoc(collection(db, 'chats', String(chatId), 'messages'), {
        text: transferText,
        type: 'token_transfer',
        tokenAmount: tokenAmount,
        transferComment: comment || '',
        sender: senderUid,
        senderName: senderName || 'Moi',
        recipientUid: targetRecipientUid || '',
        recipientName: recipientName || '',
        timestamp: serverTimestamp(),
        createdAt: Date.now(),
      });

      await setDoc(doc(db, 'chats', String(chatId)), {
        lastMessage: transferText,
        lastMessageTimestamp: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }

    if (db) {
      await addDoc(collection(db, 'transactions'), {
        type: 'token_transfer',
        senderUid: senderUid,
        senderName: senderName,
        recipientUid: targetRecipientUid || '',
        recipientName: recipientName || '',
        tokens: tokenAmount,
        comment: comment || '',
        createdAt: serverTimestamp(),
      });
    }

    return { success: true, targetRecipientUid };
  } catch (error) {
    console.error('[FirestoreService] executeDirectTokenTransfer error:', error);
    return { success: false, error };
  }
};

