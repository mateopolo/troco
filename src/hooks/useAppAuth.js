import logger from '../utils/logger';
import { useState, useEffect, useCallback } from 'react';
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

/**
 * Hook centralisant l'état d'authentification, la synchronisation du profil Firestore,
 * la vérification de session et la gestion du bannissement.
 */
export const useAppAuth = () => {
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
    addSocialLink,
    removeSocialLink,
    setSocialLinks,
  } = useAuthStore();

  const isE2ESession = typeof window !== 'undefined' && (
    window.__E2E__ === true ||
    window.localStorage?.getItem('troco_e2e_authenticated') === 'true' ||
    window.localStorage?.getItem('troco_auth_session') === 'true'
  );

  const [isLoadingSession, setIsLoadingSession] = useState(() => !isE2ESession);
  const [isAuthResolved, setIsAuthResolved] = useState(() => isE2ESession);
  const [isProfileLoading, setIsProfileLoading] = useState(() => !isE2ESession);
  const [isUserBanned, setIsUserBanned] = useState(false);
  const [bannedReason, setBannedReason] = useState('');
  const setIsAuthenticated = useCallback((value) => {
    useAuthStore.setState({ isAuthenticated: value });
  }, []);

  // 1. Écoute temps-réel de l'état Firebase Auth & synchronisation Firestore
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let unsubscribeFirestore = () => {};
    let unsubscribeBalance = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        useAuthStore.setState({ isAuthenticated: true });
        setSessionAuthenticated();
        setIsProfileLoading(true);

        // Abonnement temps réel explicite du solde et jetons dans le store Zustand
        try {
          unsubscribeBalance = useWalletStore.getState().subscribeToUserBalance(user.uid);
        } catch (_) { }

        // Vérification de lien email de connexion si applicable
        if (isSignInWithEmailLink(auth, window.location.href)) {
          let email = window.localStorage.getItem('emailForSignIn');
          if (!email) {
            email = window.prompt('Veuillez confirmer votre email pour finaliser la connexion :');
          }
          if (email) {
            try {
              await signInWithEmailLink(auth, email, window.location.href);
              window.localStorage.removeItem('emailForSignIn');
            } catch (err) {
              logger.warn('[Auth] Email link sign in error:', err);
            }
          }
        }

        // Mise à jour immédiate du store avec l'UID Firebase Auth valide
        setProfile((prev) => ({
          ...prev,
          uid: user.uid,
          email: user.email || prev.email,
        }));

        // Écoute continue du document utilisateur Firestore
        const userDocRef = doc(db, 'users', user.uid);
        unsubscribeFirestore = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            
            // Vérification de bannissement
            if (data.isBanned) {
              setIsUserBanned(true);
              setBannedReason(data.bannedReason || 'Compte suspendu pour non-respect des CGU.');
            } else {
              setIsUserBanned(false);
              setBannedReason('');
            }

            // Détection et synchronisation de la photo de profil native Gmail / Auth
            const isUnsplashPlaceholder = typeof data.avatar === 'string' && data.avatar.includes('unsplash.com');
            const resolvedAvatar = (user.photoURL && (!data.avatar || isUnsplashPlaceholder)) ? user.photoURL : (data.avatar || user.photoURL || '');
            const resolvedName = (user.displayName && (!data.name || data.name === 'Membre Troco' || data.name === 'Utilisateur Troco')) ? user.displayName : (data.name || user.displayName || 'Membre Troco');

            // Synchronisation vers Firestore si la photo ou les CGU/onboarding manquent
            const updatesToSync = {};
            if (user.photoURL && (!data.avatar || isUnsplashPlaceholder)) {
              updatesToSync.avatar = user.photoURL;
            }
            if (user.displayName && (!data.name || data.name === 'Membre Troco' || data.name === 'Utilisateur Troco')) {
              updatesToSync.name = user.displayName;
            }
            if (data.onboardingCompleted === undefined || data.onboardingCompleted === false) {
              updatesToSync.onboardingCompleted = true;
            }
            if (Object.keys(updatesToSync).length > 0) {
              updateDoc(userDocRef, {
                ...updatesToSync,
                updatedAt: serverTimestamp(),
              }).catch((err) => logger.warn('[Auth] Auto-sync photo/onboarding to Firestore failed:', err));
            }

            // Mise à jour du profil local avec l'UID garanti (pas de fallback artificiel à 100€)
            const newTokens = data.trocoTokens !== undefined ? Number(data.trocoTokens) : 10;
            const newEuros = data.euroBalance !== undefined ? Number(data.euroBalance) : 0;
            const isWelcomeClaimed = Boolean(data.welcomeBonusClaimed || data.onboardingCompleted);

            setProfile((prev) => ({
              ...prev,
              ...data,
              trocoTokens: newTokens,
              euroBalance: newEuros,
              onboardingCompleted: true, // Garanti pour les utilisateurs existants
              welcomeBonusClaimed: isWelcomeClaimed || Boolean(prev?.welcomeBonusClaimed),
              uid: user.uid,
              email: user.email || data.email || prev.email,
              name: resolvedName,
              avatar: resolvedAvatar,
            }));

            // Mise à jour atomique du store Zustand Portefeuille
            try {
              const { setTrocoTokens, setEuroBalance, setKycVerified } = useWalletStore.getState();
              if (setTrocoTokens) setTrocoTokens(newTokens);
              if (setEuroBalance) setEuroBalance(newEuros);
              if (setKycVerified) setKycVerified(Boolean(data.kycVerified));
            } catch (_) { }
          } else {
            // Création du profil initial Firestore avec verrou welcomeBonusClaimed et onboardingCompleted: true
            const initialData = {
              uid: user.uid,
              name: user.displayName || profile?.name || 'Membre Troco',
              username: '@' + (user.displayName || user.email?.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9_]/g, ''),
              email: user.email || profile?.email || '',
              avatar: user.photoURL || profile?.avatar || '',
              trocoTokens: Number(profile?.trocoTokens ?? 10),
              euroBalance: Number(profile?.euroBalance ?? 0),
              welcomeBonusClaimed: true,
              onboardingCompleted: true,
              loginMethod: user.providerData?.[0]?.providerId || 'Google',
              cguAcceptedAt: serverTimestamp(),
              socialLinks: profile?.socialLinks || ['https://github.com/mateopolo', 'https://linkedin.com/in/mateopolo'],
              kycVerified: false,
              isBanned: false,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            setDoc(userDocRef, initialData, { merge: true }).catch((e) =>
              logger.warn('[Auth] Initial profile sync:', e)
            );

            setProfile((prev) => ({
              ...prev,
              ...initialData,
            }));
          }
          setIsProfileLoading(false);
          setIsLoadingSession(false);
        }, (error) => {
          logger.warn('[Firestore] Profile listener error:', error);
          setIsProfileLoading(false);
          setIsLoadingSession(false);
        });
      } else {
        const isE2E = typeof window !== 'undefined' && (
          window.__E2E__ === true ||
          window.localStorage?.getItem('troco_e2e_authenticated') === 'true' ||
          window.localStorage?.getItem('troco_auth_session') === 'true'
        );
        if (isE2E) {
          useAuthStore.setState({ isAuthenticated: true });
          setIsLoadingSession(false);
          setIsProfileLoading(false);
          setIsAuthResolved(true);
          return;
        }

        unsubscribeFirestore();
        unsubscribeBalance();
        clearSessionFlags();
        useAuthStore.setState({ isAuthenticated: false });
        setIsProfileLoading(false);
        setIsLoadingSession(false);
      }
      setIsAuthResolved(true);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeFirestore();
      unsubscribeBalance();
    };
  }, [setProfile]);

  // 2. Action de déconnexion
  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
      useAuthStore.getState().resetToDefault();
      clearSessionFlags();
      localStorage.removeItem('troco_user_profile');
    } catch (error) {
      logger.error('[Auth] Logout error:', error);
    }
  }, []);

  // 3. Mise à jour de vérification KYC
  const handleKycComplete = useCallback(async () => {
    const updated = {
      ...profile,
      kycVerified: true,
      kycVerifiedAt: new Date().toISOString(),
    };
    setProfile(updated);
    setProfileDraft(updated);

    if (auth.currentUser?.uid) {
      try {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          kycVerified: true,
          kycVerifiedAt: serverTimestamp(),
        });
      } catch (err) {
        logger.warn('[Firestore] Update KYC error:', err);
      }
    }
  }, [profile, setProfile, setProfileDraft]);

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
    setIsAuthResolved,
    isLoadingSession,
    setIsLoadingSession,
    isProfileLoading,
    setIsProfileLoading,
    isUserBanned,
    setIsUserBanned,
    bannedReason,
    setBannedReason,
    saveMessage,
    setSaveMessage,
    handleLogout,
    handleKycComplete,
    addSkill,
    removeSkill,
    addEquipment,
    removeEquipment,
    addPortfolioImage,
    removePortfolioImage,
    addSocialLink,
    removeSocialLink,
    setSocialLinks,
  };
};

export default useAppAuth;
