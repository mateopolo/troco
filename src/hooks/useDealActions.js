import { useCallback } from 'react';
import { auth, db } from '../firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import logger from '../utils/logger';
import storage from '../utils/storage';
import { dealService } from '../services/dealService';
import { paymentService } from '../services/paymentService';
import { playApplePaySound as defaultPlayApplePaySound, playBetclicBalanceSound as defaultPlayBetclicBalanceSound } from '../services/audioService';

/**
 * useDealActions - Custom hook centralizing financial deal and transaction handlers.
 * Extracts handleTransferCallTokens and handlePaymentSuccess out of App.js.
 */
export const useDealActions = ({
  profile,
  setProfile,
  userTransactions,
  setUserTransactions,
  setTopUpCelebration,
  setSaveMessage,
  setTransactionSuccessModalConfig,
  selectedChat,
  safeTimeout = (fn, ms) => setTimeout(fn, ms),
  playApplePaySound = defaultPlayApplePaySound,
  playBetclicBalanceSound = defaultPlayBetclicBalanceSound,
  setListings = () => {},
  setBoostMessage = () => {},
  isEditingListing = false,
  editingOriginalListing = null,
  setIsEditingListing = () => {},
  setEditingOriginalListing = () => {},
  setPublishedListing = () => {},
  setShowPublishedPopup = () => {},
  setSelectedListing = () => {},
  setPostStep = () => {},
  setPostDraft = () => {},
  defaultPostDraft = {},
  getListingDetail = (l) => l,
  t = (k, def) => def || k,
} = {}) => {
  // Rétribution en jetons & structure transparente de frais lors d'un appel visio
  const handleTransferCallTokens = useCallback(async ({ tokens, insurance, duration }) => {
    const costTokens = Number(tokens) || 1;
    const insuranceFee = insurance ? 1.99 : 0;
    const currentUid = profile?.uid || auth.currentUser?.uid;

    if (!currentUid) {
      alert(typeof t === 'function' ? t('loginToTransferTokens', 'Veuillez vous connecter pour transférer des jetons.') : 'Veuillez vous connecter pour transférer des jetons.');
      return;
    }

    // Isole le UID cible de façon impérative
    const partnerUid = selectedChat?.participants?.find(uid => uid && uid !== currentUid) || selectedChat?.partnerUid || selectedChat?.authorUid;
    const partner = selectedChat?.user || 'Interlocuteur';

    if (!partnerUid || partnerUid === currentUid) {
      logger.error('🚨 [Finance] Transfert annulé : Destinataire (partnerUid) introuvable ou invalide.', {
        selectedChat,
        currentUid,
        partnerUid,
      });
      alert('Erreur de transfert : Impossible d\'identifier le destinataire des jetons. Aucun montant n\'a été débité.');
      return;
    }

    // Vérification préalable de la solvabilité
    const curSenderTokens = Number(profile?.trocoTokens ?? 0);
    const curSenderEuro = Number(profile?.euroBalance ?? 0);
    if (curSenderTokens < costTokens) {
      alert(`Solde de jetons insuffisant (${curSenderTokens} disponible(s), ${costTokens} requis).`);
      return;
    }
    if (insuranceFee > 0 && curSenderEuro < insuranceFee) {
      alert(`Solde d'euros insuffisant pour l'assurance (${curSenderEuro}€ disponible(s), ${insuranceFee}€ requis).`);
      return;
    }

    const transactionId = `TRK-CALL-${Date.now().toString().slice(-6)}`;
    const newTx = {
      id: `tx-visio-${Date.now()}`,
      transactionId,
      title: `Rétribution Visio (${partner})`,
      amount: insuranceFee,
      tokens: costTokens,
      type: 'token_transfer',
      status: 'completed',
      date: new Date().toISOString(),
      partner: partner,
      duration: duration,
      freeServiceFee: true,
    };

    // Persistance transactionnelle via dealService (atomique unifié)
    try {
      const transferRes = await dealService.transferTokensAtomically({
        fromUid: currentUid,
        toUid: partnerUid,
        tokens: Number(costTokens),
        euros: 0,
        method: 'call_tokens',
        metadata: {
          partner,
          duration,
          insuranceFee,
        },
      });

      // Mise à jour optimiste locale après validation de la transaction backend
      if (typeof setProfile === 'function') {
        setProfile(prev => ({
          ...prev,
          trocoTokens: transferRes.newSenderTokens !== undefined ? transferRes.newSenderTokens : Math.max(0, (prev?.trocoTokens ?? curSenderTokens) - costTokens),
          euroBalance: transferRes.newSenderEuro !== undefined ? transferRes.newSenderEuro : (insuranceFee > 0 ? Number(((prev?.euroBalance ?? curSenderEuro) - insuranceFee).toFixed(2)) : (prev?.euroBalance ?? curSenderEuro)),
          dealsCompleted: (prev?.dealsCompleted || 0) + 1,
        }));
      }

      if (typeof setUserTransactions === 'function') {
        setUserTransactions(prev => [newTx, ...prev]);
      }

      if (typeof playApplePaySound === 'function') playApplePaySound();
      if (typeof playBetclicBalanceSound === 'function') playBetclicBalanceSound(true);

      if (typeof setTransactionSuccessModalConfig === 'function') {
        setTransactionSuccessModalConfig({
          isOpen: true,
          type: 'sent',
          amount: costTokens,
          currency: 'tokens',
          partnerName: partner,
          notificationId: null,
        });
      }

      if (typeof setSaveMessage === 'function') {
        const transferSentText = typeof t === 'function'
          ? `🤝 ${t('tokenTransferSent', { count: costTokens, partner })} — ${t('tokenTransferSentSuccess', { partner })}`
          : `🤝 ${costTokens} Jeton${costTokens > 1 ? 's' : ''} Troco transféré(s) à ${partner} (Frais de service : 0,00 €) !`;
        setSaveMessage(transferSentText);
        safeTimeout(() => setSaveMessage(''), 5000);
      }
    } catch (e) {
      logger.error('🚨 [walletService] Erreur transfert jetons visio:', e);
      const errorMsg = e?.message || 'Erreur réseau ou solde insuffisant.';
      if (typeof setSaveMessage === 'function') {
        setSaveMessage(`❌ Transfert échoué : ${errorMsg}`);
        safeTimeout(() => setSaveMessage(''), 5000);
      }
      alert(`Échec du transfert : ${errorMsg}`);
    }
  }, [
    profile?.uid,
    profile?.trocoTokens,
    profile?.euroBalance,
    selectedChat,
    setProfile,
    setUserTransactions,
    playApplePaySound,
    playBetclicBalanceSound,
    setTransactionSuccessModalConfig,
    setSaveMessage,
    safeTimeout,
  ]);

  // Handler de succès de paiement (crédit solde, abonnement Troco Plus, enregistrement transaction Firestore)
  const handlePaymentSuccess = useCallback(async (txData) => {
    const uid = auth.currentUser?.uid || profile?.uid;

    // 1. Mise à jour du statut d'abonnement
    let updatedTrocoPlus = profile?.isTrocoPlus || false;
    let updatedSubscriptionPlan = profile?.subscriptionPlan || profile?.trocoPlusPlan || null;
    let updatedSubscriptionStartDate = profile?.subscriptionStartDate || null;
    let updatedSubscriptionRenewalDate = profile?.subscriptionRenewalDate || null;

    if (txData.mode === 'troco-plus' || txData.mode === 'pack-tokens') {
      updatedTrocoPlus = true;
      updatedSubscriptionPlan = txData.subscriptionPlan?.planKey || 'essential';
      updatedSubscriptionStartDate = txData.subscriptionStartDate || new Date().toISOString();
      updatedSubscriptionRenewalDate = txData.subscriptionRenewalDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      if (typeof setTopUpCelebration === 'function') {
        setTopUpCelebration({
          title: `+${txData.tokensPurchased} Jetons Troco !`,
          subtitle: `Abonnement ${txData.subscriptionPlan?.title || 'Troco Plus'} activé`,
          isTokens: true,
        });
        safeTimeout(() => setTopUpCelebration(null), 4500);
      }

      if (typeof setSaveMessage === 'function') {
        setSaveMessage(`⭐ Abonnement ${txData.subscriptionPlan?.title || 'Troco Plus'} activé avec succès ! +${txData.tokensPurchased} jetons crédités.`);
        safeTimeout(() => setSaveMessage(''), 6000);
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
            isEuro: true,
          });
          safeTimeout(() => setTopUpCelebration(null), 4500);
        }

        if (typeof setSaveMessage === 'function') {
          setSaveMessage(`💳 Solde rechargé avec succès (+${topUpAmount.toFixed(2)} € via ${txData.paymentMethod}).`);
          safeTimeout(() => setSaveMessage(''), 5000);
        }
      }
    } else if (txData.mode === 'boost') {
      const boostedListingId = txData.boostDetails?.listingId || txData.boostDetails?.id || txData.boostDetails?.firestoreId || txData.listingId || txData.payload?.listingId || txData.payload?.id;
      if (boostedListingId && typeof setListings === 'function') {
        setListings(prev => prev.map(item => (item.id === boostedListingId || item.firestoreId === boostedListingId) ? { ...item, isBoosted: true } : item));
        if (typeof setBoostMessage === 'function') {
          setBoostMessage(typeof t === 'function' ? t('boostSuccessToast', 'Annonce boostée avec succès pendant 7 jours !') : 'Annonce boostée avec succès pendant 7 jours !');
        }
      }
    } else if (txData.mode === 'edit-listing' || txData.mode === 'publish-options') {
      const { newListing } = txData.payload || {};
      if (newListing) {
        if (isEditingListing) {
          if (typeof setListings === 'function') {
            setListings(prev => prev.map(item => item.id === newListing.id ? newListing : item));
          }
          if (editingOriginalListing?.firestoreId) {
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

        if (typeof playApplePaySound === 'function') playApplePaySound();
        const updatedDetail = typeof getListingDetail === 'function' ? getListingDetail(newListing) : newListing;
        setPublishedListing(updatedDetail);
        setShowPublishedPopup(true);
        setSelectedListing(updatedDetail);
        setIsEditingListing(false);
        setEditingOriginalListing(null);
        setPostStep(1);
        setPostDraft(defaultPostDraft);
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

    // 2. Sauvegarde de la transaction dans le state local
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
      storage.setDebounced('troco_user_transactions', [newTxRecord, ...(userTransactions || [])]);
    } catch (_) {}

    // 3. Application directe et atomique côté Firestore
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
    userTransactions,
    setUserTransactions,
    setTopUpCelebration,
    setSaveMessage,
    safeTimeout,
    setListings,
    setBoostMessage,
    isEditingListing,
    editingOriginalListing,
    setIsEditingListing,
    setEditingOriginalListing,
    setPublishedListing,
    setShowPublishedPopup,
    setSelectedListing,
    setPostStep,
    setPostDraft,
    defaultPostDraft,
    getListingDetail,
    playApplePaySound,
    selectedChat,
  ]);

  return {
    handleTransferCallTokens,
    handlePaymentSuccess,
  };
};

export default useDealActions;
