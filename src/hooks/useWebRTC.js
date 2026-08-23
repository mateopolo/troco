/**
 * useWebRTC.js — Signalisation WebRTC temps réel via Firestore (Wi-Fi ⇄ 4G/5G),
 * Partage d'écran, bascule caméra avant/arrière, et outils de modération hôte.
 *
 * Architecture Firestore :
 *   calls/{chatId}                          → type, from, to, status, offer, answer, isScreenSharing, screenSharingBy, forceMuteParticipant, forceStopScreenShare
 *   calls/{chatId}/callerCandidates/{id}    → candidats ICE de l'appelant
 *   calls/{chatId}/calleeCandidates/{id}    → candidats ICE de l'appelé
 *   chats/{chatId}.activeCall               → état "salle active" affiché dans le fil de discussion
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import {
  doc, collection, addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, getDoc, getDocs, serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';

// Plusieurs serveurs STUN + pool de candidats : traversée NAT plus fiable sur Wi-Fi/4G/5G.
// NOTE IMPORTANTE : il n'y a toujours aucun serveur TURN ici. Le STUN seul suffit quand les deux
// appareils sont sur des réseaux "ouverts", mais échoue souvent entre 4G/5G ou Wi-Fi d'entreprise
// à cause du NAT symétrique. Si les appels échouent spécifiquement en cross-réseau (un mobile
// en 4G + un PC en Wi-Fi, par ex.), il faut ajouter un serveur TURN (Twilio NTS, Metered.ca,
// Cloudflare Calls...) dans iceServers ci-dessous.
const ICE_CONFIG = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
      ],
    },
    {
      // Serveur TURN public de secours pour contourner les pare-feu 4G / Wi-Fi stricts
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turns:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    }
  ],
  iceCandidatePoolSize: 10,
};

export function useWebRTC({ profileName, profileUid, selectedChat }) {
  const [callState, setCallState] = useState({
    type: null, active: false, ringing: false,
    micOn: true, camOn: true, isScreenSharing: false, isHost: false,
    inviteOpen: false, copied: false, remoteScreenSharing: false,
    isReconnecting: false,
  });

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' (avant) ou 'environment' (arrière)
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const unsubsRef = useRef([]);
  const activeChatIdRef = useRef(null);

  const screenTrackRef = useRef(null);
  const cameraTrackRef = useRef(null);

  const ringtoneCtxRef = useRef(null);
  const ringtoneIntervalRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  const callStartTimeRef = useRef(null);
  const isCallConnectedRef = useRef(false);

  // =======================================================================
  // 0. DÉTECTION DES CAMÉRAS DISPONIBLES (pour afficher le bouton bascule)
  // =======================================================================
  useEffect(() => {
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || ('ontouchstart' in window);
    if (!navigator.mediaDevices?.enumerateDevices) {
      setHasMultipleCameras(isMobile);
      return;
    }
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setHasMultipleCameras(videoInputs.length > 1 || isMobile);
      })
      .catch(() => setHasMultipleCameras(isMobile));
  }, []);

  // =======================================================================
  // 1. GESTION DE LA SONNERIE (Nettoyage strict)
  // =======================================================================
  const stopRingtone = useCallback(() => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
    if (ringtoneCtxRef.current) {
      try { ringtoneCtxRef.current.close(); } catch (_) { }
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

      const triggerBeep = () => {
        if (!ringtoneCtxRef.current || ringtoneCtxRef.current.state === 'closed') return;
        const cur = ringtoneCtxRef.current.currentTime;
        const beep = (freq, start, dur) => {
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
        beep(440, 0, 0.3);
        beep(880, 0.4, 0.3);
      };

      triggerBeep();
      ringtoneIntervalRef.current = setInterval(triggerBeep, 2500);
    } catch (_) { }
  }, [stopRingtone]);

  // =======================================================================
  // 2. ATTACHEMENT SÉCURISÉ DES FLUX AUX BALISES VIDÉO
  //    (le .play() explicite est nécessaire sur mobile — Safari/iOS et Chrome
  //    Android n'auto-jouent pas toujours après un simple changement de srcObject)
  // =======================================================================
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
      if (el.srcObject !== localStream) el.srcObject = localStream;
      el.play().catch(() => { });
    }
  }, [localStream]);

  const attachRemoteStream = useCallback((el) => {
    if (el && remoteStream) {
      if (el.srcObject !== remoteStream) el.srcObject = remoteStream;
      el.play().catch(() => { });
    }
  }, [remoteStream]);

  // =======================================================================
  // 3. NETTOYAGE COMPLET (CLEANUP)
  //    FIX : on supprime aussi les sous-collections callerCandidates /
  //    calleeCandidates. Sans ça, Firestore les garde indéfiniment (supprimer
  //    le document parent NE supprime PAS ses sous-collections), et chaque
  //    nouvel appel sur la même discussion rejouait tous les vieux candidats
  //    ICE des appels précédents dès l'ouverture du listener — ça polluait
  //    la négociation et pouvait faire échouer ou ralentir la connexion.
  // =======================================================================
  const _purgeCandidateSubcollections = useCallback(async (chatId) => {
    if (!chatId) return;
    try {
      const [callerSnap, calleeSnap] = await Promise.all([
        getDocs(collection(db, 'calls', String(chatId), 'callerCandidates')),
        getDocs(collection(db, 'calls', String(chatId), 'calleeCandidates')),
      ]);
      const deletions = [
        ...callerSnap.docs.map(d => deleteDoc(d.ref).catch(() => { })),
        ...calleeSnap.docs.map(d => deleteDoc(d.ref).catch(() => { })),
      ];
      await Promise.all(deletions);
    } catch (_) { /* best-effort, jamais bloquant */ }
  }, []);

  const _cleanup = useCallback(() => {
    stopRingtone();
    pendingCandidatesRef.current = [];
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
    activeChatIdRef.current = null;
  }, [stopRingtone]);

  useEffect(() => { return () => _cleanup(); }, [_cleanup]);

  // =======================================================================
  // 4. MOTEUR WEBRTC (PEER CONNECTION & ICE CANDIDATES)
  // =======================================================================
  const addOrQueueCandidate = useCallback(async (candidateData) => {
    if (!candidateData) return;
    const pc = pcRef.current;
    if (!pc) return;
    try {
      const candidate = new RTCIceCandidate(candidateData);
      // RÈGLE D'OR : On n'ajoute les ICE que SI la remoteDescription est prête
      if (pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(candidate);
      } else {
        pendingCandidatesRef.current.push(candidate);
      }
    } catch (err) {
      console.warn('[WebRTC] Erreur ICE Candidate:', err);
    }
  }, []);

  const flushPendingCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    while (pendingCandidatesRef.current.length > 0) {
      const cand = pendingCandidatesRef.current.shift();
      try { await pc.addIceCandidate(cand); } catch (_) { }
    }
  }, []);

  const _createPC = useCallback((chatId, role) => {
    const pc = new RTCPeerConnection(ICE_CONFIG);
    pcRef.current = pc;
    activeChatIdRef.current = chatId;

    // Réception du flux distant
    pc.ontrack = (e) => {
      if (e.streams && e.streams[0]) {
        setRemoteStream(e.streams[0]);
      }
    };

    // Envoi de nos candidats ICE vers Firestore
    const myCandidatesCollection = role === 'caller' ? 'callerCandidates' : 'calleeCandidates';
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        addDoc(collection(db, 'calls', String(chatId), myCandidatesCollection), candidate.toJSON()).catch(() => { });
      }
    };

    // FIX : sans ces deux handlers, une connexion qui ne s'établit pas du premier coup
    // (fréquent en changeant de réseau, Wi-Fi ⇄ 4G) restait bloquée indéfiniment sans
    // aucune tentative de reprise ni retour visuel — ça ressemblait à "l'appel ne marche
    // plus" alors que c'était juste une négociation ICE jamais relancée.
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setCallState(prev => ({ ...prev, ringing: false, isReconnecting: false }));
      } else if (pc.iceConnectionState === 'disconnected') {
        setCallState(prev => ({ ...prev, isReconnecting: true }));
      } else if (pc.iceConnectionState === 'failed') {
        console.warn('[WebRTC] ICE failed — tentative de restartIce()');
        try { if (typeof pc.restartIce === 'function') pc.restartIce(); } catch (_) { }
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallState(prev => ({ ...prev, ringing: false, isReconnecting: false }));
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setCallState(prev => ({ ...prev, isReconnecting: true }));
      }
    };

    return pc;
  }, []);

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
          alert("Accès caméra / microphone refusé :\n\nPour passer des appels audio ou visio sur Troco, veuillez autoriser l'accès aux périphériques dans les paramètres de votre navigateur (icône 🔒 à gauche de la barre d'adresse).");
        } else if (fallbackErr.name === 'NotFoundError' || fallbackErr.name === 'DevicesNotFoundError') {
          alert("Périphérique introuvable :\n\nAucun microphone ou caméra détecté sur votre appareil.");
        } else if (fallbackErr.name === 'NotReadableError' || fallbackErr.name === 'TrackStartError') {
          alert("Périphérique déjà utilisé :\n\nVotre caméra ou micro est occupé par une autre application (Zoom, Teams...). Fermez-la puis relancez l'appel.");
        } else {
          alert("Impossible d'initialiser les flux audio/vidéo. Vérifiez les autorisations de votre navigateur.");
        }
        return null;
      }
    }
  }, []);

  // =======================================================================
  // 5. APPELER (CALLER)
  // =======================================================================
  const startCall = useCallback(async (type) => {
    const chatId = selectedChat?.id;
    if (!chatId) return;

    await _purgeCandidateSubcollections(chatId); // repart d'une base propre

    const stream = await _getLocalStream(type);
    if (!stream) return;
    setLocalStream(stream);

    callStartTimeRef.current = Date.now();
    isCallConnectedRef.current = false;

    setCallState({
      type, active: true, ringing: true, micOn: true, camOn: type === 'video',
      isScreenSharing: false, isHost: true, inviteOpen: false, copied: false,
      remoteScreenSharing: false, isReconnecting: false,
    });
    playRingtone();
    if (navigator.vibrate) navigator.vibrate([300, 100, 300]);

    const pc = _createPC(chatId, 'caller');
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const partnerUid = selectedChat.partnerUid || selectedChat.uid || selectedChat.authorUid || selectedChat.userId || null;
    const partnerName = selectedChat.user || selectedChat.name || selectedChat.partnerName || 'Interlocuteur';
    const myUid = profileUid || (auth.currentUser && auth.currentUser.uid) || null;

    // Document d'appel
    await setDoc(doc(db, 'calls', String(chatId)), {
      type,
      from: profileName,
      fromUid: myUid,
      to: partnerName,
      toUid: partnerUid,
      participants: [profileName],
      status: 'ringing',
      offer: { type: offer.type, sdp: offer.sdp },
      startedAt: serverTimestamp(),
    });

    // Bannière "salle active" dans le fil de discussion
    setDoc(doc(db, 'chats', String(chatId)), {
      activeCall: { chatId: String(chatId), host: profileName, type, isLive: true, startedAt: serverTimestamp(), participants: [profileName] },
    }, { merge: true }).catch(() => { });

    // Écoute de la réponse de l'interlocuteur
    const unsubAnswer = onSnapshot(doc(db, 'calls', String(chatId)), async (snap) => {
      if (!snap.exists()) {
        endCallRef.current(false);
        return;
      }
      const data = snap.data();
      if (data?.answer && !pc.currentRemoteDescription) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          isCallConnectedRef.current = true;
          stopRingtone();
          setCallState(prev => ({ ...prev, ringing: false }));
          await flushPendingCandidates();
        } catch (e) { console.warn('[WebRTC] setRemoteDescription answer error:', e); }
      }
      if (data?.isScreenSharing !== undefined) {
        setCallState(prev => ({ ...prev, remoteScreenSharing: data.isScreenSharing && data.screenSharingBy !== profileName }));
      }
    });

    // Écoute des candidats ICE de l'interlocuteur
    const unsubCallee = onSnapshot(collection(db, 'calls', String(chatId), 'calleeCandidates'), (snap) => {
      snap.docChanges().forEach(ch => {
        if (ch.type === 'added') addOrQueueCandidate(ch.doc.data());
      });
    });

    unsubsRef.current = [unsubAnswer, unsubCallee];
  }, [selectedChat, profileName, profileUid, playRingtone, stopRingtone, _getLocalStream, _createPC, _purgeCandidateSubcollections, addOrQueueCandidate, flushPendingCandidates]);

  // =======================================================================
  // 6. DÉCROCHER (CALLEE)
  // =======================================================================
  const acceptIncomingCall = useCallback(async () => {
    if (!incomingCall) return null;
    const { chatId, type, from } = incomingCall;
    setIncomingCall(null);
    stopRingtone();

    const stream = await _getLocalStream(type);
    if (!stream) return null;
    setLocalStream(stream);

    callStartTimeRef.current = Date.now();
    isCallConnectedRef.current = true;

    setCallState({
      type, active: true, ringing: false, micOn: true, camOn: type === 'video',
      isScreenSharing: false, isHost: false, inviteOpen: false, copied: false,
      remoteScreenSharing: false, isReconnecting: false,
    });

    const callSnap = await getDoc(doc(db, 'calls', String(chatId)));
    if (!callSnap.exists()) return null;
    const callData = callSnap.data();

    const pc = _createPC(chatId, 'callee');
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
    await flushPendingCandidates();

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    const updatedParticipants = Array.from(new Set([...(callData.participants || [from]), profileName]));

    await updateDoc(doc(db, 'calls', String(chatId)), {
      answer: { type: answer.type, sdp: answer.sdp },
      participants: updatedParticipants,
      status: 'connected',
    });

    setDoc(doc(db, 'chats', String(chatId)), {
      activeCall: { isLive: true, type, participants: updatedParticipants },
    }, { merge: true }).catch(() => { });

    const unsubCallDoc = onSnapshot(doc(db, 'calls', String(chatId)), (snap) => {
      if (!snap.exists()) {
        endCallRef.current(false);
        return;
      }
      const data = snap.data();
      if (data?.forceMuteParticipant && stream) {
        stream.getAudioTracks().forEach(t => { t.enabled = false; });
        setCallState(prev => ({ ...prev, micOn: false }));
      }
      if (data?.forceStopScreenShare && screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
        setCallState(prev => ({ ...prev, isScreenSharing: false }));
      }
      if (data?.isScreenSharing !== undefined) {
        setCallState(prev => ({ ...prev, remoteScreenSharing: data.isScreenSharing && data.screenSharingBy !== profileName }));
      }
    });

    const unsubCaller = onSnapshot(collection(db, 'calls', String(chatId), 'callerCandidates'), (snap) => {
      snap.docChanges().forEach(ch => {
        if (ch.type === 'added') addOrQueueCandidate(ch.doc.data());
      });
    });

    unsubsRef.current = [unsubCallDoc, unsubCaller];
    return { chatId, type, from };
  }, [incomingCall, _getLocalStream, _createPC, profileName, stopRingtone, addOrQueueCandidate, flushPendingCandidates]);

  // =======================================================================
  // 7. RACCROCHER / REFUSER
  //    logCall = false pour éviter un log en double quand endCall est déclenché
  //    par la suppression distante du document d'appel (l'autre a déjà raccroché).
  // =======================================================================
  const endCall = useCallback((logCall = true) => {
    const chatId = activeChatIdRef.current || incomingCall?.chatId || selectedChat?.id;
    const durationSecs = callStartTimeRef.current ? Math.max(1, Math.floor((Date.now() - callStartTimeRef.current) / 1000)) : 0;
    const wasConnected = isCallConnectedRef.current;
    const callType = callState.type || 'video';

    if (chatId) {
      setDoc(doc(db, 'chats', String(chatId)), {
        activeCall: null, isLive: false, endedAt: serverTimestamp(),
      }, { merge: true }).catch(() => { });

      deleteDoc(doc(db, 'calls', String(chatId))).catch(() => { });
      _purgeCandidateSubcollections(chatId);

      if (logCall && wasConnected && callStartTimeRef.current) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const mins = String(Math.floor(durationSecs / 60)).padStart(2, '0');
        const secs = String(durationSecs % 60).padStart(2, '0');
        const typeLabel = callType === 'video' ? 'Appel vidéo' : 'Appel audio';
        addDoc(collection(db, 'chats', String(chatId), 'messages'), {
          sender: 'system', senderName: 'Troco Direct',
          text: `📞 ${typeLabel} terminé • ${timeStr} • Durée : ${mins}:${secs}`,
          kind: 'call-log', callType, duration: durationSecs, createdAt: serverTimestamp(),
        }).catch(() => { });
      }
    }

    callStartTimeRef.current = null;
    isCallConnectedRef.current = false;
    _cleanup();
    setIncomingCall(null);
    setCallState({
      type: null, active: false, ringing: false, micOn: true, camOn: true,
      isScreenSharing: false, isHost: false, inviteOpen: false, copied: false,
      remoteScreenSharing: false, isReconnecting: false,
    });
  }, [_cleanup, _purgeCandidateSubcollections, incomingCall, selectedChat, callState.type]);

  // Ref pour appeler la dernière version d'endCall depuis des closures figées (onSnapshot)
  const endCallRef = useRef(endCall);
  useEffect(() => { endCallRef.current = endCall; }, [endCall]);

  const declineIncomingCall = useCallback(() => {
    const chatId = incomingCall?.chatId;
    if (chatId) {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      addDoc(collection(db, 'chats', String(chatId), 'messages'), {
        sender: 'system', senderName: 'Troco Direct',
        text: `📵 Appel sans réponse • ${timeStr}`, kind: 'call-log', status: 'missed',
        createdAt: serverTimestamp(),
      }).catch(() => { });
    }
    endCall(false);
  }, [incomingCall, endCall]);

  // =======================================================================
  // 8. ÉCOUTE GLOBALE DES APPELS ENTRANTS
  // =======================================================================
  useEffect(() => {
    if (!profileName && !profileUid) return;
    const normalizedProfile = (profileName || '').trim().toLowerCase();
    const currentUid = profileUid || (auth.currentUser && auth.currentUser.uid) || null;

    const unsub = onSnapshot(collection(db, 'calls'), (snap) => {
      snap.docChanges().forEach(change => {
        const data = change.doc.data();
        if (!data) return;

        // Ne jamais sonner sur son propre appareil quand on est l'appelant
        const fromName = (data.from || '').trim().toLowerCase();
        if (fromName && normalizedProfile && fromName === normalizedProfile) return;
        if (data.fromUid && currentUid && String(data.fromUid) === String(currentUid)) return;

        const targetTo = (data.to || '').trim().toLowerCase();
        const targetToUid = data.toUid ? String(data.toUid) : null;
        const isMatch = (normalizedProfile && targetTo === normalizedProfile) ||
          (currentUid && targetToUid && targetToUid === String(currentUid));

        if ((change.type === 'added' || change.type === 'modified') && isMatch && data.status === 'ringing') {
          setIncomingCall({ chatId: change.doc.id, type: data.type || 'video', from: data.from || 'Interlocuteur' });
          playRingtone();
          if (navigator.vibrate) navigator.vibrate([400, 150, 400, 150, 400]);
        }

        if (change.type === 'removed' || (change.type === 'modified' && data.status !== 'ringing')) {
          setIncomingCall(prev => prev?.chatId === change.doc.id ? null : prev);
          stopRingtone();
        }
      });
    });
    return () => unsub();
  }, [profileName, profileUid, playRingtone, stopRingtone]);

  // =======================================================================
  // 8bis. ROBUSTESSE : heartbeat + nettoyage sur fermeture brutale
  //    Essentiel sur mobile, où l'onglet peut être mis en veille / tué par l'OS
  //    en changeant d'appli. Sans ça, le document "calls/{chatId}" restait
  //    bloqué en 'ringing'/'connected' et l'appel semblait fantôme côté distant.
  // =======================================================================
  useEffect(() => {
    const chatId = activeChatIdRef.current || selectedChat?.id;
    if (!chatId || (!callState.active && !callState.ringing)) return;

    const heartbeat = setInterval(() => {
      setDoc(doc(db, 'calls', String(chatId)), {
        lastPing: serverTimestamp(), pingBy: profileName || 'user',
      }, { merge: true }).catch(() => { });
    }, 10000);

    return () => clearInterval(heartbeat);
  }, [callState.active, callState.ringing, selectedChat?.id, profileName]);

  useEffect(() => {
    const handleUnload = () => {
      const chatId = activeChatIdRef.current || selectedChat?.id;
      if (chatId && (callState.active || callState.ringing)) {
        try {
          setDoc(doc(db, 'chats', String(chatId)), { activeCall: null, isLive: false }, { merge: true });
          deleteDoc(doc(db, 'calls', String(chatId)));
        } catch (_) { }
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [callState.active, callState.ringing, selectedChat?.id]);

  // =======================================================================
  // 9. CONTRÔLES (MICRO, CAMÉRA, PARTAGE ÉCRAN, BASCULE CAMÉRA)
  // =======================================================================
  const toggleMic = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = !callState.micOn);
      setCallState(prev => ({ ...prev, micOn: !prev.micOn }));
    }
  }, [localStream, callState.micOn]);

  const toggleCam = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = !callState.camOn);
      setCallState(prev => ({ ...prev, camOn: !prev.camOn }));
    }
  }, [localStream, callState.camOn]);

  const toggleScreenShare = useCallback(async () => {
    if (!pcRef.current || !localStream) return;
    const chatId = activeChatIdRef.current;

    if (callState.isScreenSharing) {
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const camTrack = camStream.getVideoTracks()[0];
        cameraTrackRef.current = camTrack;

        const sender = pcRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender && camTrack) await sender.replaceTrack(camTrack);

        const audioTrack = localStream.getAudioTracks()[0];
        const newLocalStream = new MediaStream(audioTrack ? [camTrack, audioTrack] : [camTrack]);
        setLocalStream(newLocalStream);

        if (chatId) updateDoc(doc(db, 'calls', String(chatId)), { isScreenSharing: false, screenSharingBy: null });
        setCallState(prev => ({ ...prev, isScreenSharing: false }));
      } catch (e) { console.warn("Erreur retour caméra:", e); }
    } else {
      try {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          alert("Le partage d'écran n'est pas supporté par ce navigateur.");
          return;
        }
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;
        cameraTrackRef.current = localStream.getVideoTracks()[0];

        screenTrack.onended = () => toggleScreenShare();

        const sender = pcRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender && screenTrack) await sender.replaceTrack(screenTrack);

        const audioTrack = localStream.getAudioTracks()[0];
        const newLocalStream = new MediaStream(audioTrack ? [screenTrack, audioTrack] : [screenTrack]);
        setLocalStream(newLocalStream);

        if (chatId) updateDoc(doc(db, 'calls', String(chatId)), { isScreenSharing: true, screenSharingBy: profileName });
        setCallState(prev => ({ ...prev, isScreenSharing: true }));
      } catch (e) { console.warn("Partage d'écran refusé ou annulé:", e); }
    }
  }, [callState.isScreenSharing, localStream, profileName]);

  // Bascule caméra avant/arrière (mobile) — restaurée : référencée par CallOverlay/App.js
  const switchCamera = useCallback(async () => {
    if (callState.type !== 'video' || !localStream || callState.isScreenSharing) return;
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    try {
      localStream.getVideoTracks().forEach(t => { try { t.stop(); } catch (_) { } });

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: nextFacing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) return;

      if (pcRef.current) {
        const sender = pcRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) await sender.replaceTrack(newVideoTrack);
      }

      const audioTrack = localStream.getAudioTracks()[0];
      const combinedStream = new MediaStream(audioTrack ? [newVideoTrack, audioTrack] : [newVideoTrack]);
      setLocalStream(combinedStream);
      setFacingMode(nextFacing);
    } catch (err) {
      console.warn('[WebRTC] Erreur switchCamera vers :', nextFacing, err);
    }
  }, [callState.type, callState.isScreenSharing, localStream, facingMode]);

  // Modération hôte — restaurées : référencées par App.js (menu "professeur/hôte")
  const hostMuteParticipant = useCallback(async () => {
    const chatId = activeChatIdRef.current || selectedChat?.id;
    if (!chatId) return;
    try {
      await updateDoc(doc(db, 'calls', String(chatId)), { forceMuteParticipant: true, moderatedAt: serverTimestamp() });
    } catch (err) { console.warn('[WebRTC] hostMuteParticipant error:', err); }
  }, [selectedChat]);

  const hostStopParticipantScreenShare = useCallback(async () => {
    const chatId = activeChatIdRef.current || selectedChat?.id;
    if (!chatId) return;
    try {
      await updateDoc(doc(db, 'calls', String(chatId)), { forceStopScreenShare: true, moderatedAt: serverTimestamp() });
    } catch (err) { console.warn('[WebRTC] hostStopParticipantScreenShare error:', err); }
  }, [selectedChat]);

  const copyInviteLink = useCallback(() => {
    const link = `https://troco.app/join/${selectedChat?.id || 'group'}`;
    navigator.clipboard?.writeText(link).catch(() => { });
    setCallState(prev => ({ ...prev, copied: true }));
    window.setTimeout(() => setCallState(prev => ({ ...prev, copied: false })), 1800);
  }, [selectedChat]);

  return {
    callState, localStream, remoteStream, incomingCall,
    localVideoRef, remoteVideoRef,
    attachLocalStream, attachRemoteStream,
    facingMode, hasMultipleCameras, switchCamera,
    startCall, acceptIncomingCall, declineIncomingCall, endCall,
    toggleMic, toggleCam, toggleScreenShare,
    hostMuteParticipant, hostStopParticipantScreenShare, copyInviteLink,
  };
}