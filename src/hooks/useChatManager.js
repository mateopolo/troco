import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  deleteDoc,
  getDocs,
  where,
  increment,
  runTransaction
} from 'firebase/firestore';
import { Clock, Sparkles, ShieldCheck, CheckCircle } from 'lucide-react';
import { mockChats, initialChatThreads } from '../data/mockChatsData';
import { validateChatMessage } from '../utils/moderationBlacklist';
import { uploadVoiceNote } from '../services/voiceStorageService';
import { playBetclicBalanceSound, playApplePaySound } from '../utils/audioService';
import { useChatStore } from '../stores';

/**
 * Hook centralisant le moteur logique de messagerie, négociations et transactions de deals.
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
}) => {
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
  const [chatThreads, setChatThreads] = useState(initialChatThreads);
  const [chatsList, setChatsList] = useState(mockChats);
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
      unsub();
      clearInterval(periodicCheck);
    };
  }, [db]);

  // Synthèse sonore douce d'arrivée de message en temps réel (API Web Audio sans dépendance externe)
  const playNotificationSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
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

  // Synchronisation temps réel des discussions depuis Firestore (CONFIDENTIALITÉ STRICTE : filtrage multi-clés)
  useEffect(() => {
    if (!db) return;
    const myName = (profile?.name || '').trim();
    const myUid = profile?.uid || (auth?.currentUser && auth.currentUser.uid) || null;
    const myUsername = (profile?.username || '').trim();
    const myEmail = (profile?.email || auth?.currentUser?.email || '').trim();

    // Tous les identifiants possibles de l'utilisateur
    const targetSet = new Set([
      myName,
      myName.toLowerCase(),
      myUid,
      myUsername,
      myUsername.toLowerCase(),
      myEmail,
      myEmail.toLowerCase(),
    ].filter(Boolean));

    const targets = Array.from(targetSet);

    // Initialisation immédiate des discussions (avec mockChats complets)
    if (targets.length === 0) {
      setChatsList(mockChats);
      try { useChatStore.getState().setChatsList(mockChats); } catch (_) { }
      return;
    }

    const unsubs = [];
    const allDocsMap = new Map();
    let isInitialLoad = true;

    // Helper pour fusionner et mettre à jour la liste des chats
    const updateMergedChats = () => {
      const firestoreChats = Array.from(allDocsMap.entries()).map(([docId, data]) => {
        const otherUser = Array.isArray(data.participants)
          ? data.participants.find(p => p && p.trim().toLowerCase() !== myName.toLowerCase() && p !== myUid && p.trim().toLowerCase() !== myEmail.toLowerCase()) || data.user || 'Interlocuteur'
          : data.user || 'Interlocuteur';

        const fChatId = data.id || docId;

        return {
          id: fChatId,
          firestoreId: docId,
          ...data,
          user: otherUser,
        };
      });

      const merged = [...mockChats];
      firestoreChats.forEach(fChat => {
        const idx = merged.findIndex(m => String(m.id) === String(fChat.id));
        if (idx >= 0) {
          merged[idx] = { ...merged[idx], ...fChat };
        } else {
          merged.unshift(fChat);
        }
      });

      setChatsList(merged);
      try { useChatStore.getState().setChatsList(merged); } catch (_) { }
    };

    targets.forEach(targetVal => {
      try {
        const q = query(
          collection(db, 'chats'),
          where('participants', 'array-contains', targetVal)
        );

        const unsub = onSnapshot(q, (snapshot) => {
          snapshot.docChanges().forEach(change => {
            const d = change.doc.data();
            if (!d) return;
            const fChatId = d.id || change.doc.id;
            const lastSender = (d.lastSenderName || d.lastSender || '').trim().toLowerCase();
            const isMe = (myName && lastSender === myName.toLowerCase()) ||
              (myUsername && lastSender === myUsername.toLowerCase()) ||
              (myEmail && lastSender === myEmail.toLowerCase()) ||
              (d.lastSenderUid && myUid && String(d.lastSenderUid) === String(myUid));
            const isFromThem = !isMe && (lastSender.length > 0 || (d.unreadCount && d.unreadCount > 0));

            // Détection en temps réel d'un nouveau message entrant non lu (PC ⇄ Mobile)
            if (isFromThem && (change.type === 'modified' || (change.type === 'added' && !isInitialLoad))) {
              const isCurrentlyActive = selectedChat && String(selectedChat.id) === String(fChatId) && activeTab === 'chat';
              if (!isCurrentlyActive) {
                // Forcer la suppression du cache de lecture pour réactiver le badge rouge immédiatement
                setReadChats(prev => {
                  const next = new Set(prev);
                  next.delete(fChatId);
                  next.delete(String(fChatId));
                  next.delete(Number(fChatId));
                  return next;
                });
                // Déclencher le son de notification et vibration
                playNotificationSound();
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                  try { navigator.vibrate([120, 60, 120]); } catch (_) { }
                }
              }
            }
          });

          // Enregistrer ou mettre à jour les docs dans notre Map
          snapshot.docs.forEach(docSnap => {
            allDocsMap.set(docSnap.id, docSnap.data());
          });

          updateMergedChats();
          isInitialLoad = false;
        }, (err) => {
          console.warn('[Firestore] chats onSnapshot error for target:', targetVal, err);
          updateMergedChats();
        });

        unsubs.push(unsub);
      } catch (err) {
        console.warn('[Firestore] query setup error:', err);
      }
    });

    return () => {
      unsubs.forEach(u => { try { u(); } catch (_) { } });
    };
  }, [profile?.name, profile?.uid, profile?.username, profile?.email, selectedChat, activeTab, playNotificationSound, auth, db]);

  // ---- SÉLECTION D'UN CHAT ET MARQUAGE COMME LU ----
  const handleSelectChat = async (chat) => {
    setSelectedChat(chat);
    try { useChatStore.getState().setSelectedChat(chat); } catch (_) { }
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
    const allChats = chatsList && chatsList.length > 0 ? chatsList : mockChats;
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

  // ---- SYNC MESSAGES EN TEMPS RÉEL (chat actif) ----
  useEffect(() => {
    if (!selectedChat?.id || !db) return;
    const chatId = String(selectedChat.id);
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) return;
      const msgs = snapshot.docs.map(d => {
        const data = d.data();
        const isMe = data.senderName?.trim().toLowerCase() === profile?.name?.trim().toLowerCase();
        return {
          id: d.id,
          ...data,
          sender: isMe ? 'me' : 'them',
          senderName: data.senderName || (isMe ? profile?.name : (selectedChat.user || 'Interlocuteur')),
          text: data.text || '',
          status: data.status || 'sent',
          createdAt: data.createdAt || data.timestamp || Date.now(),
          translations: data.translations || { FR: data.text || '' },
        };
      });
      setChatThreads(prev => ({
        ...prev,
        [selectedChat.id]: msgs,
      }));

      // Si le chat est ouvert dans l'onglet 'chat', marquer automatiquement les messages reçus comme "lu"
      if (activeTab === 'chat' && String(selectedChat.id) === String(chatId)) {
        snapshot.docs.forEach(d => {
          const data = d.data();
          const isFromThem = data.senderName?.trim().toLowerCase() !== profile?.name?.trim().toLowerCase();
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

      // Si la conversation est activement consultée, marquer comme lue
      setReadChats(prev => new Set([...prev, selectedChat.id, String(selectedChat.id), Number(selectedChat.id)]));
    }, (err) => {
      console.warn('[Firestore] chat messages onSnapshot:', err);
    });
    return () => unsub();
  }, [selectedChat?.id, selectedChat?.user, profile?.name, activeTab, db]);

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

  // ---- ENVOI DE MESSAGE ----
  const handleSendMessage = async () => {
    if (!selectedChat) return;
    const text = messageDraft.trim();
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

    const newMessage = {
      id: Date.now(),
      sender: 'me',
      senderName: profile?.name || 'Moi',
      text,
      status: 'sent',
      createdAt: new Date(),
      translations: { FR: text }
    };
    setChatThreads(prev => ({ ...prev, [chatId]: [...(prev[chatId] || []), newMessage] }));
    setMessageDraft('');

    setChatsList(prev => prev.map(c => String(c.id) === String(chatId) ? { ...c, lastMessage: text, lastSenderName: profile?.name || 'Moi' } : c));

    if (db) {
      try {
        await addDoc(collection(db, 'chats', String(chatId), 'messages'), {
          senderName: profile?.name || 'Moi',
          text,
          read: false,
          status: 'sent',
          createdAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'chats', String(chatId)), {
          id: chatId,
          user: selectedChat.user,
          listing: selectedChat.listing,
          lastMessage: text,
          lastSenderName: profile?.name || 'Moi',
          unreadCount: increment(1),
          participants: selectedChat.participants || [profile?.name || 'Moi', selectedChat.user],
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (e) {
        console.warn('[Firestore] message write failed:', e);
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
        console.warn('[Firestore] edit message failed:', e);
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
        console.warn('[Firestore] delete message failed:', e);
      }
    }
  };

  // ---- ENVOI DE MESSAGE VOCAL ----
  const handleSendAudioMessage = async (audioBlob, duration) => {
    if (!selectedChat) return;
    const chatId = selectedChat.id;
    const uploadRes = await uploadVoiceNote(audioBlob, chatId);
    const audioUrl = uploadRes?.audioUrl;
    if (!audioUrl) return;

    const formattedDuration = Math.round(duration || 0);
    const newAudioMessage = {
      id: Date.now(),
      sender: 'me',
      senderName: profile?.name || 'Moi',
      kind: 'audio',
      type: 'audio',
      audioUrl,
      duration: formattedDuration,
      status: 'sent',
      createdAt: new Date(),
      text: `🎤 Note vocale (${formattedDuration}s)`,
    };

    setChatThreads(prev => ({ ...prev, [chatId]: [...(prev[chatId] || []), newAudioMessage] }));

    setChatsList(prev => prev.map(c => String(c.id) === String(chatId) ? {
      ...c,
      lastMessage: newAudioMessage.text,
      lastSenderName: profile?.name || 'Moi',
    } : c));

    if (db) {
      try {
        await addDoc(collection(db, 'chats', String(chatId), 'messages'), {
          senderName: profile?.name || 'Moi',
          kind: 'audio',
          type: 'audio',
          audioUrl,
          duration: formattedDuration,
          text: newAudioMessage.text,
          read: false,
          status: 'sent',
          createdAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'chats', String(chatId)), {
          lastMessage: newAudioMessage.text,
          lastSenderName: profile?.name || 'Moi',
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (e) {
        console.warn('[Firestore] audio message write failed:', e);
      }
    }
  };

  // ---- ISOLATION DES DISCUSSIONS PAR PAIRE D'UTILISATEURS ET ANNONCE ----
  const buildConversationId = (listingId, userA, userB) => {
    const uA = String(userA || '').trim().toLowerCase();
    const uB = String(userB || '').trim().toLowerCase();
    const pair = [uA, uB].sort().join('_');
    return `chat_${listingId}_${pair}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  };

  const handleStartDiscussion = async (listing) => {
    if (listing.author === profile?.name) return;

    const conversationId = buildConversationId(listing.id, profile?.name, listing.author);

    const conversation = {
      id: conversationId,
      user: listing.author,
      listing: listing.title,
      lastMessage: `Début de discussion pour ${listing.title}`,
      status: 'Nouvelle discussion',
      terms: listing.compensation || '',
      participants: [profile?.name, listing.author],
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
          user: listing.author,
          listing: listing.title,
          lastMessage: `Début de discussion pour ${listing.title}`,
          status: 'Nouvelle discussion',
          terms: listing.compensation || '',
          participants: [profile?.name, listing.author],
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (e) {
        console.warn('[Firestore] start discussion failed:', e);
      }
    }

    setChatThreads(prev => {
      if (prev[conversationId]) return prev;
      return {
        ...prev,
        [conversationId]: [{ id: 1, sender: 'them', text: `Bonjour ! Je peux te proposer un échange fluide sur « ${listing.title} ».` }],
      };
    });
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
        console.warn('[Firestore] group chat create error:', e);
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
        console.warn('[Firestore] reward proposal write error:', e);
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

    // 1. Mettre à jour l'état du message localement
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

    // 2. Si le profil connecté est le bénéficiaire, créditer son solde de jetons
    if (beneficiary && profile?.name && beneficiary.trim().toLowerCase() === profile.name.trim().toLowerCase()) {
      setProfile(prev => ({
        ...prev,
        trocoTokens: (prev.trocoTokens || 0) + amount,
      }));
    }

    // 3. Mettre à jour les membres et allocations dans le chat du groupe
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

    // 4. Synchroniser avec Firestore
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
        console.warn('[Firestore] reward confirmation sync error:', e);
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

  // ---- CRÉATION ATOMIQUE D'UNE CONTRE-OFFRE ----
  const handleCounterOfferSubmit = async (terms) => {
    if (!selectedChat) return;
    const chatId = selectedChat.id;
    const euroAmount = Number(terms.euroAmount) || 0;
    const trocoTokens = Number(terms.trocoTokens) || 0;
    const durationType = terms.durationType || 'hourly';
    const durationValue = terms.durationValue ? String(terms.durationValue) : '1';
    const conditions = (terms.conditions && terms.conditions.trim()) || `${durationValue}h d'échange pour ${trocoTokens > 0 ? `${trocoTokens} Jeton(s)` : ''} ${euroAmount > 0 ? `${euroAmount}€` : ''}`.trim() || 'Échange convenu.';
    const fullTerms = { euroAmount, trocoTokens, durationType, durationValue, conditions };

    if (editingDealId) {
      setChatThreads(prev => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map(m => String(m.id) === String(editingDealId) ? { ...m, status: 'superseded', updatedAt: new Date().toISOString() } : m)
      }));

      if (db) {
        try {
          await updateDoc(doc(db, 'chats', String(chatId), 'messages', String(editingDealId)), {
            status: 'superseded',
            updatedAt: serverTimestamp(),
          });
        } catch (e) {
          console.warn('[Firestore] previous deal supersede failed:', e);
        }
      }
    }

    const newDealMsgId = `deal_${Date.now()}`;
    const dealMessage = {
      id: newDealMsgId,
      sender: 'me',
      senderName: profile?.name || 'Moi',
      senderUid: profile?.uid || auth?.currentUser?.uid,
      kind: 'deal',
      dealId: newDealMsgId,
      status: 'pending',
      terms: fullTerms,
      createdAt: Date.now(),
    };

    setChatThreads(prev => ({ ...prev, [chatId]: [...(prev[chatId] || []), dealMessage] }));
    setIsCounterOfferOpen(false);
    setEditingDealId(null);

    if (db) {
      try {
        await addDoc(collection(db, 'chats', String(chatId), 'messages'), {
          sender: 'me',
          senderName: profile?.name || 'Moi',
          senderUid: profile?.uid || auth?.currentUser?.uid,
          kind: 'deal',
          dealId: newDealMsgId,
          status: 'pending',
          terms: fullTerms,
          createdAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'chats', String(chatId)), {
          id: chatId,
          user: selectedChat.user,
          listing: selectedChat.listing,
          lastMessage: `Contre-offre de ${profile?.name || 'Moi'} : ${conditions}`,
          lastSenderName: profile?.name || 'Moi',
          lastDealStatus: 'pending',
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (e) {
        console.warn('[Firestore] new counter-deal message write failed:', e);
      }
    }
  };

  // ---- FONCTION PRINCIPALE : EXÉCUTION DE TRANSACTION FIRESTORE ATOMIQUE (FINTECH ENGINE) ----
  const executeDealTransaction = async ({
    chatId,
    dealId,
    terms,
    buyerUid,
    partnerUid,
    partnerName,
    euroAmount = 0,
    tokensAmount = 0,
    paymentMethod = 'Solde Portefeuille Troco',
  }) => {
    const finalEuro = Number(euroAmount) || 0;
    const finalTokens = Number(tokensAmount) || 0;
    const myUid = buyerUid || profile?.uid || auth?.currentUser?.uid;
    const isPaidDeal = finalEuro > 0 || finalTokens > 0;
    const targetStatus = isPaidDeal ? 'escrow_locked' : 'confirmed';

    // 1. Mise à jour immédiate locale de l'acheteur
    const updatedProfile = {
      ...profile,
      trocoTokens: finalTokens > 0 ? Math.max(0, (profile?.trocoTokens || 0) - finalTokens) : profile?.trocoTokens,
      euroBalance: (paymentMethod?.includes('Solde') || paymentMethod === 'wallet') ? Number(Math.max(0, (profile?.euroBalance || 0) - finalEuro).toFixed(2)) : (profile?.euroBalance || 0),
      dealsCompleted: !isPaidDeal ? (profile?.dealsCompleted || 0) + 1 : (profile?.dealsCompleted || 0)
    };
    setProfile(updatedProfile);
    try {
      localStorage.setItem('troco_user_profile', JSON.stringify(updatedProfile));
    } catch (_) { }

    const escrowData = isPaidDeal ? {
      status: 'locked',
      euroAmount: finalEuro,
      tokensAmount: finalTokens,
      buyerUid: myUid,
      buyerName: profile?.name,
      sellerUid: partnerUid || null,
      sellerName: partnerName,
      fundedAt: new Date().toISOString(),
    } : null;

    setChatThreads(prev => ({
      ...prev,
      [chatId]: (prev[chatId] || []).map(m => String(m.id) === String(dealId) ? {
        ...m,
        status: targetStatus,
        escrow: escrowData,
        paidBy: myUid,
        paidByName: profile?.name,
        paymentMethod,
      } : m),
    }));
    setChatStatusOverrides(prev => ({ ...prev, [chatId]: isPaidDeal ? 'Fonds sous Séquestre' : 'Deal Validé' }));

    playBetclicBalanceSound(true);
    playApplePaySound();

    const transactionId = `TRK-DEAL-${Date.now().toString().slice(-6)}`;
    const newTx = {
      id: `tx-deal-${Date.now()}`,
      transactionId,
      label: isPaidDeal ? `Séquestre Deal avec ${partnerName || 'Partenaire'} (${terms?.conditions || 'Prestation'})` : `Troc Direct avec ${partnerName || 'Partenaire'}`,
      amountTtc: finalEuro,
      tokens: finalTokens,
      mode: isPaidDeal ? 'escrow_deposit' : 'deal',
      status: isPaidDeal ? 'held_in_escrow' : 'completed',
      date: new Date().toISOString(),
      partner: partnerName || 'Partenaire',
      paymentMethod: paymentMethod,
      createdAt: new Date().toISOString(),
    };
    setUserTransactions(prev => [newTx, ...prev]);

    // 2. TRANSACTION ATOMIQUE SUR FIRESTORE (runTransaction)
    if (myUid && db) {
      try {
        let resolvedPartnerUid = partnerUid;
        if (!resolvedPartnerUid && partnerName) {
          try {
            const userQuery = query(collection(db, 'users'), where('name', '==', partnerName));
            const uSnap = await getDocs(userQuery);
            if (!uSnap.empty) {
              resolvedPartnerUid = uSnap.docs[0].id;
            }
          } catch (_) { }
        }

        await runTransaction(db, async (transaction) => {
          const buyerRef = doc(db, 'users', myUid);
          const buyerSnap = await transaction.get(buyerRef);

          let currentBuyerEuro = profile?.euroBalance || 0;
          let currentBuyerTokens = profile?.trocoTokens || 0;
          let currentBuyerDeals = profile?.dealsCompleted || 0;

          if (buyerSnap.exists()) {
            const bData = buyerSnap.data();
            currentBuyerEuro = bData.euroBalance !== undefined ? bData.euroBalance : currentBuyerEuro;
            currentBuyerTokens = bData.trocoTokens !== undefined ? bData.trocoTokens : currentBuyerTokens;
            currentBuyerDeals = bData.dealsCompleted !== undefined ? bData.dealsCompleted : currentBuyerDeals;
          }

          const msgRef = doc(db, 'chats', String(chatId), 'messages', String(dealId));
          const msgSnap = await transaction.get(msgRef);

          const shouldDebitWallet = paymentMethod?.includes('Solde') || paymentMethod === 'wallet';
          const calculatedBuyerEuro = shouldDebitWallet ? Number(Math.max(0, currentBuyerEuro - finalEuro).toFixed(2)) : currentBuyerEuro;
          const calculatedBuyerTokens = finalTokens > 0 ? Math.max(0, currentBuyerTokens - finalTokens) : currentBuyerTokens;

          transaction.set(buyerRef, {
            euroBalance: calculatedBuyerEuro,
            trocoTokens: calculatedBuyerTokens,
            dealsCompleted: !isPaidDeal ? currentBuyerDeals + 1 : currentBuyerDeals,
            updatedAt: serverTimestamp(),
          }, { merge: true });

          if (!isPaidDeal && resolvedPartnerUid) {
            const sellerRef = doc(db, 'users', resolvedPartnerUid);
            const sellerSnap = await transaction.get(sellerRef);
            if (sellerSnap && sellerSnap.exists()) {
              const currentSellerDeals = sellerSnap.data().dealsCompleted || 0;
              transaction.update(sellerRef, {
                dealsCompleted: currentSellerDeals + 1,
                updatedAt: serverTimestamp(),
              });
            }
          }

          const txDocRef = doc(collection(db, 'transactions'));
          transaction.set(txDocRef, {
            ...newTx,
            userId: myUid,
            userName: profile?.name || 'Membre',
            partnerUid: resolvedPartnerUid || null,
            dealId: String(dealId),
            chatId: String(chatId),
            createdAt: serverTimestamp(),
          });

          const messagePayload = {
            status: targetStatus,
            paidBy: myUid,
            paidByName: profile?.name || 'Membre',
            paymentMethod: paymentMethod,
            escrow: isPaidDeal ? {
              status: 'locked',
              euroAmount: finalEuro,
              tokensAmount: finalTokens,
              buyerUid: myUid,
              buyerName: profile?.name,
              sellerUid: resolvedPartnerUid || null,
              sellerName: partnerName,
              fundedAt: new Date().toISOString(),
            } : null,
            confirmedAt: !isPaidDeal ? serverTimestamp() : null,
            fundedAt: isPaidDeal ? serverTimestamp() : null,
            updatedAt: serverTimestamp(),
          };

          if (msgSnap.exists()) {
            transaction.update(msgRef, messagePayload);
          } else {
            transaction.set(msgRef, messagePayload, { merge: true });
          }

          const chatDocRef = doc(db, 'chats', String(chatId));
          transaction.set(chatDocRef, {
            lastDealStatus: targetStatus,
            lastMessage: isPaidDeal ? `🛡️ Fonds sécurisés sous séquestre Troco (${partnerName || 'Partenaire'})` : `🤝 Deal scellé et validé (${partnerName || 'Partenaire'})`,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        });
      } catch (err) {
        console.warn('[Firestore] Atomic runTransaction deal escrow error:', err);
      }
    }

    if (isPaidDeal) {
      setSaveMessage(`🛡️ Deal sécurisé ! Les fonds (${finalEuro > 0 ? `${finalEuro}€ ` : ''}${finalTokens > 0 ? `${finalTokens} Jeton(s)` : ''}) sont sous séquestre Troco.`);
    } else {
      setSaveMessage(`🤝 Deal validé avec succès ! Troc direct scellé.`);
    }
    setTimeout(() => setSaveMessage(''), 5000);
  };

  // ---- LIBÉRATION DU SÉQUESTRE FINANCIER ----
  const handleReleaseEscrow = async (chatId, dealId, escrowData) => {
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
        console.warn('[Firestore] Escrow release transaction error:', err);
      }
    }

    setSaveMessage(`🎉 Prestation confirmée ! ${finalEuro > 0 ? `${finalEuro}€ ` : ''}${finalTokens > 0 ? `${finalTokens} Jeton(s) ` : ''}versé(s) à ${partnerName}.`);
    setTimeout(() => setSaveMessage(''), 5000);
  };

  // ---- DÉCLENCHEMENT DE L'ACCEPTATION D'UN DEAL ----
  const handleAcceptDeal = async (chatId, dealId, terms) => {
    const dealMessage = (chatThreads[chatId] || []).find(m => String(m.id) === String(dealId));
    const isMe = dealMessage && (
      (dealMessage.senderName && profile?.name && dealMessage.senderName.trim().toLowerCase() === profile.name.trim().toLowerCase()) ||
      (dealMessage.senderUid && profile?.uid && dealMessage.senderUid === profile.uid) ||
      dealMessage.sender === 'me'
    );
    if (isMe) return;

    const chat = (selectedChat && String(selectedChat.id) === String(chatId))
      ? selectedChat
      : (chatsList.find(c => String(c.id) === String(chatId)) || mockChats.find(c => String(c.id) === String(chatId)));
    const partnerName = chat?.user || 'Interlocuteur';
    const partnerUid = chat?.authorUid || chat?.partnerUid || null;
    const tokensAmount = Number(terms?.trocoTokens) || 0;
    const euroAmount = Number(terms?.euroAmount) || 0;

    // 1. Troc direct (0€ et 0 jeton) : validation instantanée
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

    // 2. Si euros > 0 ou jetons > 0 : ouverture du tunnel de paiement
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

  // ---- REFUS D'UN DEAL PAR LE DESTINATAIRE ----
  const handleDeclineDeal = async (chatId, dealId) => {
    const dealMessage = (chatThreads[chatId] || []).find(m => String(m.id) === String(dealId));
    const isMe = dealMessage && (
      (dealMessage.senderName && profile?.name && dealMessage.senderName.trim().toLowerCase() === profile.name.trim().toLowerCase()) ||
      (dealMessage.senderUid && profile?.uid && dealMessage.senderUid === profile.uid) ||
      dealMessage.sender === 'me'
    );
    if (isMe) return;

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
        console.warn('[Firestore] deal decline write failed:', e);
      }
    }
  };

  // ---- RENDU DU COMPOSANT CARTE DE DEAL ----
  const renderDealCard = (message, chatId, otherName) => {
    const { terms, status, sender } = message;
    const isMine = sender === 'me';
    const isIncoming = sender === 'them';
    const isBuyer = (message.paidBy && profile?.uid && message.paidBy === profile.uid) ||
      (message.escrow?.buyerUid && profile?.uid && message.escrow.buyerUid === profile.uid) ||
      (!message.paidBy && isIncoming);

    return (
      <div style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: '18px', padding: '14px', backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', animation: 'fadeSlideUp 0.35s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800', color: 'var(--accent-primary)' }}>
            <Sparkles size={14} /> {isMine ? 'Ma proposition de deal' : 'Proposition de deal reçue'}
          </div>
          {status === 'pending' && isMine && (
            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', padding: '4px 9px', borderRadius: '999px' }}>
              En attente de la réponse de {otherName}
            </span>
          )}
          {status === 'pending' && isIncoming && (
            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-warning)', padding: '4px 9px', borderRadius: '999px' }}>
              ⚡ Action requise
            </span>
          )}
          {status === 'escrow_locked' && (
            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-success, #10B981)', padding: '4px 9px', borderRadius: '999px', border: '1px solid var(--accent-success, #10B981)' }}>
              🛡️ Fonds sous Séquestre
            </span>
          )}
          {(status === 'confirmed' || status === 'accepted') && (
            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)', padding: '4px 9px', borderRadius: '999px' }}>
              Deal validé ✓
            </span>
          )}
          {(status === 'declined' || status === 'superseded') && (
            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', padding: '4px 9px', borderRadius: '999px' }}>
              {status === 'superseded' ? 'Remplacée' : 'Refusée'}
            </span>
          )}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.5, marginBottom: '10px' }}>{terms.conditions}</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {terms.durationType && (
            <span style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)', color: 'var(--accent-primary)', borderRadius: '999px', padding: '4px 10px', fontSize: '11px', fontWeight: '800' }}>
              ⏱️ {terms.durationType === 'hourly' ? `${terms.durationValue || 1}h` : terms.durationType === 'daily' ? `${terms.durationValue || 1}j` : terms.durationType === 'monthly' ? `${terms.durationValue || 1} mois` : terms.durationType === 'fixed' ? 'Forfait' : 'Libre'}
            </span>
          )}
          {terms.euroAmount > 0 && <span style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)', color: 'var(--accent-primary)', borderRadius: '999px', padding: '4px 10px', fontSize: '11px', fontWeight: '800' }}>💶 {terms.euroAmount}€</span>}
          {terms.trocoTokens > 0 && <span style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)', color: 'var(--accent-warning)', borderRadius: '999px', padding: '4px 10px', fontSize: '11px', fontWeight: '800' }}>🪙 {terms.trocoTokens} Jeton{terms.trocoTokens > 1 ? 's' : ''}</span>}
          {terms.euroAmount === 0 && terms.trocoTokens === 0 && <span style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)', color: 'var(--accent-primary)', borderRadius: '999px', padding: '4px 10px', fontSize: '11px', fontWeight: '800' }}>🤝 Troc direct</span>}
        </div>
        {status === 'pending' && isIncoming && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
            <button onClick={() => handleAcceptDeal(chatId, message.id, terms)} className="premium-button" style={{ border: '1.5px solid var(--accent-primary)', borderRadius: '12px', padding: '8px 4px', backgroundColor: 'var(--bg-card)', color: 'var(--accent-primary)', fontSize: '11.5px', fontWeight: '800', cursor: 'pointer', boxShadow: 'var(--shadow-accent)', whiteSpace: 'nowrap' }}>✓ Accepter</button>
            <button onClick={() => openCounterOffer(terms, message.id)} className="premium-button" style={{ border: 'none', borderRadius: '12px', padding: '8px 4px', background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)', color: '#FFF', fontSize: '11.5px', fontWeight: '800', cursor: 'pointer', boxShadow: 'var(--shadow-accent)', whiteSpace: 'nowrap' }}>🔄 Contre-offre</button>
            <button onClick={() => handleDeclineDeal(chatId, message.id)} className="premium-button" style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '8px 4px', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)', fontSize: '11.5px', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap' }}>✕ Refuser</button>
          </div>
        )}
        {status === 'pending' && isMine && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-subtle)', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)', borderRadius: '12px', padding: '9px 12px', fontSize: '11.5px', fontWeight: '700' }}>
            <Clock size={13} color="var(--accent-primary)" /> En attente de la réponse de <strong>{otherName}</strong>
          </div>
        )}
        {status === 'escrow_locked' && (
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
        {(status === 'confirmed' || status === 'accepted') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)', borderRadius: '12px', padding: '9px 12px', fontSize: '12px', fontWeight: '800' }}>
            <CheckCircle size={15} color="var(--accent-primary)" /> Deal confirmé et scellé avec {otherName} ✓
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
    playNotificationSound,
    handleSelectChat,
    handleTypingChange,
    handleSendMessage,
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
    executeDealTransaction,
    handleReleaseEscrow,
    handleAcceptDeal,
    handleDeclineDeal,
    renderDealCard,
  };
};

export default useChatManager;
