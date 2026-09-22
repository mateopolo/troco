import logger from '../utils/logger';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  query,
  setDoc,
  deleteDoc,
  getDocs,
  where,
  increment,
  runTransaction
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useSafeTimeout } from './useSafeTimeout';
import { Clock, Sparkles, ShieldCheck, CheckCircle, Check, RefreshCw, X } from 'lucide-react';
import { validateChatMessage } from '../utils/moderationBlacklist';
import { uploadVoiceNote } from '../services/voiceStorageService';
import { playBetclicBalanceSound, playApplePaySound, playSwooshSound } from '../utils/audioService';
import { useChatStore, useWalletStore } from '../stores';
import { hapticLight, hapticSuccess, hapticError } from '../utils/haptics';
import { playPop } from '../services/audioService';
import { notificationService } from '../services/notificationService';
import {
  resolveUserProfile,
  getCachedUserProfile,
  setCachedUserProfile,
  isRawUid,
  isGenericName,
  getChatPartnerUid,
  getChatPartnerName,
  subscribeToUserProfileResolutions,
} from '../services/userResolverService';

// Singleton audio context pour éviter la saturation des threads WebKit audio sur iOS
let sharedChatAudioCtx = null;
export const getChatAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedChatAudioCtx || sharedChatAudioCtx.state === 'closed') {
    sharedChatAudioCtx = new AudioCtx();
  }
  return sharedChatAudioCtx;
};

/**
 * Hook centralisant le moteur logique de messagerie, négociations et transactions de deals.
 * Fix critique : abonnements Firestore stables + purge des données mock.
 */
export const useChatManager = ({
  profile,
  setProfile,
  auth,
  db,
  setUserTransactions = () => { },
  handleOpenPayment = () => { },
  activeTab = 'chat',
  setActiveTab,
  setSelectedListing,
  callState,
  endCall,
  setSaveMessage = () => { },
  onTransactionSuccess = () => { },
}) => {
  const { safeTimeout } = useSafeTimeout();

  // ---- ÉTATS DE MESSAGERIE & DEALS ----
  const [selectedChat, setSelectedChat] = useState(null);
  const [readChats, setReadChats] = useState(() => {
    try {
      const saved = window.localStorage.getItem('troco_read_chats');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch (_) { }
    return new Set();
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('troco_read_chats', JSON.stringify([...readChats]));
    } catch (_) { }
  }, [readChats]);

  const [messageDraft, setMessageDraft] = useState('');
  const [chatThreads, setChatThreads] = useState({});
  const [chatsList, setChatsList] = useState([]);
  const [chatStatusOverrides, setChatStatusOverrides] = useState({});
  const [editingDealId, setEditingDealId] = useState(null);
  const [isCounterOfferOpen, setIsCounterOfferOpen] = useState(false);
  const [counterOfferDraft, setCounterOfferDraft] = useState({
    euroAmount: '',
    trocoTokens: '1',
    durationType: 'hourly',
    durationValue: '1',
    conditions: '',
  });

  const [isSending, setIsSending] = useState(false);
  const lastSendMessageTimestampRef = useRef(0);

  // ---- REFS STABLES POUR ÉVITER LES RE-SOUSCRIPTIONS INUTILES ----
  const selectedChatRef = useRef(selectedChat);
  useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);
  const activeTabRef = useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  // ---- GESTION DU STATUT EN LIGNE RÉEL (HEARTBEAT OPTIMISÉ & DÉTECTION HORS LIGNE INSTANTANÉE) ----
  const [presenceMap, setPresenceMap] = useState({});

  useEffect(() => {
    const uid = profile?.uid || (auth?.currentUser && auth.currentUser.uid);
    if (!uid || !db) return;

    let isUnloaded = false;

    const sendHeartbeat = async () => {
      if (isUnloaded) return;
      try {
        await setDoc(doc(db, 'presence', String(uid)), {
          uid: String(uid),
          name: profile?.name || 'Membre',
          lastSeenMs: Date.now(),
          lastSeen: serverTimestamp(),
          online: true,
        }, { merge: true });
      } catch (_) { }
    };

    const markOffline = () => {
      isUnloaded = true;
      try {
        setDoc(doc(db, 'presence', String(uid)), {
          uid: String(uid),
          name: profile?.name || 'Membre',
          online: false,
          lastSeenMs: Date.now() - 60000,
          updatedAt: serverTimestamp(),
        }, { merge: true }).catch(() => { });
      } catch (_) { }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 12000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        isUnloaded = false;
        sendHeartbeat();
      }
    };

    const handleWindowFocus = () => {
      isUnloaded = false;
      sendHeartbeat();
    };

    window.addEventListener('beforeunload', markOffline);
    window.addEventListener('pagehide', markOffline);
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', markOffline);
      window.removeEventListener('pagehide', markOffline);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      markOffline();
    };
  }, [profile?.uid, profile?.name, auth, db]);

  useEffect(() => {
    if (!db) return;
    let cachedDocs = [];
    const updateMap = () => {
      const map = {};
      const now = Date.now();
      cachedDocs.forEach(data => {
        const lastSeenMs = data.lastSeenMs || (data.lastSeen?.toMillis ? data.lastSeen.toMillis() : (data.lastSeen?.seconds ? data.lastSeen.seconds * 1000 : 0));
        // Seuil de 25s : passage automatique en hors ligne si inactif ou déconnecté
        const isOnline = data.online === true && (now - lastSeenMs < 25000);
        if (data.uid) {
          map[String(data.uid)] = isOnline;
        }
        if (data.name) {
          map[data.name.trim().toLowerCase()] = isOnline;
        }
      });
      setPresenceMap(map);
    };

    const unsub = onSnapshot(collection(db, 'presence'), (snapshot) => {
      cachedDocs = [];
      snapshot.forEach(docSnap => {
        cachedDocs.push({ ...docSnap.data(), uid: docSnap.id });
      });
      updateMap();
    }, (err) => {
      console.debug('[Firestore] presence subscription error:', err);
    });

    const periodicCheck = setInterval(updateMap, 4000);

    return () => {
      if (typeof unsub === 'function') {
        unsub();
      }
      clearInterval(periodicCheck);
    };
  }, [db]);

  // Synthèse sonore douce d'arrivée de message en temps réel (API Web Audio sans dépendance externe)
  const playNotificationSound = useCallback(() => {
    try {
      const ctx = getChatAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => { });
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';

      const now = ctx.currentTime;
      // Doux carillon 2 tons (Sol 783Hz -> Do 1046Hz)
      osc.frequency.setValueAtTime(783.99, now);
      osc.frequency.setValueAtTime(1046.50, now + 0.08);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (_) { }
  }, []);

  // Synchronisation temps réel des discussions depuis Firestore (EXCLUSIVEMENT par UID Firebase Auth)
  useEffect(() => {
    if (!db || !auth) return;

    let unsubs = [];
    let isInitialLoad = true;
    let activeListeningUid = null;
    const allDocsMap = new Map();

    const startListeningForUser = (targetUid) => {
      if (!targetUid || targetUid === activeListeningUid) return;
      activeListeningUid = targetUid;

      // Nettoyer les anciens écouteurs
      unsubs.forEach(u => { try { if (typeof u === 'function') u(); } catch (_) { } });
      unsubs = [];
      allDocsMap.clear();

      const currentUid = String(targetUid).trim();
      const myName = (profile?.name || '').trim();

      // Mettre en cache immédiatement le profil de l'utilisateur authentifié
      if (currentUid && profile) {
        setCachedUserProfile(currentUid, profile);
      }

      // Helper pour fusionner et mettre à jour la liste des chats avec tri client résilient
      const updateMergedChats = () => {
        const firestoreChats = Array.from(allDocsMap.entries())
          .filter(([docId, data]) => {
            if (!data) return false;
            if (Array.isArray(data.deletedBy)) {
              if (currentUid && data.deletedBy.includes(currentUid)) return false;
            }
            return true;
          })
          .map(([docId, data]) => {
            // Extraction du véritable UID du correspondant (exclut rigoureusement currentUid)
            const peerUid = getChatPartnerUid(data, currentUid);

            // Résolution de l'identité du correspondant (nom & photo)
            let resolvedName = getChatPartnerName(data, currentUid, myName);
            let resolvedAvatar = data.avatar || '';
            let peerProfile = null;

            if (peerUid) {
              const cached = getCachedUserProfile(peerUid);
              if (cached && cached.name && !isGenericName(cached.name)) {
                resolvedName = cached.name;
                if (cached.avatar) resolvedAvatar = cached.avatar;
                peerProfile = cached;
              } else {
                // Lancement asynchrone non-bloquant de la résolution Firestore (users_public / users)
                if (db) {
                  resolveUserProfile(peerUid, db);
                }
              }
            }

            const fChatId = data.id || docId;

            return {
              id: fChatId,
              firestoreId: docId,
              ...data,
              partnerUid: peerUid,
              peerUid: peerUid,
              user: resolvedName || 'Interlocuteur',
              avatar: resolvedAvatar,
              peerProfile: peerProfile,
            };
          });

        // Tri direct en mémoire par date de dernière activité (évite tout bug d'index manquant Firestore)
        const merged = [...firestoreChats];
        merged.sort((a, b) => {
          const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : (a.timestamp || 0))));
          const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : (b.timestamp || 0))));
          return timeB - timeA;
        });

        setChatsList(merged);
        try {
          localStorage.setItem('troco_cached_chats', JSON.stringify(merged));
          useChatStore.getState().setChatsList(merged);
        } catch (_) { }
      };

      const handleSnapshot = (snapshot) => {
        snapshot.docChanges().forEach(change => {
          const d = change.doc.data();
          if (!d) return;
          const fChatId = d.id || change.doc.id;
          const lastSender = (d.lastSenderName || d.lastSender || '').trim().toLowerCase();
          const isMe = (myName && lastSender === myName.toLowerCase()) ||
            (d.lastSenderUid && currentUid && String(d.lastSenderUid) === String(currentUid));
          const isFromThem = !isMe && (lastSender.length > 0 || (d.unreadCount && d.unreadCount > 0));

          // Détection en temps réel d'un nouveau message entrant non lu
          if (isFromThem && (change.type === 'modified' || (change.type === 'added' && !isInitialLoad))) {
            const currentSelectedChat = selectedChatRef.current;
            const currentActiveTab = activeTabRef.current;
            const isCurrentlyActive = currentSelectedChat && String(currentSelectedChat.id) === String(fChatId) && currentActiveTab === 'chat';
            if (!isCurrentlyActive) {
              setReadChats(prev => {
                const next = new Set(prev);
                next.delete(fChatId);
                next.delete(String(fChatId));
                next.delete(Number(fChatId));
                return next;
              });
              playNotificationSound();
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                try { navigator.vibrate([120, 60, 120]); } catch (_) { }
              }

              const senderTitle = d.lastSenderName || d.lastSender || d.user || 'Nouveau message';
              const messageText = d.lastMessage || 'Nouveau message reçu';
              const senderAvatar = d.avatar || d.authorAvatar || null;
              const rawTime = d.lastMessageTimestamp?.toMillis?.() ||
                d.lastMessageTimestamp?.seconds ||
                d.lastMessageTime?.seconds ||
                d.lastMessageTime ||
                d.updatedAt?.seconds ||
                d.updatedAt ||
                '';
              const messageId = d.lastMessageId || d.lastMsgId || `${fChatId}_${d.lastSenderUid || lastSender}_${rawTime}_${d.lastMessage || ''}`;

              notificationService.show({
                id: messageId,
                title: senderTitle,
                message: messageText,
                avatar: senderAvatar,
                icon: 'chat',
                duration: 3000,
                onClick: () => {
                  setSelectedChat(d);
                  if (typeof setActiveTab === 'function') {
                    setActiveTab('chat');
                  }
                },
                data: { chatId: fChatId, messageId }
              });
            }
          }
        });

        snapshot.docs.forEach(docSnap => {
          allDocsMap.set(docSnap.id, docSnap.data());
        });

        updateMergedChats();
        isInitialLoad = false;
      };

      // 1. Écoute principale sécurisée : array-contains strict sur l'UID Firebase Auth (SANS orderBy pour contourner tout blocage d'index)
      try {
        const qChats = query(
          collection(db, 'chats'),
          where('participants', 'array-contains', currentUid)
        );

        const unsubChats = onSnapshot(qChats, handleSnapshot, (err) => {
          logger.warn('[Firestore] chats query error:', err?.message || err);
          updateMergedChats();
        });
        unsubs.push(unsubChats);
      } catch (err) {
        logger.error('[Firestore] chats query setup error:', err);
      }

      // 2. Écoute complémentaire pour rétrocompatibilité avec les documents stockant l'UID dans participantUids
      try {
        const qUids = query(
          collection(db, 'chats'),
          where('participantUids', 'array-contains', currentUid)
        );
        const unsubUids = onSnapshot(qUids, (snapshot) => {
          snapshot.docs.forEach(docSnap => {
            allDocsMap.set(docSnap.id, docSnap.data());
          });
          updateMergedChats();
        }, (err) => {
          logger.warn('[Firestore] chats onSnapshot warning for participantUids:', err?.message || err);
        });
        unsubs.push(unsubUids);
      } catch (_) { }
    };

    // 1. Démarrer immédiatement si l'UID est déjà disponible
    const rawUid = auth?.currentUser?.uid || profile?.uid || null;
    const isGenuineUid = rawUid && typeof rawUid === 'string' && !rawUid.includes('@') && !rawUid.includes(' ');
    if (isGenuineUid) {
      startListeningForUser(rawUid);
    }

    // 2. Écouter les changements d'état Firebase Auth
    let unsubAuth = null;
    if (auth && typeof onAuthStateChanged === 'function') {
      unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser?.uid) {
          if (typeof setProfile === 'function' && profile?.uid !== firebaseUser.uid) {
            setProfile(prev => ({ ...prev, uid: firebaseUser.uid }));
          }
          startListeningForUser(firebaseUser.uid);
        } else if (!profile?.uid) {
          activeListeningUid = null;
          unsubs.forEach(u => { try { if (typeof u === 'function') u(); } catch (_) { } });
          unsubs = [];
          allDocsMap.clear();
          setChatsList([]);
        }
      });
    }

    return () => {
      if (typeof unsubAuth === 'function') {
        try { unsubAuth(); } catch (_) { }
      }
      unsubs.forEach(u => { try { if (typeof u === 'function') u(); } catch (_) { } });
    };
  }, [auth, db, profile?.uid]);

  // Écoute de l'événement personnalisé pour forcer le rafraîchissement des conversations Firestore
  useEffect(() => {
    const handleForceRefetch = async () => {
      if (!db) return;
      try {
        const firebaseUser = auth?.currentUser;
        const rawUid = firebaseUser?.uid || profile?.uid || null;
        const myUid = rawUid && typeof rawUid === 'string' && !rawUid.includes('@') && !rawUid.includes(' ') ? rawUid : null;
        if (!myUid) return;

        const qList = [
          query(collection(db, 'chats'), where('participants', 'array-contains', myUid)),
          query(collection(db, 'chats'), where('participantUids', 'array-contains', myUid)),
        ];

        for (const qItem of qList) {
          try {
            const snap = await getDocs(qItem);
            if (snap && snap.docs.length > 0) {
              const myName = (profile?.name || '').trim();
              const fetched = snap.docs
                .filter(d => !Array.isArray(d.data()?.deletedBy) || !d.data()?.deletedBy.includes(myUid))
                .map(d => {
                  const data = d.data() || {};
                  const peerUid = getChatPartnerUid(data, myUid);
                  let resolvedName = getChatPartnerName(data, myUid, myName);
                  let resolvedAvatar = data.avatar || '';
                  if (peerUid) {
                    const cached = getCachedUserProfile(peerUid);
                    if (cached && cached.name && !isGenericName(cached.name)) {
                      resolvedName = cached.name;
                      if (cached.avatar) resolvedAvatar = cached.avatar;
                    } else if (db) {
                      resolveUserProfile(peerUid, db);
                    }
                  }
                  return {
                    id: data.id || d.id,
                    firestoreId: d.id,
                    ...data,
                    partnerUid: peerUid,
                    peerUid: peerUid,
                    user: resolvedName || 'Interlocuteur',
                    avatar: resolvedAvatar,
                  };
                });

              setChatsList(prev => {
                const map = new Map(prev.map(c => [c.id, c]));
                fetched.forEach(f => map.set(f.id, f));
                const res = Array.from(map.values());
                try { localStorage.setItem('troco_cached_chats', JSON.stringify(res)); } catch (_) { }
                return res;
              });
            }
          } catch (_) { }
        }
      } catch (err) {
        logger.warn('[useChatManager] Force refetch error:', err);
      }
    };

    window.addEventListener('troco:refetch_chats', handleForceRefetch);
    return () => window.removeEventListener('troco:refetch_chats', handleForceRefetch);
  }, [profile?.uid, auth, db]);

  // Écoute des résolutions asynchrones des profils pour mettre à jour chatsList et selectedChat instantanément
  useEffect(() => {
    const currentMyUid = profile?.uid || (auth?.currentUser && auth.currentUser.uid);
    const unsub = subscribeToUserProfileResolutions((resolvedUid, resolvedProfile) => {
      const matchChat = (c) => {
        if (!c) return false;
        const cPeerUid = getChatPartnerUid(c, currentMyUid);
        return String(cPeerUid) === String(resolvedUid);
      };

      setChatsList(prev => prev.map(c => {
        if (matchChat(c)) {
          return {
            ...c,
            user: resolvedProfile.name,
            avatar: resolvedProfile.avatar || c.avatar,
            peerProfile: resolvedProfile,
          };
        }
        return c;
      }));

      setSelectedChat(prev => {
        if (!prev) return prev;
        if (matchChat(prev)) {
          return {
            ...prev,
            user: resolvedProfile.name,
            avatar: resolvedProfile.avatar || prev.avatar,
            peerProfile: resolvedProfile,
          };
        }
        return prev;
      });
    });
    return () => unsub();
  }, [profile?.uid, auth?.currentUser?.uid]);

  // ---- SÉLECTION D'UN CHAT ET MARQUAGE COMME LU ----
  const handleSelectChat = async (chat) => {
    if (!chat) {
      setSelectedChat(null);
      return;
    }
    const currentMyUid = profile?.uid || (auth?.currentUser && auth.currentUser.uid);
    const peerUid = getChatPartnerUid(chat, currentMyUid);
    const cachedPeer = peerUid ? getCachedUserProfile(peerUid) : null;
    if (peerUid && (!cachedPeer || isGenericName(cachedPeer.name)) && db) {
      resolveUserProfile(peerUid, db);
    }
    const resolvedPartnerName = cachedPeer?.name && !isGenericName(cachedPeer.name)
      ? cachedPeer.name
      : getChatPartnerName(chat, currentMyUid, profile?.name);
    const resolvedPartnerAvatar = cachedPeer?.avatar || chat.avatar || chat.peerProfile?.avatar || '';

    const enrichedChat = {
      ...chat,
      partnerUid: peerUid,
      peerUid: peerUid,
      user: resolvedPartnerName,
      avatar: resolvedPartnerAvatar,
      peerProfile: cachedPeer || chat.peerProfile || null,
    };
    setSelectedChat(enrichedChat);
    try { useChatStore.getState().setSelectedChat(enrichedChat); } catch (_) { }
    if (chat?.id && db) {
      const cidStr = String(chat.id);
      setReadChats(prev => new Set([...prev, chat.id, cidStr, Number(chat.id)]));

      // Mettre à jour Firestore pour marquer le chat et ses messages comme lus
      try {
        setDoc(doc(db, 'chats', cidStr), {
          unreadCount: 0,
          updatedAt: serverTimestamp(),
        }, { merge: true }).catch(() => { });

        const msgsSnap = await getDocs(collection(db, 'chats', cidStr, 'messages'));
        msgsSnap.forEach((dSnap) => {
          const d = dSnap.data();
          if (d.read !== true && (d.sender === 'them' || (d.senderName && d.senderName !== profile?.name))) {
            updateDoc(doc(db, 'chats', cidStr, 'messages', dSnap.id), {
              read: true,
              status: 'read'
            }).catch(() => { });
          }
        });
      } catch (_) { }
    }
  };

  // ---- COMPTEUR NON-LUS GLOBAL ----
  const unreadCount = useMemo(() => {
    const allChats = chatsList && chatsList.length > 0 ? chatsList : [];
    const myNameNorm = (profile?.name || '').trim().toLowerCase();
    const myUsernameNorm = (profile?.username || '').trim().toLowerCase();
    const myUidStr = profile?.uid || (auth?.currentUser && auth.currentUser.uid);

    return allChats.reduce((total, chat) => {
      const cidStr = String(chat.id);
      const isCurrentlyViewing = selectedChat && String(selectedChat.id) === cidStr && activeTab === 'chat';
      if (isCurrentlyViewing) return total;

      const isMarkedRead = readChats.has(chat.id) || readChats.has(cidStr) || readChats.has(Number(chat.id));
      if (isMarkedRead) return total;

      const thread = chatThreads[chat.id] || chatThreads[cidStr];
      if (thread && thread.length > 0) {
        const unreadInThread = thread.filter(m => {
          if (m.read || m.status === 'read') return false;
          if (m.sender === 'me') return false;
          if (m.senderName && (m.senderName.trim().toLowerCase() === myNameNorm || m.senderName.trim().toLowerCase() === myUsernameNorm)) return false;
          if (m.senderUid && myUidStr && String(m.senderUid) === String(myUidStr)) return false;
          return true;
        });
        return total + unreadInThread.length;
      }

      if (chat.lastSenderName) {
        const lastSenderNorm = chat.lastSenderName.trim().toLowerCase();
        const isMe = lastSenderNorm === myNameNorm || lastSenderNorm === myUsernameNorm;
        if (!isMe) {
          return total + (chat.unreadCount && chat.unreadCount > 0 ? chat.unreadCount : 1);
        }
      } else if (chat.unreadCount && chat.unreadCount > 0) {
        return total + chat.unreadCount;
      }
      return total;
    }, 0);
  }, [chatsList, chatThreads, readChats, selectedChat, activeTab, profile?.name, profile?.username, profile?.uid, auth]);

  // ---- SYNC MESSAGES EN TEMPS RÉEL (chat actif avec tri en mémoire résilient) ----
  useEffect(() => {
    if (!selectedChat?.id || !db) return;
    const chatId = String(selectedChat.firestoreId || selectedChat.id);
    const myUid = profile?.uid || (auth?.currentUser && auth.currentUser.uid) || null;

    let primaryUnsub = null;
    let fallbackUnsub = null;

    const handleSnapshot = (snapshot) => {
      if (snapshot.empty) {
        setChatThreads(prev => ({
          ...prev,
          [selectedChat.id]: [],
          [chatId]: [],
        }));
        return;
      }
      const firestoreIds = new Set(snapshot.docs.map(d => d.id));
      const confirmedTemporaryIds = new Set(
        snapshot.docs
          .map(d => d.data()?.temporaryId)
          .filter(Boolean)
          .map(String)
      );

      const msgs = snapshot.docs.map(d => {
        const data = d.data();
        const isMe = (data.senderUid && myUid && String(data.senderUid) === String(myUid)) ||
          (data.senderName?.trim().toLowerCase() === profile?.name?.trim().toLowerCase()) ||
          (data.sender === 'me');
        const resolvedCreatedAt = data.createdAt?.toMillis
          ? data.createdAt.toMillis()
          : (data.createdAt ? new Date(data.createdAt).getTime() : (data.timestamp || Date.now()));

        return {
          id: d.id,
          temporaryId: data.temporaryId || null,
          ...data,
          sender: isMe ? 'me' : 'them',
          senderName: data.senderName || (isMe ? profile?.name : (selectedChat.user || 'Interlocuteur')),
          text: data.text || '',
          status: data.status || 'sent',
          createdAt: resolvedCreatedAt,
          translations: data.translations || { FR: data.text || '' },
        };
      });

      // Fusionner avec les messages optimistes en vol (temp_*) dont l'ID Firestore n'est pas encore connu.
      setChatThreads(prev => {
        const currentThread = prev[selectedChat.id] || [];
        const inFlightOptimistic = currentThread.filter(m => {
          const isTemp = (typeof m.id === 'string' && m.id.startsWith('temp_')) || Boolean(m.temporaryId);
          if (!isTemp) return false;
          const tempKey = String(m.temporaryId || m.id);
          if (firestoreIds.has(String(m.id))) return false;
          if (confirmedTemporaryIds.has(tempKey)) return false;
          if (confirmedTemporaryIds.has(String(m.id))) return false;
          return true;
        });

        const messageMap = new Map();
        msgs.forEach(m => {
          const uid = String(m.id || m._id || '');
          if (uid) messageMap.set(uid, m);
        });
        inFlightOptimistic.forEach(m => {
          const uid = String(m.id || m._id || '');
          if (uid && !messageMap.has(uid)) {
            messageMap.set(uid, m);
          }
        });

        const unique = Array.from(messageMap.values());

        // Tri chronologique ascendant fiable en mémoire (supporte Timestamps Firestore, ISO et Date.now)
        unique.sort((a, b) => {
          const tA = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt || 0).getTime();
          const tB = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt || 0).getTime();
          return tA - tB;
        });

        return {
          ...prev,
          [selectedChat.id]: unique,
          [chatId]: unique,
        };
      });

      // Si le chat est ouvert dans l'onglet 'chat', marquer automatiquement les messages reçus comme "lu"
      if (activeTab === 'chat' && String(selectedChat.id) === String(chatId)) {
        snapshot.docs.forEach(d => {
          const data = d.data();
          const isFromThem = (data.senderUid && myUid && String(data.senderUid) !== String(myUid)) ||
            (data.senderName?.trim().toLowerCase() !== profile?.name?.trim().toLowerCase());
          if (isFromThem && data.status !== 'read' && !data.read) {
            updateDoc(doc(db, 'chats', chatId, 'messages', d.id), {
              status: 'read',
              read: true,
              readAt: serverTimestamp(),
            }).catch(() => { });
          }
        });
      }

      // Synchronisation immédiate de l'aperçu du dernier message dans chatsList
      if (msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        const previewTxt = lastMsg.kind === 'deal' || lastMsg.type === 'deal'
          ? (lastMsg.terms?.conditions || 'Proposition de deal')
          : (lastMsg.text || '');
        setChatsList(prev => prev.map(c => String(c.id) === String(selectedChat.id) ? {
          ...c,
          lastMessage: previewTxt,
          lastSenderName: lastMsg.senderName,
        } : c));
      }

      setReadChats(prev => new Set([...prev, selectedChat.id, String(selectedChat.id), Number(selectedChat.id)]));
    };

    try {
      // Écoute directe de la sous-collection messages (tri en mémoire sécurisé pour éviter l'exclusion Firestore sur createdAt pending)
      const q = collection(db, 'chats', chatId, 'messages');
      primaryUnsub = onSnapshot(q, handleSnapshot, (err) => {
        logger.warn('[Firestore] chat messages onSnapshot error:', err);
      });
    } catch (err) {
      logger.warn('[Firestore] chat messages listener setup failed:', err);
    }

    return () => {
      if (typeof primaryUnsub === 'function') {
        try { primaryUnsub(); } catch (_) { }
      }
      if (typeof fallbackUnsub === 'function') {
        try { fallbackUnsub(); } catch (_) { }
      }
    };
  }, [selectedChat?.id, selectedChat?.user, profile?.name, profile?.uid, activeTab, auth, db]);

  // ---- GESTION DU TYPING INDICATOR TEMPS RÉEL (DEBOUNCE 2.5S) ----
  const typingTimeoutRef = useRef(null);

  const handleTypingChange = (text) => {
    setMessageDraft(text);
    if (!selectedChat?.id || !profile?.name || !db) return;
    const chatId = String(selectedChat.id);
    const userName = profile?.name || 'me';

    if (db) {
      setDoc(doc(db, 'chats', chatId), {
        typing: { [userName]: true }
      }, { merge: true }).catch(() => { });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (db) {
        setDoc(doc(db, 'chats', chatId), {
          typing: { [userName]: false }
        }, { merge: true }).catch(() => { });
      }
    }, 2500);
  };

  // ---- ENVOI DE MESSAGE (TEXTE OU PAYLOAD OBJET PERSONNALISÉ / WHITEBOARD) ----
  const handleSendMessage = async (customPayload = null) => {
    if (!selectedChat) return;

    const now = Date.now();
    if (isSending || (now - lastSendMessageTimestampRef.current < 500)) {
      logger.warn('[useChatManager] Double envoi évité par le debounce de 500ms');
      return;
    }
    lastSendMessageTimestampRef.current = now;
    setIsSending(true);

    hapticLight();
    playPop();

    try {
      if (customPayload && typeof customPayload === 'object') {
        const chatId = selectedChat.id;
        const myUid = profile?.uid || auth?.currentUser?.uid || 'me';
        const myName = profile?.name || 'Moi';

        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const preview = customPayload.text || (customPayload.type === 'audio'
          ? `🎵 ${customPayload.fileName || 'Fichier audio'}`
          : `🎨 ${myName} a partagé le Tableau Blanc : "${customPayload.workspaceTitle || customPayload.title || 'Tableau Blanc'}"`);

        const payload = {
          id: tempId,
          temporaryId: tempId,
          sender: 'me',
          senderUid: myUid,
          senderName: myName,
          status: 'pending',
          createdAt: new Date(),
          ...customPayload,
          text: preview,
        };

        setChatThreads(prev => {
          const existing = prev[chatId] || [];
          const map = new Map();
          existing.forEach(m => {
            const uid = String(m.id || m._id || '');
            if (uid) map.set(uid, m);
          });
          map.set(String(payload.id), payload);
          return {
            ...prev,
            [chatId]: Array.from(map.values())
          };
        });

        setChatsList(prev => prev.map(c => String(c.id) === String(chatId) ? {
          ...c,
          lastMessage: preview,
          lastSenderName: myName
        } : c));

        if (db) {
          try {
            const safeParticipants = Array.isArray(selectedChat.participants) && selectedChat.participants.length > 0
              ? (selectedChat.participants.includes(myUid) ? selectedChat.participants : [...selectedChat.participants, myUid])
              : [myUid, selectedChat.partnerUid || selectedChat.authorUid].filter(Boolean);

            await setDoc(doc(db, 'chats', String(chatId)), {
              id: chatId,
              user: selectedChat.user || 'Interlocuteur',
              listing: selectedChat.listing || null,
              lastMessage: preview,
              lastSenderName: myName,
              unreadCount: increment(1),
              participants: safeParticipants,
              participantUids: [myUid, selectedChat.partnerUid || selectedChat.authorUid].filter(Boolean),
              updatedAt: serverTimestamp(),
            }, { merge: true });

            const docRef = await addDoc(collection(db, 'chats', String(chatId), 'messages'), {
              ...customPayload,
              temporaryId: tempId,
              senderId: myUid,
              senderUid: myUid,
              sender: myUid,
              senderName: myName,
              text: preview,
              read: false,
              status: 'sent',
              createdAt: serverTimestamp(),
            });

            setChatThreads(prev => {
              const thread = prev[chatId] || [];
              const map = new Map();
              thread.forEach(m => {
                if (m.id === tempId || m.temporaryId === tempId) {
                  if (!map.has(String(docRef.id))) {
                    map.set(String(docRef.id), { ...m, id: docRef.id, temporaryId: tempId, status: 'sent' });
                  }
                } else {
                  map.set(String(m.id || m._id), m);
                }
              });
              return {
                ...prev,
                [chatId]: Array.from(map.values())
              };
            });

            if (typeof useChatStore.getState().replaceTempId === 'function') {
              useChatStore.getState().replaceTempId(chatId, tempId, docRef.id);
            }
          } catch (e) {
            logger.warn('[Firestore] custom message write failed:', e);
            setChatThreads(prev => {
              const thread = prev[chatId] || [];
              return {
                ...prev,
                [chatId]: thread.map(m => (m.id === tempId || m.temporaryId === tempId) ? { ...m, status: 'error' } : m),
              };
            });
            throw e;
          }
        }
        return;
      }

      const text = (typeof customPayload === 'string' && customPayload.trim())
        ? customPayload.trim()
        : messageDraft.trim();

      if (!text) return;

      const messageCheck = validateChatMessage(text);
      if (!messageCheck.isValid) {
        alert(messageCheck.errorMessage);
        return;
      }

      const chatId = selectedChat.id;

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (profile?.name && db) {
        setDoc(doc(db, 'chats', String(chatId)), {
          typing: { [profile.name]: false }
        }, { merge: true }).catch(() => { });
      }

      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newMessage = {
        id: tempId,
        temporaryId: tempId,
        sender: 'me',
        senderName: profile?.name || 'Moi',
        senderUid: profile?.uid || null,
        text,
        status: 'pending',
        createdAt: new Date(),
        translations: { FR: text }
      };

      setChatThreads(prev => {
        const existing = prev[chatId] || [];
        const map = new Map();
        existing.forEach(m => {
          const uid = String(m.id || m._id || '');
          if (uid) map.set(uid, m);
        });
        map.set(String(newMessage.id), newMessage);
        return {
          ...prev,
          [chatId]: Array.from(map.values())
        };
      });

      useChatStore.getState().addMessageToThread(chatId, newMessage);
      setMessageDraft('');

      setChatsList(prev => prev.map(c => String(c.id) === String(chatId) ? { ...c, lastMessage: text, lastSenderName: profile?.name || 'Moi' } : c));

      if (db) {
        try {
          const myUid = auth?.currentUser?.uid || (profile?.uid && !profile.uid.includes('@') ? profile.uid : null);
          const myName = profile?.name || auth?.currentUser?.displayName || 'Moi';
          const safeParticipants = Array.isArray(selectedChat.participants) && selectedChat.participants.length > 0
            ? (selectedChat.participants.includes(myUid) ? selectedChat.participants : [...selectedChat.participants, myUid])
            : [myUid, selectedChat.partnerUid || selectedChat.authorUid].filter(Boolean);

          await setDoc(doc(db, 'chats', String(chatId)), {
            id: chatId,
            user: selectedChat.user || 'Interlocuteur',
            listing: selectedChat.listing || null,
            lastMessage: text,
            lastSenderName: myName,
            unreadCount: increment(1),
            participants: safeParticipants,
            participantUids: [myUid, selectedChat.partnerUid || selectedChat.authorUid].filter(Boolean),
            updatedAt: serverTimestamp(),
          }, { merge: true });

          const docRef = await addDoc(collection(db, 'chats', String(chatId), 'messages'), {
            temporaryId: tempId,
            senderId: myUid,
            senderUid: myUid,
            sender: myUid,
            senderName: myName,
            text,
            read: false,
            status: 'sent',
            createdAt: serverTimestamp(),
          });

          setChatThreads(prev => {
            const thread = prev[chatId] || [];
            const map = new Map();
            thread.forEach(m => {
              if (m.id === tempId || m.temporaryId === tempId) {
                if (!map.has(String(docRef.id))) {
                  map.set(String(docRef.id), { ...m, id: docRef.id || tempId, temporaryId: tempId, status: 'sent' });
                }
              } else {
                map.set(String(m.id || m._id), m);
              }
            });
            return {
              ...prev,
              [chatId]: Array.from(map.values())
            };
          });

          if (typeof useChatStore.getState().replaceTempId === 'function') {
            useChatStore.getState().replaceTempId(chatId, tempId, docRef.id);
          }
        } catch (e) {
          logger.warn('[Firestore] message write failed, marked as error:', e);
          setChatThreads(prev => {
            const thread = prev[chatId] || [];
            return {
              ...prev,
              [chatId]: thread.map(m => (m.id === tempId || m.temporaryId === tempId) ? { ...m, status: 'error' } : m)
            };
          });
        }
      }
    } finally {
      setTimeout(() => {
        setIsSending(false);
      }, 500);
    }
  };

  // ---- RÉESSAI DE MESSAGE EN CAS D'ÉCHEC OPTIMISTE ----
  const handleRetryMessage = async (msg) => {
    if (!msg || !selectedChat) return;
    const chatId = selectedChat.id;

    setChatThreads(prev => {
      const thread = prev[chatId] || [];
      return {
        ...prev,
        [chatId]: thread.map(m => m.id === msg.id ? { ...m, status: 'pending' } : m)
      };
    });

    if (db) {
      try {
          const myUid = auth?.currentUser?.uid || (profile?.uid && !profile.uid.includes('@') ? profile.uid : null);
          const myName = profile?.name || auth?.currentUser?.displayName || 'Moi';
          const docRef = await addDoc(collection(db, 'chats', String(chatId), 'messages'), {
            ...(msg.type === 'audio' || msg.kind === 'audio'
              ? {
                type: 'audio',
                kind: 'audio',
                audioUrl: msg.audioUrl,
                fileName: msg.fileName || null,
                contentType: msg.contentType || msg.mimeType || null,
              }
              : {}),
            senderId: myUid,
            senderUid: myUid,
            sender: myUid,
            senderName: myName,
            text: msg.text || (msg.type === 'audio' ? `🎵 ${msg.fileName || 'Fichier audio'}` : ''),
            read: false,
            status: 'sent',
            createdAt: serverTimestamp(),
          });

        setChatThreads(prev => {
          const thread = prev[chatId] || [];
          return {
            ...prev,
            [chatId]: thread.map(m => m.id === msg.id ? { ...m, id: docRef.id || msg.id, status: 'sent' } : m)
          };
        });
      } catch (e) {
        logger.warn('[Firestore] retry failed:', e);
        setChatThreads(prev => {
          const thread = prev[chatId] || [];
          return {
            ...prev,
            [chatId]: thread.map(m => m.id === msg.id ? { ...m, status: 'error' } : m)
          };
        });
      }
    }
  };

  // ---- MODIFICATION DE MESSAGE ----
  const handleEditMessage = async (chatId, messageId, newText) => {
    if (!newText || !newText.trim()) return;
    const cid = String(chatId);
    const trimmed = newText.trim();

    const editCheck = validateChatMessage(trimmed);
    if (!editCheck.isValid) {
      alert(editCheck.errorMessage);
      return;
    }

    setChatThreads(prev => ({
      ...prev,
      [chatId]: (prev[chatId] || []).map(m => String(m.id) === String(messageId) ? { ...m, text: trimmed, edited: true } : m),
    }));

    if (db) {
      try {
        await updateDoc(doc(db, 'chats', cid, 'messages', String(messageId)), {
          text: trimmed,
          edited: true,
          editedAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'chats', cid), {
          lastMessage: trimmed,
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        logger.warn('[Firestore] edit message failed:', e);
      }
    }
  };

  // ---- SUPPRESSION DE MESSAGE ----
  const handleDeleteMessage = async (chatId, messageId) => {
    const cid = String(chatId);
    setChatThreads(prev => ({
      ...prev,
      [chatId]: (prev[chatId] || []).filter(m => String(m.id) !== String(messageId)),
    }));
    if (db) {
      try {
        await deleteDoc(doc(db, 'chats', cid, 'messages', String(messageId)));
      } catch (e) {
        logger.warn('[Firestore] delete message failed:', e);
      }
    }
  };

  // ---- ENVOI DE MESSAGE VOCAL ----
  const handleSendAudioMessage = async (audioBlob, duration, recordedAudioUrl, mimeType, transcript) => {
    if (!selectedChat) {
      throw new Error('Aucune discussion active pour envoyer la note vocale.');
    }
    const chatId = selectedChat.id;
    const uploadRes = recordedAudioUrl
      ? { audioUrl: recordedAudioUrl }
      : await uploadVoiceNote(audioBlob, chatId);
    const audioUrl = uploadRes?.audioUrl;
    if (!audioUrl) {
      throw new Error('L’URL de la note vocale est indisponible.');
    }

    const formattedDuration = Math.round(duration || 0);
    const normalizedTranscript = typeof transcript === 'string' ? transcript.trim() : '';
    const temporaryId = `temp_audio_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newAudioMessage = {
      id: temporaryId,
      temporaryId,
      sender: 'me',
      senderName: profile?.name || 'Moi',
      senderUid: profile?.uid || auth?.currentUser?.uid || null,
      kind: 'audio',
      type: 'audio',
      audioUrl,
      duration: formattedDuration,
      sourceLang: 'FR',
      ...(normalizedTranscript ? { transcript: normalizedTranscript } : {}),
      status: 'sent',
      createdAt: new Date(),
      text: `🎤 Note vocale (${formattedDuration}s)`,
    };

    setChatThreads(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), newAudioMessage],
    }));
    if (typeof useChatStore.getState().addMessageToThread === 'function') {
      useChatStore.getState().addMessageToThread(chatId, newAudioMessage);
    }

    setChatsList(prev => prev.map(c => String(c.id) === String(chatId) ? {
      ...c,
      lastMessage: newAudioMessage.text,
      lastSenderName: profile?.name || 'Moi',
    } : c));

    if (db) {
      try {
        const myUid = auth?.currentUser?.uid || (profile?.uid && !profile.uid.includes('@') ? profile.uid : null);
        const myName = profile?.name || auth?.currentUser?.displayName || 'Moi';
        const docRef = await addDoc(collection(db, 'chats', String(chatId), 'messages'), {
          temporaryId,
          senderId: myUid,
          senderUid: myUid,
          sender: myUid,
          senderName: myName,
          kind: 'audio',
          type: 'audio',
          audioUrl,
          duration: formattedDuration,
          sourceLang: 'FR',
          ...(normalizedTranscript ? { transcript: normalizedTranscript } : {}),
          ...(mimeType ? { mimeType } : {}),
          text: newAudioMessage.text,
          read: false,
          status: 'sent',
          createdAt: serverTimestamp(),
        });
        setChatThreads(prev => ({
          ...prev,
          [chatId]: (prev[chatId] || []).map(message => (
            message.id === temporaryId
              ? { ...message, id: docRef.id, status: 'sent' }
              : message
          )),
        }));
        if (typeof useChatStore.getState().replaceTempId === 'function') {
          useChatStore.getState().replaceTempId(chatId, temporaryId, docRef.id);
        }
        await setDoc(doc(db, 'chats', String(chatId)), {
          id: chatId,
          lastMessage: newAudioMessage.text,
          lastSenderName: profile?.name || 'Moi',
          lastSenderUid: profile?.uid || auth?.currentUser?.uid || null,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (e) {
        setChatThreads(prev => ({
          ...prev,
          [chatId]: (prev[chatId] || []).map(message => (
            message.id === temporaryId ? { ...message, status: 'error' } : message
          )),
        }));
        logger.error('[Firestore] audio message write failed:', e);
        throw e;
      }
    }
  };

  // ---- ISOLATION DES DISCUSSIONS PAR PAIRE D'UTILISATEURS ET ANNONCE (STRICT UIDS FIRST) ----
  const buildConversationId = (listingId, userA, userB, uidA = null, uidB = null) => {
    if (uidA && uidB) {
      const sortedUids = [String(uidA).trim(), String(uidB).trim()].sort().join('_');
      const cleanListingId = listingId ? `_${String(listingId).trim()}` : '';
      return `chat_${sortedUids}${cleanListingId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    }
    if (uidA || uidB) {
      const availableUid = String(uidA || uidB).trim();
      const otherName = String(uidA ? userB : userA).trim().toLowerCase();
      const pair = [availableUid, otherName].sort().join('_');
      const cleanListingId = listingId ? `_${String(listingId).trim()}` : '';
      return `chat_${pair}${cleanListingId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    }
    const uA = String(userA || '').trim().toLowerCase();
    const uB = String(userB || '').trim().toLowerCase();
    const pair = [uA, uB].sort().join('_');
    const cleanListingId = listingId ? `_${String(listingId).trim()}` : '';
    return `chat_${pair}${cleanListingId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  };

  const handleStartDiscussion = async (listing) => {
    if (listing.author === profile?.name) return;

    const myUid = profile?.uid || auth?.currentUser?.uid || null;
    const authorUid = listing.authorUid || listing.userId || null;

    const conversationId = buildConversationId(listing.id, profile?.name, listing.author, myUid, authorUid);

    const cachedPartner = authorUid ? getCachedUserProfile(authorUid) : null;
    const partnerName = cachedPartner?.name || (isRawUid(listing.author) ? 'Membre Troco' : (listing.author || 'Membre Troco'));
    const partnerAvatar = cachedPartner?.avatar || listing.authorAvatar || '';

    const conversation = {
      id: conversationId,
      user: partnerName,
      avatar: partnerAvatar,
      authorUid: authorUid,
      partnerUid: authorUid,
      peerUid: authorUid,
      peerProfile: cachedPartner || null,
      listing: listing.title,
      lastMessage: `Début de discussion pour ${listing.title}`,
      status: 'Nouvelle discussion',
      terms: listing.compensation || '',
      participants: Array.from(new Set([myUid, authorUid])).filter(Boolean),
      participantUids: Array.from(new Set([myUid, authorUid])).filter(Boolean),
    };

    setSelectedChat(conversation);
    if (setActiveTab) setActiveTab('chat');
    if (setSelectedListing) setSelectedListing(null);
    if (callState?.active && endCall) endCall();

    setReadChats(prev => new Set([...prev, conversationId, String(conversationId), Number(conversationId)]));

    if (db) {
      try {
        await setDoc(doc(db, 'chats', String(conversationId)), {
          id: conversationId,
          user: partnerName,
          avatar: partnerAvatar,
          authorUid: authorUid,
          partnerUid: authorUid,
          listing: listing.title,
          lastMessage: `Début de discussion pour ${listing.title}`,
          status: 'Nouvelle discussion',
          terms: listing.compensation || '',
          participants: Array.from(new Set([myUid, authorUid])).filter(Boolean),
          participantUids: Array.from(new Set([myUid, authorUid])).filter(Boolean),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (e) {
        logger.error('[Firestore] start discussion failed:', e);
      }
    }
  };

  // ---- CRÉATION D'UN HUB DE PROJET MULTI-MEMBRES ----
  const handleCreateProjectGroup = async (groupData) => {
    const newChatId = `group-${Date.now()}`;
    const initialPool = Number(groupData.rewardPool) || 15;
    const newGroupChat = {
      id: newChatId,
      isGroup: true,
      user: groupData.projectTitle,
      projectTitle: groupData.projectTitle,
      category: groupData.category || 'Projet Collaboratif',
      description: groupData.description || '',
      rewardPool: initialPool,
      rewardStrategy: groupData.rewardStrategy || 'task',
      participants: groupData.participants,
      members: groupData.members,
      rewardAllocations: [],
      lastMessage: `🚀 Hub de projet créé (${groupData.participants.length} membres, ${initialPool} jetons alloués)`,
      lastSenderName: profile?.name || 'Initiateur',
      unreadCount: 0,
      updatedAt: new Date(),
      createdAt: new Date(),
    };

    const welcomeMsg = {
      id: Date.now(),
      sender: 'system',
      senderName: 'Système',
      text: `🚀 Hub de collaboration initialisé pour "${groupData.projectTitle}". Réserve allouée : ${initialPool} Jetons Troco. Membres : ${groupData.participants.join(', ')}.`,
      createdAt: new Date(),
    };

    setChatThreads(prev => ({ ...prev, [newChatId]: [welcomeMsg] }));
    setChatsList(prev => [newGroupChat, ...prev]);
    setSelectedChat(newGroupChat);

    if (db) {
      try {
        await setDoc(doc(db, 'chats', newChatId), {
          ...newGroupChat,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
        await addDoc(collection(db, 'chats', newChatId, 'messages'), {
          sender: 'system',
          senderName: 'Système',
          text: welcomeMsg.text,
          createdAt: serverTimestamp(),
        });
      } catch (e) {
        logger.warn('[Firestore] group chat create error:', e);
      }
    }
  };

  // ---- PROPOSITION D'UNE RÉTRIBUTION EN JETONS DANS UN GROUPE ----
  const handleProposeReward = async (chatId, rewardData) => {
    if (!chatId || !rewardData) return;
    const cid = String(chatId);
    const newMsg = {
      id: rewardData.id || `reward-${Date.now()}`,
      sender: 'me',
      senderName: profile?.name || 'Initiateur',
      kind: 'reward-proposal',
      type: 'reward',
      reward: rewardData,
      createdAt: new Date(),
      text: `💎 Proposition de rétribution : ${rewardData.amount} Jetons Troco pour ${rewardData.beneficiary} (${rewardData.title})`,
    };

    setChatThreads(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), newMsg],
    }));

    setChatsList(prev => prev.map(c => String(c.id) === cid ? {
      ...c,
      lastMessage: newMsg.text,
      lastSenderName: profile?.name || 'Initiateur',
    } : c));

    if (db) {
      try {
        await addDoc(collection(db, 'chats', cid, 'messages'), {
          sender: 'me',
          senderName: profile?.name || 'Initiateur',
          kind: 'reward-proposal',
          type: 'reward',
          reward: rewardData,
          text: newMsg.text,
          createdAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'chats', cid), {
          lastMessage: newMsg.text,
          lastSenderName: profile?.name || 'Initiateur',
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (e) {
        logger.warn('[Firestore] reward proposal write error:', e);
      }
    }
  };

  // ---- VALIDATION ET RÈGLEMENT D'UNE RÉTRIBUTION EN JETONS ----
  const handleAcceptReward = async (chatId, messageId, rewardData) => {
    if (!chatId || !messageId || !rewardData) return;
    const cid = String(chatId);
    const mid = String(messageId);
    const amount = Number(rewardData.amount) || 0;
    const beneficiary = rewardData.beneficiary;

    setChatThreads(prev => ({
      ...prev,
      [chatId]: (prev[chatId] || []).map(m => {
        if (String(m.id) === mid) {
          return {
            ...m,
            reward: {
              ...m.reward,
              status: 'confirmed',
              confirmedAt: new Date(),
              confirmedBy: profile?.name || 'Membre',
            }
          };
        }
        return m;
      })
    }));

    if (beneficiary && profile?.name && beneficiary.trim().toLowerCase() === profile.name.trim().toLowerCase()) {
      setProfile(prev => ({
        ...prev,
        trocoTokens: (prev.trocoTokens || 0) + amount,
      }));
    }

    setChatsList(prev => prev.map(c => {
      if (String(c.id) === cid) {
        const updatedMembers = (c.members || []).map(mem => {
          if (mem.name === beneficiary) {
            return { ...mem, tokensEarned: (mem.tokensEarned || 0) + amount };
          }
          return mem;
        });
        const updatedAllocations = [...(c.rewardAllocations || []), { ...rewardData, status: 'confirmed' }];
        return {
          ...c,
          members: updatedMembers,
          rewardAllocations: updatedAllocations,
        };
      }
      return c;
    }));

    if (db) {
      try {
        await updateDoc(doc(db, 'chats', cid, 'messages', mid), {
          'reward.status': 'confirmed',
          'reward.confirmedAt': serverTimestamp(),
          'reward.confirmedBy': profile?.name || 'Membre',
        });
        await addDoc(collection(db, 'chats', cid, 'messages'), {
          sender: 'system',
          senderName: 'Système',
          text: `✓ Rétribution validée : ${amount} Jetons Troco ont été alloués avec succès à ${beneficiary}.`,
          createdAt: serverTimestamp(),
        });
      } catch (e) {
        logger.warn('[Firestore] reward confirmation sync error:', e);
      }
    }
  };

  // ---- CONTRE-PROPOSITION / GESTION DE DEAL ----
  const openCounterOffer = (existingTerms = null, dealMsgId = null) => {
    if (!selectedChat) return;
    if (existingTerms) {
      setCounterOfferDraft({
        euroAmount: existingTerms.euroAmount ? String(existingTerms.euroAmount) : '',
        trocoTokens: existingTerms.trocoTokens !== undefined ? String(existingTerms.trocoTokens) : '1',
        durationType: existingTerms.durationType || 'hourly',
        durationValue: existingTerms.durationValue ? String(existingTerms.durationValue) : '1',
        conditions: existingTerms.conditions || '',
      });
      setEditingDealId(dealMsgId);
    } else {
      setCounterOfferDraft({
        euroAmount: '',
        trocoTokens: '1',
        durationType: 'hourly',
        durationValue: '1',
        conditions: selectedChat.listing ? `Proposition pour : ${selectedChat.listing}` : (selectedChat.terms || '1h d\'échange contre 1 Jeton Troco.'),
      });
      setEditingDealId(null);
    }
    setIsCounterOfferOpen(true);
  };

  // ---- CRÉATION ATOMIQUE D'UNE OFFRE DE DEAL / CONTRE-OFFRE ----
  const handleCounterOfferSubmit = async (terms) => {
    if (!selectedChat) return;
    const chatId = selectedChat.id;
    const currentUserId = profile?.uid || (auth?.currentUser && auth.currentUser.uid) || 'user_anon';
    const isCounterOffer = Boolean(editingDealId);

    const euroAmount = Number(terms.euroAmount !== undefined ? terms.euroAmount : terms.fiatAmount) || 0;
    const trocoTokens = Number(terms.trocoTokens !== undefined ? terms.trocoTokens : (terms.tokens !== undefined ? terms.tokens : terms.expectedTokens)) || 0;
    const durationType = terms.durationType || 'hourly';
    const durationValue = terms.durationValue ? String(terms.durationValue) : (terms.hours ? String(terms.hours) : (terms.expectedHours ? String(terms.expectedHours) : '1'));
    const expectedHours = durationType === 'hourly' ? (Number(durationValue) || 1) : 1;
    const expectedTokens = trocoTokens;
    const fiatAmount = euroAmount;
    const itemId = (terms.itemId !== undefined && terms.itemId !== null) ? String(terms.itemId) : (selectedChat.listingId ? String(selectedChat.listingId) : null);
    const itemName = terms.title || terms.itemName || selectedChat.listing || selectedChat.title || selectedChat.projectTitle || 'Prestation Troco';
    const conditions = (terms.conditions && terms.conditions.trim()) || `${durationValue}h d'échange pour ${trocoTokens > 0 ? `${trocoTokens} Jeton(s)` : ''} ${euroAmount > 0 ? `${euroAmount}€` : ''}`.trim() || 'Échange convenu.';

    const dealTerms = {
      title: itemName,
      hours: Number(expectedHours) || 0,
      tokens: Number(expectedTokens) || 0,
      fiatAmount: Number(fiatAmount) || 0,
      conditions: conditions,
      isCounterOffer: Boolean(isCounterOffer),
      expectedHours: Number(expectedHours) || 0,
      expectedTokens: Number(expectedTokens) || 0,
      trocoTokens: Number(expectedTokens) || 0,
      euroAmount: Number(fiatAmount) || 0,
      durationType: durationType || 'hourly',
      durationValue: String(durationValue || '1'),
      itemId: itemId || null,
      itemName: itemName || 'Prestation Troco',
    };

    const fullTerms = {
      ...dealTerms,
      euroAmount: Number(fiatAmount) || 0,
      trocoTokens: Number(expectedTokens) || 0,
      durationType: durationType || 'hourly',
      durationValue: String(durationValue || '1'),
      conditions: conditions || 'Nouvelle proposition de troc',
    };

    if (editingDealId) {
      setChatThreads(prev => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map(m => String(m.id) === String(editingDealId) ? { ...m, status: 'countered', updatedAt: new Date().toISOString() } : m)
      }));

      if (db) {
        try {
          await updateDoc(doc(db, 'chats', String(chatId), 'messages', String(editingDealId)), {
            status: 'countered',
            updatedAt: serverTimestamp(),
          });
        } catch (e) {
          logger.warn('[Firestore] previous deal countered status update failed:', e);
        }
      }
    }

    const newDealMsgId = `deal_${Date.now()}`;
    const dealMessage = {
      id: newDealMsgId,
      sender: 'me',
      senderId: currentUserId,
      senderUid: currentUserId,
      senderName: profile?.name || auth?.currentUser?.displayName || 'Moi',
      type: 'deal_offer',
      kind: 'deal',
      dealId: newDealMsgId,
      status: 'pending',
      dealTerms,
      terms: fullTerms,
      text: isCounterOffer ? 'Nouvelle contre-proposition de troc' : 'Nouvelle proposition de troc',
      createdAt: Date.now(),
    };

    setChatThreads(prev => ({ ...prev, [chatId]: [...(prev[chatId] || []), dealMessage] }));
    setIsCounterOfferOpen(false);
    setEditingDealId(null);

    if (db) {
      try {
        await addDoc(collection(db, 'chats', String(chatId), 'messages'), {
          type: 'deal_offer',
          kind: 'deal',
          status: 'pending',
          senderId: currentUserId,
          senderUid: currentUserId,
          sender: 'me',
          senderName: profile?.name || auth?.currentUser?.displayName || 'Moi',
          dealId: newDealMsgId,
          dealTerms,
          terms: fullTerms,
          text: isCounterOffer ? 'Nouvelle contre-proposition de troc' : 'Nouvelle proposition de troc',
          createdAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'chats', String(chatId)), {
          id: chatId,
          user: selectedChat.user || 'Interlocuteur',
          listing: selectedChat.listing || itemName,
          lastMessage: isCounterOffer ? `Contre-offre (${conditions})` : `Proposition de deal (${conditions})`,
          lastSenderName: profile?.name || 'Moi',
          lastDealStatus: 'pending',
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (e) {
        logger.warn('[Firestore] new deal_offer message write failed:', e);
      }
    }
  };

  const handleSendDeal = handleCounterOfferSubmit;

  // ---- FONCTION PRINCIPALE : EXÉCUTION DE TRANSACTION FIRESTORE ATOMIQUE (FINTECH ENGINE) ----
  /** @locked @critical DO NOT MODIFY THIS TRANSACTION LOGIC. */
  const executeDealTransaction = async ({
    chatId,
    dealId,
    terms,
    buyerUid: explicitBuyerUid,
    sellerUid: explicitSellerUid,
    targetUid,
    partnerUid: inputPartnerUid,
    partnerName,
    euroAmount = 0,
    tokensAmount = 0,
    paymentMethod = 'Solde Portefeuille Troco',
  }) => {
    const finalEuro = Number(euroAmount) || 0;
    const finalTokens = Number(tokensAmount) || 0;
    const currentUser = auth?.currentUser || profile;
    const currentUid = currentUser?.uid || 'me';

    const chat = (selectedChat && String(selectedChat.id) === String(chatId))
      ? selectedChat
      : chatsList.find(c => String(c.id) === String(chatId));

    const partnerUid = targetUid || inputPartnerUid || explicitSellerUid || selectedChat?.participants?.find(uid => uid && uid !== currentUser?.uid) || selectedChat?.partnerUid || chat?.participants?.find(uid => uid && uid !== currentUser?.uid) || chat?.partnerUid;

    if (!partnerUid || partnerUid === 'partner' || partnerUid === 'undefined' || partnerUid === currentUid) {
      const errorMsg = 'Transaction annulée : Destinataire (partnerUid/sellerUid) introuvable ou invalide. Aucun débit n\'a été effectué.';
      logger.error('🚨 [Finance] ' + errorMsg, { chatId, dealId, currentUid, partnerUid, chat });
      alert(errorMsg);
      return { success: false, error: errorMsg };
    }

    const buyerUid = String(explicitBuyerUid || currentUid);
    const sellerUid = partnerUid;

    const shouldDebitWallet = paymentMethod?.includes('Solde') || paymentMethod === 'wallet' || paymentMethod === 'Solde Portefeuille Troco';
    const isCurrentUserBuyer = currentUid === buyerUid;
    const isCurrentUserSeller = currentUid === sellerUid;

    if (isCurrentUserBuyer) {
      const updatedTokens = finalTokens > 0 ? Math.max(0, (profile?.trocoTokens || 0) - finalTokens) : (profile?.trocoTokens || 0);
      const updatedEuro = (finalEuro > 0 && shouldDebitWallet) ? Number(Math.max(0, (profile?.euroBalance || 0) - finalEuro).toFixed(2)) : (profile?.euroBalance || 0);
      setProfile(prev => ({
        ...prev,
        trocoTokens: updatedTokens,
        euroBalance: updatedEuro,
        dealsCompleted: (prev?.dealsCompleted || 0) + 1,
      }));
      try {
        const saved = JSON.parse(localStorage.getItem('troco_user_profile') || '{}');
        saved.trocoTokens = updatedTokens;
        saved.euroBalance = updatedEuro;
        saved.dealsCompleted = (saved.dealsCompleted || 0) + 1;
        localStorage.setItem('troco_user_profile', JSON.stringify(saved));
      } catch (_) { }
    } else if (isCurrentUserSeller) {
      const updatedTokens = (profile?.trocoTokens || 0) + finalTokens;
      const updatedEuro = Number(((profile?.euroBalance || 0) + finalEuro).toFixed(2));
      setProfile(prev => ({
        ...prev,
        trocoTokens: updatedTokens,
        euroBalance: updatedEuro,
        dealsCompleted: (prev?.dealsCompleted || 0) + 1,
      }));
      try {
        const saved = JSON.parse(localStorage.getItem('troco_user_profile') || '{}');
        saved.trocoTokens = updatedTokens;
        saved.euroBalance = updatedEuro;
        saved.dealsCompleted = (saved.dealsCompleted || 0) + 1;
        localStorage.setItem('troco_user_profile', JSON.stringify(saved));
      } catch (_) { }
    }

    setChatThreads(prev => ({
      ...prev,
      [chatId]: (prev[chatId] || []).map(m => String(m.id) === String(dealId) ? {
        ...m,
        status: 'confirmed',
        paidBy: buyerUid,
        paidTo: sellerUid,
        paymentMethod,
      } : m),
    }));
    setChatStatusOverrides(prev => ({ ...prev, [chatId]: 'Deal Validé' }));

    try {
      playBetclicBalanceSound(true);
      playApplePaySound();
      hapticSuccess();
    } catch (_) { }

    const transactionId = `TRK-DEAL-${Date.now().toString().slice(-6)}`;
    const newTx = {
      id: `tx-deal-${Date.now()}`,
      transactionId,
      label: `Deal avec ${partnerName || 'Partenaire'} (${terms?.conditions || 'Prestation'})`,
      amountTtc: finalEuro,
      tokens: finalTokens,
      mode: isCurrentUserBuyer ? 'debit' : 'credit',
      status: 'completed',
      date: new Date().toISOString(),
      partner: partnerName || 'Partenaire',
      paymentMethod,
      createdAt: new Date().toISOString(),
    };
    setUserTransactions(prev => [newTx, ...prev]);

    if (db && buyerUid && sellerUid) {
      try {
        await runTransaction(db, async (transaction) => {
          const buyerRef = doc(db, 'users', String(buyerUid));
          const sellerRef = doc(db, 'users', String(sellerUid));
          const msgRef = doc(db, 'chats', String(chatId), 'messages', String(dealId));
          const chatDocRef = doc(db, 'chats', String(chatId));

          const [buyerSnap, sellerSnap, msgSnap] = await Promise.all([
            transaction.get(buyerRef),
            transaction.get(sellerRef),
            transaction.get(msgRef),
          ]);

          const buyerData = buyerSnap.exists() ? buyerSnap.data() : {};
          const sellerData = sellerSnap.exists() ? sellerSnap.data() : {};

          const curBuyerEuro = Number(buyerData.euroBalance ?? buyerData.walletBalanceFiat ?? 0);
          const curBuyerTokens = Number(buyerData.trocoTokens ?? 0);
          const curBuyerDeals = Number(buyerData.dealsCompleted ?? 0);

          const curSellerEuro = Number(sellerData.euroBalance ?? sellerData.walletBalanceFiat ?? 0);
          const curSellerTokens = Number(sellerData.trocoTokens ?? 0);
          const curSellerDeals = Number(sellerData.dealsCompleted ?? 0);

          if (finalTokens > 0 && curBuyerTokens < finalTokens) {
            throw new Error(`Solde de jetons insuffisant (${curBuyerTokens} disponible(s), ${finalTokens} requis).`);
          }
          if (finalEuro > 0 && shouldDebitWallet && curBuyerEuro < finalEuro) {
            throw new Error(`Solde d'euros insuffisant (${curBuyerEuro}€ disponible(s), ${finalEuro}€ requis).`);
          }

          const newBuyerTokens = Math.max(0, curBuyerTokens - finalTokens);
          const newBuyerEuro = shouldDebitWallet ? Number(Math.max(0, curBuyerEuro - finalEuro).toFixed(2)) : curBuyerEuro;

          const newSellerTokens = curSellerTokens + finalTokens;
          const newSellerEuro = Number((curSellerEuro + finalEuro).toFixed(2));

          if (finalTokens > 0) {
            transaction.update(buyerRef, {
              trocoTokens: increment(-finalTokens),
              euroBalance: newBuyerEuro,
              walletBalanceFiat: newBuyerEuro,
              dealsCompleted: curBuyerDeals + 1,
              updatedAt: serverTimestamp(),
            });
            transaction.update(sellerRef, {
              trocoTokens: increment(finalTokens),
              euroBalance: newSellerEuro,
              walletBalanceFiat: newSellerEuro,
              dealsCompleted: curSellerDeals + 1,
              updatedAt: serverTimestamp(),
            });
          } else {
            transaction.set(buyerRef, {
              trocoTokens: newBuyerTokens,
              euroBalance: newBuyerEuro,
              walletBalanceFiat: newBuyerEuro,
              dealsCompleted: curBuyerDeals + 1,
              updatedAt: serverTimestamp(),
            }, { merge: true });

            transaction.set(sellerRef, {
              trocoTokens: newSellerTokens,
              euroBalance: newSellerEuro,
              walletBalanceFiat: newSellerEuro,
              dealsCompleted: curSellerDeals + 1,
              updatedAt: serverTimestamp(),
            }, { merge: true });
          }

          const notifRef = doc(collection(db, 'users', partnerUid, 'notifications'));
          transaction.set(notifRef, {
            type: 'payment_received',
            amount: finalTokens > 0 ? finalTokens : finalEuro,
            currency: finalTokens > 0 ? 'tokens' : 'EUR',
            from: currentUser.uid,
            read: false,
            timestamp: serverTimestamp(),
          });

          const messagePayload = {
            status: 'confirmed',
            buyerUid,
            sellerUid,
            paidBy: buyerUid,
            paidByName: buyerData.name || profile?.name || 'Acheteur',
            paidTo: sellerUid,
            paidToName: sellerData.name || partnerName || 'Vendeur',
            tokensAmount: finalTokens,
            euroAmount: finalEuro,
            paymentMethod,
            confirmedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          if (msgSnap.exists()) {
            transaction.update(msgRef, messagePayload);
          } else {
            transaction.set(msgRef, messagePayload, { merge: true });
          }

          transaction.set(chatDocRef, {
            lastDealStatus: 'confirmed',
            lastMessage: `🤝 Deal validé ! ${finalTokens > 0 ? `${finalTokens}🪙 ` : ''}${finalEuro > 0 ? `${finalEuro}€` : ''}`,
            updatedAt: serverTimestamp(),
          }, { merge: true });

          const txBuyerRef = doc(collection(db, 'transactions'));
          transaction.set(txBuyerRef, {
            type: 'deal_payment',
            mode: 'debit',
            userId: buyerUid,
            userName: buyerData.name || profile?.name || 'Acheteur',
            partnerUid: sellerUid,
            partnerName: sellerData.name || partnerName || 'Vendeur',
            dealId: String(dealId),
            chatId: String(chatId),
            tokens: finalTokens,
            amountTtc: finalEuro,
            paymentMethod,
            status: 'completed',
            createdAt: serverTimestamp(),
          });

          const txSellerRef = doc(collection(db, 'transactions'));
          transaction.set(txSellerRef, {
            type: 'deal_receipt',
            mode: 'credit',
            userId: sellerUid,
            userName: sellerData.name || partnerName || 'Vendeur',
            partnerUid: buyerUid,
            partnerName: buyerData.name || profile?.name || 'Acheteur',
            dealId: String(dealId),
            chatId: String(chatId),
            tokens: finalTokens,
            amountTtc: finalEuro,
            paymentMethod,
            status: 'completed',
            createdAt: serverTimestamp(),
          });
        });
      } catch (err) {
        logger.error('🚨 [Firestore] Erreur transaction atomique deal:', err);
      }
    }

    if (typeof onTransactionSuccess === 'function') {
      onTransactionSuccess({
        type: 'sent',
        amount: finalTokens > 0 ? finalTokens : finalEuro,
        currency: finalTokens > 0 ? 'tokens' : 'fiat',
        partnerName: partnerName || 'Vendeur',
      });
    }

    setSaveMessage(`🤝 Deal validé avec succès ! ${finalTokens > 0 ? `${finalTokens}🪙 ` : ''}${finalEuro > 0 ? `${finalEuro}€ ` : ''}transféré(s).`);
    safeTimeout(() => setSaveMessage(''), 5000);
  };

  // ---- LIBÉRATION DU SÉQUESTRE FINANCIER ----
  const handleReleaseEscrow = async (chatId, dealId, escrowData) => {
    hapticSuccess();
    const cid = String(chatId);
    const mid = String(dealId);
    const dealMsg = (chatThreads[cid] || []).find(m => String(m.id) === mid);
    const escrow = escrowData || dealMsg?.escrow || dealMsg?.terms || {};
    const finalEuro = Number(escrow.euroAmount) || 0;
    const finalTokens = Number(escrow.tokensAmount || escrow.trocoTokens) || 0;
    const partnerName = escrow.sellerName || dealMsg?.senderName || selectedChat?.user || 'Prestataire';
    let sellerUid = escrow.sellerUid || null;

    setChatThreads(prev => ({
      ...prev,
      [cid]: (prev[cid] || []).map(m => String(m.id) === mid ? {
        ...m,
        status: 'confirmed',
        escrow: { ...(m.escrow || {}), status: 'released', releasedAt: new Date().toISOString() },
      } : m),
    }));
    setChatStatusOverrides(prev => ({ ...prev, [cid]: 'Deal Scellé' }));

    try {
      playBetclicBalanceSound(true);
      playApplePaySound();
    } catch (_) { }

    if (profile?.uid && db) {
      try {
        if (!sellerUid && partnerName) {
          try {
            const userQuery = query(collection(db, 'users'), where('name', '==', partnerName));
            const uSnap = await getDocs(userQuery);
            if (!uSnap.empty) {
              sellerUid = uSnap.docs[0].id;
            }
          } catch (_) { }
        }

        await runTransaction(db, async (transaction) => {
          let sellerRef = null;
          let sellerSnap = null;
          if (sellerUid) {
            sellerRef = doc(db, 'users', sellerUid);
            sellerSnap = await transaction.get(sellerRef);
          }

          const buyerRef = doc(db, 'users', profile.uid);
          const buyerSnap = await transaction.get(buyerRef);
          let buyerDeals = profile?.dealsCompleted || 0;
          if (buyerSnap.exists()) {
            buyerDeals = buyerSnap.data().dealsCompleted !== undefined ? buyerSnap.data().dealsCompleted : buyerDeals;
          }

          if (sellerRef && sellerSnap && sellerSnap.exists()) {
            const sData = sellerSnap.data();
            const currentEuro = sData.euroBalance || 0;
            const currentTokens = sData.trocoTokens || 0;
            const currentDeals = sData.dealsCompleted || 0;

            transaction.update(sellerRef, {
              euroBalance: Number((currentEuro + finalEuro).toFixed(2)),
              trocoTokens: currentTokens + finalTokens,
              dealsCompleted: currentDeals + 1,
              updatedAt: serverTimestamp(),
            });
          }

          transaction.set(buyerRef, {
            dealsCompleted: buyerDeals + 1,
            updatedAt: serverTimestamp(),
          }, { merge: true });

          const msgRef = doc(db, 'chats', cid, 'messages', mid);
          transaction.update(msgRef, {
            status: 'confirmed',
            'escrow.status': 'released',
            releasedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          const chatDocRef = doc(db, 'chats', cid);
          transaction.set(chatDocRef, {
            lastDealStatus: 'confirmed',
            lastMessage: `🤝 Prestation validée et fonds débloqués (${partnerName})`,
            updatedAt: serverTimestamp(),
          }, { merge: true });

          const txDocRef = doc(collection(db, 'transactions'));
          transaction.set(txDocRef, {
            type: 'escrow_release',
            userId: profile.uid,
            userName: profile?.name || 'Membre',
            partnerUid: sellerUid || null,
            dealId: mid,
            chatId: cid,
            amountTtc: finalEuro,
            tokens: finalTokens,
            mode: 'escrow_release',
            status: 'completed',
            label: `Libération du séquestre - Prestation validée avec ${partnerName}`,
            createdAt: serverTimestamp(),
          });
        });
      } catch (err) {
        logger.warn('[Firestore] Escrow release transaction error:', err);
      }
    }

    setSaveMessage(`🎉 Prestation confirmée ! ${finalEuro > 0 ? `${finalEuro}€ ` : ''}${finalTokens > 0 ? `${finalTokens} Jeton(s) ` : ''}versé(s) à ${partnerName}.`);
    safeTimeout(() => setSaveMessage(''), 5000);
  };

  // ---- DÉCLENCHEMENT DE L'ACCEPTATION D'UN DEAL ----
  const handleAcceptDeal = async (chatId, dealId, terms) => {
    hapticSuccess();
    const chat = (selectedChat && String(selectedChat.id) === String(chatId))
      ? selectedChat
      : chatsList.find(c => String(c.id) === String(chatId));
    const partnerName = chat?.user || 'Interlocuteur';
    const currentUid = profile?.uid || auth?.currentUser?.uid;
    let partnerUid = chat?.partnerUid;
    if (!partnerUid || partnerUid === currentUid) {
      partnerUid = chat?.authorUid !== currentUid ? chat?.authorUid : null;
    }
    if (!partnerUid && chat) {
      const parts = chat.participants || chat.participantUids;
      if (Array.isArray(parts)) {
        partnerUid = parts.find(u => u && u !== currentUid && u !== 'partner') || null;
      }
    }
    if (!partnerUid && partnerName && db) {
      try {
        const uSnap = await getDocs(query(collection(db, 'users'), where('name', '==', partnerName)));
        if (!uSnap.empty) partnerUid = uSnap.docs[0].id;
      } catch (_) { }
    }
    const tokensAmount = Number(terms?.trocoTokens !== undefined ? terms.trocoTokens : terms?.expectedTokens) || 0;
    const euroAmount = Number(terms?.euroAmount !== undefined ? terms.euroAmount : terms?.fiatAmount) || 0;

    if (euroAmount === 0 && tokensAmount === 0) {
      await executeDealTransaction({
        chatId,
        dealId,
        terms,
        buyerUid: profile?.uid,
        partnerUid,
        partnerName,
        euroAmount: 0,
        tokensAmount: 0,
        paymentMethod: 'Troc Direct',
      });
      return;
    }

    handleOpenPayment('pay-deal', {
      chatId,
      dealId,
      terms,
      tokensRequired: tokensAmount,
      euroRequired: euroAmount,
      amount: euroAmount,
      tokens: tokensAmount,
      partnerName,
      partnerUid,
      buyerUid: profile?.uid,
      label: `Règlement du deal avec ${partnerName}`
    });
  };

  // ---- REFUS OU ANNULATION D'UN DEAL ----
  const handleDeclineDeal = async (chatId, dealId) => {
    hapticError();
    setChatThreads(prev => ({
      ...prev,
      [chatId]: (prev[chatId] || []).map(m => String(m.id) === String(dealId) ? { ...m, status: 'declined' } : m),
    }));

    if (db) {
      try {
        await updateDoc(doc(db, 'chats', String(chatId), 'messages', String(dealId)), {
          status: 'declined',
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'chats', String(chatId)), {
          lastDealStatus: 'declined',
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (e) {
        logger.warn('[Firestore] deal decline write failed:', e);
      }
    }
  };

  // ---- TRANSACTION DE FIN D'APPEL / POURBOIRE POST-APPEL ----
  const sendPostCallTip = async (arg1, arg2, arg3) => {
    let targetUid, amount, comment = '', duration = 0, insurance = false, partnerName = '';
    if (typeof arg1 === 'object' && arg1 !== null) {
      targetUid = arg1.targetUid || arg1.partnerUid;
      amount = Number(arg1.amount ?? arg1.tokens ?? 1);
      comment = arg1.comment || '';
      duration = arg1.duration || 0;
      insurance = !!arg1.insurance;
      partnerName = arg1.partnerName || '';
    } else {
      amount = Number(arg1) || 1;
      targetUid = arg2;
      comment = arg3 || '';
    }

    const currentUser = auth?.currentUser || profile;
    if (!currentUser?.uid) {
      const errorMsg = 'Non authentifié';
      alert(errorMsg);
      return { success: false, error: errorMsg };
    }

    const currentUid = String(currentUser.uid);
    const isValidUid = (v) => typeof v === 'string' && v.trim().length >= 3 && v !== currentUid && v !== 'partner' && v !== 'undefined';

    let partnerUid = targetUid && isValidUid(targetUid) ? targetUid : null;

    if (!partnerUid) {
      const pUids = selectedChat?.participantUids;
      if (Array.isArray(pUids)) partnerUid = pUids.find(u => isValidUid(u)) || null;
    }
    if (!partnerUid && isValidUid(selectedChat?.partnerUid)) partnerUid = selectedChat.partnerUid;
    if (!partnerUid) {
      const parts = selectedChat?.participants;
      if (Array.isArray(parts)) partnerUid = parts.find(u => isValidUid(u)) || null;
    }

    if (!partnerUid || partnerUid === currentUid) {
      const errorMsg = 'Destinataire introuvable pour le pourboire post-appel.';
      logger.error('🚨 [sendPostCallTip] ' + errorMsg, { targetUid, partnerUid, selectedChat });
      alert(errorMsg);
      throw new Error(errorMsg);
    }

    const costTokens = Number(amount) || 1;

    try {
      if (db) {
        await runTransaction(db, async (transaction) => {
          const senderRef = doc(db, 'users', currentUid);
          const receiverRef = doc(db, 'users', partnerUid);

          const [senderSnap, receiverSnap] = await Promise.all([
            transaction.get(senderRef),
            transaction.get(receiverRef),
          ]);
          if (!senderSnap.exists() || (Number(senderSnap.data()?.trocoTokens ?? profile?.trocoTokens ?? 0) < costTokens)) {
            throw new Error('Solde insuffisant');
          }

          transaction.update(senderRef, { trocoTokens: increment(-Number(costTokens)) });

          if (receiverSnap.exists()) {
            transaction.update(receiverRef, { trocoTokens: increment(Number(costTokens)) });
          } else {
            transaction.set(receiverRef, { trocoTokens: Number(costTokens) }, { merge: true });
          }

          const notifRef = doc(collection(db, 'users', partnerUid, 'notifications'));
          transaction.set(notifRef, {
            type: 'payment_received',
            amount: Number(costTokens),
            currency: 'tokens',
            from: currentUid,
            fromName: profile?.name || '',
            comment: comment || '',
            duration: duration || 0,
            insurance: !!insurance,
            read: false,
            timestamp: serverTimestamp(),
          });
        });
      }

      const currentBalance = Number(profile?.trocoTokens || 0);
      const updatedTokens = Math.max(0, currentBalance - costTokens);
      setProfile(prev => ({ ...prev, trocoTokens: updatedTokens }));

      try {
        const { setTrocoTokens } = useWalletStore.getState();
        if (setTrocoTokens) setTrocoTokens(updatedTokens);
      } catch (_) { }

      try {
        const saved = JSON.parse(localStorage.getItem('troco_user_profile') || '{}');
        saved.trocoTokens = updatedTokens;
        localStorage.setItem('troco_user_profile', JSON.stringify(saved));
      } catch (_) { }

      hapticSuccess();
      playSwooshSound();
      if (typeof onTransactionSuccess === 'function') {
        onTransactionSuccess({
          type: 'sent',
          amount: costTokens,
          currency: 'tokens',
          partnerName: partnerName || selectedChat?.user || 'Interlocuteur',
        });
      }
      setSaveMessage(`🪙 ${costTokens} Jeton(s) Troco envoyé(s) avec succès !`);
      safeTimeout(() => setSaveMessage(''), 4000);

      return { success: true, receiverUid: partnerUid, partnerUid, amount: costTokens };
    } catch (err) {
      hapticError();
      const errMsg = err?.message || 'Erreur lors de l\'envoi du pourboire';
      alert(errMsg);
      return { success: false, error: errMsg };
    }
  };

  // ---- TRANSFERT DE JETONS DIRECT ----
  /** @locked @critical DO NOT MODIFY THIS TRANSACTION LOGIC. */
  const handleTransferToken = async (chatId, tokenAmount = 1, comment = '', customPartnerUid = null) => {
    return handleSendToken(chatId, tokenAmount, comment, customPartnerUid);
  };

  /** MOTEUR TRANSACTIONNEL ABSOLU (runTransaction double écriture atomique & traçabilité) */
  const handleSendToken = async (chatId, tokenAmount = 1, comment = '', targetUid = null) => {
    const currentUser = auth?.currentUser || profile;
    if (!currentUser?.uid) return { success: false, error: 'Non authentifié' };

    const chat = (selectedChat && String(selectedChat.id) === String(chatId))
      ? selectedChat
      : chatsList.find(c => String(c.id) === String(chatId));

    const chatObj = chat || selectedChat;
    const currentUid = String(currentUser.uid);

    const isValidUid = (v) => typeof v === 'string' && v.trim().length >= 3 && v !== currentUid && v !== 'partner' && v !== 'undefined';

    let partnerUid = targetUid && isValidUid(targetUid) ? targetUid : null;

    if (!partnerUid) {
      const pUids = chatObj?.participantUids || selectedChat?.participantUids;
      if (Array.isArray(pUids)) partnerUid = pUids.find(u => isValidUid(u)) || null;
    }

    if (!partnerUid) {
      const explicit = chatObj?.partnerUid || selectedChat?.partnerUid;
      if (isValidUid(explicit)) partnerUid = explicit;
    }

    if (!partnerUid) {
      const parts = chatObj?.participants || selectedChat?.participants;
      if (Array.isArray(parts)) partnerUid = parts.find(u => isValidUid(u)) || null;
    }

    if (!partnerUid) {
      if (isValidUid(chatObj?.authorUid)) partnerUid = chatObj.authorUid;
    }

    if (!partnerUid && chatObj?.user && db) {
      try {
        const qUser = query(collection(db, 'users'), where('name', '==', chatObj.user));
        const snap = await getDocs(qUser);
        if (!snap.empty) partnerUid = snap.docs[0].id;
      } catch (_) { }
    }

    if (!partnerUid || partnerUid === currentUid) {
      const errorMsg = 'Destinataire introuvable';
      logger.error('🚨 [handleSendToken] ' + errorMsg, { chatId, currentUid, chatObj });
      alert(errorMsg);
      throw new Error(errorMsg);
    }

    const amount = Number(tokenAmount) || 1;

    try {
      if (db) {
        await runTransaction(db, async (transaction) => {
          const senderRef = doc(db, 'users', currentUid);
          const receiverRef = doc(db, 'users', partnerUid);

          const [senderSnap, receiverSnap] = await Promise.all([
            transaction.get(senderRef),
            transaction.get(receiverRef),
          ]);

          if (!senderSnap.exists() || (Number(senderSnap.data()?.trocoTokens ?? profile?.trocoTokens ?? 0) < Number(amount))) {
            throw new Error('Solde insuffisant');
          }

          transaction.update(senderRef, { trocoTokens: increment(-Number(amount)) });

          if (receiverSnap.exists()) {
            transaction.update(receiverRef, { trocoTokens: increment(Number(amount)) });
          } else {
            transaction.set(receiverRef, { trocoTokens: Number(amount) }, { merge: true });
          }

          const notifRef = doc(collection(db, 'users', partnerUid, 'notifications'));
          transaction.set(notifRef, {
            type: 'payment_received',
            amount: Number(amount),
            currency: 'tokens',
            from: currentUid,
            fromName: profile?.name || '',
            read: false,
            timestamp: serverTimestamp(),
          });
        });
      }

      const currentBalance = Number(profile?.trocoTokens || 0);
      const updatedTokens = Math.max(0, currentBalance - amount);
      setProfile(prev => ({ ...prev, trocoTokens: updatedTokens }));

      try {
        const { setTrocoTokens } = useWalletStore.getState();
        if (setTrocoTokens) setTrocoTokens(updatedTokens);
      } catch (_) { }

      try {
        const saved = JSON.parse(localStorage.getItem('troco_user_profile') || '{}');
        saved.trocoTokens = updatedTokens;
        localStorage.setItem('troco_user_profile', JSON.stringify(saved));
      } catch (_) { }

      if (chatId) {
        try {
          const transferMessage = {
            id: 'tok_tx_' + Date.now(),
            sender: 'me',
            senderId: currentUser.uid,
            senderName: profile?.name || 'Moi',
            text: `🪙 Transfert direct de ${amount} Jeton(s) Troco effectué.${comment ? ` Note: "${comment}"` : ''}`,
            createdAt: new Date().toISOString(),
            type: 'token_transfer',
            tokenAmount: amount,
            comment: comment || ''
          };
          setChatThreads(prev => ({
            ...prev,
            [chatId]: [...(prev[chatId] || []), transferMessage]
          }));
          if (db) {
            const chatDocRef = doc(db, 'chats', String(chatId));
            const messagesSubCol = collection(chatDocRef, 'messages');
            await setDoc(doc(messagesSubCol, transferMessage.id), {
              ...transferMessage,
              createdAt: serverTimestamp()
            });
          }
        } catch (_) { }
      }

      hapticSuccess();
      playSwooshSound();
      if (typeof onTransactionSuccess === 'function') {
        onTransactionSuccess({
          type: 'sent',
          amount,
          currency: 'tokens',
          partnerName: chatObj?.user || 'Interlocuteur',
        });
      }
      setSaveMessage(`🪙 ${amount} Jeton(s) Troco envoyé(s) avec succès !`);
      safeTimeout(() => setSaveMessage(''), 4000);

      return { success: true, receiverUid: partnerUid, partnerUid, amount };
    } catch (err) {
      hapticError();
      const errMsg = err?.message || 'Erreur lors du transfert de jetons';
      alert(errMsg);
      return { success: false, error: errMsg };
    }
  };

  // ---- RENDU DU COMPOSANT CARTE DE DEAL ----
  const renderDealCard = (message, chatId, otherName) => {
    const terms = message.dealTerms || message.deal || message.proposal || message.terms || {};
    const expectedHours = Number(terms.hours ?? terms.expectedHours ?? (terms.durationValue ? Number(terms.durationValue) : 0)) || 0;
    const expectedTokens = Number(terms.tokens ?? terms.expectedTokens ?? terms.trocoTokens ?? 0) || 0;
    const fiatAmount = Number(terms.fiatAmount ?? terms.fiat ?? terms.euroAmount ?? 0) || 0;
    const serviceTitle = terms.title || terms.serviceTitle || terms.itemName || message.listing || 'Prestation de service';
    const conditions = terms.conditions || terms.description || terms.notes || message.text || message.content || '';
    const isCounterOffer = Boolean(terms.isCounterOffer || message.type === 'deal_counter_offer');

    const currentUid = profile?.uid || (auth?.currentUser && auth.currentUser.uid);
    const senderId = message.senderId || message.senderUid || (message.sender === 'me' ? currentUid : null);
    const isRecipient = Boolean(currentUid && senderId ? String(currentUid) !== String(senderId) : message.sender !== 'me');
    const isMine = !isRecipient;
    const isIncoming = isRecipient;

    const currentDealStatus = String(message.status || 'pending').toLowerCase();
    const isDealPending = (!message.status || currentDealStatus === 'pending' || currentDealStatus === 'proposed' || currentDealStatus === 'en_attente' || currentDealStatus === 'sent');
    const isCountered = (currentDealStatus === 'countered' || currentDealStatus === 'superseded');
    const isAccepted = (currentDealStatus === 'confirmed' || currentDealStatus === 'accepted' || currentDealStatus === 'validated');
    const isRejected = (currentDealStatus === 'declined' || currentDealStatus === 'rejected' || currentDealStatus === 'refused' || currentDealStatus === 'cancelled');

    const isBuyer = (message.paidBy && profile?.uid && message.paidBy === profile.uid) ||
      (message.escrow?.buyerUid && profile?.uid && message.escrow.buyerUid === profile.uid) ||
      (!message.paidBy && isIncoming);

    return (
      <div style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: '18px', padding: '14px', backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', animation: 'fadeSlideUp 0.35s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '800', color: 'var(--accent-primary)' }}>
            <Sparkles size={14} /> {isMine ? (isCounterOffer ? 'Ma contre-proposition' : 'Ma proposition de deal') : (isCounterOffer ? 'Contre-offre reçue' : 'Proposition de deal reçue')}
          </div>
          {isDealPending && isMine && (
            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', padding: '4px 9px', borderRadius: '999px' }}>
              En attente
            </span>
          )}
          {isDealPending && isIncoming && (
            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)', padding: '4px 9px', borderRadius: '999px' }}>
              ⚡ Réponse attendue
            </span>
          )}
          {isCountered && (
            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', padding: '4px 9px', borderRadius: '999px', border: '1px dashed var(--border-color)' }}>
              🔄 Contre-offre émise
            </span>
          )}
          {currentDealStatus === 'escrow_locked' && (
            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-success, #10B981)', padding: '4px 9px', borderRadius: '999px', border: '1px solid var(--accent-success, #10B981)' }}>
              🛡️ Fonds sous Séquestre
            </span>
          )}
          {isAccepted && (
            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10B981', padding: '4px 9px', borderRadius: '999px' }}>
              ✓ Deal accepté
            </span>
          )}
          {isRejected && (
            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#EF4444', padding: '4px 9px', borderRadius: '999px' }}>
              ✕ Offre déclinée
            </span>
          )}
        </div>

        <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>{serviceTitle}</div>
        {conditions && <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '10px' }}>{conditions}</div>}

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {(expectedHours > 0 || terms.durationType) && (
            <span style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '999px', padding: '3px 9px', fontSize: '11px', fontWeight: '800' }}>
              ⏱️ {expectedHours > 0 ? `${expectedHours}h` : (terms.durationType === 'hourly' ? `${terms.durationValue || 1}h` : terms.durationType === 'daily' ? `${terms.durationValue || 1}j` : terms.durationType === 'monthly' ? `${terms.durationValue || 1} mois` : terms.durationType === 'fixed' ? 'Forfait' : 'Libre')}
            </span>
          )}
          {expectedTokens > 0 && <span style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--accent-warning)', color: 'var(--accent-warning)', borderRadius: '999px', padding: '3px 9px', fontSize: '11px', fontWeight: '800' }}>🪙 {expectedTokens} Jeton{expectedTokens > 1 ? 's' : ''}</span>}
          {fiatAmount > 0 && <span style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', borderRadius: '999px', padding: '3px 9px', fontSize: '11px', fontWeight: '800' }}>💶 + {Number(fiatAmount).toFixed(2).replace('.00', '')} €</span>}
          {expectedHours === 0 && expectedTokens === 0 && fiatAmount === 0 && <span style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', borderRadius: '999px', padding: '3px 9px', fontSize: '11px', fontWeight: '800' }}>🤝 Troc direct / Service</span>}
        </div>

        {isDealPending && isRecipient && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
            <button onClick={() => handleAcceptDeal(chatId, message.id, terms)} className="premium-button" style={{ border: 'none', borderRadius: '12px', padding: '9px 4px', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#FFFFFF', fontSize: '11.5px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Check size={14} strokeWidth={2.5} />
              <span>Accepter</span>
            </button>
            <button onClick={() => openCounterOffer(terms, message.id)} className="premium-button" style={{ border: 'none', borderRadius: '12px', padding: '9px 4px', background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)', color: '#FFF', fontSize: '11.5px', fontWeight: '800', cursor: 'pointer', boxShadow: 'var(--shadow-accent)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <RefreshCw size={13} strokeWidth={2.5} />
              <span>Contre-offre</span>
            </button>
            <button onClick={() => handleDeclineDeal(chatId, message.id)} className="premium-button" style={{ border: '1px solid rgba(239, 68, 68, 0.28)', borderRadius: '12px', padding: '9px 4px', backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#EF4444', fontSize: '11.5px', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <X size={14} strokeWidth={2.5} />
              <span>Refuser</span>
            </button>
          </div>
        )}

        {isDealPending && !isRecipient && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button onClick={() => openCounterOffer(terms, message.id)} className="premium-button" style={{ border: 'none', borderRadius: '12px', padding: '8px 4px', background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)', color: '#FFF', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <RefreshCw size={12} />
                <span>Modifier</span>
              </button>
              <button onClick={() => handleDeclineDeal(chatId, message.id)} className="premium-button" style={{ border: '1px solid rgba(239, 68, 68, 0.28)', borderRadius: '12px', padding: '8px 4px', backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#EF4444', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <X size={12} />
                <span>Annuler</span>
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--bg-subtle)', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)', borderRadius: '10px', padding: '6px 10px', fontSize: '11px', fontWeight: '700' }}>
              <Clock size={12} color="var(--accent-primary)" /> En attente de réponse...
            </div>
          </div>
        )}

        {isCountered && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: 'var(--bg-subtle)', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)', borderRadius: '10px', padding: '6px 10px', fontSize: '11px', fontWeight: '700' }}>
            <RefreshCw size={12} /> Offre remplacée par une contre-proposition
          </div>
        )}

        {currentDealStatus === 'escrow_locked' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'var(--bg-subtle)', border: '1.5px solid var(--accent-primary)', borderRadius: '14px', padding: '12px 14px', marginTop: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800', color: 'var(--accent-primary)' }}>
              <ShieldCheck size={16} color="var(--accent-success, #10B981)" />
              <span>Fonds sous Séquestre Troco</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {isBuyer
                ? `Fonds sécurisés sous séquestre. Cliquez ci-dessous dès que la prestation est terminée.`
                : `Paiement garanti sous séquestre. Versement effectué dès validation de l'acheteur.`}
            </div>
            {isBuyer && (
              <button
                type="button"
                onClick={() => handleReleaseEscrow(chatId, message.id, message.escrow || { terms })}
                className="premium-button"
                style={{ border: 'none', borderRadius: '10px', padding: '8px 12px', backgroundColor: 'var(--accent-success, #10B981)', color: '#FFF', fontSize: '11.5px', fontWeight: '800', cursor: 'pointer' }}
              >
                Prestation terminée — Libérer les fonds ✓
              </button>
            )}
          </div>
        )}

        {isAccepted && currentDealStatus !== 'escrow_locked' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10B981', borderRadius: '12px', padding: '9px 12px', fontSize: '12px', fontWeight: '800' }}>
            <CheckCircle size={15} color="#10B981" /> Deal validé ✓
          </div>
        )}
      </div>
    );
  };

  return {
    selectedChat,
    setSelectedChat,
    readChats,
    setReadChats,
    messageDraft,
    setMessageDraft,
    chatThreads,
    setChatThreads,
    chatsList,
    setChatsList,
    chatStatusOverrides,
    setChatStatusOverrides,
    editingDealId,
    setEditingDealId,
    counterOfferDraft,
    setCounterOfferDraft,
    isCounterOfferOpen,
    setIsCounterOfferOpen,
    presenceMap,
    setPresenceMap,
    unreadCount,
    isSending,
    playNotificationSound,
    handleSelectChat,
    handleTypingChange,
    handleSendMessage,
    handleRetryMessage,
    handleEditMessage,
    handleDeleteMessage,
    handleSendAudioMessage,
    buildConversationId,
    handleStartDiscussion,
    handleCreateProjectGroup,
    handleProposeReward,
    handleAcceptReward,
    openCounterOffer,
    handleCounterOfferSubmit,
    handleSendDeal,
    executeDealTransaction,
    handleReleaseEscrow,
    handleAcceptDeal,
    handleDeclineDeal,
    handleSendToken,
    handleTransferToken,
    sendPostCallTip,
    renderDealCard,
  };
};

export default useChatManager;