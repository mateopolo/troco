import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import Portal from './ui/Portal';
import {
  Send, Phone, Video, Sparkles, Clock, CheckCircle,
  ChevronLeft, Globe, Edit2, Edit3, Trash2, Copy, Check, X,
  AlertTriangle, Users, Coins, Mic, ShieldAlert, ShieldCheck,
  Palette, Briefcase, Plus, FileText, Calendar, Table,
  MessageSquareDashed, RefreshCw, MessageSquare, Search, Pin
} from 'lucide-react';
import { doc, deleteDoc, addDoc, collection, updateDoc, serverTimestamp, query, where, getDocs, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { executeDirectTokenTransfer } from '../services/firestoreService';
import { subscribeTranslations } from '../utils/translator';
import { analyzeContent } from '../utils/contentModeration';
import VoiceNotePlayer from './VoiceNotePlayer';
import VoiceNoteRecorder from './VoiceNoteRecorder';
import PublicProfileModal from './PublicProfileModal';
import WorkspaceMessageCard from '../features/workspace/WorkspaceMessageCard';
import { hapticLight, hapticSuccess, hapticError } from '../utils/haptics';
import { EmptyState } from './ui/EmptyState';
import { playPop, playSwoosh, playSuccessChime } from '../services/audioService';
import SwipeableChatItem from './SwipeableChatItem';
import ChatInputBar from './chat/ChatInputBar';

// Lazy loading des outils collaboratifs & suites vectorielles lourdes pour préserver les performances et la rapidité du build
const CreateProjectGroupModal = lazy(() => import('./CreateProjectGroupModal'));
const ProjectRewardsModal = lazy(() => import('./ProjectRewardsModal'));
const CollaborativeWhiteboard = lazy(() => import('../features/workspace/CollaborativeWhiteboard'));
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
  handleRetryMessage,
  handleEditMessage,
  handleDeleteMessage,
  openCounterOffer,
  startCall,
  joinActiveCall,
  handleAcceptDeal,
  onAcceptDeal,
  handleDeclineDeal,
  handleSendToken: handleSendTokenProp,
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
  onOpenListing = () => {},
  messagesContainerRef: externalMessagesContainerRef = null,
}) {
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isProjectRewardsModalOpen, setIsProjectRewardsModalOpen] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [isWhiteboardPickerOpen, setIsWhiteboardPickerOpen] = useState(false);
  const [isSharedDocOpen, setIsSharedDocOpen] = useState(false);
  const [activeSharedDocId, setActiveSharedDocId] = useState(null);
  const [activeWhiteboardBoardId, setActiveWhiteboardBoardId] = useState(null);
  const [activeWhiteboardVersion, setActiveWhiteboardVersion] = useState(null);
  const [whiteboardInitialView, setWhiteboardInitialView] = useState('lobby');
  const [firestoreRecentBoards, setFirestoreRecentBoards] = useState([]);
  const [isWorkspaceToolsOpen, setIsWorkspaceToolsOpen] = useState(false);
  const [isCloudOfficeOpen, setIsCloudOfficeOpen] = useState(false);
  const [activeOfficeDocId, setActiveOfficeDocId] = useState(null);
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

  // 🚨 PHASE 53 : ÉPINGLAGE & SUPPRESSION RAPIDE (SWIPE-TO-ACTION)
  const [pinnedChatIds, setPinnedChatIds] = useState(() => {
    try {
      const saved = localStorage.getItem('troco_pinned_chats');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (_) {
      return new Set();
    }
  });

  const togglePinChat = useCallback((chat) => {
    if (!chat || !chat.id) return;
    setPinnedChatIds(prev => {
      const next = new Set(prev);
      if (next.has(chat.id)) {
        next.delete(chat.id);
      } else {
        next.add(chat.id);
      }
      try {
        localStorage.setItem('troco_pinned_chats', JSON.stringify([...next]));
      } catch (_) {}
      return next;
    });
  }, []);

  const handleDeleteChat = useCallback(async (chatId, chatObj = null) => {
    if (!chatId) return;
    setDeletedChatIds(prev => {
      const next = new Set(prev);
      next.add(chatId);
      next.add(String(chatId));
      try {
        localStorage.setItem('troco_deleted_chats', JSON.stringify([...next]));
      } catch (_) {}
      return next;
    });
    if (selectedChat && (String(selectedChat.id) === String(chatId) || selectedChat.id === chatId)) {
      if (setSelectedChat) setSelectedChat(null);
      setMobileSubView('list');
    }
    try {
      const firestoreId = chatObj?.firestoreId || (typeof chatId === 'string' ? chatId : null);
      const myUid = profile?.uid || (auth?.currentUser && auth.currentUser.uid);
      if (firestoreId && db && myUid) {
        await updateDoc(doc(db, 'chats', firestoreId), {
          deletedBy: arrayUnion(myUid),
        });
      }
    } catch (err) {
      console.warn('[Firestore] Chat soft delete error:', err);
    }
  }, [selectedChat, setSelectedChat, profile?.uid]);

  const [confirmDeleteChat, setConfirmDeleteChat] = useState(null);

  const [isDirectTransferOpen, setIsDirectTransferOpen] = useState(false);
  const [directTokensCount, setDirectTokensCount] = useState(1);
  const [transferComment, setTransferComment] = useState('');
  const [isTransferringTokens, setIsTransferringTokens] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isMobileLocal, setIsMobileLocal] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const isMobile = isMobileProp !== undefined ? isMobileProp : isMobileLocal;

  const effectiveSelectedChat = (selectedChat && !deletedChatIds.has(selectedChat.id)) ? selectedChat : null;
  const activeChatObj = effectiveSelectedChat;
  const [mobileSubView, setMobileSubView] = useState(() => (selectedChat && !deletedChatIds.has(selectedChat.id)) ? 'room' : 'list');

  const openWhiteboard = useCallback((boardId = null, version = null, initialView = null) => {
    setActiveWhiteboardBoardId(boardId);
    setActiveWhiteboardVersion(version);
    setWhiteboardInitialView(initialView || (boardId ? 'canvas' : 'lobby'));
    setIsWhiteboardOpen(true);
  }, []);

  // Transfert direct de Jetons Troco avec débit immédiat et confettis
  const handleExecuteDirectTokenTransfer = async () => {
    const tokens = Number(directTokensCount) || 1;
    if (tokens <= 0) return;
    const currentBalance = Number(profile?.trocoTokens || 0);

    if (currentBalance < tokens) {
      alert(`Solde insuffisant : vous disposez de ${currentBalance} Jeton(s) Troco.`);
      return;
    }

    if (typeof handleSendTokenProp === 'function') {
      const cid = activeChatObj?.id ? String(activeChatObj.id) : (selectedChat?.id ? String(selectedChat.id) : null);
      setIsTransferringTokens(true);
      try {
        const res = await handleSendTokenProp(cid, tokens, transferComment || '');
        if (res?.success) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3800);
          setIsDirectTransferOpen(false);
          setTransferComment('');
          setDirectTokensCount(1);
          return;
        }
      } catch (err) {
        console.warn('[DirectTransfer] via handleSendTokenProp error:', err);
      } finally {
        setIsTransferringTokens(false);
      }
    }

    const myUid = profile?.uid || auth?.currentUser?.uid || 'me';
    const myName = profile?.name || 'Moi';

    // Résolution infaillible de l'UID destinataire
    let partnerUid = null;
    const participantsList = activeChatObj?.participants || selectedChat?.participants;
    if (Array.isArray(participantsList) && participantsList.length > 0) {
      partnerUid = participantsList.find(uid => uid && uid !== myUid && uid !== myName) || null;
    }
    if (!partnerUid && Array.isArray(activeChatObj?.participantUids || selectedChat?.participantUids)) {
      const uids = activeChatObj?.participantUids || selectedChat?.participantUids;
      partnerUid = uids.find(u => u && u !== myUid) || null;
    }
    if (!partnerUid) {
      partnerUid = activeChatObj?.authorUid || activeChatObj?.partnerUid || activeChatObj?.userId
        || activeChatObj?.sellerUid || activeChatObj?.buyerUid || activeChatObj?.recipientUid
        || activeChatObj?.peerUid || selectedChat?.authorUid || selectedChat?.partnerUid || null;
      if (partnerUid === myUid) partnerUid = null;
    }

    const partnerName = activeChatObj?.user || selectedChat?.user || activeChatObj?.projectTitle || 'Interlocuteur';

    if (!partnerUid && partnerName && db) {
      try {
        // 1. Recherche par nom exact
        let uQuery = query(collection(db, 'users'), where('name', '==', partnerName));
        let uSnap = await getDocs(uQuery);
        if (!uSnap.empty) {
          partnerUid = uSnap.docs[0].id;
        } else {
          // 2. Recherche par username
          const cleanUser = partnerName.replace(/^@/, '').trim();
          uQuery = query(collection(db, 'users'), where('username', '==', '@' + cleanUser));
          uSnap = await getDocs(uQuery);
          if (!uSnap.empty) {
            partnerUid = uSnap.docs[0].id;
          }
        }
      } catch (_) {}
    }

    setIsTransferringTokens(true);
    try {
      // Exécution atomique Firestore (débit expéditeur + crédit destinataire avec fallback de création de portefeuille)
      const res = await executeDirectTokenTransfer({
        senderUid: myUid,
        senderName: myName,
        recipientUid: partnerUid,
        recipientName: partnerName,
        chatId: activeChatObj?.id ? String(activeChatObj.id) : (selectedChat?.id ? String(selectedChat.id) : null),
        tokenAmount: tokens,
        comment: transferComment || '',
        chatData: activeChatObj || selectedChat,
      });

      if (!res.success) {
        console.error('🚨 [DirectTransfer] Échec transfert Firestore:', res.error);
        alert(res.error || 'Erreur lors du transfert de jetons.');
        return;
      }

      // Débit du solde utilisateur dans l'application après confirmation du succès
      const updatedTokens = Math.max(0, currentBalance - tokens);
      if (typeof setProfile === 'function') {
        setProfile(prev => ({ ...prev, trocoTokens: updatedTokens }));
      }
      try {
        const saved = JSON.parse(localStorage.getItem('troco_user_profile') || '{}');
        saved.trocoTokens = updatedTokens;
        localStorage.setItem('troco_user_profile', JSON.stringify(saved));
      } catch (_) {}

      // Déclenchement de l'animation festive
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

  // 🚨 PHASE 91 : Ouverture directe d'un outil workspace (depuis une carte de chat ou un lien direct)
  const openWorkspaceTool = useCallback((toolType, documentId = null) => {
    setIsWorkspaceMenuOpen(false);

    const targetChat = effectiveSelectedChat || selectedChat;
    const currentBoardId = documentId || (targetChat?.id ? `board-${targetChat.id}` : 'default_board');
    const effectiveDocId = documentId || (targetChat?.id ? `doc-${targetChat.id}` : 'default_shared_doc');

    if (toolType === 'whiteboard') {
      if (documentId) {
        setActiveWhiteboardBoardId(documentId);
        setWhiteboardInitialView('canvas');
      } else {
        setActiveWhiteboardBoardId(null);
        setWhiteboardInitialView('lobby');
      }
      setIsWhiteboardOpen(true);
    } else if (toolType === 'notes') {
      setActiveSharedDocId(effectiveDocId);
      setIsSharedDocOpen(true);
    } else if (toolType === 'docs') {
      setActiveOfficeDocId(effectiveDocId);
      setOfficeInitialTab('docs');
      setIsCloudOfficeOpen(true);
    } else if (toolType === 'sheets') {
      setActiveOfficeDocId(effectiveDocId);
      setOfficeInitialTab('sheets');
      setIsCloudOfficeOpen(true);
    } else if (toolType === 'slides') {
      setActiveOfficeDocId(effectiveDocId);
      setOfficeInitialTab('slides');
      setIsCloudOfficeOpen(true);
    } else if (toolType === 'planning' || toolType === 'calendar' || toolType === 'drive' || toolType === 'workspace' || toolType === 'tools') {
      setIsWorkspaceToolsOpen(true);
    }
  }, [effectiveSelectedChat, selectedChat]);

  // Gestion de l'ouverture d'un outil workspace avec invitation automatique dans la conversation
  const handleOpenWorkspaceTool = async (toolType, documentId = null) => {
    openWorkspaceTool(toolType, documentId);

    const targetChat = effectiveSelectedChat || selectedChat;
    const currentBoardId = documentId || (targetChat?.id ? `board-${targetChat.id}` : 'default_board');
    const effectiveDocId = documentId || (targetChat?.id ? `doc-${targetChat.id}` : 'default_shared_doc');
    const chatId = targetChat?.id ? String(targetChat.id) : null;

    if (chatId && db) {
      const toolIcons = {
        whiteboard: '🎨',
        notes: '📝',
        docs: '📄',
        sheets: '📊',
        slides: '📽️',
        planning: '📅',
        calendar: '📅',
        drive: '📁',
        workspace: '💼',
        tools: '💼',
      };
      const toolLabels = {
        whiteboard: 'Tableau Blanc Collaboratif',
        notes: 'Notes Partagées (Apple-Style)',
        docs: 'Document Partagé (Troco Docs)',
        sheets: 'Tableur Collaboratif (Troco Sheets)',
        slides: 'Présentation (Troco Slides)',
        planning: 'Planning & Réunions HD',
        calendar: 'Planning & Réunions HD',
        drive: 'Cloud Drive Collaboratif',
        workspace: 'Outils Pro Workspace',
        tools: 'Outils Pro Workspace',
      };
      const authorName = profile?.name || 'Moi';
      const authorUid = profile?.uid || profile?.id || 'me';
      const text = `${toolIcons[toolType] || '🚀'} ${authorName} a démarré une session ${toolLabels[toolType] || 'Workspace'}`;

      try {
        const msgPayload = {
          text,
          sender: authorUid,
          senderName: authorName,
          senderAvatar: profile?.avatar || '',
          timestamp: serverTimestamp(),
          createdAt: Date.now(),
          type: 'workspace_invite',
          kind: 'workspace_invite',
          workspaceType: toolType,
          workspaceTitle: toolLabels[toolType] || 'Workspace',
          workspaceId: effectiveDocId,
          boardId: currentBoardId,
          docId: effectiveDocId,
        };

        await addDoc(collection(db, 'chats', chatId, 'messages'), msgPayload);
        await updateDoc(doc(db, 'chats', chatId), {
          lastMessage: text,
          lastMessageTimestamp: serverTimestamp(),
          lastMessageSender: authorUid,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
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
  const scrollContainerRef = useRef(null);
  const messagesContainerRef = externalMessagesContainerRef || scrollContainerRef;

  // 🚨 PHASE 59 & 80 : ÉTATS ET RÉFÉRENCES SMART SCROLL
  const [hasNewUnseenMessages, setHasNewUnseenMessages] = useState(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const userJustSentMessageRef = useRef(false);

  const [viewportHeight, setViewportHeight] = useState(() => {
    if (typeof window !== 'undefined' && window.visualViewport) {
      return window.visualViewport.height;
    }
    return null;
  });

  // Phase 27 & 59 — VisualViewport API : ajustement dynamique de la hauteur SANS forcer de scroll aveugle
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const handleViewportUpdate = () => {
      const vh = window.visualViewport.height;
      setViewportHeight(vh);
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

  // TRI CHRONOLOGIQUE RIGOUREUX AVEC PRIORITÉ ABSOLUE AUX CONVERSATIONS ÉPINGLÉES
  const visibleChats = useMemo(() => {
    const list = (mockChats || []).filter(chat => !deletedChatIds.has(chat.id));
    return [...list].sort((a, b) => {
      const isPinnedA = pinnedChatIds.has(a.id);
      const isPinnedB = pinnedChatIds.has(b.id);
      if (isPinnedA && !isPinnedB) return -1;
      if (!isPinnedA && isPinnedB) return 1;
      const timeA = getChatLatestTimestamp(a);
      const timeB = getChatLatestTimestamp(b);
      return timeB - timeA;
    });
  }, [mockChats, deletedChatIds, pinnedChatIds, getChatLatestTimestamp]);

  const currentChatId = effectiveSelectedChat ? effectiveSelectedChat.id : null;
  const messages = useMemo(() => {
    return currentChatId ? (chatThreads[currentChatId] || []) : [];
  }, [currentChatId, chatThreads]);

  const prevChatIdRef = useRef(null);
  const prevMsgCountRef = useRef(0);
  const isUserNearBottomRef = useRef(true);

  // Écoute du défilement utilisateur : détermine si l'utilisateur consulte l'historique
  const handleScroll = useCallback((e) => {
    const el = e.currentTarget;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isNearBottom = distanceToBottom < 120;
    isUserNearBottomRef.current = isNearBottom;
    setIsScrolledUp(!isNearBottom);
    if (isNearBottom) {
      setHasNewUnseenMessages(false);
    }
  }, []);

  // Défilement doux vers le bas lors du clic sur la pilule flottante
  const scrollToBottomSmooth = useCallback(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      isUserNearBottomRef.current = true;
      setIsScrolledUp(false);
      setHasNewUnseenMessages(false);
    }
  }, []);

  // 🚨 PHASE 97 : AUTO-SCROLL BRUTAL AU MONTAGE & SUR CHANGEMENT DE CHAT
  useLayoutEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'auto',
      });
    }
    const timer = setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'auto',
        });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedChat?.id, currentChatId]);

  // 🚨 PHASE 86 : AUTO-SCROLL SÉCURISÉ SANS BOUCLE INFINIE (CSS + RÉF SUR LE DERNIER MESSAGE)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView();
  }, [messages?.length]);

  // Multi-Board Management (Phase 23) : Récupération dynamique des 3 derniers tableaux blancs modifiés dans ce chat
  const recentBoardsFromMessages = useMemo(() => {
    if (!currentChatId) return [];

    const boardsMap = new Map();

    // 1. Scanner les messages du fil de discussion actuel
    if (Array.isArray(messages)) {
      messages.forEach((msg) => {
        if (!msg) return;
        const isWhiteboardInvite = (msg.type === 'workspace_invite' || msg.kind === 'workspace_invite') &&
          (msg.workspaceType === 'whiteboard' || !msg.workspaceType || msg.boardId);

        if (isWhiteboardInvite && (msg.boardId || msg.workspaceId)) {
          const bId = String(msg.boardId || msg.workspaceId);
          const rawTime = msg.timestamp?.toMillis ? msg.timestamp.toMillis() : (Number(msg.timestamp) || Number(msg.createdAt) || 0);
          const existing = boardsMap.get(bId);
          if (!existing || rawTime > existing.timestamp) {
            boardsMap.set(bId, {
              boardId: bId,
              title: msg.workspaceTitle || msg.title || 'Tableau Blanc Collaboratif',
              version: msg.version || 'V1',
              previewUrl: msg.previewUrl || null,
              timestamp: rawTime,
              lastEditor: msg.senderName || 'Collaborateur',
            });
          }
        }
      });
    }

    // 2. Inclure le tableau principal par défaut s'il n'y a pas d'autre tableau
    const defaultBoardId = `board-${currentChatId}`;
    if (!boardsMap.has(defaultBoardId)) {
      boardsMap.set(defaultBoardId, {
        boardId: defaultBoardId,
        title: activeChatObj?.projectTitle || activeChatObj?.user ? `Tableau de ${activeChatObj.projectTitle || activeChatObj.user}` : 'Tableau Principal',
        version: 'V1',
        previewUrl: null,
        timestamp: activeChatObj?.timestamp || 0,
        lastEditor: 'Principal',
        isDefault: true,
      });
    }

    return Array.from(boardsMap.values());
  }, [currentChatId, messages, activeChatObj]);

  // Synchronisation Firestore pour lister les boards de ce chat
  useEffect(() => {
    if (!isWhiteboardPickerOpen || !currentChatId || !db) return;

    let isMounted = true;
    const fetchRecentFromFirestore = async () => {
      try {
        const q = query(
          collection(db, 'project_whiteboards'),
          where('groupId', '==', String(currentChatId))
        );
        const snap = await getDocs(q);
        if (!isMounted) return;
        const list = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            boardId: data.boardId || d.id,
            title: data.title || 'Tableau Blanc',
            version: `V${data.versionNumber || 1}`,
            previewUrl: data.versionHistory?.[data.versionHistory.length - 1]?.previewUrl || null,
            timestamp: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : Date.now(),
            lastEditor: data.lastEditor || 'Collaborateur',
          });
        });
        setFirestoreRecentBoards(list);
      } catch (err) {
        console.warn('[ChatView] Firestore recent boards note:', err);
      }
    };

    fetchRecentFromFirestore();
    return () => { isMounted = false; };
  }, [isWhiteboardPickerOpen, currentChatId]);

  const mergedRecentBoards = useMemo(() => {
    const map = new Map();
    firestoreRecentBoards.forEach((b) => map.set(b.boardId, b));
    recentBoardsFromMessages.forEach((b) => {
      if (!map.has(b.boardId)) {
        map.set(b.boardId, b);
      } else {
        const existing = map.get(b.boardId);
        if (b.timestamp > existing.timestamp) map.set(b.boardId, { ...existing, ...b });
      }
    });
    return Array.from(map.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 3);
  }, [firestoreRecentBoards, recentBoardsFromMessages]);

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
  const pendingDealFromMe = messages.find(m =>
    (m.type === 'deal' || m.kind === 'deal' || m.type === 'deal_offer' || m.kind === 'deal_offer') &&
    (m.status === 'pending' || !m.status) &&
    ((m.senderUid && profile?.uid && m.senderUid === profile.uid) ||
     (m.senderName && profile?.name && m.senderName.trim().toLowerCase() === profile.name.trim().toLowerCase()) ||
     m.sender === 'me')
  );

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
    await handleDeleteChat(confirmDeleteChat.id, confirmDeleteChat);
    setConfirmDeleteChat(null);
  };

  const onSubmitMessage = () => {
    hapticLight();
    userJustSentMessageRef.current = true;
    if (editingMsg) {
      if (handleEditMessage) {
        handleEditMessage(currentChatId, editingMsg.id, chatInputText);
      }
      setEditingMsg(null);
      setChatInputText('');
    } else {
      playPop();
      handleSendMessage();
    }
  };

  const renderMessageStatus = (msg) => {
    // Phase 30 — Statuts optimistes : pending (horloge) et error (retry)
    if (msg.status === 'pending') {
      return (
        <span
          title="Envoi en cours..."
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            opacity: 0.8,
          }}
        >
          <Clock size={11} style={{ animation: 'spin 2s linear infinite' }} />
        </span>
      );
    }

    if (msg.status === 'error') {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (handleRetryMessage) handleRetryMessage(msg);
          }}
          title="Échec de l'envoi — Cliquer pour réessayer"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            fontSize: '11px',
            fontWeight: '800',
            color: '#EF4444',
          }}
        >
          <span>⚠️ Réessayer</span>
        </button>
      );
    }

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
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', width: '100%', height: '100%', boxSizing: 'border-box' }}>
          <EmptyState
            icon={<MessageSquare size={32} strokeWidth={2.2} />}
            title={t('noChats') || "Vous n'avez pas encore de conversation"}
            description="Sélectionnez une discussion ou découvrez les annonces pour initier votre premier troc !"
            action={(
              <button
                type="button"
                onClick={() => {
                  try { window.dispatchEvent(new CustomEvent('troco:switch_tab', { detail: 'feed' })); } catch (_) {}
                }}
                className="premium-button"
                style={{
                  border: 'none',
                  borderRadius: '999px',
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                  color: '#FFFFFF',
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Search size={15} />
                <span>Découvrir les annonces</span>
              </button>
            )}
          />
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flexWrap: 'wrap' }}>
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
                    <span
                      className="inline-flex items-center justify-center text-center leading-none"
                      style={{
                        fontSize: '9px',
                        fontWeight: '800',
                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                        color: 'var(--accent-success)',
                        padding: '2.5px 6.5px',
                        borderRadius: '6px',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        gap: '4px',
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--accent-success)',
                          boxShadow: '0 0 4px rgba(16, 185, 129, 0.6)',
                          flexShrink: 0,
                          display: 'inline-block',
                        }}
                      />
                      <span>En ligne</span>
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center justify-center text-center leading-none"
                      style={{
                        fontSize: '9px',
                        fontWeight: '700',
                        backgroundColor: 'var(--bg-subtle)',
                        color: 'var(--text-secondary)',
                        padding: '2.5px 6.5px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        gap: '4px',
                        flexShrink: 0,
                        opacity: 0.8,
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--text-secondary)',
                          opacity: 0.45,
                          flexShrink: 0,
                          display: 'inline-block',
                        }}
                      />
                      <span>Hors ligne</span>
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
                {/* BOUTON TABLEAU BLANC COLLABORATIF (GROUPE) */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsWhiteboardPickerOpen(true); }}
                  onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setIsWhiteboardPickerOpen(true); }}
                  className="premium-button"
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: isMobile ? '50%' : '999px',
                    width: isMobile ? '44px' : 'auto',
                    height: '44px',
                    minWidth: '44px',
                    minHeight: '44px',
                    padding: isMobile ? '0' : '0 12px',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-main)',
                    fontWeight: '700', fontSize: '11px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    position: 'relative', zIndex: 100, pointerEvents: 'auto', touchAction: 'manipulation'
                  }}
                  title="Gérer ou créer des Tableaux Blancs Collaboratifs"
                >
                  <Palette size={15} color="var(--accent-primary)" />
                  {!isMobile && <span>Whiteboard</span>}
                </button>

                {/* BOUTON OUTILS PRO WORKSPACE */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsWorkspaceToolsOpen(true); }}
                  onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setIsWorkspaceToolsOpen(true); }}
                  className="premium-button"
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: isMobile ? '50%' : '999px',
                    width: isMobile ? '44px' : 'auto',
                    height: '44px',
                    minWidth: '44px',
                    minHeight: '44px',
                    padding: isMobile ? '0' : '0 12px',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-main)',
                    fontWeight: '700', fontSize: '11px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    position: 'relative', zIndex: 100, pointerEvents: 'auto', touchAction: 'manipulation'
                  }}
                  title="Outils Pro (Google Drive, Calendar, Remote)"
                >
                  <Briefcase size={15} color="var(--accent-primary)" />
                  {!isMobile && <span>Outils Pro</span>}
                </button>

                {/* BOUTON RÉTRIBUTIONS JETONS */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsProjectRewardsModalOpen(true); }}
                  onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setIsProjectRewardsModalOpen(true); }}
                  className="premium-button"
                  style={{
                    border: 'none',
                    borderRadius: isMobile ? '50%' : '999px',
                    width: isMobile ? '44px' : 'auto',
                    height: '44px',
                    minWidth: '44px',
                    minHeight: '44px',
                    padding: isMobile ? '0' : '0 12px',
                    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                    color: '#FFF',
                    fontWeight: '800', fontSize: '11px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    boxShadow: 'var(--shadow-accent)',
                    position: 'relative', zIndex: 100, pointerEvents: 'auto', touchAction: 'manipulation'
                  }}
                  title="Gérer l'équipe et rétribuer les membres en jetons"
                >
                  <Coins size={15} />
                  {!isMobile && <span>💎 Rétributions</span>}
                </button>

                {/* APPELS AUDIO & VISIO DE GROUPE */}
                <button
                  type="button"
                  onClick={() => startCall('audio')}
                  onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); startCall('audio'); }}
                  className="premium-button"
                  style={{
                    border: 'none', borderRadius: '50%', width: '44px', height: '44px',
                    minWidth: '44px', minHeight: '44px',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-main)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', zIndex: 100, pointerEvents: 'auto', touchAction: 'manipulation'
                  }}
                  title={t('audioCall') || 'Appel audio HD'}
                >
                  <Phone size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => startCall('video')}
                  onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); startCall('video'); }}
                  className="premium-button"
                  style={{
                    border: 'none', borderRadius: '50%', width: '44px', height: '44px',
                    minWidth: '44px', minHeight: '44px',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-main)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', zIndex: 100, pointerEvents: 'auto', touchAction: 'manipulation'
                  }}
                  title={t('videoCall') || 'Appel visio direct'}
                >
                  <Video size={15} />
                </button>
              </div>
            ) : (
              <>
                {/* BOUTON TABLEAU BLANC COLLABORATIF 1-TO-1 */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsWhiteboardPickerOpen(true); }}
                  onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setIsWhiteboardPickerOpen(true); }}
                  className="premium-button"
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: isMobile ? '50%' : '999px',
                    width: isMobile ? '44px' : 'auto',
                    height: '44px',
                    minWidth: '44px',
                    minHeight: '44px',
                    padding: isMobile ? '0' : '0 12px',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-main)',
                    fontWeight: '700', fontSize: '11px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    position: 'relative', zIndex: 100, pointerEvents: 'auto', touchAction: 'manipulation'
                  }}
                  title="Gérer ou créer des Tableaux Blancs Collaboratifs"
                >
                  <Palette size={15} color="var(--accent-primary)" />
                  {!isMobile && <span>Whiteboard</span>}
                </button>

                <button
                  type="button"
                  onClick={() => startCall('audio')}
                  onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); startCall('audio'); }}
                  className="premium-button"
                  style={{
                    border: 'none', borderRadius: '50%', width: '44px', height: '44px',
                    minWidth: '44px', minHeight: '44px',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-main)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', zIndex: 100, pointerEvents: 'auto', touchAction: 'manipulation'
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
            overflowAnchor: 'auto',
            padding: isMobile ? '12px 10px' : '16px 20px',
            backgroundColor: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            overscrollBehavior: 'contain',
            overscrollBehaviorY: 'contain',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            boxSizing: 'border-box',
            position: 'relative',
          }}
          ref={(el) => {
            scrollContainerRef.current = el;
            if (externalMessagesContainerRef) {
              externalMessagesContainerRef.current = el;
            }
          }}
          onScroll={handleScroll}
        >
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxWidth: '680px',
            width: '100%',
            margin: '0 auto',
            minHeight: '100%',
            boxSizing: 'border-box',
          }}>
            {messages.map((msg, msgIdx) => {
              try {
                if (!msg || typeof msg !== 'object') return null;
                const isMsgOriginal = !!showingOriginalMessages[msg?.id];
                const translatedText = getChatMessageDisplayContent
                  ? getChatMessageDisplayContent(msg, currentLang, isMsgOriginal)
                  : (msg?.text || '');

                // RENDU DES MESSAGES SYSTÈME / JOURNAUX D'APPEL
                if (msg?.sender === 'system' || msg?.kind === 'call-log' || msg?.type === 'call-log') {
                  return (
                    <div key={msg?.id || `sys-${msgIdx}`} style={{ textAlign: 'center', margin: '8px 0' }}>
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
                        <span>{translatedText || msg?.text || ''}</span>
                      </div>
                    </div>
                  );
                }

                // RENDU DES TRANSFERTS DE JETONS INSTANTANÉS (CARD STYLE GOLD TROCO)
                if (msg?.type === 'token_transfer' || msg?.kind === 'token_transfer') {
                  const count = Number(msg?.tokenAmount) || 1;
                  const isMine = Boolean(
                    (msg?.senderUid && profile?.uid && msg.senderUid === profile.uid) ||
                    (msg?.senderName && profile?.name && msg.senderName.trim().toLowerCase() === profile.name.trim().toLowerCase()) ||
                    (msg?.sender === 'me')
                  );

                  return (
                    <div
                      key={msg?.id || `token-${msgIdx}`}
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
                            {isMine ? `Transféré avec succès à ${activeChatObj?.user || 'votre contact'}` : `Reçu de ${msg?.senderName || 'votre contact'} !`} ✓
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // 🚨 PHASE 85 : RENDU DÉFENSIF DES PROPOSITIONS DE DEAL
                const isDeal = Boolean(
                  msg?.type === 'deal_offer' ||
                  msg?.type === 'deal_proposal' ||
                  msg?.type === 'deal' ||
                  msg?.type === 'deal_counter_offer' ||
                  msg?.kind === 'deal' ||
                  msg?.kind === 'deal_offer' ||
                  msg?.kind === 'deal_proposal' ||
                  msg?.dealTerms ||
                  msg?.terms ||
                  msg?.deal ||
                  msg?.proposal ||
                  msg?.dealId
                );

                if (isDeal) {
                  const terms = (msg && (msg.dealTerms || msg.terms || msg.proposal || msg.deal)) || {};
                  const expectedHours = typeof terms?.hours === 'number'
                    ? terms.hours
                    : (Number(terms?.hours ?? terms?.expectedHours ?? (terms?.durationValue ? Number(terms.durationValue) : 0)) || 0);
                  const expectedTokens = typeof terms?.tokens === 'number'
                    ? terms.tokens
                    : (Number(terms?.tokens ?? terms?.expectedTokens ?? terms?.trocoTokens ?? 0) || 0);
                  const fiatAmount = typeof terms?.fiatAmount === 'number'
                    ? terms.fiatAmount
                    : (Number(terms?.fiatAmount ?? terms?.fiat ?? terms?.euroAmount ?? 0) || 0);
                  const serviceTitle = terms?.title || terms?.serviceTitle || terms?.itemName || msg?.listing || activeChatObj?.listing || "Prestation de service";
                  const rawDescription = terms?.conditions || terms?.description || terms?.notes || msg?.text || msg?.content || "";
                  const isCounterOffer = Boolean(terms?.isCounterOffer || msg?.type === 'deal_counter_offer');

                  const currentUid = profile?.uid || (auth?.currentUser && auth.currentUser.uid) || '';
                  const senderId = msg?.senderId || msg?.authorUid || msg?.senderUid || (msg?.sender === 'me' ? currentUid : '');
                  const isSender = Boolean(currentUid && senderId ? String(currentUid) === String(senderId) : msg?.sender === 'me');
                  const isRecipient = !isSender;
                  const isMine = isSender;
                  const isIncoming = isRecipient;

                  const currentDealStatus = String(msg?.status || 'pending').toLowerCase();
                  const isAccepted = (currentDealStatus === 'confirmed' || currentDealStatus === 'accepted' || currentDealStatus === 'validated');
                  const isRejected = (currentDealStatus === 'declined' || currentDealStatus === 'rejected' || currentDealStatus === 'refused' || currentDealStatus === 'cancelled');
                  const isCountered = (currentDealStatus === 'countered' || currentDealStatus === 'superseded');
                  const isDealPending = !isAccepted && !isRejected;
                  const partnerName = activeChatObj?.user || 'l’interlocuteur';
                  const dealConditionsText = getChatMessageDisplayContent && rawDescription
                    ? getChatMessageDisplayContent({ text: rawDescription }, currentLang, isMsgOriginal)
                    : rawDescription;

                  return (
                    <div
                      key={msg?.id || `deal-${msgIdx}`}
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
                        width: isMobile ? '94%' : '85%',
                        maxWidth: '520px',
                        border: isMine
                          ? '1.5px solid var(--accent-primary)'
                          : '1.5px solid var(--border-color)',
                        borderRadius: '20px',
                        borderBottomRightRadius: isMine ? '4px' : '20px',
                        borderBottomLeftRadius: isIncoming ? '4px' : '20px',
                        padding: isMobile ? '14px 14px 12px' : '18px',
                        backgroundColor: 'var(--bg-card)',
                        boxShadow: 'var(--shadow-card)',
                        boxSizing: 'border-box'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                            <Sparkles size={15} color="var(--accent-primary)" />
                            {isMine
                              ? (isCounterOffer ? 'Ma contre-proposition de Deal' : (t('myDealProposal') || 'Ma proposition de Deal'))
                              : (isCounterOffer ? `Contre-offre reçue de ${msg?.senderName || partnerName}` : `Proposition de Deal reçue de ${msg?.senderName || partnerName}`)}
                          </div>
                          {isDealPending && isRecipient && (
                            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)', padding: '3px 8px', borderRadius: '999px', border: '1.5px solid var(--accent-primary)' }}>
                              ⚡ Réponse attendue
                            </span>
                          )}
                          {isDealPending && isSender && (
                            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', padding: '3px 8px', borderRadius: '999px', border: '1px solid var(--border-color)' }}>
                              {t('waitingResponse') || 'En attente'}
                            </span>
                          )}
                          {isCountered && (
                            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', padding: '3px 8px', borderRadius: '999px', border: '1px dashed var(--border-color)' }}>
                              🔄 Contre-offre émise
                            </span>
                          )}
                          {currentDealStatus === 'escrow_locked' && (
                            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-success, #10B981)', padding: '3px 8px', borderRadius: '999px', border: '1.5px solid var(--accent-success, #10B981)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              🛡️ Fonds sous Séquestre
                            </span>
                          )}
                          {isAccepted && (
                            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10B981', padding: '3px 8px', borderRadius: '999px', border: '1.5px solid #10B981' }}>
                              ✓ Deal Accepté
                            </span>
                          )}
                          {isRejected && (
                            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#EF4444', padding: '3px 8px', borderRadius: '999px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                              ✕ Offre Refusée
                            </span>
                          )}
                        </div>

                        {/* TITRE DE LA PRESTATION */}
                        <div style={{ fontSize: '14.5px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>
                          {serviceTitle}
                        </div>

                        {/* DESCRIPTION OU CONDITIONS */}
                        {dealConditionsText && (
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.5, fontWeight: '500' }}>
                            {dealConditionsText}
                          </div>
                        )}
                        {currentLang !== 'FR' && dealConditionsText && (
                          <button
                            onClick={() => toggleOriginalMessage(msg?.id)}
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

                        {/* BADGES DE CONTREPARTIE SÉCURISÉS (VALEURS GARANTIES SANS NaN NI UNDEFINED) */}
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                          {(expectedHours > 0 || terms?.durationType) && (
                            <span style={{
                              backgroundColor: 'var(--bg-subtle)',
                              border: '1.5px solid var(--border-color)',
                              color: 'var(--text-main)',
                              borderRadius: '999px', padding: '3px 9px', fontSize: '11px', fontWeight: '800',
                              display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }}>
                              ⏱️ {expectedHours > 0 ? `${expectedHours}h` : (terms?.durationType === 'hourly' ? `${terms?.durationValue || 1}h` : terms?.durationType === 'daily' ? `${terms?.durationValue || 1}j` : terms?.durationType === 'monthly' ? `${terms?.durationValue || 1} mois` : terms?.durationType === 'fixed' ? 'Forfait' : 'Libre')}
                            </span>
                          )}
                          {expectedTokens > 0 && (
                            <span style={{
                              backgroundColor: 'var(--bg-subtle)',
                              border: '1.5px solid var(--accent-warning)',
                              color: 'var(--accent-warning)',
                              borderRadius: '999px', padding: '3px 9px', fontSize: '11px', fontWeight: '800',
                              display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }}>
                              🪙 {expectedTokens} Jeton{expectedTokens > 1 ? 's' : ''}
                            </span>
                          )}
                          {fiatAmount > 0 && (
                            <span style={{
                              backgroundColor: 'var(--bg-subtle)',
                              border: '1.5px solid var(--accent-primary)',
                              color: 'var(--accent-primary)',
                              borderRadius: '999px', padding: '3px 9px', fontSize: '11px', fontWeight: '800',
                              display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }}>
                              💶 + {Number(fiatAmount).toFixed(2).replace('.00', '')} €
                            </span>
                          )}
                          {expectedHours === 0 && expectedTokens === 0 && fiatAmount === 0 && (
                            <span style={{
                              backgroundColor: 'var(--bg-subtle)',
                              border: '1.5px solid var(--accent-primary)',
                              color: 'var(--accent-primary)',
                              borderRadius: '999px', padding: '3px 9px', fontSize: '11px', fontWeight: '800',
                              display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }}>
                              🤝 Troc direct / Service
                            </span>
                          )}
                        </div>

                        {/* 🚨 PHASE 85 : FORÇAGE DES BOUTONS DE NÉGOCIATION SANS CRASH */}
                        {!isAccepted && !isRejected && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                            {isSender ? (
                              /* ÉTAT EXPÉDITEUR : BOUTON EN ATTENTE DU PARTENAIRE (DISABLED) */
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                backgroundColor: 'var(--bg-subtle)',
                                border: '1px dashed var(--border-color)',
                                color: 'var(--text-secondary)',
                                borderRadius: '12px',
                                padding: '10px 14px',
                                fontSize: '12px',
                                fontWeight: '700',
                                opacity: 0.85,
                                cursor: 'not-allowed'
                              }}>
                                <Clock size={14} color="var(--accent-primary)" />
                                <span>En attente de la réponse du partenaire...</span>
                              </div>
                            ) : (
                              /* ÉTAT DESTINATAIRE : LES 3 BOUTONS ACTIFS AVEC CALLBACKS SÉCURISÉS */
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                                {/* BOUTON 1 : ACCEPTER */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    try {
                                      hapticSuccess();
                                      playSuccessChime();
                                      if (typeof onAcceptDeal === 'function') {
                                        onAcceptDeal(msg?.id, terms);
                                      } else if (typeof handleAcceptDeal === 'function') {
                                        handleAcceptDeal(currentChatId, msg?.id, terms);
                                      }
                                    } catch (err) {
                                      console.warn('[ChatView] Accept deal error:', err);
                                    }
                                  }}
                                  className="premium-button"
                                  style={{
                                    border: 'none',
                                    borderRadius: '12px',
                                    padding: '10px 4px',
                                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                    color: '#FFFFFF',
                                    fontSize: '11.5px',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
                                    whiteSpace: 'nowrap',
                                    transition: 'transform 0.15s ease, opacity 0.15s ease'
                                  }}
                                  title="Accepter la proposition de deal"
                                >
                                  <Check size={14} strokeWidth={2.5} />
                                  <span>Accepter</span>
                                </button>

                                {/* BOUTON 2 : CONTRE-OFFRE */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    try {
                                      hapticLight();
                                      if (typeof openCounterOffer === 'function') {
                                        openCounterOffer(terms, msg?.id);
                                      }
                                    } catch (err) {
                                      console.warn('[ChatView] Counter offer error:', err);
                                    }
                                  }}
                                  className="premium-button"
                                  style={{
                                    border: 'none',
                                    borderRadius: '12px',
                                    padding: '10px 4px',
                                    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                                    color: '#FFFFFF',
                                    fontSize: '11.5px',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                    boxShadow: 'var(--shadow-accent)',
                                    whiteSpace: 'nowrap',
                                    transition: 'transform 0.15s ease, opacity 0.15s ease'
                                  }}
                                  title="Faire une contre-proposition"
                                >
                                  <RefreshCw size={13} strokeWidth={2.5} />
                                  <span>Contre-offre</span>
                                </button>

                                {/* BOUTON 3 : REFUSER */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    try {
                                      hapticError();
                                      if (typeof handleDeclineDeal === 'function') {
                                        handleDeclineDeal(currentChatId, msg?.id);
                                      }
                                    } catch (err) {
                                      console.warn('[ChatView] Decline deal error:', err);
                                    }
                                  }}
                                  className="premium-button"
                                  style={{
                                    border: '1px solid rgba(239, 68, 68, 0.28)',
                                    borderRadius: '12px',
                                    padding: '10px 4px',
                                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                    color: '#EF4444',
                                    fontSize: '11.5px',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                    whiteSpace: 'nowrap',
                                    transition: 'transform 0.15s ease, opacity 0.15s ease'
                                  }}
                                  title="Refuser cette offre"
                                >
                                  <X size={14} strokeWidth={2.5} />
                                  <span>Refuser</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* BADGE OFFRE REMPLACÉE PAR UNE CONTRE-OFFRE */}
                        {isCountered && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: 'var(--bg-subtle)', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)', borderRadius: '12px', padding: '8px 12px', fontSize: '11.5px', fontWeight: '700', marginTop: '8px' }}>
                            <RefreshCw size={13} strokeWidth={2} />
                            <span>🔄 Offre remplacée par une contre-proposition</span>
                          </div>
                        )}

                        {/* BADGE STATUT CONFIRMÉ / ACCEPTÉ (NON-CLIQUABLE) */}
                        {isAccepted && currentDealStatus !== 'escrow_locked' && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#10B981', borderRadius: '12px', padding: '9px 12px', fontSize: '11.5px', fontWeight: '800', marginTop: '8px' }}>
                            <Check size={14} strokeWidth={2.5} />
                            <span>✓ Deal accepté et validé</span>
                          </div>
                        )}

                        {/* BADGE STATUT REFUSÉ (NON-CLIQUABLE) */}
                        {isRejected && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#EF4444', borderRadius: '12px', padding: '9px 12px', fontSize: '11.5px', fontWeight: '800', marginTop: '8px' }}>
                            <X size={14} strokeWidth={2.5} />
                            <span>✕ Offre déclinée / annulée</span>
                          </div>
                        )}

                        {/* STATUT EN ATTENTE POUR L'EXPÉDITEUR AVEC RAPPEL DU STATUT */}
                        {isDealPending && isMine && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--bg-subtle)', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)', borderRadius: '12px', padding: '7px 10px', fontSize: '11px', fontWeight: '700', marginTop: '8px' }}>
                            <Clock size={12} color="var(--accent-primary)" />
                            <span>Offre en attente : vous pouvez valider, modifier ou annuler à tout moment.</span>
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

                return (
                  <WorkspaceMessageCard
                    key={msg.id || `ws_${msg.timestamp || Date.now()}`}
                    msg={msg}
                    isMine={isMine}
                    isMobile={isMobile}
                    darkMode={darkMode}
                    openWorkspaceTool={(type, docId) => {
                      const effectiveDocId = docId || msg.documentId || msg.docId || msg.workspaceId || msg.boardId;
                      openWorkspaceTool(type, effectiveDocId);
                    }}
                    onOpenWorkspace={({ type, workspaceId: targetWsId, boardId: targetBoardId, version: targetVersion }, directDocId) => {
                      const effectiveDocId = directDocId || targetBoardId || targetWsId || msg.documentId || msg.docId || msg.workspaceId || msg.boardId;
                      openWorkspaceTool(type, effectiveDocId);
                    }}
                  />
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

                      {(msg.type === 'audio' || msg.kind === 'audio' || msg.audioUrl) ? (
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

                          {Boolean(msg.image || (typeof msg.text === 'string' && (msg.text.startsWith('data:image/') || (msg.text.startsWith('http') && (msg.text.includes('.png') || msg.text.includes('.jpg') || msg.text.includes('.jpeg') || msg.text.includes('.webp')))))) ? (
                            <img
                              src={msg.image || msg.text}
                              alt="Image partagée"
                              style={{
                                maxWidth: '100%',
                                maxHeight: '240px',
                                borderRadius: '12px',
                                objectFit: 'cover',
                                display: 'block',
                                marginBottom: '4px',
                              }}
                            />
                          ) : (
                            <div style={{ fontSize: '13.5px', lineHeight: 1.45, fontWeight: '500' }}>
                              {translatedText}
                            </div>
                          )}

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
              } catch (renderError) {
                console.warn('[ChatView] Safe render message fallback:', renderError, msg);
                return (
                  <div
                    key={msg?.id || `msg-error-${msgIdx}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      width: '100%',
                      margin: '6px 0',
                    }}
                  >
                    <div style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#EF4444',
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: '12px',
                      padding: '6px 14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span>⚠️ Erreur d'affichage du message</span>
                    </div>
                  </div>
                );
              }
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

        {/* 🚨 PHASE 59 : BOUTON FLOTTANT "NOUVEAU MESSAGE ↓" (SMART SCROLL) */}
        {hasNewUnseenMessages && (
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '680px',
            margin: '0 auto',
            pointerEvents: 'none',
          }}>
            <button
              type="button"
              onClick={scrollToBottomSmooth}
              className="premium-button"
              style={{
                position: 'absolute',
                bottom: '12px',
                right: '16px',
                pointerEvents: 'auto',
                zIndex: 40,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '999px',
                backgroundColor: 'rgba(15, 23, 42, 0.92)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: '800',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35), 0 0 12px rgba(59, 130, 246, 0.25)',
                cursor: 'pointer',
              }}
            >
              <span>Nouveau message ↓</span>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3B82F6', display: 'inline-block' }} />
            </button>
          </div>
        )}

        {/* 3. BARRE DE SAISIE FIXE ISOLÉE ET MÉMOÏSÉE (Phase 63 - Rendu O(1)) */}
        {isRecordingAudio ? (
          <div style={{
            padding: isMobile ? '8px 12px' : '8px 16px',
            paddingBottom: isMobile ? 'max(10px, env(safe-area-inset-bottom, 10px))' : '10px',
            borderTop: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-card)',
            flexShrink: 0,
            zIndex: 50,
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <VoiceNoteRecorder
              isRecording={isRecordingAudio}
              onCancel={() => setIsRecordingAudio(false)}
              onSendVoiceNote={async (blob, dur) => {
                userJustSentMessageRef.current = true;
                if (onSendAudioMessage) {
                  await onSendAudioMessage(blob, dur);
                }
                setIsRecordingAudio(false);
              }}
            />
          </div>
        ) : (
          <ChatInputBar
            isMobile={isMobile}
            darkMode={darkMode}
            t={t}
            editingMsg={editingMsg}
            replyingTo={null}
            isGroupChat={activeChatObj?.isGroup}
            handleSendMessage={handleSendMessage}
            onSendMessage={(text) => {
              userJustSentMessageRef.current = true;
              if (handleSendMessage) {
                handleSendMessage(text);
              }
            }}
            onEditMessage={(text) => {
              if (currentChatId && editingMsg) {
                handleEditMessage(currentChatId, editingMsg.id, text);
                setEditingMsg(null);
              }
            }}
            onCancelEdit={() => setEditingMsg(null)}
            onCancelReply={() => {}}
            onTypingChange={onTypingChange}
            onOpenDirectTransfer={() => setIsDirectTransferOpen(true)}
            onStartVoiceRecord={() => setIsRecordingAudio(true)}
            onOpenWorkspaceTool={(tool) => handleOpenWorkspaceTool(tool)}
            onOpenWhiteboardPicker={() => {
              setActiveWhiteboardBoardId(null);
              setWhiteboardInitialView('lobby');
              setIsWhiteboardOpen(true);
            }}
            onOpenProjectRewards={() => setIsProjectRewardsModalOpen(true)}
          />
        )}
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

              <div
                className="flex flex-col flex-1 overflow-y-auto pb-safe"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  overflowY: 'auto',
                  flex: 1,
                  padding: '12px',
                  overscrollBehavior: 'contain',
                  WebkitOverflowScrolling: 'touch',
                  touchAction: 'pan-y'
                }}
              >
                {visibleChats.length === 0 ? (
                  <div style={{ padding: '32px 12px', display: 'flex', justifyContent: 'center', width: '100%', boxSizing: 'border-box' }}>
                    <EmptyState
                      compact={true}
                      icon={<MessageSquareDashed size={28} strokeWidth={2.2} />}
                      title={t('noChats') || "Vous n'avez pas encore de conversation"}
                      description="Découvrez les annonces et échangez avec les membres de la communauté !"
                      action={(
                        <button
                          type="button"
                          onClick={() => {
                            try { window.dispatchEvent(new CustomEvent('troco:switch_tab', { detail: 'feed' })); } catch (_) {}
                          }}
                          className="premium-button"
                          style={{
                            border: 'none',
                            borderRadius: '999px',
                            padding: '10px 18px',
                            background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                            color: '#FFFFFF',
                            fontWeight: '800',
                            fontSize: '12px',
                            cursor: 'pointer',
                            boxShadow: 'var(--shadow-accent)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Search size={13} />
                          <span>Découvrir les annonces</span>
                        </button>
                      )}
                      secondaryAction={(
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              window.dispatchEvent(new CustomEvent('troco:refetch_chats'));
                            } catch (_) {}
                          }}
                          className="premium-button"
                          style={{
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'transparent',
                            color: 'var(--text-secondary)',
                            borderRadius: '999px',
                            padding: '8px 14px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <RefreshCw size={11} />
                          <span>Actualiser</span>
                        </button>
                      )}
                    />
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
                      <SwipeableChatItem
                        key={chat.id}
                        chat={chat}
                        isPinned={pinnedChatIds.has(chat.id)}
                        onTogglePin={togglePinChat}
                        onDelete={() => handleDeleteChat(chat.id)}
                      >
                        <div
                          style={{ position: 'relative', width: '100%', height: '88px' }}
                          className="chat-row-container shrink-0 flex-shrink-0 h-[88px]"
                        >
                          <button
                            onClick={() => handleSelectChatMobile(chat)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
                              borderRadius: '16px', cursor: 'pointer', textAlign: 'left',
                              width: '100%',
                              height: '88px',
                              minHeight: '88px',
                              maxHeight: '88px',
                              flexShrink: 0,
                              boxSizing: 'border-box',
                              backgroundColor: isSelected
                                ? 'var(--bg-subtle)'
                                : (isUnread ? 'var(--bg-subtle)' : 'var(--bg-card)'),
                              border: isSelected
                                ? '1.5px solid var(--accent-primary)'
                                : '1px solid var(--border-color)',
                              borderLeft: isSelected
                                ? '4px solid var(--accent-primary)'
                                : (isUnread ? '4px solid var(--accent-terracotta)' : (pinnedChatIds.has(chat.id) ? '4px solid #3B82F6' : '1px solid var(--border-color)')),
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
                                  {pinnedChatIds.has(chat.id) && (
                                    <span title="Épinglé" style={{ display: 'inline-flex', alignItems: 'center', color: '#3B82F6' }}>
                                      <Pin size={12} style={{ fill: '#3B82F6' }} />
                                    </span>
                                  )}
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
                      </SwipeableChatItem>
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

      {/* SALLE DE CONVERSATION MOBILE (PORTAL DÉTACHÉ DIRECTEMENT SUR MODAL-ROOT) */}
      {isMobile && effectiveSelectedChat && mobileSubView === 'room' && (
        <Portal>
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
              height: viewportHeight ? `${viewportHeight}px` : '100dvh',
              maxHeight: viewportHeight ? `${viewportHeight}px` : '100dvh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              zIndex: 1000,
              backgroundColor: 'var(--bg-global)',
              boxSizing: 'border-box',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              transition: 'height 0.15s ease-out, padding-bottom 0.15s ease-out'
            }}
          >
            {renderChatRoom()}
          </div>
        </Portal>
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

      {/* POPOVER / DROPDOWN MULTI-BOARD PICKER (PHASE 23) */}
      {isWhiteboardPickerOpen && activeChatObj && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            padding: '16px',
            animation: 'fadeIn 0.15s ease',
          }}
          onClick={() => setIsWhiteboardPickerOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '430px',
              backgroundColor: darkMode ? '#1A1613' : '#FFFFFF',
              borderRadius: '24px',
              border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.1)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              animation: 'popoverZoom 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* EN-TÊTE DU MENU POPOVER */}
            <div
              style={{
                padding: '18px 20px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)',
                    color: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(198,125,91,0.3)',
                  }}
                >
                  <Palette size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-main)' }}>
                    Tableaux Blancs
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Création infinie & gestion de projets
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsWhiteboardPickerOpen(false)}
                className="premium-button"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* CONTENU */}
            <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* 1. NOUVEAU TABLEAU BLANC (GÉNÉRATION D'UN ID UNIQUE) */}
              <button
                type="button"
                onClick={() => {
                  const newBoardId = `${activeChatObj.id || 'chat'}_board_${Date.now()}`;
                  openWhiteboard(newBoardId, 1);
                  setIsWhiteboardPickerOpen(false);
                }}
                className="premium-button"
                style={{
                  padding: '14px 16px',
                  borderRadius: '16px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 6px 20px rgba(198,125,91,0.35)',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Plus size={22} strokeWidth={2.8} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🎨 Nouveau Tableau Blanc</span>
                    <Sparkles size={13} color="#FEF08A" />
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px' }}>
                    Démarrer un projet vierge sans écraser le précédent
                  </div>
                </div>
              </button>

              {/* 2. REPRENDRE UN PROJET (3 DERNIERS BOARDS DU CHAT) */}
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Clock size={12} />
                  <span>📁 Reprendre un projet ({mergedRecentBoards.length})</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {mergedRecentBoards.length > 0 ? (
                    mergedRecentBoards.map((board) => (
                      <button
                        key={board.boardId}
                        type="button"
                        onClick={() => {
                          openWhiteboard(board.boardId, board.version || null);
                          setIsWhiteboardPickerOpen(false);
                        }}
                        className="hover-subtle"
                        style={{
                          padding: '10px 12px',
                          borderRadius: '14px',
                          border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                          backgroundColor: darkMode ? 'rgba(255,255,255,0.03)' : '#F9F8F6',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          textAlign: 'left',
                          width: '100%',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {board.previewUrl ? (
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '10px',
                              overflow: 'hidden',
                              backgroundColor: '#111',
                              border: '1px solid rgba(198,125,91,0.3)',
                              flexShrink: 0,
                            }}
                          >
                            <img
                              src={board.previewUrl}
                              alt="Preview"
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                          </div>
                        ) : (
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '10px',
                              backgroundColor: 'rgba(198,125,91,0.12)',
                              color: 'var(--accent-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Palette size={18} />
                          </div>
                        )}

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <span
                              style={{
                                fontSize: '12.5px',
                                fontWeight: '800',
                                color: 'var(--text-main)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {board.title}
                            </span>
                            <span
                              style={{
                                fontSize: '9.5px',
                                fontWeight: '800',
                                backgroundColor: 'rgba(198,125,91,0.18)',
                                color: 'var(--accent-primary)',
                                padding: '1px 6px',
                                borderRadius: '6px',
                                flexShrink: 0,
                              }}
                            >
                              {board.version || 'V1'}
                            </span>
                          </div>

                          <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{board.lastEditor ? `Édité par ${board.lastEditor}` : 'Projet actif'}</span>
                            {board.timestamp > 0 && (
                              <>
                                <span>•</span>
                                <span>{new Date(board.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div
                      style={{
                        padding: '16px',
                        textAlign: 'center',
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        backgroundColor: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                        borderRadius: '12px',
                      }}
                    >
                      Aucun projet précédent dans cette discussion.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE TABLEAU BLANC COLLABORATIF 100% CANVAS (LAZY LOADED - PERSISTANT SOUS ROTATION) */}
      {isWhiteboardOpen && (activeChatObj || selectedChat) && (
        <Suspense fallback={null}>
          <CollaborativeWhiteboard
            isOpen={isWhiteboardOpen}
            onClose={() => {
              setIsWhiteboardOpen(false);
              setActiveWhiteboardVersion(null);
              setActiveWhiteboardBoardId(null);
            }}
            groupId={selectedChat?.id || activeChatObj?.id || activeChatObj?.firestoreId || 'group_whiteboard'}
            boardId={activeWhiteboardBoardId}
            workspaceId={activeWhiteboardBoardId}
            version={activeWhiteboardVersion}
            initialVersion={activeWhiteboardVersion}
            initialView={whiteboardInitialView}
            projectTitle={selectedChat?.projectTitle || activeChatObj?.projectTitle || activeChatObj?.user || 'Tableau Blanc Collaboratif'}
            currentUser={profile}
            darkMode={darkMode}
            onSendMessage={handleSendMessage}
            onSendToChat={(sentBoardId, version, msgPayload) => {
              if (typeof handleSendMessage === 'function' && msgPayload) {
                handleSendMessage(msgPayload);
              }
              if (typeof setChatInputText === 'function') setChatInputText('');
            }}
          />
        </Suspense>
      )}

      {/* MODALE NOTES PARTAGÉES COLLABORATIVES APPLE-STYLE (LAZY LOADED) */}
      {isSharedDocOpen && (activeChatObj || selectedChat) && (
        <Suspense fallback={null}>
          <SharedDocumentModal
            isOpen={isSharedDocOpen}
            onClose={() => {
              setIsSharedDocOpen(false);
              setActiveSharedDocId(null);
            }}
            groupId={activeChatObj?.id || activeChatObj?.firestoreId || selectedChat?.id || 'group_notes'}
            docId={activeSharedDocId || (activeChatObj?.id ? `doc-${activeChatObj.id}` : (selectedChat?.id ? `doc-${selectedChat.id}` : 'default_shared_doc'))}
            documentId={activeSharedDocId || (activeChatObj?.id ? `doc-${activeChatObj.id}` : (selectedChat?.id ? `doc-${selectedChat.id}` : 'default_shared_doc'))}
            projectTitle={activeChatObj?.projectTitle || activeChatObj?.user || selectedChat?.projectTitle || selectedChat?.user || 'Notes Partagées'}
            currentUser={profile}
            darkMode={darkMode}
            handleSendMessage={handleSendMessage}
            onSendToChat={(sentDocId, msgPayload) => {
              if (typeof handleSendMessage === 'function' && msgPayload) {
                handleSendMessage(msgPayload);
              }
              if (setChatInputText) setChatInputText('');
            }}
          />
        </Suspense>
      )}

      {/* MODALE SUITE OFFICE CLOUD & DOCS (LAZY LOADED) */}
      {isCloudOfficeOpen && (activeChatObj || selectedChat) && (
        <Suspense fallback={null}>
          <CloudOfficeSuiteModal
            isOpen={isCloudOfficeOpen}
            onClose={() => {
              setIsCloudOfficeOpen(false);
              setActiveOfficeDocId(null);
            }}
            groupId={activeChatObj?.id || activeChatObj?.firestoreId || selectedChat?.id || 'group_office'}
            docId={activeOfficeDocId || (activeChatObj?.id ? `doc-${activeChatObj.id}` : (selectedChat?.id ? `doc-${selectedChat.id}` : 'default_shared_doc'))}
            documentId={activeOfficeDocId || (activeChatObj?.id ? `doc-${activeChatObj.id}` : (selectedChat?.id ? `doc-${selectedChat.id}` : 'default_shared_doc'))}
            projectTitle={activeChatObj?.projectTitle || activeChatObj?.user || selectedChat?.projectTitle || selectedChat?.user || 'Suite Office Cloud'}
            currentUser={profile}
            darkMode={darkMode}
            initialTab={officeInitialTab}
          />
        </Suspense>
      )}

      {/* MODALE OUTILS PRO WORKSPACE (DRIVE, CALENDAR, REMOTE) (LAZY LOADED) */}
      {isWorkspaceToolsOpen && (activeChatObj || selectedChat) && (
        <Suspense fallback={null}>
          <ProjectWorkspaceToolsModal
            isOpen={isWorkspaceToolsOpen}
            onClose={() => setIsWorkspaceToolsOpen(false)}
            projectTitle={activeChatObj?.projectTitle || activeChatObj?.user || selectedChat?.projectTitle || selectedChat?.user || 'Projet Collaboratif'}
            groupId={activeChatObj?.id || activeChatObj?.firestoreId || selectedChat?.id || 'group_workspace'}
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
                fontSize: '19px',
                fontWeight: '600',
                color: 'var(--text-main)'
              }}>
                Supprimer la discussion
              </h3>
              <p style={{
                margin: 0,
                fontSize: '13px',
                lineHeight: 1.5,
                color: 'var(--text-secondary)'
              }}>
                Êtes-vous sûr de vouloir supprimer définitivement cette discussion ? L'historique sera perdu pour vous.
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

      {/* MODALE DE TRANSFERT DIRECT DE JETONS (🪙) — Portal pour échapper aux stacking contexts Framer Motion */}
      {isDirectTransferOpen && activeChatObj && (
        <Portal>
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
              zIndex: 999999,
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
                    onClick={(e) => { e.stopPropagation(); setDirectTokensCount(amt); }}
                    onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setDirectTokensCount(amt); }}
                    style={{
                      padding: '10px 4px',
                      borderRadius: '12px',
                      border: directTokensCount === amt ? '2px solid #F59E0B' : '1px solid var(--border-color)',
                      backgroundColor: directTokensCount === amt ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-subtle)',
                      color: directTokensCount === amt ? '#F59E0B' : 'var(--text-main)',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer',
                    }}
                  >
                    {amt} 🪙
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Message d'accompagnement (optionnel)..."
                value={transferComment}
                onChange={(e) => setTransferComment(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsDirectTransferOpen(false)}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    minHeight: '44px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-main)',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Annuler
                </button>

                <button
                  type="button"
                  disabled={isTransferringTokens || (profile?.trocoTokens || 0) < directTokensCount}
                  onClick={(e) => { e.stopPropagation(); handleExecuteDirectTokenTransfer(); }}
                  className="premium-button"
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    minHeight: '44px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                    color: '#FFFFFF',
                    fontSize: '12.5px',
                    fontWeight: '800',
                    cursor: (isTransferringTokens || (profile?.trocoTokens || 0) < directTokensCount) ? 'not-allowed' : 'pointer',
                    opacity: (profile?.trocoTokens || 0) < directTokensCount ? 0.5 : 1,
                    boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isTransferringTokens ? 'Transfert...' : `Envoyer ${directTokensCount} 🪙`}
                </button>
              </div>
            </div>
          </div>
        </Portal>
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

