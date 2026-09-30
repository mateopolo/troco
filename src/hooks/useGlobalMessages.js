import { useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import {
  collection,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';
import { notificationService } from '../services/notificationService';
import logger from '../utils/logger';

const safeVibrate = (pattern) => {
  if (typeof window !== 'undefined' && 'navigator' in window && typeof window.navigator.vibrate === 'function') {
    try {
      window.navigator.vibrate(pattern);
    } catch (_) { }
  }
};

/**
 * useGlobalMessages - Hook d'écoute globale des messages entrants en arrière-plan.
 * Affiche une notification toast anti-spam quand un message arrive hors du chat actif
 * et écoute l'événement `troco:open_chat` pour basculer vers une conversation.
 */
export const useGlobalMessages = ({
  profile,
  activeTab,
  selectedChat,
  chatsList,
  setSelectedChat,
  setActiveTab
} = {}) => {
  const activeTabRef = useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  const selectedChatRef = useRef(selectedChat);
  useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);

  const notifiedMessageIds = useRef(new Set());

  // 1. Écoute globale des messages en arrière-plan avec toast anti-spam
  useEffect(() => {
    const currentUid = (auth && auth.currentUser && auth.currentUser.uid) || profile?.uid;
    const myName = (profile?.name || '').trim().toLowerCase();
    const myUsername = (profile?.username || '').trim().toLowerCase();
    if (!currentUid || !db) return;

    let isInitial = true;
    const unsubs = [];

    const handleChatDocChange = (change) => {
      const data = change.doc.data();
      if (!data) return;

      const chatId = data.id || change.doc.id;
      const lastSenderUid = data.lastSenderUid ? String(data.lastSenderUid) : null;
      const lastSenderName = (data.lastSenderName || data.lastSender || '').trim().toLowerCase();

      // Ignorer ses propres messages
      const isFromMe = (lastSenderUid && lastSenderUid === String(currentUid)) ||
        (myName && lastSenderName === myName) ||
        (myUsername && lastSenderName === myUsername);

      if (isFromMe) return;

      if (change.type === 'modified' || (change.type === 'added' && !isInitial)) {
        const rawTime = data.lastMessageTimestamp?.toMillis?.() ||
          data.lastMessageTimestamp?.seconds ||
          data.lastMessageTime?.seconds ||
          data.lastMessageTime ||
          data.updatedAt?.seconds ||
          data.updatedAt ||
          '';
        const messageId = data.lastMessageId || data.lastMsgId || `${chatId}_${lastSenderUid || lastSenderName}_${rawTime}_${data.lastMessage || ''}`;

        // Anti-spam Set
        if (notifiedMessageIds.current && notifiedMessageIds.current.has(messageId)) {
          return;
        }

        const currentActiveTab = activeTabRef.current;
        const currentSelectedChat = selectedChatRef.current;
        const currentPath = typeof window !== 'undefined' ? (window.location.pathname + window.location.hash + window.location.search) : '';
        const isCurrentChatUrl = currentPath.includes(String(chatId)) || (currentPath.includes('chat') && currentSelectedChat && String(currentSelectedChat.id) === String(chatId));
        const isCurrentlyViewingThisChat = (currentActiveTab === 'chat' && currentSelectedChat && String(currentSelectedChat.id) === String(chatId)) || isCurrentChatUrl;

        if (!isCurrentlyViewingThisChat) {
          notifiedMessageIds.current.add(messageId);
          if (notifiedMessageIds.current.size > 500) {
            const oldest = notifiedMessageIds.current.values().next().value;
            notifiedMessageIds.current.delete(oldest);
          }

          const senderTitle = data.lastSenderName || data.lastSender || data.user || 'Nouveau message';
          const messageText = data.lastMessage || 'Nouveau message reçu';
          const senderAvatar = data.avatar || data.authorAvatar || null;

          notificationService.show({
            id: messageId,
            title: senderTitle,
            message: messageText,
            avatar: senderAvatar,
            icon: 'chat',
            duration: 3000,
            onClick: () => {
              if (typeof setSelectedChat === 'function') setSelectedChat(data);
              if (typeof setActiveTab === 'function') setActiveTab('chat');
              if (typeof window !== 'undefined') {
                window.location.hash = `chat/${chatId}`;
              }
            },
            data: { chatId, messageId }
          });

          safeVibrate([80, 40, 80]);
        }
      }
    };

    try {
      // Écoute par participantUids
      const qUids = query(
        collection(db, 'chats'),
        where('participantUids', 'array-contains', String(currentUid))
      );
      const unsubUids = onSnapshot(qUids, (snap) => {
        snap.docChanges().forEach(handleChatDocChange);
        isInitial = false;
      }, (err) => {
        logger.warn('[useGlobalMessages] listener error (participantUids):', err);
      });
      unsubs.push(unsubUids);

      // Écoute par participants
      const qParticipants = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', String(currentUid))
      );
      const unsubParticipants = onSnapshot(qParticipants, (snap) => {
        snap.docChanges().forEach(handleChatDocChange);
        isInitial = false;
      }, (err) => {
        logger.warn('[useGlobalMessages] listener warning (participants):', err);
      });
      unsubs.push(unsubParticipants);
    } catch (err) {
      logger.warn('[useGlobalMessages] listener setup error:', err);
    }

    return () => {
      unsubs.forEach(u => { try { if (typeof u === 'function') u(); } catch (_) { } });
    };
  }, [profile?.uid, profile?.name, profile?.username, setSelectedChat, setActiveTab]);

  // 2. Écoute de l'événement personnalisé troco:open_chat
  useEffect(() => {
    const handleOpenChatEvent = (e) => {
      const chatId = e.detail?.chatId;
      if (chatId) {
        const found = (chatsList || []).find(c => String(c.id) === String(chatId));
        if (found) {
          if (typeof setSelectedChat === 'function') setSelectedChat(found);
        } else {
          if (typeof setSelectedChat === 'function') {
            setSelectedChat({ id: chatId, user: e.detail?.user || 'Interlocuteur' });
          }
        }
        if (typeof setActiveTab === 'function') {
          setActiveTab('chat');
        }
      }
    };
    window.addEventListener('troco:open_chat', handleOpenChatEvent);
    return () => window.removeEventListener('troco:open_chat', handleOpenChatEvent);
  }, [chatsList, setSelectedChat, setActiveTab]);

  return {
    notifiedMessageIds,
  };
};

export default useGlobalMessages;
