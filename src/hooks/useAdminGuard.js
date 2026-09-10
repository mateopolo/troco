import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

/**
 * 🛡️ useAdminGuard
 * Hook de sécurité réactif pour valider le statut Administrateur via Firebase Custom Claims.
 * Ne se base JAMAIS sur les données modifiables côté client (ex: profile.role ou email local).
 * Écoute l'authentification et force un rafraîchissement périodique (rotation à 55 min).
 */
export function useAdminGuard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  // Fonction manuelle pour forcer le rafraîchissement immédiat du claim
  const refreshAdminStatus = useCallback(async () => {
    if (!auth.currentUser) {
      setIsAdmin(false);
      setIsAdminLoading(false);
      return false;
    }
    try {
      const tokenResult = await auth.currentUser.getIdTokenResult(true);
      const hasAdminClaim = tokenResult.claims?.admin === true;
      setIsAdmin(hasAdminClaim);
      return hasAdminClaim;
    } catch (err) {
      console.warn('[useAdminGuard] Erreur lors du refresh du token admin:', err);
      setIsAdmin(false);
      return false;
    } finally {
      setIsAdminLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (!cancelled) {
          setIsAdmin(false);
          setIsAdminLoading(false);
        }
        return;
      }

      try {
        // Force refresh pour récupérer les claims les plus récents
        const tokenResult = await user.getIdTokenResult(true);
        if (!cancelled) {
          setIsAdmin(tokenResult.claims?.admin === true);
          setIsAdminLoading(false);
        }
      } catch (err) {
        console.warn('[useAdminGuard] Erreur lecture tokenResult:', err);
        if (!cancelled) {
          setIsAdmin(false);
          setIsAdminLoading(false);
        }
      }
    });

    // Rotation du token toutes les 55min (Firebase expire à 60min)
    const interval = setInterval(async () => {
      if (auth.currentUser) {
        try {
          const tr = await auth.currentUser.getIdTokenResult(true);
          if (!cancelled) {
            setIsAdmin(tr.claims?.admin === true);
          }
        } catch (err) {
          console.warn('[useAdminGuard] Erreur rotation token:', err);
        }
      }
    }, 55 * 60 * 1000);

    return () => {
      cancelled = true;
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return { isAdmin, isAdminLoading, refreshAdminStatus };
}

export default useAdminGuard;
