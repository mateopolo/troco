import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Send, Phone, Video, Sparkles, Clock, CheckCircle,
  ChevronLeft, Globe, Edit2, Trash2, Copy, Check, X,
  AlertTriangle
} from 'lucide-react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { subscribeTranslations } from '../utils/translator';

function ChatView({
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
  getChatMessageDisplayContent,
  getListingTitleTranslation,
  formatStatus,
  showingOriginalMessages = {},
  toggleOriginalMessage = () => {},
  isMobile: isMobileProp = undefined,
  presenceMap = {}
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

  // Auto-scroll des messages lors de l'ouverture du clavier mobile
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const handleViewportUpdate = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    };
    window.visualViewport.addEventListener('resize', handleViewportUpdate);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportUpdate);
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

  const effectiveSelectedChat = (selectedChat && !deletedChatIds.has(selectedChat.id)) ? selectedChat : null;
  const currentChatId = effectiveSelectedChat ? effectiveSelectedChat.id : null;
  const activeChatObj = effectiveSelectedChat;
  const messages = currentChatId ? (chatThreads[currentChatId] || []) : [];

  // Helper de statut en ligne réel basé sur le heartbeat Firestore (< 30s)
  const isUserOnline = (userIdentifier, userUid = null) => {
    if (!presenceMap) return false;
    if (userUid && presenceMap[String(userUid)]) return true;
    if (userIdentifier && presenceMap[String(userIdentifier).trim().toLowerCase()]) return true;
    return false;
  };

  const activeChatIsOnline = isUserOnline(activeChatObj?.user, activeChatObj?.authorUid || activeChatObj?.userId);

  // Détection d'une proposition de deal en attente émise par l'utilisateur courant (Anti-Spam)
  const pendingDealFromMe = messages.find(m => (m.type === 'deal' || m.kind === 'deal') && (m.status === 'pending' || !m.status) && m.sender === 'me');

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

    // Aujourd'hui : afficher l'heure exacte
    const isToday = d.getDate() === now.getDate() &&
                    d.getMonth() === now.getMonth() &&
                    d.getFullYear() === now.getFullYear();
    if (isToday) {
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }

    // Hier : « Hier »
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.getDate() === yesterday.getDate() &&
                        d.getMonth() === yesterday.getMonth() &&
                        d.getFullYear() === yesterday.getFullYear();
    if (isYesterday) {
      return `Hier ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    }

    // Cette semaine : nom complet du jour en français
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 7 && diffDays > 0) {
      const dayName = d.toLocaleDateString('fr-FR', { weekday: 'long' });
      return dayName.charAt(0).toUpperCase() + dayName.slice(1);
    }

    // Plus ancien : date courte en français
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
            color: 'var(--text-main)',
            opacity: 0.9,
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
            color: 'var(--text-main)',
            opacity: 0.7,
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
          color: 'var(--text-main)',
          opacity: 0.7,
        }}
      >
        ✓
      </span>
    );
  };

  const renderChatRoom = () => {
    if (!activeChatObj) {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '32px' }}>💬</span>
          </div>
          <div>
            <p className="font-editorial-heading" style={{ margin: '0 0 6px', fontWeight: '600', fontSize: '20px', color: 'var(--text-main)' }}>Aucune discussion</p>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Sélectionnez une discussion ou contactez un membre pour démarrer un échange.</p>
          </div>
        </div>
      );
    }

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: 'transparent'
      }}>
        {/* 1. EN-TÊTE FIXE DU CHAT (64px) */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isMobile ? '0 12px' : '0 18px',
          paddingTop: isMobile ? 'max(6px, env(safe-area-inset-top))' : '0',
          height: isMobile ? '60px' : '64px',
          minHeight: isMobile ? '60px' : '64px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-glass)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          gap: '8px', flexShrink: 0, zIndex: 30, width: '100%', boxSizing: 'border-box'
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
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-main)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0
                }}
                title="Retour aux discussions"
              >
                <ChevronLeft size={22} />
              </button>
            )}
            <div style={{ position: 'relative', width: '36px', height: '36px', flexShrink: 0 }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px', boxShadow: 'var(--shadow-accent)' }}>
                {activeChatObj?.user ? activeChatObj.user[0].toUpperCase() : 'T'}
              </div>
              {activeChatIsOnline && (
                <div
                  title="En ligne"
                  style={{
                    position: 'absolute', bottom: '0', right: '0',
                    width: '9px', height: '9px', borderRadius: '50%',
                    backgroundColor: 'var(--accent-success)',
                    border: '2px solid var(--bg-card)',
                    boxShadow: '0 0 6px var(--accent-success)'
                  }}
                />
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontWeight: '800', fontSize: isMobile ? '14px' : '14.5px', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeChatObj?.user}
                </span>
                {(activeChatObj?.isDemo || activeChatObj?.persona || (typeof activeChatObj?.id === 'number' && activeChatObj?.id < 300)) && (
                  <span style={{ fontSize: '8px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)', padding: '1px 4px', borderRadius: '4px', flexShrink: 0 }}>
                    IA
                  </span>
                )}
                {activeChatIsOnline && (
                  <span style={{ fontSize: '8.5px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-success)', padding: '1px 5px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--accent-success)' }} /> En ligne
                  </span>
                )}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>
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
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-main)',
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
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-main)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              title={t('videoCall') || 'Appel visio direct'}
            >
              <Video size={15} />
            </button>
            <button
              onClick={() => {
                if (pendingDealFromMe) {
                  openCounterOffer(pendingDealFromMe.terms, pendingDealFromMe.id);
                } else {
                  openCounterOffer();
                }
              }}
              className="premium-button"
              style={{
                border: 'none',
                borderRadius: isMobile ? '50%' : '999px',
                width: isMobile ? '34px' : 'auto',
                height: '34px',
                padding: isMobile ? '0' : '0 12px',
                background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                color: '#FFF',
                fontWeight: '700', fontSize: '11px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                boxShadow: 'var(--shadow-accent)'
              }}
              title={pendingDealFromMe ? "Modifier ma proposition de deal en attente" : (t('counterOffer') || 'Proposer un deal / Contre-offre')}
            >
              <Sparkles size={14} />
              {!isMobile && <span>{pendingDealFromMe ? 'Modifier Deal' : 'Proposer Deal'}</span>}
            </button>
          </div>
        </div>

        {/* BANDEAU SALLE ACTIVE / APPEL EN COURS */}
        {activeChatObj?.activeCall?.isLive && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: isMobile ? '8px 12px' : '10px 18px',
            backgroundColor: 'var(--bg-subtle)',
            borderBottom: '1px solid var(--border-color)',
            color: 'var(--text-main)',
            fontSize: isMobile ? '11px' : '12px',
            fontWeight: '800',
            animation: 'fadeSlideUp 0.3s ease both',
            zIndex: 25,
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
              <span className="breathing-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-success)', flexShrink: 0, boxShadow: '0 0 8px var(--accent-success)' }} />
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
                backgroundColor: 'var(--accent-success)',
                color: '#FFF',
                fontSize: '11px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-accent)',
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              Rejoindre
            </button>
          </div>
        )}

        {/* 2. ZONE DE MESSAGES DÉROULANTE (SEUL ÉLÉMENT QUI SCROLLE) */}
        <div
          ref={messagesEndRef}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: isMobile ? '12px 10px' : '18px 20px',
            backgroundColor: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            boxSizing: 'border-box'
          }}
        >
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxWidth: '680px',
            width: '100%',
            margin: '0 auto'
          }}>
            {messages.map(msg => {
              const isMsgOriginal = !!showingOriginalMessages[msg.id];
              const translatedText = getChatMessageDisplayContent
                ? getChatMessageDisplayContent(msg, currentLang, isMsgOriginal)
                : (msg.text || '');

              // RENDU DES MESSAGES SYSTÈME / JOURNAUX D'APPEL
              if (msg.sender === 'system' || msg.kind === 'call-log' || msg.type === 'call-log') {
                return (
                  <div key={msg.id} style={{ textAlign: 'center', margin: '8px 0' }}>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      color: 'var(--text-secondary)',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-color)',
                      padding: '4px 12px',
                      borderRadius: '999px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: 'var(--shadow-card)',
                    }}>
                      <span>{translatedText || msg.text}</span>
                    </div>
                  </div>
                );
              }

              // RENDU DES PROPOSITIONS DE DEAL (ALIGNEMENT BILATÉRAL STRICT DROITE / GAUCHE)
              if (msg.type === 'deal' || msg.kind === 'deal') {
                const { terms = {} } = msg;
                const isMine = (msg.senderName && profile?.name)
                  ? (msg.senderName.trim().toLowerCase() === profile.name.trim().toLowerCase())
                  : (msg.senderUid && profile?.uid)
                    ? (msg.senderUid === profile.uid)
                    : (msg.sender === 'me');
                const isIncoming = !isMine;
                const currentDealStatus = msg.status || 'pending';
                const isDealPending = currentDealStatus === 'pending' || currentDealStatus === 'proposed' || currentDealStatus === 'en_attente';
                const partnerName = activeChatObj?.user || 'l’interlocuteur';
                const dealConditionsText = getChatMessageDisplayContent
                  ? getChatMessageDisplayContent({ text: terms.conditions }, currentLang, isMsgOriginal)
                  : terms.conditions;

                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMine ? 'flex-end' : 'flex-start',
                      width: '100%',
                      margin: '8px 0',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div style={{
                      width: isMobile ? '94%' : '80%',
                      maxWidth: '520px',
                      border: isMine
                        ? '1.5px solid var(--accent-primary)'
                        : '1.5px solid var(--border-color)',
                      borderRadius: '20px',
                      borderBottomRightRadius: isMine ? '4px' : '20px',
                      borderBottomLeftRadius: isIncoming ? '4px' : '20px',
                      padding: isMobile ? '14px' : '18px',
                      backgroundColor: 'var(--bg-card)',
                      boxShadow: 'var(--shadow-card)',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                          <Sparkles size={15} color="var(--accent-primary)" />
                          {isMine ? (t('myDealProposal') || 'Ma proposition de Deal') : `Proposition de Deal reçue de ${msg.senderName || partnerName}`}
                        </div>
                        {isDealPending && isIncoming && (
                          <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)', padding: '3px 8px', borderRadius: '999px', border: '1.5px solid var(--accent-primary)' }}>
                            ⚡ Réponse attendue
                          </span>
                        )}
                        {isDealPending && isMine && (
                          <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', padding: '3px 8px', borderRadius: '999px', border: '1px solid var(--border-color)' }}>
                            {t('waitingResponse') || 'En attente'}
                          </span>
                        )}
                        {(currentDealStatus === 'confirmed' || currentDealStatus === 'accepted') && (
                          <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-success)', padding: '3px 8px', borderRadius: '999px', border: '1.5px solid var(--accent-success)' }}>
                            ✓ Validé & Scellé
                          </span>
                        )}
                        {currentDealStatus === 'declined' && (
                          <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-danger)', padding: '3px 8px', borderRadius: '999px', border: '1px solid var(--border-color)' }}>
                            ✕ Refusé
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '13px', color: 'var(--text-main)', marginBottom: '8px', lineHeight: 1.5, fontWeight: '600' }}>
                        {dealConditionsText}
                      </div>
                      {currentLang !== 'FR' && (
                        <button
                          onClick={() => toggleOriginalMessage(msg.id)}
                          className="premium-button"
                          style={{
                            border: 'none', background: 'none', cursor: 'pointer',
                            color: 'var(--accent-primary)', fontSize: '11px',
                            fontWeight: '800', display: 'inline-flex', alignItems: 'center',
                            gap: '4px', marginBottom: '10px', padding: 0
                          }}
                        >
                          <Globe size={11} style={{ flexShrink: 0 }} /> <span>{isMsgOriginal ? t('showTranslation') : t('showOriginal')}</span>
                        </button>
                      )}

                      {/* BADGES DE CONTREPARTIE STILLPOINT */}
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        {terms.durationType && (
                          <span style={{
                            backgroundColor: 'var(--bg-subtle)',
                            border: '1.5px solid var(--border-color)',
                            color: 'var(--text-main)',
                            borderRadius: '999px', padding: '3px 9px', fontSize: '11px', fontWeight: '800'
                          }}>
                            ⏱️ {terms.durationType === 'hourly' ? `${terms.durationValue || 1}h` : terms.durationType === 'daily' ? `${terms.durationValue || 1}j` : terms.durationType === 'monthly' ? `${terms.durationValue || 1} mois` : terms.durationType === 'fixed' ? 'Forfait' : 'Libre'}
                          </span>
                        )}
                        {Number(terms.euroAmount) > 0 && <span style={{ backgroundColor: 'var(--bg-subtle)', border: '1.5px solid var(--accent-primary)', color: 'var(--accent-primary)', borderRadius: '999px', padding: '3px 9px', fontSize: '11px', fontWeight: '800' }}>💶 {terms.euroAmount}€</span>}
                        {Number(terms.trocoTokens) > 0 && <span style={{ backgroundColor: 'var(--bg-subtle)', border: '1.5px solid var(--accent-warning)', color: 'var(--accent-warning)', borderRadius: '999px', padding: '3px 9px', fontSize: '11px', fontWeight: '800' }}>🪙 {terms.trocoTokens} Jetons</span>}
                        {Number(terms.euroAmount) === 0 && Number(terms.trocoTokens) === 0 && <span style={{ backgroundColor: 'var(--bg-subtle)', border: '1.5px solid var(--accent-primary)', color: 'var(--accent-primary)', borderRadius: '999px', padding: '3px 9px', fontSize: '11px', fontWeight: '800' }}>🤝 Troc direct</span>}
                      </div>

                      {/* ACTIONS INTERACTIVES POUR LE DESTINATAIRE : ACCEPTER / REFUSER / CONTRE-OFFRE */}
                      {isDealPending && isIncoming && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '10px' }}>
                          <button
                            type="button"
                            onClick={() => handleAcceptDeal(currentChatId, msg.id, terms)}
                            className="premium-button"
                            style={{
                              border: '1.5px solid var(--accent-primary)', borderRadius: '12px', padding: '9px 4px',
                              backgroundColor: 'var(--bg-card)',
                              color: 'var(--accent-primary)',
                              fontSize: '11.5px', fontWeight: '800', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
                              boxShadow: 'var(--shadow-accent)',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            ✓ Accepter
                          </button>
                          <button
                            type="button"
                            onClick={() => openCounterOffer(terms, msg.id)}
                            className="premium-button"
                            style={{
                              border: 'none', borderRadius: '12px', padding: '9px 4px',
                              background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                              color: '#FFF',
                              fontSize: '11.5px', fontWeight: '800', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
                              boxShadow: 'var(--shadow-accent)',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            🔄 Contre-offre
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeclineDeal(currentChatId, msg.id)}
                            className="premium-button"
                            style={{
                              border: '1px solid var(--border-color)',
                              borderRadius: '12px', padding: '9px 4px',
                              backgroundColor: 'var(--bg-subtle)',
                              color: 'var(--text-main)',
                              fontSize: '11.5px', fontWeight: '800', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            ✕ Refuser
                          </button>
                        </div>
                      )}

                      {/* STATUT EN ATTENTE POUR L'EXPÉDITEUR (NE PEUT NI ACCEPTER NI REFUSER SA PROPRE OFFRE) */}
                      {isDealPending && isMine && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--bg-subtle)', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)', borderRadius: '12px', padding: '9px 12px', fontSize: '11.5px', fontWeight: '700' }}>
                          <Clock size={13} color="var(--accent-primary)" />
                          <span>En attente de la réponse de <strong>{partnerName}</strong></span>
                        </div>
                      )}

                      {(currentDealStatus === 'confirmed' || currentDealStatus === 'accepted') && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)', borderRadius: '12px', padding: '8px 12px', fontSize: '11.5px', fontWeight: '800' }}>
                          <CheckCircle size={14} color="var(--accent-primary)" /> <span>Deal validé et scellé avec {partnerName} ✓</span>
                        </div>
                      )}

                      {(currentDealStatus === 'declined' || currentDealStatus === 'superseded') && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', borderRadius: '12px', padding: '8px 12px', fontSize: '11.5px', fontWeight: '700' }}>
                          <AlertTriangle size={14} /> <span>{currentDealStatus === 'superseded' ? 'Offre précédente remplacée par une contre-proposition.' : 'Proposition refusée.'}</span>
                        </div>
                      )}
                    </div>
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
                          ? 'var(--accent-primary)'
                          : 'var(--bg-card)',
                        backgroundImage: isMe
                          ? 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)'
                          : 'none',
                        color: isMe
                          ? 'var(--accent-contrast-text, #FFFFFF)'
                          : 'var(--text-main)',
                        border: isMe
                          ? 'none'
                          : '1px solid var(--border-color)',
                        boxShadow: isMe
                          ? 'var(--shadow-accent)'
                          : 'var(--shadow-card)',
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
                          color: isMe ? 'var(--accent-contrast-text, #FFFFFF)' : 'var(--text-secondary)',
                          opacity: isMe ? 0.85 : 1,
                          fontWeight: '600'
                        }}>
                          {timeString}
                        </span>
                        {isMe && renderMessageStatus(msg)}
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
                          color: 'var(--text-secondary)',
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
                            backgroundColor: 'var(--bg-card)',
                            borderRadius: '14px',
                            padding: '6px',
                            boxShadow: 'var(--shadow-modal)',
                            border: '1px solid var(--border-color)',
                            zIndex: 50,
                            display: 'flex',
                            flexDirection: 'column',
                            minWidth: '130px'
                          }}
                        >
                          <button
                            onClick={() => handleCopyMsg(msg)}
                            style={{
                              border: 'none', background: 'none', padding: '7px 10px',
                              display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px',
                              color: 'var(--text-main)', cursor: 'pointer', borderRadius: '8px',
                              textAlign: 'left', fontWeight: '600'
                            }}
                          >
                            {copiedMsgId === msg.id ? <Check size={12} color="var(--accent-primary)" /> : <Copy size={12} />}
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
                                border: 'none', background: 'none', padding: '7px 10px',
                                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px',
                                color: 'var(--text-main)', cursor: 'pointer', borderRadius: '8px',
                                textAlign: 'left', fontWeight: '600'
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
                                border: 'none', background: 'none', padding: '7px 10px',
                                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px',
                                color: 'var(--accent-danger)', cursor: 'pointer', borderRadius: '8px',
                                textAlign: 'left', fontWeight: '600'
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
                backgroundColor: 'var(--bg-subtle)',
                border: '1.5px solid var(--accent-primary)',
                boxShadow: 'var(--shadow-card)',
                alignSelf: 'flex-start',
                marginBottom: '4px',
                animation: 'typingFadeIn 0.25s ease-out'
              }}>
                <span style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--text-main)' }}>
                  {activeChatObj?.user} écrit
                </span>
                <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', display: 'inline-block', animation: 'bounceDot 1.4s infinite ease-in-out', animationDelay: '0s' }} />
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', display: 'inline-block', animation: 'bounceDot 1.4s infinite ease-in-out', animationDelay: '0.2s' }} />
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', display: 'inline-block', animation: 'bounceDot 1.4s infinite ease-in-out', animationDelay: '0.4s' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} style={{ height: '1px' }} />
          </div>
        </div>

        {/* 3. BARRE DE SAISIE FIXE EN BAS */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '6px',
          padding: isMobile ? '8px 12px' : '10px 18px 14px',
          paddingBottom: isMobile ? 'max(10px, env(safe-area-inset-bottom))' : '14px',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-glass)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          flexShrink: 0, zIndex: 30, width: '100%', boxSizing: 'border-box'
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
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: '10px',
                borderLeft: '3px solid var(--accent-primary)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--accent-primary)', fontWeight: '700' }}>
                  <Edit2 size={12} />
                  <span>Modification du message</span>
                </div>
                <button
                  onClick={() => { setEditingMsg(null); setChatInputText(''); }}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center' }}
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
                  flex: 1, padding: '11px 16px', borderRadius: '24px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontSize: isMobile ? '16px' : '14px',
                  WebkitTextSizeAdjust: '100%',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <button
                onClick={onSubmitMessage}
                className="premium-button"
                style={{
                  border: 'none', borderRadius: '50%', width: '42px', height: '42px',
                  background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                  color: '#FFF', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'var(--shadow-accent)', flexShrink: 0
                }}
                title="Envoyer"
              >
                {editingMsg ? <Check size={18} /> : <Send size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        className="chat-main-view-wrapper"
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          flex: 1,
          height: isMobile ? '100%' : 'calc(100vh - 160px)',
          minHeight: 0,
          maxHeight: isMobile ? '100%' : '840px',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : (effectiveSelectedChat ? '340px 1fr' : '1fr'),
          gap: isMobile ? '0' : (effectiveSelectedChat ? '16px' : '0'),
          maxWidth: (!isMobile && !effectiveSelectedChat) ? '800px' : '100%',
          margin: '0 auto',
          width: '100%',
          height: '100%',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden'
        }}>
          {/* LISTE DES DISCUSSIONS (INBOX) */}
          {(!isMobile || mobileSubView === 'list' || !effectiveSelectedChat) && (!effectiveSelectedChat || !isMobile) && (
            <div style={{
              backgroundColor: 'var(--bg-glass)',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              borderRadius: isMobile ? '18px' : '24px',
              border: '1px solid var(--border-color)',
              boxShadow: isMobile ? 'none' : 'var(--shadow-card)',
              display: 'flex', flexDirection: 'column',
              height: '100%',
              minHeight: 0,
              overflow: 'hidden'
            }}>
              {/* EN-TÊTE SYMÉTRIQUE DU VOLET DISCUSSIONS (64px) */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 18px',
                height: isMobile ? '60px' : '64px',
                minHeight: isMobile ? '60px' : '64px',
                borderBottom: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-glass)',
                flexShrink: 0,
                boxSizing: 'border-box'
              }}>
                <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: 'var(--text-main)' }}>
                  {t('discussions') || 'Discussions'}
                </h3>
                <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)', padding: '4px 10px', borderRadius: '999px', border: '1px solid var(--border-color)' }}>
                  {visibleChats.length} conv.
                </span>
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                overflowY: 'auto',
                flex: 1,
                padding: '12px',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y'
              }}>
                {visibleChats.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-secondary)', fontSize: '13px' }}>
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
                            borderRadius: '16px', cursor: 'pointer', textAlign: 'left',
                            width: '100%',
                            backgroundColor: isSelected
                              ? 'var(--bg-subtle)'
                              : (isUnread ? 'var(--bg-subtle)' : 'transparent'),
                            border: isSelected
                              ? '1px solid var(--border-color)'
                              : '1px solid transparent',
                            borderLeft: isSelected
                              ? '4px solid var(--accent-primary)'
                              : (isUnread ? '4px solid var(--accent-terracotta)' : '4px solid transparent'),
                            boxShadow: isSelected ? 'var(--shadow-card)' : 'none',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--text-main) 0%, var(--text-secondary) 100%)', color: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '15px', flexShrink: 0, boxShadow: 'var(--shadow-card)', position: 'relative' }}>
                            {chat.user[0]}
                            {isUserOnline(chat.user, chat.authorUid || chat.userId) && (
                              <span
                                title="En ligne"
                                style={{
                                  position: 'absolute', bottom: '0', right: '0',
                                  width: '10px', height: '10px',
                                  backgroundColor: 'var(--accent-success)',
                                  borderRadius: '50%', border: '2px solid var(--bg-card)',
                                  boxShadow: '0 0 6px var(--accent-success)'
                                }}
                              />
                            )}

                            {unreadCount > 0 && (
                              <span style={{
                                position: 'absolute', top: '-4px', right: '-4px',
                                minWidth: '18px', height: '18px', padding: '0 5px',
                                backgroundColor: 'var(--accent-primary)', color: '#FFFFFF',
                                borderRadius: '999px', border: '1.8px solid var(--bg-card)',
                                fontSize: '10px', fontWeight: '900',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: 'var(--shadow-card)'
                              }}>
                                {unreadCount > 9 ? '+9' : `+${unreadCount}`}
                              </span>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: isUnread ? '800' : '600', fontSize: isUnread ? '14.5px' : '14px', color: 'var(--text-main)' }}>
                                {chat.user}
                                {(chat.isDemo || chat.persona || (typeof chat.id === 'number' && chat.id < 300)) && (
                                  <span style={{ fontSize: '9px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', padding: '1px 6px', borderRadius: '6px' }}>
                                    🤖 IA
                                  </span>
                                )}
                              </span>
                              <span style={{ fontSize: '10px', color: isUnread ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: isUnread ? '800' : '500', flexShrink: 0, marginLeft: '6px' }}>
                                {chatTimestampLabel || statusText}
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: isUnread ? '800' : '500', color: isUnread ? 'var(--accent-primary)' : 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }}>
                              {listingTitleText}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                              <div style={{ fontSize: '11px', fontWeight: isUnread ? '800' : '400', color: isUnread ? 'var(--text-main)' : 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
                                {lastMsgText}
                              </div>
                              {showReplyBadge && (
                                <span style={{
                                  flexShrink: 0,
                                  fontSize: '10px', fontWeight: '800',
                                  backgroundColor: 'var(--bg-subtle)',
                                  color: 'var(--accent-primary)',
                                  padding: '2px 7px', borderRadius: '999px',
                                  border: '1px solid var(--border-color)',
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
                                  color: 'var(--text-secondary)',
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
                            backgroundColor: 'var(--bg-subtle)',
                            color: 'var(--accent-primary)',
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

          {/* SALLE DE CONVERSATION (RENDUE UNIQUEMENT SI UN CHAT EST SÉLECTIONNÉ) */}
          {effectiveSelectedChat && (!isMobile || mobileSubView === 'room') && (
            <div style={{
              backgroundColor: 'var(--bg-glass)',
              backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
              borderRadius: isMobile ? '18px' : '24px',
              border: '1px solid var(--border-color)',
              boxShadow: isMobile ? 'none' : 'var(--shadow-card)',
              display: 'flex', flexDirection: 'column',
              height: '100%',
              minHeight: 0,
              width: '100%',
              boxSizing: 'border-box',
              overflow: 'hidden',
              position: 'relative'
            }}>
              {renderChatRoom()}
            </div>
          )}
        </div>
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
            backgroundColor: 'var(--overlay-bg)',
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
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)',
              borderRadius: '24px',
              padding: '28px 24px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: 'var(--shadow-modal)',
              border: '1px solid var(--border-color)',
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
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-accent)'
            }}>
              <AlertTriangle size={28} />
            </div>

            <div>
              <h3 className="font-editorial-heading" style={{
                margin: '0 0 8px 0',
                fontSize: '20px',
                fontWeight: '600',
                color: 'var(--text-main)'
              }}>
                Supprimer cette discussion ?
              </h3>
              <p style={{
                margin: 0,
                fontSize: '13px',
                lineHeight: 1.5,
                color: 'var(--text-secondary)'
              }}>
                Es-tu sûr de vouloir supprimer la conversation avec <strong style={{ color: 'var(--text-main)' }}>{confirmDeleteChat.user}</strong> ? Cette action est irréversible.
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
                className="premium-button"
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '999px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-main)',
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
                  borderRadius: '999px',
                  border: '1px solid var(--accent-danger)',
                  backgroundColor: 'var(--accent-danger)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-accent)',
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
    </>
  );
}

export default React.memo(ChatView);

