import { useState, useEffect, useRef, useCallback } from 'react';
import { db, auth } from '../firebase';
import {
  collection,
  query,
  where,
  limit,
  onSnapshot
} from 'firebase/firestore';
import logger from '../utils/logger';
import { dealService } from '../services/dealService';
import { playApplePaySound, playBetclicBalanceSound } from '../utils/audioService';

const safeVibrate = (pattern) => {
  if (typeof window !== 'undefined' && 'navigator' in window && typeof window.navigator.vibrate === 'function') {
    try {
      window.navigator.vibrate(pattern);
    } catch (_) { }
  }
};

/**
 * useGlobalCalls - Hook de signalisation temps réel racine pour les appels WebRTC entrants.
 * Gère l'écoute Firestore de la collection `calls`, la sonnerie, le décrochage/refus,
 * le mode PiP (Picture-in-Picture) avec glisser-déposer Pointer Events,
 * le chronomètre d'appel et le transfert atomique des jetons de rétribution d'appel.
 */
export const useGlobalCalls = ({
  profile,
  setProfile,
  incomingCall,
  localStream,
  remoteStream,
  callState = {},
  acceptIncomingCall,
  declineIncomingCall,
  playRingtone,
  stopRingtone,
  chatsList = [],
  setSelectedChat,
  selectedChat,
  setUserTransactions,
  setTransactionSuccessModalConfig,
  setSaveMessage,
  safeTimeout,
} = {}) => {
  const [globalIncomingCall, setGlobalIncomingCall] = useState(null);
  const activeIncomingCall = incomingCall || globalIncomingCall;

  // États PiP & Drag-and-Drop
  const [isCallPip, setIsCallPip] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [pipPosition, setPipPosition] = useState({
    x: typeof window !== 'undefined' ? Math.max(10, window.innerWidth - 230) : 100,
    y: typeof window !== 'undefined' ? Math.max(10, window.innerHeight - 240) : 100
  });

  const pipPointerDragRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialPosX: 0,
    initialPosY: 0,
    movedDistance: 0,
  });

  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settlementCallDuration, setSettlementCallDuration] = useState(0);
  const prevActiveRef = useRef(false);

  // Chronomètre de Deal en temps réel pendant l'appel (1h = 1 Jeton Troco)
  useEffect(() => {
    let timer = null;
    if (callState.active && !callState.ringing) {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      prevActiveRef.current = true;
    } else {
      if (prevActiveRef.current && callDuration > 5) {
        setSettlementCallDuration(callDuration);
        setIsSettlementModalOpen(true);
      }
      prevActiveRef.current = false;
      setCallDuration(0);
      setIsCallPip(false);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callState.active, callState.ringing]); // eslint-disable-line

  // Handlers Pointer Events unifiés pour le Drag-and-Drop (toucher/souris à 60fps)
  const handlePipPointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) { }
    pipPointerDragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: pipPosition.x,
      initialPosY: pipPosition.y,
      movedDistance: 0,
    };
  };

  const handlePipPointerMove = (e) => {
    if (!pipPointerDragRef.current.isDragging) return;
    const deltaX = e.clientX - pipPointerDragRef.current.startX;
    const deltaY = e.clientY - pipPointerDragRef.current.startY;
    pipPointerDragRef.current.movedDistance = Math.hypot(deltaX, deltaY);

    const bottomNavOffset = 75;
    const minX = 0;
    const maxX = Math.max(0, window.innerWidth - 45);
    const maxY = Math.max(10, window.innerHeight - 150 - bottomNavOffset);

    const nextX = Math.max(minX, Math.min(maxX, pipPointerDragRef.current.initialPosX + deltaX));
    const nextY = Math.max(10, Math.min(maxY, pipPointerDragRef.current.initialPosY + deltaY));

    setPipPosition({ x: nextX, y: nextY });
  };

  const handlePipPointerUp = (e) => {
    if (!pipPointerDragRef.current.isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) { }
    pipPointerDragRef.current.isDragging = false;
  };

  const handlePipPointerCancel = (e) => {
    if (!pipPointerDragRef.current.isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) { }
    pipPointerDragRef.current.isDragging = false;
  };

  const handlePipContentClick = (e) => {
    if (pipPointerDragRef.current.movedDistance >= 6) {
      e.stopPropagation();
      return;
    }
    setIsCallPip(false);
  };

  // Formateur du chronomètre de deal (HH:MM:SS ou MM:SS)
  const formatCallTimer = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Rétribution en jetons & structure transparente de frais (Étape 5)
  const handleTransferCallTokens = async ({ tokens, insurance, duration }) => {
    const costTokens = Number(tokens) || 1;
    const insuranceFee = insurance ? 1.99 : 0;
    const currentUid = profile?.uid || auth.currentUser?.uid;

    if (!currentUid) {
      alert('Veuillez vous connecter pour transférer des jetons.');
      return;
    }

    const partnerUid = selectedChat?.participants?.find(uid => uid && uid !== currentUid) || selectedChat?.partnerUid || selectedChat?.authorUid;
    const partner = selectedChat?.user || 'Interlocuteur';

    if (!partnerUid || partnerUid === currentUid) {
      logger.error('🚨 [Finance] Transfert annulé : Destinataire (partnerUid) introuvable ou invalide.', {
        selectedChat,
        currentUid,
        partnerUid
      });
      alert('Erreur de transfert : Impossible d\'identifier le destinataire des jetons. Aucun montant n\'a été débité.');
      return;
    }

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

      playApplePaySound();
      playBetclicBalanceSound(true);
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
        setSaveMessage(`🤝 ${costTokens} Jeton${costTokens > 1 ? 's' : ''} Troco transféré(s) à ${partner} (Frais de service : 0,00 €) !`);
        if (typeof safeTimeout === 'function') {
          safeTimeout(() => setSaveMessage(''), 5000);
        }
      }
    } catch (e) {
      logger.error('🚨 [walletService] Erreur transfert jetons visio:', e);
      const errorMsg = e?.message || 'Erreur réseau ou solde insuffisant.';
      if (typeof setSaveMessage === 'function') {
        setSaveMessage(`❌ Transfert échoué : ${errorMsg}`);
        if (typeof safeTimeout === 'function') {
          safeTimeout(() => setSaveMessage(''), 5000);
        }
      }
      alert(`Échec du transfert : ${errorMsg}`);
    }
  };

  // Attacheurs de flux vidéo universels sans conflit de ref
  const attachLocalStream = useCallback((el) => {
    if (el && localStream) {
      if (el.srcObject !== localStream) {
        el.srcObject = localStream;
      }
      el.play().catch(() => { });
    }
  }, [localStream]);

  const attachRemoteStream = useCallback((el) => {
    if (el && remoteStream) {
      if (el.srcObject !== remoteStream) {
        el.srcObject = remoteStream;
      }
      el.play().catch(() => { });
    }
  }, [remoteStream]);

  // Décrochage universel direct avec bascule immédiate vers la visio plein écran
  const handleAcceptIncomingCall = useCallback(async (callToAccept = null) => {
    const targetCall = callToAccept || activeIncomingCall;
    if (!targetCall) return;

    if (typeof stopRingtone === 'function') stopRingtone();
    safeVibrate([0, 50, 50, 50]);

    if (typeof acceptIncomingCall === 'function') {
      try {
        await acceptIncomingCall(targetCall);
      } catch (e) {
        logger.warn('[useGlobalCalls] acceptIncomingCall error:', e);
      }
    }

    setGlobalIncomingCall(null);
    setIsCallPip(false);

    if (typeof setSelectedChat === 'function') {
      const partnerId = targetCall.fromUid || targetCall.hostUid || targetCall.calleeUid;
      const matchedChat = chatsList.find(c =>
        c.id === targetCall.chatId ||
        (partnerId && c.participants && c.participants.includes(partnerId))
      );
      if (matchedChat) {
        setSelectedChat(matchedChat);
      } else {
        setSelectedChat({
          id: targetCall.chatId || `call-${Date.now()}`,
          user: targetCall.fromName || targetCall.name || 'Correspondant',
          avatar: targetCall.fromAvatar || '',
          partnerUid: partnerId,
          participants: partnerId ? [profile?.uid, partnerId].filter(Boolean) : [profile?.uid].filter(Boolean),
          messages: [],
        });
      }
    }
  }, [activeIncomingCall, stopRingtone, acceptIncomingCall, setSelectedChat, chatsList, profile?.uid]);

  // Refus universel direct
  const handleDeclineIncomingCall = useCallback(async (callToDecline = null) => {
    const targetCall = callToDecline || activeIncomingCall;
    if (typeof stopRingtone === 'function') stopRingtone();
    safeVibrate(40);

    if (targetCall && typeof declineIncomingCall === 'function') {
      try {
        await declineIncomingCall(targetCall);
      } catch (e) {
        logger.warn('[useGlobalCalls] declineIncomingCall error:', e);
      }
    }
    setGlobalIncomingCall(null);
  }, [activeIncomingCall, stopRingtone, declineIncomingCall]);

  // Écoute temps réel des appels entrants (Firestore 'calls')
  useEffect(() => {
    const currentUid = profile?.uid || auth.currentUser?.uid;
    if (!currentUid || !db) return;

    const unsubs = [];

    const handleCallDocChange = (change) => {
      const data = change.doc.data();
      const callId = change.doc.id;

      if (change.type === 'added' || change.type === 'modified') {
        const isTargetedAtMe =
          (Array.isArray(data.targetParticipants) && (data.targetParticipants.includes(currentUid) || (profile?.name && data.targetParticipants.includes(profile.name)))) ||
          data.calleeUid === currentUid ||
          data.toUid === currentUid;

        const isNotFromMe = data.fromUid !== currentUid && data.hostUid !== currentUid;

        if (isTargetedAtMe && isNotFromMe && (data.status === 'ringing' || data.status === 'calling')) {
          setGlobalIncomingCall({
            id: callId,
            callId: data.callId || callId,
            ...data,
          });
          if (typeof playRingtone === 'function') playRingtone();
          safeVibrate([0, 400, 200, 400]);
        } else if (data.status === 'ended' || data.status === 'rejected' || data.status === 'accepted') {
          setGlobalIncomingCall(prev => (prev?.id === callId ? null : prev));
          if (typeof stopRingtone === 'function') stopRingtone();
        }
      } else if (change.type === 'removed') {
        setGlobalIncomingCall(prev => (prev?.id === callId ? null : prev));
        if (typeof stopRingtone === 'function') stopRingtone();
      }
    };

    try {
      // 1. Écoute par targetParticipants array-contains
      const qTarget = query(
        collection(db, 'calls'),
        where('targetParticipants', 'array-contains', String(currentUid)),
        limit(5)
      );
      unsubs.push(onSnapshot(qTarget, (snap) => snap.docChanges().forEach(handleCallDocChange), (err) => {
        logger.warn('[useGlobalCalls] targetParticipants error:', err);
      }));

      // 2. Écoute par calleeUid direct
      const qCallee = query(
        collection(db, 'calls'),
        where('calleeUid', '==', String(currentUid)),
        limit(5)
      );
      unsubs.push(onSnapshot(qCallee, (snap) => snap.docChanges().forEach(handleCallDocChange), (err) => {
        logger.warn('[useGlobalCalls] calleeUid error:', err);
      }));

      // 3. Écoute par toUid direct
      const qToUid = query(
        collection(db, 'calls'),
        where('toUid', '==', String(currentUid)),
        limit(5)
      );
      unsubs.push(onSnapshot(qToUid, (snap) => snap.docChanges().forEach(handleCallDocChange), (err) => {
        logger.warn('[useGlobalCalls] toUid error:', err);
      }));

      // 4. Écoute de secours par nom de profil si disponible
      if (profile?.name) {
        const qName = query(
          collection(db, 'calls'),
          where('targetParticipants', 'array-contains', profile.name),
          limit(5)
        );
        unsubs.push(onSnapshot(qName, (snap) => snap.docChanges().forEach(handleCallDocChange), () => { }));
      }
    } catch (e) {
      logger.warn('[useGlobalCalls] Error setting up global calls listener:', e);
    }

    return () => {
      unsubs.forEach(u => { try { if (typeof u === 'function') u(); } catch (_) { } });
    };
  }, [profile?.uid, profile?.name, playRingtone, stopRingtone]);

  return {
    globalIncomingCall,
    setGlobalIncomingCall,
    activeIncomingCall,
    attachLocalStream,
    attachRemoteStream,
    handleAcceptIncomingCall,
    handleDeclineIncomingCall,
    isCallPip,
    setIsCallPip,
    pipPosition,
    setPipPosition,
    handlePipPointerDown,
    handlePipPointerMove,
    handlePipPointerUp,
    handlePipPointerCancel,
    handlePipContentClick,
    callDuration,
    formatCallTimer,
    isSettlementModalOpen,
    setIsSettlementModalOpen,
    settlementCallDuration,
    setSettlementCallDuration,
    handleTransferCallTokens,
  };
};

export default useGlobalCalls;
