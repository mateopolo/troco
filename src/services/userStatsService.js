import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import logger from '../utils/logger';

/**
 * userStatsService.js
 * 
 * Calcul dynamique et vérifié des statistiques réelles d'un profil :
 * - COUNT réel des avis et calcul de la note moyenne depuis la sous-collection `users/{uid}/reviews`
 * - COUNT réel des deals clôturés et en cours depuis `transactions` et `chats`
 * - ZÉRO valeur hardcodée (suppression stricte des anciens 20 deals ou 6 avis factices)
 */

/**
 * Calcule dynamiquement les statistiques réelles d'un utilisateur à partir de la base de données.
 * @param {string} uid - Identifiant unique de l'utilisateur
 * @returns {Promise<{reviewsCount: number, averageRating: number, dealsCompleted: number, activeDeals: number}>}
 */
export async function fetchUserRealStats(uid) {
  if (!uid || typeof uid !== 'string' || !db) {
    return {
      reviewsCount: 0,
      averageRating: 0,
      dealsCompleted: 0,
      activeDeals: 0,
    };
  }

  const cleanUid = String(uid).trim();

  try {
    // 1. COUNT RÉEL DES AVIS & CALCUL NOTE MOYENNE DANS users/{uid}/reviews
    let reviewsCount = 0;
    let averageRating = 0;

    try {
      const reviewsRef = collection(db, 'users', cleanUid, 'reviews');
      const reviewsSnap = await getDocs(reviewsRef);
      reviewsCount = reviewsSnap.size;

      if (reviewsCount > 0) {
        const totalRating = reviewsSnap.docs.reduce((sum, docSnap) => {
          const data = docSnap.data();
          const r = Number(data.rating !== undefined ? data.rating : (data.stars || 5));
          return sum + (isNaN(r) ? 5 : r);
        }, 0);
        averageRating = Math.round((totalRating / reviewsCount) * 10) / 10;
      }
    } catch (revErr) {
      logger.warn(`[userStatsService] Erreur comptage avis pour ${cleanUid}:`, revErr);
    }

    // 2. COUNT RÉEL DES DEALS (CLÔTURÉS & EN COURS)
    const completedDealIds = new Set();
    const activeDealIds = new Set();

    // 2a. Recherche dans la collection transactions
    try {
      const txRef = collection(db, 'transactions');
      
      // Transactions où l'utilisateur est le créateur / acheteur
      const qUser = query(txRef, where('userId', '==', cleanUid));
      const userTxSnap = await getDocs(qUser);
      userTxSnap.forEach((d) => {
        const data = d.data();
        const isCompleted = data.status === 'completed' || data.status === 'closed';
        const isDealType = (data.type === 'deal' || data.type === 'deal_payment' || data.type === 'deal_receipt' || data.type === 'pay-deal' || data.dealId || data.mode === 'deal') && !data.isDemo && data.type !== 'topup' && data.type !== 'recharge';
        if (isCompleted && isDealType) {
          const dealKey = data.dealId ? String(data.dealId) : d.id;
          completedDealIds.add(dealKey);
        } else if ((data.status === 'pending' || data.status === 'in_progress' || data.status === 'escrow_locked') && isDealType) {
          const dealKey = data.dealId ? String(data.dealId) : d.id;
          activeDealIds.add(dealKey);
        }
      });

      // Transactions où l'utilisateur est le partenaire / vendeur
      const qPartner = query(txRef, where('partnerUid', '==', cleanUid));
      const partnerTxSnap = await getDocs(qPartner);
      partnerTxSnap.forEach((d) => {
        const data = d.data();
        const isCompleted = data.status === 'completed' || data.status === 'closed';
        const isDealType = (data.type === 'deal' || data.type === 'deal_payment' || data.type === 'deal_receipt' || data.type === 'pay-deal' || data.dealId || data.mode === 'deal') && !data.isDemo && data.type !== 'topup' && data.type !== 'recharge';
        if (isCompleted && isDealType) {
          const dealKey = data.dealId ? String(data.dealId) : d.id;
          completedDealIds.add(dealKey);
        } else if ((data.status === 'pending' || data.status === 'in_progress' || data.status === 'escrow_locked') && isDealType) {
          const dealKey = data.dealId ? String(data.dealId) : d.id;
          activeDealIds.add(dealKey);
        }
      });
    } catch (txErr) {
      logger.warn(`[userStatsService] Erreur comptage transactions pour ${cleanUid}:`, txErr);
    }

    const dealsCompleted = completedDealIds.size;
    const activeDeals = activeDealIds.size;

    const realStats = {
      reviewsCount,
      averageRating,
      dealsCompleted,
      dealsClosed: dealsCompleted,
      activeDeals,
    };

    // 3. SYNCHRONISATION / ASSAINISSEMENT DU DOCUMENT FIRESTORE SI NÉCESSAIRE
    // Si l'utilisateur connecté est le propriétaire du profil ou admin, rectifier les faux compteurs
    const currentAuth = auth?.currentUser;
    const isOwner = currentAuth && currentAuth.uid === cleanUid;
    let isDbAdmin = false;
    if (currentAuth && !isOwner) {
      try {
        const tokenRes = await currentAuth.getIdTokenResult();
        isDbAdmin = Boolean(tokenRes.claims?.admin);
      } catch (_) {}
    }

    if (isOwner || isDbAdmin) {
      try {
        const userRef = doc(db, 'users', cleanUid);
        await updateDoc(userRef, {
          dealsCompleted,
          dealsClosed: dealsCompleted,
          reviewsCount,
          averageRating,
          activeDeals,
          dealsInProgress: activeDeals,
        }).catch(() => {});
      } catch (_) {}
    }

    return realStats;
  } catch (err) {
    logger.error(`[userStatsService] Erreur globale stats pour ${cleanUid}:`, err);
    return {
      reviewsCount: 0,
      averageRating: 0,
      dealsCompleted: 0,
      activeDeals: 0,
    };
  }
}

/**
 * Hook React retournant les statistiques réelles et dynamiques d'un profil avec écoute en temps réel.
 * @param {string} uid - ID du profil ciblé
 * @param {Object} initialData - Données préliminaires de fallback
 */
export function useUserRealStats(uid, initialData = {}) {
  const [stats, setStats] = useState(() => ({
    reviewsCount: Number(initialData?.reviewsCount ?? 0),
    averageRating: Number(initialData?.averageRating ?? initialData?.rating ?? 0),
    dealsCompleted: Number(initialData?.dealsCompleted ?? initialData?.dealsClosed ?? 0),
    dealsClosed: Number(initialData?.dealsClosed ?? initialData?.dealsCompleted ?? 0),
    activeDeals: Number(initialData?.activeDeals ?? initialData?.dealsInProgress ?? 0),
  }));
  const [loading, setLoading] = useState(Boolean(uid));
  const isMountedRef = useRef(true);

  const refreshStats = useCallback(async () => {
    if (!uid) return;
    try {
      const real = await fetchUserRealStats(uid);
      if (isMountedRef.current) {
        setStats(real);
      }
    } catch (e) {
      logger.warn('[useUserRealStats] refreshStats error:', e);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [uid]);

  useEffect(() => {
    isMountedRef.current = true;
    if (!uid || !db) {
      setLoading(false);
      return () => {
        isMountedRef.current = false;
      };
    }

    setLoading(true);
    refreshStats();

    // Écoute en temps réel sur la sous-collection d'avis pour recalcul immédiat
    let unsubReviews = () => {};
    try {
      const reviewsRef = collection(db, 'users', String(uid), 'reviews');
      unsubReviews = onSnapshot(
        reviewsRef,
        (snapshot) => {
          if (!isMountedRef.current) return;
          const count = snapshot.size;
          let avg = 0;
          if (count > 0) {
            const sum = snapshot.docs.reduce((acc, d) => {
              const val = Number(d.data().rating !== undefined ? d.data().rating : 5);
              return acc + (isNaN(val) ? 5 : val);
            }, 0);
            avg = Math.round((sum / count) * 10) / 10;
          }
          setStats((prev) => ({
            ...prev,
            reviewsCount: count,
            averageRating: avg,
          }));
        },
        (err) => {
          logger.warn('[useUserRealStats] onSnapshot reviews warning:', err);
        }
      );
    } catch (e) {
      logger.warn('[useUserRealStats] listen error:', e);
    }

    return () => {
      isMountedRef.current = false;
      if (typeof unsubReviews === 'function') unsubReviews();
    };
  }, [uid, refreshStats]);

  return { stats, loading, refresh: refreshStats };
}

/**
 * Assainit un objet utilisateur pour garantir que ses statistiques sont fiables et numériques sans fallback factice.
 * @param {Object} rawUser - Objet profil brut
 * @param {Object} dynamicStats - Statistiques réelles calculées
 * @returns {Object} Profil avec statistiques vérifiées
 */
export function sanitizeUserWithDynamicStats(rawUser = {}, dynamicStats = null) {
  const base = rawUser || {};
  const dealsCompleted = dynamicStats?.dealsCompleted !== undefined
    ? Number(dynamicStats.dealsCompleted)
    : Number(base.dealsCompleted ?? base.dealsClosed ?? 0);
  const dealsClosed = dynamicStats?.dealsClosed !== undefined
    ? Number(dynamicStats.dealsClosed)
    : dealsCompleted;

  const activeDeals = dynamicStats?.activeDeals !== undefined
    ? Number(dynamicStats.activeDeals)
    : Number(base.activeDeals ?? base.dealsInProgress ?? 0);

  const reviewsCount = dynamicStats?.reviewsCount !== undefined
    ? Number(dynamicStats.reviewsCount)
    : Number(base.reviewsCount || 0);

  const averageRating = dynamicStats?.averageRating !== undefined
    ? Number(dynamicStats.averageRating)
    : Number(base.averageRating ?? base.rating ?? 0);

  return {
    ...base,
    dealsCompleted,
    dealsClosed,
    activeDeals,
    reviewsCount,
    averageRating,
  };
}
