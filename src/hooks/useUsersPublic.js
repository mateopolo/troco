import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { collection, query, where, documentId, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Helper : Découpe un tableau en sous-tableaux de taille N (chunking Firestore 'in' limit <= 10)
 */
function chunkArray(items, size = 10) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const results = [];
  for (let i = 0; i < items.length; i += size) {
    results.push(items.slice(i, i + size));
  }
  return results;
}

/**
 * 🌐 useUsersPublic
 * Hook réactif optimisé RGPD pour charger et écouter les profils publics (users_public/{uid}).
 * Ne charge que les utilisateurs visibles (via uids) et maintient une Map O(1) en mémoire.
 *
 * @param {Object} options
 * @param {string[]} [options.uids] - Liste des UIDs ciblés
 * @param {number} [options.pageSize=100] - Taille de page maximale
 */
export function useUsersPublic({ uids = [], pageSize = 100 } = {}) {
  const [usersMap, setUsersMap] = useState(() => new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore] = useState(false);

  // Cache mémoire persistant pour éviter les clignotements lors des changements de filtre
  const persistentCacheRef = useRef(new Map());

  // Normalisation et déduplication des UIDs
  const uniqueUids = useMemo(() => {
    if (!Array.isArray(uids)) return [];
    const set = new Set();
    for (const id of uids) {
      if (id && typeof id === 'string' && id.trim()) {
        set.add(id.trim());
      }
    }
    return Array.from(set).slice(0, pageSize);
  }, [uids, pageSize]);

  const uidsKey = uniqueUids.sort().join(',');

  useEffect(() => {
    if (!db || uniqueUids.length === 0) {
      // Retourne les données déjà présentes en cache sans forcer le vidage total
      setUsersMap(new Map(persistentCacheRef.current));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Découpage en blocs de 10 max pour respecter la limite 'in' Firestore
    const chunks = chunkArray(uniqueUids, 10);
    const unsubscribers = [];

    chunks.forEach((chunk) => {
      try {
        const q = query(
          collection(db, 'users_public'),
          where(documentId(), 'in', chunk)
        );

        const unsub = onSnapshot(
          q,
          (snapshot) => {
            snapshot.docs.forEach((docSnap) => {
              const data = docSnap.data();
              const profile = {
                id: docSnap.id,
                uid: docSnap.id,
                ...data,
              };
              persistentCacheRef.current.set(docSnap.id, profile);
            });

            // Mise à jour de l'état réactif
            setUsersMap(new Map(persistentCacheRef.current));
            setIsLoading(false);
          },
          (err) => {
            console.warn('[useUsersPublic] Erreur snapshot chunk:', err);
            setIsLoading(false);
          }
        );

        unsubscribers.push(unsub);
      } catch (e) {
        console.warn('[useUsersPublic] Erreur création query chunk:', e);
      }
    });

    return () => {
      unsubscribers.forEach((fn) => {
        try {
          fn();
        } catch (_) {}
      });
    };
  }, [uidsKey, uniqueUids]);

  // Récupération instantanée O(1) d'un profil par UID
  const getUser = useCallback((targetUid) => {
    if (!targetUid) return null;
    return persistentCacheRef.current.get(String(targetUid)) || null;
  }, []);

  // Liste plate pour les composants attendant un Array
  const usersList = useMemo(() => Array.from(usersMap.values()), [usersMap]);

  return {
    usersMap,
    usersList,
    getUser,
    isLoading,
    hasMore,
  };
}

export default useUsersPublic;
