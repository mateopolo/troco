/**
 * useWebRTC.js — Signalisation WebRTC temps réel via Firestore
 *
 * Architecture Firestore :
 *   calls/{chatId}                          → type, from, to, status, offer, answer
 *   calls/{chatId}/callerCandidates/{id}    → candidats ICE de l'appelant
 *   calls/{chatId}/calleeCandidates/{id}    → candidats ICE de l'appelé
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import {
  doc, collection, addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, getDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export function useWebRTC({ profileName, selectedChat }) {
  const [callState, setCallState] = useState({
    type: null, active: false, ringing: false,
    micOn: true, camOn: true, inviteOpen: false, copied: false,
  });
  const [localStream, setLocalStream]   = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);

  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef          = useRef(null);
  const unsubsRef      = useRef([]);
  const activeChatIdRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
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
    } catch (_) {}
  }, []);

  const _getLocalStream = useCallback(async (type) => {
    if (!navigator.mediaDevices?.getUserMedia) return null;
    const constraints = type === 'video'
      ? { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true }
      : { video: false, audio: true };
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (_) {
      try {
        return await navigator.mediaDevices.getUserMedia({ video: type === 'video', audio: true });
      } catch (err) {
        console.warn('getUserMedia error:', err);
        return null;
      }
    }
  }, []);

  const _cleanup = useCallback(() => {
    unsubsRef.current.forEach(u => { try { u(); } catch (_) {} });
    unsubsRef.current = [];
    if (pcRef.current) {
      try { pcRef.current.close(); } catch (_) {}
      pcRef.current = null;
    }
    setLocalStream(prev => {
      if (prev) prev.getTracks().forEach(t => t.stop());
      return null;
    });
    setRemoteStream(null);
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
        addDoc(collection(db, 'calls', String(chatId), myCands), candidate.toJSON()).catch(() => {});
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

    setCallState({ type, active: true, ringing: true, micOn: true, camOn: type === 'video', inviteOpen: false, copied: false });
    playRingtone();
    if (navigator.vibrate) navigator.vibrate([300, 100, 300]);

    const stream = await _getLocalStream(type);
    setLocalStream(stream);

    const pc = _createPC(chatId, 'caller');
    if (stream) {
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await setDoc(doc(db, 'calls', String(chatId)), {
      type,
      from: profileName,
      to: selectedChat.user,
      status: 'ringing',
      offer: { type: offer.type, sdp: offer.sdp },
      startedAt: serverTimestamp(),
    });

    // Écouter la réponse SDP
    const unsubAnswer = onSnapshot(doc(db, 'calls', String(chatId)), async (snap) => {
      if (!snap.exists()) {
        // L'autre a raccroché / annulé
        _cleanup();
        setCallState({ type: null, active: false, ringing: false, micOn: true, camOn: true, inviteOpen: false, copied: false });
        return;
      }
      const data = snap.data();
      if (data?.answer && !pc.currentRemoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        setCallState(prev => ({ ...prev, ringing: false }));
      }
    });

    // Écouter les candidats ICE de l'appelé
    const unsubCallee = onSnapshot(collection(db, 'calls', String(chatId), 'calleeCandidates'), (snap) => {
      snap.docChanges().forEach(ch => {
        if (ch.type === 'added') {
          pc.addIceCandidate(new RTCIceCandidate(ch.doc.data())).catch(() => {});
        }
      });
    });

    unsubsRef.current = [unsubAnswer, unsubCallee];
  }, [selectedChat, profileName, playRingtone, _getLocalStream, _createPC, _cleanup]);

  const acceptIncomingCall = useCallback(async () => {
    if (!incomingCall) return null;
    const { chatId, type, from } = incomingCall;
    setIncomingCall(null);

    setCallState({ type, active: true, ringing: false, micOn: true, camOn: type === 'video', inviteOpen: false, copied: false });

    const callSnap = await getDoc(doc(db, 'calls', String(chatId)));
    if (!callSnap.exists()) return null;
    const callData = callSnap.data();

    const stream = await _getLocalStream(type);
    setLocalStream(stream);

    const pc = _createPC(chatId, 'callee');
    if (stream) {
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
    }

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
        setCallState({ type: null, active: false, ringing: false, micOn: true, camOn: true, inviteOpen: false, copied: false });
      }
    });

    const unsubCaller = onSnapshot(collection(db, 'calls', String(chatId), 'callerCandidates'), (snap) => {
      snap.docChanges().forEach(ch => {
        if (ch.type === 'added') {
          pc.addIceCandidate(new RTCIceCandidate(ch.doc.data())).catch(() => {});
        }
      });
    });

    unsubsRef.current = [unsubCallDoc, unsubCaller];
    return { chatId, type, from };
  }, [incomingCall, _getLocalStream, _createPC, _cleanup]);

  const endCall = useCallback(() => {
    const targetChatId = activeChatIdRef.current || selectedChat?.id;
    _cleanup();
    setCallState({ type: null, active: false, ringing: false, micOn: true, camOn: true, inviteOpen: false, copied: false });
    if (targetChatId) {
      deleteDoc(doc(db, 'calls', String(targetChatId))).catch(() => {});
    }
  }, [selectedChat, _cleanup]);

  const declineIncomingCall = useCallback(() => {
    if (!incomingCall) return;
    deleteDoc(doc(db, 'calls', String(incomingCall.chatId))).catch(() => {});
    setIncomingCall(null);
  }, [incomingCall]);

  // Écoute des appels entrants pour cet utilisateur
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

  const copyInviteLink = useCallback(() => {
    const link = `https://troco.app/join/${selectedChat?.id || 'group'}`;
    navigator.clipboard?.writeText(link).catch(() => {});
    setCallState(prev => ({ ...prev, copied: true }));
    window.setTimeout(() => setCallState(prev => ({ ...prev, copied: false })), 1800);
  }, [selectedChat]);

  return {
    callState, localStream, remoteStream, incomingCall,
    localVideoRef, remoteVideoRef,
    startCall, acceptIncomingCall, declineIncomingCall, endCall,
    toggleMic, toggleCam, copyInviteLink, playRingtone,
  };
}
