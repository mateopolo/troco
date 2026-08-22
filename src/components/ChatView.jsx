import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Send, Phone, Video, Sparkles, Clock, CheckCircle,
  ChevronLeft, Globe, Edit2, Trash2, Copy, Check, X,
  AlertTriangle
} from 'lucide-react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { subscribeTranslations } from '../utils/translator';

export default function ChatView({
  activeTab,
  mockChats,
  selectedChat,
  setSelectedChat,
  chatThreads,
  readChats,
  chatInputText,
  setChatInputText,
  onTypingChange,
  isThemTyping = false,
  handleSendMessage,
  handleEditMessage,
  handleDeleteMessage,
  openCounterOffer,
  startCall,
  handleAcceptDeal,
  handleDeclineDeal,
  profile,
  currentLang,
  t,
  darkMode,
  getChatMessageDisplayContent,
  getListingTitleTranslation,
  formatStatus,
  showingOriginalMessages = {},
  toggleOriginalMessage = () => {},
  isMobile: isMobileProp = undefined
}) {
  const [deletedChatIds, setDeletedChatIds] = useState(() => {
    try {
      const saved = localStorage.getItem('troco_deleted_chats');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (_) {
      return new Set();
    }
  });
  const [confirmDeleteChat, setConfirmDeleteChat] = useState(null);
  const [isMobileLocal, setIsMobileLocal] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const isMobile = isMobileProp !== undefined ? isMobileProp : isMobileLocal;

  const [mobileSubView, setMobileSubView] = useState(() => (selectedChat && !deletedChatIds.has(selectedChat.id)) ? 'room' : 'list');
  const [activeMenuMsgId, setActiveMenuMsgId] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null); // { id, text }
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [, setTranslationRevision] = useState(0);
  const messagesEndRef = useRef(null);

  const [viewportMetrics, setViewportMetrics] = useState(() => {
    if (typeof window !== 'undefined' && window.visualViewport) {
      return {
        height: window.visualViewport.height,
        offsetTop: window.visualViewport.offsetTop
      };
    }
    return { height: null, offsetTop: 0 };
  });

  // Écoute du Visual Viewport pour le clavier virtuel mobile (iOS Safari & Android)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const handleViewportUpdate = () => {
      setViewportMetrics({
        height: window.visualViewport.height,
        offsetTop: window.visualViewport.offsetTop
      });
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    };
    window.visualViewport.addEventListener('resize', handleViewportUpdate);
    window.visualViewport.addEventListener('scroll', handleViewportUpdate);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportUpdate);
      window.visualViewport?.removeEventListener('scroll', handleViewportUpdate);
    };
  }, []);

  const handleSelectChatMobile = (chat) => {
    if (setSelectedChat) setSelectedChat(chat);
    setMobileSubView('room');
  };

  const handleBackToDiscussions = () => {
    setMobileSubView('list');
    if (setSelectedChat) setSelectedChat(null);
  };

  // Bascule automatique sur la conversation lorsqu'un chat est sélectionné
  useEffect(() => {
    if (selectedChat && !deletedChatIds.has(selectedChat.id)) {
      setMobileSubView('room');
    }
  }, [selectedChat, deletedChatIds]);

  // Réactualisation en temps réel dès qu'une traduction automatique de message est résolue
  useEffect(() => {
    const unsub = subscribeTranslations(() => {
      setTranslationRevision(r => r + 1);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileLocal(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fermer le menu d'actions lors d'un clic extérieur
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.msg-action-menu-container')) {
        setActiveMenuMsgId(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatThreads, selectedChat, mobileSubView]);

  const getChatLatestTimestamp = useCallback((chat) => {
    if (!chat) return 0;
    const thread = chatThreads && (chatThreads[chat.id] || chatThreads[String(chat.id)]);
    if (thread && thread.length > 0) {
      const lastMsg = thread[thread.length - 1];
      const val = lastMsg.createdAt || lastMsg.timestamp || lastMsg.time;
      if (val) {
        if (typeof val?.toMillis === 'function') return val.toMillis();
        if (typeof val?.toDate === 'function') return val.toDate().getTime();
        if (val?.seconds) return val.seconds * 1000;
        const t = new Date(val).getTime();
        if (!isNaN(t)) return t;
      }
    }
    const chatVal = chat.lastMessageAt || chat.updatedAt || chat.lastMessageTime || chat.createdAt || chat.timestamp;
    if (chatVal) {
      if (typeof chatVal?.toMillis === 'function') return chatVal.toMillis();
      if (typeof chatVal?.toDate === 'function') return chatVal.toDate().getTime();
      if (chatVal?.seconds) return chatVal.seconds * 1000;
      const t = new Date(chatVal).getTime();
      if (!isNaN(t)) return t;
    }
    // Ordre par défaut réaliste
    if (typeof chat.id === 'number') {
      return chat.id > 200 ? 1700000000000 + chat.id * 1000 : 1600000000000 + chat.id * 1000;
    }
    return 0;
  }, [chatThreads]);

  // TRI CHRONOLOGIQUE RIGOUREUX DÉCROISSANT (Le message le plus récent reste toujours au sommet)
  const visibleChats = useMemo(() => {
    const list = (mockChats || []).filter(chat => !deletedChatIds.has(chat.id));
    return [...list].sort((a, b) => {
      const timeA = getChatLatestTimestamp(a);
      const timeB = getChatLatestTimestamp(b);
      return timeB - timeA;
    });
  }, [mockChats, deletedChatIds, getChatLatestTimestamp]);

  if (activeTab !== 'chat') return null;

  const effectiveSelectedChat = selectedChat && !deletedChatIds.has(selectedChat.id) ? selectedChat : null;
  const currentChatId = effectiveSelectedChat ? effectiveSelectedChat.id : (visibleChats[0]?.id || 201);
  const activeChatObj = effectiveSelectedChat || (visibleChats.length > 0 ? visibleChats[0] : null);
  const messages = chatThreads[currentChatId] || [];

  const formatMsgTime = (val) => {
    if (!val) return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    try {
      let d;
      if (typeof val?.toDate === 'function') d = val.toDate();
      else if (val?.seconds) d = new Date(val.seconds * 1000);
      else if (typeof val === 'number' || typeof val === 'string') d = new Date(val);
      else if (val instanceof Date) d = val;
      else d = new Date();
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch (_) {
      return '';
    }
  };

  const handleCopyMsg = (msg) => {
    if (!msg) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(msg.text || '');
      }
    } catch (_) {}
    setCopiedMsgId(msg.id);
    setTimeout(() => setCopiedMsgId(null), 1500);
    setActiveMenuMsgId(null);
  };

  // Formatage intelligent des dates et heures en français
  const formatChatTimestamp = (val, chat, thread) => {
    let d = null;
    if (val) {
      if (typeof val?.toDate === 'function') d = val.toDate();
      else if (val?.seconds) d = new Date(val.seconds * 1000);
      else if (typeof val === 'number' || typeof val === 'string') {
        const parsed = new Date(val);
        if (!isNaN(parsed.getTime())) d = parsed;
      } else if (val instanceof Date) d = val;
    }
    if (!d && thread && thread.length > 0) {
      const lastMsg = thread[thread.length - 1];
      const mVal = lastMsg.createdAt || lastMsg.timestamp;
      if (typeof mVal?.toDate === 'function') d = mVal.toDate();
      else if (mVal?.seconds) d = new Date(mVal.seconds * 1000);
      else if (mVal) {
        const parsed = new Date(mVal);
        if (!isNaN(parsed.getTime())) d = parsed;
      }
    }
    if (!d && chat?.updatedAt) {
      const cVal = chat.updatedAt;
      if (typeof cVal?.toDate === 'function') d = cVal.toDate();
      else if (cVal?.seconds) d = new Date(cVal.seconds * 1000);
      else {
        const parsed = new Date(cVal);
        if (!isNaN(parsed.getTime())) d = parsed;
      }
    }

    if (!d || isNaN(d.getTime())) {
      return chat?.time || '';
    }

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    // Moins de 2 minutes
    if (diffMinutes < 2 && diffMinutes >= 0) {
      return "À l'instant";
    }

    // Aujourd'hui : afficher l'heure exacte (ex: « 13:13 »)
    const isToday = d.getDate() === now.getDate() &&
                    d.getMonth() === now.getMonth() &&
                    d.getFullYear() === now.getFullYear();
    if (isToday) {
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }

    // Hier : « Hier » (ou « Hier 15:22 »)
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.getDate() === yesterday.getDate() &&
                        d.getMonth() === yesterday.getMonth() &&
                        d.getFullYear() === yesterday.getFullYear();
    if (isYesterday) {
      return `Hier ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    }

    // Cette semaine : nom complet du jour en français (ex: « Samedi »)
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 7 && diffDays > 0) {
      const dayName = d.toLocaleDateString('fr-FR', { weekday: 'long' });
      return dayName.charAt(0).toUpperCase() + dayName.slice(1);
    }

    // Plus ancien : date courte en français (ex: « 18/08 »)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  const getChatUnreadCount = (chat) => {
    if (!readChats) return 0;
    const isRead = readChats.has(chat.id) || readChats.has(String(chat.id)) || readChats.has(Number(chat.id));
    if (isRead) return 0;
    const thread = chatThreads && chatThreads[chat.id];
    if (thread && thread.length > 0) {
      const unread = thread.filter(m => m.sender === 'them' || m.kind === 'deal');
      return unread.length > 0 ? unread.length : 1;
    }
    if (chat.lastSenderName && chat.lastSenderName.trim().toLowerCase() !== profile?.name?.trim().toLowerCase()) {
      return chat.unreadCount || 1;
    }
    return 0;
  };

  const getChatPreviewText = (chat) => {
    const thread = chatThreads && chatThreads[chat.id];
    if (thread && thread.length > 0) {
      const last = thread[thread.length - 1];
      if (last.kind === 'deal' || last.type === 'deal') {
        return last.terms?.conditions || 'Proposition de deal';
      }
      if (last.text) return last.text;
    }
    return chat.lastMessage || '';
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteChat) return;
    const targetChat = confirmDeleteChat;
    const targetId = targetChat.id;

    setDeletedChatIds(prev => {
      const next = new Set([...prev, targetId]);
      try {
        localStorage.setItem('troco_deleted_chats', JSON.stringify([...next]));
      } catch (_) {}
      return next;
    });

    if (activeChatObj?.id === targetId || effectiveSelectedChat?.id === targetId) {
      setSelectedChat(null);
    }

    try {
      const firestoreId = targetChat.firestoreId || (typeof targetId === 'string' ? targetId : null);
      if (firestoreId) {
        await deleteDoc(doc(db, 'chats', firestoreId));
      }
    } catch (err) {
      console.warn('[Firestore] Chat delete error:', err);
    }

    setConfirmDeleteChat(null);
  };

  const onSubmitMessage = () => {
    if (editingMsg) {
      if (handleEditMessage) {
        handleEditMessage(currentChatId, editingMsg.id, chatInputText);
      }
      setEditingMsg(null);
      setChatInputText('');
    } else {
      handleSendMessage();
    }
  };

  const renderMessageStatus = (msg) => {
    const isRead = msg.status === 'read' || msg.read === true;
    const isDelivered = msg.status === 'delivered' || msg.delivered === true;

    if (isRead) {
      return (
        <span
          title="Lu"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontSize: '11px',
            fontWeight: '900',
            letterSpacing: '-1.5px',
            color: '#38BDF8',
            textShadow: '0 0 6px rgba(56,189,248,0.6)',
          }}
        >
          ✓✓
        </span>
      );
    }

    if (isDelivered) {
      return (
        <span
          title="Distribué"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontSize: '11px',
            fontWeight: '900',
            letterSpacing: '-1.5px',
            color: darkMode ? 'rgba(15,23,42,0.65)' : 'rgba(255,255,255,0.75)',
          }}
        >
          ✓✓
        </span>
      );
    }

    return (
      <span
        title="Envoyé"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          fontSize: '11px',
          fontWeight: '900',
          color: darkMode ? 'rgba(15,23,42,0.65)' : 'rgba(255,255,255,0.75)',
        }}
      >
        ✓
      </span>
    );
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      flex: 1,
      minHeight: isMobile ? '0' : '560px',
      maxHeight: isMobile ? '100%' : 'calc(100vh - 170px)',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '320px 1fr',
        gap: isMobile ? '0' : '16px',
        width: '100%',
        height: '100%',
        flex: 1,
        overflow: 'hidden'
      }}>
        {/* LISTE DES DISCUSSIONS (Visible sur Desktop ou sur Mobile en sous-vue 'list') */}
        {(!isMobile || mobileSubView === 'list') && (
          <div style={{
            backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.94)' : 'rgba(255,255,255,0.94)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            borderRadius: isMobile ? '0' : '24px',
            padding: isMobile ? '12px 14px' : '18px',
            border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(229,231,235,0.9)',
            boxShadow: isMobile ? 'none' : '0 10px 30px rgba(15,23,42,0.06)',
            display: 'flex', flexDirection: 'column', gap: '10px',
            height: '100%',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px', flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: darkMode ? '#FFFFFF' : '#111827' }}>
                {t('discussions') || 'Discussions'}
              </h3>
              <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: darkMode ? 'rgba(4,38,90,0.6)' : '#EFF6FF', color: darkMode ? '#93C5FD' : '#04265A', padding: '4px 10px', borderRadius: '999px' }}>
                {visibleChats.length} conv.
              </span>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              overflowY: 'auto',
              flex: 1,
              paddingRight: '2px',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y'
            }}>
              {visibleChats.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: darkMode ? '#94A3B8' : '#64748B', fontSize: '13px' }}>
                  Aucune discussion active
                </div>
              ) : (
                visibleChats.map(chat => {
                  const isSelected = activeChatObj?.id === chat.id;
                  const unreadCount = getChatUnreadCount(chat);
                  const isUnread = unreadCount > 0;
                  const statusText = formatStatus ? formatStatus(chat.status) : chat.status;
                  const listingTitleText = getListingTitleTranslation ? getListingTitleTranslation(chat.listing, currentLang) : chat.listing;

                  const thread = chatThreads && chatThreads[chat.id];
                  const lastMsgObjInThread = (thread && thread.length > 0) ? thread[thread.length - 1] : null;
                  const rawLastMsg = getChatPreviewText(chat);
                  const lastMsgText = getChatMessageDisplayContent
                    ? getChatMessageDisplayContent(lastMsgObjInThread || { text: rawLastMsg }, currentLang, false)
                    : rawLastMsg;

                  const lastMsgTimestamp = lastMsgObjInThread?.timestamp || lastMsgObjInThread?.createdAt || chat.lastMessageAt || chat.updatedAt || null;
                  const chatTimestampLabel = formatChatTimestamp(lastMsgTimestamp, chat, thread);

                  const lastMsgSender = lastMsgObjInThread?.sender || null;
                  const lastSenderIsMe = lastMsgSender === 'me';
                  const lastSenderIsThem = lastMsgSender === 'them';
                  // Badge visible uniquement quand c'est à l'utilisateur de répondre
                  const showReplyBadge = isUnread && lastSenderIsThem;
                  const showWaitingBadge = !isUnread && lastSenderIsMe;

                  return (
                    <div
                      key={chat.id}
                      style={{ position: 'relative' }}
                      className="chat-row-container"
                    >
                      <button
                        onClick={() => handleSelectChatMobile(chat)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
                          borderRadius: '16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                          width: '100%',
                          backgroundColor: isSelected
                            ? (darkMode ? 'rgba(4,38,90,0.75)' : '#EFF6FF')
                            : (isUnread ? (darkMode ? 'rgba(4,38,90,0.5)' : '#F0F9FF') : (darkMode ? 'rgba(15,23,42,0.45)' : 'rgba(248,250,252,0.8)')),
                          borderLeft: isSelected
                            ? (darkMode ? '4px solid #60A5FA' : '4px solid #04265A')
                            : (isUnread ? (darkMode ? '4px solid #38BDF8' : '4px solid #0284C7') : '4px solid transparent'),
                          boxShadow: isSelected ? '0 4px 14px rgba(4,38,90,0.15)' : (isUnread ? '0 2px 10px rgba(56,189,248,0.1)' : 'none'),
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #04265A 0%, #14B8A6 100%)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '15px', flexShrink: 0, boxShadow: '0 4px 10px rgba(4,38,90,0.15)', position: 'relative' }}>
                          {chat.user[0]}
                          {unreadCount > 0 && (
                            <span style={{
                              position: 'absolute', top: '-4px', right: '-4px',
                              minWidth: '18px', height: '18px', padding: '0 5px',
                              backgroundColor: '#EF4444', color: '#FFF',
                              borderRadius: '999px', border: '2px solid #FFF',
                              fontSize: '10px', fontWeight: '900',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: '0 2px 8px rgba(239,68,68,0.6)'
                            }}>
                              {unreadCount > 9 ? '+9' : `+${unreadCount}`}
                            </span>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: isUnread ? '800' : '600', fontSize: isUnread ? '14.5px' : '14px', color: isUnread ? (darkMode ? '#FFFFFF' : '#0F172A') : (darkMode ? '#CBD5E1' : '#111827') }}>
                              {chat.user}
                              {(chat.isDemo || chat.persona || (typeof chat.id === 'number' && chat.id < 300)) && (
                                <span style={{ fontSize: '9px', fontWeight: '800', backgroundColor: darkMode ? 'rgba(168,85,247,0.25)' : '#F3E8FF', color: darkMode ? '#D8B4FE' : '#7E22CE', padding: '1px 6px', borderRadius: '6px' }}>
                                  🤖 IA
                                </span>
                              )}
                            </span>
                            <span style={{ fontSize: '10px', color: isUnread ? (darkMode ? '#38BDF8' : '#0284C7') : (darkMode ? '#94A3B8' : '#64748B'), fontWeight: isUnread ? '800' : '500', flexShrink: 0, marginLeft: '6px' }}>
                              {chatTimestampLabel || statusText}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: isUnread ? '800' : '500', color: isUnread ? (darkMode ? '#60A5FA' : '#0369A1') : (darkMode ? '#94A3B8' : '#04265A'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }}>
                            {listingTitleText}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <div style={{ fontSize: '11px', fontWeight: isUnread ? '800' : '400', color: isUnread ? (darkMode ? '#F8FAFC' : '#0F172A') : (darkMode ? '#94A3B8' : '#64748B'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
                              {lastMsgText}
                            </div>
                            {showReplyBadge && (
                              <span style={{
                                flexShrink: 0,
                                fontSize: '10px', fontWeight: '800',
                                backgroundColor: darkMode ? 'rgba(56,189,248,0.2)' : '#E0F2FE',
                                color: darkMode ? '#38BDF8' : '#0369A1',
                                padding: '2px 7px', borderRadius: '999px',
                                border: darkMode ? '1px solid rgba(56,189,248,0.4)' : '1px solid #BAE6FD',
                                whiteSpace: 'nowrap',
                                animation: 'pulse 2s infinite'
                              }}>
                                💬 À toi !
                              </span>
                            )}
                            {showWaitingBadge && !isUnread && (
                              <span style={{
                                flexShrink: 0,
                                fontSize: '10px', fontWeight: '600',
                                color: darkMode ? '#475569' : '#94A3B8',
                                whiteSpace: 'nowrap'
                              }}>
                                ⏳
                              </span>
                            )}
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteChat(chat);
                        }}
                        title="Supprimer cette conversation"
                        className="chat-delete-btn"
                        style={{
                          position: 'absolute', top: '50%', right: '10px',
                          transform: 'translateY(-50%)',
                          width: '28px', height: '28px', borderRadius: '50%',
                          border: 'none',
                          backgroundColor: darkMode ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)',
                          color: '#EF4444',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', opacity: 0, transition: 'opacity 0.2s ease',
                          zIndex: 2, flexShrink: 0
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* SALLE DE CONVERSATION (Visible sur Desktop ou sur Mobile en sous-vue 'room') */}
        {(!isMobile || mobileSubView === 'room') && (
          <div
            className={isMobile ? "mobile-chat-fullscreen-layer" : ""}
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: isMobile ? (viewportMetrics.height ? `${viewportMetrics.height}px` : '100dvh') : '100%',
              minHeight: 0,
              maxHeight: isMobile ? (viewportMetrics.height ? `${viewportMetrics.height}px` : '100dvh') : '100%',
              borderRadius: isMobile ? '0' : '20px',
              overflow: 'hidden',
              backgroundColor: darkMode ? 'rgba(30,41,59,0.85)' : 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: isMobile ? 'none' : (darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E2E8F0'),
              boxShadow: isMobile ? 'none' : '0 10px 30px rgba(15,23,42,0.06)',
              position: isMobile ? 'fixed' : 'relative',
              top: isMobile ? `${viewportMetrics.offsetTop || 0}px` : 'auto',
              left: isMobile ? 0 : 'auto',
              right: isMobile ? 0 : 'auto',
              bottom: isMobile ? 'auto' : 'auto',
              width: isMobile ? '100vw' : '100%',
              zIndex: isMobile ? 1000 : 'auto',
              boxSizing: 'border-box'
            }}
          >
            {!activeChatObj ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: darkMode ? 'rgba(4,38,90,0.4)' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '32px' }}>💬</span>
                </div>
                <div>
                  <p style={{ margin: '0 0 6px', fontWeight: '800', fontSize: '16px', color: darkMode ? '#FFFFFF' : '#111827' }}>Aucune discussion</p>
                  <p style={{ margin: 0, fontSize: '13px', color: darkMode ? '#94A3B8' : '#64748B', lineHeight: 1.5 }}>Sélectionnez une discussion ou contactez un membre pour démarrer un échange.</p>
                </div>
              </div>
            ) : (
              <>
                {/* 1. EN-TÊTE DU CHAT (STICKY TOP - NOM, STATUT, BOUTON RETOUR, APPEL VIDÉO) */}
                <div style={{
                  flexShrink: 0,
                  height: '60px',
                  padding: isMobile ? 'max(10px, env(safe-area-inset-top, 10px)) 16px 10px 16px' : '12px 18px',
                  borderBottom: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(226,232,240,0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: darkMode ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxSizing: 'border-box',
                  zIndex: 30,
                  width: '100%',
                  gap: '8px'
                }}>
                  {/* Partie Gauche : Retour (Mobile) + Avatar + Nom + Annonce */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                    {isMobile && (
                      <button
                        onClick={handleBackToDiscussions}
                        className="premium-button"
                        style={{
                          border: 'none',
                          borderRadius: '50%',
                          width: '36px',
                          height: '36px',
                          backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#EFF6FF',
                          color: darkMode ? '#60A5FA' : '#04265A',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', flexShrink: 0
                        }}
                        title="Retour aux discussions"
                      >
                        <ChevronLeft size={22} />
                      </button>
                    )}
                    <div style={{ position: 'relative', width: '36px', height: '36px', flexShrink: 0 }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #04265A 0%, #14B8A6 100%)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px', boxShadow: '0 4px 10px rgba(4,38,90,0.15)' }}>
                        {activeChatObj?.user ? activeChatObj.user[0].toUpperCase() : 'T'}
                      </div>
                      <div style={{ position: 'absolute', bottom: '0', right: '0', width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#10B981', border: darkMode ? '2px solid #1E293B' : '2px solid #FFF' }} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontWeight: '800', fontSize: isMobile ? '13.5px' : '14.5px', color: darkMode ? '#FFFFFF' : '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {activeChatObj?.user}
                        </span>
                        {(activeChatObj?.isDemo || activeChatObj?.persona || (typeof activeChatObj?.id === 'number' && activeChatObj?.id < 300)) && (
                          <span style={{ fontSize: '8px', fontWeight: '800', backgroundColor: darkMode ? 'rgba(168,85,247,0.25)' : '#F3E8FF', color: darkMode ? '#D8B4FE' : '#7E22CE', padding: '1px 4px', borderRadius: '4px', flexShrink: 0 }}>
                            IA
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: darkMode ? '#60A5FA' : '#04265A', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>
                        {getListingTitleTranslation ? getListingTitleTranslation(activeChatObj?.listing, currentLang) : activeChatObj?.listing}
                      </div>
                    </div>
                  </div>

                  {/* Partie Droite : Actions Appel Audio / Vidéo / Deal */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <button
                      onClick={() => startCall('audio')}
                      className="premium-button"
                      style={{
                        border: 'none', borderRadius: '50%', width: '34px', height: '34px',
                        backgroundColor: darkMode ? 'rgba(96,165,250,0.2)' : '#EFF6FF',
                        color: darkMode ? '#93C5FD' : '#04265A',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                      title={t('audioCall') || 'Appel audio HD'}
                    >
                      <Phone size={15} />
                    </button>
                    <button
                      onClick={() => startCall('video')}
                      className="premium-button"
                      style={{
                        border: 'none', borderRadius: '50%', width: '34px', height: '34px',
                        backgroundColor: darkMode ? 'rgba(96,165,250,0.2)' : '#EFF6FF',
                        color: darkMode ? '#93C5FD' : '#04265A',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                      title={t('videoCall') || 'Appel visio direct'}
                    >
                      <Video size={15} />
                    </button>
                    <button
                      onClick={openCounterOffer}
                      className="premium-button"
                      style={{
                        border: 'none',
                        borderRadius: isMobile ? '50%' : '999px',
                        width: isMobile ? '34px' : 'auto',
                        height: '34px',
                        padding: isMobile ? '0' : '0 10px',
                        backgroundColor: darkMode ? '#60A5FA' : '#04265A',
                        color: darkMode ? '#0F172A' : '#FFF',
                        fontWeight: '800', fontSize: '11px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                        boxShadow: '0 4px 12px rgba(4,38,90,0.2)'
                      }}
                      title={t('counterOffer') || 'Proposer un deal / Contre-offre'}
                    >
                      <Sparkles size={14} />
                      {!isMobile && <span>Deal</span>}
                    </button>
                  </div>
                </div>

                {/* BANDEAU CLIGNOTANT SALLE ACTIVE / APPEL EN COURS (MODE TEAMS) */}
                {activeChatObj?.activeCall?.isLive && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: isMobile ? '8px 12px' : '10px 18px',
                    backgroundColor: darkMode ? 'rgba(16, 185, 129, 0.18)' : '#ECFDF5',
                    borderBottom: darkMode ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #A7F3D0',
                    color: darkMode ? '#34D399' : '#065F46',
                    fontSize: isMobile ? '11px' : '12px',
                    fontWeight: '800',
                    animation: 'fadeSlideUp 0.3s ease both',
                    zIndex: 25,
                    flexShrink: 0,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
                      <span className="breathing-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', flexShrink: 0, boxShadow: '0 0 8px #10B981' }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        🟢 {activeChatObj.activeCall.type === 'video' ? 'Appel vidéo' : 'Appel audio'} en cours (Salle active)
                      </span>
                    </div>
                    <button
                      onClick={() => startCall(activeChatObj.activeCall.type || 'video')}
                      className="premium-button"
                      style={{
                        border: 'none',
                        borderRadius: '999px',
                        padding: '5px 14px',
                        backgroundColor: '#10B981',
                        color: '#FFF',
                        fontSize: '11px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
                        flexShrink: 0,
                        marginLeft: '8px'
                      }}
                    >
                      Rejoindre l’appel
                    </button>
                  </div>
                )}

                {/* 2. ZONE CENTRALE DES MESSAGES (SEUL ÉLÉMENT SCROLLABLE, CENTRÉ & ÉQUILIBRÉ) */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  overscrollBehavior: 'contain',
                  WebkitOverflowScrolling: 'touch',
                  touchAction: 'pan-y',
                  padding: isMobile ? '12px 10px' : '16px 20px',
                  boxSizing: 'border-box',
                  width: '100%'
                }}>
                  <div style={{
                    maxWidth: '680px',
                    width: '100%',
                    margin: '0 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    {messages.map(msg => {
                      const isMsgOriginal = !!showingOriginalMessages[msg.id];
                      const translatedText = getChatMessageDisplayContent
                        ? getChatMessageDisplayContent(msg, currentLang, isMsgOriginal)
                        : (msg.text || '');

                      // RENDU DES MESSAGES SYSTÈME / JOURNAUX D'APPEL
                      if (msg.sender === 'system' || msg.kind === 'call-log' || msg.type === 'call-log') {
                        const isMissed = msg.status === 'missed' || (msg.text && msg.text.includes('manqué'));
                        return (
                          <div key={msg.id} style={{
                            display: 'flex',
                            justifyContent: 'center',
                            margin: '6px 0',
                            width: '100%'
                          }}>
                            <div style={{
                              padding: '6px 14px',
                              borderRadius: '999px',
                              backgroundColor: isMissed
                                ? (darkMode ? 'rgba(239, 68, 68, 0.18)' : '#FEE2E2')
                                : (darkMode ? 'rgba(16, 185, 129, 0.18)' : '#D1FAE5'),
                              border: isMissed
                                ? (darkMode ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid #FECACA')
                                : (darkMode ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid #A7F3D0'),
                              color: isMissed
                                ? (darkMode ? '#FCA5A5' : '#DC2626')
                                : (darkMode ? '#6EE7B7' : '#047857'),
                              fontSize: '11.5px',
                              fontWeight: '700',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                            }}>
                              <span>{translatedText || msg.text}</span>
                            </div>
                          </div>
                        );
                      }

                      if (msg.type === 'deal' || msg.kind === 'deal') {
                        const { terms, status, sender } = msg;
                        const isMine = sender === 'me';
                        const isIncoming = sender === 'them';
                        const dealConditionsText = getChatMessageDisplayContent
                          ? getChatMessageDisplayContent({ text: terms.conditions }, currentLang, isMsgOriginal)
                          : terms.conditions;

                        return (
                          <div key={msg.id} style={{
                            width: '100%',
                            border: darkMode ? '1.5px solid rgba(56,189,248,0.45)' : '1.5px solid #0284C7',
                            borderRadius: '20px',
                            padding: isMobile ? '14px 14px' : '18px',
                            backgroundColor: darkMode ? 'rgba(15,23,42,0.92)' : '#F0F9FF',
                            backgroundImage: darkMode ? 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.85) 100%)' : 'linear-gradient(135deg, #FFFFFF 0%, #F0F9FF 100%)',
                            boxShadow: darkMode ? '0 10px 30px rgba(0,0,0,0.45), 0 0 16px rgba(56,189,248,0.12)' : '0 8px 24px rgba(2,132,199,0.12)',
                            boxSizing: 'border-box'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '800', color: darkMode ? '#93C5FD' : '#0369A1' }}>
                                <Sparkles size={15} color={darkMode ? '#38BDF8' : '#0284C7'} />
                                {isMine ? (t('myDealProposal') || 'Ma proposition de Deal') : (t('receivedDealProposal') || 'Proposition de Deal')}
                              </div>
                              {status === 'pending' && isIncoming && (
                                <span style={{ fontSize: '10.5px', fontWeight: '800', backgroundColor: darkMode ? 'rgba(245,158,11,0.25)' : '#FEF3C7', color: darkMode ? '#FDE68A' : '#92400E', padding: '4px 10px', borderRadius: '999px', border: '1.5px solid #F59E0B' }}>
                                  ⚡ Réponse attendue
                                </span>
                              )}
                              {status === 'pending' && isMine && (
                                <span style={{ fontSize: '10.5px', fontWeight: '800', backgroundColor: darkMode ? 'rgba(148,163,184,0.25)' : '#F1F5F9', color: darkMode ? '#E2E8F0' : '#475569', padding: '4px 10px', borderRadius: '999px', border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #CBD5E1' }}>
                                  {t('waitingResponse') || 'En attente'}
                                </span>
                              )}
                              {(status === 'confirmed' || status === 'accepted') && (
                                <span style={{ fontSize: '10.5px', fontWeight: '800', backgroundColor: darkMode ? 'rgba(160,230,180,0.25)' : '#D1FAE5', color: darkMode ? '#6EE7B7' : '#065F46', padding: '4px 10px', borderRadius: '999px', border: '1.5px solid #10B981' }}>
                                  ✓ Validé & Confirmé
                                </span>
                              )}
                              {status === 'declined' && (
                                <span style={{ fontSize: '10.5px', fontWeight: '800', backgroundColor: darkMode ? 'rgba(239,68,68,0.25)' : '#FEE2E2', color: darkMode ? '#FCA5A5' : '#991B1B', padding: '4px 10px', borderRadius: '999px', border: '1.5px solid #EF4444' }}>
                                  ✕ Refusé
                                </span>
                              )}
                            </div>

                            <div style={{ fontSize: '13px', color: darkMode ? '#F1F5F9' : '#1E293B', marginBottom: '8px', lineHeight: 1.5, fontWeight: '600' }}>
                              {dealConditionsText}
                            </div>
                            {currentLang !== 'FR' && (
                              <button
                                onClick={() => toggleOriginalMessage(msg.id)}
                                className="premium-button"
                                style={{
                                  border: 'none', background: 'none', cursor: 'pointer',
                                  color: darkMode ? '#60A5FA' : '#04265A', fontSize: '11px',
                                  fontWeight: '800', display: 'inline-flex', alignItems: 'center',
                                  gap: '4px', marginBottom: '10px', padding: 0
                                }}
                              >
                                <Globe size={11} style={{ flexShrink: 0 }} /> <span>{isMsgOriginal ? t('showTranslation') : t('showOriginal')}</span>
                              </button>
                            )}

                            {/* BADGES DE CONTREPARTIE */}
                            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                              {terms.durationType && (
                                <span style={{
                                  backgroundColor: darkMode ? '#0F172A' : '#FFF',
                                  border: darkMode ? '1.5px solid #818CF8' : '1.5px solid #4F46E5',
                                  color: darkMode ? '#A5B4FC' : '#4338CA',
                                  borderRadius: '999px', padding: '4px 10px', fontSize: '11px', fontWeight: '800'
                                }}>
                                  ⏱️ {terms.durationType === 'hourly' ? `${terms.durationValue || 1}h` : terms.durationType === 'daily' ? `${terms.durationValue || 1}j` : terms.durationType === 'monthly' ? `${terms.durationValue || 1} mois` : terms.durationType === 'fixed' ? 'Forfait' : 'Libre'}
                                </span>
                              )}
                              {terms.euroAmount > 0 && <span style={{ backgroundColor: darkMode ? '#0F172A' : '#FFF', border: darkMode ? '1.5px solid #38BDF8' : '1.5px solid #0284C7', color: darkMode ? '#38BDF8' : '#0369A1', borderRadius: '999px', padding: '4px 10px', fontSize: '11px', fontWeight: '800' }}>💶 {terms.euroAmount}€</span>}
                              {terms.trocoTokens > 0 && <span style={{ backgroundColor: darkMode ? '#0F172A' : '#FFF', border: darkMode ? '1.5px solid #FBBF24' : '1.5px solid #D97706', color: darkMode ? '#FBBF24' : '#B45309', borderRadius: '999px', padding: '4px 10px', fontSize: '11px', fontWeight: '800' }}>🪙 {terms.trocoTokens} Jetons</span>}
                              {terms.euroAmount === 0 && terms.trocoTokens === 0 && <span style={{ backgroundColor: darkMode ? '#0F172A' : '#FFF', border: darkMode ? '1.5px solid #34D399' : '1.5px solid #059669', color: darkMode ? '#34D399' : '#047857', borderRadius: '999px', padding: '4px 10px', fontSize: '11px', fontWeight: '800' }}>🤝 Troc direct</span>}
                            </div>

                            {status === 'pending' && isIncoming && (
                              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                                <button
                                  onClick={() => handleAcceptDeal(currentChatId, msg.id, terms)}
                                  className="premium-button"
                                  style={{
                                    flex: 1, border: 'none', borderRadius: '12px', padding: '10px 8px',
                                    backgroundColor: darkMode ? '#60A5FA' : '#04265A',
                                    color: darkMode ? '#0F172A' : '#FFF',
                                    fontSize: '12px', fontWeight: '800', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                                  }}
                                >
                                  ✓ Accepter
                                </button>
                                <button
                                  onClick={() => handleDeclineDeal(currentChatId, msg.id)}
                                  className="premium-button"
                                  style={{
                                    flex: 1, border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB',
                                    borderRadius: '12px', padding: '10px 8px',
                                    backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#FFF',
                                    color: darkMode ? '#F8FAFC' : '#6B7280',
                                    fontSize: '12px', fontWeight: '800', cursor: 'pointer'
                                  }}
                                >
                                  ✕ Refuser
                                </button>
                              </div>
                            )}

                            {status === 'pending' && isMine && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: darkMode ? 'rgba(15,23,42,0.5)' : '#F8FAFC', border: darkMode ? '1px dashed rgba(255,255,255,0.2)' : '1px dashed #CBD5E1', color: darkMode ? '#CBD5E1' : '#64748B', borderRadius: '12px', padding: '8px 12px', fontSize: '11.5px', fontWeight: '700' }}>
                                <Clock size={13} /> <span>En attente de la réponse...</span>
                              </div>
                            )}

                            {(status === 'confirmed' || status === 'accepted') && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: darkMode ? 'rgba(16,185,129,0.2)' : '#D1FAE5', color: darkMode ? '#34D399' : '#059669', borderRadius: '12px', padding: '8px 12px', fontSize: '11.5px', fontWeight: '800' }}>
                                <CheckCircle size={14} /> <span>Deal confirmé et verrouillé.</span>
                              </div>
                            )}
                          </div>
                        );
                      }

                      const isMe = msg.sender === 'me';
                      const isMenuOpen = activeMenuMsgId === msg.id;
                      const timeString = formatMsgTime(msg.timestamp || msg.createdAt || msg.id);

                      return (
                        <div
                          key={msg.id}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isMe ? 'flex-end' : 'flex-start',
                            width: '100%',
                            position: 'relative'
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              flexDirection: isMe ? 'row-reverse' : 'row',
                              maxWidth: isMobile ? '88%' : '76%',
                              position: 'relative'
                            }}
                          >
                            <div
                              style={{
                                padding: '10px 14px',
                                borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                backgroundColor: isMe
                                  ? (darkMode ? '#3B82F6' : '#04265A')
                                  : (darkMode ? 'rgba(30, 41, 59, 0.95)' : '#F1F5F9'),
                                color: isMe
                                  ? '#FFFFFF'
                                  : (darkMode ? '#F8FAFC' : '#0F172A'),
                                border: isMe
                                  ? 'none'
                                  : (darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(226,232,240,0.8)'),
                                boxShadow: isMe
                                  ? '0 4px 14px rgba(4,38,90,0.2)'
                                  : '0 2px 8px rgba(15,23,42,0.04)',
                                wordBreak: 'break-word',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px'
                              }}
                            >
                              <div style={{ fontSize: '13.5px', lineHeight: 1.45, fontWeight: '500' }}>
                                {translatedText}
                              </div>

                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: isMe ? 'flex-end' : 'flex-start',
                                gap: '6px',
                                marginTop: '2px'
                              }}>
                                <span style={{
                                  fontSize: '9.5px',
                                  color: isMe ? 'rgba(255,255,255,0.75)' : (darkMode ? '#94A3B8' : '#64748B'),
                                  fontWeight: '600'
                                }}>
                                  {timeString}
                                </span>
                                {isMe && (
                                  <CheckCircle size={10} color={msg.read ? '#38BDF8' : 'rgba(255,255,255,0.7)'} />
                                )}
                              </div>
                            </div>

                            {/* BOUTON D'ACTIONS DU MESSAGE */}
                            <div className="msg-action-menu-container" style={{ position: 'relative' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuMsgId(isMenuOpen ? null : msg.id);
                                }}
                                className="msg-hover-btn"
                                style={{
                                  border: 'none', background: 'none', cursor: 'pointer',
                                  padding: '4px', borderRadius: '50%',
                                  color: darkMode ? '#94A3B8' : '#64748B',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                              >
                                <span style={{ fontSize: '14px', lineHeight: 1 }}>⋮</span>
                              </button>

                              {isMenuOpen && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: '100%',
                                    [isMe ? 'right' : 'left']: 0,
                                    backgroundColor: darkMode ? '#1E293B' : '#FFFFFF',
                                    borderRadius: '12px',
                                    padding: '4px',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                                    border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0',
                                    zIndex: 50,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    minWidth: '120px'
                                  }}
                                >
                                  <button
                                    onClick={() => handleCopyMsg(msg)}
                                    style={{
                                      border: 'none', background: 'none', padding: '6px 10px',
                                      display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px',
                                      color: darkMode ? '#E2E8F0' : '#334155', cursor: 'pointer', borderRadius: '8px',
                                      textAlign: 'left'
                                    }}
                                  >
                                    {copiedMsgId === msg.id ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                                    <span>{copiedMsgId === msg.id ? 'Copié !' : 'Copier'}</span>
                                  </button>

                                  {isMe && handleEditMessage && (
                                    <button
                                      onClick={() => {
                                        setEditingMsg({ id: msg.id, text: msg.text });
                                        setChatInputText(msg.text);
                                        setActiveMenuMsgId(null);
                                      }}
                                      style={{
                                        border: 'none', background: 'none', padding: '6px 10px',
                                        display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px',
                                        color: darkMode ? '#E2E8F0' : '#334155', cursor: 'pointer', borderRadius: '8px',
                                        textAlign: 'left'
                                      }}
                                    >
                                      <Edit2 size={12} />
                                      <span>Modifier</span>
                                    </button>
                                  )}

                                  {isMe && handleDeleteMessage && (
                                    <button
                                      onClick={() => {
                                        handleDeleteMessage(activeChatObj.id, msg.id);
                                        setActiveMenuMsgId(null);
                                      }}
                                      style={{
                                        border: 'none', background: 'none', padding: '6px 10px',
                                        display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px',
                                        color: '#EF4444', cursor: 'pointer', borderRadius: '8px',
                                        textAlign: 'left'
                                      }}
                                    >
                                      <Trash2 size={12} />
                                      <span>Supprimer</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {isThemTyping && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '16px',
                        backgroundColor: darkMode ? 'rgba(15,23,42,0.92)' : '#F0F9FF',
                        border: darkMode ? '1.5px solid rgba(56,189,248,0.45)' : '1.5px solid #0284C7',
                        boxShadow: darkMode ? '0 4px 14px rgba(0,0,0,0.3), 0 0 10px rgba(56,189,248,0.15)' : '0 4px 12px rgba(2,132,199,0.12)',
                        alignSelf: 'flex-start',
                        marginBottom: '4px',
                        animation: 'typingFadeIn 0.25s ease-out'
                      }}>
                        <span style={{ fontSize: '11.5px', fontWeight: '800', color: darkMode ? '#93C5FD' : '#0369A1' }}>
                          {activeChatObj?.user} écrit
                        </span>
                        <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: darkMode ? '#38BDF8' : '#0284C7', display: 'inline-block', animation: 'bounceDot 1.4s infinite ease-in-out', animationDelay: '0s' }} />
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: darkMode ? '#38BDF8' : '#0284C7', display: 'inline-block', animation: 'bounceDot 1.4s infinite ease-in-out', animationDelay: '0.2s' }} />
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: darkMode ? '#38BDF8' : '#0284C7', display: 'inline-block', animation: 'bounceDot 1.4s infinite ease-in-out', animationDelay: '0.4s' }} />
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} style={{ height: '1px' }} />
                  </div>
                </div>

                {/* 3. BARRE INFÉRIEURE DE SAISIE (STICKY BOTTOM AU-DESSUS DU CLAVIER) */}
                <div style={{
                  flexShrink: 0,
                  width: '100%',
                  padding: isMobile ? '10px 14px max(12px, env(safe-area-inset-bottom, 12px)) 14px' : '10px 18px 14px',
                  backgroundColor: darkMode ? 'rgba(15,23,42,0.98)' : 'rgba(255,255,255,0.98)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderTop: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(226,232,240,0.8)',
                  boxSizing: 'border-box',
                  zIndex: 30,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{
                    maxWidth: '680px',
                    width: '100%',
                    margin: '0 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    {editingMsg && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 12px',
                        backgroundColor: darkMode ? 'rgba(4,38,90,0.7)' : '#EFF6FF',
                        borderRadius: '10px',
                        borderLeft: darkMode ? '3px solid #60A5FA' : '3px solid #04265A',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: darkMode ? '#93C5FD' : '#04265A', fontWeight: '700' }}>
                          <Edit2 size={12} />
                          <span>Modification du message</span>
                        </div>
                        <button
                          onClick={() => { setEditingMsg(null); setChatInputText(''); }}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', color: darkMode ? '#93C5FD' : '#04265A', display: 'flex', alignItems: 'center' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={chatInputText}
                        onChange={(e) => {
                          if (onTypingChange) {
                            onTypingChange(e.target.value);
                          } else {
                            setChatInputText(e.target.value);
                          }
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && onSubmitMessage()}
                        placeholder={editingMsg ? 'Modifie ton message...' : (t('typeYourMessage') || t('writeToInterlocutor') || 'Écris ton message...')}
                        style={{
                          flex: 1, padding: '11px 16px', borderRadius: '999px',
                          border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB',
                          backgroundColor: darkMode ? 'rgba(15,23,42,0.85)' : '#F8FAFC',
                          color: darkMode ? '#FFF' : '#111827', fontSize: isMobile ? '16px' : '14px', outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      <button
                        onClick={onSubmitMessage}
                        className="premium-button"
                        style={{
                          border: 'none', borderRadius: '50%', width: '42px', height: '42px',
                          backgroundColor: darkMode ? '#60A5FA' : '#04265A',
                          color: darkMode ? '#0F172A' : '#FFF', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 4px 14px rgba(4,38,90,0.25)', flexShrink: 0
                        }}
                        title="Envoyer"
                      >
                        {editingMsg ? <Check size={18} /> : <Send size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* MODALE DE CONFIRMATION DE SUPPRESSION DE DISCUSSION */}
      {confirmDeleteChat && (
        <div
          onClick={() => setConfirmDeleteChat(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: darkMode ? '#1E293B' : '#FFFFFF',
              color: darkMode ? '#F8FAFC' : '#0F172A',
              borderRadius: '24px',
              padding: '28px 24px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
              border: darkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(226, 232, 240, 0.9)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: darkMode ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(239, 68, 68, 0.2)'
            }}>
              <AlertTriangle size={28} />
            </div>

            <div>
              <h3 style={{
                margin: '0 0 8px 0',
                fontSize: '18px',
                fontWeight: '800',
                color: darkMode ? '#FFFFFF' : '#0F172A'
              }}>
                Supprimer cette discussion ?
              </h3>
              <p style={{
                margin: 0,
                fontSize: '13px',
                lineHeight: 1.5,
                color: darkMode ? '#94A3B8' : '#64748B'
              }}>
                Es-tu sûr de vouloir supprimer la conversation avec <strong style={{ color: darkMode ? '#FFF' : '#111' }}>{confirmDeleteChat.user}</strong> ? Cette action est irréversible.
              </p>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              width: '100%',
              marginTop: '8px'
            }}>
              <button
                type="button"
                onClick={() => setConfirmDeleteChat(null)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '14px',
                  border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #E2E8F0',
                  backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
                  color: darkMode ? '#E2E8F0' : '#475569',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="premium-button"
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '14px',
                  border: 'none',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 6px 18px rgba(239, 68, 68, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Trash2 size={15} /> Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
