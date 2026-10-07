import logger from './utils/logger';
import React, { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue, Suspense, useTransition } from 'react';
import { auth, db } from './firebase';
import { collection, doc, updateDoc, serverTimestamp, onSnapshot, query, orderBy, limit, setDoc, deleteDoc, where } from 'firebase/firestore';
import { fetchListingsPaginated, fetchListingsByGeohash } from './services/firestoreService';
import { isSignInWithEmailLink, signInWithEmailLink, signOut, onAuthStateChanged } from 'firebase/auth';
import { useWebRTC } from './hooks/useWebRTC';
import { useTheme } from './contexts/ThemeContext';
import { TROCO_CATEGORIES } from './data/categoriesData';
import { subscribeTranslations } from './utils/translator';
import { playApplePaySound, playBetclicBalanceSound, playWelcomeGiftFanfare } from './utils/audioService';
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
import ModalOrchestrator from './components/ModalOrchestrator';
import { useDealActions } from './hooks/useDealActions';
import { useUserReporting } from './hooks/useUserReporting';
import { useFeedStore } from './stores/useFeedStore';
import TrocoLogoNativeSvg from './components/common/TrocoLogoNativeSvg';
import AuthScreen from './features/auth/AuthScreen';
import { useWalletStore } from './stores';
import haptics, { safeVibrate } from './utils/haptics';
import { useAppAuth } from './hooks/useAppAuth';
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
import { useTutorial } from './hooks/useTutorial';
import InteractiveTutorial from './components/onboarding/InteractiveTutorial';
import SplashScreen from './components/onboarding/SplashScreen';
import {
  translations,
  localizeLocation,
  localizeTags,
} from './data/translationsData';
import {
  calculateHaversineDistance,
  searchNominatim,
  lookupCoordinatesDynamic,
} from './utils/geocodingNominatim';

import { useGlobalContent } from './features/admin/useGlobalContent';
import { notificationService } from './services/notificationService';
import { isIosOrTouchDevice, isLowEndDevice } from './utils/deviceDetection';
import { useAdminGuard } from './hooks/useAdminGuard';
import adminService from './services/adminService';
import { useUsersPublic } from './hooks/useUsersPublic';
import { setSessionAuthenticated, clearSessionFlags } from './utils/sessionFlags';
import { migrateLocalStorage } from './utils/migrateLocalStorage';
import { clearTrocoLocalStorage } from './utils/clearTrocoLocalStorage';
import { gdprService } from './services/gdprService';
import { useCheckout } from './hooks/useCheckout';
import { useRateLimit } from './hooks/useRateLimit';
import { useSafeTimeout } from './hooks/useSafeTimeout';
import { useFirestoreHealth } from './hooks/useFirestoreHealth';
import * as storage from './utils/storage';
export { isIosOrTouchDevice, isLowEndDevice };


const Footer = React.lazy(() => import('./components/Footer'));

// 🚨 PHASE 108 : ISOLATION DES COMPOSANTS LOURDS 3D / CANVAS (ÉRADICATION CRASH OOM iOS)
const TrocoLogo3D = React.lazy(() => import('./components/common/TrocoLogo3D'));

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
  const isLowEnd = useMemo(() => isLowEndDevice(), []);

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

  // Modular Orchestration Hooks (Phase 26)
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
    setIsAuthResolved,
    isLoadingSession,
    setIsLoadingSession,
    isProfileLoading,
    setIsProfileLoading,
    isUserBanned,
    setIsUserBanned,
    bannedReason,
    setBannedReason,
    saveMessage,
    setSaveMessage,
    handleLogout,
    handleKycComplete,
    addSkill,
    removeSkill,
    addEquipment,
    removeEquipment,
    addPortfolioImage,
    removePortfolioImage,
    pendingEmailLinkHref,
    handleConfirmEmailLink,
    handleCancelEmailLink,
  } = useAppAuth();

  const { isAdmin } = useAdminGuard();

  // Hook pour gérer les timeouts en toute sécurité
  const { safeTimeout } = useSafeTimeout();

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
    isOnboardingOpen,
    setIsOnboardingOpen,
    isAdminPanelOpen,
    setIsAdminPanelOpen,
    isGodModeActive,
    setIsGodModeActive,
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
    topUpCelebration,
    setTopUpCelebration,
  } = ui;

  // Extraction de la gestion des signalements utilisateurs et annonces (useUserReporting)
  const {
    isReportModalOpen,
    setIsReportModalOpen,
    reportTarget,
    setReportTarget,
    handleOpenReportModal,
  } = useUserReporting({ ui });

  // Gestion du tutoriel interactif IA pour les nouveaux utilisateurs
  const {
    isTutorialOpen,
    setIsTutorialOpen,
    currentStep: tutorialCurrentStep,
    nextStep: nextTutorialStep,
    prevStep: prevTutorialStep,
    skipTutorial,
    completeTutorial,
    shouldShowTutorial,
  } = useTutorial();

  // Écran d'accueil interactif immersif CRT + Dither (TÂCHE 5)
  const [showSplash, setShowSplash] = useState(() => {
    try {
      if (typeof window === 'undefined') return false;
      return sessionStorage.getItem('troco_splash_seen') !== 'true';
    } catch (_) {
      return false;
    }
  });

  const handleSplashComplete = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('troco_splash_seen', 'true');
      }
    } catch (_) {}
    setShowSplash(false);
  }, []);

  const [skills, setSkills] = useState([
    'Prod musicale & Ableton Live',
    'Scripts Python',
  ]);
  const [equipment, setEquipment] = useState([
    'MacBook Pro 14',
    'Microphone USB',
  ]);
  const [portfolioImages, setPortfolioImages] = useState(() => profile?.portfolioImages || []);
  const [mapCenter, setMapCenter] = useState([48.8566, 2.3522]);
  const [mapZoom, setMapZoom] = useState(4);
  const [allReports, setAllReports] = useState([]);
  const [allFirestoreUsers, setAllFirestoreUsers] = useState([]);
  const [listings, setListings] = useState([]);
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
  const getListingDetailRef = useRef(null);
  const [isPending, startTransition] = useTransition();

  // 🚨 PHASE 58 : INITIALISATION & VERROUILLAGE GÉO-IP DE LA DEVISE
  useEffect(() => {
    try {
      useWalletStore.getState().initializeGeoCurrency?.();
    } catch (_) { }
  }, []);

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

  // ---- NOTIFICATION & ANIMATION DE RÉCEPTION DE JETONS (DESTINATAIRE) ----
  // Ref: P1-BUG-08 - Centralisation dans le listener Firestore onSnapshot pour éviter le double déclenchement
  const prevTokensRef = useRef(null);
  const prevEurosRef = useRef(null);
  const isInitialAuthSnapRef = useRef(true);

  // Verrou d'urgence anti-boucle CGU / RGPD : persistance session immédiate
  const [cguDismissed, setCguDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.sessionStorage?.getItem('troco_cgu_dismissed') === 'true' ||
        window.localStorage?.getItem('troco_cgu_dismissed') === 'true';
    }
    return false;
  });

  // Verrou synchrone anti-flickering CGU : évite toute ouverture intempestive pour le compte admin
  // pendant le cycle de rendu React avant que Firestore ne confirme cguAcceptedAt
  const cguBypassRef = useRef(
    typeof window !== 'undefined' &&
    (window.sessionStorage?.getItem('troco_cgu_dismissed') === 'true' ||
      window.localStorage?.getItem('troco_cgu_dismissed') === 'true')
  );

  const [userTransactions, setUserTransactions] = useState([]);

  // Nettoyage données démo au démarrage (RGPD / conformité)
  useEffect(() => {
    migrateLocalStorage();
  }, []);

  // Purge de sécurité du cache local si un ancien identifiant mocké est détecté
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const checkMockInStorage = (storageObj) => {
        if (!storageObj) return false;
        for (let i = 0; i < storageObj.length; i++) {
          const key = storageObj.key(i);
          const val = key ? storageObj.getItem(key) : null;
          if (
            (key && (key.includes('demo_mateopolo') || key.includes('admin_uid'))) ||
            (val && (val.includes('demo_mateopolo') || val.includes('admin_uid')))
          ) {
            return true;
          }
        }
        return false;
      };

      if (checkMockInStorage(window.localStorage) || checkMockInStorage(window.sessionStorage)) {
        window.localStorage?.clear();
        window.sessionStorage?.clear();
      }
    } catch (_) { }
  }, []);

  // Écoute temps réel des transactions de l'utilisateur sur Firestore
  useEffect(() => {
    const uid = profile?.uid || auth.currentUser?.uid;
    if (!uid) return;
    useFeedStore.getState().loadSavedFilters(uid);
    try {
      const qTx = query(
        collection(db, 'transactions'),
        where('userId', '==', uid),
        orderBy('createdAt', 'desc')
      );
      const unsub = onSnapshot(qTx, (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setUserTransactions(list);
          try {
            storage.setDebounced('troco_user_transactions', list);
          } catch (e) { }
        }
      }, (err) => logger.warn('[Firestore] Transactions listener:', err));
      return () => unsub();
    } catch (e) {
      logger.warn('Transactions listener error:', e);
    }
  }, [profile?.uid]);

  // ---- MODALE DE CONFIRMATION DE TRANSACTION FINTECH IMMERSIVE ----
  const [transactionSuccessModalConfig, setTransactionSuccessModalConfig] = useState({
    isOpen: false,
    type: 'sent', // 'sent' | 'received'
    amount: 1,
    currency: 'tokens', // 'tokens' | 'fiat'
    partnerName: '',
    notificationId: null,
  });

  const handleCloseTransactionSuccessModal = useCallback(async () => {
    const notifId = transactionSuccessModalConfig.notificationId;
    const currentUid = profile?.uid || profile?.id || auth.currentUser?.uid;
    if (notifId && currentUid && db) {
      try {
        const notifRef = doc(db, 'users', currentUid, 'notifications', notifId);
        await updateDoc(notifRef, {
          read: true,
          readAt: serverTimestamp(),
        });
      } catch (err) {
        logger.warn('Erreur marquage notification lue:', err);
      }
    }
    setTransactionSuccessModalConfig(prev => ({ ...prev, isOpen: false, notificationId: null }));
  }, [transactionSuccessModalConfig.notificationId, profile?.uid, profile?.id]);

  // ---- DÉCLENCHEMENT GLOBAL DES NOTIFICATIONS (POUR LE RECEVEUR) ----
  useEffect(() => {
    const currentUid = profile?.uid || profile?.id || auth.currentUser?.uid;
    if (!currentUid || !db) return;

    try {
      const notifsCol = collection(db, 'users', currentUid, 'notifications');
      const qNotifs = query(notifsCol, where('read', '==', false));

      const unsubNotifs = onSnapshot(qNotifs, (snapshot) => {
        if (!snapshot.empty) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
              const notifData = change.doc.data();
              const TOKEN_NOTIF_TYPES = ['payment_received', 'tokens_received'];
              if (notifData && TOKEN_NOTIF_TYPES.includes(notifData.type) && notifData.read === false) {
                const partner = notifData.fromName || notifData.senderName || notifData.userName || '';
                setTransactionSuccessModalConfig({
                  isOpen: true,
                  type: 'received',
                  amount: notifData.amount || 1,
                  currency: notifData.currency === 'fiat' || notifData.currency === 'EUR' ? 'fiat' : 'tokens',
                  partnerName: partner,
                  notificationId: change.doc.id,
                });
              }
            }
          });
        }
      }, (err) => {
        logger.warn('[Notifications] Erreur écoute notifications temps réel:', err);
      });

      return () => unsubNotifs();
    } catch (e) {
      logger.warn('[Notifications] Listener setup error:', e);
    }
  }, [profile?.uid, profile?.id]);

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
    setChatThreads,
    chatsList,
    setChatStatusOverrides,
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
    executeDealTransaction,
    handleReleaseEscrow,
    handleAcceptDeal,
    handleConfirmTrocCompletion,
    handleDeclineDeal,
    handleSendToken,
    sendPostCallTip,
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

  // Handler de succès de paiement (crédit solde, enregistrement transaction Firestore)
  // Handlers de deals, transactions et rétributions extraits dans useDealActions
  const {
    handleTransferCallTokens,
    handlePaymentSuccess,
  } = useDealActions({
    profile,
    setProfile,
    userTransactions,
    setUserTransactions,
    setTopUpCelebration,
    setSaveMessage,
    setTransactionSuccessModalConfig,
    selectedChat,
    safeTimeout,
    playApplePaySound,
    playBetclicBalanceSound,
    setListings,
    setBoostMessage,
    isEditingListing,
    editingOriginalListing,
    setIsEditingListing,
    setEditingOriginalListing,
    setPublishedListing,
    setShowPublishedPopup,
    setSelectedListing,
    setPostStep,
    setPostDraft,
    defaultPostDraft,
    getListingDetail: (l) => (getListingDetailRef.current ? getListingDetailRef.current(l) : l),
    t,
  });

  // ---- GESTION DU CADRE JURIDIQUE & RGPD (BLOC 6) ----
  const handleDeleteAccount = async (options = {}) => {
    try {
      await gdprService.deleteUserCompletely({ immediate: Boolean(options?.immediate) });
      clearTrocoLocalStorage();
      if (auth.currentUser) {
        await signOut(auth);
      }
      window.location.reload();
    } catch (err) {
      logger.error('Account deletion error:', err);
      clearTrocoLocalStorage();
      if (auth.currentUser) {
        await signOut(auth);
      }
      window.location.reload();
    }
  };

  // ---- RATE LIMITING & APP CHECK PROTECTION ----
  const { isRateLimited, retryAfterSeconds, checkLimit, resetRateLimit } = useRateLimit();

  // ---- SESSION DE PAIEMENT SÉCURISÉE (USECHECKOUT) ----
  const {
    checkoutSession,
    isProcessing: isCheckoutProcessing,
    paymentStatus: checkoutStatus,
    openCheckout,
    cancelCheckout,
    applyCheckout,
  } = useCheckout({
    profile,
    setProfile,
    onPaymentSuccess: handlePaymentSuccess,
    onOpenNotification: setSaveMessage,
  });

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

  // ---- ÉCOUTE ET SYNCHRONISATION EN TEMPS RÉEL DU PROFIL FIREBASE USERS/{UID} ----
  useEffect(() => {
    const isE2E = typeof window !== 'undefined' && (
      window.__E2E__ === true ||
      window.localStorage?.getItem('troco_e2e_authenticated') === 'true'
    );
    const sessionStartTime = Date.now();
    const finishSessionLoading = () => {
      if (isE2E) {
        setIsLoadingSession(false);
        return;
      }
      const elapsed = Date.now() - sessionStartTime;
      const remaining = Math.max(0, 2500 - elapsed);
      safeTimeout(() => {
        setIsLoadingSession(false);
      }, remaining);
    };

    let unsubDoc = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubDoc) {
        unsubDoc();
        unsubDoc = null;
      }

      if (firebaseUser) {
        const uid = firebaseUser.uid;
        const userDocRef = doc(db, 'users', uid);

        // Écoute temps réel des changements de solde, infos et statut CGU du profil
        unsubDoc = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();

            // PROTECTION TEMPS RÉEL CONTRE LE BANNISSEMENT
            if (data.isBanned) {
              setIsUserBanned(true);
              setBannedReason(data.bannedReason || "Votre compte a été suspendu par l'administration Troco suite à un non-respect des règles de la communauté.");
              try { await signOut(auth); } catch (_) { }
              clearSessionFlags();
              storage.remove('troco_user_profile');
              setIsAuthenticated(false);
              return;
            }

            const rawTokens = data.trocoTokens ?? data.tokens;
            const rawEuros = data.euroBalance ?? data.walletBalanceFiat ?? data.balance;
            const newTokens = rawTokens !== undefined && rawTokens !== null ? Number(rawTokens) : null;
            const newEuros = rawEuros !== undefined && rawEuros !== null ? Number(Number(rawEuros).toFixed(2)) : null;

            // VERROU STRICT SUR LES CÉLÉBRATIONS FINANCIÈRES :
            // Ne JAMAIS déclencher au snapshot initial, ni si le bonus/onboarding a déjà été validé
            const isClaimed = Boolean(data.welcomeBonusClaimed || data.onboardingCompleted || profile?.welcomeBonusClaimed || profile?.onboardingCompleted);

            if (!isInitialAuthSnapRef.current && !isClaimed) {
              // Détection de réception temps réel de jetons Troco (+X jetons) & Alerte sonore
              if (prevTokensRef.current !== null && newTokens !== null && newTokens > prevTokensRef.current) {
                const gained = newTokens - prevTokensRef.current;
                haptics.success();
                playBetclicBalanceSound(true);
                setTopUpCelebration({
                  title: `+${gained} Jeton${gained > 1 ? 's' : ''} Troco reçus ! 🪙`,
                  subtitle: `Nouveau solde : ${newTokens} Jetons Troco`,
                });
                safeTimeout(() => setTopUpCelebration(null), 4500);
              }

              // Détection de réception temps réel d'euros & Alerte sonore
              if (prevEurosRef.current !== null && newEuros !== null && newEuros > prevEurosRef.current) {
                const gained = (newEuros - prevEurosRef.current).toFixed(2);
                haptics.success();
                playApplePaySound();
                setTopUpCelebration({
                  title: `+${gained} € reçus sur votre solde ! 💳`,
                  subtitle: `Nouveau solde : ${Number(newEuros).toFixed(2)} €`,
                });
                safeTimeout(() => setTopUpCelebration(null), 4500);
              }
            }

            isInitialAuthSnapRef.current = false;
            if (newTokens !== null) prevTokensRef.current = newTokens;
            if (newEuros !== null) prevEurosRef.current = newEuros;

            // Détection et synchronisation de la photo de profil native Gmail / Auth
            const isUnsplashPlaceholder = typeof data.avatar === 'string' && data.avatar.includes('unsplash.com');
            const resolvedAvatar = (firebaseUser.photoURL && (!data.avatar || isUnsplashPlaceholder)) ? firebaseUser.photoURL : (data.avatar || firebaseUser.photoURL || '');
            const resolvedName = (firebaseUser.displayName && (!data.name || data.name === 'Membre Troco' || data.name === 'Utilisateur Troco')) ? firebaseUser.displayName : (data.name || firebaseUser.displayName || 'Membre Troco');

            // Synchronisation vers Firestore si la photo ou l'onboarding manquent
            const updatesToSync = {};
            if (firebaseUser.photoURL && (!data.avatar || isUnsplashPlaceholder)) {
              updatesToSync.avatar = firebaseUser.photoURL;
            }
            if (firebaseUser.displayName && (!data.name || data.name === 'Membre Troco' || data.name === 'Utilisateur Troco')) {
              updatesToSync.name = firebaseUser.displayName;
            }
            if (data.onboardingCompleted === undefined || data.onboardingCompleted === false) {
              updatesToSync.onboardingCompleted = true;
            }

            // AUTO-GUÉRISON : Si l'admin n'a pas de cguAcceptedAt,
            // on le patch une seule fois par session côté Firestore ET on pose le verrou synchrone
            // pour bloquer toute ouverture de modale CGU dans ce cycle de rendu.
            const alreadyHealed = typeof window !== 'undefined' && window.sessionStorage?.getItem('troco_admin_cgu_healed') === 'true';
            const isGodAdminSnap = Boolean(data.isAdmin || data.role === 'admin');
            if (isGodAdminSnap && !data.cguAcceptedAt && !alreadyHealed) {
              const healedAt = new Date().toISOString();
              updatesToSync.cguAcceptedAt = serverTimestamp();
              updatesToSync.cguVersion = '2026.1';
              // Verrou synchrone immédiat : bypasse React state pour ce cycle de rendu
              cguBypassRef.current = true;
              try {
                window.sessionStorage?.setItem('troco_admin_cgu_healed', 'true');
                window.sessionStorage?.setItem('troco_cgu_dismissed', 'true');
                window.localStorage?.setItem('troco_cgu_dismissed', 'true');
              } catch (_) { }
              setCguDismissed(true);
              // Mise à jour optimiste locale pour éviter le flash de modale
              setProfile(prev => ({ ...prev, cguAcceptedAt: healedAt, cguVersion: '2026.1' }));
              logger.info('[Auth] Self-heal: cguAcceptedAt patché pour le compte admin.');
            }

            if (Object.keys(updatesToSync).length > 0) {
              updateDoc(userDocRef, {
                ...updatesToSync,
                updatedAt: serverTimestamp(),
              }).catch((err) => logger.warn('[Auth] Auto-sync photo/onboarding in App.js failed:', err));
            }

            // Mise à jour de l'état profil local et persistence
            const isGodAdmin = Boolean(data.isAdmin || data.role === 'admin');
            setProfile(prev => {
              const updated = {
                ...prev,
                ...data,
                euroBalance: newEuros !== null ? newEuros : (data.euroBalance ?? prev?.euroBalance ?? 0),
                trocoTokens: newTokens !== null ? newTokens : (data.trocoTokens ?? prev?.trocoTokens ?? 10),
                cguAcceptedAt: data.cguAcceptedAt || prev?.cguAcceptedAt || null,
                name: resolvedName,
                avatar: resolvedAvatar,
                onboardingCompleted: true,
                uid: uid,
                isAdmin: isGodAdmin ? true : Boolean(data.isAdmin),
                role: isGodAdmin ? 'admin' : (data.role || 'user'),
              };
              try {
                storage.setDebounced('troco_user_profile', updated);
              } catch (_) { }
              return updated;
            });

            // Synchronisation réactive globale avec le store Zustand useWalletStore
            const walletState = useWalletStore.getState();
            if (walletState?.setTrocoTokens && newTokens !== null) walletState.setTrocoTokens(newTokens);
            if (walletState?.setEuroBalance && newEuros !== null) walletState.setEuroBalance(newEuros);
            if (walletState?.setKycVerified) walletState.setKycVerified(Boolean(data.kycVerified));
            if (walletState?.setTrocoPlus) walletState.setTrocoPlus(Boolean(data.isTrocoPlus), data.trocoPlusPlan);

            if (Array.isArray(data.skills)) setSkills(data.skills);
            if (Array.isArray(data.equipment)) setEquipment(data.equipment);
            finishSessionLoading();
          } else {
            // VERROU STRICT : Si le bonus ou l'onboarding a déjà été validé, pas de ré-initialisation
            if (profile?.welcomeBonusClaimed === true || profile?.onboardingCompleted === true) {
              finishSessionLoading();
              return;
            }

            // Initialisation automatique du profil sur Firestore si nouveau provider
            let isGodAdmin = false;
            try {
              const tokenRes = await firebaseUser.getIdTokenResult();
              isGodAdmin = Boolean(tokenRes?.claims?.admin);
            } catch (_) { }
            const defaultUserDoc = {
              uid: uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0].toUpperCase() || 'Utilisateur Troco',
              username: '@' + (firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'user').toLowerCase().replace(/\s+/g, ''),
              email: firebaseUser.email || '',
              phoneNumber: firebaseUser.phoneNumber || '',
              avatar: firebaseUser.photoURL || '',
              bio: 'Nouvel utilisateur sur Troco ! Prêt à partager mes compétences et échanger des services.',
              location: 'Paris, France',
              languages: ['FR'],
              skills: [],
              equipment: [],
              euroBalance: 0.00,
              trocoTokens: 10,
              dealsCompleted: 0,
              dealsInProgress: 0,
              rating: null,
              onboardingCompleted: true,
              welcomeBonusClaimed: true,
              loginMethod: firebaseUser.providerData?.[0]?.providerId || 'Email',
              // Ne jamais créer un doc admin avec cguAcceptedAt: null — sinon boucle CGU garantie
              cguAcceptedAt: isGodAdmin ? serverTimestamp() : null,
              cguVersion: isGodAdmin ? '2026.1' : undefined,
              isAdmin: isGodAdmin ? true : false,
              role: isGodAdmin ? 'admin' : 'user',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            try {
              await setDoc(userDocRef, defaultUserDoc, { merge: true });
              setProfile(prev => ({ ...prev, ...defaultUserDoc }));
              prevTokensRef.current = defaultUserDoc.trocoTokens;
              prevEurosRef.current = defaultUserDoc.euroBalance;
            } catch (e) {
              logger.warn('[Firestore] Failed to init user doc:', e);
            }
            finishSessionLoading();
          }
        }, (err) => {
          logger.warn('[Firestore] App.js user snapshot error:', err);
          finishSessionLoading();
        });

        setIsAuthenticated(true);
        setSessionAuthenticated();
      } else {
        const isE2E = typeof window !== 'undefined' && (
          window.__E2E__ === true ||
          window.localStorage?.getItem('troco_e2e_authenticated') === 'true'
        );
        if (isE2E) {
          setIsAuthenticated(true);
          finishSessionLoading();
          setIsAuthResolved(true);
          return;
        }

        prevTokensRef.current = null;
        prevEurosRef.current = null;
        // Nettoyage immédiat
        clearSessionFlags();
        setIsAuthenticated(false);
        setProfile(null);
        setSelectedChat(null);
        setSelectedListing(null);
        finishSessionLoading();
      }
      setIsAuthResolved(true);
    });

    return () => {
      if (unsubDoc) unsubDoc();
      unsubscribeAuth();
    };
  }, [safeTimeout, setBannedReason, setIsAuthResolved, setIsAuthenticated, setIsLoadingSession, setIsUserBanned, setProfile, setSelectedChat, setSelectedListing, setTopUpCelebration]);

  // ---- ÉCOUTE ET RÉACTUALISATION EN TEMPS RÉEL DES TRADUCTIONS DYNAMIQUES ----
  const [translationRevision, setTranslationRevision] = useState(0);
  useEffect(() => {
    const unsub = subscribeTranslations(() => {
      setTranslationRevision(r => r + 1);
    });
    return () => unsub();
  }, [setIsAuthenticated, setIsLoadingSession, setProfile]);

  // ---- DÉTECTION ET OUVERTURE DU WIZARD D'ONBOARDING POUR NOUVEAUX COMPTES (CHANTIER 1) ----
  useEffect(() => {
    if (!isAuthResolved || isLoadingSession || isProfileLoading) return;
    if (isAuthenticated && profile) {
      const needsOnboarding = profile.onboardingCompleted === false && profile.uid;
      if (needsOnboarding) {
        setIsOnboardingOpen(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isAuthResolved, isLoadingSession, isProfileLoading, profile?.onboardingCompleted, profile?.uid]);

  // ---- DÉTECTION ET OUVERTURE DU TUTORIEL INTERACTIF IA (JOUR 1) ----
  useEffect(() => {
    if (!isAuthResolved || isLoadingSession || isProfileLoading || isOnboardingOpen) return;
    if (isAuthenticated && profile && shouldShowTutorial(profile)) {
      setIsTutorialOpen(true);
    }
  }, [isAuthenticated, isAuthResolved, isLoadingSession, isProfileLoading, isOnboardingOpen, profile?.onboardingCompleted, profile?.tutorialCompleted, profile?.uid, shouldShowTutorial, setIsTutorialOpen]);

  // Synchronisation réactive globale avec le store Zustand useWalletStore (élimine le prop drilling)
  useEffect(() => {
    if (profile) {
      const state = useWalletStore.getState();
      if (typeof state?.setEuroBalance === 'function') state.setEuroBalance(profile.euroBalance ?? 0);
      if (typeof state?.setTrocoTokens === 'function') state.setTrocoTokens(profile.trocoTokens ?? 10);
      if (typeof state?.setKycVerified === 'function') state.setKycVerified(profile.kycVerified ?? false);
      if (typeof state?.setTrocoPlus === 'function') state.setTrocoPlus(profile.isTrocoPlus ?? false, profile.trocoPlusPlan);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.euroBalance, profile?.trocoTokens, profile?.kycVerified, profile?.isTrocoPlus, profile?.trocoPlusPlan]);

  const [isWelcomeGiftModalOpen, setIsWelcomeGiftModalOpen] = useState(false);

  // Déclencheur automatique de célébration de bienvenue à l'atterrissage sur le profil
  useEffect(() => {
    if (activeTab === 'profile' && isAuthenticated) {
      const alreadyCelebrated =
        profile?.welcomeBonusClaimed === true ||
        profile?.onboardingCompleted === true ||
        window.localStorage.getItem('troco_welcome_gift_celebrated') === 'true';
      if (!alreadyCelebrated && profile?.trocoTokens === 10 && (profile?.euroBalance === 0 || profile?.euroBalance === 0.00)) {
        window.localStorage.setItem('troco_welcome_gift_celebrated', 'true');
        playWelcomeGiftFanfare();
        setIsWelcomeGiftModalOpen(true);
      }
    }
  }, [activeTab, isAuthenticated, profile?.welcomeBonusClaimed, profile?.onboardingCompleted, profile?.trocoTokens, profile?.euroBalance]);

  // ---- FINALISATION DU PARCOURS D'ONBOARDING (CHANTIER 1 & CADEAU DE BIENVENUE) ----
  const handleCompleteOnboarding = async (completedData) => {
    const finalEuroBalance = Number(profile?.euroBalance ?? 0.00); // Préserve le solde existant
    const finalTokens = Number(profile?.trocoTokens ?? 10); // Préserve les jetons existants
    const updatedProfile = {
      ...profile,
      ...completedData,
      euroBalance: finalEuroBalance,
      trocoTokens: finalTokens,
      onboardingCompleted: true,
      dealsCompleted: profile.dealsCompleted ?? 0,
      dealsInProgress: profile.dealsInProgress ?? 0,
      rating: profile.rating ?? null,
    };
    setProfile(updatedProfile);
    setProfileDraft(updatedProfile);
    if (Array.isArray(completedData.skills)) setSkills(completedData.skills);
    if (Array.isArray(completedData.equipment)) setEquipment(completedData.equipment);
    storage.setDebounced('troco_user_profile', updatedProfile);
    storage.setSync('troco_welcome_gift_celebrated', 'true');

    const uid = profile?.uid || auth.currentUser?.uid;
    if (uid) {
      try {
        await setDoc(doc(db, 'users', uid), {
          ...completedData,
          euroBalance: finalEuroBalance,
          trocoTokens: finalTokens,
          onboardingCompleted: true,
          dealsCompleted: profile.dealsCompleted ?? 0,
          dealsInProgress: profile.dealsInProgress ?? 0,
          rating: profile.rating ?? null,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        setSaveMessage('🎁 +10 Jetons Troco offerts ! Bienvenue sur Troco.');
        safeTimeout(() => setSaveMessage(''), 5000);
      } catch (e) {
        logger.warn('[Firestore] Failed to save onboarding to Firestore:', e);
        setSaveMessage(`❌ Erreur : Échec de la sauvegarde du profil (${e?.message || 'Erreur réseau'})`);
        safeTimeout(() => setSaveMessage(''), 5000);
      }
    } else {
      setSaveMessage('🎁 +10 Jetons Troco offerts ! Bienvenue sur Troco.');
      safeTimeout(() => setSaveMessage(''), 5000);
    }
    setIsOnboardingOpen(false);
    playWelcomeGiftFanfare();
    setIsWelcomeGiftModalOpen(true);
  };

  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Veuillez entrer votre email pour valider la connexion :');
      }
      if (email) {
        setIsLoadingSession(true);
        signInWithEmailLink(auth, email, window.location.href)
          .then((result) => {
            window.localStorage.removeItem('emailForSignIn');
            const userName = result.user.email?.split('@')[0].toUpperCase() || 'UTILISATEUR';
            const userHandle = '@' + (result.user.email?.split('@')[0] || 'user').toLowerCase().replace(/\s+/g, '');
            setProfile(prev => {
              const updated = { ...prev, loginMethod: 'Email Link', name: userName, username: userHandle, uid: result.user.uid };
              storage.setDebounced('troco_user_profile', updated);
              return updated;
            });
            setIsAuthenticated(true);
            setSessionAuthenticated();
          })
          .catch((err) => {
            logger.error('Magic link sign-in error:', err);
          })
          .finally(() => setIsLoadingSession(false));
      }
    }
  }, [setIsAuthenticated, setIsLoadingSession, setProfile]);


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

  // ---- LISTENER GLOBAL DES APPELS (ROOT LEVEL) ----
  const [globalIncomingCall, setGlobalIncomingCall] = useState(null);
  const activeIncomingCall = incomingCall || globalIncomingCall;

  // Attacheurs de flux universels sans conflit de ref (évite les écrans noirs sur tous navigateurs)
  const attachLocalStream = useCallback((el) => {
    if (el && localStream) {
      if (el.srcObject !== localStream) {
        el.srcObject = localStream;
      }
      el.play().catch(() => { });
    }
  }, [localStream]);

  const attachRemoteStream = useCallback((el) => {
    if (el && remoteStream) {
      if (el.srcObject !== remoteStream) {
        el.srcObject = remoteStream;
      }
      el.play().catch(() => { });
    }
  }, [remoteStream]);

  // Décrochage universel direct avec bascule immédiate vers la visio plein écran
  const handleAcceptIncomingCall = async (incomingObj = null) => {
    try {
      const targetCall = incomingObj || activeIncomingCall;
      setGlobalIncomingCall(null);
      stopRingtone();
      const res = await acceptIncomingCall(targetCall);
      const targetChatId = res?.chatId || targetCall?.chatId || targetCall?.roomId;
      if (targetChatId) {
        const foundChat = (chatsList || []).find(c => String(c.id) === String(targetChatId));
        if (foundChat) {
          setSelectedChat(foundChat);
        } else {
          setSelectedChat({ id: targetChatId, user: res?.from || targetCall?.from || 'Interlocuteur' });
        }
      }
      setIsCallPip(false);
    } catch (e) {
      logger.warn('[WebRTC] Accept incoming call error:', e);
    }
  };

  const handleDeclineIncomingCall = useCallback((incomingObj = null) => {
    setGlobalIncomingCall(null);
    declineIncomingCall(incomingObj || activeIncomingCall);
  }, [activeIncomingCall, declineIncomingCall]);

  useEffect(() => {
    const currentUid = (auth && auth.currentUser && auth.currentUser.uid) || profile?.uid;
    const normalizedProfile = (profile?.name || '').trim().toLowerCase();
    if (!currentUid || !db) return;

    const unsubs = [];
    try {
      const handleCallDocChange = (change) => {
        const data = change.doc.data();
        if (!data) return;
        if (data.fromUid && String(data.fromUid) === String(currentUid)) return;
        if (data.callerUid && String(data.callerUid) === String(currentUid)) return;
        if (data.from && normalizedProfile && (data.from || '').trim().toLowerCase() === normalizedProfile) return;

        if ((change.type === 'added' || change.type === 'modified') && data.status === 'ringing') {
          // Affichage inconditionnel de l'UI en premier
          setGlobalIncomingCall({
            chatId: change.doc.id,
            callId: change.doc.id,
            roomId: change.doc.id,
            type: data.type || 'video',
            from: data.from || 'Interlocuteur',
            fromUid: data.fromUid || data.callerUid || null,
            ...data,
          });

          // Isolation de la lecture audio : L'échec de l'audio (Autoplay Policy) ne doit JAMAIS bloquer l'état de l'UI
          try {
            if (typeof playRingtone === 'function') {
              playRingtone();
            }
          } catch (audioErr) {
            logger.warn('Autoplay bloqué', audioErr);
          }

          safeVibrate([400, 150, 400, 150, 400]);
        }
        if (change.type === 'removed') {
          setGlobalIncomingCall(prev => (prev?.chatId === change.doc.id || prev?.callId === change.doc.id ? null : prev));
          stopRingtone();
        }
        if (change.type === 'modified' && data.status && data.status !== 'ringing') {
          setGlobalIncomingCall(prev => (prev?.chatId === change.doc.id || prev?.callId === change.doc.id ? null : prev));
          stopRingtone();
        }
      };

      // 1. Écoute par targetParticipants (UID)
      const qTarget = query(
        collection(db, 'calls'),
        where('targetParticipants', 'array-contains', String(currentUid)),
        limit(10)
      );
      unsubs.push(onSnapshot(qTarget, (snap) => snap.docChanges().forEach(handleCallDocChange), (err) => {
        logger.warn('[App.js] Global calls targetParticipants error:', err);
      }));

      // 2. Écoute par calleeUid direct
      const qCallee = query(
        collection(db, 'calls'),
        where('calleeUid', '==', String(currentUid)),
        limit(5)
      );
      unsubs.push(onSnapshot(qCallee, (snap) => snap.docChanges().forEach(handleCallDocChange), (err) => {
        logger.warn('[App.js] Global calls calleeUid error:', err);
      }));

      // 3. Écoute par toUid direct
      const qToUid = query(
        collection(db, 'calls'),
        where('toUid', '==', String(currentUid)),
        limit(5)
      );
      unsubs.push(onSnapshot(qToUid, (snap) => snap.docChanges().forEach(handleCallDocChange), (err) => {
        logger.warn('[App.js] Global calls toUid error:', err);
      }));

      // 4. Écoute de secours par nom de profil si disponible
      if (profile?.name) {
        const qName = query(
          collection(db, 'calls'),
          where('targetParticipants', 'array-contains', profile.name),
          limit(5)
        );
        unsubs.push(onSnapshot(qName, (snap) => snap.docChanges().forEach(handleCallDocChange), () => { }));
      }
    } catch (e) {
      logger.warn('[App.js] Error setting up global calls listener:', e);
    }

    return () => {
      unsubs.forEach(u => { try { if (typeof u === 'function') u(); } catch (_) { } });
    };
  }, [profile?.uid, profile?.name, playRingtone, stopRingtone]);

  // Références stables pour éviter de déconnecter/reconnecter les écouteurs Firestore à chaque navigation
  const activeTabRef = useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  const selectedChatRef = useRef(selectedChat);
  useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);

  // Set anti-spam pour éviter les notifications répétées lors des multiples snapshots Firebase
  const notifiedMessageIds = useRef(new Set());

  // ---- TÂCHE 1 : LISTENER GLOBAL DES MESSAGES EN ARRIÈRE-PLAN AVEC TOAST ANTI-SPAM ----
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

      // Ignorer les messages envoyés par l'utilisateur courant lui-même
      const isFromMe = (lastSenderUid && lastSenderUid === String(currentUid)) ||
        (myName && lastSenderName === myName) ||
        (myUsername && lastSenderName === myUsername);

      if (isFromMe) return;

      // Détecter un nouveau message entrant non lu (sur modification ou ajout après le chargement initial)
      if (change.type === 'modified' || (change.type === 'added' && !isInitial)) {
        // Résolution de l'identifiant unique du message pour le Set anti-spam
        const rawTime = data.lastMessageTimestamp?.toMillis?.() ||
          data.lastMessageTimestamp?.seconds ||
          data.lastMessageTime?.seconds ||
          data.lastMessageTime ||
          data.updatedAt?.seconds ||
          data.updatedAt ||
          '';
        const messageId = data.lastMessageId || data.lastMsgId || `${chatId}_${lastSenderUid || lastSenderName}_${rawTime}_${data.lastMessage || ''}`;

        // ANTI-SPAM : Si l'ID du message a déjà été notifié, ignorer les snapshots suivants
        if (notifiedMessageIds.current && notifiedMessageIds.current.has(messageId)) {
          return;
        }

        // Condition vitale : Affiche le Toast UNIQUEMENT si l'utilisateur n'est pas déjà dans ce chat actif
        const currentActiveTab = activeTabRef.current;
        const currentSelectedChat = selectedChatRef.current;
        const currentPath = typeof window !== 'undefined' ? (window.location.pathname + window.location.hash + window.location.search) : '';
        const isCurrentChatUrl = currentPath.includes(String(chatId)) || (currentPath.includes('chat') && currentSelectedChat && String(currentSelectedChat.id) === String(chatId));
        const isCurrentlyViewingThisChat = (currentActiveTab === 'chat' && currentSelectedChat && String(currentSelectedChat.id) === String(chatId)) || isCurrentChatUrl;

        if (!isCurrentlyViewingThisChat) {
          // Enregistrer dans le Set anti-spam
          notifiedMessageIds.current.add(messageId);
          if (notifiedMessageIds.current.size > 500) {
            const oldest = notifiedMessageIds.current.values().next().value;
            notifiedMessageIds.current.delete(oldest);
          }

          const senderTitle = data.lastSenderName || data.lastSender || data.user || 'Nouveau message';
          const messageText = data.lastMessage || 'Nouveau message reçu';
          const senderAvatar = data.avatar || data.authorAvatar || null;

          // Déclencher l'affichage du Toast de notification Dynamic Island au premier plan (z-[999999])
          notificationService.show({
            id: messageId,
            title: senderTitle,
            message: messageText,
            avatar: senderAvatar,
            icon: 'chat',
            duration: 3000,
            onClick: () => {
              setSelectedChat(data);
              if (typeof setActiveTab === 'function') {
                setActiveTab('chat');
              }
              if (typeof window !== 'undefined') {
                window.location.hash = `chat/${chatId}`;
              }
            },
            data: { chatId, messageId }
          });

          // Vibration haptique
          safeVibrate([80, 40, 80]);
        }
      }
    };

    try {
      // 1. Écoute par participantUids (UID universel)
      const qUids = query(
        collection(db, 'chats'),
        where('participantUids', 'array-contains', String(currentUid))
      );
      const unsubUids = onSnapshot(qUids, (snap) => {
        snap.docChanges().forEach(handleChatDocChange);
        isInitial = false;
      }, (err) => {
        logger.warn('[App.js] Background message listener error (participantUids):', err);
      });
      unsubs.push(unsubUids);

      // 2. Écoute par participants (UID Firebase strict pour respecter les règles de sécurité Firestore)
      const qParticipants = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', String(currentUid))
      );
      const unsubParticipants = onSnapshot(qParticipants, (snap) => {
        snap.docChanges().forEach(handleChatDocChange);
        isInitial = false;
      }, (err) => {
        logger.warn('[App.js] Background message listener warning (participants):', err);
      });
      unsubs.push(unsubParticipants);
    } catch (err) {
      logger.warn('[App.js] Background message listener setup error:', err);
    }

    return () => {
      unsubs.forEach(u => { try { if (typeof u === 'function') u(); } catch (_) { } });
    };
  }, [profile?.uid, profile?.name, profile?.username, setSelectedChat, setActiveTab]);

  // Écoute de l'événement personnalisé troco:open_chat pour basculer vers le chat
  useEffect(() => {
    const handleOpenChatEvent = (e) => {
      const chatId = e.detail?.chatId;
      if (chatId) {
        const found = (chatsList || []).find(c => String(c.id) === String(chatId));
        if (found) {
          setSelectedChat(found);
        } else {
          setSelectedChat({ id: chatId, user: e.detail?.user || 'Interlocuteur' });
        }
        if (typeof setActiveTab === 'function') {
          setActiveTab('chat');
        }
      }
    };
    window.addEventListener('troco:open_chat', handleOpenChatEvent);
    return () => window.removeEventListener('troco:open_chat', handleOpenChatEvent);
  }, [chatsList, setSelectedChat, setActiveTab]);

  // État de gestion tactile d'annonce mobile (Chantier 4)
  const [mobileListingActionTarget, setMobileListingActionTarget] = useState(null);

  // ---- ÉTATS APPEL WEBRTC AVANCÉ (PIP) ----
  const [isCallPip, setIsCallPip] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [pipPosition, setPipPosition] = useState({
    x: typeof window !== 'undefined' ? Math.max(10, window.innerWidth - 230) : 100,
    y: typeof window !== 'undefined' ? Math.max(10, window.innerHeight - 240) : 100
  });

  // Gestion Pointer Events API unifiée pour le Drag-and-Drop (toucher/souris à 60fps)
  const pipPointerDragRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialPosX: 0,
    initialPosY: 0,
    movedDistance: 0,
  });

  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settlementCallDuration, setSettlementCallDuration] = useState(0);
  const prevActiveRef = useRef(false);

  // Chronomètre de Deal en temps réel pendant l'appel (1h = 1 Jeton Troco)
  useEffect(() => {
    let timer = null;
    if (callState.active && !callState.ringing) {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      prevActiveRef.current = true;
    } else {
      if (prevActiveRef.current && callDuration > 5) {
        setSettlementCallDuration(callDuration);
        setIsSettlementModalOpen(true);
      }
      prevActiveRef.current = false;
      setCallDuration(0);
      setIsCallPip(false);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callState.active, callState.ringing]); // eslint-disable-line

  // Rétribution en jetons & structure transparente de frais extraite dans useDealActions

  // Formateur du chronomètre de deal (HH:MM:SS ou MM:SS)
  const formatCallTimer = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handlers Pointer Events (pointerdown, pointermove, pointerup, pointercancel)
  const handlePipPointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) { }
    pipPointerDragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: pipPosition.x,
      initialPosY: pipPosition.y,
      movedDistance: 0,
    };
  };

  const handlePipPointerMove = (e) => {
    if (!pipPointerDragRef.current.isDragging) return;
    const deltaX = e.clientX - pipPointerDragRef.current.startX;
    const deltaY = e.clientY - pipPointerDragRef.current.startY;
    pipPointerDragRef.current.movedDistance = Math.hypot(deltaX, deltaY);

    const bottomNavOffset = 75;
    const minX = 0;
    const maxX = Math.max(0, window.innerWidth - 45);
    const maxY = Math.max(10, window.innerHeight - 150 - bottomNavOffset);

    const nextX = Math.max(minX, Math.min(maxX, pipPointerDragRef.current.initialPosX + deltaX));
    const nextY = Math.max(10, Math.min(maxY, pipPointerDragRef.current.initialPosY + deltaY));

    setPipPosition({ x: nextX, y: nextY });
  };

  const handlePipPointerUp = (e) => {
    if (!pipPointerDragRef.current.isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) { }
    pipPointerDragRef.current.isDragging = false;
  };

  const handlePipPointerCancel = (e) => {
    if (!pipPointerDragRef.current.isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) { }
    pipPointerDragRef.current.isDragging = false;
  };

  const handlePipContentClick = (e) => {
    // Si la distance parcourue est >= 6px, c'est un glisser-déposer : ignorer le clic pour éviter les faux déclenchements
    if (pipPointerDragRef.current.movedDistance >= 6) {
      e.stopPropagation();
      return;
    }
    setIsCallPip(false);
  };

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
      const hiddenMsg = (t('adminListingHidden') || '🚫 Annonce #{id} masquée du feed public').replace('{id}', listing.id);
      const visibleMsg = (t('adminListingVisible') || '👁️ Annonce #{id} visible').replace('{id}', listing.id);
      setSaveMessage(newHidden ? hiddenMsg : visibleMsg);
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



  // ---- ÉTATS PAGINATION FEED (PAGINATED INFINITE SCROLL) ----
  const [lastVisibleListingDoc, setLastVisibleListingDoc] = useState(null);
  const [hasMoreListings, setHasMoreListings] = useState(true);
  const [isLoadingMoreListings, setIsLoadingMoreListings] = useState(false);

  // ---- SYNC TEMPS RÉEL FIRESTORE (LIMIT 50) ----
  // Chargement des annonces réelles Firestore filtrées par status == 'active' pour se conformer aux règles de sécurité
  useEffect(() => {
    let unsubFirestore = () => { };
    let isCancelled = false;

    // Requête principale conforme aux règles Firestore (where status == 'active')
    const initialQuery = query(
      collection(db, 'listings'),
      where('status', '==', 'active'),
      limit(50)
    );

    unsubFirestore = onSnapshot(
      initialQuery,
      (snapshot) => {
        if (isCancelled) return;
        const firestoreListings = snapshot.docs
          .map((docSnap) => ({
            id: docSnap.data().id || docSnap.id,
            firestoreId: docSnap.id,
            ...docSnap.data(),
            status: docSnap.data().status || 'active',
            isDemo: Boolean(docSnap.data().isDemo ?? (typeof docSnap.data().id === 'number' && docSnap.data().id <= 20)),
            _doc: docSnap,
          }))
          .filter(l => !l.isDemo && !(typeof l.id === 'number' && l.id <= 20) && l.status === 'active');

        const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
        setLastVisibleListingDoc(lastDoc);
        setHasMoreListings(snapshot.docs.length >= 50);

        setListings(prev => {
          const customLocalListings = prev.filter(p => !p.isDemo && !(typeof p.id === 'number' && p.id <= 20) && !firestoreListings.some(f => f.id === p.id));
          return [...firestoreListings, ...customLocalListings];
        });
      },
      (error) => {
        logger.warn('[Firestore] onSnapshot listings query error:', error);
        if (!isCancelled) {
          try {
            const fallbackQuery = query(collection(db, 'listings'), limit(50));
            unsubFirestore = onSnapshot(fallbackQuery, (snapshot) => {
              if (isCancelled) return;
              const firestoreListings = snapshot.docs
                .map((docSnap) => ({
                  id: docSnap.data().id || docSnap.id,
                  firestoreId: docSnap.id,
                  ...docSnap.data(),
                  status: docSnap.data().status || 'active',
                  isDemo: Boolean(docSnap.data().isDemo ?? (typeof docSnap.data().id === 'number' && docSnap.data().id <= 20)),
                  _doc: docSnap,
                }))
                .filter(l => !l.isDemo && !(typeof l.id === 'number' && l.id <= 20) && l.status === 'active');
              const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
              setLastVisibleListingDoc(lastDoc);
              setHasMoreListings(snapshot.docs.length >= 50);
              setListings(prev => {
                const customLocalListings = prev.filter(p => !p.isDemo && !(typeof p.id === 'number' && p.id <= 20) && !firestoreListings.some(f => f.id === p.id));
                return [...firestoreListings, ...customLocalListings];
              });
            }, (fallbackErr) => {
              logger.error('[Firestore] Fallback listings query failed:', fallbackErr);
            });
          } catch (_) { }
        }
      }
    );

    return () => {
      isCancelled = true;
      try { unsubFirestore(); } catch (_) { }
    };
  }, []);

  const handleLoadMoreListings = async () => {
    if (isLoadingMoreListings || !hasMoreListings) return;
    setIsLoadingMoreListings(true);
    try {
      let result;
      if (userCoords && Array.isArray(userCoords) && userCoords.length >= 2 && !isInfiniteRadius && radiusKm < 2000) {
        result = await fetchListingsByGeohash({ center: userCoords, radiusKm, pageSize: 25 });
      } else {
        result = await fetchListingsPaginated({ pageSize: 20, lastDoc: lastVisibleListingDoc });
      }

      if (result && result.items && result.items.length > 0) {
        setListings(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newItems = result.items.filter(item => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
        setLastVisibleListingDoc(result.lastVisible || null);
        setHasMoreListings(result.hasMore || false);
      } else {
        setHasMoreListings(false);
      }
    } catch (err) {
      logger.error('[App] handleLoadMoreListings error:', err);
    } finally {
      setIsLoadingMoreListings(false);
    }
  };

  const handleRefreshFeed = async () => {
    try {
      setLastVisibleListingDoc(null);
      setHasMoreListings(true);
      let result;
      if (userCoords && Array.isArray(userCoords) && userCoords.length >= 2 && !isInfiniteRadius && radiusKm < 2000) {
        result = await fetchListingsByGeohash({ center: userCoords, radiusKm, pageSize: 25 });
      } else {
        result = await fetchListingsPaginated({ pageSize: 50, lastDoc: null });
      }
      if (result && result.items) {
        setListings(result.items);
        setLastVisibleListingDoc(result.lastVisible || null);
        setHasMoreListings(result.hasMore || false);
      }
    } catch (err) {
      logger.error('[App] handleRefreshFeed error:', err);
    }
  };

  const getListingDistance = (item) => {
    if (typeof item.distanceKm === 'number') return item.distanceKm;
    if (item.coordinates && userCoords) {
      return calculateHaversineDistance(userCoords[0], userCoords[1], item.coordinates[0], item.coordinates[1]);
    }
    const match = String(item.location || '').match(/(\d+(?:\.\d+)?)\s*km/i);
    if (match) return parseFloat(match[1]);
    return null;
  };

  const removeAccents = (str = '') => {
    return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  // Résolution dynamique des alias géographiques via OpenStreetMap Nominatim
  const [dynamicSearchAliases, setDynamicSearchAliases] = useState([]);

  useEffect(() => {
    const abortController = new AbortController();
    let isCurrentSearch = true;
    const raw = (debouncedSearchQuery || '').trim();
    if (raw.length >= 3) {
      searchNominatim(raw, { limit: 3, signal: abortController.signal }).then(results => {
        if (!isCurrentSearch) return;
        if (results && results.length > 0) {
          const names = results
            .map(r => [r.cityName, r.displayName, r.country])
            .flat()
            .filter(Boolean)
            .map(removeAccents);
          setDynamicSearchAliases(Array.from(new Set(names)));
        } else {
          setDynamicSearchAliases([]);
        }
      }).catch((error) => {
        if (error?.name !== 'AbortError' && isCurrentSearch) {
          setDynamicSearchAliases([]);
        }
      });
    } else {
      setDynamicSearchAliases([]);
    }

    return () => {
      isCurrentSearch = false;
      abortController.abort();
    };
  }, [debouncedSearchQuery]);

  // Extraction des UIDs d'auteurs pour le listener users_public chunké & paginé
  const visibleAuthorUids = useMemo(() => {
    const uids = new Set();
    listings.forEach(item => {
      const uid = item.authorUid || item.userId || item.sellerId;
      if (uid && typeof uid === 'string') uids.add(uid);
    });
    return Array.from(uids);
  }, [listings]);

  const { usersMap: usersPublicMap, usersList: usersPublicList } = useUsersPublic({ uids: visibleAuthorUids });

  // Sync usersPublic vers allFirestoreUsers pour compatibilité
  useEffect(() => {
    setAllFirestoreUsers(usersPublicList);
  }, [usersPublicList]);

  const usersByUid = useMemo(() => {
    const map = new Map();
    allFirestoreUsers.forEach((user) => {
      if (user.uid) map.set(user.uid, user);
    });
    return map;
  }, [allFirestoreUsers]);

  const usersByName = useMemo(() => {
    const map = new Map();
    allFirestoreUsers.forEach((user) => {
      if (user.name) map.set(user.name.trim().toLowerCase(), user);
    });
    return map;
  }, [allFirestoreUsers]);

  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      // Purge totale des annonces démo : seules les vraies annonces actives Firestore s'affichent
      if (item.isDemo || (typeof item.id === 'number' && item.id <= 20)) return false;

      const rawQuery = (deferredSearchQuery || '').trim();
      const cleanQuery = removeAccents(rawQuery);
      const words = cleanQuery.split(/\s+/).filter(Boolean);

      const itemLocationNorm = removeAccents(item.location || '');
      const itemTitleNorm = removeAccents(item.title || '');
      const itemCategoryNorm = removeAccents(item.category || '');
      const itemCompNorm = removeAccents(item.compensation || '');
      const allTags = [
        ...(Array.isArray(item.tags) ? item.tags : []),
        ...(typeof generateTags === 'function' ? (generateTags(item.title || '', item.description || '') || []) : [])
      ];
      const itemTagsNorm = removeAccents(allTags.join(' '));
      const itemDescNorm = removeAccents(item.description || '');
      const transText = item.translations ? Object.values(item.translations).map(t => `${t.title || ''} ${t.description || ''}`).join(' ') : '';
      const itemTransNorm = removeAccents(transText);

      const searchText = `${itemTitleNorm} ${itemCategoryNorm} ${itemLocationNorm} ${itemCompNorm} ${itemTagsNorm} ${itemDescNorm} ${itemTransNorm}`;

      const matchesSearch = (() => {
        if (!cleanQuery) return true;

        // 1. Match direct du texte
        if (searchText.includes(cleanQuery)) return true;

        // 2. Match via recherche dynamique OpenStreetMap Nominatim (remplace les dictionnaires statiques)
        if (dynamicSearchAliases.length > 0 && dynamicSearchAliases.some(alias => searchText.includes(alias) || alias.includes(cleanQuery))) {
          return true;
        }

        // 3. Match mot par mot
        return words.every(w => searchText.includes(w));
      })();
      const matchesFormat = (() => {
        if (formatFilter === 'all' || !formatFilter) return true;
        const itemFormat = String(item.format || (item.type === 'remote' ? 'remote' : (item.type === 'both' ? 'both' : 'onsite'))).toLowerCase();
        if (formatFilter === 'remote') {
          return itemFormat === 'remote' || itemFormat === 'both' || itemFormat.includes('visio') || itemFormat.includes('distance');
        }
        if (formatFilter === 'onsite') {
          return itemFormat === 'onsite' || itemFormat === 'both' || itemFormat.includes('presentiel') || itemFormat.includes('sur place');
        }
        return true;
      })();

      const matchesCategory = (() => {
        if (!selectedCategory || selectedCategory === 'all' || selectedCategory === 'Tous') return true;
        const cat = String(item.category || '').toLowerCase();
        const selCat = String(selectedCategory || '').toLowerCase();


        if (selCat.includes('cours') || selCat.includes('compétence')) {
          return cat.includes('cours') || cat.includes('compétence') || cat.includes('formation') || cat.includes('coaching');
        }
        if (selCat.includes('outillage') || selCat.includes('matériel')) {
          return cat.includes('outillage') || cat.includes('matériel') || cat.includes('prêt');
        }
        if (selCat.includes('services') || selCat.includes('dépannage')) {
          return cat.includes('services') || cat.includes('dépannage') || cat.includes('réparation');
        }
        if (selCat.includes('logement') || selCat.includes('swap')) {
          return cat.includes('logement') || cat.includes('swap') || cat.includes('hébergement');
        }
        return cat.includes(selCat);
      })();

      const itemLangs = item.languages ? [...item.languages, ...(item.translations ? Object.keys(item.translations) : []), item.nativeLang || 'FR'] : [item.nativeLang || 'FR', ...(item.translations ? Object.keys(item.translations) : [])];
      const matchesLanguage = selectedLanguages.length === 0 || itemLangs.some(lang => selectedLanguages.includes(lang));
      const compStr = String(item.compensation || '');
      const matchesPayment = selectedPayment === 'all' || (selectedPayment === 'credits' && compStr.includes('Crédit')) || (selectedPayment === 'cash' && compStr.includes('€')) || (selectedPayment === 'troc' && compStr.includes('Troc')) || (selectedPayment === 'hybrid' && compStr.includes('+'));

      const distance = getListingDistance(item);
      const matchesDistance = (() => {
        if (isInfiniteRadius || radiusKm >= 2000) return true;
        // Si on n'a pas pu calculer la distance (pas de coordonnées) :
        // on affiche l'annonce quand même pour ne pas vider le feed.
        if (distance === null) return true;
        return distance <= radiusKm;
      })();

      // Filtrage Shadow-Ban via users_public (Lookup O(1) Map)
      const authorUid = item.authorUid || item.userId || item.sellerId;
      const authorUser = (authorUid && usersPublicMap.get(authorUid))
        || (authorUid && usersByUid.get(authorUid))
        || usersByName.get((item.author || '').trim().toLowerCase());
      const currentUid = profile?.uid || auth.currentUser?.uid;
      const isSelf = (authorUid && currentUid && authorUid === currentUid) || (item.author && profile?.name && item.author === profile.name);

      if ((authorUser?.isBanned || authorUser?.isShadowBanned || authorUser?.shadowBannedPublic) && !isSelf) return false;

      return item.status !== 'paused' && matchesSearch && matchesFormat && matchesCategory && matchesLanguage && matchesPayment && matchesDistance;
    }).sort((a, b) => {
      // 1. Annonces boostées / sponsorisées en priorité absolue (PC & Mobile)
      const aBoost = (a.isBoosted || a.sponsored) ? 1 : 0;
      const bBoost = (b.isBoosted || b.sponsored) ? 1 : 0;
      if (bBoost !== aBoost) return bBoost - aBoost;

      // 2. Annonces créées par de vrais utilisateurs (humains) avant les annonces Démo / IA
      const aDemo = (a.isDemo || a.persona || (typeof a.id === 'number' && a.id < 300)) ? 1 : 0;
      const bDemo = (b.isDemo || b.persona || (typeof b.id === 'number' && b.id < 300)) ? 1 : 0;
      if (aDemo !== bDemo) return aDemo - bDemo;

      // 3. Annonces urgentes en priorité
      const aUrgent = (a.urgent || a.isUrgent) ? 1 : 0;
      const bUrgent = (b.urgent || b.isUrgent) ? 1 : 0;
      if (bUrgent !== aUrgent) return bUrgent - aUrgent;

      // 4. Tri chronologique par date de création ou identifiant
      const getTime = (item) => {
        if (item.createdAt?.toMillis) return item.createdAt.toMillis();
        if (item.createdAt?.seconds) return item.createdAt.seconds * 1000;
        if (typeof item.createdAt === 'string') return new Date(item.createdAt).getTime() || 0;
        if (typeof item.createdAt === 'number') return item.createdAt;
        const numId = Number(String(item.id).replace(/\D/g, ''));
        return isNaN(numId) ? 0 : numId;
      };
      return getTime(b) - getTime(a);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    listings,
    deferredSearchQuery,
    formatFilter,
    selectedCategory,
    selectedLanguages,
    selectedPayment,
    radiusKm,
    isInfiniteRadius,
    hideDemos,
    userCoords,
    dynamicSearchAliases,
    profile.name,
    profile?.uid,
    auth.currentUser?.uid,
    usersPublicMap,
    usersByUid,
    usersByName
  ]);

  const listingsGridRef = useRef(null);
  const loadMoreSentinelRef = useRef(null);

  // ---- INFINITE SCROLL AUTOMATIQUE VIA INTERSECTION OBSERVER ----
  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;
    if (!hasMoreListings || isLoadingMoreListings || activeTab !== 'feed') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0] && entries[0].isIntersecting) {
          handleLoadMoreListings();
        }
      },
      { rootMargin: '350px 0px', threshold: 0.1 }
    );

    const target = loadMoreSentinelRef.current;
    if (target) observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMoreListings, isLoadingMoreListings, activeTab, lastVisibleListingDoc]);

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
  getListingDetailRef.current = getListingDetail;

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

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      logger.warn('SignOut error:', e);
    }
    clearSessionFlags();
    storage.remove('troco_user_profile');
    setIsAuthenticated(false);
    setSelectedChat(null);
    setSelectedListing(null);
    if (callState.active) endCall();
  };

  // ---- VALIDATION OBLIGATOIRE DES CGU / RGPD ----
  const handleAcceptCgu = async ({ cguVersion, acceptedAt } = {}) => {
    // 1. Verrou synchrone d'urgence immédiat AVANT tout appel Firestore
    try {
      window.sessionStorage?.setItem('troco_cgu_dismissed', 'true');
      window.localStorage?.setItem('troco_cgu_dismissed', 'true');
    } catch (_) { }
    setCguDismissed(true);

    const now = acceptedAt || new Date().toISOString();
    setProfile(prev => {
      const updated = { ...prev, cguAcceptedAt: now, cguVersion: cguVersion || '2026.1' };
      storage.setDebounced('troco_user_profile', updated);
      return updated;
    });

    // 2. Persistance Firestore avec serverTimestamp ciblant le VRAI auth.currentUser.uid natif
    const targetUid = auth.currentUser?.uid || profile?.uid;
    if (targetUid && db) {
      try {
        await updateDoc(doc(db, 'users', String(targetUid)), {
          cguAcceptedAt: serverTimestamp(),
          cguVersion: cguVersion || '2026.1',
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        logger.warn('[Firestore] CGU acceptance update failed:', e);
      }
    }
  };

  if (!isAuthResolved || isLoadingSession || (isAuthenticated && isProfileLoading)) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-global)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'var(--font-family-main)',
        zIndex: 999999
      }}>
        {/* FOND LIQUIDE IRIDESCENT : DÉGRADÉ STATIQUE LÉGER SUR MOBILE & TACTILE POUR ÉVITER LE CRASH iOS */}
        {(isTouchDevice || isMobileDevice) ? (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at top right, var(--bg-subtle), var(--bg-global))',
            pointerEvents: 'none',
            zIndex: 0
          }} />
        ) : (
          <div className="liquid-iridescence-container" style={{ opacity: 0.92, background: 'radial-gradient(circle at 50% 50%, var(--bg-subtle) 0%, var(--bg-global) 100%)' }}>
            <div className="liquid-blob liquid-blob-1" style={{ width: '750px', height: '750px' }} />
            <div className="liquid-blob liquid-blob-2" style={{ width: '800px', height: '800px' }} />
            <div className="liquid-blob liquid-blob-3" style={{ width: '680px', height: '680px' }} />
          </div>
        )}

        <div style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '30px',
          animation: 'modalSlideIn 0.8s var(--ease-monopo) both'
        }}>
          {/* 🚨 PHASE 108 & 114 : ÉRADICATION DU CRASH OOM iOS (LAZY LOADING & DÉMONTAGE WEBGL STRICT) */}
          {(!isTouchDevice && !isMobileDevice) ? (
            <Suspense fallback={null}>
              <TrocoLogo3D size={100} animated={true} style={{ marginBottom: '28px' }} />
            </Suspense>
          ) : (
            <TrocoLogoNativeSvg size={100} animated={true} style={{ marginBottom: '28px' }} />
          )}
          <div style={{
            fontSize: 'clamp(56px, 14vw, 92px)',
            fontFamily: 'var(--font-editorial)',
            fontWeight: 300,
            letterSpacing: '0.22em',
            color: 'var(--text-main)',
            lineHeight: 1,
            textTransform: 'uppercase',
            marginBottom: '16px',
            textShadow: '0 10px 40px rgba(0,0,0,0.06)'
          }}>
            Troco
          </div>

          <div style={{
            fontSize: '12px',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            fontWeight: '700',
            color: 'var(--accent-primary)',
            marginBottom: '36px'
          }}>
            Liberté d'Échange & Savoir-Faire
          </div>

          {/* INDICATEUR DE CHARGEMENT HAUTE-COUTURE */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '9px 20px',
            borderRadius: '999px',
            backgroundColor: 'var(--bg-glass)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '0.06em',
            boxShadow: 'var(--shadow-card)'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-primary)',
              boxShadow: '0 0 12px var(--accent-primary)',
              animation: 'pulse 1.2s infinite ease-in-out'
            }} />
            <span style={{ textTransform: 'uppercase' }}>Vérification de la session...</span>
          </div>
        </div>
      </div>
    );
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
        <div
          className={isLowEnd ? 'low-end-device' : undefined}
          style={{
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
            t={t}
          />

          {/* ORCHESTRATEUR GLOBAL DE TOUTES LES MODALES & OVERLAYS APPLICATIFS */}
          <ModalOrchestrator
            ui={ui}
            profile={profile}
            listings={listings}
            chatThreads={chatThreads}
            userTransactions={userTransactions}
            handleOpenPayment={handleOpenPayment}
            handlePaymentSuccess={handlePaymentSuccess}
            handleAdminDeleteListing={handleAdminDeleteListing}
            handleAdminToggleHideListing={handleAdminToggleHideListing}
            handleAdminEditListing={handleAdminEditListing}
            darkMode={darkMode}
            currentLang={currentLang}
            t={t}
            isAuthenticated={isAuthenticated}
            isLoadingSession={isLoadingSession}
            cguDismissed={cguDismissed}
            setCguDismissed={setCguDismissed}
            cguBypassRef={cguBypassRef}
            handleAcceptCgu={handleAcceptCgu}
            confirmBoostListing={confirmBoostListing}
            pendingEmailLinkHref={pendingEmailLinkHref}
            handleConfirmEmailLink={handleConfirmEmailLink}
            handleCancelEmailLink={handleCancelEmailLink}
            setLang={setLang}
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
            communityProfileUser={communityProfileUser}
            handleOpenListing={handleOpenListing}
            handleStartDiscussion={handleStartDiscussion}
            isCounterOfferOpen={isCounterOfferOpen}
            setIsCounterOfferOpen={setIsCounterOfferOpen}
            editingDealId={editingDealId}
            setEditingDealId={setEditingDealId}
            handleCounterOfferSubmit={handleCounterOfferSubmit}
            counterOfferDraft={counterOfferDraft}
            playBetclicBalanceSound={playBetclicBalanceSound}
            playApplePaySound={playApplePaySound}
            checkoutSession={checkoutSession}
            cancelCheckout={cancelCheckout}
            applyCheckout={applyCheckout}
            isCheckoutProcessing={isCheckoutProcessing}
            checkoutStatus={checkoutStatus}
            isRateLimited={isRateLimited}
            retryAfterSeconds={retryAfterSeconds}
            resetRateLimit={resetRateLimit}
            handleCompleteOnboarding={handleCompleteOnboarding}
            isWelcomeGiftModalOpen={isWelcomeGiftModalOpen}
            setIsWelcomeGiftModalOpen={setIsWelcomeGiftModalOpen}
            handleKycComplete={handleKycComplete}
            handleDeleteAccount={handleDeleteAccount}
            transactionSuccessModalConfig={transactionSuccessModalConfig}
            handleCloseTransactionSuccessModal={handleCloseTransactionSuccessModal}
            isUserBanned={isUserBanned}
            bannedReason={bannedReason}
            isMobile={isMobile}
            showingOriginalListings={showingOriginalListings}
            toggleOriginalListing={toggleOriginalListing}
            handleViewOnMap={handleViewOnMap}
            formatCompensation={formatCompensation}
            isAdmin={isAdmin}
            confirm={confirm}
          />

          <ConfirmDialog />

          {/* TUTORIEL INTERACTIF IA POUR NOUVEAUX UTILISATEURS (JOUR 1) */}
          {isTutorialOpen && (
            <InteractiveTutorial
              isOpen={isTutorialOpen}
              currentStep={tutorialCurrentStep}
              onNext={nextTutorialStep}
              onPrev={prevTutorialStep}
              onSkip={skipTutorial}
              onComplete={completeTutorial}
              darkMode={darkMode}
              currentLang={currentLang}
              t={t}
              profile={profile}
            />
          )}

          {/* SPLASH SCREEN INTERACTIF CRT + 1-BIT DITHER (TÂCHE 5) */}
          {showSplash && !isAuthenticated && (
            <SplashScreen
              onComplete={handleSplashComplete}
              darkMode={darkMode}
              t={t}
            />
          )}
        </div>
      </ConfirmProvider>
    </LanguageContext.Provider>
  );
}