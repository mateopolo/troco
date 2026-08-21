import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Phone, Video, Sparkles, Clock, CheckCircle,
  ChevronLeft, Globe, MoreVertical, Edit2, Trash2, Copy, Check, X,
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
  toggleOriginalMessage = () => {}
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
  const [mobileSubView, setMobileSubView] = useState('list'); // 'list' | 'room'
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeMenuMsgId, setActiveMenuMsgId] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null); // { id, text }
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [, setTranslationRevision] = useState(0);
  const messagesEndRef = useRef(null);

  // Réactualisation en temps réel dès qu'une traduction automatique de message est résolue
  useEffect(() => {
    const unsub = subscribeTranslations(() => {
      setTranslationRevision(r => r + 1);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
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
  }, [chatThreads, selectedChat]);

  if (activeTab !== 'chat') return null;

  const visibleChats = mockChats.filter(chat => !deletedChatIds.has(chat.id));
  // If selectedChat has been deleted, treat it as null
  const effectiveSelectedChat = selectedChat && !deletedChatIds.has(selectedChat.id) ? selectedChat : null;
  const currentChatId = effectiveSelectedChat ? effectiveSelectedChat.id : (visibleChats[0]?.id || 201);
  const activeChatObj = effectiveSelectedChat || (visibleChats.length > 0 ? visibleChats[0] : null);
  const messages = chatThreads[currentChatId] || [];

  const formatMsgTime = (val) => {
    if (!val) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    try {
      let d;
      if (typeof val?.toDate === 'function') d = val.toDate();
      else if (val?.seconds) d = new Date(val.seconds * 1000);
      else if (typeof val === 'number' || typeof val === 'string') d = new Date(val);
      else if (val instanceof Date) d = val;
      else d = new Date();
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (_) {
      return '';
    }
  };

  // WhatsApp-style timestamp for chat list sidebar
  const formatChatTimestamp = (val) => {
    if (!val) return '';
    try {
      let d;
      if (typeof val?.toDate === 'function') d = val.toDate();
      else if (val?.seconds) d = new Date(val.seconds * 1000);
      else if (typeof val === 'number' || typeof val === 'string') d = new Date(val);
      else if (val instanceof Date) d = val;
      else return '';
      if (isNaN(d.getTime())) return '';
      const now = new Date();
      const diffMs = now - d;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (diffDays === 1) return 'Hier';
      if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
      return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    } catch (_) {
      return '';
    }
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
    // 1. Si chatThreads contient des messages pour cette discussion, le dernier message du fil est le plus frais
    const thread = chatThreads && chatThreads[chat.id];
    if (thread && thread.length > 0) {
      const last = thread[thread.length - 1];
      if (last.kind === 'deal' || last.type === 'deal') {
        return last.terms?.conditions || 'Proposition de deal';
      }
      if (last.text) return last.text;
    }
    // 2. Sinon, le lastMessage provenant de Firestore
    return chat.lastMessage || '';
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteChat) return;
    const targetChat = confirmDeleteChat;
    const targetId = targetChat.id;

    // 1. Update local deletedChatIds set & localStorage
    setDeletedChatIds(prev => {
      const next = new Set([...prev, targetId]);
      try {
        localStorage.setItem('troco_deleted_chats', JSON.stringify([...next]));
      } catch (_) {}
      return next;
    });

    // 2. If active chat was deleted, reset selectedChat
    if (activeChatObj?.id === targetId || effectiveSelectedChat?.id === targetId) {
      setSelectedChat(null);
    }

    // 3. Firestore deletion
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

  const handleSelectChatMobile = (chat) => {
    setSelectedChat(chat);
    if (isMobile) {
      setMobileSubView('room');
    }
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

    // Statut 3 : Lu par le destinataire (✓✓ BLEU VIF / CYAN WhatsApp)
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

    // Statut 2 : Reçu / Distribué chez le destinataire (✓✓ GRIS)
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

    // Statut 1 : Envoyé / Validé par le serveur (✓ UNIQUE GRIS)
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
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '320px 1fr',
      gap: isMobile ? '10px' : '20px',
      height: isMobile ? 'calc(100dvh - 150px)' : 'calc(100vh - 175px)',
      minHeight: isMobile ? '450px' : '520px',
      marginBottom: isMobile ? '70px' : '20px',
      width: '100%',
      maxWidth: '100%',
      overflowX: 'hidden'
    }}>
      {/* SIDEBAR DISCUSSIONS (Visible on desktop OR mobile list mode) */}
      {(!isMobile || mobileSubView === 'list') && (
        <div style={{
          backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '24px', padding: '18px',
          border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(229,231,235,0.9)',
          boxShadow: '0 10px 30px rgba(15,23,42,0.06)',
          display: 'flex', flexDirection: 'column', gap: '12px',
          height: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: darkMode ? '#FFFFFF' : '#111827' }}>
              {t('discussions') || 'Discussions'}
            </h3>
            <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: darkMode ? 'rgba(4,38,90,0.6)' : '#EFF6FF', color: darkMode ? '#93C5FD' : '#04265A', padding: '4px 10px', borderRadius: '999px' }}>
              {visibleChats.length} conv.
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
            {visibleChats.map(chat => {
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

              // WhatsApp-style timestamp from last message or chat metadata
              const lastMsgTimestamp = lastMsgObjInThread?.timestamp || lastMsgObjInThread?.createdAt || chat.lastMessageAt || chat.updatedAt || null;
              const chatTimestampLabel = formatChatTimestamp(lastMsgTimestamp);

              return (
                <div
                  key={chat.id}
                  style={{ position: 'relative' }}
                  className="chat-row-container"
                >
                  <button
                    onClick={() => handleSelectChatMobile(chat)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '14px',
                      borderRadius: '18px', border: 'none', cursor: 'pointer', textAlign: 'left',
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
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #04265A 0%, #14B8A6 100%)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '16px', flexShrink: 0, boxShadow: '0 4px 10px rgba(4,38,90,0.15)', position: 'relative' }}>
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
                              🤖 Démo
                            </span>
                          )}
                        </span>
                        {/* WhatsApp-style timestamp */}
                        <span style={{ fontSize: '10px', color: isUnread ? (darkMode ? '#38BDF8' : '#0284C7') : (darkMode ? '#94A3B8' : '#64748B'), fontWeight: isUnread ? '800' : '500', flexShrink: 0, marginLeft: '6px' }}>
                          {chatTimestampLabel || statusText}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: isUnread ? '800' : '500', color: isUnread ? (darkMode ? '#60A5FA' : '#0369A1') : (darkMode ? '#94A3B8' : '#04265A'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }}>
                        {listingTitleText}
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: isUnread ? '800' : '400', color: isUnread ? (darkMode ? '#F8FAFC' : '#0F172A') : (darkMode ? '#94A3B8' : '#64748B'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {lastMsgText}
                      </div>
                    </div>
                  </button>

                  {/* Delete/Archive button */}
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
            })}
          </div>
        </div>
      )}

      {/* FIL DE DISCUSSION PRINCIPAL (Visible on desktop OR mobile room mode) */}
      {(!isMobile || mobileSubView === 'room') && (
        <div style={{
          backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '24px', padding: isMobile ? '12px 10px' : '18px',
          border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(229,231,235,0.9)',
          boxShadow: '0 10px 30px rgba(15,23,42,0.06)',
          display: 'flex', flexDirection: 'column',
          height: '100%',
          width: '100%',
          boxSizing: 'border-box',
          overflowX: 'hidden'
        }}>
          {/* ÉTAT VIDE : aucune conversation visible */}
          {!activeChatObj ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: darkMode ? 'rgba(4,38,90,0.4)' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '32px' }}>💬</span>
              </div>
              <div>
                <p style={{ margin: '0 0 6px', fontWeight: '800', fontSize: '16px', color: darkMode ? '#FFFFFF' : '#111827' }}>Aucune discussion</p>
                <p style={{ margin: 0, fontSize: '13px', color: darkMode ? '#94A3B8' : '#64748B', lineHeight: 1.5 }}>Toutes vos conversations ont été supprimées.<br/>Contactez un membre pour en démarrer une.</p>
              </div>
            </div>
          ) : (
            <>
          {/* HEADER DISCUSSION */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0', marginBottom: '12px', gap: '6px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              {isMobile && (
                <button
                  onClick={() => setMobileSubView('list')}
                  className="premium-button"
                  style={{
                    border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB',
                    borderRadius: '12px', padding: '6px 10px',
                    backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#FFF',
                    color: darkMode ? '#60A5FA' : '#04265A',
                    fontWeight: '800', fontSize: '12px',
                    display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', flexShrink: 0
                  }}
                >
                  <ChevronLeft size={16} /> Liste
                </button>
              )}
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #04265A 0%, #14B8A6 100%)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '15px', flexShrink: 0 }}>
                {activeChatObj?.user[0]}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: '800', fontSize: '15px', color: darkMode ? '#FFFFFF' : '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeChatObj?.user}</span>
                  {(activeChatObj?.isDemo || activeChatObj?.persona || (typeof activeChatObj?.id === 'number' && activeChatObj?.id < 300)) && (
                    <span style={{ fontSize: '9px', fontWeight: '800', backgroundColor: darkMode ? 'rgba(168,85,247,0.25)' : '#F3E8FF', color: darkMode ? '#D8B4FE' : '#7E22CE', padding: '2px 7px', borderRadius: '6px' }}>
                      🤖 Démo IA
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: darkMode ? '#60A5FA' : '#04265A', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {getListingTitleTranslation ? getListingTitleTranslation(activeChatObj?.listing, currentLang) : activeChatObj?.listing}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <button
                onClick={() => startCall('audio')}
                className="premium-button"
                style={{ border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #E2E8F0', borderRadius: '12px', padding: '8px 12px', backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#F8FAFC', color: darkMode ? '#60A5FA' : '#04265A', fontWeight: '700', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                title={t('audioCall') || 'Appel audio'}
              >
                <Phone size={14} />
              </button>
              <button
                onClick={() => startCall('video')}
                className="premium-button"
                style={{ border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #E2E8F0', borderRadius: '12px', padding: '8px 12px', backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#F8FAFC', color: darkMode ? '#60A5FA' : '#04265A', fontWeight: '700', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                title={t('videoCall') || 'Appel vidéo'}
              >
                <Video size={14} />
              </button>
              <button
                onClick={openCounterOffer}
                className="premium-button"
                style={{ border: 'none', borderRadius: '12px', padding: '8px 12px', backgroundColor: darkMode ? '#60A5FA' : '#04265A', color: darkMode ? '#0F172A' : '#FFF', fontWeight: '800', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 4px 12px rgba(4,38,90,0.15)' }}
              >
                <Sparkles size={13} /> {t('counterOffer') || (isMobile ? 'Contre-offre' : 'Contre-proposition')}
              </button>
            </div>
          </div>

          {/* MESSAGES & DEALS CONTAINER */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '4px', paddingBottom: '10px' }}>
            {messages.map(msg => {
              const isMsgOriginal = !!showingOriginalMessages[msg.id];
              const translatedText = getChatMessageDisplayContent
                ? getChatMessageDisplayContent(msg, currentLang, isMsgOriginal)
                : (msg.text || '');

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
                    padding: '18px',
                    backgroundColor: darkMode ? 'rgba(15,23,42,0.92)' : '#F0F9FF',
                    backgroundImage: darkMode ? 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.85) 100%)' : 'linear-gradient(135deg, #FFFFFF 0%, #F0F9FF 100%)',
                    boxShadow: darkMode ? '0 10px 30px rgba(0,0,0,0.45), 0 0 16px rgba(56,189,248,0.12)' : '0 8px 24px rgba(2,132,199,0.12)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '800', color: darkMode ? '#93C5FD' : '#0369A1' }}>
                        <Sparkles size={16} color={darkMode ? '#38BDF8' : '#0284C7'} />
                        {isMine ? (t('myDealProposal') || 'Ma proposition de Deal') : (t('receivedDealProposal') || 'Proposition de Deal reçue')}
                      </div>
                      {status === 'pending' && isIncoming && (
                        <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: darkMode ? 'rgba(245,158,11,0.25)' : '#FEF3C7', color: darkMode ? '#FDE68A' : '#92400E', padding: '5px 12px', borderRadius: '999px', border: '1.5px solid #F59E0B', boxShadow: '0 2px 8px rgba(245,158,11,0.2)' }}>
                          ⚡ {t('waitingYourResponse') || 'En attente de ta réponse'}
                        </span>
                      )}
                      {status === 'pending' && isMine && (
                        <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: darkMode ? 'rgba(148,163,184,0.25)' : '#F1F5F9', color: darkMode ? '#E2E8F0' : '#475569', padding: '5px 12px', borderRadius: '999px', border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #CBD5E1' }}>
                          {t('waitingResponse') || 'En attente de réponse'}
                        </span>
                      )}
                      {(status === 'confirmed' || status === 'accepted') && (
                        <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: darkMode ? 'rgba(16,185,129,0.25)' : '#D1FAE5', color: darkMode ? '#6EE7B7' : '#065F46', padding: '5px 12px', borderRadius: '999px', border: '1.5px solid #10B981', boxShadow: '0 2px 8px rgba(16,185,129,0.2)' }}>
                          ✓ {t('dealValidatedConfirmed') || 'Deal Validé & Confirmé'}
                        </span>
                      )}
                      {status === 'declined' && (
                        <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: darkMode ? 'rgba(239,68,68,0.25)' : '#FEE2E2', color: darkMode ? '#FCA5A5' : '#991B1B', padding: '5px 12px', borderRadius: '999px', border: '1.5px solid #EF4444' }}>
                          ✕ {t('declined') || 'Refusé'}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '13.5px', color: darkMode ? '#F1F5F9' : '#1E293B', marginBottom: '10px', lineHeight: 1.55, fontWeight: '600' }}>
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

                    {/* BADGES DE CONTREPARTIE & DURÉE À HAUT CONTRASTE */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                      {terms.durationType && (
                        <span style={{
                          backgroundColor: darkMode ? '#0F172A' : '#FFF',
                          border: darkMode ? '1.5px solid #818CF8' : '1.5px solid #4F46E5',
                          color: darkMode ? '#A5B4FC' : '#4338CA',
                          borderRadius: '999px', padding: '5px 14px', fontSize: '12px', fontWeight: '800',
                          boxShadow: '0 2px 8px rgba(79,70,229,0.15)'
                        }}>
                          ⏱️ {terms.durationType === 'hourly' ? `${terms.durationValue || 1}h` : terms.durationType === 'daily' ? `${terms.durationValue || 1}j` : terms.durationType === 'monthly' ? `${terms.durationValue || 1} mois` : terms.durationType === 'fixed' ? 'Forfait global' : 'Durée libre'}
                        </span>
                      )}
                      {terms.euroAmount > 0 && <span style={{ backgroundColor: darkMode ? '#0F172A' : '#FFF', border: darkMode ? '1.5px solid #38BDF8' : '1.5px solid #0284C7', color: darkMode ? '#38BDF8' : '#0369A1', borderRadius: '999px', padding: '5px 14px', fontSize: '12px', fontWeight: '800', boxShadow: '0 2px 8px rgba(2,132,199,0.15)' }}>💶 {terms.euroAmount}€</span>}
                      {terms.trocoTokens > 0 && <span style={{ backgroundColor: darkMode ? '#0F172A' : '#FFF', border: darkMode ? '1.5px solid #FBBF24' : '1.5px solid #D97706', color: darkMode ? '#FBBF24' : '#B45309', borderRadius: '999px', padding: '5px 14px', fontSize: '12px', fontWeight: '800', boxShadow: '0 2px 8px rgba(245,158,11,0.15)' }}>🪙 {terms.trocoTokens} {t('tokens') || 'Jeton(s)'}</span>}
                      {terms.euroAmount === 0 && terms.trocoTokens === 0 && <span style={{ backgroundColor: darkMode ? '#0F172A' : '#FFF', border: darkMode ? '1.5px solid #34D399' : '1.5px solid #059669', color: darkMode ? '#34D399' : '#047857', borderRadius: '999px', padding: '5px 14px', fontSize: '12px', fontWeight: '800', boxShadow: '0 2px 8px rgba(16,185,129,0.15)' }}>🤝 {t('directSwap') || 'Troc direct'}</span>}
                    </div>

                    {status === 'pending' && isIncoming && (
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button
                          onClick={() => handleAcceptDeal(currentChatId, msg.id, terms)}
                          className="premium-button"
                          style={{
                            flex: 1, border: 'none', borderRadius: '12px', padding: '11px',
                            backgroundColor: darkMode ? '#60A5FA' : '#04265A',
                            color: darkMode ? '#0F172A' : '#FFF',
                            fontSize: '13px', fontWeight: '800', cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(4,38,90,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                          }}
                        >
                          ✓ {t('acceptValidateDeal') || 'Accepter & Valider le Deal'}
                        </button>
                        <button
                          onClick={() => handleDeclineDeal(currentChatId, msg.id)}
                          className="premium-button"
                          style={{
                            flex: 1, border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB',
                            borderRadius: '12px', padding: '11px',
                            backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#FFF',
                            color: darkMode ? '#F8FAFC' : '#6B7280',
                            fontSize: '13px', fontWeight: '800', cursor: 'pointer'
                          }}
                        >
                          ✕ {t('decline') || 'Refuser'}
                        </button>
                      </div>
                    )}

                    {status === 'pending' && isMine && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: darkMode ? 'rgba(15,23,42,0.5)' : '#F8FAFC', border: darkMode ? '1px dashed rgba(255,255,255,0.2)' : '1px dashed #CBD5E1', color: darkMode ? '#CBD5E1' : '#64748B', borderRadius: '12px', padding: '10px 14px', fontSize: '12px', fontWeight: '700' }}>
                        <Clock size={14} /> {t('waitingInterlocutorResponse') || "En attente de la réponse de l'interlocuteur..."}
                      </div>
                    )}

                    {(status === 'confirmed' || status === 'accepted') && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: darkMode ? 'rgba(16,185,129,0.2)' : '#D1FAE5', color: darkMode ? '#34D399' : '#059669', borderRadius: '12px', padding: '10px 14px', fontSize: '12px', fontWeight: '800' }}>
                        <CheckCircle size={16} /> {t('dealConfirmedLocked') || 'Deal confirmé et verrouillé avec succès.'}
                      </div>
                    )}
                  </div>
                );
              }

              const isMe = msg.sender === 'me';
              const isMenuOpen = activeMenuMsgId === msg.id;

              return (
                <div
                  key={msg.id}
                  className="msg-action-menu-container"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start',
                    position: 'relative',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexDirection: isMe ? 'row' : 'row-reverse',
                    maxWidth: '85%',
                  }}>
                    {/* BOUTON D'ACTIONS DISCRET (MODIFIER / SUPPRIMER / COPIER) */}
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuMsgId(prev => prev === msg.id ? null : msg.id);
                        }}
                        className="premium-button"
                        style={{
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '8px',
                          color: darkMode ? '#94A3B8' : '#94A3B8',
                          opacity: isMenuOpen ? 1 : 0.6,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Options du message"
                      >
                        <MoreVertical size={14} />
                      </button>

                      {/* MENU FLOTTANT DES ACTIONS */}
                      {isMenuOpen && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          [isMe ? 'right' : 'left']: 0,
                          zIndex: 50,
                          minWidth: '135px',
                          backgroundColor: darkMode ? 'rgba(30,41,59,0.98)' : '#FFFFFF',
                          backdropFilter: 'blur(16px)',
                          borderRadius: '14px',
                          border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #E2E8F0',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                          padding: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                        }}>
                          {/* COPIER */}
                          <button
                            onClick={() => {
                              navigator.clipboard?.writeText(msg.text || '');
                              setCopiedMsgId(msg.id);
                              setTimeout(() => setCopiedMsgId(null), 1500);
                              setActiveMenuMsgId(null);
                            }}
                            className="premium-button"
                            style={{
                              display: 'flex', alignItems: 'center', gap: '8px',
                              padding: '8px 10px', borderRadius: '8px', border: 'none',
                              backgroundColor: 'transparent', color: darkMode ? '#F8FAFC' : '#1E293B',
                              fontSize: '12px', fontWeight: '700', cursor: 'pointer', textAlign: 'left',
                              width: '100%',
                            }}
                          >
                            {copiedMsgId === msg.id ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                            {copiedMsgId === msg.id ? 'Copié !' : 'Copier'}
                          </button>

                          {/* MODIFIER (uniquement pour 'me') */}
                          {isMe && (
                            <button
                              onClick={() => {
                                setEditingMsg({ id: msg.id, text: msg.text || '' });
                                setChatInputText(msg.text || '');
                                setActiveMenuMsgId(null);
                              }}
                              className="premium-button"
                              style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '8px 10px', borderRadius: '8px', border: 'none',
                                backgroundColor: 'transparent', color: darkMode ? '#60A5FA' : '#04265A',
                                fontSize: '12px', fontWeight: '700', cursor: 'pointer', textAlign: 'left',
                                width: '100%',
                              }}
                            >
                              <Edit2 size={14} /> Modifier
                            </button>
                          )}

                          {/* SUPPRIMER (uniquement pour 'me') */}
                          {isMe && (
                            <button
                              onClick={() => {
                                if (handleDeleteMessage) {
                                  handleDeleteMessage(currentChatId, msg.id);
                                }
                                setActiveMenuMsgId(null);
                              }}
                              className="premium-button"
                              style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '8px 10px', borderRadius: '8px', border: 'none',
                                backgroundColor: 'transparent', color: '#EF4444',
                                fontSize: '12px', fontWeight: '700', cursor: 'pointer', textAlign: 'left',
                                width: '100%',
                              }}
                            >
                              <Trash2 size={14} color="#EF4444" /> Supprimer
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* BULLE DE MESSAGE */}
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      backgroundColor: isMe ? (darkMode ? '#60A5FA' : '#04265A') : (darkMode ? 'rgba(15,23,42,0.8)' : '#F1F5F9'),
                      color: isMe ? (darkMode ? '#0F172A' : '#FFF') : (darkMode ? '#F8FAFC' : '#1E293B'),
                      fontWeight: isMe ? '600' : '400',
                      fontSize: '14px',
                      lineHeight: 1.4,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      wordBreak: 'break-word',
                      position: 'relative',
                    }}>
                      <div>{translatedText}</div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '4px',
                        marginTop: '4px',
                        fontSize: '10px',
                        color: isMe ? (darkMode ? 'rgba(15,23,42,0.65)' : 'rgba(255,255,255,0.75)') : (darkMode ? '#94A3B8' : '#64748B'),
                        fontWeight: '600',
                        userSelect: 'none',
                      }}>
                        {msg.edited && (
                          <span style={{ fontSize: '9px', fontStyle: 'italic', opacity: 0.85 }}>
                            ({t('edited') || 'modifié'})
                          </span>
                        )}
                        <span>{formatMsgTime(msg.createdAt || msg.timestamp || msg.id)}</span>
                        {isMe && renderMessageStatus(msg)}
                      </div>
                    </div>
                  </div>

                  {currentLang !== 'FR' && (
                    <button
                      onClick={() => toggleOriginalMessage(msg.id)}
                      className="premium-button"
                      style={{
                        border: 'none', background: 'none', cursor: 'pointer',
                        color: isMe ? (darkMode ? '#60A5FA' : '#04265A') : (darkMode ? '#94A3B8' : '#64748B'),
                        fontSize: '10px', fontWeight: '800', display: 'inline-flex',
                        alignItems: 'center', gap: '3px', marginTop: '3px',
                        padding: '2px 4px'
                      }}
                    >
                      {isMsgOriginal ? t('showTranslation') : t('showOriginal')}
                    </button>
                  )}
                </div>
              );
            })}
            {/* INDICATEUR DE SAISIE EN DIRECT (TYPING INDICATOR ANIMÉ) */}
            {isThemTyping && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '16px 16px 16px 4px',
                backgroundColor: darkMode ? 'rgba(15,23,42,0.92)' : '#F0F9FF',
                border: darkMode ? '1.5px solid rgba(56,189,248,0.45)' : '1.5px solid #0284C7',
                boxShadow: darkMode ? '0 4px 14px rgba(0,0,0,0.3), 0 0 10px rgba(56,189,248,0.15)' : '0 4px 12px rgba(2,132,199,0.12)',
                alignSelf: 'flex-start',
                marginBottom: '4px',
                animation: 'typingFadeIn 0.25s ease-out'
              }}>
                <span style={{ fontSize: '11.5px', fontWeight: '800', color: darkMode ? '#93C5FD' : '#0369A1' }}>
                  {activeChatObj?.user} est en train d'écrire
                </span>
                <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: darkMode ? '#38BDF8' : '#0284C7', display: 'inline-block', animation: 'bounceDot 1.4s infinite ease-in-out', animationDelay: '0s' }} />
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: darkMode ? '#38BDF8' : '#0284C7', display: 'inline-block', animation: 'bounceDot 1.4s infinite ease-in-out', animationDelay: '0.2s' }} />
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: darkMode ? '#38BDF8' : '#0284C7', display: 'inline-block', animation: 'bounceDot 1.4s infinite ease-in-out', animationDelay: '0.4s' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* INPUT SAISIE MESSAGE (AVEC MODE MODIFICATION ÉVENTUEL) */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px', marginTop: 'auto',
            borderTop: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0',
            backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255,255,255,0.95)',
            borderRadius: '16px', padding: '10px',
            boxShadow: '0 -4px 16px rgba(0,0,0,0.04)',
            zIndex: 10
          }}>
            {/* BANDEAU MODE MODIFICATION DU MESSAGE */}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: darkMode ? '#93C5FD' : '#04265A', fontWeight: '700' }}>
                  <Edit2 size={13} />
                  <span>Modification du message</span>
                </div>
                <button
                  onClick={() => { setEditingMsg(null); setChatInputText(''); }}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: darkMode ? '#93C5FD' : '#04265A', display: 'flex', alignItems: 'center' }}
                >
                  <X size={15} />
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
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
                  flex: 1, padding: '12px 16px', borderRadius: '16px',
                  border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB',
                  backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF',
                  color: darkMode ? '#FFF' : '#111827', fontSize: '14px', outline: 'none'
                }}
              />
              <button
                onClick={onSubmitMessage}
                className="premium-button"
                style={{
                  border: 'none', borderRadius: '16px', width: '48px', height: '48px',
                  backgroundColor: darkMode ? '#60A5FA' : '#04265A',
                  color: darkMode ? '#0F172A' : '#FFF', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(4,38,90,0.2)', flexShrink: 0
                }}
              >
                {editingMsg ? <Check size={18} /> : <Send size={18} />}
              </button>
            </div>
          </div>
            </>
          )}
        </div>
      )}

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
