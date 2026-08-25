/**
 * useWebRTC.js — Signalisation WebRTC temps réel via Firestore avec STUN mondial (Wi-Fi ⇄ 4G/5G),
 * Partage d'écran (Screen Share avec bascule instantanée) et Outils de modération Professeur / Admin d'appel
 *
 * Architecture Firestore :
 *   calls/{chatId}                          → type, from, to, status, offer, answer, isScreenSharing, screenSharingBy, forceMuteParticipant, forceStopScreenShare
 *   calls/{chatId}/callerCandidates/{id}    → candidats ICE de l'appelant
 *   calls/{chatId}/calleeCandidates/{id}    → candidats ICE de l'appelé
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import {
  doc, collection, addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, getDoc, serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { liveTranscriptionService } from '../services/liveTranscriptionService';

// Configuration STUN globale robuste (Google STUN pour traversée NAT, 4G, 5G et Wi-Fi)
const ICE_CONFIG = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun3.l.google.com:19302',
        'stun:stun4.l.google.com:19302',
      ],
    },
  ],
  iceCandidatePoolSize: 10,
};

export function useWebRTC({ profileName, profileUid, selectedChat }) {
  const [callState, setCallState] = useState({
    type: null, active: false, ringing: false,
    micOn: true, camOn: true, isScreenSharing: false, isHost: false,
    inviteOpen: false, copied: false, remoteScreenSharing: false,
  });
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' (front) ou 'environment' (back)
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const pcRef = useRef(null);
  const unsubsRef = useRef([]);
  const activeChatIdRef = useRef(null);
  const screenTrackRef = useRef(null);
  const cameraTrackRef = useRef(null);
  const ringtoneCtxRef = useRef(null);
  const ringtoneIntervalRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const callStartTimeRef = useRef(null);
  const activeCallChatIdRef = useRef(null);
  const activeCallTypeRef = useRef(null);
  const isCallConnectedRef = useRef(false);

  // Synchronisation continue du localStreamRef
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Détection des caméras disponibles sur l'appareil
  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || ('ontouchstart' in window);
      setHasMultipleCameras(isMobile);
      return;
    }
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || ('ontouchstart' in window);
        setHasMultipleCameras(videoInputs.length > 1 || isMobile);
      })
      .catch(() => {
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || ('ontouchstart' in window);
        setHasMultipleCameras(isMobile);
      });
  }, []);

  // Attachement automatique aux refs vidéo
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      localVideoRef.current.play().catch(() => { });
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      if (remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      remoteVideoRef.current.play().catch(() => { });
    }
  }, [remoteStream]);

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

  // =======================================================================
  // 1. GESTION DE LA SONNERIE (Arrêt immédiat & Nettoyage)
  // =======================================================================
  const stopRingtone = useCallback(() => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
    if (ringtoneCtxRef.current) {
      try {
        ringtoneCtxRef.current.close();
      } catch (_) { }
      ringtoneCtxRef.current = null;
    }
  }, []);

  const playRingtone = useCallback(() => {
    stopRingtone();
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      ringtoneCtxRef.current = ctx;

      const triggerPattern = () => {
        if (!ringtoneCtxRef.current || ringtoneCtxRef.current.state === 'closed') return;
        const cur = ringtoneCtxRef.current.currentTime;
        const beep = (freq, start, dur) => {
          if (!ringtoneCtxRef.current || ringtoneCtxRef.current.state === 'closed') return;
          try {
            const osc = ringtoneCtxRef.current.createOscillator();
            const gain = ringtoneCtxRef.current.createGain();
            osc.connect(gain);
            gain.connect(ringtoneCtxRef.current.destination);
            osc.frequency.value = freq;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0, cur + start);
            gain.gain.linearRampToValueAtTime(0.15, cur + start + 0.05);
            gain.gain.linearRampToValueAtTime(0, cur + start + dur);
            osc.start(cur + start);
            osc.stop(cur + start + dur + 0.05);
          } catch (_) { }
        };
        beep(440, 0, 0.35);
        beep(880, 0.45, 0.35);
      };

      triggerPattern();
      ringtoneIntervalRef.current = setInterval(triggerPattern, 2600);
    } catch (_) { }
  }, [stopRingtone]);

  // =======================================================================
  // 2. GESTION DES FLUX MÉDIA LOCAUX
  // =======================================================================
  const _getLocalStream = useCallback(async (type) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Votre navigateur ne prend pas en charge l'accès à la caméra et au microphone (WebRTC).");
      return null;
    }
    const constraints = type === 'video'
      ? { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true }
      : { video: false, audio: true };
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      console.warn('getUserMedia primary failed:', err);
      try {
        return await navigator.mediaDevices.getUserMedia({ video: type === 'video', audio: true });
      } catch (fallbackErr) {
        console.error('getUserMedia fallback failed:', fallbackErr);
        if (fallbackErr.name === 'NotAllowedError' || fallbackErr.name === 'PermissionDeniedError') {
          alert("Accès caméra / microphone refusé :\n\nPour passer des appels audio ou visio sur Troco, veuillez autoriser l'accès aux périphériques dans les paramètres de votre navigateur.");
        } else if (fallbackErr.name === 'NotFoundError' || fallbackErr.name === 'DevicesNotFoundError') {
          alert("Périphérique introuvable :\n\nAucun microphone ou caméra n'a été détecté sur votre appareil. Veuillez brancher un périphérique et réessayer.");
        } else if (fallbackErr.name === 'NotReadableError' || fallbackErr.name === 'TrackStartError') {
          alert("Périphérique déjà utilisé :\n\nVotre caméra ou microphone est actuellement occupé par une autre application. Veuillez la fermer puis relancer l'appel.");
        } else {
          alert("Impossible d'initialiser les flux audio/vidéo. Veuillez vérifier les autorisations de votre navigateur.");
        }
        return null;
      }
    }
  }, []);

  // Nettoyage complet et forcé de tous les flux médias (caméra, micro, écran) et écouteurs
  const _cleanup = useCallback((skipDocDelete = false) => {
    stopRingtone();
    try { liveTranscriptionService.stopListening(); } catch (_) { }
    pendingCandidatesRef.current = [];
    unsubsRef.current.forEach(u => { try { u(); } catch (_) { } });
    unsubsRef.current = [];

    // Arrêt forcé et systématique de tous les tracks locaux via ref
    if (localStreamRef.current) {
      try {
        localStreamRef.current.getTracks().forEach(track => {
          try { track.stop(); } catch (_) { }
        });
      } catch (_) { }
      localStreamRef.current = null;
    }

    if (screenTrackRef.current) {
      try { screenTrackRef.current.stop(); } catch (_) { }
      screenTrackRef.current = null;
    }
    if (cameraTrackRef.current) {
      try { cameraTrackRef.current.stop(); } catch (_) { }
      cameraTrackRef.current = null;
    }

    // Arrêt forcé des flux résiduels attachés aux éléments vidéo
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      try {
        const stream = localVideoRef.current.srcObject;
        if (stream && stream.getTracks) {
          stream.getTracks().forEach(t => { try { t.stop(); } catch (_) { } });
        }
      } catch (_) { }
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
      try {
        const stream = remoteVideoRef.current.srcObject;
        if (stream && stream.getTracks) {
          stream.getTracks().forEach(t => { try { t.stop(); } catch (_) { } });
        }
      } catch (_) { }
      remoteVideoRef.current.srcObject = null;
    }

    // Arrêt forcé de tous les tracks sur la RTCPeerConnection
    if (pcRef.current) {
      try {
        pcRef.current.getSenders().forEach(sender => {
          if (sender.track) {
            try { sender.track.stop(); } catch (_) { }
          }
        });
        pcRef.current.close();
      } catch (_) { }
      pcRef.current = null;
    }

    setLocalStream(prev => {
      if (prev) {
        try {
          prev.getTracks().forEach(t => { try { t.stop(); } catch (_) { } });
        } catch (_) { }
      }
      return null;
    });
    setRemoteStream(null);

    const targetChatId = activeChatIdRef.current;
    if (targetChatId && !skipDocDelete) {
      getDoc(doc(db, 'calls', String(targetChatId))).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          const currentParts = Array.isArray(data.participants) ? data.participants : [];
          const remainingParts = currentParts.filter(p => p !== profileName);
          if (remainingParts.length === 0) {
            deleteDoc(doc(db, 'calls', String(targetChatId))).catch(() => { });
          } else {
            updateDoc(doc(db, 'calls', String(targetChatId)), {
              participants: remainingParts,
              lastLeft: profileName,
              updatedAt: serverTimestamp(),
            }).catch(() => { });
          }
        }
      }).catch(() => { });
    }
    activeChatIdRef.current = null;
    isCallConnectedRef.current = false;
  }, [profileName, stopRingtone]);

  useEffect(() => { return () => { _cleanup(); }; }, [_cleanup]);

  // =======================================================================
  // 3. FILE D'ATTENTE DES CANDIDATS ICE (ÉVITE TOUT ÉCHEC AVANT REMOTEDESCRIPTION)
  // =======================================================================
  const addOrQueueCandidate = useCallback(async (candidateData) => {
    if (!candidateData) return;
    const pc = pcRef.current;
    if (!pc) return;
    try {
      const candidate = new RTCIceCandidate(candidateData);
      if (pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(candidate);
      } else {
        pendingCandidatesRef.current.push(candidate);
      }
    } catch (err) {
      console.warn('[WebRTC] addOrQueueCandidate error:', err);
    }
  }, []);

  const flushPendingCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    while (pendingCandidatesRef.current.length > 0) {
      const cand = pendingCandidatesRef.current.shift();
      try {
        await pc.addIceCandidate(cand);
      } catch (err) {
        console.warn('[WebRTC] flush pending candidate error:', err);
      }
    }
  }, []);

  const _createPC = useCallback((chatId, role) => {
    const pc = new RTCPeerConnection(ICE_CONFIG);
    pcRef.current = pc;
    activeChatIdRef.current = chatId;

    pc.ontrack = (e) => {
      if (e.streams && e.streams[0]) {
        setRemoteStream(e.streams[0]);
      } else {
        setRemoteStream(prev => {
          const currentStream = prev || new MediaStream();
          const existingTrack = currentStream.getTracks().find(t => t.id === e.track.id);
          if (!existingTrack) {
            currentStream.addTrack(e.track);
          }
          return new MediaStream(currentStream.getTracks());
        });
      }
    };

    const myCands1 = role === 'caller' ? 'callerCandidates' : 'calleeCandidates';
    const myCands2 = role === 'caller' ? 'offerCandidates' : 'answerCandidates';
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        const candJson = candidate.toJSON();
        addDoc(collection(db, 'calls', String(chatId), myCands1), candJson).catch(() => { });
        addDoc(collection(db, 'calls', String(chatId), myCands2), candJson).catch(() => { });
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setCallState(prev => ({ ...prev, ringing: false }));
      }
    };

    return pc;
  }, []);

  // =======================================================================
  // 4. REJOINDRE UNE SALLE ACTIVE (CALLEE SANS DOUBLE SONNERIE)
  // =======================================================================
  const joinActiveCall = useCallback(async (targetChatId, type, preloadedCallData = null) => {
    const chatId = targetChatId || selectedChat?.id;
    if (!chatId) return null;

    stopRingtone();
    setIncomingCall(null);

    callStartTimeRef.current = Date.now();
    activeCallChatIdRef.current = String(chatId);
    activeCallTypeRef.current = type || 'video';
    isCallConnectedRef.current = true;

    const stream = await _getLocalStream(type || 'video');
    if (!stream) {
      setCallState({ type: null, active: false, ringing: false, micOn: true, camOn: true, isScreenSharing: false, isHost: false, inviteOpen: false, copied: false, remoteScreenSharing: false });
      return null;
    }
    setLocalStream(stream);
    localStreamRef.current = stream;

    setCallState({
      type: type || 'video',
      active: true,
      ringing: false,
      micOn: true,
      camOn: (type || 'video') === 'video',
      isScreenSharing: false,
      isHost: false,
      inviteOpen: false,
      copied: false,
      remoteScreenSharing: false
    });

    let callData = preloadedCallData;
    if (!callData) {
      const callSnap = await getDoc(doc(db, 'calls', String(chatId)));
      if (!callSnap.exists()) {
        console.warn('[WebRTC] Appel introuvable pour rejoindre');
        return null;
      }
      callData = callSnap.data();
    }

    if (!callData?.offer) {
      console.warn('[WebRTC] Aucune offre SDP valide dans l\'appel');
      return null;
    }

    const pc = _createPC(chatId, 'callee');
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
    await flushPendingCandidates();

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    const fromUser = callData.from || 'Interlocuteur';
    const updatedParticipants = Array.from(new Set([...(callData.participants || [fromUser]), profileName]));

    await updateDoc(doc(db, 'calls', String(chatId)), {
      answer: { type: answer.type, sdp: answer.sdp },
      participants: updatedParticipants,
      status: 'connected',
      updatedAt: serverTimestamp(),
    });

    setDoc(doc(db, 'chats', String(chatId)), {
      activeCall: {
        isLive: true,
        type: type || 'video',
        participants: updatedParticipants,
      }
    }, { merge: true }).catch(() => { });

    const unsubCallDoc = onSnapshot(doc(db, 'calls', String(chatId)), (snap) => {
      if (!snap.exists()) {
        _cleanup(true);
        setCallState({ type: null, active: false, ringing: false, micOn: true, camOn: true, isScreenSharing: false, isHost: false, inviteOpen: false, copied: false, remoteScreenSharing: false });
        setDoc(doc(db, 'chats', String(chatId)), {
          activeCall: null,
          isLive: false,
          updatedAt: serverTimestamp()
        }, { merge: true }).catch(() => { });
        return;
      }
      const data = snap.data();

      if (data?.forceMuteParticipant) {
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = false; });
        }
        setCallState(prev => ({ ...prev, micOn: false }));
      }

      if (data?.forceStopScreenShare && screenTrackRef.current) {
        if (screenTrackRef.current) {
          screenTrackRef.current.stop();
          screenTrackRef.current = null;
        }
        setCallState(prev => ({ ...prev, isScreenSharing: false }));
      }

      if (data?.isScreenSharing !== undefined) {
        setCallState(prev => ({
          ...prev,
          remoteScreenSharing: data.isScreenSharing && data.screenSharingBy !== profileName,
        }));
      }
    });

    const unsubCaller1 = onSnapshot(collection(db, 'calls', String(chatId), 'callerCandidates'), (snap) => {
      snap.docChanges().forEach(ch => {
        if (ch.type === 'added') addOrQueueCandidate(ch.doc.data());
      });
    });
    const unsubCaller2 = onSnapshot(collection(db, 'calls', String(chatId), 'offerCandidates'), (snap) => {
      snap.docChanges().forEach(ch => {
        if (ch.type === 'added') addOrQueueCandidate(ch.doc.data());
      });
    });

    unsubsRef.current = [unsubCallDoc, unsubCaller1, unsubCaller2];
    return { chatId, type: type || 'video', from: fromUser };
  }, [selectedChat, profileName, stopRingtone, _getLocalStream, _createPC, _cleanup, addOrQueueCandidate, flushPendingCandidates]);

  // =======================================================================
  // 5. LANCER UN APPEL (CALLER)
  // =======================================================================
  const startCall = useCallback(async (type) => {
    const chatId = selectedChat?.id;
    if (!chatId) return;

    // Protection anti-double sonnerie : vérifier si un appel est déjà actif
    try {
      const existingSnap = await getDoc(doc(db, 'calls', String(chatId)));
      if (existingSnap.exists()) {
        const existingData = existingSnap.data();
        const myUid = profileUid || (auth.currentUser && auth.currentUser.uid) || null;
        const normalizedProfile = (profileName || '').trim().toLowerCase();
        const isFromMe = (existingData.from && (existingData.from || '').trim().toLowerCase() === normalizedProfile) ||
          (existingData.fromUid && myUid && String(existingData.fromUid) === String(myUid));

        if (!isFromMe && existingData.offer && (existingData.status === 'ringing' || existingData.status === 'connected')) {
          await joinActiveCall(chatId, existingData.type || type, existingData);
          return;
        }
      }
    } catch (checkErr) {
      console.warn('[WebRTC] check existing call error:', checkErr);
    }

    callStartTimeRef.current = Date.now();
    activeCallChatIdRef.current = String(chatId);
    activeCallTypeRef.current = type;
    isCallConnectedRef.current = false;

    const stream = await _getLocalStream(type);
    if (!stream) {
      setCallState({ type: null, active: false, ringing: false, micOn: true, camOn: true, isScreenSharing: false, isHost: false, inviteOpen: false, copied: false, remoteScreenSharing: false });
      return;
    }
    setLocalStream(stream);
    localStreamRef.current = stream;

    setCallState({ type, active: true, ringing: true, micOn: true, camOn: type === 'video', isScreenSharing: false, isHost: true, inviteOpen: false, copied: false, remoteScreenSharing: false });
    playRingtone();
    if (navigator.vibrate) navigator.vibrate([300, 100, 300]);

    const pc = _createPC(chatId, 'caller');
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const partnerUid = selectedChat?.partnerUid || selectedChat?.uid || selectedChat?.authorUid || selectedChat?.userId || null;
    const partnerName = selectedChat?.user || selectedChat?.name || selectedChat?.partnerName || 'Interlocuteur';
    const myUid = profileUid || (auth.currentUser && auth.currentUser.uid) || null;

    await setDoc(doc(db, 'calls', String(chatId)), {
      type,
      from: profileName,
      fromUid: myUid,
      to: partnerName,
      toUid: partnerUid,
      participants: [profileName],
      targetParticipants: [partnerName, partnerUid, profileName, myUid].filter(Boolean),
      status: 'ringing',
      offer: { type: offer.type, sdp: offer.sdp },
      isScreenSharing: false,
      startedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Mettre à jour l'état de la salle active dans la conversation
    setDoc(doc(db, 'chats', String(chatId)), {
      activeCall: {
        chatId: String(chatId),
        host: profileName,
        type: type,
        isLive: true,
        startedAt: serverTimestamp(),
        participants: [profileName],
      }
    }, { merge: true }).catch(() => { });

    // Écouter la réponse SDP et les signaux
    const unsubAnswer = onSnapshot(doc(db, 'calls', String(chatId)), async (snap) => {
      if (!snap.exists()) {
        _cleanup(true);
        setCallState({ type: null, active: false, ringing: false, micOn: true, camOn: true, isScreenSharing: false, isHost: false, inviteOpen: false, copied: false, remoteScreenSharing: false });
        setDoc(doc(db, 'chats', String(chatId)), {
          activeCall: null,
          isLive: false,
          updatedAt: serverTimestamp()
        }, { merge: true }).catch(() => { });
        return;
      }
      const data = snap.data();
      if (data?.answer && !pc.currentRemoteDescription) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          isCallConnectedRef.current = true;
          stopRingtone();
          setCallState(prev => ({ ...prev, ringing: false, active: true }));
          await flushPendingCandidates();
        } catch (e) {
          console.warn('[WebRTC] setRemoteDescription answer error:', e);
        }
      }

      if (data?.isScreenSharing !== undefined) {
        setCallState(prev => ({
          ...prev,
          remoteScreenSharing: data.isScreenSharing && data.screenSharingBy !== profileName,
        }));
      }
    });

    // Écouter les candidats ICE de l'appelé
    const unsubCallee1 = onSnapshot(collection(db, 'calls', String(chatId), 'calleeCandidates'), (snap) => {
      snap.docChanges().forEach(ch => {
        if (ch.type === 'added') addOrQueueCandidate(ch.doc.data());
      });
    });
    const unsubCallee2 = onSnapshot(collection(db, 'calls', String(chatId), 'answerCandidates'), (snap) => {
      snap.docChanges().forEach(ch => {
        if (ch.type === 'added') addOrQueueCandidate(ch.doc.data());
      });
    });

    unsubsRef.current = [unsubAnswer, unsubCallee1, unsubCallee2];
  }, [selectedChat, profileName, profileUid, playRingtone, stopRingtone, _getLocalStream, _createPC, _cleanup, addOrQueueCandidate, flushPendingCandidates, joinActiveCall]);

  // =======================================================================
  // 6. ACCEPTER UN APPEL (CALLEE)
  // =======================================================================
  const acceptIncomingCall = useCallback(async () => {
    if (!incomingCall) return null;
    const { chatId, type, from } = incomingCall;
    await joinActiveCall(chatId, type);
    return { chatId, type, from };
  }, [incomingCall, joinActiveCall]);

  // =======================================================================
  // 7. RACCROCHER & REFUSER
  // =======================================================================
  const endCall = useCallback(() => {
    const chatId = activeCallChatIdRef.current || selectedChat?.id;
    const durationSecs = callStartTimeRef.current ? Math.max(1, Math.floor((Date.now() - callStartTimeRef.current) / 1000)) : 0;
    const callType = activeCallTypeRef.current || callState.type || 'video';
    const wasConnected = isCallConnectedRef.current || !callState.ringing;

    // Forcer l'arrêt immédiat des flux médias
    if (localStreamRef.current) {
      try {
        localStreamRef.current.getTracks().forEach(track => {
          try { track.stop(); } catch (_) { }
        });
      } catch (_) { }
    }

    if (chatId) {
      setDoc(doc(db, 'chats', String(chatId)), {
        activeCall: null,
        isLive: false,
        endedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true }).catch(() => { });

      deleteDoc(doc(db, 'calls', String(chatId))).catch(() => { });

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (wasConnected) {
        const mins = String(Math.floor(durationSecs / 60)).padStart(2, '0');
        const secs = String(durationSecs % 60).padStart(2, '0');
        const typeLabel = callType === 'video' ? 'Appel vidéo' : 'Appel audio';
        const logText = `📞 ${typeLabel} terminé • ${timeStr} • Durée : ${mins}:${secs}`;
        addDoc(collection(db, 'chats', String(chatId), 'messages'), {
          sender: 'system',
          senderName: 'Troco Direct',
          text: logText,
          kind: 'call-log',
          callType: callType,
          duration: durationSecs,
          createdAt: serverTimestamp(),
          translations: {
            FR: logText,
            EN: `📞 ${callType === 'video' ? 'Video' : 'Audio'} call ended • ${timeStr} • Duration: ${mins}:${secs}`
          }
        }).catch(() => { });
      } else {
        const logText = `📵 Appel sans réponse • ${timeStr}`;
        addDoc(collection(db, 'chats', String(chatId), 'messages'), {
          sender: 'system',
          senderName: 'Troco Direct',
          text: logText,
          kind: 'call-log',
          status: 'missed',
          createdAt: serverTimestamp(),
          translations: {
            FR: logText,
            EN: `📵 Missed call • ${timeStr}`
          }
        }).catch(() => { });
      }
    }

    _cleanup(false);
    stopRingtone();
    setCallState({ type: null, active: false, ringing: false, micOn: true, camOn: true, isScreenSharing: false, isHost: false, inviteOpen: false, copied: false, remoteScreenSharing: false });
  }, [_cleanup, selectedChat?.id, callState.type, callState.ringing, stopRingtone]);

  const declineIncomingCall = useCallback(() => {
    stopRingtone();

    // Forcer l'arrêt immédiat de tout flux résiduel
    if (localStreamRef.current) {
      try {
        localStreamRef.current.getTracks().forEach(track => {
          try { track.stop(); } catch (_) { }
        });
      } catch (_) { }
    }
    _cleanup(false);

    if (!incomingCall) return;
    const { chatId } = incomingCall;

    setDoc(doc(db, 'chats', String(chatId)), {
      activeCall: null,
      isLive: false,
      endedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true }).catch(() => { });

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const logText = `📵 Appel sans réponse • ${timeStr}`;
    addDoc(collection(db, 'chats', String(chatId), 'messages'), {
      sender: 'system',
      senderName: 'Troco Direct',
      text: logText,
      kind: 'call-log',
      status: 'missed',
      createdAt: serverTimestamp(),
      translations: {
        FR: logText,
        EN: `📵 Missed call • ${timeStr}`
      }
    }).catch(() => { });

    deleteDoc(doc(db, 'calls', String(chatId))).catch(() => { });
    setIncomingCall(null);
  }, [incomingCall, stopRingtone, _cleanup]);

  // =======================================================================
  // 7. ÉCOUTE UNIVERSELLE DES APPELS ENTRANTS
  // =======================================================================
  useEffect(() => {
    if (!profileName && !profileUid && !auth.currentUser?.uid) return;
    const normalizedProfile = (profileName || '').trim().toLowerCase();
    const currentUid = profileUid || (auth.currentUser && auth.currentUser.uid);

    const unsub = onSnapshot(collection(db, 'calls'), (snap) => {
      snap.docChanges().forEach(change => {
        const data = change.doc.data();
        if (!data) return;

        const fromName = (data.from || '').trim().toLowerCase();
        if (fromName && normalizedProfile && fromName === normalizedProfile) return;
        if (data.fromUid && currentUid && String(data.fromUid) === String(currentUid)) return;

        const targetTo = (data?.to || '').trim().toLowerCase();
        const targetToUid = data?.toUid ? String(data.toUid) : null;
        const currentUidStr = currentUid ? String(currentUid) : null;

        const isMatch = (normalizedProfile && targetTo === normalizedProfile) ||
          (currentUidStr && targetToUid && targetToUid === currentUidStr) ||
          (Array.isArray(data?.targetParticipants) && (
            data.targetParticipants.map(p => String(p).trim().toLowerCase()).includes(normalizedProfile) ||
            (currentUidStr && data.targetParticipants.includes(currentUidStr))
          )) ||
          (Array.isArray(data?.participants) && (
            data.participants.map(p => String(p).trim().toLowerCase()).includes(normalizedProfile) ||
            (currentUidStr && data.participants.includes(currentUidStr))
          ));

        if ((change.type === 'added' || change.type === 'modified') && isMatch && data.status === 'ringing') {
          setIncomingCall({
            chatId: change.doc.id,
            type: data.type || 'video',
            from: data.from || 'Interlocuteur',
            fromUid: data.fromUid || null
          });
          playRingtone();
          if (navigator.vibrate) navigator.vibrate([400, 150, 400, 150, 400]);
        }
        if (change.type === 'removed') {
          setIncomingCall(prev => prev?.chatId === change.doc.id ? null : prev);
          stopRingtone();
        }
        if (change.type === 'modified' && (data.status === 'connected' || data.status === 'ended' || data.status === 'declined' || data.status === 'canceled')) {
          setIncomingCall(prev => prev?.chatId === change.doc.id ? null : prev);
          stopRingtone();
        }
      });
    });
    return () => unsub();
  }, [profileName, profileUid, playRingtone, stopRingtone]);

  // =======================================================================
  // 8. CONTRÔLES (MICRO, CAMÉRA, PARTAGE ÉCRAN, MODÉRATION)
  // =======================================================================
  const toggleMic = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => { t.enabled = !callState.micOn; });
    }
    setCallState(prev => ({ ...prev, micOn: !prev.micOn }));
  }, [localStream, callState.micOn]);

  const toggleCam = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => { t.enabled = !callState.camOn; });
    }
    setCallState(prev => ({ ...prev, camOn: !prev.camOn }));
  }, [localStream, callState.camOn]);

  const toggleScreenShare = useCallback(async () => {
    if (!pcRef.current || !localStream) return;

    if (callState.isScreenSharing) {
      try {
        if (screenTrackRef.current) {
          screenTrackRef.current.stop();
          screenTrackRef.current = null;
        }

        let camTrack = cameraTrackRef.current;
        if (!camTrack || camTrack.readyState === 'ended') {
          const camStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          });
          camTrack = camStream.getVideoTracks()[0];
          cameraTrackRef.current = camTrack;
        }

        const sender = pcRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender && camTrack) {
          await sender.replaceTrack(camTrack);
        }

        const audioTrack = localStream.getAudioTracks()[0];
        const combinedStream = new MediaStream(audioTrack ? [camTrack, audioTrack] : [camTrack]);
        setLocalStream(combinedStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = combinedStream;
          localVideoRef.current.play().catch(() => { });
        }
        setCallState(prev => ({ ...prev, isScreenSharing: false }));

        const targetChatId = activeChatIdRef.current || selectedChat?.id;
        if (targetChatId) {
          updateDoc(doc(db, 'calls', String(targetChatId)), {
            isScreenSharing: false,
            screenSharingBy: null,
          }).catch(() => { });
        }
      } catch (err) {
        console.warn('[WebRTC] Erreur retour caméra :', err);
      }
      return;
    }

    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        alert("Le partage d'écran n'est pas supporté par votre navigateur.");
        return;
      }

      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always', displaySurface: 'monitor' },
        audio: false,
      });

      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack) return;

      screenTrackRef.current = screenTrack;
      cameraTrackRef.current = localStream.getVideoTracks()[0];

      screenTrack.onended = () => {
        toggleScreenShare();
      };

      const sender = pcRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender) {
        await sender.replaceTrack(screenTrack);
      }

      const audioTrack = localStream.getAudioTracks()[0];
      const combinedStream = new MediaStream(audioTrack ? [screenTrack, audioTrack] : [screenTrack]);
      setLocalStream(combinedStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = combinedStream;
        localVideoRef.current.play().catch(() => { });
      }
      setCallState(prev => ({ ...prev, isScreenSharing: true }));

      const targetChatId = activeChatIdRef.current || selectedChat?.id;
      if (targetChatId) {
        updateDoc(doc(db, 'calls', String(targetChatId)), {
          isScreenSharing: true,
          screenSharingBy: profileName,
        }).catch(() => { });
      }
    } catch (err) {
      console.warn('[WebRTC] getDisplayMedia refusé ou annulé :', err);
    }
  }, [callState.isScreenSharing, localStream, profileName, selectedChat]);

  const hostMuteParticipant = useCallback(async () => {
    const targetChatId = activeChatIdRef.current || selectedChat?.id;
    if (!targetChatId) return;
    try {
      await updateDoc(doc(db, 'calls', String(targetChatId)), {
        forceMuteParticipant: true,
        moderatedAt: serverTimestamp(),
      });
      alert("Micro du participant coupé avec succès.");
    } catch (err) {
      console.warn('[WebRTC] hostMuteParticipant error:', err);
    }
  }, [selectedChat]);

  const hostStopParticipantScreenShare = useCallback(async () => {
    const targetChatId = activeChatIdRef.current || selectedChat?.id;
    if (!targetChatId) return;
    try {
      await updateDoc(doc(db, 'calls', String(targetChatId)), {
        forceStopScreenShare: true,
        moderatedAt: serverTimestamp(),
      });
      alert("Partage d'écran du participant arrêté.");
    } catch (err) {
      console.warn('[WebRTC] hostStopParticipantScreenShare error:', err);
    }
  }, [selectedChat]);

  const copyInviteLink = useCallback(() => {
    const link = `https://troco.app/join/${selectedChat?.id || 'group'}`;
    navigator.clipboard?.writeText(link).catch(() => { });
    setCallState(prev => ({ ...prev, copied: true }));
    window.setTimeout(() => setCallState(prev => ({ ...prev, copied: false })), 1800);
  }, [selectedChat]);

  const switchCamera = useCallback(async () => {
    if (callState.type !== 'video' || !localStream || callState.isScreenSharing) return;
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    try {
      localStream.getVideoTracks().forEach(track => {
        try { track.stop(); } catch (_) { }
      });

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: nextFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) return;

      if (pcRef.current) {
        const sender = pcRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }

      const audioTrack = localStream.getAudioTracks()[0];
      const combinedTracks = audioTrack ? [newVideoTrack, audioTrack] : [newVideoTrack];
      const combinedStream = new MediaStream(combinedTracks);

      setLocalStream(combinedStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = combinedStream;
        localVideoRef.current.play().catch(() => { });
      }
      setFacingMode(nextFacing);
    } catch (err) {
      console.warn('[WebRTC] Erreur switchCamera vers :', nextFacing, err);
    }
  }, [callState.type, callState.isScreenSharing, localStream, facingMode]);

  return {
    callState, localStream, remoteStream, incomingCall,
    localVideoRef, remoteVideoRef,
    attachLocalStream, attachRemoteStream,
    facingMode, hasMultipleCameras, switchCamera,
    startCall, joinActiveCall, acceptIncomingCall, declineIncomingCall, endCall,
    toggleMic, toggleCam, toggleScreenShare,
    hostMuteParticipant, hostStopParticipantScreenShare,
    copyInviteLink, playRingtone, stopRingtone,
  };
}
