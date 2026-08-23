import { useRef, useState, useEffect, useCallback } from 'react';
import {
  doc, collection, addDoc, updateDoc, deleteDoc,
  onSnapshot, getDoc, serverTimestamp, setDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';

const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export function useWebRTC({ profileName, profileUid, selectedChat }) {
  const [callState, setCallState] = useState({
    type: null, active: false, ringing: false,
    micOn: true, camOn: true, isScreenSharing: false, isHost: false,
    remoteScreenSharing: false
  });

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);

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
            gain.gain.linearRampToValueAtTime(0.1, cur + start + 0.05);
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
  // =======================================================================
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const attachLocalStream = useCallback((el) => {
    if (el && localStream) el.srcObject = localStream;
  }, [localStream]);

  const attachRemoteStream = useCallback((el) => {
    if (el && remoteStream) el.srcObject = remoteStream;
  }, [remoteStream]);

  // =======================================================================
  // 3. NETTOYAGE COMPLET (CLEANUP)
  // =======================================================================
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

    return pc;
  }, []);

  const _getLocalStream = async (type) => {
    try {
      const constraints = type === 'video'
        ? { video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true }
        : { video: false, audio: true };
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      console.error("Erreur d'accès à la caméra/micro:", err);
      alert("Impossible d'accéder à la caméra ou au micro. Vérifiez vos autorisations.");
      return null;
    }
  };

  // =======================================================================
  // 5. APPELER (CALLER)
  // =======================================================================
  const startCall = async (type) => {
    const chatId = selectedChat?.id;
    if (!chatId) return;

    const stream = await _getLocalStream(type);
    if (!stream) return;
    setLocalStream(stream);

    setCallState({ type, active: true, ringing: true, micOn: true, camOn: type === 'video', isScreenSharing: false, isHost: true, remoteScreenSharing: false });
    playRingtone();

    const pc = _createPC(chatId, 'caller');
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const partnerName = selectedChat?.user || 'Interlocuteur';
    const myUid = profileUid || (auth.currentUser && auth.currentUser.uid) || null;

    // Création du document d'appel
    await setDoc(doc(db, 'calls', String(chatId)), {
      type,
      from: profileName,
      fromUid: myUid,
      to: partnerName,
      status: 'ringing',
      offer: { type: offer.type, sdp: offer.sdp },
      startedAt: serverTimestamp(),
    });

    // Écoute de la réponse de l'interlocuteur
    const unsubAnswer = onSnapshot(doc(db, 'calls', String(chatId)), async (snap) => {
      if (!snap.exists()) {
        endCall();
        return;
      }
      const data = snap.data();
      if (data?.answer && !pc.currentRemoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        stopRingtone();
        setCallState(prev => ({ ...prev, ringing: false }));
        await flushPendingCandidates();
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
  };

  // =======================================================================
  // 6. DÉCROCHER (CALLEE)
  // =======================================================================
  const acceptIncomingCall = async () => {
    if (!incomingCall) return;
    const { chatId, type } = incomingCall;
    setIncomingCall(null);
    stopRingtone();

    const stream = await _getLocalStream(type);
    if (!stream) {
      endCall();
      return;
    }
    setLocalStream(stream);
    setCallState({ type, active: true, ringing: false, micOn: true, camOn: type === 'video', isScreenSharing: false, isHost: false, remoteScreenSharing: false });

    const callSnap = await getDoc(doc(db, 'calls', String(chatId)));
    if (!callSnap.exists()) return;
    const callData = callSnap.data();

    const pc = _createPC(chatId, 'callee');
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
    await flushPendingCandidates();

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await updateDoc(doc(db, 'calls', String(chatId)), {
      answer: { type: answer.type, sdp: answer.sdp },
      status: 'connected',
    });

    const unsubCallDoc = onSnapshot(doc(db, 'calls', String(chatId)), (snap) => {
      if (!snap.exists()) {
        endCall();
        return;
      }
      const data = snap.data();
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
  };

  // =======================================================================
  // 7. RACCROCHER / REFUSER
  // =======================================================================
  const endCall = useCallback(() => {
    const chatId = activeChatIdRef.current || incomingCall?.chatId || selectedChat?.id;
    if (chatId) {
      deleteDoc(doc(db, 'calls', String(chatId))).catch(() => { });
    }
    _cleanup();
    setIncomingCall(null);
    setCallState({ type: null, active: false, ringing: false, micOn: true, camOn: true, isScreenSharing: false, isHost: false, remoteScreenSharing: false });
  }, [_cleanup, incomingCall, selectedChat]);

  const declineIncomingCall = useCallback(() => {
    endCall();
  }, [endCall]);

  // =======================================================================
  // 8. ÉCOUTE GLOBALE DES APPELS ENTRANTS
  // =======================================================================
  useEffect(() => {
    if (!profileName) return;
    const normalizedProfile = profileName.trim().toLowerCase();

    const unsub = onSnapshot(collection(db, 'calls'), (snap) => {
      snap.docChanges().forEach(change => {
        const data = change.doc.data();
        if (!data) return;

        const targetTo = (data.to || '').trim().toLowerCase();

        // Si l'appel est pour nous et qu'il sonne
        if ((change.type === 'added' || change.type === 'modified') && targetTo === normalizedProfile && data.status === 'ringing') {
          setIncomingCall({ chatId: change.doc.id, type: data.type || 'video', from: data.from || 'Interlocuteur' });
          playRingtone();
        }

        // Si l'appel est annulé ou supprimé
        if (change.type === 'removed' || (change.type === 'modified' && data.status !== 'ringing')) {
          setIncomingCall(prev => prev?.chatId === change.doc.id ? null : prev);
          stopRingtone();
        }
      });
    });
    return () => unsub();
  }, [profileName, playRingtone, stopRingtone]);

  // =======================================================================
  // 9. CONTRÔLES (MICRO, CAMÉRA, PARTAGE ÉCRAN)
  // =======================================================================
  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = !callState.micOn);
      setCallState(prev => ({ ...prev, micOn: !prev.micOn }));
    }
  };

  const toggleCam = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = !callState.camOn);
      setCallState(prev => ({ ...prev, camOn: !prev.camOn }));
    }
  };

  const toggleScreenShare = async () => {
    if (!pcRef.current || !localStream) return;
    const chatId = activeChatIdRef.current;

    if (callState.isScreenSharing) {
      // Revenir à la caméra
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

        if (chatId) updateDoc(doc(db, 'calls', String(chatId)), { isScreenSharing: false });
        setCallState(prev => ({ ...prev, isScreenSharing: false }));
      } catch (e) { console.warn("Erreur retour caméra:", e); }
    } else {
      // Lancer le partage d'écran
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;
        cameraTrackRef.current = localStream.getVideoTracks()[0];

        screenTrack.onended = () => toggleScreenShare(); // Si l'utilisateur clique sur "Arrêter le partage" du navigateur

        const sender = pcRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender && screenTrack) await sender.replaceTrack(screenTrack);

        const audioTrack = localStream.getAudioTracks()[0];
        const newLocalStream = new MediaStream(audioTrack ? [screenTrack, audioTrack] : [screenTrack]);
        setLocalStream(newLocalStream);

        if (chatId) updateDoc(doc(db, 'calls', String(chatId)), { isScreenSharing: true, screenSharingBy: profileName });
        setCallState(prev => ({ ...prev, isScreenSharing: true }));
      } catch (e) { console.warn("Partage d'écran refusé ou annulé:", e); }
    }
  };

  // On retourne une API épurée, débarrassée des fioritures inutiles
  return {
    callState, localStream, remoteStream, incomingCall,
    localVideoRef, remoteVideoRef,
    attachLocalStream, attachRemoteStream,
    startCall, acceptIncomingCall, declineIncomingCall, endCall,
    toggleMic, toggleCam, toggleScreenShare
  };
}