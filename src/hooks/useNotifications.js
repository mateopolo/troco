import { useState, useEffect, useCallback } from 'react';
import { db, auth } from '../firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { useFeedStore } from '../stores/useFeedStore';
import * as storage from '../utils/storage';
import logger from '../utils/logger';

/**
 * useNotifications - Hook centralisant l'écoute temps réel des transactions de l'utilisateur
 * et des notifications financières reçues (alimentant la TransactionSuccessModal).
 *
 * @param {Object} options
 * @param {Object} [options.profile]
 */
export const useNotifications = ({ profile } = {}) => {
  const [userTransactions, setUserTransactions] = useState([]);
  const [transactionSuccessModalConfig, setTransactionSuccessModalConfig] = useState({
    isOpen: false,
    type: 'sent', // 'sent' | 'received'
    amount: 1,
    currency: 'tokens', // 'tokens' | 'fiat'
    partnerName: '',
    notificationId: null,
  });

  const handleCloseTransactionSuccessModal = useCallback(async () => {
    const notifId = transactionSuccessModalConfig.notificationId;
    const currentUid = profile?.uid || profile?.id || auth.currentUser?.uid;
    if (notifId && currentUid && db) {
      try {
        const notifRef = doc(db, 'users', currentUid, 'notifications', notifId);
        await updateDoc(notifRef, {
          read: true,
          readAt: serverTimestamp(),
        });
      } catch (err) {
        logger.warn('Erreur marquage notification lue:', err);
      }
    }
    setTransactionSuccessModalConfig(prev => ({ ...prev, isOpen: false, notificationId: null }));
  }, [transactionSuccessModalConfig.notificationId, profile?.uid, profile?.id]);

  // 1. Écoute temps réel des transactions de l'utilisateur sur Firestore
  useEffect(() => {
    const uid = profile?.uid || auth.currentUser?.uid;
    if (!uid) return;
    try {
      useFeedStore.getState().loadSavedFilters?.(uid);
    } catch (_) {}

    try {
      const qTx = query(
        collection(db, 'transactions'),
        where('userId', '==', uid),
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
      }, (err) => logger.warn('[Firestore] Transactions listener:', err));
      return () => unsub();
    } catch (e) {
      logger.warn('Transactions listener error:', e);
    }
  }, [profile?.uid]);

  // 2. Écoute des notifications temps réel non lues (pour le receveur)
  useEffect(() => {
    const currentUid = profile?.uid || profile?.id || auth.currentUser?.uid;
    if (!currentUid || !db) return;

    try {
      const notifsCol = collection(db, 'users', currentUid, 'notifications');
      const qNotifs = query(notifsCol, where('read', '==', false));

      const unsubNotifs = onSnapshot(qNotifs, (snapshot) => {
        if (!snapshot.empty) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
              const notifData = change.doc.data();
              const TOKEN_NOTIF_TYPES = ['payment_received', 'tokens_received'];
              if (notifData && TOKEN_NOTIF_TYPES.includes(notifData.type) && notifData.read === false) {
                const partner = notifData.fromName || notifData.senderName || notifData.userName || '';
                setTransactionSuccessModalConfig({
                  isOpen: true,
                  type: 'received',
                  amount: notifData.amount || 1,
                  currency: notifData.currency === 'fiat' || notifData.currency === 'EUR' ? 'fiat' : 'tokens',
                  partnerName: partner,
                  notificationId: change.doc.id,
                });
              }
            }
          });
        }
      }, (err) => {
        logger.warn('[Notifications] Erreur écoute notifications temps réel:', err);
      });

      return () => unsubNotifs();
    } catch (e) {
      logger.warn('[Notifications] Listener setup error:', e);
    }
  }, [profile?.uid, profile?.id]);

  return {
    userTransactions,
    setUserTransactions,
    transactionSuccessModalConfig,
    setTransactionSuccessModalConfig,
    handleCloseTransactionSuccessModal,
  };
};

export default useNotifications;
