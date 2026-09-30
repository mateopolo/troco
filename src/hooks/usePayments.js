import { useCallback } from 'react';
import { db, auth } from '../firebase';
import {
  doc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp
} from 'firebase/firestore';
import { useCheckout } from './useCheckout';
import * as storage from '../utils/storage';
import { playApplePaySound } from '../utils/audioService';
import dealService from '../services/dealService';
import paymentService from '../services/paymentService';
import logger from '../utils/logger';

/**
 * usePayments - Hook centralisant la gestion des paiements, le traitement des succès
 * (Troco Plus, recharge cash, boost d'annonce, édition/création d'annonce, transferts de deals)
 * et l'orchestration du tunnel useCheckout.
 */
export const usePayments = ({
  profile,
  setProfile,
  setTopUpCelebration,
  setSaveMessage,
  setListings,
  setBoostMessage,
  isEditingListing,
  setIsEditingListing,
  editingOriginalListing,
  setEditingOriginalListing,
  setPublishedListing,
  setShowPublishedPopup,
  setSelectedListing,
  setPostStep,
  setPostDraft,
  defaultPostDraft,
  selectedChat,
  setUserTransactions,
  userTransactions = [],
  getListingDetail,
} = {}) => {

  const handlePaymentSuccess = useCallback(async (txData) => {
    const uid = profile?.uid || auth.currentUser?.uid;

    let updatedTrocoPlus = profile?.isTrocoPlus || false;
    let updatedSubscriptionPlan = profile?.subscriptionPlan || 'none';
    let updatedSubscriptionStartDate = profile?.subscriptionStartDate || null;
    let updatedSubscriptionRenewalDate = profile?.subscriptionRenewalDate || null;

    if (txData.mode === 'troco-plus') {
      updatedTrocoPlus = true;
      updatedSubscriptionPlan = txData.subscriptionPlan?.planKey || 'essential';
      updatedSubscriptionStartDate = txData.subscriptionStartDate || new Date().toISOString();
      updatedSubscriptionRenewalDate = txData.subscriptionRenewalDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      if (typeof setTopUpCelebration === 'function') {
        setTopUpCelebration({
          title: `+${txData.tokensPurchased} Jetons Troco !`,
          subtitle: `Abonnement ${txData.subscriptionPlan?.title || 'Troco Plus'} activé`,
          isTokens: true
        });
        setTimeout(() => setTopUpCelebration(null), 4500);
      }
      if (typeof setSaveMessage === 'function') {
        setSaveMessage(`⭐ Abonnement ${txData.subscriptionPlan?.title || 'Troco Plus'} activé avec succès ! +${txData.tokensPurchased} jetons crédités.`);
        setTimeout(() => setSaveMessage(''), 6000);
      }
    } else if (txData.mode === 'topup-cash') {
      const topUpAmount = Number(txData.cashTopUp) || 0;
      if (topUpAmount > 0) {
        if (typeof setProfile === 'function') {
          setProfile(prev => {
            const newBal = Number(((prev?.euroBalance || 0) + topUpAmount).toFixed(2));
            const updated = {
              ...prev,
              euroBalance: newBal,
              walletBalanceFiat: newBal,
              balance: newBal,
            };
            try {
              storage.setDebounced('troco_user_profile', updated);
            } catch (_) {}
            return updated;
          });
        }
        const persistedEuroBalance = Number(txData.newEuroBalance);
        const displayedEuroBalance = Number.isFinite(persistedEuroBalance)
          ? persistedEuroBalance
          : Number(profile?.euroBalance || 0) + topUpAmount;
        if (typeof setTopUpCelebration === 'function') {
          setTopUpCelebration({
            title: `+${topUpAmount.toFixed(2)} € Rechargés !`,
            subtitle: `Nouveau solde : ${displayedEuroBalance.toFixed(2)} €`,
            isEuro: true
          });
          setTimeout(() => setTopUpCelebration(null), 4500);
        }
        if (typeof setSaveMessage === 'function') {
          setSaveMessage(`💳 Solde rechargé avec succès (+${topUpAmount.toFixed(2)} € via ${txData.paymentMethod}).`);
          setTimeout(() => setSaveMessage(''), 5000);
        }
      }
    } else if (txData.mode === 'boost') {
      const boostedListingId = txData.boostDetails?.listingId || txData.boostDetails?.id || txData.boostDetails?.firestoreId || txData.listingId || txData.payload?.listingId || txData.payload?.id;
      if (boostedListingId && typeof setListings === 'function') {
        setListings(prev => prev.map(item => (item.id === boostedListingId || item.firestoreId === boostedListingId) ? { ...item, isBoosted: true } : item));
        if (typeof setBoostMessage === 'function') {
          setBoostMessage('Annonce boostée avec succès pendant 7 jours !');
        }
      }
    } else if (txData.mode === 'edit-listing' || txData.mode === 'publish-options') {
      const { newListing } = txData.payload || {};
      if (newListing) {
        if (isEditingListing) {
          if (typeof setListings === 'function') {
            setListings(prev => prev.map(item => item.id === newListing.id ? newListing : item));
          }
          if (editingOriginalListing?.firestoreId && db) {
            try {
              const { id: _localId, firestoreId: _fid, ...firestorePayload } = newListing;
              updateDoc(doc(db, 'listings', editingOriginalListing.firestoreId), {
                ...firestorePayload,
                updatedAt: serverTimestamp(),
              }).catch(e => logger.warn('[Firestore] updateDoc failed:', e));
            } catch (e) {
              logger.warn('[Firestore] updateDoc error:', e);
            }
          }
        } else {
          if (typeof setListings === 'function') {
            setListings(prev => [newListing, ...prev]);
          }
          if (db) {
            try {
              const { id: _localId, ...firestorePayload } = newListing;
              addDoc(collection(db, 'listings'), {
                ...firestorePayload,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              }).catch(e => logger.warn('[Firestore] addDoc failed:', e));
            } catch (e) {
              logger.warn('[Firestore] addDoc error:', e);
            }
          }
        }
        playApplePaySound();
        const updatedDetail = typeof getListingDetail === 'function' ? getListingDetail(newListing) : newListing;
        if (typeof setPublishedListing === 'function') setPublishedListing(updatedDetail);
        if (typeof setShowPublishedPopup === 'function') setShowPublishedPopup(true);
        if (typeof setSelectedListing === 'function') setSelectedListing(updatedDetail);
        if (typeof setIsEditingListing === 'function') setIsEditingListing(false);
        if (typeof setEditingOriginalListing === 'function') setEditingOriginalListing(null);
        if (typeof setPostStep === 'function') setPostStep(1);
        if (typeof setPostDraft === 'function') setPostDraft(defaultPostDraft);
      }
    } else if (txData.mode === 'deal' || txData.mode === 'pay-deal') {
      const payload = txData.dealDetails || txData.payload || {};
      const chatId = payload.chatId || selectedChat?.id;
      const dealId = payload.dealId;
      const terms = payload.terms || {};
      const partnerName = payload.partnerName || selectedChat?.user;

      let receiverUid = payload?.partnerUid || selectedChat?.authorUid || selectedChat?.partnerUid;
      if (receiverUid === uid) {
        receiverUid = payload?.partnerUid && payload.partnerUid !== uid
          ? payload.partnerUid
          : (selectedChat?.partnerUid && selectedChat.partnerUid !== uid
            ? selectedChat.partnerUid
            : (selectedChat?.authorUid && selectedChat.authorUid !== uid ? selectedChat.authorUid : null));
      }

      if (!receiverUid) {
        logger.error('🚨 [Finance] Transaction annulée : Destinataire (receiverUid) introuvable.', { payload, selectedChat });
        alert('Erreur de transaction : Impossible d\'identifier le destinataire du paiement. Aucun montant n\'a été débité.');
        return;
      }

      const euroAmount = Number(txData.amountTtc ?? payload.euroRequired ?? payload.amount ?? 0);
      const tokensAmount = Number(txData.tokensDeducted ?? payload.tokensRequired ?? payload.tokens ?? 0);

      if (chatId && dealId) {
        try {
          await dealService.transferTokensAtomically({
            fromUid: profile?.uid || auth?.currentUser?.uid,
            toUid: receiverUid,
            tokens: tokensAmount > 0 ? Number(tokensAmount) : 0,
            euros: tokensAmount > 0 ? 0 : Number(euroAmount),
            method: 'deal',
            dealId: dealId,
            chatId: chatId,
            metadata: {
              terms,
              partnerName,
              paymentMethod: txData.paymentMethod || 'Paiement Sécurisé',
            },
          });
        } catch (dealErr) {
          logger.error('🚨 [dealService] Transfert deal échoué:', dealErr);
          alert(dealErr?.message || 'Erreur lors du transfert deal.');
        }
        return;
      }
    }

    const updatedProfile = {
      ...profile,
      isTrocoPlus: updatedTrocoPlus,
      subscriptionPlan: updatedSubscriptionPlan,
      trocoPlusPlan: updatedSubscriptionPlan,
      subscriptionStartDate: updatedSubscriptionStartDate,
      subscriptionRenewalDate: updatedSubscriptionRenewalDate,
    };
    if (
      updatedProfile.isTrocoPlus !== profile?.isTrocoPlus
      || updatedProfile.subscriptionPlan !== profile?.subscriptionPlan
      || updatedProfile.trocoPlusPlan !== profile?.trocoPlusPlan
      || updatedProfile.subscriptionStartDate !== profile?.subscriptionStartDate
      || updatedProfile.subscriptionRenewalDate !== profile?.subscriptionRenewalDate
    ) {
      if (typeof setProfile === 'function') {
        setProfile(prev => ({
          ...prev,
          isTrocoPlus: updatedProfile.isTrocoPlus,
          subscriptionPlan: updatedProfile.subscriptionPlan,
          trocoPlusPlan: updatedProfile.trocoPlusPlan,
          subscriptionStartDate: updatedProfile.subscriptionStartDate,
          subscriptionRenewalDate: updatedProfile.subscriptionRenewalDate,
        }));
      }
    }

    // Sauvegarde de la transaction dans le state local
    const newTxRecord = {
      id: 'tx-' + Date.now(),
      ...txData,
      userId: uid || 'guest',
      userName: profile?.name || 'Utilisateur',
      createdAt: new Date().toISOString(),
    };
    if (typeof setUserTransactions === 'function') {
      setUserTransactions(prev => [newTxRecord, ...prev]);
    }
    try {
      storage.setDebounced('troco_user_transactions', [newTxRecord, ...userTransactions]);
    } catch (e) { }

    // Application directe côté Firestore
    if (uid && txData.mode !== 'deal' && txData.mode !== 'pay-deal') {
      try {
        await paymentService.applyPayment({
          paymentIntentId: txData.authRef || txData.transactionId || `pi_${Date.now()}`,
          mode: txData.mode,
          amount: txData.amountTtc || txData.amount || txData.cashTopUp || 0,
          tokens: txData.tokensPurchased || 0,
          boostDays: txData.boostDays || 7,
          listingId: txData.boostDetails?.listingId || txData.boostDetails?.id || txData.boostDetails?.firestoreId || txData.listingId || txData.payload?.listingId || txData.payload?.id || null,
          currency: txData.currency || 'EUR',
          provider: 'mock',
          userId: uid,
        });
      } catch (err) {
        logger.warn('[paymentService] Error applying payment:', err);
      }
    }
  }, [
    profile,
    setProfile,
    setTopUpCelebration,
    setSaveMessage,
    setListings,
    setBoostMessage,
    isEditingListing,
    setIsEditingListing,
    editingOriginalListing,
    setEditingOriginalListing,
    setPublishedListing,
    setShowPublishedPopup,
    setSelectedListing,
    setPostStep,
    setPostDraft,
    defaultPostDraft,
    selectedChat,
    setUserTransactions,
    userTransactions,
    getListingDetail,
  ]);

  const {
    checkoutSession,
    isProcessing: isCheckoutProcessing,
    paymentStatus: checkoutStatus,
    openCheckout,
    cancelCheckout,
    applyCheckout,
  } = useCheckout({
    profile,
    setProfile,
    onPaymentSuccess: handlePaymentSuccess,
    onOpenNotification: setSaveMessage,
  });

  return {
    handlePaymentSuccess,
    checkoutSession,
    openCheckout,
    cancelCheckout,
    applyCheckout,
    isCheckoutProcessing,
    checkoutStatus,
  };
};

export default usePayments;
