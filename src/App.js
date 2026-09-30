import logger from './utils/logger';
import React, { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue, Suspense, useTransition } from 'react';
import { auth, db } from './firebase';
import { collection, doc, updateDoc, serverTimestamp, onSnapshot, query, orderBy, deleteDoc } from 'firebase/firestore';
import { TROCO_CATEGORIES } from './data/categoriesData';
import { subscribeTranslations } from './utils/translator';
import { useWebRTC } from './hooks/useWebRTC';
import { useTheme } from './contexts/ThemeContext';
import { playApplePaySound, playBetclicBalanceSound } from './utils/audioService';
import { useChatManager } from './hooks/useChatManager';
import { AppHeader, AppBottomNav } from './components/layout';
import { getSuggestedMedia, getSuggestedImage, getFallbackImage } from './utils/mediaHelpers';
import FeedRoute from './routes/FeedRoute';
import CommunityRoute from './routes/CommunityRoute';
import ChatRoute from './routes/ChatRoute';
import PostRoute from './routes/PostRoute';
import ProfileRoute from './routes/ProfileRoute';
import LegalRoutes from './routes/LegalRoutes';
import AppOverlays from './components/AppOverlays';
import FeedInteractions from './components/FeedInteractions';
import AppModalsOrchestrator from './components/AppModalsOrchestrator';
import ListingDetailModal from './components/ListingDetailModal';
import AppLoadingScreen from './components/AppLoadingScreen';
import { useFeedListings } from './hooks/useFeedListings';
import { useAuthSession } from './hooks/useAuthSession';
import { useNotifications } from './hooks/useNotifications';
import { useGlobalCalls } from './hooks/useGlobalCalls';
import { useGlobalMessages } from './hooks/useGlobalMessages';
import { usePayments } from './hooks/usePayments';
import { useAccountActions } from './hooks/useAccountActions';
import { safeVibrate } from './utils/haptics';
import AuthScreen from './features/auth/AuthScreen';
import { useAppNavigation } from './hooks/useAppNavigation';
import { useAppModals } from './hooks/useAppModals';
import { getCategoryLabel as getCategoryLabelUtil, formatStatus as formatStatusUtil, formatTokenCount as formatTokenCountUtil, formatCompensation as formatCompensationUtil } from './utils/formatters';
import { generateTags } from './utils/tagGenerator';
import {
  getChatMessageDisplayContent,
  getListingDisplayContent,
  getListingTitleTranslation,
} from './utils/translationHelpers';
import { LanguageContext } from './contexts/LanguageContext';
import { ConfirmProvider, useConfirm } from './hooks/useConfirm';
import ConfirmDialog from './components/ui/ConfirmDialog';
import { AnimatePresence } from 'framer-motion';
import {
  translations,
  localizeLocation,
  localizeTags,
} from './data/translationsData';
import { lookupCoordinatesDynamic } from './utils/geocodingNominatim';

import { useGlobalContent } from './features/admin/useGlobalContent';
import { notificationService } from './services/notificationService';
import { isIosOrTouchDevice } from './utils/deviceDetection';
import { useAdminGuard } from './hooks/useAdminGuard';
import adminService from './services/adminService';
import { useRateLimit } from './hooks/useRateLimit';
import { useSafeTimeout } from './hooks/useSafeTimeout';
import { useFirestoreHealth } from './hooks/useFirestoreHealth';
export { isIosOrTouchDevice };


const Footer = React.lazy(() => import('./components/Footer'));

// 🚨 PHASE 60 : STANDARDISATION DES TRANSITIONS GLOBAL FRAMER MOTION (Fade + Scale)
export const pageTransitionVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 }
};
export const pageTransitionConfig = { duration: 0.2, ease: "easeOut" };

export default function App() {
  const confirm = useConfirm();
  // Purge d'urgence pour réparer les écrans noirs sur mobile
  // (Bloc de purge supprimé — cassait la persistance localStorage)
  useFirestoreHealth();
  const {
    theme,
    isDark: darkMode,
    toggleTheme: toggleDarkMode,
  } = useTheme();

  // 🚨 PHASE 114 : DÉTECTION MATÉRIELLE TACTILE ROBUSTE (ZÉRO CANVAS / ZÉRO WEBGL SUR IOS & TACTILE)
  const isTouchDevice = isIosOrTouchDevice();

  const [isMobileDevice, setIsMobileDevice] = useState(() => isIosOrTouchDevice());
  const isMobile = isMobileDevice; // Rétrocompatibilité totale pour les composants enfants

  useEffect(() => {
    const handleResize = () => {
      setIsMobileDevice(isIosOrTouchDevice());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [currentLang, setCurrentLangState] = useState(() => {
    try {
      return localStorage.getItem('troco_language') || localStorage.getItem('troco_lang') || 'FR';
    } catch (_) {
      return 'FR';
    }
  });

  const setLang = useCallback((langCode) => {
    if (!langCode) return;
    const normalized = String(langCode).toUpperCase();
    setCurrentLangState(normalized);
    try {
      localStorage.setItem('troco_language', normalized);
      localStorage.setItem('troco_lang', normalized);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = normalized.toLowerCase();
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('languagechange', { detail: { lang: normalized } }));
      }
    } catch (_) { }
  }, []);

  const setCurrentLang = setLang;
  const changeLanguage = setLang;

  useEffect(() => {
    const handleLangChange = (e) => {
      const code = e.detail?.lang;
      if (code && code !== currentLang) {
        setCurrentLangState(code);
      }
    };
    window.addEventListener('languagechange', handleLangChange);
    return () => window.removeEventListener('languagechange', handleLangChange);
  }, [currentLang]);

  const [userCoords, setUserCoords] = useState([48.8566, 2.3522]); // Paris par défaut
  const [isGeolocated, setIsGeolocated] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const t = useCallback((key, defaultVal) => (translations?.[currentLang]?.[key]) || (translations?.['FR']?.[key]) || defaultVal || key, [currentLang]);

  const i18n = useMemo(() => ({
    language: currentLang,
    changeLanguage: setLang,
    t
  }), [currentLang, setLang, t]);

  const langContextValue = useMemo(() => ({
    currentLang,
    setCurrentLang: setLang,
    setLang,
    changeLanguage: setLang,
    t,
    i18n
  }), [currentLang, setLang, t, i18n]);

  const getCategoryLabel = useCallback((categoryKey, tFn = t) => getCategoryLabelUtil(categoryKey, tFn || t), [t]);
  const formatStatus = useCallback((st) => formatStatusUtil(st, t), [t]);
  // Stable : ne dépend que de currentLang, jamais de l'objet profile
  const formatTokenCount = useCallback((count, lang = currentLang) => formatTokenCountUtil(count, lang), [currentLang]);
  const formatCompensation = useCallback((comp) => formatCompensationUtil(comp, currentLang, t), [currentLang, t]);
  const [showingOriginalListings, setShowingOriginalListings] = useState({});
  const [showingOriginalMessages, setShowingOriginalMessages] = useState({});
  const mainContainerRef = useRef(null);
  const toggleOriginalMessage = (id) => setShowingOriginalMessages(prev => ({ ...prev, [id]: !prev[id] }));

  const toggleOriginalListing = useCallback((id, event) => {
    if (event) event.stopPropagation();
    setShowingOriginalListings(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }, []);


  // ---- GEOPRIVACY : FLOUTAGE ET TRONCATURE DE SÉCURITÉ DE LA POSITION GPS ----
  const fuzzCoordinates = (lat, lng) => {
    // Troncature de sécurité à 2 décimales (~1km) pour protéger la vie privée de l'utilisateur
    const fLat = Math.round(lat * 100) / 100;
    const fLng = Math.round(lng * 100) / 100;
    return [fLat, fLng];
  };

  const handleRequestGeolocation = () => {
    if (!navigator.geolocation) return;
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const fuzzed = fuzzCoordinates(position.coords.latitude, position.coords.longitude);
        setUserCoords(fuzzed);
        setIsGeolocated(true);
        setIsGeolocating(false);
      },
      () => {
        setIsGeolocating(false);
      },
      { enableHighAccuracy: false, timeout: 6000 }
    );
  };

  const {
    activeTab,
    setActiveTab,
    navigateToTab,
  } = useAppNavigation();

  const ui = useAppModals();
  const {
    selectedListing,
    setSelectedListing,
    selectedPublicUser,
    setSelectedPublicUser,
    selectedMapItem,
    setSelectedMapItem,
    editingOriginalListing,
    setEditingOriginalListing,
    isEditingListing,
    setIsEditingListing,
    boostingListing,
    setBoostingListing,
    boostMessage,
    setBoostMessage,
    isFilterDrawerOpen,
    setIsFilterDrawerOpen,
    isCategoryModalOpen,
    setIsCategoryModalOpen,
    isLangModalOpen,
    setIsLangModalOpen,
    viewMode,
    setViewMode,
    formatFilter,
    setFormatFilter,
    isKycModalOpen,
    setIsKycModalOpen,
    isAdminPanelOpen,
    setIsAdminPanelOpen,
    isGodModeActive,
    setIsGodModeActive,
    isReportModalOpen,
    setIsReportModalOpen,
    reportTarget,
    setReportTarget,
    isPaymentModalOpen,
    setIsPaymentModalOpen,
    paymentModalConfig,
    setPaymentModalConfig,
    isTransactionsModalOpen,
    setIsTransactionsModalOpen,
    isPrivacyCenterOpen,
    setIsPrivacyCenterOpen,
    isCguViewerOpen,
    setIsCguViewerOpen,
    isBoostModalOpen,
    setIsBoostModalOpen,
  } = ui;

  // Session, authentification et profil utilisateur (Hook centralisé useAuthSession)
  const {
    profile,
    setProfile,
    profileDraft,
    setProfileDraft,
    isEditingProfile,
    setIsEditingProfile,
    isAuthenticated,
    setIsAuthenticated,
    isAuthResolved,
    isLoadingSession,
    isProfileLoading,
    isUserBanned,
    bannedReason,
    skills,
    setSkills,
    equipment,
    setEquipment,
    cguDismissed,
    setCguDismissed,
    cguBypassRef,
    topUpCelebration,
    setTopUpCelebration,
    isOnboardingOpen,
    setIsOnboardingOpen,
    isWelcomeGiftModalOpen,
    setIsWelcomeGiftModalOpen,
    setSaveMessage,
    pendingEmailLinkHref,
    handleConfirmEmailLink,
    handleCancelEmailLink,
    handleKycComplete,
  } = useAuthSession({
    activeTab,
    onLogoutCleanup: () => {
      if (typeof setSelectedChat === 'function') setSelectedChat(null);
      if (typeof setSelectedListing === 'function') setSelectedListing(null);
    },
  });

  const { isAdmin } = useAdminGuard();

  // Hook pour gérer les timeouts en toute sécurité
  const { safeTimeout } = useSafeTimeout();

  const [portfolioImages, setPortfolioImages] = useState(() => profile?.portfolioImages || []);
  const [mapCenter, setMapCenter] = useState([48.8566, 2.3522]);
  const [mapZoom, setMapZoom] = useState(4);
  const [allReports, setAllReports] = useState([]);
  const [allFirestoreUsers, setAllFirestoreUsers] = useState([]);
  const [isPending, startTransition] = useTransition();

  const mapContainerRef = useRef(null);
  const handleSwitchToMap = () => {
    setViewMode('map');
    setIsInfiniteRadius(true);
    setTimeout(() => {
      if (mapContainerRef.current) {
        mapContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 60);
  };

  const categoryScrollRef = useRef(null);
  const scrollCategories = (direction) => {
    if (categoryScrollRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      categoryScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // CMS & Textes Globaux en direct
  const globalAnnouncement = useGlobalContent('platform_announcement');
  // eslint-disable-next-line no-unused-vars
  const globalWelcomeMsg = useGlobalContent('welcome_message');

  // Transactions et notifications temps réel (Hook centralisé useNotifications)
  const {
    userTransactions,
    setUserTransactions,
    transactionSuccessModalConfig,
    setTransactionSuccessModalConfig,
    handleCloseTransactionSuccessModal,
  } = useNotifications({ profile });

  // Handler d'ouverture du module de paiement
  const handleOpenPayment = useCallback((mode = 'pack-tokens', payload = null) => {
    setPaymentModalConfig({ mode, payload });
    setIsPaymentModalOpen(true);
  }, [setIsPaymentModalOpen, setPaymentModalConfig]);

  // ---- MOTEUR CHAT, NÉGOCIATIONS & DEALS (HOOK EXTRAIT PHASE 4) ----
  const chatManager = useChatManager({
    profile,
    setProfile,
    auth,
    db,
    setUserTransactions,
    handleOpenPayment,
    activeTab,
    setActiveTab,
    setSelectedListing,
    setSaveMessage,
    onTransactionSuccess: (config) => {
      setTransactionSuccessModalConfig({
        isOpen: true,
        type: config.type || 'sent',
        amount: config.amount,
        currency: config.currency || 'tokens',
        partnerName: config.partnerName || '',
        notificationId: null,
      });
    },
  });

  const {
    selectedChat,
    setSelectedChat,
    readChats,
    messageDraft,
    setMessageDraft,
    chatThreads,
    chatsList,
    editingDealId,
    setEditingDealId,
    counterOfferDraft,
    isCounterOfferOpen,
    setIsCounterOfferOpen,
    presenceMap,
    unreadCount,
    handleSelectChat,
    handleTypingChange,
    handleSendMessage,
    handleEditMessage,
    handleDeleteMessage,
    handleSendAudioMessage,
    handleStartDiscussion,
    handleCreateProjectGroup,
    handleProposeReward,
    handleAcceptReward,
    openCounterOffer,
    handleCounterOfferSubmit,
    handleReleaseEscrow,
    handleAcceptDeal,
    handleConfirmTrocCompletion,
    handleDeclineDeal,
    handleSendToken,
  } = chatManager;

  const switchTab = useCallback((newTab) => {
    safeVibrate(10);
    startTransition(() => {
      setActiveTab(newTab);
      if (newTab !== 'chat') {
        setSelectedChat(null);
      }
      if (typeof setSelectedPublicUser === 'function') {
        setSelectedPublicUser(null);
      }
      if (typeof setSelectedListing === 'function') {
        setSelectedListing(null);
      }
    });
  }, [setActiveTab, setSelectedChat, setSelectedPublicUser, setSelectedListing, startTransition]);

  // ---- PAIEMENTS & CHECKOUT (HOOK CENTRALISÉ) ----
  const {
    handlePaymentSuccess,
    checkoutSession,
    openCheckout,
    cancelCheckout,
    applyCheckout,
    isCheckoutProcessing,
    checkoutStatus,
  } = usePayments({
    profile,
    setProfile,
    setTopUpCelebration,
    setSaveMessage,
    setListings,
    setBoostMessage,
    isEditingListing,
    setIsEditingListing,
    editingOriginalListing,
    setEditingOriginalListing,
    setPublishedListing,
    setShowPublishedPopup,
    setSelectedListing,
    setPostStep,
    setPostDraft,
    defaultPostDraft,
    selectedChat,
    setUserTransactions,
    userTransactions,
    getListingDetail,
  });

  // ---- RATE LIMITING & APP CHECK PROTECTION ----
  const { isRateLimited, retryAfterSeconds, checkLimit, resetRateLimit } = useRateLimit();

  // ---- ÉCOUTE TEMPS RÉEL DES SIGNALEMENTS (MODÉRATION ADMIN - GATED ISADMIN) ----
  useEffect(() => {
    if (!isAdmin) {
      setAllReports([]);
      return;
    }
    try {
      const qReports = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(qReports, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllReports(list);
      }, (err) => logger.warn('[Firestore] Reports listener:', err));
      return () => unsub();
    } catch (e) {
      logger.warn('Reports listener setup error:', e);
    }
  }, [isAdmin]);

  // Handlers actions administrateur (via Cloud Functions sécurisées Custom Claims)
  // eslint-disable-next-line no-unused-vars
  const handleAdminUpdateUser = async (uid, updates) => {
    if (!uid) return;
    try {
      await adminService.updateUserAsAdmin(uid, updates);
      setAllFirestoreUsers(prev => prev.map(u => (u.uid === uid || u.id === uid) ? { ...u, ...updates } : u));
    } catch (err) {
      logger.warn('[Admin] handleAdminUpdateUser error:', err);
      setAllFirestoreUsers(prev => prev.map(u => (u.uid === uid || u.id === uid) ? { ...u, ...updates } : u));
    }
  };

  const handleAdminDeleteListing = async (listingOrId) => {
    if (!listingOrId) return;
    const targetId = typeof listingOrId === 'object' ? listingOrId.id : listingOrId;
    const firestoreId = typeof listingOrId === 'object' && listingOrId.firestoreId
      ? listingOrId.firestoreId
      : listings.find(l => String(l.id) === String(targetId))?.firestoreId || String(targetId);

    // Mise à jour optimiste du feed
    setListings(prev => prev.filter(l => String(l.id) !== String(targetId)));

    try {
      if (firestoreId) {
        await adminService.deleteListingAsAdmin(String(firestoreId), 'Suppression par modérateur');
      }
    } catch (err) {
      logger.warn('[Admin] handleAdminDeleteListing error:', err);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleAdminResolveReport = async (reportId, status = 'resolved', resolution = '') => {
    if (!reportId) return;
    try {
      await adminService.resolveReport(reportId, status, resolution);
      setAllReports(prev => prev.map(r => r.id === reportId ? { ...r, status, resolution } : r));
    } catch (err) {
      logger.warn('[Admin] handleAdminResolveReport error:', err);
      setAllReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r));
    }
  };

  // ---- RÉINITIALISATION SÉCURISÉE D'UN UTILISATEUR (CLOUD FUNCTION RESET ADMIN) ----
  // eslint-disable-next-line no-unused-vars
  const handleAdminResetUser = async (uid, userData = null, preserveWallet = true) => {
    if (!uid) return;
    try {
      const userName = userData?.name || allFirestoreUsers.find(u => u.uid === uid || u.id === uid)?.name;

      // Appel à la Cloud Function sécurisée avec préservation du wallet par défaut
      const result = await adminService.resetUserSafely(uid, preserveWallet);
      const newProfileData = result?.newProfile || {
        dealsCompleted: 0,
        dealsInProgress: 0,
        skills: [],
        equipment: [],
        bio: 'Nouvel utilisateur sur Troco ! Prêt à partager mes compétences et échanger des services.',
        kycVerified: false,
        onboardingCompleted: false,
        hasClaimedWelcomeGift: false,
        isBanned: false,
        isShadowBanned: false,
      };

      // Suppression des annonces de l'utilisateur en local
      setListings(prev => prev.filter(l =>
        !(l.userId && String(l.userId) === String(uid)) &&
        !(userName && l.author === userName)
      ));

      // Mise à jour de la liste locale des utilisateurs
      setAllFirestoreUsers(prev => prev.map(u => (u.uid === uid || u.id === uid) ? { ...u, ...newProfileData } : u));

      // Si c'est l'utilisateur courant, mise à jour de son profil local
      if (profile?.uid === uid || auth.currentUser?.uid === uid) {
        setProfile(prev => ({
          ...prev,
          ...newProfileData,
        }));
        setSkills([]);
        setEquipment([]);
        try {
          localStorage.removeItem('troco_onboarding_completed');
          localStorage.removeItem('troco_welcome_gift_claimed');
        } catch (_) { }
      }

      const walletMsg = preserveWallet ? ' (portefeuille et jetons préservés)' : ' (solde remis à zéro)';
      alert(`✅ Le profil ${userName || uid} a été réinitialisé avec succès${walletMsg}.`);
    } catch (err) {
      logger.warn('[Admin] handleAdminResetUser error:', err);
      alert(`Erreur lors de la réinitialisation du profil : ${err.message}`);
    }
  };

  const handleAdminEditListing = (listing) => {
    setIsAdminPanelOpen(false);
    handleStartEditListing(listing);
  };

  // ---- ÉCOUTE ET RÉACTUALISATION EN TEMPS RÉEL DES TRADUCTIONS DYNAMIQUES ----
  const [translationRevision, setTranslationRevision] = useState(0);
  useEffect(() => {
    const unsub = subscribeTranslations(() => {
      setTranslationRevision(r => r + 1);
    });
    return () => unsub();
  }, []);


  // État d'édition profil initialisé plus haut
  const [categoryInput, setCategoryInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [customCategories, setCustomCategories] = useState([]);
  const [radiusKm, setRadiusKm] = useState(20);
  const [isInfiniteRadius, setIsInfiniteRadius] = useState(true);
  const [hideDemos, setHideDemos] = useState(() => {
    try {
      return localStorage.getItem('troco_hide_demos') === 'true';
    } catch (_) {
      return false;
    }
  });
  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [hoverSlideIndex, setHoverSlideIndex] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem('troco_hide_demos', String(hideDemos));
    } catch (_) { }
  }, [hideDemos]);

  // Verrouillage absolu du scroll global dans l'onglet Chat (comportement application native iOS)
  useEffect(() => {
    if (activeTab === 'chat' && selectedChat) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalDocOverflow = document.documentElement.style.overflow;
      const originalTouchAction = document.body.style.touchAction;

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalDocOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [activeTab, selectedChat]);

  useEffect(() => {
    if (viewMode === 'map') {
      setIsInfiniteRadius(true);
    }
  }, [viewMode]);

  useEffect(() => {
    if (!hoveredCardId) {
      setHoverSlideIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setHoverSlideIndex(prev => (prev + 1) % 3);
    }, 1600);
    return () => clearInterval(interval);
  }, [hoveredCardId]);

  const [selectedLanguages, setSelectedLanguages] = useState(['FR', 'EN']);
  const [selectedPayment, setSelectedPayment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(debouncedSearchQuery);

  // ---- DÉBOUNCE 600MS SUR LA RECHERCHE (Évite tout freeze du thread JS) ----
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 600);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const [postStep, setPostStep] = useState(1);
  const [publishMessage, setPublishMessage] = useState('');

  const defaultPostDraft = {
    type: 'offer',
    status: 'active',
    title: '',
    category: '',
    customCategoryName: '',
    format: 'onsite',
    description: '',
    compensation: 'credits',
    durationType: 'hourly',
    durationValue: '1',
    price: '20',
    location: '',
    availability: '',
    caution: '',
    requiresCaution: false,
    cautionAmount: '',
    trocoTokens: '1',
    euroAmount: '',
    isUrgent: false,
    locationPrivacy: 'exact',
    coordinates: null,
    image: '',
    imageUrl: '',
    videoUrl: '',
  };
  const [postDraft, setPostDraft] = useState(defaultPostDraft);
  const [showPublishedPopup, setShowPublishedPopup] = useState(false);
  const [publishedListing, setPublishedListing] = useState(null);


  const [communityProfileUser, setCommunityProfileUser] = useState(null);
  const [isCommunityProfileOpen, setIsCommunityProfileOpen] = useState(false);

  // ---- GESTION WEBRTC AUDIO/VIDÉO & APPELS TEMPS RÉEL (SIGNALISATION FIRESTORE) ----
  const {
    callState,
    localStream,
    remoteStream,
    incomingCall,
    facingMode,
    hasMultipleCameras,
    switchCamera,
    startCall,
    joinActiveCall,
    acceptIncomingCall,
    declineIncomingCall,
    endCall,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    hostMuteParticipant,
    hostStopParticipantScreenShare,
    copyInviteLink,
    playRingtone,
    stopRingtone,
  } = useWebRTC({ profileName: profile?.name || 'Membre', profileUid: profile?.uid || (auth.currentUser && auth.currentUser.uid), selectedChat });

  // ---- APPELS ENTRANTS & WEBRTC RACINE (HOOK CENTRALISÉ) ----
  const {
    activeIncomingCall,
    attachLocalStream,
    attachRemoteStream,
    handleAcceptIncomingCall,
    handleDeclineIncomingCall,
    isCallPip,
    setIsCallPip,
    pipPosition,
    setPipPosition,
    handlePipPointerDown,
    handlePipPointerMove,
    handlePipPointerUp,
    handlePipPointerCancel,
    handlePipContentClick,
    callDuration,
    formatCallTimer,
    isSettlementModalOpen,
    setIsSettlementModalOpen,
    settlementCallDuration,
    setSettlementCallDuration,
    handleTransferCallTokens,
  } = useGlobalCalls({
    profile,
    setProfile,
    incomingCall,
    localStream,
    remoteStream,
    callState,
    acceptIncomingCall,
    declineIncomingCall,
    playRingtone,
    stopRingtone,
    chatsList,
    setSelectedChat,
    selectedChat,
    setUserTransactions,
    setTransactionSuccessModalConfig,
    setSaveMessage,
    safeTimeout,
  });

  // ---- MESSAGES GLOBAUX & NOTIFICATIONS ARRIÈRE-PLAN (HOOK CENTRALISÉ) ----
  useGlobalMessages({
    profile,
    activeTab,
    selectedChat,
    chatsList,
    setSelectedChat,
    setActiveTab,
  });

  // ---- ACTIONS COMPTE UTILISATEUR & RGPD (HOOK CENTRALISÉ) ----
  const {
    handleDeleteAccount,
    handleAcceptCgu,
    handleCompleteOnboarding,
    handleSignOut,
  } = useAccountActions({
    profile,
    setProfile,
    setProfileDraft,
    setSkills,
    setEquipment,
    setCguDismissed,
    setSaveMessage,
    setIsOnboardingOpen,
    setIsWelcomeGiftModalOpen,
    setIsAuthenticated,
    setSelectedChat,
    setSelectedListing,
    endCall,
  });

  // État de gestion tactile d'annonce mobile (Chantier 4)
  const [mobileListingActionTarget, setMobileListingActionTarget] = useState(null);
  // ---- RÉSOLUTION DE L'AVATAR AUTEUR (RÉEL ET ZERO-TRUST SANS PERSONAS IA) ----
  const getAuthorAvatar = useCallback((name) => {
    if (!name) return '';
    if (name === 'mateo polo' || name === 'MATEO POLO') {
      return 'https://lh3.googleusercontent.com/a/ACg8ocIxtR4V0MC_bzMwDLpCRzELbs1U2srgbci0vXHXKoxwpo7inhpG4g=s96-c';
    }
    return '';
  }, []);

  // ---- COORDONNÉES GPS RÉELLES ET RÉSOLUTION MONDIALE (GÉOLOCALISATION DYNAMIQUE OPENSTREETMAP) ----
  const locationCoordsCacheRef = useRef(new Map());

  const getCoordinatesForLocation = useCallback((location = '') => {
    if (!location) return [48.8566, 2.3522];
    const locKey = String(location).trim().toLowerCase();
    if (locationCoordsCacheRef.current.has(locKey)) {
      return locationCoordsCacheRef.current.get(locKey);
    }

    // Déclenchement de la résolution asynchrone OpenStreetMap Nominatim
    lookupCoordinatesDynamic(locKey).then(coords => {
      if (coords && Array.isArray(coords) && coords.length >= 2) {
        locationCoordsCacheRef.current.set(locKey, coords);
      }
    }).catch(() => { });

    // Décalage déterministe pour rendu immédiat fluide sans blocage
    const match = String(location).match(/(\d+(?:\.\d+)?)\s*km/i);
    const dist = match ? parseFloat(match[1]) : 3.0;
    const angle = (dist * 137.5) * (Math.PI / 180);
    const latOffset = (dist / 111) * Math.cos(angle);
    const lngOffset = (dist / (111 * Math.cos(48.8566 * Math.PI / 180))) * Math.sin(angle);
    const approx = [48.8566 + latOffset, 2.3522 + lngOffset];
    locationCoordsCacheRef.current.set(locKey, approx);
    return approx;
  }, []);

  // ---- MODÉRATION ADMINISTRATEUR ----

  const handleAdminToggleHideListing = async (listing) => {
    if (!listing) return;
    const newHidden = !listing.isHidden;
    const targetId = String(listing.firestoreId || listing.id);

    // Mise à jour locale optimiste
    setListings(prev => prev.map(l => l.id === listing.id ? { ...l, isHidden: newHidden } : l));

    try {
      await adminService.toggleHideListingAsAdmin(targetId, newHidden);
      setSaveMessage(newHidden ? `🚫 Annonce #${listing.id} masquée du feed public` : `👁️ Annonce #${listing.id} visible`);
      safeTimeout(() => setSaveMessage(''), 4000);
    } catch (err) {
      logger.warn('[Admin] toggle hide error via Cloud Function:', err);
      setSaveMessage(`❌ Erreur : Échec du masquage de l'annonce #${listing.id} (${err?.message || 'Erreur réseau'})`);
      safeTimeout(() => setSaveMessage(''), 4000);
      // Rollback de la mise à jour locale
      setListings(prev => prev.map(l => l.id === listing.id ? { ...l, isHidden: !newHidden } : l));
    }
  };

  const userSwapHistory = Array.isArray(profile?.swapHistory) ? profile.swapHistory : [];
  const ratedEntries = userSwapHistory.filter(entry => entry.rating);
  const averageRating = ratedEntries.length
    ? (ratedEntries.reduce((sum, entry) => sum + entry.rating, 0) / ratedEntries.length).toFixed(1)
    : (profile?.rating ? Number(profile.rating).toFixed(1) : '—');

  const baseCategories = ['Tous', ...TROCO_CATEGORIES.filter(c => c.id !== 'all').map(c => c.label)];
  const allCategories = [...baseCategories, ...customCategories];

  const handleAddCategory = () => {
    const value = categoryInput.trim();
    if (!value) return;
    setCustomCategories(prev => [...prev, value]);
    setSelectedCategory(value);
    setCategoryInput('');
    setIsCategoryModalOpen(false);
  };

  const toggleLanguageFilter = (language) => {
    setSelectedLanguages(prev => prev.includes(language) ? prev.filter(item => item !== language) : [...prev, language]);
  };

  const paymentOptions = ['all', 'credits', 'cash', 'troc', 'hybrid'];
  const paymentLabels = { all: t('paymentAll') || t('all') || 'Tous', credits: t('paymentCredits') || 'Crédits', cash: t('paymentCash') || 'Cash', troc: t('paymentTroc') || 'Troc', hybrid: t('paymentHybrid') || 'Hybride' };

  // ---- FLUX D'ANNONCES & FILTRAGE DU FEED (HOOK CENTRALISÉ) ----
  const {
    listings,
    setListings,
    filteredListings,
    hasMoreListings,
    isLoadingMoreListings,
    loadMoreSentinelRef,
    handleLoadMoreListings,
    handleRefreshFeed,
  } = useFeedListings({
    profile,
    authCurrentUserUid: auth.currentUser?.uid,
    activeTab,
    hideDemos,
    deferredSearchQuery,
    debouncedSearchQuery,
    selectedCategory,
    selectedLanguages,
    selectedPayment,
    formatFilter,
    userCoords,
    isInfiniteRadius,
    radiusKm,
    currentLang,
    allFirestoreUsers,
    setAllFirestoreUsers,
  });

  const listingsGridRef = useRef(null);

  const getListingDetail = useCallback((listing) => {
    const media = getSuggestedMedia(listing.title, listing.description || '', listing.image, listing.video);
    const isCurrentUser = Boolean(
      listing.author === profile?.name ||
      (listing.authorUid && (listing.authorUid === profile?.uid || listing.authorUid === auth.currentUser?.uid))
    );

    // Détermination stricte des avis légitimes (zéro avis artificiel si 0 transaction complétée)
    let authorReviews = [];
    if (isCurrentUser) {
      const closedDealsWithReviews = (profile?.swapHistory || [])
        .filter(entry => entry.status === 'Clôturé' && (entry.review || entry.rating != null));
      if (closedDealsWithReviews.length > 0) {
        authorReviews = closedDealsWithReviews.map(d => ({
          rating: d.rating || 5,
          text: d.review || 'Transaction complétée avec succès.'
        }));
      }
    } else if (Array.isArray(listing.authorReviews) && listing.authorReviews.length > 0) {
      authorReviews = listing.authorReviews;
    } else {
      authorReviews = [];
    }

    const hasRealReviews = authorReviews.length > 0;
    const computedRating = hasRealReviews
      ? (listing.rating || (isCurrentUser && averageRating !== '—' ? Number(averageRating) : (listing.rating != null ? Number(listing.rating) : null)))
      : null;
    const computedReviewsCount = hasRealReviews
      ? (isCurrentUser ? authorReviews.length : (listing.reviews || authorReviews.length))
      : 0;

    const authorPortfolio = isCurrentUser
      ? (portfolioImages && portfolioImages.length > 0 ? portfolioImages : (profile?.portfolioImages || profile?.portfolio || []))
      : (listing.portfolio || listing.authorProfile?.portfolio || []);

    const generic = {
      id: listing.id,
      isBoosted: listing.isBoosted || false,
      title: listing.title,
      description: listing.description || 'Ce service combine flexibilité, qualité de partage et une vraie expérience premium. Le créateur a déjà accompagné plusieurs personnes dans des échanges rapides et fiables.',
      image: media.image,
      video: media.video,
      gallery: media.gallery,
      wallet: listing.wallet || { euros: 0, tokens: 0 },
      tags: generateTags(listing.title, listing.description || ''),
      compensation: listing.compensation,
      nativeLang: listing.nativeLang || 'FR',
      translations: listing.translations || {},
      rating: computedRating,
      reviews: computedReviewsCount,
      authorProfile: {
        name: listing.author,
        avatar: isCurrentUser ? profile.avatar : (listing.authorAvatar || listing.avatar || listing.authorPhotoURL || getAuthorAvatar(listing.author)),
        bio: isCurrentUser ? profile.bio : 'Créateur de contenus, expert en échange de services et passionné de communautés locales.',
        socials: isCurrentUser ? (profile.socials || []) : ['LinkedIn', 'Instagram'],
        portfolio: authorPortfolio,
        reviews: authorReviews,
      },
    };

    return generic;
  }, [profile, portfolioImages, averageRating, getAuthorAvatar]);

  const handleOpenListing = useCallback((listing) => {
    setSelectedListing(getListingDetail(listing));
  }, [getListingDetail, setSelectedListing]);

  const handleViewOnMap = (listing) => {
    if (!listing) return;
    const coords = listing.coordinates || getCoordinatesForLocation(listing.location);
    if (!coords || !Array.isArray(coords) || coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) return;
    setMapCenter(coords);
    setMapZoom(15);
    setViewMode('map');
    setActiveTab('feed');
    setSelectedListing(null);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 80);
  };

  const handleDeleteListing = async (id) => {
    const ok = await confirm({
      title: t('confirmDeleteTitle') || 'Supprimer cette annonce ?',
      message: t('confirmDeleteText') || 'Cette action est irréversible.',
      confirmLabel: t('delete') || 'Supprimer',
      cancelLabel: t('cancel') || 'Annuler',
      variant: 'danger',
    });
    if (ok) {
      const targetListing = listings.find(item => item.id === id);
      setListings(prev => prev.filter(item => item.id !== id));
      if (targetListing?.firestoreId) {
        try {
          await deleteDoc(doc(db, 'listings', String(targetListing.firestoreId)));
        } catch (e) {
          logger.warn('[Firestore] deleteDoc failed:', e);
        }
      }
      setMobileListingActionTarget(null);
      if (selectedListing?.id === id) {
        setSelectedListing(null);
      }
    }
  };

  const handleTogglePauseListing = async (id) => {
    const listingToUpdate = listings.find(item => item.id === id);
    if (!listingToUpdate) return;

    const newStatus = listingToUpdate.status === 'paused' ? 'active' : 'paused';
    const firestoreId = listingToUpdate.firestoreId || String(id);

    const previousListings = [...listings];
    setListings(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));

    try {
      await updateDoc(doc(db, 'listings', firestoreId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      setListings(previousListings);
      notificationService.show({
        title: 'Erreur',
        message: 'Impossible de mettre à jour le statut de l\'annonce',
        icon: 'error',
        duration: 3000,
      });
    }
  };

  const handleStartEditListing = (listing) => {
    setIsEditingListing(true);
    setEditingOriginalListing(listing);
    setPostDraft({
      ...listing,
      title: listing.title || '',
      description: listing.description || '',
      category: listing.category || 'Cours & Compétences',
      location: listing.location || '',
      imageUrl: listing.image || listing.imageUrl || '',
      videoUrl: listing.video || listing.videoUrl || '',
      videoTrimStart: Number(listing.videoTrimStart || listing.videoMetadata?.trimStart || 0),
      videoTrimEnd: Number(listing.videoTrimEnd || listing.videoMetadata?.trimEnd || 0),
      cropRatio: listing.cropRatio || listing.videoMetadata?.cropRatio || '16:9',
      videoMetadata: listing.videoMetadata || null,
      status: listing.status || 'active',
      caution: listing.caution || '',
      cautionAmount: listing.cautionAmount || '',
      requiresCaution: !!listing.cautionAmount || (typeof listing.caution === 'string' && listing.caution.includes('Caution')),
      isUrgent: !!listing.urgent,
      tags: listing.tags || [],
    });
    setPostStep(1);
    setActiveTab('post');
  };

  const handleBoostListing = (listing) => {
    handleOpenPayment('boost', listing);
  };

  const confirmBoostListing = () => {
    if (!boostingListing) return;
    const target = boostingListing;
    setIsBoostModalOpen(false);
    setBoostingListing(null);
    setBoostMessage('');
    handleOpenPayment('boost', target);
  };


  if (!isAuthResolved || isLoadingSession || (isAuthenticated && isProfileLoading)) {
    return <AppLoadingScreen isTouchDevice={isTouchDevice} isMobileDevice={isMobileDevice} />;
  }

  if (!isAuthenticated) {
    return (
      <LanguageContext.Provider value={langContextValue}>
        <ConfirmProvider>
          <AuthScreen
            setProfile={setProfile}
            setIsAuthenticated={setIsAuthenticated}
            setProfileDraft={setProfileDraft}
            setSkills={setSkills}
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
          />
          <ConfirmDialog />
        </ConfirmProvider>
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={langContextValue}>
      <ConfirmProvider>
        <div style={{
        backgroundColor: 'var(--bg-global)',
        color: 'var(--text-main)',
        minHeight: '100vh',
        height: 'auto',
        display: 'block',
        overflowX: 'hidden',
        transition: 'background-color 0.3s ease, color 0.3s ease',
        paddingBottom: activeTab === 'chat' ? '0' : '90px',
        position: 'relative',
        fontFamily: 'var(--font-family-main)'
      }}>
        {/* OVERLAYS, BANNIÈRES & ARRIÈRE-PLANS (TDIF-01E) */}
        <AppOverlays
          darkMode={darkMode}
          isTouchDevice={isTouchDevice}
          isMobileDevice={isMobileDevice}
          isPending={isPending}
          setIsPrivacyCenterOpen={setIsPrivacyCenterOpen}
          setActiveTab={setActiveTab}
        />
        <style>{`
        * { box-sizing: border-box; }
        .premium-main { animation: fadeSlideUp 0.5s cubic-bezier(0.19, 1, 0.22, 1) both; }
        .premium-card, .premium-nav-btn, .premium-pill, .premium-panel, .premium-button {
          transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1);
        }
        .premium-card { border-radius: 20px !important; }
        .premium-card:hover {
          transform: translateY(-4px) scale(1.02) !important;
          box-shadow: var(--shadow-card), 0 12px 28px rgba(0, 0, 0, 0.09) !important;
        }
        .premium-button:hover, .premium-nav-btn:hover, .premium-pill:hover, .premium-panel:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: var(--shadow-accent), 0 8px 20px rgba(0, 0, 0, 0.08);
        }
        .premium-button:active, .premium-nav-btn:active, .premium-pill:active {
          transform: scale(0.98) translateY(0);
        }
        .glass-surface {
          background: var(--bg-glass);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes popIn {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(214,69,110,0.35); }
          50% { box-shadow: 0 0 0 6px rgba(214,69,110,0); }
        }
        @keyframes pulseRing {
          0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.35); }
          70% { box-shadow: 0 0 0 16px rgba(255,255,255,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
        }
        @keyframes soundWave {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
        .sponsored-badge { animation: pulseGlow 2s ease-in-out infinite; }
        .call-ring { animation: pulseRing 1.8s ease-out infinite; }
        .wave-bar {
          width: 4px; border-radius: 999px; background: var(--accent-primary);
          animation: soundWave 1.1s ease-in-out infinite;
        }
        input, select, textarea { font-family: inherit; }
      `}</style>



        {/* HEADER FIXE GLASSMORPHISM FLUIDE AVEC CONDENSATION AU SCROLL */}
        <AppHeader
          isMobile={isMobile}
          activeTab={activeTab}
          selectedChat={selectedChat}
          callState={callState}
          endCall={endCall}
          setActiveTab={switchTab}
          setSelectedListing={setSelectedListing}
          setSelectedChat={setSelectedChat}
          handleOpenPayment={handleOpenPayment}
          profile={profile}
          toggleDarkMode={toggleDarkMode}
          darkMode={darkMode}
          setIsLangModalOpen={setIsLangModalOpen}
          currentLang={currentLang}
          t={t}
          formatTokenCount={formatTokenCount}
        />

        {/* BACKDROP_CLASSNAME BACKDROP_STYLE z-[100005] (Conformité Phase 138 UX-02 déléguée à ListingDetailModal) */}
        {selectedListing && (
          <ListingDetailModal
            listing={selectedListing}
            onClose={() => setSelectedListing(null)}
            isMobile={isMobile}
            darkMode={darkMode}
            currentLang={currentLang}
            t={t}
            profile={profile}
            showingOriginalListings={showingOriginalListings}
            toggleOriginalListing={toggleOriginalListing}
            handleViewOnMap={handleViewOnMap}
            handleStartDiscussion={handleStartDiscussion}
            setReportTarget={setReportTarget}
            setIsReportModalOpen={setIsReportModalOpen}
            formatCompensation={formatCompensation}
            isAdmin={isAdmin}
            handleAdminDeleteListing={handleAdminDeleteListing}
            confirm={confirm}
          />
        )}

        {/* CONTENU DYNAMIQUE SELON L'ONGLET SÉLECTIONNÉ */}
        <main
          ref={mainContainerRef}
          className={`premium-main ${activeTab === 'chat' ? 'chat-mode' : ''}`}
          style={{
            maxWidth: activeTab === 'feed' ? '1460px' : '1240px',
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box',
            display: (activeTab === 'chat' || activeTab === 'community') ? 'flex' : 'block',
            flexDirection: (activeTab === 'chat' || activeTab === 'community') ? 'column' : 'initial',
            overflow: (activeTab === 'chat' || activeTab === 'community') ? 'hidden' : 'visible',
            height: activeTab === 'chat'
              ? (isMobile ? (selectedChat ? '100dvh' : 'calc(100dvh - 125px)') : 'calc(100vh - 138px)')
              : (activeTab === 'community'
                ? (isMobile ? 'calc(100dvh - 56px - 65px - env(safe-area-inset-bottom, 0px))' : 'calc(100vh - 138px)')
                : 'auto'),
            maxHeight: activeTab === 'chat'
              ? (isMobile ? (selectedChat ? '100dvh' : 'calc(100dvh - 125px)') : 'calc(100vh - 138px)')
              : (activeTab === 'community'
                ? (isMobile ? 'calc(100dvh - 56px - 65px - env(safe-area-inset-bottom, 0px))' : 'calc(100vh - 138px)')
                : 'none'),
            padding: activeTab === 'chat'
              ? (isMobile ? (selectedChat ? '0' : '0 6px') : '14px 16px 0 16px')
              : (activeTab === 'community'
                ? (isMobile ? '8px 10px 0 10px' : '14px 16px 0 16px')
                : (isMobile ? '12px 12px 90px' : '20px 20px 90px')),
            transition: 'max-width 0.3s ease'
          }}
        >

          <AnimatePresence mode="wait">
            {/* ONGLET 1 : EXPLORER / FEED */}
            {activeTab === 'feed' && (
              <FeedRoute
                globalAnnouncement={globalAnnouncement}
                darkMode={darkMode}
                theme={theme}
                isMobile={isMobile}
                currentLang={currentLang}
                t={t}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                deferredSearchQuery={deferredSearchQuery}
                isInfiniteRadius={isInfiniteRadius}
                setIsInfiniteRadius={setIsInfiniteRadius}
                radiusKm={radiusKm}
                setRadiusKm={setRadiusKm}
                setIsFilterDrawerOpen={setIsFilterDrawerOpen}
                setSelectedLanguages={setSelectedLanguages}
                setSelectedPayment={setSelectedPayment}
                formatFilter={formatFilter}
                setFormatFilter={setFormatFilter}
                viewMode={viewMode}
                setViewMode={setViewMode}
                handleSwitchToMap={handleSwitchToMap}
                mapCenter={mapCenter}
                mapZoom={mapZoom}
                mapContainerRef={mapContainerRef}
                getCoordinatesForLocation={getCoordinatesForLocation}
                allCategories={allCategories}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                getCategoryLabel={getCategoryLabel}
                setIsCategoryModalOpen={setIsCategoryModalOpen}
                scrollCategories={scrollCategories}
                categoryScrollRef={categoryScrollRef}
                filteredListings={filteredListings}
                listings={listings}
                handleRefreshFeed={handleRefreshFeed}
                listingsGridRef={listingsGridRef}
                handleOpenListing={handleOpenListing}
                hoveredCardId={hoveredCardId}
                setHoveredCardId={setHoveredCardId}
                hoverSlideIndex={hoverSlideIndex}
                getSuggestedMedia={getSuggestedMedia}
                getFallbackImage={getFallbackImage}
                formatCompensation={formatCompensation}
                getListingDisplayContent={getListingDisplayContent}
                translationRevision={translationRevision}
                showingOriginalListings={showingOriginalListings}
                toggleOriginalListing={toggleOriginalListing}
                localizeLocation={localizeLocation}
                localizeTags={localizeTags}
                generateTags={generateTags}
                getAuthorAvatar={getAuthorAvatar}
                profile={profile}
                setProfile={setProfile}
                handleStartDiscussion={handleStartDiscussion}
                isAdmin={isAdmin}
                isGodModeActive={isGodModeActive}
                handleAdminDeleteListing={handleAdminDeleteListing}
                handleAdminToggleHideListing={handleAdminToggleHideListing}
                handleAdminEditListing={handleAdminEditListing}
                setMobileListingActionTarget={setMobileListingActionTarget}
                setSelectedPublicUser={setSelectedPublicUser}
                setBoostingListing={setBoostingListing}
                setIsBoostModalOpen={setIsBoostModalOpen}
                setIsCguViewerOpen={setIsCguViewerOpen}
                playApplePaySound={playApplePaySound}
                setSaveMessage={setSaveMessage}
                safeTimeout={safeTimeout}
                hasMoreListings={hasMoreListings}
                loadMoreSentinelRef={loadMoreSentinelRef}
                handleLoadMoreListings={handleLoadMoreListings}
                isLoadingMoreListings={isLoadingMoreListings}
              />
            )}

            {/* ONGLET COMMUNAUTÉ : TROCO LIVE & FIL D'ACTIVITÉ */}
            {activeTab === 'community' && (
              <CommunityRoute
                profile={profile}
                setCommunityProfileUser={setCommunityProfileUser}
                setIsCommunityProfileOpen={setIsCommunityProfileOpen}
                darkMode={darkMode}
                isMobile={isMobile}
                currentLang={currentLang}
                t={t}
              />
            )}

            {/* ONGLET 2 : MESSAGERIE & NÉGOCIATIONS */}
            {activeTab === 'chat' && (
              <ChatRoute
                activeTab={activeTab}
                chatsList={chatsList}
                selectedChat={selectedChat}
                handleSelectChat={handleSelectChat}
                chatThreads={chatThreads}
                readChats={readChats}
                messageDraft={messageDraft}
                setMessageDraft={setMessageDraft}
                handleTypingChange={handleTypingChange}
                handleSendMessage={handleSendMessage}
                handleEditMessage={handleEditMessage}
                handleDeleteMessage={handleDeleteMessage}
                openCounterOffer={openCounterOffer}
                startCall={startCall}
                joinActiveCall={joinActiveCall}
                handleAcceptIncomingCall={handleAcceptIncomingCall}
                acceptIncomingCall={acceptIncomingCall}
                callState={callState}
                isCallPip={isCallPip}
                handleAcceptDeal={handleAcceptDeal}
                handleConfirmTrocCompletion={handleConfirmTrocCompletion}
                handleDeclineDeal={handleDeclineDeal}
                handleSendToken={handleSendToken}
                handleReleaseEscrow={handleReleaseEscrow}
                onCreateProjectGroup={handleCreateProjectGroup}
                onProposeReward={handleProposeReward}
                onAcceptReward={handleAcceptReward}
                onSendAudioMessage={handleSendAudioMessage}
                profile={profile}
                setProfile={setProfile}
                currentLang={currentLang}
                t={t}
                darkMode={darkMode}
                getChatMessageDisplayContent={getChatMessageDisplayContent}
                getListingTitleTranslation={getListingTitleTranslation}
                formatStatus={formatStatus}
                showingOriginalMessages={showingOriginalMessages}
                toggleOriginalMessage={toggleOriginalMessage}
                isMobile={isMobile}
                presenceMap={presenceMap}
                listings={listings}
                handleOpenListing={handleOpenListing}
                setSelectedPublicUser={setSelectedPublicUser}
              />
            )}

            {/* ONGLET 3 : DÉPOSER UNE ANNONCE */}
            {activeTab === 'post' && (
              <PostRoute
                profile={profile}
                setProfile={setProfile}
                listings={listings}
                setListings={setListings}
                postDraft={postDraft}
                setPostDraft={setPostDraft}
                postStep={postStep}
                setPostStep={setPostStep}
                isEditingListing={isEditingListing}
                setIsEditingListing={setIsEditingListing}
                editingOriginalListing={editingOriginalListing}
                setEditingOriginalListing={setEditingOriginalListing}
                publishMessage={publishMessage}
                setPublishMessage={setPublishMessage}
                userCoords={userCoords}
                customCategories={customCategories}
                setCustomCategories={setCustomCategories}
                setUserTransactions={setUserTransactions}
                openCheckout={openCheckout}
                setSelectedListing={setSelectedListing}
                setPublishedListing={setPublishedListing}
                setShowPublishedPopup={setShowPublishedPopup}
                darkMode={darkMode}
                t={t}
                currentLang={currentLang}
                formatCompensation={formatCompensation}
                getListingDetail={getListingDetail}
                getCoordinatesForLocation={getCoordinatesForLocation}
                generateTags={generateTags}
                getSuggestedMedia={getSuggestedMedia}
                getSuggestedImage={getSuggestedImage}
                setActiveTab={setActiveTab}
                defaultPostDraft={defaultPostDraft}
              />
            )}

            {/* ONGLET 4 : PROFIL UTILISATEUR */}
            {activeTab === 'profile' && (
              <ProfileRoute
                profile={profile}
                setProfile={setProfile}
                profileDraft={profileDraft}
                setProfileDraft={setProfileDraft}
                isEditingProfile={isEditingProfile}
                setIsEditingProfile={setIsEditingProfile}
                skills={skills}
                setSkills={setSkills}
                equipment={equipment}
                setEquipment={setEquipment}
                portfolioImages={portfolioImages}
                setPortfolioImages={setPortfolioImages}
                darkMode={darkMode}
                currentLang={currentLang}
                t={t}
                isMobile={isMobile}
                handleSignOut={handleSignOut}
                handleOpenPayment={handleOpenPayment}
                setIsKycModalOpen={setIsKycModalOpen}
                setIsAdminPanelOpen={setIsAdminPanelOpen}
                setIsTransactionsModalOpen={setIsTransactionsModalOpen}
                setIsPrivacyCenterOpen={setIsPrivacyCenterOpen}
                setIsCguViewerOpen={setIsCguViewerOpen}
                setActiveTab={setActiveTab}
                formatStatus={formatStatus}
                formatTokenCount={formatTokenCount}
                formatCompensation={formatCompensation}
              />
            )}

            {/* ONGLETS LÉGAUX : MENTIONS LÉGALES, PRIVACY, COOKIES, REFUND (TDIF-01D) */}
            {['legal-notice', 'privacy-policy', 'cookie-policy', 'refund-policy'].includes(activeTab) && (
              <LegalRoutes
                activeTab={activeTab}
                darkMode={darkMode}
                currentLang={currentLang}
                setActiveTab={setActiveTab}
                onOpenPrivacyCenter={() => setIsPrivacyCenterOpen(true)}
              />
            )}
          </AnimatePresence>

          {/* PIED DE PAGE GLOBAL & LIENS DE CONFORMITÉ LÉGALE */}
          {!isMobile && ['feed', 'legal-notice', 'privacy-policy', 'cookie-policy', 'refund-policy'].includes(activeTab) && (
            <Suspense fallback={null}>
              <Footer
                onNavigate={(tab) => {
                  if (typeof window !== 'undefined') window.location.hash = tab;
                  setActiveTab(tab);
                }}
                onOpenCgu={() => setIsCguViewerOpen(true)}
                onOpenPrivacyCenter={() => setIsPrivacyCenterOpen(true)}
                darkMode={darkMode}
                currentLang={currentLang}
              />
            </Suspense>
          )}
        </main>

        {/* BARRE DE NAVIGATION EN BAS (CLEAN, TRANSPARENTE, AVEC GESTES DE SWIPE iOS) */}
        <AppBottomNav
          isMobile={isMobile}
          activeTab={activeTab}
          selectedChat={selectedChat}
          selectedListing={selectedListing}
          darkMode={darkMode}
          switchTab={switchTab}
          t={t}
          unreadCount={unreadCount}
          currentLang={currentLang}
          setSelectedChat={setSelectedChat}
          setPostStep={setPostStep}
          setPostDraft={setPostDraft}
          defaultPostDraft={defaultPostDraft}
          setPublishMessage={setPublishMessage}
          setIsEditingListing={setIsEditingListing}
        />

        {/* INTERACTIONS DU FEED : POPUP PUBLICATION & ACTIONS MOBILES (TDIF-01E) */}
        <FeedInteractions
          showPublishedPopup={showPublishedPopup}
          setShowPublishedPopup={setShowPublishedPopup}
          publishedListing={publishedListing}
          setSelectedListing={setSelectedListing}
          setActiveTab={setActiveTab}
          defaultPostDraft={defaultPostDraft}
          setPostStep={setPostStep}
          setPostDraft={setPostDraft}
          currentLang={currentLang}
          darkMode={darkMode}
          mobileListingActionTarget={mobileListingActionTarget}
          setMobileListingActionTarget={setMobileListingActionTarget}
          handleStartEditListing={handleStartEditListing}
          handleBoostListing={handleBoostListing}
          handleTogglePauseListing={handleTogglePauseListing}
          handleDeleteListing={handleDeleteListing}
        />

        {/* ORCHESTRATEUR GLOBAL DE TOUTES LES MODALES & OVERLAYS APPLICATIFS (TDIF-01E) */}
        <AppModalsOrchestrator
          isAuthenticated={isAuthenticated}
          profile={profile}
          isLoadingSession={isLoadingSession}
          cguDismissed={cguDismissed}
          setCguDismissed={setCguDismissed}
          cguBypassRef={cguBypassRef}
          handleAcceptCgu={handleAcceptCgu}
          darkMode={darkMode}
          currentLang={currentLang}
          t={t}
          isBoostModalOpen={isBoostModalOpen}
          setIsBoostModalOpen={setIsBoostModalOpen}
          boostingListing={boostingListing}
          confirmBoostListing={confirmBoostListing}
          boostMessage={boostMessage}
          pendingEmailLinkHref={pendingEmailLinkHref}
          handleConfirmEmailLink={handleConfirmEmailLink}
          handleCancelEmailLink={handleCancelEmailLink}
          isLangModalOpen={isLangModalOpen}
          setIsLangModalOpen={setIsLangModalOpen}
          setLang={setLang}
          isFilterDrawerOpen={isFilterDrawerOpen}
          setIsFilterDrawerOpen={setIsFilterDrawerOpen}
          filteredListings={filteredListings}
          isInfiniteRadius={isInfiniteRadius}
          setIsInfiniteRadius={setIsInfiniteRadius}
          radiusKm={radiusKm}
          setRadiusKm={setRadiusKm}
          handleRequestGeolocation={handleRequestGeolocation}
          isGeolocating={isGeolocating}
          isGeolocated={isGeolocated}
          selectedLanguages={selectedLanguages}
          toggleLanguageFilter={toggleLanguageFilter}
          selectedPayment={selectedPayment}
          setSelectedPayment={setSelectedPayment}
          hideDemos={hideDemos}
          setHideDemos={setHideDemos}
          paymentOptions={paymentOptions}
          paymentLabels={paymentLabels}
          isCategoryModalOpen={isCategoryModalOpen}
          setIsCategoryModalOpen={setIsCategoryModalOpen}
          categoryInput={categoryInput}
          setCategoryInput={setCategoryInput}
          handleAddCategory={handleAddCategory}
          activeIncomingCall={activeIncomingCall}
          callState={callState}
          isCallPip={isCallPip}
          setIsCallPip={setIsCallPip}
          pipPosition={pipPosition}
          setPipPosition={setPipPosition}
          handlePipPointerDown={handlePipPointerDown}
          handlePipPointerMove={handlePipPointerMove}
          handlePipPointerUp={handlePipPointerUp}
          handlePipPointerCancel={handlePipPointerCancel}
          handlePipContentClick={handlePipContentClick}
          handleAcceptIncomingCall={handleAcceptIncomingCall}
          handleDeclineIncomingCall={handleDeclineIncomingCall}
          selectedChat={selectedChat}
          selectedListing={selectedListing}
          localStream={localStream}
          remoteStream={remoteStream}
          facingMode={facingMode}
          hasMultipleCameras={hasMultipleCameras}
          switchCamera={switchCamera}
          acceptIncomingCall={acceptIncomingCall}
          endCall={endCall}
          toggleMic={toggleMic}
          toggleCam={toggleCam}
          toggleScreenShare={toggleScreenShare}
          hostMuteParticipant={hostMuteParticipant}
          hostStopParticipantScreenShare={hostStopParticipantScreenShare}
          copyInviteLink={copyInviteLink}
          attachLocalStream={attachLocalStream}
          attachRemoteStream={attachRemoteStream}
          callDuration={callDuration}
          formatCallTimer={formatCallTimer}
          settlementCallDuration={settlementCallDuration}
          setSettlementCallDuration={setSettlementCallDuration}
          setIsSettlementModalOpen={setIsSettlementModalOpen}
          isSettlementModalOpen={isSettlementModalOpen}
          handleTransferCallTokens={handleTransferCallTokens}
          getAuthorAvatar={getAuthorAvatar}
          isAdminPanelOpen={isAdminPanelOpen}
          setIsAdminPanelOpen={setIsAdminPanelOpen}
          selectedPublicUser={selectedPublicUser}
          setSelectedPublicUser={setSelectedPublicUser}
          isCommunityProfileOpen={isCommunityProfileOpen}
          setIsCommunityProfileOpen={setIsCommunityProfileOpen}
          communityProfileUser={communityProfileUser}
          listings={listings}
          handleOpenListing={handleOpenListing}
          handleStartDiscussion={handleStartDiscussion}
          isReportModalOpen={isReportModalOpen}
          setIsReportModalOpen={setIsReportModalOpen}
          reportTarget={reportTarget}
          setReportTarget={setReportTarget}
          isCounterOfferOpen={isCounterOfferOpen}
          setIsCounterOfferOpen={setIsCounterOfferOpen}
          editingDealId={editingDealId}
          setEditingDealId={setEditingDealId}
          handleCounterOfferSubmit={handleCounterOfferSubmit}
          chatThreads={chatThreads}
          counterOfferDraft={counterOfferDraft}
          isPaymentModalOpen={isPaymentModalOpen}
          setIsPaymentModalOpen={setIsPaymentModalOpen}
          paymentModalConfig={paymentModalConfig}
          handlePaymentSuccess={handlePaymentSuccess}
          playBetclicBalanceSound={playBetclicBalanceSound}
          playApplePaySound={playApplePaySound}
          isTransactionsModalOpen={isTransactionsModalOpen}
          setIsTransactionsModalOpen={setIsTransactionsModalOpen}
          userTransactions={userTransactions}
          handleOpenPayment={handleOpenPayment}
          checkoutSession={checkoutSession}
          cancelCheckout={cancelCheckout}
          applyCheckout={applyCheckout}
          isCheckoutProcessing={isCheckoutProcessing}
          checkoutStatus={checkoutStatus}
          isRateLimited={isRateLimited}
          retryAfterSeconds={retryAfterSeconds}
          resetRateLimit={resetRateLimit}
          isOnboardingOpen={isOnboardingOpen}
          handleCompleteOnboarding={handleCompleteOnboarding}
          isWelcomeGiftModalOpen={isWelcomeGiftModalOpen}
          setIsWelcomeGiftModalOpen={setIsWelcomeGiftModalOpen}
          isKycModalOpen={isKycModalOpen}
          setIsKycModalOpen={setIsKycModalOpen}
          handleKycComplete={handleKycComplete}
          isCguViewerOpen={isCguViewerOpen}
          setIsCguViewerOpen={setIsCguViewerOpen}
          isPrivacyCenterOpen={isPrivacyCenterOpen}
          setIsPrivacyCenterOpen={setIsPrivacyCenterOpen}
          handleDeleteAccount={handleDeleteAccount}
          topUpCelebration={topUpCelebration}
          transactionSuccessModalConfig={transactionSuccessModalConfig}
          handleCloseTransactionSuccessModal={handleCloseTransactionSuccessModal}
          isUserBanned={isUserBanned}
          bannedReason={bannedReason}
        />

        <ConfirmDialog />
      </div>
      </ConfirmProvider>
    </LanguageContext.Provider>
  );
}
