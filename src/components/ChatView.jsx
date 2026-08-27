import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import {
  Send, Phone, Video, Sparkles, Clock, CheckCircle,
  ChevronLeft, Globe, Edit2, Edit3, Trash2, Copy, Check, X,
  AlertTriangle, Users, Coins, Mic, ShieldAlert, ShieldCheck,
  Palette, Briefcase, Plus, FileText, Calendar, Table
} from 'lucide-react';
import { doc, deleteDoc, addDoc, collection, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { subscribeTranslations } from '../utils/translator';
import { analyzeContent } from '../utils/contentModeration';
import VoiceNotePlayer from './VoiceNotePlayer';
import VoiceNoteRecorder from './VoiceNoteRecorder';
import PublicProfileModal from './PublicProfileModal';

// Lazy loading des outils collaboratifs & suites vectorielles lourdes pour préserver les performances et la rapidité du build
const CreateProjectGroupModal = lazy(() => import('./CreateProjectGroupModal'));
const ProjectRewardsModal = lazy(() => import('./ProjectRewardsModal'));
const CollaborativeWhiteboardModal = lazy(() => import('./CollaborativeWhiteboardModal'));
const SharedDocumentModal = lazy(() => import('./SharedDocumentModal'));
const ProjectWorkspaceToolsModal = lazy(() => import('./ProjectWorkspaceToolsModal'));
const CloudOfficeSuiteModal = lazy(() => import('./CloudOfficeSuiteModal'));

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
  joinActiveCall,
  handleAcceptDeal,
  handleDeclineDeal,
  handleReleaseEscrow,
  onCreateProjectGroup,
  onProposeReward,
  onAcceptReward,
  onSendAudioMessage,
  profile,
  setProfile,
  currentLang = 'FR',
  t,
  darkMode = false,
  getChatMessageDisplayContent,
  getListingTitleTranslation,
  formatStatus,
  showingOriginalMessages = {},
  toggleOriginalMessage = () => {},
  isMobile: isMobileProp = undefined,
  presenceMap = {},
  allListings = [],
  onOpenListing = () => {}
}) {
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isProjectRewardsModalOpen, setIsProjectRewardsModalOpen] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [isSharedDocOpen, setIsSharedDocOpen] = useState(false);
  const [activeWhiteboardBoardId, setActiveWhiteboardBoardId] = useState(null);
  const [isWorkspaceToolsOpen, setIsWorkspaceToolsOpen] = useState(false);
  const [isCloudOfficeOpen, setIsCloudOfficeOpen] = useState(false);
  const [officeInitialTab, setOfficeInitialTab] = useState('docs');
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isPublicProfileOpen, setIsPublicProfileOpen] = useState(false);
  const [deletedChatIds, setDeletedChatIds] = useState(() => {
    try {
      const saved = localStorage.getItem('troco_deleted_chats');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (_) {
      return new Set();
    }
  });
  const [confirmDeleteChat, setConfirmDeleteChat] = useState(null);
  const [isDirectTransferOpen, setIsDirectTransferOpen] = useState(false);
  const [directTokensCount, setDirectTokensCount] = useState(1);
  const [transferComment, setTransferComment] = useState('');
  const [isTransferringTokens, setIsTransferringTokens] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isMobileLocal, setIsMobileLocal] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const isMobile = isMobileProp !== undefined ? isMobileProp : isMobileLocal;

  const effectiveSelectedChat = (selectedChat && !deletedChatIds.has(selectedChat.id)) ? selectedChat : null;
  const [mobileSubView, setMobileSubView] = useState(() => (selectedChat && !deletedChatIds.has(selectedChat.id)) ? 'room' : 'list');

  // Transfert direct de Jetons Troco avec débit immédiat et confettis
  const handleExecuteDirectTokenTransfer = async () => {
    const tokens = Number(directTokensCount) || 1;
    if (tokens <= 0) return;
    const currentBalance = Number(profile?.trocoTokens || 0);

    if (currentBalance < tokens) {
      alert(`Solde insuffisant : vous disposez de ${currentBalance} Jeton(s) Troco.`);
      return;
    }

    setIsTransferringTokens(true);
    try {
      const myName = profile?.name || 'Moi';
      const partnerName = effectiveSelectedChat?.user || effectiveSelectedChat?.projectTitle || 'Interlocuteur';
      const updatedTokens = Math.max(0, currentBalance - tokens);

      // 1. Débit immédiat du solde utilisateur dans l'application
      if (typeof setProfile === 'function') {
        setProfile(prev => ({ ...prev, trocoTokens: updatedTokens }));
      }
      try {
        const saved = JSON.parse(localStorage.getItem('troco_user_profile') || '{}');
        saved.trocoTokens = updatedTokens;
        localStorage.setItem('troco_user_profile', JSON.stringify(saved));
      } catch (_) {}

      // 2. Écriture du message de transfert et de la transaction dans Firestore
      if (db && effectiveSelectedChat?.id) {
        const transferText = `🪙 ${myName} a envoyé ${tokens} Jeton${tokens > 1 ? 's' : ''} Troco à ${partnerName}${transferComment ? ` (« ${transferComment} »)` : ''} !`;
        const chatDocId = String(effectiveSelectedChat.id);

        await addDoc(collection(db, 'chats', chatDocId, 'messages'), {
          text: transferText,
          type: 'token_transfer',
          tokenAmount: tokens,
          transferComment: transferComment || '',
          sender: 'me',
          senderName: myName,
          senderAvatar: profile?.avatar || '',
          timestamp: serverTimestamp(),
          createdAt: Date.now(),
        });

        await setDoc(doc(db, 'chats', chatDocId), {
          lastMessage: transferText,
          lastMessageTimestamp: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });

        await addDoc(collection(db, 'transactions'), {
          type: 'token_transfer',
          userId: profile?.uid || 'me',
          userName: myName,
          partnerName: partnerName,
          tokens: tokens,
          comment: transferComment || '',
          createdAt: serverTimestamp(),
        });
      }

      // 3. Déclenchement de l'animation festive
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3800);
      setIsDirectTransferOpen(false);
      setTransferComment('');
      setDirectTokensCount(1);
    } catch (err) {
      console.warn('[DirectTransfer] error:', err);
    } finally {
      setIsTransferringTokens(false);
    }
  };

  // Gestion de l'ouverture d'un outil workspace avec invitation automatique dans la conversation
  const handleOpenWorkspaceTool = async (toolType) => {
    setIsWorkspaceMenuOpen(false);

    const currentBoardId = effectiveSelectedChat?.id ? `board-${effectiveSelectedChat.id}` : 'default_board';

    if (toolType === 'whiteboard') {
      setActiveWhiteboardBoardId(currentBoardId);
      setIsWhiteboardOpen(true);
    } else if (toolType === 'notes') {
      setIsSharedDocOpen(true);
    } else if (toolType === 'docs') {
      setOfficeInitialTab('docs');
      setIsCloudOfficeOpen(true);
    } else if (toolType === 'sheets') {
      setOfficeInitialTab('sheets');
      setIsCloudOfficeOpen(true);
    }

    if (effectiveSelectedChat?.id && db) {
      const toolIcons = {
        whiteboard: '🎨',
        notes: '📝',
        docs: '📄',
        sheets: '📊',
      };
      const toolLabels = {
        whiteboard: 'Tableau Blanc Collaboratif (0ms)',
        notes: 'Notes Partagées (Apple-Style)',
        docs: 'Document Partagé (Troco Docs)',
        sheets: 'Tableur Collaboratif (Troco Sheets)',
      };
      const authorName = profile?.name || 'Moi';
      const text = `${toolIcons[toolType] || '🚀'} ${authorName} a démarré une session ${toolLabels[toolType] || 'Workspace'}`;

      try {
        const chatDocId = String(effectiveSelectedChat.id);
        const msgPayload = {
          text,
          sender: profile?.id || profile?.name || 'me',
          senderName: authorName,
          senderAvatar: profile?.avatar || '',
          timestamp: serverTimestamp(),
          createdAt: Date.now(),
          type: 'workspace_invite',
          kind: 'workspace_invite',
          workspaceType: toolType,
          workspaceTitle: toolLabels[toolType],
        };

        await addDoc(collection(db, 'chats', chatDocId, 'messages'), msgPayload);
        await updateDoc(doc(db, 'chats', chatDocId), {
          lastMessage: text,
          lastMessageTimestamp: serverTimestamp(),
          lastMessageSender: profile?.id || profile?.name || 'me',
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('[ChatView] Send workspace invite notice:', err);
      }
    }
  };

  // Verrouillage du défilement global de la page sur mobile quand la salle de discussion est ouverte
  useEffect(() => {
    if (isMobile && effectiveSelectedChat && mobileSubView === 'room') {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isMobile, effectiveSelectedChat, mobileSubView]);

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

  const currentChatId = effectiveSelectedChat ? effectiveSelectedChat.id : null;
  const activeChatObj = effectiveSelectedChat;
  const messages = useMemo(() => {
    return currentChatId ? (chatThreads[currentChatId] || []) : [];
  }, [currentChatId, chatThreads]);

  // Auto-scroll fiable vers le bas des messages (Mission 3)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [selectedChat, messages, mobileSubView]);

  if (activeTab !== 'chat') return null;

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
        {/* 1. EN-TÊTE FIXE DU CHAT (RIGIDE & NON-SCROLLABLE) */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isMobile ? '8px 12px' : '0 18px',
          paddingTop: isMobile ? 'max(10px, env(safe-area-inset-top, 10px))' : '0',
          paddingBottom: isMobile ? '8px' : '0',
          paddingLeft: isMobile ? 'max(12px, env(safe-area-inset-left, 12px))' : '18px',
          paddingRight: isMobile ? 'max(12px, env(safe-area-inset-right, 12px))' : '18px',
          minHeight: isMobile ? '56px' : '64px',
          height: isMobile ? '56px' : '64px',
          maxHeight: isMobile ? '56px' : '64px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-glass)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          gap: '8px', flexShrink: 0, zIndex: 50, width: '100%', boxSizing: 'border-box'
        }}>
          {/* Partie Gauche : Retour (Mobile) + Avatar + Nom + Annonce (Cliquable vers Profil Public) */}
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

            {/* CONTENEUR CONTACT CLIQUABLE */}
            <div
              onClick={() => {
                if (!activeChatObj?.isGroup) {
                  setIsPublicProfileOpen(true);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: 0,
                flex: 1,
                cursor: !activeChatObj?.isGroup ? 'pointer' : 'default',
                padding: '2px 4px',
                borderRadius: '12px',
                transition: 'background-color 0.15s ease',
              }}
              className={!activeChatObj?.isGroup ? 'hover-subtle' : ''}
              title={!activeChatObj?.isGroup ? `Voir le profil public de ${activeChatObj?.user}` : undefined}
            >
              <div style={{ position: 'relative', width: '36px', height: '36px', flexShrink: 0 }}>
                {activeChatObj?.avatar ? (
                  <img
                    src={activeChatObj.avatar}
                    alt={activeChatObj?.user || 'Avatar'}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid var(--accent-primary)',
                      boxShadow: 'var(--shadow-accent)'
                    }}
                  />
                ) : (
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: activeChatObj?.isGroup ? 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)' : 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: activeChatObj?.isGroup ? '17px' : '14px', boxShadow: 'var(--shadow-accent)' }}>
                    {activeChatObj?.isGroup ? '👥' : (activeChatObj?.user ? activeChatObj.user[0].toUpperCase() : 'T')}
                  </div>
                )}
                {activeChatIsOnline ? (
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
                ) : (
                  <div
                    title="Hors ligne"
                    style={{
                      position: 'absolute', bottom: '0', right: '0',
                      width: '9px', height: '9px', borderRadius: '50%',
                      backgroundColor: 'var(--text-secondary)',
                      opacity: 0.45,
                      border: '2px solid var(--bg-card)'
                    }}
                  />
                )}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontWeight: '800', fontSize: isMobile ? '14px' : '14.5px', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activeChatObj?.isGroup ? (activeChatObj.projectTitle || activeChatObj.user) : activeChatObj?.user}
                  </span>
                  {activeChatObj?.isGroup ? (
                    <span style={{ fontSize: '9px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)', padding: '1px 6px', borderRadius: '6px', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                      🚀 Projet ({activeChatObj.participants?.length || activeChatObj.members?.length || 2}m)
                    </span>
                  ) : (activeChatObj?.isDemo || activeChatObj?.persona || (typeof activeChatObj?.id === 'number' && activeChatObj?.id < 300)) ? (
                    <span style={{ fontSize: '8px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)', padding: '1px 4px', borderRadius: '4px', flexShrink: 0 }}>
                      IA
                    </span>
                  ) : null}
                  {!activeChatObj?.isGroup && (activeChatIsOnline ? (
                    <span style={{ fontSize: '8.5px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-success)', padding: '1px 5px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--accent-success)' }} /> En ligne
                    </span>
                  ) : (
                    <span style={{ fontSize: '8.5px', fontWeight: '700', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', padding: '1px 5px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--text-secondary)', opacity: 0.45 }} /> Hors ligne
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>
                  {activeChatObj?.isGroup
                    ? `${activeChatObj.rewardPool || 15} Jetons Troco alloués • ${activeChatObj.category || 'Collectif'}`
                    : (getListingTitleTranslation ? getListingTitleTranslation(activeChatObj?.listing, currentLang) : activeChatObj?.listing)}
                </div>
              </div>
            </div>
          </div>

          {/* Partie Droite : Actions Appel Audio / Vidéo / Deal ou Rétribution Projet */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {activeChatObj?.isGroup ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {/* BOUTON TABLEAU BLANC COLLABORATIF */}
                <button
                  type="button"
                  onClick={() => setIsWhiteboardOpen(true)}
                  className="premium-button"
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: isMobile ? '50%' : '999px',
                    width: isMobile ? '34px' : 'auto',
                    height: '34px',
                    padding: isMobile ? '0' : '0 11px',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-main)',
                    fontWeight: '700', fontSize: '11px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                  }}
                  title="Ouvrir le Tableau Blanc Collaboratif"
                >
                  <Palette size={14} color="var(--accent-primary)" />
                  {!isMobile && <span>Whiteboard</span>}
                </button>

                {/* BOUTON OUTILS PRO WORKSPACE */}
                <button
                  type="button"
                  onClick={() => setIsWorkspaceToolsOpen(true)}
                  className="premium-button"
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: isMobile ? '50%' : '999px',
                    width: isMobile ? '34px' : 'auto',
                    height: '34px',
                    padding: isMobile ? '0' : '0 11px',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-main)',
                    fontWeight: '700', fontSize: '11px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                  }}
                  title="Outils Pro (Google Drive, Calendar, Remote)"
                >
                  <Briefcase size={14} color="var(--accent-primary)" />
                  {!isMobile && <span>Outils Pro</span>}
                </button>

                {/* BOUTON RÉTRIBUTIONS JETONS */}
                <button
                  type="button"
                  onClick={() => setIsProjectRewardsModalOpen(true)}
                  className="premium-button"
                  style={{
                    border: 'none',
                    borderRadius: isMobile ? '50%' : '999px',
                    width: isMobile ? '34px' : 'auto',
                    height: '34px',
                    padding: isMobile ? '0' : '0 11px',
                    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                    color: '#FFF',
                    fontWeight: '800', fontSize: '11px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    boxShadow: 'var(--shadow-accent)'
                  }}
                  title="Gérer l'équipe et rétribuer les membres en jetons"
                >
                  <Coins size={14} />
                  {!isMobile && <span>💎 Rétributions</span>}
                </button>

                {/* APPELS AUDIO & VISIO DE GROUPE */}
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
              </div>
            ) : (
              <>
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
              </>
            )}
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
              onClick={() => {
                if (typeof joinActiveCall === 'function') {
                  joinActiveCall(activeChatObj.id, activeChatObj.activeCall.type || 'video');
                } else if (typeof startCall === 'function') {
                  startCall(activeChatObj.activeCall.type || 'video');
                }
              }}
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
          style={{
            flex: '1 1 0%',
            minHeight: 0,
            overflowY: 'auto',
            padding: isMobile ? '12px 10px' : '16px 20px',
            backgroundColor: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            overscrollBehavior: 'contain',
            overscrollBehaviorY: 'contain',
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

              // RENDU DES TRANSFERTS DE JETONS INSTANTANÉS (CARD STYLE GOLD TROCO)
              if (msg.type === 'token_transfer' || msg.kind === 'token_transfer') {
                const count = msg.tokenAmount || 1;
                const isMine = Boolean(
                  (msg.senderUid && profile?.uid && msg.senderUid === profile.uid) ||
                  (msg.senderName && profile?.name && msg.senderName.trim().toLowerCase() === profile.name.trim().toLowerCase()) ||
                  (msg.sender === 'me')
                );

                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMine ? 'flex-end' : 'flex-start',
                      width: '100%',
                      margin: '8px 0',
                    }}
                  >
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 18px',
                      borderRadius: '20px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1.5px solid #F59E0B',
                      boxShadow: '0 8px 24px rgba(245, 158, 11, 0.2)',
                      animation: 'fadeSlideUp 0.25s ease',
                    }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Coins size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                          🪙 Transfert de {count} Jeton{count > 1 ? 's' : ''} Troco
                        </div>
                        <div style={{ fontSize: '11px', color: '#F59E0B', fontWeight: '700' }}>
                          {isMine ? `Transféré avec succès à ${activeChatObj?.user || 'votre contact'}` : `Reçu de ${msg.senderName || 'votre contact'} !`} ✓
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // RENDU DES PROPOSITIONS DE DEAL (ALIGNEMENT BILATÉRAL STRICT DROITE / GAUCHE)
              if (msg.type === 'deal' || msg.kind === 'deal') {
                const { terms = {} } = msg;
                const isMine = Boolean(
                  (msg.senderUid && profile?.uid && msg.senderUid === profile.uid) ||
                  (msg.senderName && profile?.name && msg.senderName.trim().toLowerCase() === profile.name.trim().toLowerCase()) ||
                  (msg.sender === 'me')
                );
                const isIncoming = !isMine;
                const currentDealStatus = msg.status || 'pending';
                const isDealPending = (!msg.status || currentDealStatus === 'pending' || currentDealStatus === 'proposed' || currentDealStatus === 'en_attente' || currentDealStatus === 'sent');
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
                        {currentDealStatus === 'escrow_locked' && (
                          <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-success, #10B981)', padding: '3px 8px', borderRadius: '999px', border: '1.5px solid var(--accent-success, #10B981)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            🛡️ Fonds sous Séquestre
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

                      {/* BLOC SÉQUESTRE FINANCIER & LIBÉRATION DES FONDS */}
                      {currentDealStatus === 'escrow_locked' && (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          backgroundColor: 'var(--bg-subtle)',
                          border: '1.5px solid var(--accent-primary)',
                          borderRadius: '14px',
                          padding: '12px 14px',
                          boxShadow: 'var(--shadow-card)',
                          marginTop: '6px',
                          animation: 'fadeSlideUp 0.3s ease'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                            <ShieldCheck size={16} color="var(--accent-success, #10B981)" />
                            <span>Séquestre Financier Troco Sécurisé</span>
                          </div>

                          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                            {((msg.paidBy && profile?.uid && msg.paidBy === profile.uid) ||
                              (msg.escrow?.buyerUid && profile?.uid && msg.escrow.buyerUid === profile.uid) ||
                              (!msg.paidBy && isIncoming))
                              ? `Vos fonds (${Number(terms.euroAmount) > 0 ? `${terms.euroAmount}€` : ''} ${Number(terms.trocoTokens) > 0 ? `${terms.trocoTokens} Jetons` : ''}) sont bloqués en toute sécurité sous séquestre. Cliquez ci-dessous une fois la prestation terminée pour débloquer le versement au prestataire.`
                              : `Le règlement (${Number(terms.euroAmount) > 0 ? `${terms.euroAmount}€` : ''} ${Number(terms.trocoTokens) > 0 ? `${terms.trocoTokens} Jetons` : ''}) est garanti sous séquestre Troco. Les fonds vous seront versés dès confirmation de l'acheteur.`
                            }
                          </div>

                          {((msg.paidBy && profile?.uid && msg.paidBy === profile.uid) ||
                            (msg.escrow?.buyerUid && profile?.uid && msg.escrow.buyerUid === profile.uid) ||
                            (!msg.paidBy && isIncoming)) && (
                            <button
                              type="button"
                              onClick={() => handleReleaseEscrow && handleReleaseEscrow(currentChatId, msg.id, msg.escrow || { terms })}
                              className="premium-button"
                              style={{
                                border: 'none',
                                borderRadius: '12px',
                                padding: '10px 14px',
                                background: 'linear-gradient(135deg, var(--accent-success, #10B981) 0%, #059669 100%)',
                                color: '#FFFFFF',
                                fontSize: '12px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                                marginTop: '4px'
                              }}
                            >
                              <CheckCircle size={15} />
                              <span>Prestation terminée — Libérer les fonds ✓</span>
                            </button>
                          )}
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

              // RENDU DES PROPOSITIONS DE RÉTRIBUTION EN JETONS (HUB DE COLLABORATION)
              if (msg.type === 'reward' || msg.kind === 'reward-proposal') {
                const reward = msg.reward || {};
                const isMine = (msg.senderName && profile?.name)
                  ? (msg.senderName.trim().toLowerCase() === profile.name.trim().toLowerCase())
                  : (msg.sender === 'me');
                const isRewardPending = !reward.status || reward.status === 'pending';
                const isConfirmed = reward.status === 'confirmed' || reward.status === 'validated';

                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMine ? 'flex-end' : 'flex-start',
                      width: '100%',
                      margin: '10px 0',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div style={{
                      width: isMobile ? '94%' : '80%',
                      maxWidth: '520px',
                      border: isConfirmed ? '1.5px solid var(--accent-success)' : '1.5px solid var(--accent-primary)',
                      borderRadius: '20px',
                      padding: isMobile ? '14px' : '18px',
                      backgroundColor: 'var(--bg-card)',
                      boxShadow: 'var(--shadow-card)',
                      boxSizing: 'border-box',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                          <Coins size={16} color="var(--accent-primary)" />
                          💎 Rétribution de Projet Collectif
                        </div>
                        {isRewardPending ? (
                          <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-warning)', padding: '3px 8px', borderRadius: '999px', border: '1px solid var(--accent-warning)' }}>
                            ⏳ En attente de validation
                          </span>
                        ) : (
                          <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-success)', padding: '3px 8px', borderRadius: '999px', border: '1.5px solid var(--accent-success)' }}>
                            ✓ Rétribution Validée & Créditée
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>
                        {reward.title || 'Mission de projet'}
                      </div>

                      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <span style={{
                          backgroundColor: 'var(--bg-subtle)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-main)',
                          borderRadius: '999px', padding: '3px 9px', fontSize: '11px', fontWeight: '800'
                        }}>
                          👤 Bénéficiaire : <strong>{reward.beneficiary}</strong>
                        </span>

                        <span style={{
                          backgroundColor: 'var(--bg-subtle)',
                          border: '1.5px solid var(--accent-primary)',
                          color: 'var(--accent-primary)',
                          borderRadius: '999px', padding: '3px 9px', fontSize: '11px', fontWeight: '900'
                        }}>
                          🪙 {reward.amount} Jetons Troco
                        </span>

                        <span style={{
                          backgroundColor: 'var(--bg-subtle)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-secondary)',
                          borderRadius: '999px', padding: '3px 9px', fontSize: '11px', fontWeight: '700'
                        }}>
                          {reward.type === 'hourly' ? `⏱️ ${reward.hours || 1}h de prestation` : reward.type === 'fixed' ? '💼 Forfait global' : '📌 Tâche validée'}
                        </span>
                      </div>

                      {/* ACTION DE VALIDATION */}
                      {isRewardPending && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (onAcceptReward) {
                                onAcceptReward(currentChatId, msg.id, reward);
                              }
                            }}
                            className="premium-button"
                            style={{
                              flex: 1,
                              border: 'none',
                              background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                              color: '#FFF',
                              borderRadius: '12px',
                              padding: '10px 14px',
                              fontSize: '12px',
                              fontWeight: '800',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              boxShadow: 'var(--shadow-accent)',
                            }}
                          >
                            <Check size={14} strokeWidth={3} /> Valider & Débloquer les jetons ({reward.amount} 💎)
                          </button>
                        </div>
                      )}

                      {isConfirmed && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-success)', borderRadius: '12px', padding: '8px 12px', fontSize: '11.5px', fontWeight: '800' }}>
                          <CheckCircle size={14} /> Les {reward.amount} jetons ont été validés et alloués à {reward.beneficiary}.
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // RENDU DES CARTES D'INVITATION WORKSPACE (TABLEAU BLANC / NOTES / DOCS / SHEETS)
              if (msg.type === 'workspace_invite' || msg.kind === 'workspace_invite') {
                const isMine = (msg.senderName && profile?.name)
                  ? (msg.senderName.trim().toLowerCase() === profile.name.trim().toLowerCase())
                  : (msg.sender === 'me');
                const wType = msg.workspaceType || 'whiteboard';
                const isNotes = wType === 'notes';
                const isDocs = wType === 'docs';
                const isSheets = wType === 'sheets';

                const badgeColor = isNotes ? '#F59E0B' : isDocs ? '#3B82F6' : isSheets ? '#10B981' : 'var(--accent-primary)';
                const icon = isNotes ? <Edit3 size={18} /> : isDocs ? <FileText size={18} /> : isSheets ? <Table size={18} /> : <Palette size={18} />;

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
                    <div
                      style={{
                        width: isMobile ? '92%' : '75%',
                        maxWidth: '460px',
                        border: `1.5px solid ${badgeColor}`,
                        borderRadius: '18px',
                        padding: '14px',
                        backgroundColor: 'var(--bg-card)',
                        boxShadow: 'var(--shadow-card)',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '12px',
                          backgroundColor: `${badgeColor}22`,
                          color: badgeColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {icon}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--text-main)' }}>
                            {msg.workspaceTitle || (isNotes ? 'Notes Partagées (Apple-Style)' : isDocs ? 'Document Troco Docs' : isSheets ? 'Tableur Troco Sheets' : 'Tableau Blanc Collaboratif')}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Lancé par {msg.senderName || (isMine ? 'Vous' : 'Collaborateur')}
                          </div>
                        </div>
                      </div>

                      <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {isNotes
                          ? 'Session de notes synchronisées en direct. Cliquez pour co-rédiger vos comptes-rendus et checklists.'
                          : isDocs
                            ? 'Document Markdown collaboratif en temps réel.'
                            : isSheets
                              ? 'Tableur multijoueur avec calculs et formules instantanées.'
                              : 'Espace de dessin et schémas multijoueur 0ms sans latence.'}
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          if (isNotes) {
                            setIsSharedDocOpen(true);
                          } else if (isDocs) {
                            setOfficeInitialTab('docs');
                            setIsCloudOfficeOpen(true);
                          } else if (isSheets) {
                            setOfficeInitialTab('sheets');
                            setIsCloudOfficeOpen(true);
                          } else {
                            setActiveWhiteboardBoardId(msg.boardId || (effectiveSelectedChat?.id ? `board-${effectiveSelectedChat.id}` : 'default_board'));
                            setIsWhiteboardOpen(true);
                          }
                        }}
                        className="premium-button"
                        style={{
                          width: '100%',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          backgroundColor: badgeColor,
                          color: '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: 'var(--shadow-accent)',
                        }}
                      >
                        <Sparkles size={14} />
                        <span>Rejoindre {isNotes ? 'la Note' : isDocs ? 'le Document' : isSheets ? 'le Tableur' : 'le Tableau Blanc'} en direct</span>
                      </button>
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
                      maxWidth: isMobile ? '90%' : '76%',
                      position: 'relative'
                    }}
                  >
                    <div
                      className="message-bubble"
                      style={{
                        padding: '11px 16px',
                        maxWidth: '100%',
                        width: 'fit-content',
                        minWidth: 0,
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        borderRadius: isMe
                          ? 'min(var(--border-radius-card, 18px), 24px) min(var(--border-radius-card, 18px), 24px) 4px min(var(--border-radius-card, 18px), 24px)'
                          : 'min(var(--border-radius-card, 18px), 24px) min(var(--border-radius-card, 18px), 24px) min(var(--border-radius-card, 18px), 24px) 4px',
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
                        overflowWrap: 'break-word',
                        wordBreak: 'normal',
                        whiteSpace: 'pre-wrap',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      {activeChatObj?.isGroup && !isMe && msg.senderName && (
                        <div style={{ fontSize: '10.5px', fontWeight: '800', color: 'var(--accent-primary)', marginBottom: '2px' }}>
                          {msg.senderName}
                        </div>
                      )}

                      {/* IMAGE OU CAPTURE DE TABLEAU BLANC */}
                      {(msg.imageUrl || msg.type === 'image' || msg.kind === 'image') && (
                        <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '6px', maxWidth: '320px' }}>
                          <img
                            src={msg.imageUrl}
                            alt="Capture tableau blanc"
                            style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)' }}
                          />
                        </div>
                      )}

                      {/* NOTIFICATION DE TRANSFERT DE JETONS */}
                      {msg.type === 'token_transfer' && (
                        <div
                          style={{
                            borderRadius: '16px',
                            padding: '12px 14px',
                            backgroundColor: isMe ? 'rgba(255, 255, 255, 0.18)' : 'rgba(245, 158, 11, 0.12)',
                            border: isMe ? '1px solid rgba(255, 255, 255, 0.4)' : '1.5px solid #F59E0B',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            minWidth: '220px',
                            marginBottom: '4px',
                          }}
                        >
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#F59E0B', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0, boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)' }}>
                            🪙
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: isMe ? '#FFFFFF' : 'var(--text-main)' }}>
                              Transfert de {msg.tokenAmount || 1} Jeton{msg.tokenAmount > 1 ? 's' : ''} Troco
                            </div>
                            <div style={{ fontSize: '11px', color: isMe ? 'rgba(255,255,255,0.9)' : 'var(--text-secondary)' }}>
                              {msg.text || 'Transfert validé immédiatement'}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* INVITATION SESSION WORKSPACE TEMPS RÉEL (WHITEBOARD, DOCS, SHEETS) */}
                      {(msg.type === 'workspace_invite' || msg.kind === 'workspace_invite') ? (
                        <div
                          style={{
                            borderRadius: '16px',
                            padding: '12px 14px',
                            backgroundColor: isMe ? 'rgba(255, 255, 255, 0.15)' : 'var(--bg-subtle)',
                            border: isMe ? '1px solid rgba(255, 255, 255, 0.3)' : '1.5px solid var(--accent-primary)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            maxWidth: '300px',
                            boxSizing: 'border-box',
                            marginBottom: '4px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                backgroundColor: msg.workspaceType === 'sheets'
                                  ? 'rgba(16, 185, 129, 0.2)'
                                  : msg.workspaceType === 'docs'
                                  ? 'rgba(59, 130, 246, 0.2)'
                                  : msg.workspaceType === 'notes'
                                  ? 'rgba(245, 158, 11, 0.2)'
                                  : 'rgba(198, 125, 91, 0.2)',
                                color: msg.workspaceType === 'sheets'
                                  ? '#10B981'
                                  : msg.workspaceType === 'docs'
                                  ? '#3B82F6'
                                  : msg.workspaceType === 'notes'
                                  ? '#F59E0B'
                                  : 'var(--accent-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {msg.workspaceType === 'sheets' ? (
                                <Table size={18} />
                              ) : msg.workspaceType === 'docs' ? (
                                <FileText size={18} />
                              ) : msg.workspaceType === 'notes' ? (
                                <FileText size={18} />
                              ) : (
                                <Palette size={18} />
                              )}
                            </div>

                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '13px', fontWeight: '800', color: isMe ? '#FFFFFF' : 'var(--text-main)' }}>
                                  {msg.workspaceTitle || (msg.workspaceType === 'sheets' ? 'Troco Sheets' : msg.workspaceType === 'docs' ? 'Troco Docs' : msg.workspaceType === 'notes' ? 'Notes Partagées' : 'Tableau Blanc')}
                                </span>
                                {msg.version && (
                                  <span
                                    style={{
                                      backgroundColor: isMe ? 'rgba(255,255,255,0.25)' : 'rgba(198,125,91,0.2)',
                                      color: isMe ? '#FFFFFF' : 'var(--accent-primary)',
                                      fontSize: '10.5px',
                                      fontWeight: '800',
                                      padding: '1px 6px',
                                      borderRadius: '6px',
                                    }}
                                  >
                                    {msg.version}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '10.5px', color: isMe ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block', animation: 'pulse 1.8s infinite' }} />
                                <span>Session active en direct</span>
                              </div>
                            </div>
                          </div>

                          {msg.previewUrl && (
                            <div
                              style={{
                                width: '100%',
                                height: '110px',
                                borderRadius: '10px',
                                overflow: 'hidden',
                                backgroundColor: 'rgba(0,0,0,0.1)',
                                border: '1px solid rgba(255,255,255,0.1)',
                              }}
                            >
                              <img
                                src={msg.previewUrl}
                                alt="Aperçu du Whiteboard"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </div>
                          )}

                          <div style={{ fontSize: '12px', color: isMe ? '#FFFFFF' : 'var(--text-main)', lineHeight: 1.4 }}>
                            {msg.text}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (msg.workspaceType === 'whiteboard') {
                                if (msg.boardId) setActiveWhiteboardBoardId(msg.boardId);
                                setIsWhiteboardOpen(true);
                              } else if (msg.workspaceType === 'notes') {
                                setIsSharedDocOpen(true);
                              } else {
                                setOfficeInitialTab(msg.workspaceType === 'sheets' ? 'sheets' : (msg.workspaceType === 'slides' ? 'slides' : 'docs'));
                                setIsCloudOfficeOpen(true);
                              }
                            }}
                            className="premium-button"
                            style={{
                              border: 'none',
                              background: isMe
                                ? '#FFFFFF'
                                : 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                              color: isMe ? 'var(--accent-primary)' : '#FFFFFF',
                              borderRadius: '10px',
                              padding: '8px 12px',
                              fontSize: '12px',
                              fontWeight: '800',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              boxShadow: 'var(--shadow-card)',
                              transition: 'transform 0.15s ease',
                            }}
                          >
                            <Users size={14} />
                            <span>Rejoindre la session en direct</span>
                          </button>
                        </div>
                      ) : (msg.type === 'audio' || msg.kind === 'audio' || msg.audioUrl) ? (
                        <div style={{ width: '100%', maxWidth: '260px', minWidth: 0, boxSizing: 'border-box', overflow: 'hidden' }}>
                          <VoiceNotePlayer
                            audioUrl={msg.audioUrl}
                            duration={msg.duration}
                            isMe={isMe}
                            currentLang={currentLang}
                            transcription={msg.transcription || null}
                          />
                        </div>
                      ) : (
                        <>
                          {!isMe && msg.text && (() => {
                            const analysis = analyzeContent(msg.text);
                            if (analysis.alertLevel === 'high' || analysis.score >= 35) {
                              return (
                                <div style={{
                                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                  border: '1px solid rgba(239, 68, 68, 0.4)',
                                  borderRadius: '8px',
                                  padding: '6px 8px',
                                  marginBottom: '6px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '2px',
                                  fontSize: '11px',
                                  color: 'var(--accent-danger, #EF4444)',
                                  textAlign: 'left',
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '800' }}>
                                    <ShieldAlert size={12} />
                                    <span>Alerte Sécurité IA Anti-Arnaque</span>
                                  </div>
                                  <span style={{ fontSize: '10px', opacity: 0.9 }}>
                                    {analysis.reasons[0] || 'Lien ou méthode de paiement suspecte détectée. Ne communiquez jamais vos coordonnées bancaires hors de Troco.'}
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          })()}

                          <div style={{ fontSize: '13.5px', lineHeight: 1.45, fontWeight: '500' }}>
                            {translatedText}
                          </div>

                          {/* BASCULE DE TRADUCTION INSTANTANÉE */}
                          {currentLang !== 'FR' && (
                            <button
                              type="button"
                              onClick={() => toggleOriginalMessage(msg.id)}
                              style={{
                                alignSelf: isMe ? 'flex-end' : 'flex-start',
                                border: 'none',
                                background: isMe ? 'rgba(255, 255, 255, 0.15)' : 'var(--bg-subtle)',
                                color: isMe ? '#FFFFFF' : 'var(--accent-primary)',
                                fontSize: '9.5px',
                                fontWeight: '800',
                                padding: '2px 6px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                marginTop: '2px',
                              }}
                              title="Basculer entre la traduction et le texte original"
                            >
                              <Globe size={10} />
                              <span>{isMsgOriginal ? 'Afficher traduction' : `Traduit (${currentLang}) • Original`}</span>
                            </button>
                          )}
                        </>
                      )}

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

        {/* 3. BARRE DE SAISIE FIXE EN BAS (ANCRÉE AU-DESSUS DE LA ZONE DE GESTES) */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '6px',
          padding: isMobile ? '8px 12px' : '8px 16px',
          paddingBottom: isMobile ? 'max(10px, env(safe-area-inset-bottom, 10px))' : '10px',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-glass)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          flexShrink: 0, zIndex: 50, width: '100%', boxSizing: 'border-box'
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

            {isRecordingAudio ? (
              <VoiceNoteRecorder
                isRecording={isRecordingAudio}
                onCancel={() => setIsRecordingAudio(false)}
                onSendVoiceNote={async (blob, dur) => {
                  if (onSendAudioMessage) {
                    await onSendAudioMessage(blob, dur);
                  }
                  setIsRecordingAudio(false);
                }}
              />
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
                {/* BOUTON "➕" MENU PREMIUM WORKSPACE */}
                {!editingMsg && (
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => setIsWorkspaceMenuOpen(prev => !prev)}
                      className="premium-button"
                      style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: '50%',
                        width: '42px',
                        height: '42px',
                        backgroundColor: isWorkspaceMenuOpen ? 'var(--accent-primary)' : 'var(--bg-card)',
                        color: isWorkspaceMenuOpen ? '#FFFFFF' : 'var(--accent-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'var(--shadow-card)',
                        flexShrink: 0,
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        transform: isWorkspaceMenuOpen ? 'rotate(45deg)' : 'none',
                      }}
                      title="Outils Collaboratifs & Workspace Premium"
                    >
                      <Plus size={20} />
                    </button>

                    {/* POPOVER MENU WORKSPACE PREMIUM */}
                    {isWorkspaceMenuOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          bottom: '52px',
                          left: 0,
                          backgroundColor: 'var(--bg-card)',
                          borderRadius: '20px',
                          padding: '12px',
                          boxShadow: 'var(--shadow-modal)',
                          border: '1px solid var(--border-color)',
                          width: '280px',
                          zIndex: 100,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          animation: 'fadeSlideUp 0.2s ease-out both',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', borderBottom: '1px solid var(--border-color)', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                            <Sparkles size={13} />
                            <span>WORKSPACE PREMIUM</span>
                          </div>
                          <span style={{ fontSize: '9px', fontWeight: '800', backgroundColor: 'rgba(198, 125, 91, 0.15)', color: 'var(--accent-primary)', padding: '2px 6px', borderRadius: '999px' }}>
                            PRO
                          </span>
                        </div>

                        {/* 1. TABLEAU BLANC COLLABORATIF MULTIJOUEUR */}
                        <button
                          type="button"
                          onClick={() => handleOpenWorkspaceTool('whiteboard')}
                          className="hover-subtle"
                          style={{
                            border: 'none',
                            backgroundColor: 'transparent',
                            borderRadius: '12px',
                            padding: '8px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: 'rgba(198, 125, 91, 0.15)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Palette size={16} />
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>Tableau Blanc</span>
                              <span style={{ fontSize: '9px', fontWeight: '800', color: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '1px 5px', borderRadius: '4px' }}>0ms</span>
                            </div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Moteur de brosses Apple & dessin direct</div>
                          </div>
                        </button>

                        {/* 2. NOTES PARTAGÉES (RICH TEXT STYLE APPLE NOTES) */}
                        <button
                          type="button"
                          onClick={() => handleOpenWorkspaceTool('notes')}
                          className="hover-subtle"
                          style={{
                            border: 'none',
                            backgroundColor: 'transparent',
                            borderRadius: '12px',
                            padding: '8px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Edit3 size={16} />
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>Notes Partagées</span>
                              <span style={{ fontSize: '9px', fontWeight: '800', color: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.15)', padding: '1px 5px', borderRadius: '4px' }}>NOTES</span>
                            </div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Notes de session & checklist Apple-Style</div>
                          </div>
                        </button>

                        {/* 3. TROCO DOCS (ALTERNATIVE NOTION / WORD OPEN-SOURCE) */}
                        <button
                          type="button"
                          onClick={() => handleOpenWorkspaceTool('docs')}
                          className="hover-subtle"
                          style={{
                            border: 'none',
                            backgroundColor: 'transparent',
                            borderRadius: '12px',
                            padding: '8px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <FileText size={16} />
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>Troco Docs</span>
                              <span style={{ fontSize: '9px', fontWeight: '800', color: '#3B82F6', backgroundColor: 'rgba(59, 130, 246, 0.15)', padding: '1px 5px', borderRadius: '4px' }}>DOCS</span>
                            </div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Éditeur texte Markdown collaboratif</div>
                          </div>
                        </button>

                        {/* 3. TROCO SHEETS (ALTERNATIVE EXCEL OPEN-SOURCE) */}
                        <button
                          type="button"
                          onClick={() => handleOpenWorkspaceTool('sheets')}
                          className="hover-subtle"
                          style={{
                            border: 'none',
                            backgroundColor: 'transparent',
                            borderRadius: '12px',
                            padding: '8px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Table size={16} />
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>Troco Sheets</span>
                              <span style={{ fontSize: '9px', fontWeight: '800', color: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '1px 5px', borderRadius: '4px' }}>SHEETS</span>
                            </div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Tableur & formules en temps réel</div>
                          </div>
                        </button>

                        {/* 4. CALENDRIER & RÉUNIONS */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsWorkspaceMenuOpen(false);
                            setIsWorkspaceToolsOpen(true);
                          }}
                          className="hover-subtle"
                          style={{
                            border: 'none',
                            backgroundColor: 'transparent',
                            borderRadius: '12px',
                            padding: '8px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: 'rgba(234, 67, 53, 0.15)', color: '#EA4335', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Calendar size={16} />
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-main)' }}>Planning & Visios HD</div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Calendrier de projet & réunions</div>
                          </div>
                        </button>

                        {/* 5. GESTION DES RÉCOMPENSES JETONS (SI GROUPE PROJET) */}
                        {activeChatObj?.isGroup && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsWorkspaceMenuOpen(false);
                              setIsProjectRewardsModalOpen(true);
                            }}
                            className="hover-subtle"
                            style={{
                              border: 'none',
                              backgroundColor: 'transparent',
                              borderRadius: '12px',
                              padding: '8px 10px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              cursor: 'pointer',
                              textAlign: 'left',
                              width: '100%',
                              transition: 'background-color 0.15s ease',
                            }}
                          >
                            <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Coins size={16} />
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-main)' }}>Rétribution en Jetons</div>
                              <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Attribuer les gains du projet</div>
                            </div>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

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

                {/* BOUTON TRANSFERT DIRECT DE JETONS (🪙) */}
                {!editingMsg && (
                  <button
                    type="button"
                    onClick={() => setIsDirectTransferOpen(true)}
                    className="premium-button"
                    style={{
                      border: '1.5px solid #F59E0B',
                      borderRadius: '50%',
                      width: '42px',
                      height: '42px',
                      backgroundColor: 'rgba(245, 158, 11, 0.12)',
                      color: '#F59E0B',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)',
                      flexShrink: 0,
                      transition: 'transform 0.15s ease',
                    }}
                    title="Transférer des Jetons Troco instantanément"
                  >
                    <Coins size={18} />
                  </button>
                )}

                {/* BOUTON MICROPHONE / MESSAGE VOCAL */}
                {!editingMsg && (
                  <button
                    type="button"
                    onClick={() => setIsRecordingAudio(true)}
                    className="premium-button"
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: '50%',
                      width: '42px',
                      height: '42px',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--accent-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'var(--shadow-card)',
                      flexShrink: 0,
                    }}
                    title="Enregistrer une note vocale"
                  >
                    <Mic size={18} />
                  </button>
                )}

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
            )}
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
          height: '100%',
          minHeight: 0,
          maxHeight: '100%',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : (effectiveSelectedChat ? '320px minmax(0, 1fr)' : '1fr'),
          gap: isMobile ? '0' : (effectiveSelectedChat ? '16px' : '0'),
          maxWidth: (!isMobile && !effectiveSelectedChat) ? '800px' : '100%',
          margin: '0 auto',
          width: '100%',
          height: '100%',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          boxSizing: 'border-box'
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: 'var(--text-main)' }}>
                    {t('discussions') || 'Discussions'}
                  </h3>
                  <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)', padding: '3px 8px', borderRadius: '999px', border: '1px solid var(--border-color)' }}>
                    {visibleChats.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateGroupModalOpen(true)}
                  className="premium-button"
                  style={{
                    border: 'none',
                    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                    color: '#FFFFFF',
                    borderRadius: '12px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: 'var(--shadow-accent)'
                  }}
                  title="Lancer un projet collaboratif multi-membres"
                >
                  <Users size={13} /> + Projet
                </button>
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
                          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: chat.isGroup ? 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)' : 'linear-gradient(135deg, var(--text-main) 0%, var(--text-secondary) 100%)', color: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: chat.isGroup ? '18px' : '15px', flexShrink: 0, boxShadow: 'var(--shadow-card)', position: 'relative' }}>
                            {chat.isGroup ? '👥' : (chat.user ? chat.user[0].toUpperCase() : 'T')}
                            {isUserOnline(chat.user, chat.authorUid || chat.userId) ? (
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
                            ) : (
                              <span
                                title="Hors ligne"
                                style={{
                                  position: 'absolute', bottom: '0', right: '0',
                                  width: '10px', height: '10px',
                                  backgroundColor: 'var(--text-secondary)',
                                  opacity: 0.4,
                                  borderRadius: '50%', border: '2px solid var(--bg-card)'
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
                                {chat.isGroup ? (chat.projectTitle || chat.user) : chat.user}
                                {chat.isGroup ? (
                                  <span style={{ fontSize: '9px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)', padding: '1px 6px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                    🚀 Hub ({chat.participants?.length || chat.members?.length || 2}m)
                                  </span>
                                ) : (chat.isDemo || chat.persona || (typeof chat.id === 'number' && chat.id < 300)) ? (
                                  <span style={{ fontSize: '9px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', padding: '1px 6px', borderRadius: '6px' }}>
                                    🤖 IA
                                  </span>
                                ) : null}
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

          {/* SALLE DE CONVERSATION (DESKTOP DANS LA GRILLE) */}
          {!isMobile && effectiveSelectedChat && (
            <div style={{
              position: 'relative',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              height: '100%',
              width: '100%',
              zIndex: 1,
              backgroundColor: 'var(--bg-card)',
              borderRadius: '24px',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              minWidth: 0,
              boxSizing: 'border-box'
            }}>
              {renderChatRoom()}
            </div>
          )}
        </div>
      </div>

      {/* SALLE DE CONVERSATION MOBILE (PORTAL DÉTACHÉ DIRECTEMENT SUR BODY 100dvh) */}
      {isMobile && effectiveSelectedChat && mobileSubView === 'room' && createPortal(
        <div
          className="mobile-chat-fullscreen-room"
          style={{
            position: 'fixed',
            inset: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100dvh',
            maxHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 1000,
            backgroundColor: 'var(--bg-global)',
            boxSizing: 'border-box',
          }}
        >
          {renderChatRoom()}
        </div>,
        document.body
      )}

      {/* MODALE CRÉATION GROUPE / HUB DE PROJET (LAZY LOADED) */}
      {isCreateGroupModalOpen && (
        <Suspense fallback={null}>
          <CreateProjectGroupModal
            isOpen={isCreateGroupModalOpen}
            onClose={() => setIsCreateGroupModalOpen(false)}
            onCreateGroup={(groupData) => {
              if (onCreateProjectGroup) {
                onCreateProjectGroup(groupData);
              }
            }}
            profile={profile}
            currentLang={currentLang}
          />
        </Suspense>
      )}

      {/* MODALE GESTION ÉQUIPE & RÉTRIBUTION EN JETONS (LAZY LOADED) */}
      {isProjectRewardsModalOpen && activeChatObj && activeChatObj.isGroup && (
        <Suspense fallback={null}>
          <ProjectRewardsModal
            isOpen={isProjectRewardsModalOpen}
            onClose={() => setIsProjectRewardsModalOpen(false)}
            activeChat={activeChatObj}
            onProposeReward={(rewardData) => {
              if (onProposeReward) {
                onProposeReward(activeChatObj.id, rewardData);
              }
            }}
            profile={profile}
            currentLang={currentLang}
          />
        </Suspense>
      )}

      {/* MODALE TABLEAU BLANC COLLABORATIF 100% CANVAS (LAZY LOADED) */}
      {isWhiteboardOpen && activeChatObj && (
        <Suspense fallback={null}>
          <CollaborativeWhiteboardModal
            isOpen={isWhiteboardOpen}
            onClose={() => setIsWhiteboardOpen(false)}
            groupId={activeChatObj.id || activeChatObj.firestoreId || 'group_whiteboard'}
            boardId={activeWhiteboardBoardId || (activeChatObj.id ? `board-${activeChatObj.id}` : 'default_board')}
            projectTitle={activeChatObj.projectTitle || activeChatObj.user || 'Tableau Blanc Collaboratif'}
            currentUser={profile}
            darkMode={darkMode}
            onSendToChat={(sentBoardId, version) => {
              if (setChatInputText) setChatInputText('');
            }}
          />
        </Suspense>
      )}

      {/* MODALE NOTES PARTAGÉES COLLABORATIVES APPLE-STYLE (LAZY LOADED) */}
      {isSharedDocOpen && activeChatObj && (
        <Suspense fallback={null}>
          <SharedDocumentModal
            isOpen={isSharedDocOpen}
            onClose={() => setIsSharedDocOpen(false)}
            groupId={activeChatObj.id || activeChatObj.firestoreId || 'group_notes'}
            docId={activeChatObj.id ? `doc-${activeChatObj.id}` : 'default_shared_doc'}
            projectTitle={activeChatObj.projectTitle || activeChatObj.user || 'Notes Partagées'}
            currentUser={profile}
            darkMode={darkMode}
            onSendToChat={(sentDocId) => {
              if (setChatInputText) setChatInputText('');
            }}
          />
        </Suspense>
      )}

      {/* MODALE SUITE OFFICE CLOUD & DOCS (LAZY LOADED) */}
      {isCloudOfficeOpen && activeChatObj && (
        <Suspense fallback={null}>
          <CloudOfficeSuiteModal
            isOpen={isCloudOfficeOpen}
            onClose={() => setIsCloudOfficeOpen(false)}
            groupId={activeChatObj.id || activeChatObj.firestoreId || 'group_office'}
            projectTitle={activeChatObj.projectTitle || activeChatObj.user || 'Suite Office Cloud'}
            currentUser={profile}
            darkMode={darkMode}
            initialTab={officeInitialTab}
          />
        </Suspense>
      )}

      {/* MODALE OUTILS PRO WORKSPACE (DRIVE, CALENDAR, REMOTE) (LAZY LOADED) */}
      {isWorkspaceToolsOpen && activeChatObj && (
        <Suspense fallback={null}>
          <ProjectWorkspaceToolsModal
            isOpen={isWorkspaceToolsOpen}
            onClose={() => setIsWorkspaceToolsOpen(false)}
            projectTitle={activeChatObj.projectTitle || activeChatObj.user || 'Projet Collaboratif'}
            groupId={activeChatObj.id || activeChatObj.firestoreId || 'group_workspace'}
            onStartVideoCall={() => startCall('video')}
            onStartScreenShare={() => startCall('video')}
            darkMode={darkMode}
          />
        </Suspense>
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

      {/* MODALE DE TRANSFERT DIRECT DE JETONS (🪙) */}
      {isDirectTransferOpen && activeChatObj && (
        <div
          onClick={() => setIsDirectTransferOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)',
              borderRadius: '24px',
              padding: '24px',
              maxWidth: '380px',
              width: '100%',
              boxShadow: 'var(--shadow-modal)',
              border: '1px solid var(--border-color)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              animation: 'scaleUp 0.2s ease',
            }}
          >
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: '0 8px 24px rgba(245, 158, 11, 0.25)' }}>
              <Coins size={28} />
            </div>

            <div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '800' }}>
                Transférer des Jetons Troco
              </h3>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Envoyez instantanément des Jetons Troco à <strong>{activeChatObj.user || 'votre contact'}</strong>.
              </p>
            </div>

            {/* SÉLECTEUR RAPIDE DE JETONS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {[1, 2, 5, 10].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setDirectTokensCount(amt)}
                  style={{
                    padding: '10px 4px',
                    borderRadius: '12px',
                    border: directTokensCount === amt ? '2px solid #F59E0B' : '1px solid var(--border-color)',
                    backgroundColor: directTokensCount === amt ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-subtle)',
                    color: directTokensCount === amt ? '#F59E0B' : 'var(--text-main)',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  +{amt} 🪙
                </button>
              ))}
            </div>

            {/* INPUT MONTANT PERSONNALISÉ */}
            <div>
              <input
                type="number"
                min="1"
                max="100"
                value={directTokensCount}
                onChange={(e) => setDirectTokensCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '15px',
                  fontWeight: '800',
                  textAlign: 'center',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* BOUTONS D'ACTION */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setIsDirectTransferOpen(false)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={isTransferringTokens || (profile?.trocoTokens || 0) < directTokensCount}
                onClick={handleExecuteDirectTokenTransfer}
                className="premium-button"
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  color: '#FFFFFF',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: (isTransferringTokens || (profile?.trocoTokens || 0) < directTokensCount) ? 'not-allowed' : 'pointer',
                  opacity: (profile?.trocoTokens || 0) < directTokensCount ? 0.5 : 1,
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
                }}
              >
                {isTransferringTokens ? 'Transfert...' : `Envoyer ${directTokensCount} 🪙`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ANIMATION FESTIVE DE CONFETTIS LORS DES DEALS ET TRANSFERTS */}
      {showConfetti && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 100060,
            overflow: 'hidden',
          }}
        >
          {Array.from({ length: 45 }).map((_, i) => {
            const randomLeft = Math.random() * 100;
            const randomDelay = Math.random() * 0.8;
            const randomDuration = 1.8 + Math.random() * 1.5;
            const randomSize = 8 + Math.random() * 8;
            const colors = ['#C67D5B', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: '-20px',
                  left: `${randomLeft}%`,
                  width: `${randomSize}px`,
                  height: `${randomSize * 0.6}px`,
                  backgroundColor: randomColor,
                  borderRadius: '2px',
                  transform: `rotate(${Math.random() * 360}deg)`,
                  animation: `fall ${randomDuration}s cubic-bezier(0.25, 1, 0.5, 1) ${randomDelay}s forwards`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* MODALE PROFIL PUBLIC ACCESSIBLE DEPUIS LE CHAT */}
      {isPublicProfileOpen && activeChatObj && (
        <PublicProfileModal
          isOpen={isPublicProfileOpen}
          onClose={() => setIsPublicProfileOpen(false)}
          targetUser={activeChatObj}
          allListings={allListings}
          onOpenListing={onOpenListing}
          currentLang={currentLang}
          darkMode={darkMode}
          t={t}
        />
      )}
    </>
  );
}

export default React.memo(ChatView);

