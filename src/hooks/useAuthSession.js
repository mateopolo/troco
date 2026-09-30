import { useState, useEffect, useRef, useCallback } from 'react';
import { auth, db } from '../firebase';
import {
  onAuthStateChanged,
  signOut,
  isSignInWithEmailLink,
  signInWithEmailLink
} from 'firebase/auth';
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { useAuthStore, useWalletStore } from '../stores';
import { setSessionAuthenticated, clearSessionFlags } from '../utils/sessionFlags';
import * as storage from '../utils/storage';
import { migrateLocalStorage } from '../utils/migrateLocalStorage';
import { playApplePaySound, playBetclicBalanceSound, playWelcomeGiftFanfare } from '../utils/audioService';
import haptics from '../utils/haptics';
import logger from '../utils/logger';

/**
 * useAuthSession - Hook centralisant le cycle de vie de session Firebase Auth,
 * la synchronisation Firestore du document users/{uid}, la détection du bannissement,
 * les alertes sonores de solde, l'auto-guérison CGU admin, l'onboarding et le magic link.
 *
 * @param {Object} options
 * @param {Function} [options.onLogoutCleanup] Callback appelé lors de la déconnexion
 * @param {string} [options.activeTab] Onglet actif pour le déclencheur cadeau profil
 */
export const useAuthSession = ({ onLogoutCleanup, activeTab } = {}) => {
  const {
    profile,
    setProfile,
    profileDraft,
    setProfileDraft,
    isEditingProfile,
    setIsEditingProfile,
    isAuthenticated,
    saveMessage,
    setSaveMessage,
    addSkill,
    removeSkill,
    addEquipment,
    removeEquipment,
    addPortfolioImage,
    removePortfolioImage,
  } = useAuthStore();

  const isE2ESession = typeof window !== 'undefined' && (
    window.__E2E__ === true ||
    window.localStorage?.getItem('troco_e2e_authenticated') === 'true'
  );

  const [isLoadingSession, setIsLoadingSession] = useState(() => !isE2ESession);
  const [isAuthResolved, setIsAuthResolved] = useState(() => isE2ESession);
  const [isProfileLoading, setIsProfileLoading] = useState(() => !isE2ESession);
  const [isUserBanned, setIsUserBanned] = useState(false);
  const [bannedReason, setBannedReason] = useState('');
  const [skills, setSkills] = useState(() => profile?.skills || []);
  const [equipment, setEquipment] = useState(() => profile?.equipment || []);
  const [topUpCelebration, setTopUpCelebration] = useState(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isWelcomeCelebrationOpen, setIsWelcomeCelebrationOpen] = useState(false);
  const [isWelcomeGiftModalOpen, setIsWelcomeGiftModalOpen] = useState(false);

  const setIsAuthenticated = useCallback((value) => {
    useAuthStore.setState({ isAuthenticated: value });
  }, []);

  // Verrou d'urgence anti-boucle CGU / RGPD : persistance session immédiate
  const [cguDismissed, setCguDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.sessionStorage?.getItem('troco_cgu_dismissed') === 'true' ||
             window.localStorage?.getItem('troco_cgu_dismissed') === 'true';
    }
    return false;
  });

  const cguBypassRef = useRef(
    typeof window !== 'undefined' &&
    (window.sessionStorage?.getItem('troco_cgu_dismissed') === 'true' ||
     window.localStorage?.getItem('troco_cgu_dismissed') === 'true')
  );

  const prevTokensRef = useRef(null);
  const prevEurosRef = useRef(null);
  const isInitialAuthSnapRef = useRef(true);

  // Initialisation devise géo-IP
  useEffect(() => {
    try {
      useWalletStore.getState().initializeGeoCurrency?.();
    } catch (_) { }
  }, []);

  // Nettoyage données démo au démarrage
  useEffect(() => {
    migrateLocalStorage();
  }, []);

  // Purge de sécurité du cache local si ancien mock détecté
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const checkMockInStorage = (storageObj) => {
        if (!storageObj) return false;
        for (let i = 0; i < storageObj.length; i++) {
          const key = storageObj.key(i);
          const val = key ? storageObj.getItem(key) : null;
          if (
            (key && (key.includes('demo_mateopolo') || key.includes('admin_uid'))) ||
            (val && (val.includes('demo_mateopolo') || val.includes('admin_uid')))
          ) {
            return true;
          }
        }
        return false;
      };

      if (checkMockInStorage(window.localStorage) || checkMockInStorage(window.sessionStorage)) {
        window.localStorage?.clear();
        window.sessionStorage?.clear();
      }
    } catch (_) { }
  }, []);

  // Écoute et synchronisation en temps réel Firebase Auth & users/{uid}
  useEffect(() => {
    const isE2E = typeof window !== 'undefined' && (
      window.__E2E__ === true ||
      window.localStorage?.getItem('troco_e2e_authenticated') === 'true'
    );
    const sessionStartTime = Date.now();
    const finishSessionLoading = () => {
      if (isE2E) {
        setIsLoadingSession(false);
        setIsProfileLoading(false);
        return;
      }
      const elapsed = Date.now() - sessionStartTime;
      const remaining = Math.max(0, 2500 - elapsed);
      setTimeout(() => {
        setIsLoadingSession(false);
        setIsProfileLoading(false);
      }, remaining);
    };

    let unsubDoc = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubDoc) {
        unsubDoc();
        unsubDoc = null;
      }

      if (firebaseUser) {
        const uid = firebaseUser.uid;
        const userDocRef = doc(db, 'users', uid);

        unsubDoc = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();

            // Protection bannissement
            if (data.isBanned) {
              setIsUserBanned(true);
              setBannedReason(data.bannedReason || "Votre compte a été suspendu par l'administration Troco suite à un non-respect des règles de la communauté.");
              try { await signOut(auth); } catch (_) { }
              clearSessionFlags();
              storage.remove('troco_user_profile');
              setIsAuthenticated(false);
              return;
            }

            const rawTokens = data.trocoTokens ?? data.tokens;
            const rawEuros = data.euroBalance ?? data.walletBalanceFiat ?? data.balance;
            const newTokens = rawTokens !== undefined && rawTokens !== null ? Number(rawTokens) : null;
            const newEuros = rawEuros !== undefined && rawEuros !== null ? Number(Number(rawEuros).toFixed(2)) : null;

            const isClaimed = Boolean(data.welcomeBonusClaimed || data.onboardingCompleted || profile?.welcomeBonusClaimed || profile?.onboardingCompleted);

            if (!isInitialAuthSnapRef.current && !isClaimed) {
              if (prevTokensRef.current !== null && newTokens !== null && newTokens > prevTokensRef.current) {
                const gained = newTokens - prevTokensRef.current;
                haptics.success();
                playBetclicBalanceSound(true);
                setTopUpCelebration({
                  title: `+${gained} Jeton${gained > 1 ? 's' : ''} Troco reçus ! 🪙`,
                  subtitle: `Nouveau solde : ${newTokens} Jetons Troco`,
                });
                setTimeout(() => setTopUpCelebration(null), 4500);
              }

              if (prevEurosRef.current !== null && newEuros !== null && newEuros > prevEurosRef.current) {
                const gained = (newEuros - prevEurosRef.current).toFixed(2);
                haptics.success();
                playApplePaySound();
                setTopUpCelebration({
                  title: `+${gained} € reçus sur votre solde ! 💳`,
                  subtitle: `Nouveau solde : ${Number(newEuros).toFixed(2)} €`,
                });
                setTimeout(() => setTopUpCelebration(null), 4500);
              }
            }

            isInitialAuthSnapRef.current = false;
            if (newTokens !== null) prevTokensRef.current = newTokens;
            if (newEuros !== null) prevEurosRef.current = newEuros;

            const isUnsplashPlaceholder = typeof data.avatar === 'string' && data.avatar.includes('unsplash.com');
            const resolvedAvatar = (firebaseUser.photoURL && (!data.avatar || isUnsplashPlaceholder)) ? firebaseUser.photoURL : (data.avatar || firebaseUser.photoURL || '');
            const resolvedName = (firebaseUser.displayName && (!data.name || data.name === 'Membre Troco' || data.name === 'Utilisateur Troco')) ? firebaseUser.displayName : (data.name || firebaseUser.displayName || 'Membre Troco');

            const updatesToSync = {};
            if (firebaseUser.photoURL && (!data.avatar || isUnsplashPlaceholder)) {
              updatesToSync.avatar = firebaseUser.photoURL;
            }
            if (firebaseUser.displayName && (!data.name || data.name === 'Membre Troco' || data.name === 'Utilisateur Troco')) {
              updatesToSync.name = firebaseUser.displayName;
            }
            if (data.onboardingCompleted === undefined || data.onboardingCompleted === false) {
              updatesToSync.onboardingCompleted = true;
            }

            // Auto-guérison CGU admin
            const alreadyHealed = typeof window !== 'undefined' && window.sessionStorage?.getItem('troco_admin_cgu_healed') === 'true';
            const isGodAdminSnap = Boolean(data.isAdmin || data.role === 'admin');
            if (isGodAdminSnap && !data.cguAcceptedAt && !alreadyHealed) {
              const healedAt = new Date().toISOString();
              updatesToSync.cguAcceptedAt = serverTimestamp();
              updatesToSync.cguVersion = '2026.1';
              cguBypassRef.current = true;
              try {
                window.sessionStorage?.setItem('troco_admin_cgu_healed', 'true');
                window.sessionStorage?.setItem('troco_cgu_dismissed', 'true');
                window.localStorage?.setItem('troco_cgu_dismissed', 'true');
              } catch (_) { }
              setCguDismissed(true);
              setProfile(prev => ({ ...prev, cguAcceptedAt: healedAt, cguVersion: '2026.1' }));
              logger.info('[Auth] Self-heal: cguAcceptedAt patché pour le compte admin.');
            }

            if (Object.keys(updatesToSync).length > 0) {
              updateDoc(userDocRef, {
                ...updatesToSync,
                updatedAt: serverTimestamp(),
              }).catch((err) => logger.warn('[Auth] Auto-sync photo/onboarding in useAuthSession failed:', err));
            }

            const isGodAdmin = Boolean(data.isAdmin || data.role === 'admin');
            setProfile(prev => {
              const updated = {
                ...prev,
                ...data,
                euroBalance: newEuros !== null ? newEuros : (data.euroBalance ?? prev?.euroBalance ?? 0),
                trocoTokens: newTokens !== null ? newTokens : (data.trocoTokens ?? prev?.trocoTokens ?? 10),
                cguAcceptedAt: data.cguAcceptedAt || prev?.cguAcceptedAt || null,
                name: resolvedName,
                avatar: resolvedAvatar,
                onboardingCompleted: true,
                uid: uid,
                isAdmin: isGodAdmin ? true : Boolean(data.isAdmin),
                role: isGodAdmin ? 'admin' : (data.role || 'user'),
              };
              try {
                storage.setDebounced('troco_user_profile', updated);
              } catch (_) { }
              return updated;
            });

            const walletState = useWalletStore.getState();
            if (walletState?.setTrocoTokens && newTokens !== null) walletState.setTrocoTokens(newTokens);
            if (walletState?.setEuroBalance && newEuros !== null) walletState.setEuroBalance(newEuros);
            if (walletState?.setKycVerified) walletState.setKycVerified(Boolean(data.kycVerified));
            if (walletState?.setTrocoPlus) walletState.setTrocoPlus(Boolean(data.isTrocoPlus), data.trocoPlusPlan);

            if (Array.isArray(data.skills)) setSkills(data.skills);
            if (Array.isArray(data.equipment)) setEquipment(data.equipment);
            finishSessionLoading();
          } else {
            if (profile?.welcomeBonusClaimed === true || profile?.onboardingCompleted === true) {
              finishSessionLoading();
              return;
            }

            let isGodAdmin = false;
            try {
              const tokenRes = await firebaseUser.getIdTokenResult();
              isGodAdmin = Boolean(tokenRes?.claims?.admin);
            } catch (_) {}

            const defaultUserDoc = {
              uid: uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0].toUpperCase() || 'Utilisateur Troco',
              username: '@' + (firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'user').toLowerCase().replace(/\s+/g, ''),
              email: firebaseUser.email || '',
              phoneNumber: firebaseUser.phoneNumber || '',
              avatar: firebaseUser.photoURL || '',
              bio: 'Nouvel utilisateur sur Troco ! Prêt à partager mes compétences et échanger des services.',
              location: 'Paris, France',
              languages: ['FR'],
              skills: [],
              equipment: [],
              euroBalance: 0.00,
              trocoTokens: 10,
              dealsCompleted: 0,
              dealsInProgress: 0,
              rating: null,
              onboardingCompleted: true,
              welcomeBonusClaimed: true,
              loginMethod: firebaseUser.providerData?.[0]?.providerId || 'Email',
              cguAcceptedAt: isGodAdmin ? serverTimestamp() : null,
              cguVersion: isGodAdmin ? '2026.1' : undefined,
              isAdmin: isGodAdmin ? true : false,
              role: isGodAdmin ? 'admin' : 'user',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            try {
              await setDoc(userDocRef, defaultUserDoc, { merge: true });
              setProfile(prev => ({ ...prev, ...defaultUserDoc }));
              prevTokensRef.current = defaultUserDoc.trocoTokens;
              prevEurosRef.current = defaultUserDoc.euroBalance;
            } catch (e) {
              logger.warn('[Firestore] Failed to init user doc:', e);
            }
            finishSessionLoading();
          }
        }, (err) => {
          logger.warn('[Firestore] useAuthSession user snapshot error:', err);
          finishSessionLoading();
        });

        setIsAuthenticated(true);
        setSessionAuthenticated();
      } else {
        const isE2E = typeof window !== 'undefined' && (
          window.__E2E__ === true ||
          window.localStorage?.getItem('troco_e2e_authenticated') === 'true'
        );
        if (isE2E) {
          setIsAuthenticated(true);
          finishSessionLoading();
          setIsAuthResolved(true);
          return;
        }

        prevTokensRef.current = null;
        prevEurosRef.current = null;
        clearSessionFlags();
        setIsAuthenticated(false);
        setProfile(null);
        if (typeof onLogoutCleanup === 'function') {
          onLogoutCleanup();
        }
        finishSessionLoading();
      }
      setIsAuthResolved(true);
    });

    return () => {
      if (unsubDoc) unsubDoc();
      unsubscribeAuth();
    };
  }, [onLogoutCleanup, profile?.onboardingCompleted, profile?.welcomeBonusClaimed, setIsAuthenticated, setProfile]);

  // Détection et ouverture wizard onboarding
  useEffect(() => {
    if (!isAuthResolved || isLoadingSession || isProfileLoading) return;
    if (isAuthenticated && profile) {
      const needsOnboarding = profile.onboardingCompleted === false && profile.uid;
      if (needsOnboarding) {
        setIsOnboardingOpen(true);
      }
    }
  }, [isAuthResolved, isLoadingSession, isProfileLoading, isAuthenticated, profile]);

  // Déclencheur automatique de célébration de bienvenue à l'atterrissage sur le profil
  useEffect(() => {
    if (activeTab === 'profile' && isAuthenticated) {
      const alreadyCelebrated =
        profile?.welcomeBonusClaimed === true ||
        profile?.onboardingCompleted === true ||
        window.localStorage.getItem('troco_welcome_gift_celebrated') === 'true';
      if (!alreadyCelebrated && profile?.trocoTokens === 10 && (profile?.euroBalance === 0 || profile?.euroBalance === 0.00)) {
        window.localStorage.setItem('troco_welcome_gift_celebrated', 'true');
        playWelcomeGiftFanfare();
        setIsWelcomeGiftModalOpen(true);
      }
    }
  }, [activeTab, isAuthenticated, profile?.welcomeBonusClaimed, profile?.onboardingCompleted, profile?.trocoTokens, profile?.euroBalance]);

  const [pendingEmailLinkHref, setPendingEmailLinkHref] = useState(null);

  // Magic link email
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        setPendingEmailLinkHref(window.location.href);
      } else {
        setIsLoadingSession(true);
        signInWithEmailLink(auth, email, window.location.href)
          .then((result) => {
            window.localStorage.removeItem('emailForSignIn');
            const userName = result.user.email?.split('@')[0].toUpperCase() || 'UTILISATEUR';
            const userHandle = '@' + (result.user.email?.split('@')[0] || 'user').toLowerCase().replace(/\s+/g, '');
            setProfile(prev => {
              const updated = { ...prev, loginMethod: 'Email Link', name: userName, username: userHandle, uid: result.user.uid };
              storage.setDebounced('troco_user_profile', updated);
              return updated;
            });
            setIsAuthenticated(true);
            setSessionAuthenticated();
          })
          .catch((err) => {
            logger.error('Magic link sign-in error:', err);
          })
          .finally(() => setIsLoadingSession(false));
      }
    }
  }, [setIsAuthenticated, setProfile]);

  const handleConfirmEmailLink = useCallback(async (email) => {
    if (!email || !pendingEmailLinkHref) return;
    try {
      setIsLoadingSession(true);
      const result = await signInWithEmailLink(auth, email.trim(), pendingEmailLinkHref);
      window.localStorage.removeItem('emailForSignIn');
      setPendingEmailLinkHref(null);
      const userName = result.user.email?.split('@')[0].toUpperCase() || 'UTILISATEUR';
      const userHandle = '@' + (result.user.email?.split('@')[0] || 'user').toLowerCase().replace(/\s+/g, '');
      setProfile(prev => {
        const updated = { ...prev, loginMethod: 'Email Link', name: userName, username: userHandle, uid: result.user.uid };
        storage.setDebounced('troco_user_profile', updated);
        return updated;
      });
      setIsAuthenticated(true);
      setSessionAuthenticated();
    } catch (err) {
      logger.error('Confirm magic link error:', err);
    } finally {
      setIsLoadingSession(false);
    }
  }, [pendingEmailLinkHref, setIsAuthenticated, setProfile]);

  const handleCancelEmailLink = useCallback(() => {
    setPendingEmailLinkHref(null);
  }, []);

  const handleKycComplete = useCallback((kycData) => {
    setProfile(prev => {
      const updated = {
        ...prev,
        kycStatus: 'verified',
        isIdentityVerified: true,
        ...(kycData || {})
      };
      storage.setDebounced('troco_user_profile', updated);
      return updated;
    });
  }, [setProfile]);

  return {
    profile,
    setProfile,
    profileDraft,
    setProfileDraft,
    isEditingProfile,
    setIsEditingProfile,
    isAuthenticated,
    setIsAuthenticated,
    isAuthResolved,
    isLoadingSession,
    setIsLoadingSession,
    isProfileLoading,
    isUserBanned,
    setIsUserBanned,
    bannedReason,
    setBannedReason,
    skills,
    setSkills,
    equipment,
    setEquipment,
    cguDismissed,
    setCguDismissed,
    cguBypassRef,
    topUpCelebration,
    setTopUpCelebration,
    isOnboardingOpen,
    setIsOnboardingOpen,
    isWelcomeCelebrationOpen,
    setIsWelcomeCelebrationOpen,
    isWelcomeGiftModalOpen,
    setIsWelcomeGiftModalOpen,
    saveMessage,
    setSaveMessage,
    addSkill,
    removeSkill,
    addEquipment,
    removeEquipment,
    addPortfolioImage,
    removePortfolioImage,
    pendingEmailLinkHref,
    handleConfirmEmailLink,
    handleCancelEmailLink,
    handleKycComplete,
  };
};

export default useAuthSession;
