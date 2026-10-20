import { useState, useEffect, useCallback, useRef } from 'react';
import { db, auth } from '../firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { playApplePaySound, playBetclicBalanceSound } from '../utils/audioService';
import { haptics } from '../utils/haptics';
import { useUIStore } from '../stores/useUIStore';
import { useFeedStore } from '../stores/useFeedStore';
import * as storage from '../utils/storage';
import logger from '../utils/logger';

/**
 * useTransactionNotifications - Hook centralisant les alertes sonores, toasts de célébration,
 * bannières et modales de succès liées aux transactions financières et transferts de jetons.
 *
 * @param {Object} options
 * @param {Object} [options.profile] - Profil utilisateur connecté
 * @param {Object} [options.authInstance] - Instance Firebase Auth
 * @param {Object} [options.dbInstance] - Instance Firestore
 * @param {Function} [options.safeTimeout] - Gestionnaire de timeout sécurisé
 */
export const useTransactionNotifications = ({
  profile,
  authInstance = auth,
  dbInstance = db,
  safeTimeout = (fn, delay) => {
    const id = setTimeout(fn, delay);
    return () => clearTimeout(id);
  },
} = {}) => {
  // 1. Liste des transactions utilisateur synchronisées depuis Firestore
  const [userTransactions, setUserTransactions] = useState([]);

  // 2. Configuration de la modale immersive de confirmation
  const [transactionSuccessModalConfig, setTransactionSuccessModalConfig] = useState({
    isOpen: false,
    type: 'sent', // 'sent' | 'received'
    amount: 1,
    currency: 'tokens', // 'tokens' | 'fiat'
    partnerName: '',
    notificationId: null,
  });

  // 3. État du Toast / Bannière de célébration dynamique (Top-Up / Transfert)
  const [topUpCelebration, setTopUpCelebrationLocal] = useState(null);
  const celebrationTimeoutRef = useRef(null);

  // Synchronisation bidirectionnelle avec useUIStore
  const setTopUpCelebration = useCallback((celebration) => {
    setTopUpCelebrationLocal(celebration);
    try {
      useUIStore.getState().setTopUpCelebration?.(celebration);
    } catch (_) { }
  }, []);

  /**
   * Déclenche un Toast de célébration avec vibration haptique et alerte sonore.
   */
  const triggerCelebrationToast = useCallback(({
    title,
    subtitle,
    currency = 'tokens',
    playSound = true,
    duration = 4500,
  }) => {
    if (playSound) {
      haptics.success();
      const isFiat = currency === 'fiat' || currency === 'EUR' || currency === 'eur' || currency === 'euros';
      if (isFiat) {
        playApplePaySound();
      } else {
        playBetclicBalanceSound(true);
      }
    }

    setTopUpCelebration({ title, subtitle });

    if (celebrationTimeoutRef.current) {
      clearTimeout(celebrationTimeoutRef.current);
    }
    celebrationTimeoutRef.current = setTimeout(() => {
      setTopUpCelebration(null);
      celebrationTimeoutRef.current = null;
    }, duration);
  }, [setTopUpCelebration]);

  /**
   * Affiche la notification complète de transaction (Son + Toast de célébration + Modale immersive).
   */
  const notifyTransactionSuccess = useCallback(({
    type = 'sent',
    amount = 1,
    currency = 'tokens',
    partnerName = '',
    notificationId = null,
    playSound = true,
    showToast = true,
    showModal = true,
  } = {}) => {
    const isFiat = currency === 'fiat' || currency === 'EUR' || currency === 'eur' || currency === 'euros';
    const isTokens = !isFiat;
    const numAmount = Number(amount) || 1;
    const symbol = isTokens ? `Jeton${numAmount > 1 ? 's' : ''} Troco 🪙` : '€ 💳';

    // 1. Déclenchement de l'alerte sonore et vibration
    if (playSound) {
      haptics.success();
      if (isTokens) {
        playBetclicBalanceSound(true);
      } else {
        playApplePaySound();
      }
    }

    // 2. Déclenchement du Toast de célébration Dynamic Island
    if (showToast) {
      const toastTitle = type === 'received'
        ? `+${numAmount} ${symbol} reçus !`
        : `${numAmount} ${symbol} transférés avec succès !`;
      const toastSubtitle = partnerName
        ? `Interlocuteur : ${partnerName}`
        : 'Transaction validée et sécurisée';

      triggerCelebrationToast({
        title: toastTitle,
        subtitle: toastSubtitle,
        currency: isTokens ? 'tokens' : 'fiat',
        playSound: false, // Déjà joué ci-dessus
      });
    }

    // 3. Déclenchement de la modale immersive
    if (showModal) {
      setTransactionSuccessModalConfig({
        isOpen: true,
        type,
        amount: numAmount,
        currency: isTokens ? 'tokens' : 'fiat',
        partnerName,
        notificationId,
      });
    }
  }, [triggerCelebrationToast]);

  /**
   * Ferme la modale immersive et acquitte la notification dans Firestore si applicable.
   */
  const handleCloseTransactionSuccessModal = useCallback(async () => {
    const notifId = transactionSuccessModalConfig.notificationId;
    const currentUid = profile?.uid || profile?.id || authInstance?.currentUser?.uid;

    if (notifId && currentUid && dbInstance) {
      try {
        const notifRef = doc(dbInstance, 'users', String(currentUid), 'notifications', notifId);
        await updateDoc(notifRef, {
          read: true,
          readAt: serverTimestamp(),
        });
      } catch (err) {
        logger.warn('[useTransactionNotifications] Erreur marquage notification lue:', err);
      }
    }

    setTransactionSuccessModalConfig(prev => ({
      ...prev,
      isOpen: false,
      notificationId: null,
    }));
  }, [transactionSuccessModalConfig.notificationId, profile?.uid, profile?.id, authInstance, dbInstance]);

  // 4. Écoute temps réel des transactions de l'utilisateur sur Firestore
  useEffect(() => {
    const uid = profile?.uid || profile?.id || authInstance?.currentUser?.uid;
    if (!uid || !dbInstance) return;

    try {
      useFeedStore.getState().loadSavedFilters?.(uid);
    } catch (_) { }

    try {
      const qTx = query(
        collection(dbInstance, 'transactions'),
        where('userId', '==', String(uid)),
        orderBy('createdAt', 'desc')
      );

      const unsub = onSnapshot(qTx, (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setUserTransactions(list);
          try {
            storage.setDebounced('troco_user_transactions', list);
          } catch (_) { }
        }
      }, (err) => {
        logger.warn('[useTransactionNotifications] Erreur Firestore transactions listener:', err);
      });

      return () => unsub();
    } catch (e) {
      logger.warn('[useTransactionNotifications] Erreur initialisation transactions listener:', e);
    }
  }, [profile?.uid, profile?.id, authInstance, dbInstance]);

  // 5. Écoute temps réel des notifications financières reçues (alimentant la célébration et la modale)
  useEffect(() => {
    const currentUid = profile?.uid || profile?.id || authInstance?.currentUser?.uid;
    if (!currentUid || !dbInstance) return;

    try {
      const notifsCol = collection(dbInstance, 'users', String(currentUid), 'notifications');
      const qNotifs = query(notifsCol, where('read', '==', false));

      const unsubNotifs = onSnapshot(qNotifs, (snapshot) => {
        if (!snapshot.empty) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
              const notifData = change.doc.data();
              const TOKEN_NOTIF_TYPES = ['payment_received', 'tokens_received'];

              if (notifData && TOKEN_NOTIF_TYPES.includes(notifData.type) && notifData.read === false) {
                const partner = notifData.fromName || notifData.senderName || notifData.userName || '';
                notifyTransactionSuccess({
                  type: 'received',
                  amount: notifData.amount || 1,
                  currency: notifData.currency === 'fiat' || notifData.currency === 'EUR' ? 'fiat' : 'tokens',
                  partnerName: partner,
                  notificationId: change.doc.id,
                  playSound: true,
                  showToast: true,
                  showModal: true,
                });
              }
            }
          });
        }
      }, (err) => {
        logger.warn('[useTransactionNotifications] Erreur écoute notifications temps réel:', err);
      });

      return () => unsubNotifs();
    } catch (e) {
      logger.warn('[useTransactionNotifications] Erreur setup notifications listener:', e);
    }
  }, [profile?.uid, profile?.id, authInstance, dbInstance, notifyTransactionSuccess]);

  // Nettoyage sécurisé du timeout au démontage
  useEffect(() => {
    return () => {
      if (celebrationTimeoutRef.current) {
        clearTimeout(celebrationTimeoutRef.current);
      }
    };
  }, []);

  return {
    userTransactions,
    setUserTransactions,
    transactionSuccessModalConfig,
    setTransactionSuccessModalConfig,
    handleCloseTransactionSuccessModal,
    topUpCelebration,
    setTopUpCelebration,
    triggerCelebrationToast,
    notifyTransactionSuccess,
    playApplePaySound,
    playBetclicBalanceSound,
  };
};

export default useTransactionNotifications;
