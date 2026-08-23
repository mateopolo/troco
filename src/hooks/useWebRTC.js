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
import { db } from '../firebase';

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

export function useWebRTC({ profileName, selectedChat }) {
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
  const pcRef = useRef(null);
  const unsubsRef = useRef([]);
  const activeChatIdRef = useRef(null);
  const screenTrackRef = useRef(null);
  const cameraTrackRef = useRef(null);

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

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => { });
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => { });
    }
  }, [remoteStream]);

  useEffect(() => { return () => { _cleanup(); }; }, []); // eslint-disable-line

  const playRingtone = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const beep = (freq, start, dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq; osc.type = 'sine';
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + start + 0.05);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur + 0.05);
      };
      beep(440, 0, 0.35); beep(880, 0.45, 0.35);
      beep(440, 0.9, 0.35); beep(880, 1.35, 0.35);
    } catch (_) { }
  }, []);

  // Gestion sécurisée des autorisations Caméra / Micro avec alertes claires
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
          alert("Accès caméra / microphone refusé :\n\nPour passer des appels audio ou visio sur Troco, veuillez autoriser l'accès aux périphériques dans les paramètres de votre navigateur (cliquez sur l'icône 🔒 à gauche de la barre d'adresse).");
        } else if (fallbackErr.name === 'NotFoundError' || fallbackErr.name === 'DevicesNotFoundError') {
          alert("Périphérique introuvable :\n\nAucun microphone ou caméra n'a été détecté sur votre appareil. Veuillez brancher un périphérique et réessayer.");
        } else if (fallbackErr.name === 'NotReadableError' || fallbackErr.name === 'TrackStartError') {
          alert("Périphérique déjà utilisé :\n\nVotre caméra ou microphone est actuellement occupé par une autre application (Zoom, Teams, etc.). Veuillez la fermer puis relancer l'appel.");
        } else {
          alert("Impossible d'initialiser les flux audio/vidéo. Veuillez vérifier les autorisations de votre navigateur.");
        }
        return null;
      }
    }
  }, []);

  // Nettoyage complet des flux, des écouteurs et suppression du document de signalisation
  const _cleanup = useCallback(() => {
    unsubsRef.current.forEach(u => { try { u(); } catch (_) { } });
    unsubsRef.current = [];
    if (pcRef.current) {
      try { pcRef.current.close(); } catch (_) { }
      pcRef.current = null;
    }
    if (screenTrackRef.current) {
      try { screenTrackRef.current.stop(); } catch (_) { }
      screenTrackRef.current = null;
    }
    if (cameraTrackRef.current) {
      try { cameraTrackRef.current.stop(); } catch (_) { }
      cameraTrackRef.current = null;
    }
    setLocalStream(prev => {
      if (prev) prev.getTracks().forEach(t => t.stop());
      return null;
    });
    setRemoteStream(null);
    const targetChatId = activeChatIdRef.current;
    if (targetChatId) {
      deleteDoc(doc(db, 'calls', String(targetChatId))).catch(() => { });
    }
    activeChatIdRef.current = null;
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
          const stream = prev || new MediaStream();
          stream.addTrack(e.track);
          return stream;
        });
      }
    };

    const myCands = role === 'caller' ? 'callerCandidates' : 'calleeCandidates';
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        addDoc(collection(db, 'calls', String(chatId), myCands), candidate.toJSON()).catch(() => { });
      }
    };

    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        endCall();
      }
    };

    return pc;
  }, []); // eslint-disable-line

  const startCall = useCallback(async (type) => {
    const chatId = selectedChat?.id;
    if (!chatId) return;

    // Enveloppe d'autorisation explicite
    const stream = await _getLocalStream(type);
    if (!stream) {
      setCallState({ type: null, active: false, ringing: false, micOn: true, camOn: true, isScreenSharing: false, isHost: false, inviteOpen: false, copied: false, remoteScreenSharing: false });
      return;
    }
    setLocalStream(stream);

    setCallState({ type, active: true, ringing: true, micOn: true, camOn: type === 'video', isScreenSharing: false, isHost: true, inviteOpen: false, copied: false, remoteScreenSharing: false });
    playRingtone();
    if (navigator.vibrate) navigator.vibrate([300, 100, 300]);

    const pc = _createPC(chatId, 'caller');
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await setDoc(doc(db, 'calls', String(chatId)), {
      type,
      from: profileName,
      to: selectedChat.user,
      status: 'ringing',
      offer: { type: offer.type, sdp: offer.sdp },
      isScreenSharing: false,
      startedAt: serverTimestamp(),
    });

    // Écouter la réponse SDP et les signaux de modération
    const unsubAnswer = onSnapshot(doc(db, 'calls', String(chatId)), async (snap) => {
      if (!snap.exists()) {
        _cleanup();
        setCallState({ type: null, active: false, ringing: false, micOn: true, camOn: true, isScreenSharing: false, isHost: false, inviteOpen: false, copied: false, remoteScreenSharing: false });
        return;
      }
      const data = snap.data();
      if (data?.answer && !pc.currentRemoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        setCallState(prev => ({ ...prev, ringing: false }));
      }

      // Signal de partage d'écran distant
      if (data?.isScreenSharing !== undefined) {
        setCallState(prev => ({
          ...prev,
          remoteScreenSharing: data.isScreenSharing && data.screenSharingBy !== profileName,
        }));
      }
    });

    // Écouter les candidats ICE de l'appelé
    const unsubCallee = onSnapshot(collection(db, 'calls', String(chatId), 'calleeCandidates'), (snap) => {
      snap.docChanges().forEach(ch => {
        if (ch.type === 'added') {
          pc.addIceCandidate(new RTCIceCandidate(ch.doc.data())).catch(() => { });
        }
      });
    });

    unsubsRef.current = [unsubAnswer, unsubCallee];
  }, [selectedChat, profileName, playRingtone, _getLocalStream, _createPC, _cleanup]);

  const acceptIncomingCall = useCallback(async () => {
    if (!incomingCall) return null;
    const { chatId, type, from } = incomingCall;
    setIncomingCall(null);

    // Enveloppe d'autorisation explicite
    const stream = await _getLocalStream(type);
    if (!stream) {
      setCallState({ type: null, active: false, ringing: false, micOn: true, camOn: true, isScreenSharing: false, isHost: false, inviteOpen: false, copied: false, remoteScreenSharing: false });
      return null;
    }
    setLocalStream(stream);

    setCallState({ type, active: true, ringing: false, micOn: true, camOn: type === 'video', isScreenSharing: false, isHost: false, inviteOpen: false, copied: false, remoteScreenSharing: false });

    const callSnap = await getDoc(doc(db, 'calls', String(chatId)));
    if (!callSnap.exists()) return null;
    const callData = callSnap.data();

    const pc = _createPC(chatId, 'callee');
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await updateDoc(doc(db, 'calls', String(chatId)), {
      answer: { type: answer.type, sdp: answer.sdp },
      status: 'connected',
    });

    const unsubCallDoc = onSnapshot(doc(db, 'calls', String(chatId)), (snap) => {
      if (!snap.exists()) {
        _cleanup();
        setCallState({ type: null, active: false, ringing: false, micOn: true, camOn: true, isScreenSharing: false, isHost: false, inviteOpen: false, copied: false, remoteScreenSharing: false });
        return;
      }
      const data = snap.data();

      // Signal de coupure micro par le professeur / hôte
      if (data?.forceMuteParticipant) {
        if (stream) {
          stream.getAudioTracks().forEach(t => { t.enabled = false; });
        }
        setCallState(prev => ({ ...prev, micOn: false }));
      }

      // Signal d'arrêt de partage d'écran par le professeur / hôte
      if (data?.forceStopScreenShare && screenTrackRef.current) {
        if (screenTrackRef.current) {
          screenTrackRef.current.stop();
          screenTrackRef.current = null;
        }
        setCallState(prev => ({ ...prev, isScreenSharing: false }));
      }

      // Signal de partage d'écran distant
      if (data?.isScreenSharing !== undefined) {
        setCallState(prev => ({
          ...prev,
          remoteScreenSharing: data.isScreenSharing && data.screenSharingBy !== profileName,
        }));
      }
    });

    const unsubCaller = onSnapshot(collection(db, 'calls', String(chatId), 'callerCandidates'), (snap) => {
      snap.docChanges().forEach(ch => {
        if (ch.type === 'added') {
          pc.addIceCandidate(new RTCIceCandidate(ch.doc.data())).catch(() => { });
        }
      });
    });

    unsubsRef.current = [unsubCallDoc, unsubCaller];
    return { chatId, type, from };
  }, [incomingCall, _getLocalStream, _createPC, _cleanup, profileName]);

  // Raccrochage avec suppression immédiate du signal Firestore
  const endCall = useCallback(() => {
    const targetChatId = activeChatIdRef.current || selectedChat?.id;
    if (targetChatId) {
      deleteDoc(doc(db, 'calls', String(targetChatId))).catch(() => { });
    }
    _cleanup();
    setCallState({ type: null, active: false, ringing: false, micOn: true, camOn: true, isScreenSharing: false, isHost: false, inviteOpen: false, copied: false, remoteScreenSharing: false });
  }, [selectedChat, _cleanup]);

  // Refus d'appel avec suppression du signal
  const declineIncomingCall = useCallback(() => {
    if (!incomingCall) return;
    deleteDoc(doc(db, 'calls', String(incomingCall.chatId))).catch(() => { });
    setIncomingCall(null);
  }, [incomingCall]);

  // Écoute des appels entrants pour cet utilisateur (to === profileName)
  useEffect(() => {
    if (!profileName) return;
    const unsub = onSnapshot(collection(db, 'calls'), (snap) => {
      snap.docChanges().forEach(change => {
        const data = change.doc.data();
        if (change.type === 'added' && data.to === profileName && data.status === 'ringing') {
          setIncomingCall({ chatId: change.doc.id, type: data.type, from: data.from });
          playRingtone();
          if (navigator.vibrate) navigator.vibrate([400, 150, 400, 150, 400]);
        }
        if (change.type === 'removed') {
          setIncomingCall(prev => prev?.chatId === change.doc.id ? null : prev);
        }
      });
    });
    return () => unsub();
  }, [profileName, playRingtone]);

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

  // ---- FONCTIONNALITÉ 1 : PARTAGE D'ÉCRAN (SCREEN SHARE) AVEC BASCULE INSTANTANÉE ----
  const toggleScreenShare = useCallback(async () => {
    if (!pcRef.current || !localStream) return;

    // Cas 1 : Arrêt du partage d'écran -> Revenir à la caméra
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
        console.warn('[WebRTC] Erreur lors du retour à la caméra :', err);
      }
      return;
    }

    // Cas 2 : Lancement du partage d'écran via getDisplayMedia
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        alert("Le partage d'écran n'est pas supporté par votre navigateur (disponible sur PC, Mac et certains mobiles compatibles).");
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

      // Écoute de l'arrêt natif du navigateur
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
      console.warn('[WebRTC] getDisplayMedia annulé ou refusé :', err);
    }
  }, [callState.isScreenSharing, localStream, profileName, selectedChat]);

  // ---- FONCTIONNALITÉ 2 : DROITS PROFESSEUR / HÔTE (MODÉRATION D'APPEL) ----
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

  // Basculement dynamique de caméra (avant/arrière) avec replaceTrack
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
    facingMode, hasMultipleCameras, switchCamera,
    startCall, acceptIncomingCall, declineIncomingCall, endCall,
    toggleMic, toggleCam, toggleScreenShare,
    hostMuteParticipant, hostStopParticipantScreenShare,
    copyInviteLink, playRingtone,
  };
}
