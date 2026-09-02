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

  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isUserBanned, setIsUserBanned] = useState(false);
  const [bannedReason, setBannedReason] = useState('');

  // 1. Écoute temps-réel de l'état Firebase Auth & synchronisation Firestore
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let unsubscribeFirestore = () => {};
    let unsubscribeBalance = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        useAuthStore.setState({ isAuthenticated: true });

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
              console.warn('[Auth] Email link sign in error:', err);
            }
          }
        }

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

            // Mise à jour du profil local
            const newTokens = data.trocoTokens !== undefined ? Number(data.trocoTokens) : 12;
            const newEuros = data.euroBalance !== undefined ? Number(data.euroBalance) : 100;

            setProfile((prev) => ({
              ...prev,
              ...data,
              trocoTokens: newTokens,
              euroBalance: newEuros,
              uid: user.uid,
              email: user.email || data.email || prev.email,
              name: data.name || user.displayName || prev.name,
              avatar: data.avatar || user.photoURL || prev.avatar,
            }));

            // Mise à jour atomique du store Zustand Portefeuille
            try {
              const { setTrocoTokens, setEuroBalance, setKycVerified } = useWalletStore.getState();
              if (setTrocoTokens) setTrocoTokens(newTokens);
              if (setEuroBalance) setEuroBalance(newEuros);
              if (setKycVerified) setKycVerified(Boolean(data.kycVerified));
            } catch (_) { }
          } else {
            // Création du profil initial Firestore
            const initialData = {
              uid: user.uid,
              name: user.displayName || profile.name || 'Membre Troco',
              email: user.email || profile.email || '',
              avatar: user.photoURL || profile.avatar || '',
              trocoTokens: profile.trocoTokens || 12,
              euroBalance: profile.euroBalance || 100,
              socialLinks: profile.socialLinks || ['https://github.com/mateopolo', 'https://linkedin.com/in/mateopolo'],
              kycVerified: false,
              isBanned: false,
              createdAt: serverTimestamp(),
            };
            setDoc(userDocRef, initialData, { merge: true }).catch((e) =>
              console.warn('[Auth] Initial profile sync:', e)
            );
          }
          setIsLoadingSession(false);
        }, (error) => {
          console.warn('[Firestore] Profile listener error:', error);
          setIsLoadingSession(false);
        });
      } else {
        unsubscribeFirestore();
        unsubscribeBalance();
        setIsLoadingSession(false);
      }
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
      localStorage.removeItem('troco_is_authenticated');
      localStorage.removeItem('troco_user_profile');
    } catch (error) {
      console.error('[Auth] Logout error:', error);
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
        console.warn('[Firestore] Update KYC error:', err);
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
    setIsAuthenticated: (val) => useAuthStore.setState({ isAuthenticated: val }),
    isLoadingSession,
    setIsLoadingSession,
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
