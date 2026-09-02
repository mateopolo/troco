import {
  collection,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAt,
  endAt,
  startAfter,
  getDocs,
  getDoc,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  increment
} from 'firebase/firestore';
import { db } from '../firebase';
import { encodeGeohash, getGeohashQueryBounds } from '../utils/geohash';
import { calculateHaversineDistance } from '../utils/geocodingNominatim';

/**
 * ==============================================================================
 * FIRESTORE SERVICE — ENTERPRISE DATA ACCESS LAYER (DAL)
 * ==============================================================================
 * Centralise tous les appels Firestore avec validation de type, gestion d'erreurs
 * atomique et indexation spatiale Geohashing (startAt / endAt).
 */

// ------------------------------------------------------------------------------
// 1. GESTION DES ANNONCES (LISTINGS & REQUÊTES GÉOSPATIALES SERVEUR)
// ------------------------------------------------------------------------------

/**
 * Récupère une page d'annonces de manière paginée et optimisée (limit 20)
 * @param {Object} options
 * @param {number} options.pageSize Nombre d'annonces par page (défaut: 20)
 * @param {Object} options.lastDoc Dernier document Firestore (curseur startAfter)
 * @returns {Promise<{items: Array, lastVisible: Object|null, hasMore: boolean}>}
 */
export const fetchListingsPaginated = async ({ pageSize = 20, lastDoc = null } = {}) => {
  if (!db) return { items: [], lastVisible: null, hasMore: false };
  try {
    let q;
    if (lastDoc) {
      q = query(
        collection(db, 'listings'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(pageSize)
      );
    } else {
      q = query(
        collection(db, 'listings'),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );
    }

    const snapshot = await getDocs(q);
    const items = snapshot.docs.map((docSnap) => ({
      id: docSnap.data().id || docSnap.id,
      firestoreId: docSnap.id,
      ...docSnap.data(),
      status: docSnap.data().status || 'active',
      isDemo: false,
      _doc: docSnap,
    }));

    const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
    const hasMore = snapshot.docs.length === pageSize;

    return {
      items,
      lastVisible,
      hasMore,
    };
  } catch (error) {
    console.warn('[FirestoreService] fetchListingsPaginated with orderBy failed, falling back without orderBy:', error);
    try {
      let fallbackQuery;
      if (lastDoc) {
        fallbackQuery = query(collection(db, 'listings'), startAfter(lastDoc), limit(pageSize));
      } else {
        fallbackQuery = query(collection(db, 'listings'), limit(pageSize));
      }
      const snapshot = await getDocs(fallbackQuery);
      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.data().id || docSnap.id,
        firestoreId: docSnap.id,
        ...docSnap.data(),
        status: docSnap.data().status || 'active',
        isDemo: false,
        _doc: docSnap,
      }));
      return {
        items,
        lastVisible: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === pageSize,
      };
    } catch (fallbackErr) {
      console.error('[FirestoreService] fetchListingsPaginated fallback error:', fallbackErr);
      return { items: [], lastVisible: null, hasMore: false, error: fallbackErr };
    }
  }
};

/**
 * Requête spatiale optimisée par Geohash (startAt / endAt)
 * Récupère uniquement les annonces dans le périmètre géographique sans surcharger la bande passante.
 * @param {Object} options
 * @param {[number, number]} options.center Coordonnées [latitude, longitude]
 * @param {number} options.radiusKm Rayon de recherche en km (défaut: 20)
 * @param {number} options.pageSize Limite par requête de plage (défaut: 25)
 * @returns {Promise<{items: Array, totalFound: number}>}
 */
export const fetchListingsByGeohash = async ({ center, radiusKm = 20, pageSize = 25 } = {}) => {
  if (!db || !Array.isArray(center) || center.length < 2 || isNaN(center[0]) || isNaN(center[1])) {
    return fetchListingsPaginated({ pageSize });
  }

  const [centerLat, centerLon] = center;
  const bounds = getGeohashQueryBounds([centerLat, centerLon], radiusKm);

  if (!bounds || bounds.length === 0) {
    return fetchListingsPaginated({ pageSize });
  }

  try {
    const promises = bounds.map(async ([startHash, endHash]) => {
      try {
        const q = query(
          collection(db, 'listings'),
          orderBy('geohash'),
          startAt(startHash),
          endAt(endHash),
          limit(pageSize)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docSnap => ({
          id: docSnap.data().id || docSnap.id,
          firestoreId: docSnap.id,
          ...docSnap.data(),
          status: docSnap.data().status || 'active',
          isDemo: false,
          _doc: docSnap,
        }));
      } catch (err) {
        const fallbackQ = query(
          collection(db, 'listings'),
          where('geohash', '>=', startHash),
          where('geohash', '<=', endHash),
          limit(pageSize)
        );
        const snapshot = await getDocs(fallbackQ);
        return snapshot.docs.map(docSnap => ({
          id: docSnap.data().id || docSnap.id,
          firestoreId: docSnap.id,
          ...docSnap.data(),
          status: docSnap.data().status || 'active',
          isDemo: false,
          _doc: docSnap,
        }));
      }
    });

    const snapshots = await Promise.all(promises);
    const docMap = new Map();

    for (const snapItems of snapshots) {
      for (const item of snapItems) {
        if (!docMap.has(item.id)) {
          let itemCoords = item.coordinates;
          if (!itemCoords && item.latitude !== undefined && item.longitude !== undefined) {
            itemCoords = [item.latitude, item.longitude];
          }

          if (itemCoords && Array.isArray(itemCoords) && itemCoords.length >= 2) {
            const dist = calculateHaversineDistance(centerLat, centerLon, Number(itemCoords[0]), Number(itemCoords[1]));
            item.distanceKm = dist;
            if (dist !== null && dist <= radiusKm) {
              docMap.set(item.id, item);
            }
          } else {
            docMap.set(item.id, item);
          }
        }
      }
    }

    const items = Array.from(docMap.values());
    items.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));

    return {
      items,
      totalFound: items.length,
    };
  } catch (error) {
    console.error('[FirestoreService] fetchListingsByGeohash error:', error);
    return fetchListingsPaginated({ pageSize });
  }
};

/**
 * Écoute en temps réel les annonces dans un rayon geohash donné
 */
export const subscribeToListingsByGeohash = ({ center, radiusKm = 20, pageSize = 20, onUpdate, onError }) => {
  if (!db || !Array.isArray(center) || center.length < 2 || isNaN(center[0]) || isNaN(center[1])) {
    return subscribeToListings(onUpdate, onError, pageSize);
  }

  const [centerLat, centerLon] = center;
  const bounds = getGeohashQueryBounds([centerLat, centerLon], radiusKm);
  if (!bounds || bounds.length === 0) {
    return subscribeToListings(onUpdate, onError, pageSize);
  }

  const unsubscribes = [];
  const resultsByRange = new Map();

  const emitMerged = () => {
    const combined = new Map();
    for (const rangeItems of resultsByRange.values()) {
      for (const item of rangeItems) {
        if (!combined.has(item.id)) {
          let itemCoords = item.coordinates;
          if (!itemCoords && item.latitude !== undefined && item.longitude !== undefined) {
            itemCoords = [item.latitude, item.longitude];
          }
          if (itemCoords && Array.isArray(itemCoords) && itemCoords.length >= 2) {
            const dist = calculateHaversineDistance(centerLat, centerLon, Number(itemCoords[0]), Number(itemCoords[1]));
            item.distanceKm = dist;
            if (dist !== null && dist <= radiusKm) {
              combined.set(item.id, item);
            }
          } else {
            combined.set(item.id, item);
          }
        }
      }
    }
    const finalItems = Array.from(combined.values());
    finalItems.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    if (typeof onUpdate === 'function') onUpdate(finalItems);
  };

  bounds.forEach(([startHash, endHash], index) => {
    try {
      const q = query(
        collection(db, 'listings'),
        orderBy('geohash'),
        startAt(startHash),
        endAt(endHash),
        limit(pageSize)
      );
      const unsub = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(d => ({
          id: d.data().id || d.id,
          firestoreId: d.id,
          ...d.data(),
          status: d.data().status || 'active',
          isDemo: false,
          _doc: d,
        }));
        resultsByRange.set(index, items);
        emitMerged();
      }, (err) => {
        console.warn(`[FirestoreService] subscribeToListingsByGeohash range ${index} error:`, err);
        if (onError) onError(err);
      });
      unsubscribes.push(unsub);
    } catch (e) {
      console.warn(`[FirestoreService] subscribeToListingsByGeohash setup range ${index} failed:`, e);
    }
  });

  return () => {
    unsubscribes.forEach(u => typeof u === 'function' && u());
  };
};

/**
 * Écoute en temps réel les annonces Firestore avec limite pour éviter la surcharge mémoire
 * @param {Function} onUpdate Callback avec les annonces formatées
 * @param {Function} onError Callback en cas d'erreur
 * @param {number} pageSize Nombre maximum d'annonces à écouter en direct (défaut: 20)
 * @returns {Function} Fonction de désabonnement propre (unsubscribe)
 */
export const subscribeToListings = (onUpdate, onError, pageSize = 20) => {
  try {
    const q = query(collection(db, 'listings'), orderBy('createdAt', 'desc'), limit(pageSize));
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => ({
        id: d.data().id || d.id,
        firestoreId: d.id,
        ...d.data(),
        status: d.data().status || 'active',
        isDemo: false,
        _doc: d,
      }));
      onUpdate(items, snapshot.docs[snapshot.docs.length - 1] || null);
    }, (error) => {
      console.warn('[FirestoreService] subscribeToListings error, falling back without orderBy:', error);
      try {
        const fallbackQ = query(collection(db, 'listings'), limit(pageSize));
        return onSnapshot(fallbackQ, (snapshot) => {
          const items = snapshot.docs.map(d => ({
            id: d.data().id || d.id,
            firestoreId: d.id,
            ...d.data(),
            status: d.data().status || 'active',
            isDemo: false,
            _doc: d,
          }));
          onUpdate(items, snapshot.docs[snapshot.docs.length - 1] || null);
        }, onError);
      } catch (e) {
        if (onError) onError(error);
      }
    });
  } catch (err) {
    console.warn('[FirestoreService] subscribeToListings setup failed:', err);
    return () => {};
  }
};

/**
 * Crée une nouvelle annonce dans Firestore avec indexation spatiale Geohash
 */
export const createListing = async (listingData) => {
  try {
    let lat = null;
    let lon = null;

    if (Array.isArray(listingData.coordinates) && listingData.coordinates.length >= 2) {
      lat = Number(listingData.coordinates[0]);
      lon = Number(listingData.coordinates[1]);
    } else if (listingData.latitude !== undefined && listingData.longitude !== undefined) {
      lat = Number(listingData.latitude);
      lon = Number(listingData.longitude);
    } else if (listingData.lat !== undefined && listingData.lon !== undefined) {
      lat = Number(listingData.lat);
      lon = Number(listingData.lon);
    }

    let geohash = listingData.geohash || null;
    if ((lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) && !geohash) {
      geohash = encodeGeohash(lat, lon, 9);
    }

    const payload = {
      ...listingData,
      ...(geohash ? { geohash } : {}),
      ...(lat !== null && lon !== null ? { coordinates: [lat, lon], latitude: lat, longitude: lon } : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'listings'), payload);
    return { success: true, id: docRef.id, geohash };
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
 * Construit un identifiant de conversation 100% déterministe basé sur les UIDs
 */
export const buildDeterministicConversationId = (listingId, userAId, userBId) => {
  const sortedUids = [String(userAId || '').trim(), String(userBId || '').trim()].sort().filter(Boolean);
  const uidsPart = sortedUids.join('_') || 'conversation';
  const cleanListingId = listingId ? `_${String(listingId).trim()}` : '';
  return `chat_${uidsPart}${cleanListingId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
};

/**
 * Écoute les discussions de l'utilisateur connecté avec tri en mémoire sécurisé (Zéro dépendance d'index)
 */
export const subscribeToUserChats = (userNameOrUid, onUpdate, onError) => {
  if (!userNameOrUid || typeof userNameOrUid !== 'string') return () => {};
  try {
    const target = userNameOrUid.trim();
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', target)
    );
    return onSnapshot(q, (snapshot) => {
      const chats = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      // Tri mémoire par date de dernière activité (Zéro échec d'index)
      chats.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0)));
        const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0)));
        return timeB - timeA;
      });
      onUpdate(chats);
    }, (error) => {
      console.error('🚨 [FirestoreService] subscribeToUserChats error:', error);
      if (onError) onError(error);
    });
  } catch (err) {
    console.error('🚨 [FirestoreService] subscribeToUserChats setup failed:', err);
    if (onError) onError(err);
    return () => {};
  }
};

/**
 * Écoute les messages d'une discussion spécifique avec tri client résilient
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
      messages.sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt || 0).getTime());
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt || 0).getTime());
        return tA - tB;
      });
      onUpdate(messages);
    }, (error) => {
      console.warn('[FirestoreService] subscribeToChatMessages with orderBy failed, fallback without orderBy:', error);
      try {
        const fallbackQ = collection(db, 'chats', String(chatId), 'messages');
        return onSnapshot(fallbackQ, (snapshot) => {
          const messages = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
          }));
          messages.sort((a, b) => {
            const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt || 0).getTime());
            const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt || 0).getTime());
            return tA - tB;
          });
          onUpdate(messages);
        }, onError);
      } catch (fallbackErr) {
        if (onError) onError(fallbackErr);
      }
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
      // 1. TOUTES LES LECTURES (transaction.get) EN PREMIER
      const msgRef = doc(db, 'chats', String(chatId), 'messages', String(dealId));
      let buyerDoc = null;
      let sellerDoc = null;
      let buyerRef = null;
      let sellerRef = null;

      if (buyerUid && sellerUid) {
        buyerRef = doc(db, 'users', String(buyerUid));
        sellerRef = doc(db, 'users', String(sellerUid));
        buyerDoc = await transaction.get(buyerRef);
        sellerDoc = await transaction.get(sellerRef);
      }

      // 2. TOUTES LES ÉCRITURES (transaction.update / set) APRÈS
      transaction.update(msgRef, {
        status: 'confirmed',
        updatedAt: serverTimestamp(),
      });

      if (buyerDoc?.exists() && sellerDoc?.exists()) {
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
      // 1. TOUTES LES LECTURES EN PREMIER
      const msgRef = doc(db, 'chats', String(chatId), 'messages', String(dealId));
      let sellerDoc = null;
      let buyerDoc = null;
      let sellerRef = null;
      let buyerRef = null;

      if (sellerUid) {
        sellerRef = doc(db, 'users', String(sellerUid));
        sellerDoc = await transaction.get(sellerRef);
      }

      if (buyerUid) {
        buyerRef = doc(db, 'users', String(buyerUid));
        buyerDoc = await transaction.get(buyerRef);
      }

      // 2. TOUTES LES ÉCRITURES APRÈS
      transaction.update(msgRef, {
        status: 'confirmed',
        'escrow.status': 'released',
        releasedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (sellerDoc?.exists()) {
        const sellerData = sellerDoc.data();
        transaction.update(sellerRef, {
          trocoTokens: (sellerData.trocoTokens || 0) + trocoTokens,
          euroBalance: Number(((sellerData.euroBalance || 0) + euroAmount).toFixed(2)),
          dealsCompleted: (sellerData.dealsCompleted || 0) + 1,
          updatedAt: serverTimestamp(),
        });
      }

      if (buyerDoc?.exists()) {
        transaction.update(buyerRef, {
          dealsCompleted: (buyerDoc.data().dealsCompleted || 0) + 1,
          updatedAt: serverTimestamp(),
        });
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
 * Supporte aussi bien l'appel par objet que par arguments positionnels executeDirectTokenTransfer(chatId, senderUid, amount, chatData)
 */
export const executeDirectTokenTransfer = async (
  arg1,
  arg2,
  arg3,
  arg4
) => {
  let chatId, senderUid, senderName, recipientUid, recipientName, tokenAmount, comment, chatData;

  if (typeof arg1 === 'object' && arg1 !== null) {
    ({
      senderUid,
      senderName,
      recipientUid,
      recipientName,
      chatId,
      tokenAmount = 1,
      comment = '',
      chatData,
    } = arg1);
  } else {
    chatId = arg1;
    senderUid = arg2;
    tokenAmount = arg3;
    chatData = arg4;
    senderName = chatData?.senderName || 'Moi';
    recipientName = chatData?.recipientName || chatData?.user || 'Interlocuteur';
    comment = chatData?.comment || '';
  }

  const amount = Number(tokenAmount || 0);

  // 1. RÉSOLUTION DE L'UID DESTINATAIRE DE MANIÈRE INFAILLIBLE
  if (!recipientUid && chatData) {
    if (Array.isArray(chatData.participants)) {
      recipientUid = chatData.participants.find(uid => uid && uid !== senderUid);
    }
    if (!recipientUid && Array.isArray(chatData.participantUids)) {
      recipientUid = chatData.participantUids.find(uid => uid && uid !== senderUid);
    }
    if (!recipientUid) {
      recipientUid = chatData.authorUid || chatData.partnerUid || chatData.sellerUid || chatData.buyerUid || chatData.peerUid || chatData.recipientUid || null;
      if (recipientUid === senderUid) recipientUid = null;
    }
  }

  // Si non trouvé et chatId fourni, recherche directe dans le document du chat Firestore
  if (!recipientUid && chatId && db) {
    try {
      const chatDocSnap = await getDoc(doc(db, 'chats', String(chatId)));
      if (chatDocSnap.exists()) {
        const cData = chatDocSnap.data();
        if (Array.isArray(cData.participants)) {
          recipientUid = cData.participants.find(uid => uid && uid !== senderUid);
        }
        if (!recipientUid && Array.isArray(cData.participantUids)) {
          recipientUid = cData.participantUids.find(uid => uid && uid !== senderUid);
        }
        if (!recipientUid) {
          recipientUid = cData.authorUid || cData.partnerUid || cData.sellerUid || cData.buyerUid || null;
          if (recipientUid === senderUid) recipientUid = null;
        }
      }
    } catch (_) {}
  }

  // Si !recipientUid, lance une erreur explicite et annule le débit
  if (!recipientUid) {
    console.error('🚨 [FirestoreService] executeDirectTokenTransfer ERROR: Destinataire introuvable pour ce transfert.', {
      chatId,
      senderUid,
      amount,
      chatData,
    });
    return {
      success: false,
      error: 'Destinataire introuvable pour ce transfert. Le transfert et le débit ont été annulés.',
    };
  }

  if (!senderUid || amount <= 0) {
    console.error('[FirestoreService] executeDirectTokenTransfer: senderUid manquant ou tokenAmount invalide', { senderUid, amount });
    return { success: false, error: 'Paramètres invalides pour le transfert.' };
  }

  try {
    await runTransaction(db, async (transaction) => {
      // 1. TOUTES LES LECTURES AU TOUT DÉBUT DE LA TRANSACTION (READS FIRST)
      const senderRef = doc(db, 'users', String(senderUid));
      const recipientRef = doc(db, 'users', String(recipientUid));

      const senderDoc = await transaction.get(senderRef);
      const recipientDoc = await transaction.get(recipientRef);

      // 2. VÉRIFICATIONS DE L'EXPÉDITEUR
      if (!senderDoc.exists()) {
        throw new Error("Le compte expéditeur n'existe pas dans Firestore.");
      }

      const senderData = senderDoc.data();
      const currentSenderTokens = Number(senderData.trocoTokens || 0);

      if (currentSenderTokens < amount) {
        throw new Error(`Solde insuffisant (${currentSenderTokens} jeton(s) disponible(s)).`);
      }

      const newSenderTokens = Math.max(0, currentSenderTokens - amount);

      const recipientData = recipientDoc.exists() ? recipientDoc.data() : {};
      const currentRecipientTokens = Number(recipientData.trocoTokens || 0);
      const newRecipientTokens = currentRecipientTokens + amount;

      // 3. TOUTES LES ÉCRITURES APRÈS LES LECTURES (WRITES)
      transaction.update(senderRef, {
        trocoTokens: newSenderTokens,
        updatedAt: serverTimestamp(),
      });

      // 4. CRÉDIT ATOMIQUE DU SOLDE DESTINATAIRE
      transaction.set(recipientRef, {
        uid: String(recipientUid),
        name: recipientName || recipientData.name || 'Utilisateur Troco',
        trocoTokens: newRecipientTokens,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    });

    // 5. Messages et enregistrement de transaction
    if (chatId && db) {
      const transferText = `🪙 ${senderName || 'Moi'} a envoyé ${amount} Jeton${amount > 1 ? 's' : ''} Troco à ${recipientName || 'Interlocuteur'}${comment ? ` (« ${comment} »)` : ''} !`;
      await addDoc(collection(db, 'chats', String(chatId), 'messages'), {
        text: transferText,
        type: 'token_transfer',
        tokenAmount: amount,
        transferComment: comment || '',
        sender: senderUid,
        senderName: senderName || 'Moi',
        recipientUid: String(recipientUid),
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
        recipientUid: String(recipientUid),
        recipientName: recipientName || '',
        tokens: amount,
        comment: comment || '',
        createdAt: serverTimestamp(),
      });
    }

    return { success: true, targetRecipientUid: recipientUid };
  } catch (error) {
    console.error('🚨 [FirestoreService] executeDirectTokenTransfer transaction failed:', error);
    return { success: false, error: error?.message || error };
  }
};

