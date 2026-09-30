import { useCallback } from 'react';
import { db, auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { gdprService } from '../services/gdprService';
import { clearTrocoLocalStorage } from '../utils/clearTrocoLocalStorage';
import { clearSessionFlags } from '../utils/sessionFlags';
import * as storage from '../utils/storage';
import { playWelcomeGiftFanfare } from '../utils/audioService';
import logger from '../utils/logger';

/**
 * useAccountActions - Hook centralisant les actions critiques sur le compte utilisateur :
 * - Suppression définitive conforme RGPD (handleDeleteAccount)
 * - Validation et persistance des CGU (handleAcceptCgu)
 * - Finalisation de l'onboarding et attribution du cadeau de bienvenue (handleCompleteOnboarding)
 * - Déconnexion propre de la session (handleSignOut)
 */
export const useAccountActions = ({
  profile,
  setProfile,
  setProfileDraft,
  setSkills,
  setEquipment,
  setCguDismissed,
  setSaveMessage,
  setIsOnboardingOpen,
  setIsWelcomeGiftModalOpen,
  setIsAuthenticated,
  setSelectedChat,
  setSelectedListing,
  endCall,
} = {}) => {

  const handleDeleteAccount = useCallback(async (options = {}) => {
    try {
      await gdprService.deleteUserCompletely({ immediate: Boolean(options?.immediate) });
      clearTrocoLocalStorage();
      if (auth.currentUser) {
        await signOut(auth);
      }
      window.location.reload();
    } catch (err) {
      logger.error('Account deletion error:', err);
      clearTrocoLocalStorage();
      if (auth.currentUser) {
        await signOut(auth);
      }
      window.location.reload();
    }
  }, []);

  const handleAcceptCgu = useCallback(async ({ cguVersion, acceptedAt } = {}) => {
    try {
      window.sessionStorage?.setItem('troco_cgu_dismissed', 'true');
      window.localStorage?.setItem('troco_cgu_dismissed', 'true');
    } catch (_) { }
    if (typeof setCguDismissed === 'function') setCguDismissed(true);

    const now = acceptedAt || new Date().toISOString();
    if (typeof setProfile === 'function') {
      setProfile(prev => {
        const updated = { ...prev, cguAcceptedAt: now, cguVersion: cguVersion || '2026.1' };
        storage.setDebounced('troco_user_profile', updated);
        return updated;
      });
    }

    const targetUid = auth.currentUser?.uid || profile?.uid;
    if (targetUid && db) {
      try {
        await updateDoc(doc(db, 'users', String(targetUid)), {
          cguAcceptedAt: serverTimestamp(),
          cguVersion: cguVersion || '2026.1',
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        logger.warn('[Firestore] CGU acceptance update failed:', e);
      }
    }
  }, [profile?.uid, setCguDismissed, setProfile]);

  const handleCompleteOnboarding = useCallback(async (completedData) => {
    const finalEuroBalance = Number(profile?.euroBalance ?? 0.00);
    const finalTokens = Number(profile?.trocoTokens ?? 10);
    const updatedProfile = {
      ...profile,
      ...completedData,
      euroBalance: finalEuroBalance,
      trocoTokens: finalTokens,
      onboardingCompleted: true,
      dealsCompleted: profile?.dealsCompleted ?? 0,
      dealsInProgress: profile?.dealsInProgress ?? 0,
      rating: profile?.rating ?? null,
    };
    if (typeof setProfile === 'function') setProfile(updatedProfile);
    if (typeof setProfileDraft === 'function') setProfileDraft(updatedProfile);
    if (Array.isArray(completedData.skills) && typeof setSkills === 'function') setSkills(completedData.skills);
    if (Array.isArray(completedData.equipment) && typeof setEquipment === 'function') setEquipment(completedData.equipment);
    storage.setDebounced('troco_user_profile', updatedProfile);
    storage.setSync('troco_welcome_gift_celebrated', 'true');

    const uid = profile?.uid || auth.currentUser?.uid;
    if (uid && db) {
      try {
        await setDoc(doc(db, 'users', uid), {
          ...completedData,
          euroBalance: finalEuroBalance,
          trocoTokens: finalTokens,
          onboardingCompleted: true,
          dealsCompleted: profile?.dealsCompleted ?? 0,
          dealsInProgress: profile?.dealsInProgress ?? 0,
          rating: profile?.rating ?? null,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        if (typeof setSaveMessage === 'function') {
          setSaveMessage('🎁 +10 Jetons Troco offerts ! Bienvenue sur Troco.');
          setTimeout(() => setSaveMessage(''), 5000);
        }
      } catch (e) {
        logger.warn('[Firestore] Failed to save onboarding to Firestore:', e);
        if (typeof setSaveMessage === 'function') {
          setSaveMessage(`❌ Erreur : Échec de la sauvegarde du profil (${e?.message || 'Erreur réseau'})`);
          setTimeout(() => setSaveMessage(''), 5000);
        }
      }
    } else {
      if (typeof setSaveMessage === 'function') {
        setSaveMessage('🎁 +10 Jetons Troco offerts ! Bienvenue sur Troco.');
        setTimeout(() => setSaveMessage(''), 5000);
      }
    }
    if (typeof setIsOnboardingOpen === 'function') setIsOnboardingOpen(false);
    playWelcomeGiftFanfare();
    if (typeof setIsWelcomeGiftModalOpen === 'function') setIsWelcomeGiftModalOpen(true);
  }, [profile, setProfile, setProfileDraft, setSkills, setEquipment, setSaveMessage, setIsOnboardingOpen, setIsWelcomeGiftModalOpen]);

  const handleSignOut = useCallback(async () => {
    if (auth.currentUser) {
      try { await signOut(auth); } catch (_) { }
    }
    clearSessionFlags();
    storage.remove('troco_user_profile');
    if (typeof setIsAuthenticated === 'function') setIsAuthenticated(false);
    if (typeof setSelectedChat === 'function') setSelectedChat(null);
    if (typeof setSelectedListing === 'function') setSelectedListing(null);
    if (typeof endCall === 'function') endCall();
  }, [endCall, setIsAuthenticated, setSelectedChat, setSelectedListing]);

  return {
    handleDeleteAccount,
    handleAcceptCgu,
    handleCompleteOnboarding,
    handleSignOut,
  };
};

export default useAccountActions;
