import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { fetchListingsPaginated, fetchListingsByGeohash } from '../services/firestoreService';
import { useUsersPublic } from './useUsersPublic';
import { searchNominatim, calculateHaversineDistance } from '../utils/geocodingNominatim';
import { generateTags } from '../utils/tagGenerator';
import logger from '../utils/logger';

const removeAccents = (str = '') => {
  return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

/**
 * useFeedListings - Hook dédié à la gestion du flux d'annonces du Feed :
 * - Synchronisation temps réel Firestore (active status + fallback)
 * - Pagination infinie (par géohash ou pagination standard par curseur de document)
 * - Alias de recherche géographique (Nominatim)
 * - Indexation et synchronisation des profils d'auteurs (usersPublic)
 * - Filtrage multi-critères mémoïsé (recherche, catégories, langues, paiements, rayons, formats)
 */
export const useFeedListings = ({
  profile,
  authCurrentUserUid,
  activeTab,
  hideDemos = false,
  deferredSearchQuery = '',
  debouncedSearchQuery = '',
  selectedCategory = 'all',
  selectedLanguages = [],
  selectedPayment = 'all',
  formatFilter = 'all',
  userCoords,
  isInfiniteRadius = false,
  radiusKm = 50,
  currentLang = 'FR',
  allFirestoreUsers: propAllFirestoreUsers,
  setAllFirestoreUsers: propSetAllFirestoreUsers,
} = {}) => {
  const [listings, setListings] = useState([]);
  const [lastVisibleListingDoc, setLastVisibleListingDoc] = useState(null);
  const [hasMoreListings, setHasMoreListings] = useState(true);
  const [isLoadingMoreListings, setIsLoadingMoreListings] = useState(false);
  const [internalAllFirestoreUsers, setInternalAllFirestoreUsers] = useState([]);
  const allFirestoreUsers = propAllFirestoreUsers || internalAllFirestoreUsers;
  const setAllFirestoreUsers = propSetAllFirestoreUsers || setInternalAllFirestoreUsers;
  const [dynamicSearchAliases, setDynamicSearchAliases] = useState([]);

  const loadMoreSentinelRef = useRef(null);

  // ---- SYNC TEMPS RÉEL FIRESTORE (LIMIT 50) ----
  useEffect(() => {
    let unsubFirestore = () => { };
    let isCancelled = false;

    const initialQuery = query(
      collection(db, 'listings'),
      where('status', '==', 'active'),
      limit(50)
    );

    unsubFirestore = onSnapshot(
      initialQuery,
      (snapshot) => {
        if (isCancelled) return;
        const firestoreListings = snapshot.docs.map((docSnap) => ({
          id: docSnap.data().id || docSnap.id,
          firestoreId: docSnap.id,
          ...docSnap.data(),
          status: docSnap.data().status || 'active',
          isDemo: false,
          _doc: docSnap,
        }));

        const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
        setLastVisibleListingDoc(lastDoc);
        setHasMoreListings(snapshot.docs.length >= 50);

        setListings(prev => {
          const customLocalListings = prev.filter(p => !p.isDemo && !firestoreListings.some(f => f.id === p.id));
          return [...firestoreListings, ...customLocalListings];
        });
      },
      (error) => {
        logger.warn('[useFeedListings] onSnapshot listings query error:', error);
        if (!isCancelled) {
          try {
            const fallbackQuery = query(collection(db, 'listings'), limit(50));
            unsubFirestore = onSnapshot(fallbackQuery, (snapshot) => {
              if (isCancelled) return;
              const firestoreListings = snapshot.docs.map((docSnap) => ({
                id: docSnap.data().id || docSnap.id,
                firestoreId: docSnap.id,
                ...docSnap.data(),
                status: docSnap.data().status || 'active',
                isDemo: false,
                _doc: docSnap,
              }));
              const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
              setLastVisibleListingDoc(lastDoc);
              setHasMoreListings(snapshot.docs.length >= 50);
              setListings(prev => {
                const customLocalListings = prev.filter(p => !p.isDemo && !firestoreListings.some(f => f.id === p.id));
                return [...firestoreListings, ...customLocalListings];
              });
            }, (fallbackErr) => {
              logger.error('[useFeedListings] Fallback listings query failed:', fallbackErr);
            });
          } catch (_) { }
        }
      }
    );

    return () => {
      isCancelled = true;
      try { unsubFirestore(); } catch (_) { }
    };
  }, []);

  const handleLoadMoreListings = async () => {
    if (isLoadingMoreListings || !hasMoreListings) return;
    setIsLoadingMoreListings(true);
    try {
      let result;
      if (userCoords && Array.isArray(userCoords) && userCoords.length >= 2 && !isInfiniteRadius && radiusKm < 2000) {
        result = await fetchListingsByGeohash({ center: userCoords, radiusKm, pageSize: 25 });
      } else {
        result = await fetchListingsPaginated({ pageSize: 20, lastDoc: lastVisibleListingDoc });
      }

      if (result && result.items && result.items.length > 0) {
        setListings(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newItems = result.items.filter(item => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
        setLastVisibleListingDoc(result.lastVisible || null);
        setHasMoreListings(result.hasMore || false);
      } else {
        setHasMoreListings(false);
      }
    } catch (err) {
      logger.error('[useFeedListings] handleLoadMoreListings error:', err);
    } finally {
      setIsLoadingMoreListings(false);
    }
  };

  const handleRefreshFeed = async () => {
    try {
      setLastVisibleListingDoc(null);
      setHasMoreListings(true);
      let result;
      if (userCoords && Array.isArray(userCoords) && userCoords.length >= 2 && !isInfiniteRadius && radiusKm < 2000) {
        result = await fetchListingsByGeohash({ center: userCoords, radiusKm, pageSize: 25 });
      } else {
        result = await fetchListingsPaginated({ pageSize: 50, lastDoc: null });
      }
      if (result && result.items) {
        setListings(result.items);
        setLastVisibleListingDoc(result.lastVisible || null);
        setHasMoreListings(result.hasMore || false);
      }
    } catch (err) {
      logger.error('[useFeedListings] handleRefreshFeed error:', err);
    }
  };

  const getListingDistance = useCallback((item) => {
    if (typeof item.distanceKm === 'number') return item.distanceKm;
    if (item.coordinates && userCoords) {
      return calculateHaversineDistance(userCoords[0], userCoords[1], item.coordinates[0], item.coordinates[1]);
    }
    const match = String(item.location || '').match(/(\d+(?:\.\d+)?)\s*km/i);
    if (match) return parseFloat(match[1]);
    return null;
  }, [userCoords]);

  // Résolution dynamique des alias géographiques via OpenStreetMap Nominatim
  useEffect(() => {
    const abortController = new AbortController();
    let isCurrentSearch = true;
    const raw = (debouncedSearchQuery || '').trim();
    if (raw.length >= 3) {
      searchNominatim(raw, { limit: 3, signal: abortController.signal }).then(results => {
        if (!isCurrentSearch) return;
        if (results && results.length > 0) {
          const names = results
            .map(r => [r.cityName, r.displayName, r.country])
            .flat()
            .filter(Boolean)
            .map(removeAccents);
          setDynamicSearchAliases(Array.from(new Set(names)));
        } else {
          setDynamicSearchAliases([]);
        }
      }).catch((error) => {
        if (error?.name !== 'AbortError' && isCurrentSearch) {
          setDynamicSearchAliases([]);
        }
      });
    } else {
      setDynamicSearchAliases([]);
    }

    return () => {
      isCurrentSearch = false;
      abortController.abort();
    };
  }, [debouncedSearchQuery]);

  // Extraction des UIDs d'auteurs pour le listener users_public chunké & paginé
  const visibleAuthorUids = useMemo(() => {
    const uids = new Set();
    listings.forEach(item => {
      const uid = item.authorUid || item.userId || item.sellerId;
      if (uid && typeof uid === 'string') uids.add(uid);
    });
    return Array.from(uids);
  }, [listings]);

  const { usersMap: usersPublicMap, usersList: usersPublicList } = useUsersPublic({ uids: visibleAuthorUids });

  useEffect(() => {
    setAllFirestoreUsers(usersPublicList);
  }, [usersPublicList]);

  const usersByUid = useMemo(() => {
    const map = new Map();
    allFirestoreUsers.forEach((user) => {
      if (user.uid) map.set(user.uid, user);
    });
    return map;
  }, [allFirestoreUsers]);

  const usersByName = useMemo(() => {
    const map = new Map();
    allFirestoreUsers.forEach((user) => {
      if (user.name) map.set(user.name.trim().toLowerCase(), user);
    });
    return map;
  }, [allFirestoreUsers]);

  // Filtrage multi-critères ultra-performant
  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      if (hideDemos && item.isDemo) return false;

      const rawQuery = (deferredSearchQuery || '').trim();
      const cleanQuery = removeAccents(rawQuery);
      const words = cleanQuery.split(/\s+/).filter(Boolean);

      const itemLocationNorm = removeAccents(item.location || '');
      const itemTitleNorm = removeAccents(item.title || '');
      const itemCategoryNorm = removeAccents(item.category || '');
      const itemCompNorm = removeAccents(item.compensation || '');
      const allTags = [
        ...(Array.isArray(item.tags) ? item.tags : []),
        ...(typeof generateTags === 'function' ? (generateTags(item.title || '', item.description || '') || []) : [])
      ];
      const itemTagsNorm = removeAccents(allTags.join(' '));
      const itemDescNorm = removeAccents(item.description || '');
      const transText = item.translations ? Object.values(item.translations).map(t => `${t.title || ''} ${t.description || ''}`).join(' ') : '';
      const itemTransNorm = removeAccents(transText);

      const searchText = `${itemTitleNorm} ${itemCategoryNorm} ${itemLocationNorm} ${itemCompNorm} ${itemTagsNorm} ${itemDescNorm} ${itemTransNorm}`;

      const matchesSearch = (() => {
        if (!cleanQuery) return true;
        if (words.every(word => searchText.includes(word))) return true;

        const isGeoSearch = dynamicSearchAliases.length > 0 ||
          /\b(paris|lyon|marseille|toulouse|bordeaux|nantes|lille|strasbourg|france|belgique|suisse|canada|espagne|italie|portugal|angleterre|madrid|barcelone|lisbonne|bruxelles|geneve|london|tokyo|montreal|quebec)\b/i.test(cleanQuery);

        if (isGeoSearch) {
          if (dynamicSearchAliases.some(alias => itemLocationNorm.includes(alias))) return true;
          if (words.some(word => itemLocationNorm.includes(word))) return true;
        }

        if (words.some(word => word.length >= 3 && itemTagsNorm.includes(word))) return true;
        if (words.some(word => word.length >= 3 && itemCategoryNorm.includes(word))) return true;

        return false;
      })();

      const matchesCategory =
        selectedCategory === 'all' ||
        selectedCategory === 'Tous' ||
        item.category === selectedCategory ||
        item.categoryId === selectedCategory;

      const matchesLanguage =
        !selectedLanguages ||
        selectedLanguages.length === 0 ||
        selectedLanguages.includes('all') ||
        selectedLanguages.includes(item.nativeLang || 'FR') ||
        (item.languages && item.languages.some(lang => selectedLanguages.includes(lang)));

      const matchesPayment = (() => {
        if (!selectedPayment || selectedPayment === 'all') return true;
        const comp = (item.compensation || '').toLowerCase();
        if (selectedPayment === 'credits') {
          return comp.includes('jeton') || comp.includes('point') || comp.includes('credit') || comp.includes('troco');
        }
        if (selectedPayment === 'cash') {
          return comp.includes('€') || comp.includes('eur') || comp.includes('cash') || comp.includes('argent');
        }
        if (selectedPayment === 'troc') {
          return comp.includes('troc') || comp.includes('échange') || comp.includes('service') || comp.includes('competence');
        }
        if (selectedPayment === 'hybrid') {
          const hasTokens = comp.includes('jeton') || comp.includes('point') || comp.includes('credit') || comp.includes('troco');
          const hasCash = comp.includes('€') || comp.includes('eur') || comp.includes('cash');
          return hasTokens && hasCash;
        }
        return true;
      })();

      const matchesFormat = (() => {
        if (!formatFilter || formatFilter === 'all') return true;
        if (formatFilter === 'remote') return item.type === 'remote' || item.isRemote;
        if (formatFilter === 'in_person') return item.type === 'in_person' || !item.isRemote;
        if (formatFilter === 'urgent') return Boolean(item.urgent);
        if (formatFilter === 'boosted') return Boolean(item.isBoosted);
        return true;
      })();

      const dist = getListingDistance(item);
      const matchesDistance =
        isInfiniteRadius ||
        radiusKm >= 2000 ||
        dist === null ||
        dist <= radiusKm;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesLanguage &&
        matchesPayment &&
        matchesFormat &&
        matchesDistance
      );
    });
  }, [
    listings,
    hideDemos,
    deferredSearchQuery,
    selectedCategory,
    selectedLanguages,
    selectedPayment,
    formatFilter,
    isInfiniteRadius,
    radiusKm,
    userCoords,
    getListingDistance,
    dynamicSearchAliases,
    profile?.name,
    profile?.uid,
    authCurrentUserUid,
    usersPublicMap,
    usersByUid,
    usersByName
  ]);

  // Infinite scroll automatique via IntersectionObserver
  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;
    if (!hasMoreListings || isLoadingMoreListings || activeTab !== 'feed') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0] && entries[0].isIntersecting) {
          handleLoadMoreListings();
        }
      },
      { rootMargin: '350px 0px', threshold: 0.1 }
    );

    const target = loadMoreSentinelRef.current;
    if (target) observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMoreListings, isLoadingMoreListings, activeTab, lastVisibleListingDoc]);

  return {
    listings,
    setListings,
    filteredListings,
    hasMoreListings,
    isLoadingMoreListings,
    lastVisibleListingDoc,
    loadMoreSentinelRef,
    handleLoadMoreListings,
    handleRefreshFeed,
    allFirestoreUsers,
    setAllFirestoreUsers,
    usersPublicMap,
  };
};

export default useFeedListings;
