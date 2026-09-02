import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense, useTransition } from 'react';
import { Search, MapPin, Video, Globe, Filter, ShieldCheck, CheckCircle, X, Sparkles, Coins, Trash2, Camera, Flame, Check, Lock, CreditCard, Tag, ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react';
import { auth, db } from './firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp, onSnapshot, query, orderBy, limit, setDoc, deleteDoc, getDoc, getDocs, where, runTransaction } from 'firebase/firestore';
import { fetchListingsPaginated, fetchListingsByGeohash } from './services/firestoreService';
import { isSignInWithEmailLink, signInWithEmailLink, signOut, onAuthStateChanged } from 'firebase/auth';
import { useWebRTC } from './hooks/useWebRTC';
import { useTheme } from './contexts/ThemeContext';
import { SkeletonModalFallback } from './components/SkeletonLoader';
import CookieBanner from './components/CookieBanner';
import { TROCO_CATEGORIES } from './data/categoriesData';
import { subscribeTranslations } from './utils/translator';
import { playApplePaySound, playBetclicBalanceSound, playWelcomeGiftFanfare } from './utils/audioService';
import { useChatManager } from './hooks/useChatManager';
import { AppHeader, AppBottomNav, GeometricBackground } from './components/layout';
import MobileHeader from './components/common/MobileHeader';
import { getSuggestedMedia, getSuggestedImage, getFallbackImage } from './utils/mediaHelpers';
import FeedCardItem from './components/FeedCardItem';
import { generateInvoiceRef } from './components/InvoiceCalculator';
import TrocoLogo3D from './components/common/TrocoLogo3D';
import OfflineScreen from './components/common/OfflineScreen';
import PWAInstallBanner from './components/PWAInstallBanner';
import SponsoredFeedCard from './components/SponsoredFeedCard';
import SectoralErrorBoundary from './components/SectoralErrorBoundary';
import AuthScreen from './features/auth/AuthScreen';
import { useWalletStore } from './stores';
import haptics from './utils/haptics';
import { useAppAuth } from './hooks/useAppAuth';
import { useAppNavigation } from './hooks/useAppNavigation';
import { useAppModals } from './hooks/useAppModals';
import Portal from './components/ui/Portal';
import { getCategoryLabel as getCategoryLabelUtil, formatStatus as formatStatusUtil, formatTokenCount as formatTokenCountUtil, formatCompensation as formatCompensationUtil } from './utils/formatters';
import { generateTags } from './utils/tagGenerator';
import {
  getChatMessageDisplayContent,
  getBioTranslation,
  getListingDisplayContent,
  getListingTitleTranslation,
} from './utils/translationHelpers';
import FilterDrawer from './components/modals/FilterDrawer';
import LanguageSelectModal from './components/modals/LanguageSelectModal';
import { motion, AnimatePresence } from 'framer-motion';
import {
  translations,
  ensureLanguageLoaded,
  localizeLocation,
  localizeTags,
  localizeReview,
} from './data/translationsData';
import {
  calculateHaversineDistance,
  searchNominatim,
  lookupCoordinatesDynamic,
} from './utils/geocodingNominatim';

import { useGlobalContent } from './features/admin/useGlobalContent';
import { EmptyState } from './components/ui/EmptyState';
import OfflineBanner from './components/common/OfflineBanner';
import NotificationPill from './components/ui/NotificationPill';

// Lazy-loaded heavy components & modals (Strict Code-Splitting)
const AdminDashboard = React.lazy(() => import('./features/admin/AdminDashboard'));
const ReportModal = React.lazy(() => import('./components/ReportModal'));
const CguModal = React.lazy(() => import('./components/CguModal'));
const PrivacyCenterModal = React.lazy(() => import('./components/PrivacyCenterModal'));
const OnboardingWizardModal = React.lazy(() => import('./components/OnboardingWizardModal'));
const WelcomeGiftCelebrationModal = React.lazy(() => import('./components/WelcomeGiftCelebrationModal'));
const VisioSettlementModal = React.lazy(() => import('./components/VisioSettlementModal'));
const KycModal = React.lazy(() => import('./components/KycModal'));
const CounterOfferModal = React.lazy(() => import('./components/CounterOfferModal'));
const PublicProfileModal = React.lazy(() => import('./components/PublicProfileModal'));
const CategoryPickerModal = React.lazy(() => import('./components/modals/CategoryPickerModal'));
const BoostListingModal = React.lazy(() => import('./components/modals/BoostListingModal'));
const CguConsentModal = React.lazy(() => import('./components/modals/CguConsentModal'));
const MapSection = React.lazy(() => import('./features/map/MapSection'));
const ChatSection = React.lazy(() => import('./features/chat/ChatSection'));
const CommunityHubSection = React.lazy(() => import('./features/community/CommunityHubSection'));
const PaymentFeature = React.lazy(() => import('./features/payment'));
const CallFeature = React.lazy(() => import('./features/call'));
const WebRTCCallOverlay = React.lazy(() => import('./features/call/WebRTCCallOverlay'));
const PostListingFeature = React.lazy(() => import('./features/post/PostListingFeature'));
const ProfileFeature = React.lazy(() => import('./features/profile/ProfileFeature'));

// 🚨 PHASE 60 : STANDARDISATION DES TRANSITIONS GLOBAL FRAMER MOTION (Fade + Scale)
export const pageTransitionVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 }
};
export const pageTransitionConfig = { duration: 0.2, ease: "easeOut" };

export default function App() {
  const {
    theme,
    isDark: darkMode,
    toggleTheme: toggleDarkMode,
  } = useTheme();
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [currentLang, setCurrentLang] = useState('FR');
  const [userCoords, setUserCoords] = useState([48.8566, 2.3522]); // Paris par défaut
  const [isGeolocated, setIsGeolocated] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  // Chargement différé et dynamique du pack de langue sélectionné
  useEffect(() => {
    if (currentLang && currentLang !== 'FR') {
      ensureLanguageLoaded(currentLang);
    }
  }, [currentLang]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const t = useCallback((key) => (translations?.[currentLang]?.[key]) || (translations?.['FR']?.[key]) || key, [currentLang]);

  const getCategoryLabel = useCallback((categoryKey) => getCategoryLabelUtil(categoryKey, t), [t]);
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
    isLoadingSession,
    setIsLoadingSession,
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
  } = useAppAuth();

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
    topUpCelebration,
    setTopUpCelebration,
  } = ui;

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
  const [isPending, startTransition] = useTransition();

  // 🚨 PHASE 58 : INITIALISATION & VERROUILLAGE GÉO-IP DE LA DEVISE
  useEffect(() => {
    try {
      useWalletStore.getState().initializeGeoCurrency?.();
    } catch (_) {}
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
  const prevTokensRef = useRef(profile?.trocoTokens);
  const prevEurosRef = useRef(profile?.euroBalance);
  useEffect(() => {
    if (prevTokensRef.current !== undefined && profile?.trocoTokens !== undefined) {
      const currentVal = Number(profile.trocoTokens);
      const prevVal = Number(prevTokensRef.current);
      if (currentVal > prevVal) {
        const gained = currentVal - prevVal;
        playBetclicBalanceSound();
        setTopUpCelebration({
          title: `+${gained} Jeton${gained > 1 ? 's' : ''} Troco reçus ! 🪙`,
          subtitle: `Nouveau solde : ${currentVal} Jetons Troco`,
        });
        setTimeout(() => setTopUpCelebration(null), 4500);
      }
    }
    prevTokensRef.current = profile?.trocoTokens;
  }, [profile?.trocoTokens, setTopUpCelebration]);

  const [userTransactions, setUserTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem('troco_user_transactions');
      return saved ? JSON.parse(saved) : [
        {
          id: 'tx-seed-1',
          transactionId: 'TRK-202603-4819',
          label: 'Achat 5 Jetons Troco (Essentiel)',
          mode: 'pack-tokens',
          amountTtc: 49.99,
          amountHt: 41.66,
          tva: 8.33,
          currency: 'EUR',
          paymentMethod: 'Apple Pay',
          authRef: 'APL-92KDA81',
          date: '2026-03-10T14:23:00.000Z',
          tokensPurchased: 5,
        },
        {
          id: 'tx-seed-2',
          transactionId: 'TRK-202603-3102',
          label: 'Recharge Portefeuille Troco (20.00 €)',
          mode: 'topup-cash',
          amountTtc: 20.00,
          amountHt: 16.67,
          tva: 3.33,
          currency: 'EUR',
          paymentMethod: 'Carte Bancaire (VISA •••• 4242)',
          authRef: 'STR-71NXL90',
          date: '2026-03-05T09:12:00.000Z',
          cashTopUp: 20.00,
        },
      ];
    } catch (e) {
      return [];
    }
  });

  // Écoute temps réel des transactions de l'utilisateur sur Firestore
  useEffect(() => {
    const uid = profile?.uid || auth.currentUser?.uid;
    if (!uid) return;
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
            localStorage.setItem('troco_user_transactions', JSON.stringify(list));
          } catch (e) { }
        }
      }, (err) => console.warn('[Firestore] Transactions listener:', err));
      return () => unsub();
    } catch (e) {
      console.warn('Transactions listener error:', e);
    }
  }, [profile?.uid]);

  // Handler d'ouverture du module de paiement
  const handleOpenPayment = useCallback((mode = 'pack-tokens', payload = null) => {
    setPaymentModalConfig({ mode, payload });
    setIsPaymentModalOpen(true);
  }, []);

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
    handleDeclineDeal,
  } = chatManager;

  const switchTab = useCallback((newTab) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(10); } catch (_) { }
    }
    startTransition(() => {
      setActiveTab(newTab);
      if (newTab !== 'chat') {
        setSelectedChat(null);
      }
    });
  }, [setActiveTab, setSelectedChat, startTransition]);

  // Handler de succès de paiement (crédit solde, enregistrement transaction Firestore)
  // Handler de succès de paiement (crédit solde, abonnement Troco Plus, enregistrement transaction Firestore)
  const handlePaymentSuccess = async (txData) => {
    const uid = profile?.uid || auth.currentUser?.uid;

    // 1. Mise à jour des soldes et du statut d'abonnement de l'utilisateur
    let updatedEuro = profile.euroBalance;
    let updatedTokens = profile.trocoTokens;
    let updatedTrocoPlus = profile.isTrocoPlus || false;
    let updatedSubscriptionPlan = profile.subscriptionPlan || profile.trocoPlusPlan || null;
    let updatedSubscriptionStartDate = profile.subscriptionStartDate || null;
    let updatedSubscriptionRenewalDate = profile.subscriptionRenewalDate || null;

    if (txData.mode === 'troco-plus' || txData.mode === 'pack-tokens') {
      updatedTokens += (txData.tokensPurchased || 0);
      updatedTrocoPlus = true;
      updatedSubscriptionPlan = txData.subscriptionPlan?.planKey || 'essential';
      updatedSubscriptionStartDate = txData.subscriptionStartDate || new Date().toISOString();
      updatedSubscriptionRenewalDate = txData.subscriptionRenewalDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      setTopUpCelebration({
        title: `+${txData.tokensPurchased} Jetons Troco !`,
        subtitle: `Abonnement ${txData.subscriptionPlan?.title || 'Troco Plus'} activé`,
        isTokens: true
      });
      setTimeout(() => setTopUpCelebration(null), 4500);
      setSaveMessage(`⭐ Abonnement ${txData.subscriptionPlan?.title || 'Troco Plus'} activé avec succès ! +${txData.tokensPurchased} jetons crédités.`);
      setTimeout(() => setSaveMessage(''), 6000);
    } else if (txData.mode === 'topup-cash') {
      const topUpAmount = Number(txData.cashTopUp) || 0;
      if (topUpAmount > 0) {
        updatedEuro = Number((updatedEuro + topUpAmount).toFixed(2));
        setTopUpCelebration({
          title: `+${topUpAmount.toFixed(2)} € Rechargés !`,
          subtitle: `Nouveau solde : ${updatedEuro.toFixed(2)} €`,
          isEuro: true
        });
        setTimeout(() => setTopUpCelebration(null), 4500);
        setSaveMessage(`💳 Solde rechargé avec succès (+${topUpAmount.toFixed(2)} € via ${txData.paymentMethod}).`);
        setTimeout(() => setSaveMessage(''), 5000);
      }
    } else if (txData.mode === 'boost') {
      if (txData.paymentMethod?.includes('Solde')) {
        updatedEuro = Math.max(0, Number((updatedEuro - (txData.amountTtc || 0)).toFixed(2)));
      }
      if (txData.boostDetails?.listingId) {
        setListings(prev => prev.map(item => item.id === txData.boostDetails.listingId ? { ...item, isBoosted: true } : item));
      }
    } else if (txData.mode === 'deal' || txData.mode === 'pay-deal') {
      const payload = txData.dealDetails || txData.payload || {};
      const chatId = payload.chatId || selectedChat?.id;
      const dealId = payload.dealId;
      const terms = payload.terms || {};
      const partnerName = payload.partnerName || selectedChat?.user;
      const partnerUid = payload.partnerUid || selectedChat?.authorUid;
      const euroAmount = Number(txData.amountTtc ?? payload.euroRequired ?? payload.amount ?? 0);
      const tokensAmount = Number(txData.tokensDeducted ?? payload.tokensRequired ?? payload.tokens ?? 0);

      if (chatId && dealId) {
        await executeDealTransaction({
          chatId,
          dealId,
          terms,
          buyerUid: uid,
          partnerUid,
          partnerName,
          euroAmount,
          tokensAmount,
          paymentMethod: txData.paymentMethod || 'Paiement Sécurisé',
        });
        return;
      }
    }

    const updatedProfile = {
      ...profile,
      euroBalance: Number(updatedEuro.toFixed(2)),
      trocoTokens: updatedTokens,
      isTrocoPlus: updatedTrocoPlus,
      subscriptionPlan: updatedSubscriptionPlan,
      trocoPlusPlan: updatedSubscriptionPlan,
      subscriptionStartDate: updatedSubscriptionStartDate,
      subscriptionRenewalDate: updatedSubscriptionRenewalDate,
    };
    setProfile(updatedProfile);
    try {
      localStorage.setItem('troco_user_profile', JSON.stringify(updatedProfile));
    } catch (_) { }

    // 2. Sauvegarde de la transaction dans le state local
    const newTxRecord = {
      id: 'tx-' + Date.now(),
      ...txData,
      userId: uid || 'guest',
      userName: profile?.name || 'Utilisateur',
      createdAt: new Date().toISOString(),
    };
    setUserTransactions(prev => [newTxRecord, ...prev]);
    try {
      localStorage.setItem('troco_user_transactions', JSON.stringify([newTxRecord, ...userTransactions]));
    } catch (e) { }

    // 3. Persistance sur Firestore users/{uid} et transactions
    if (uid) {
      try {
        await updateDoc(doc(db, 'users', uid), {
          euroBalance: updatedProfile.euroBalance,
          trocoTokens: updatedProfile.trocoTokens,
          isTrocoPlus: updatedProfile.isTrocoPlus,
          subscriptionPlan: updatedProfile.subscriptionPlan,
          subscriptionStartDate: updatedProfile.subscriptionStartDate,
          subscriptionRenewalDate: updatedProfile.subscriptionRenewalDate,
          updatedAt: serverTimestamp(),
        });
        await addDoc(collection(db, 'transactions'), {
          ...txData,
          userId: uid,
          userName: profile?.name || 'Utilisateur',
          userEmail: profile?.email || '',
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('[Firestore] Error saving transaction:', err);
      }
    }
  };

  // ---- GESTION DU CADRE JURIDIQUE & RGPD (BLOC 6) ----
  const handleDeleteAccount = async () => {
    const uid = profile?.uid || auth.currentUser?.uid;
    try {
      if (uid) {
        // Suppression du document utilisateur dans Firestore
        await deleteDoc(doc(db, 'users', uid));
      }
      localStorage.clear();
      if (auth.currentUser) {
        await signOut(auth);
      }
      window.location.reload();
    } catch (err) {
      console.error('Account deletion error:', err);
      localStorage.clear();
      window.location.reload();
    }
  };

  // ---- ÉCOUTE TEMPS RÉEL DES SIGNALEMENTS (MODÉRATION ADMIN) ----
  useEffect(() => {
    try {
      const qReports = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(qReports, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllReports(list);
      }, (err) => console.warn('[Firestore] Reports listener:', err));
      return () => unsub();
    } catch (e) {
      console.warn('Reports listener setup error:', e);
    }
  }, []);

  // ---- ÉCOUTE TEMPS RÉEL DES UTILISATEURS (ANNUAIRE ADMIN) ----
  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, 'users'), (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, uid: d.id, ...d.data() }));
        setAllFirestoreUsers(list);
      }, (err) => console.warn('[Firestore] Users listener:', err));
      return () => unsub();
    } catch (e) {
      console.warn('Users listener setup error:', e);
    }
  }, []);

  // Handlers actions administrateur
  // eslint-disable-next-line no-unused-vars
  const handleAdminUpdateUser = async (uid, updates) => {
    if (!uid) return;
    try {
      await updateDoc(doc(db, 'users', uid), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('[Firestore] handleAdminUpdateUser error:', err);
      setAllFirestoreUsers(prev => prev.map(u => (u.uid === uid || u.id === uid) ? { ...u, ...updates } : u));
    }
  };

  const handleAdminDeleteListing = async (listingOrId) => {
    if (!listingOrId) return;
    const targetId = typeof listingOrId === 'object' ? listingOrId.id : listingOrId;
    setListings(prev => prev.filter(l => String(l.id) !== String(targetId)));
    try {
      const firestoreId = typeof listingOrId === 'object' && listingOrId.firestoreId
        ? listingOrId.firestoreId
        : listings.find(l => String(l.id) === String(targetId))?.firestoreId;
      if (firestoreId) {
        await deleteDoc(doc(db, 'listings', String(firestoreId)));
      }
    } catch (err) {
      console.warn('[Firestore] handleAdminDeleteListing error:', err);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleAdminResolveReport = async (reportId, status = 'resolved') => {
    if (!reportId) return;
    try {
      await updateDoc(doc(db, 'reports', reportId), {
        status,
        resolvedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('[Firestore] handleAdminResolveReport error:', err);
      setAllReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r));
    }
  };

  // ---- RÉINITIALISATION TOTALE D'UN UTILISATEUR (WIPE & RESET ADMIN) ----
  // eslint-disable-next-line no-unused-vars
  const handleAdminResetUser = async (uid, userData = null) => {
    if (!uid) return;
    try {
      const resetData = {
        euroBalance: 0.00,
        trocoTokens: 10,
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
        updatedAt: serverTimestamp(),
      };

      // 1. Mise à jour Firestore users/{uid}
      await updateDoc(doc(db, 'users', String(uid)), resetData);

      // 2. Suppression de toutes les annonces de cet utilisateur sur Firestore et en local
      const userName = userData?.name || allFirestoreUsers.find(u => u.uid === uid || u.id === uid)?.name;
      const userListings = listings.filter(l =>
        (l.userId && String(l.userId) === String(uid)) ||
        (userName && l.author === userName)
      );

      for (const l of userListings) {
        if (l.firestoreId) {
          try {
            await deleteDoc(doc(db, 'listings', String(l.firestoreId)));
          } catch (e) {
            console.warn('[Firestore] Delete user listing error:', e);
          }
        }
      }

      setListings(prev => prev.filter(l =>
        !(l.userId && String(l.userId) === String(uid)) &&
        !(userName && l.author === userName)
      ));

      // 3. Mise à jour de l'état allFirestoreUsers
      setAllFirestoreUsers(prev => prev.map(u => (u.uid === uid || u.id === uid) ? { ...u, ...resetData } : u));

      // 4. Si c'est l'utilisateur courant, réinitialiser son profil local + déclencher l'onboarding
      if (profile?.uid === uid || auth.currentUser?.uid === uid) {
        setProfile(prev => ({
          ...prev,
          ...resetData,
        }));
        setSkills([]);
        setEquipment([]);
        try {
          localStorage.removeItem('troco_onboarding_completed');
          localStorage.removeItem('troco_welcome_gift_claimed');
        } catch (_) { }
      }

      alert(`✅ Le profil ${userName || uid} a été réinitialisé avec succès (solde 0.00€, 10 jetons, onboarding réactivé, annonces supprimées).`);
    } catch (err) {
      console.warn('[Firestore] handleAdminResetUser error:', err);
      alert(`Erreur lors de la réinitialisation du profil : ${err.message}`);
    }
  };

  const handleAdminEditListing = (listing) => {
    setIsAdminPanelOpen(false);
    handleStartEditListing(listing);
  };

  // ---- ÉCOUTE ET SYNCHRONISATION EN TEMPS RÉEL DU PROFIL FIREBASE USERS/{UID} ----
  useEffect(() => {
    const sessionStartTime = Date.now();
    const finishSessionLoading = () => {
      const elapsed = Date.now() - sessionStartTime;
      const remaining = Math.max(0, 2500 - elapsed);
      setTimeout(() => {
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
              try { await signOut(auth); } catch (_) {}
              window.localStorage.removeItem('troco_is_authenticated');
              window.localStorage.removeItem('troco_user_profile');
              setIsAuthenticated(false);
              return;
            }

            const rawTokens = data.trocoTokens ?? data.tokens;
            const rawEuros = data.walletBalanceFiat ?? data.euroBalance ?? data.balance;
            const newTokens = rawTokens !== undefined && rawTokens !== null ? Number(rawTokens) : null;
            const newEuros = rawEuros !== undefined && rawEuros !== null ? Number(Number(rawEuros).toFixed(2)) : null;

            // Détection de réception temps réel de jetons Troco (+X jetons) & Alerte sonore
            if (prevTokensRef.current !== undefined && prevTokensRef.current !== null && newTokens !== null && newTokens > prevTokensRef.current) {
              const gained = newTokens - prevTokensRef.current;
              haptics.success();
              playBetclicBalanceSound();
              setTopUpCelebration({
                title: `+${gained} Jeton${gained > 1 ? 's' : ''} Troco reçus ! 🪙`,
                subtitle: `Nouveau solde : ${newTokens} Jetons Troco`,
              });
              setTimeout(() => setTopUpCelebration(null), 4500);
            }

            // Détection de réception temps réel d'euros & Alerte sonore
            if (prevEurosRef.current !== undefined && prevEurosRef.current !== null && newEuros !== null && newEuros > prevEurosRef.current) {
              const gained = (newEuros - prevEurosRef.current).toFixed(2);
              haptics.success();
              playApplePaySound();
              setTopUpCelebration({
                title: `+${gained} € reçus sur votre solde ! 💳`,
                subtitle: `Nouveau solde : ${Number(newEuros).toFixed(2)} €`,
              });
              setTimeout(() => setTopUpCelebration(null), 4500);
            }

            if (newTokens !== null) prevTokensRef.current = newTokens;
            if (newEuros !== null) prevEurosRef.current = newEuros;

            // Mise à jour de l'état profil local et persistence
            setProfile(prev => {
              const updated = {
                ...prev,
                ...data,
                uid: uid,
              };
              try {
                window.localStorage.setItem('troco_user_profile', JSON.stringify(updated));
              } catch (_) {}
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
          } else {
            // Initialisation automatique du profil sur Firestore si nouveau provider
            const defaultUserDoc = {
              uid: uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0].toUpperCase() || 'Utilisateur Troco',
              username: '@' + (firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'user').toLowerCase().replace(/\s+/g, ''),
              email: firebaseUser.email || '',
              phoneNumber: firebaseUser.phoneNumber || '',
              avatar: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
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
              onboardingCompleted: false,
              loginMethod: firebaseUser.providerData?.[0]?.providerId || 'Email',
              cguAcceptedAt: null,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            try {
              await setDoc(userDocRef, defaultUserDoc, { merge: true });
              setProfile(prev => ({ ...prev, ...defaultUserDoc }));
              prevTokensRef.current = 10;
              prevEurosRef.current = 0;
            } catch (e) {
              console.warn('[Firestore] Failed to init user doc:', e);
            }
          }
        });

        setIsAuthenticated(true);
        window.localStorage.setItem('troco_is_authenticated', 'true');
        finishSessionLoading();
      } else {
        prevTokensRef.current = null;
        prevEurosRef.current = null;
        const hasSession = window.localStorage.getItem('troco_is_authenticated') === 'true';
        if (!hasSession) {
          setIsAuthenticated(false);
        }
        finishSessionLoading();
      }
    });

    return () => {
      if (unsubDoc) unsubDoc();
      unsubscribeAuth();
    };
  }, []);

  // ---- ÉCOUTE ET RÉACTUALISATION EN TEMPS RÉEL DES TRADUCTIONS DYNAMIQUES ----
  const [, setTranslationRevision] = useState(0);
  useEffect(() => {
    const unsub = subscribeTranslations(() => {
      setTranslationRevision(r => r + 1);
    });
    return () => unsub();
  }, []);

  // ---- DÉTECTION ET OUVERTURE DU WIZARD D'ONBOARDING POUR NOUVEAUX COMPTES (CHANTIER 1) ----
  useEffect(() => {
    if (isAuthenticated && profile) {
      const needsOnboarding = profile.onboardingCompleted === false || (profile.onboardingCompleted === undefined && profile.uid && profile.uid !== 'demo_mateopolo');
      if (needsOnboarding) {
        setIsOnboardingOpen(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, profile?.onboardingCompleted, profile?.uid]);

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
      const alreadyCelebrated = window.localStorage.getItem('troco_welcome_gift_celebrated') === 'true';
      if (!alreadyCelebrated && profile?.trocoTokens === 10 && (profile?.euroBalance === 0 || profile?.euroBalance === 0.00)) {
        window.localStorage.setItem('troco_welcome_gift_celebrated', 'true');
        playWelcomeGiftFanfare();
        setIsWelcomeGiftModalOpen(true);
      }
    }
  }, [activeTab, isAuthenticated, profile?.trocoTokens, profile?.euroBalance]);

  // ---- FINALISATION DU PARCOURS D'ONBOARDING (CHANTIER 1 & CADEAU DE BIENVENUE) ----
  const handleCompleteOnboarding = async (completedData) => {
    const finalEuroBalance = 0.00; // Toujours 0€ à la création de compte
    const finalTokens = 10; // Toujours 10 Jetons offerts à la bienvenue
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
    window.localStorage.setItem('troco_user_profile', JSON.stringify(updatedProfile));
    window.localStorage.setItem('troco_welcome_gift_celebrated', 'true');

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
      } catch (e) {
        console.warn('[Firestore] Failed to save onboarding to Firestore:', e);
      }
    }
    setIsOnboardingOpen(false);
    playWelcomeGiftFanfare();
    setIsWelcomeGiftModalOpen(true);
    setSaveMessage('🎁 +10 Jetons Troco offerts ! Bienvenue sur Troco.');
    setTimeout(() => setSaveMessage(''), 5000);
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
              window.localStorage.setItem('troco_user_profile', JSON.stringify(updated));
              return updated;
            });
            setIsAuthenticated(true);
            window.localStorage.setItem('troco_is_authenticated', 'true');
          })
          .catch((err) => {
            console.error('Magic link sign-in error:', err);
          })
          .finally(() => setIsLoadingSession(false));
      }
    }
  }, []);


  // État d'édition profil initialisé plus haut
  const [categoryInput, setCategoryInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [customCategories, setCustomCategories] = useState([]);
  const [radiusKm, setRadiusKm] = useState(20);
  const [isInfiniteRadius, setIsInfiniteRadius] = useState(true);
  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [hoverSlideIndex, setHoverSlideIndex] = useState(0);

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
  const [detailMediaTab, setDetailMediaTab] = useState('video');
  const [selectedDetailImageIndex, setSelectedDetailImageIndex] = useState(0);

  const modalTouchStartRef = useRef(null);

  const handleModalTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    modalTouchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleModalTouchMove = (e) => {
    // Touch move listener for passive swipe tracking if needed
  };

  const handleModalTouchEnd = (e) => {
    if (!modalTouchStartRef.current) return;
    const touch = e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0] : null;

    if (touch && selectedListing) {
      const deltaX = touch.clientX - modalTouchStartRef.current.x;
      const deltaY = touch.clientY - modalTouchStartRef.current.y;
      const gallery = selectedListing.gallery && selectedListing.gallery.length > 0 ? selectedListing.gallery : [selectedListing.image];

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20 && gallery.length > 1) {
        if (deltaX < 0) {
          // Swiped left -> next photo
          setSelectedDetailImageIndex(prev => (prev < gallery.length - 1 ? prev + 1 : 0));
        } else {
          // Swiped right -> prev photo
          setSelectedDetailImageIndex(prev => (prev > 0 ? prev - 1 : gallery.length - 1));
        }
      }
    }
    modalTouchStartRef.current = null;
  };

  const [selectedLanguages, setSelectedLanguages] = useState(['FR', 'EN']);
  const [selectedPayment, setSelectedPayment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // ---- DÉBOUNCE 300MS SUR LA RECHERCHE (Évite tout freeze du thread JS) ----
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const [postStep, setPostStep] = useState(1);
  const [publishMessage, setPublishMessage] = useState('');

  const defaultPostDraft = {
    type: 'offer',
    status: 'active',
    title: '',
    category: 'Cours & Compétences',
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
    image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
    imageUrl: '',
    videoUrl: '',
  };
  const [postDraft, setPostDraft] = useState(defaultPostDraft);
  const [showPublishedPopup, setShowPublishedPopup] = useState(false);
  const [publishedListing, setPublishedListing] = useState(null);

  // ---- CHECKOUT (PAIEMENT SIMULÉ) ----
  const [checkout, setCheckout] = useState({
    open: false,
    mode: null,
    amount: 0,
    label: '',
    payload: null,
    method: 'applePay',
    step: 'method',
  });

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
  } = useWebRTC({ profileName: profile?.name || 'Membre', profileUid: profile?.uid || (auth.currentUser && auth.currentUser.uid), selectedChat });

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
  const handleAcceptIncomingCall = async () => {
    try {
      const res = await acceptIncomingCall();
      if (res?.chatId) {
        const foundChat = (chatsList || []).find(c => String(c.id) === String(res.chatId));
        if (foundChat) {
          setSelectedChat(foundChat);
        } else {
          setSelectedChat({ id: res.chatId, user: res.from || 'Interlocuteur' });
        }
      }
      setIsCallPip(false);
    } catch (e) {
      console.warn('[WebRTC] Accept incoming call error:', e);
    }
  };

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

  // Rétribution en jetons & structure transparente de frais (Étape 5)
  const handleTransferCallTokens = async ({ tokens, insurance, duration }) => {
    const costTokens = Number(tokens) || 1;
    const insuranceFee = insurance ? 1.99 : 0;

    setProfile(prev => ({
      ...prev,
      trocoTokens: Math.max(0, prev.trocoTokens - costTokens),
      euroBalance: insuranceFee > 0 ? Number((prev.euroBalance - insuranceFee).toFixed(2)) : prev.euroBalance,
      dealsCompleted: (prev.dealsCompleted || 0) + 1,
    }));

    playApplePaySound();
    playBetclicBalanceSound(true);

    const partner = selectedChat?.user || 'Interlocuteur';
    const newTx = {
      id: `tx-visio-${Date.now()}`,
      title: `Rétribution Visio (${partner})`,
      amount: insuranceFee,
      tokens: costTokens,
      type: 'token_transfer',
      status: 'completed',
      date: new Date().toISOString(),
      partner: partner,
      duration: duration,
      freeServiceFee: true,
    };
    setUserTransactions(prev => [newTx, ...prev]);

    // PERSISTANCE TRANSACTIONNELLE ATOMIQUE FIRESTORE (runTransaction)
    const uid = profile?.uid || auth.currentUser?.uid;
    if (uid) {
      try {
        let partnerUid = selectedChat?.authorUid || selectedChat?.partnerUid;
        if (!partnerUid && partner) {
          try {
            const userQuery = query(collection(db, 'users'), where('name', '==', partner));
            const uSnap = await getDocs(userQuery);
            if (!uSnap.empty) {
              partnerUid = uSnap.docs[0].id;
            }
          } catch (_) { }
        }

        await runTransaction(db, async (transaction) => {
          // 1. Lecture atomique du payeur
          const payerRef = doc(db, 'users', uid);
          const payerSnap = await transaction.get(payerRef);

          let currentTokens = profile.trocoTokens || 10;
          let currentEuro = profile.euroBalance || 0;
          let currentDeals = profile.dealsCompleted || 0;

          if (payerSnap.exists()) {
            const pData = payerSnap.data();
            currentTokens = pData.trocoTokens !== undefined ? pData.trocoTokens : currentTokens;
            currentEuro = pData.euroBalance !== undefined ? pData.euroBalance : currentEuro;
            currentDeals = pData.dealsCompleted !== undefined ? pData.dealsCompleted : currentDeals;
          }

          // 2. Lecture atomique du partenaire (si identifié)
          let partnerRef = null;
          let partnerSnap = null;
          if (partnerUid) {
            partnerRef = doc(db, 'users', partnerUid);
            partnerSnap = await transaction.get(partnerRef);
          }

          // 3. Écriture atomique débit payeur
          transaction.set(payerRef, {
            trocoTokens: Math.max(0, currentTokens - costTokens),
            euroBalance: insuranceFee > 0 ? Number(Math.max(0, currentEuro - insuranceFee).toFixed(2)) : currentEuro,
            dealsCompleted: currentDeals + 1,
            updatedAt: serverTimestamp(),
          }, { merge: true });

          // 4. Écriture atomique crédit partenaire
          if (partnerRef && partnerSnap && partnerSnap.exists()) {
            const partData = partnerSnap.data();
            const partTokens = partData.trocoTokens || 0;
            const partDeals = partData.dealsCompleted || 0;

            transaction.update(partnerRef, {
              trocoTokens: partTokens + costTokens,
              dealsCompleted: partDeals + 1,
              updatedAt: serverTimestamp(),
            });
          }

          // 5. Enregistrement atomique de la transaction
          const txDocRef = doc(collection(db, 'transactions'));
          transaction.set(txDocRef, {
            ...newTx,
            userId: uid,
            userName: profile?.name || 'Utilisateur',
            partnerUid: partnerUid || null,
            createdAt: serverTimestamp(),
          });
        });
      } catch (e) {
        console.warn('[Firestore] Atomic runTransaction visio error:', e);
      }
    }

    setSaveMessage(`🤝 ${costTokens} Jeton${costTokens > 1 ? 's' : ''} Troco transféré(s) à ${partner} (Frais de service : 0,00 €) !`);
    setTimeout(() => setSaveMessage(''), 5000);
  };

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

  // eslint-disable-next-line no-unused-vars
  const groupParticipants = [
    { name: 'Sofia', role: 'Mentor', color: '#C67D5B' },
    { name: 'Marc', role: 'Expert', color: '#D4C5B5' },
    { name: 'Lina', role: 'Apprenante', color: '#FDBA74' },
    { name: 'Kai', role: 'Coach', color: '#F9A8D4' },
    { name: 'Noa', role: 'Modérateur', color: '#A7F3D0' },
  ];

  // ---- COHÉRENCE DES AVATARS & NOMS ----
  const femaleAvatars = [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
  ];
  const maleAvatars = [
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  ];
  const authorAvatars = {
    'Sofia M.': femaleAvatars[0],
    'Marc L.': maleAvatars[0],
    'Matteo R.': maleAvatars[1],
    'Karim B.': maleAvatars[2],
    'Elisa V.': femaleAvatars[1],
    'Nico D.': maleAvatars[0],
    'Amélie P.': femaleAvatars[2],
    'Jules T.': maleAvatars[1],
    'Laura B.': femaleAvatars[1],
    'Rayan K.': maleAvatars[2],
    'Hugo L.': maleAvatars[0],
    'Clara N.': femaleAvatars[2],
    'Giulia S.': femaleAvatars[0],
    'Mina C.': femaleAvatars[1],
    'Theo R.': maleAvatars[1],
    'David H.': maleAvatars[2],
    'Inès W.': femaleAvatars[0],
    'Romain P.': maleAvatars[1],
    'Pauline M.': femaleAvatars[2],
    'Claire R.': femaleAvatars[1],
    'Sacha B.': maleAvatars[0],
    'Martin J.': maleAvatars[2],
    'Julie C.': femaleAvatars[0],
    'Baptiste F.': maleAvatars[1],
    'Noémie A.': femaleAvatars[2],
    'Sabrina M.': femaleAvatars[0],
    'Léa D.': femaleAvatars[1],
    'Hana T.': femaleAvatars[2],
    'Noa K.': maleAvatars[0],
    'Samir M.': maleAvatars[1],
  };
  const feminineFirstNames = ['sofia', 'elisa', 'amélie', 'amelie', 'laura', 'clara', 'giulia', 'mina', 'inès', 'ines', 'pauline', 'claire', 'julie', 'noémie', 'noemie', 'sabrina', 'léa', 'lea', 'hana', 'emma', 'chloé', 'chloe', 'lina', 'anna', 'maria', 'eva', 'nina', 'lucie', 'camille', 'sara', 'julia'];

  const getAuthorAvatar = (name) => {
    const firstName = String(name || '').split(' ')[0].toLowerCase();
    if (authorAvatars[name]) return authorAvatars[name];
    if (feminineFirstNames.includes(firstName)) return femaleAvatars[firstName.length % femaleAvatars.length];
    return maleAvatars[firstName.length % maleAvatars.length];
  };

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
    }).catch(() => {});

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

  const isAdmin = profile?.email === 'mateopolo91@gmail.com' || auth.currentUser?.email === 'mateopolo91@gmail.com' || profile?.role === 'admin';

  // ---- MODÉRATION ADMINISTRATEUR ----

  const handleAdminToggleHideListing = async (listing) => {
    if (!listing) return;
    const newHidden = !listing.isHidden;
    setListings(prev => prev.map(l => l.id === listing.id ? { ...l, isHidden: newHidden } : l));
    if (db && listing.firestoreId) {
      try {
        await updateDoc(doc(db, 'listings', String(listing.firestoreId)), {
          isHidden: newHidden,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('[Admin] toggle hide error:', err);
      }
    }
    setSaveMessage(newHidden ? `🚫 Annonce #${listing.id} masquée du feed public` : `👁️ Annonce #${listing.id} visible`);
    setTimeout(() => setSaveMessage(''), 4000);
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
  const paymentLabels = { all: 'Tous', credits: 'Crédits', cash: 'Cash', troc: 'Troc', hybrid: 'Hybride' };

  const [listings, setListings] = useState(() => {
    try {
      const saved = localStorage.getItem('troco_user_listings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Erreur chargement localStorage des annonces', e);
    }
    const defaultUserListing = {
      id: 9999,
      title: "Coaching React, Node.js & Firebase (1h)",
      description: "Session individuelle de mentorat web moderne : React, Firebase, API Rest & architecture. Support vidéo et exercices pratiques inclus.",
      author: "Matéo Polo",
      category: "Cours & Compétences",
      verified: true,
      rating: 5.0,
      reviews: 6,
      status: "active",
      location: "Paris 11e (à 0.5 km)",
      coordinates: [48.8584, 2.3785],
      type: "remote",
      nativeLang: "FR",
      languages: ["FR", "EN"],
      compensation: "1h = 1 Crédit",
      image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80",
      video: "https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-his-laptop-34440-large.mp4",
      urgent: true,
      caution: null,
      tags: ["React", "Firebase", "WebDev", "Mentorat"],
      translations: {
        EN: { title: "React, Node.js & Firebase Coaching (1h)", description: "1-on-1 modern web development coaching: React, Firebase, REST APIs. Includes video recording and hands-on exercises." },
        ES: { title: "Clase de React, Node.js y Firebase (1h)", description: "Sesión individual de desarrollo web moderno: React, Firebase y APIs REST." }
      }
    };
    return [defaultUserListing];
  });

  useEffect(() => {
    try {
      localStorage.setItem('troco_user_listings', JSON.stringify(listings));
    } catch (e) {
      console.warn('Erreur sauvegarde localStorage des annonces', e);
    }
  }, [listings]);

  // ---- ÉTATS PAGINATION FEED (PAGINATED INFINITE SCROLL) ----
  const [lastVisibleListingDoc, setLastVisibleListingDoc] = useState(null);
  const [hasMoreListings, setHasMoreListings] = useState(true);
  const [isLoadingMoreListings, setIsLoadingMoreListings] = useState(false);

  // ---- SYNC TEMPS RÉEL FIRESTORE & DÉMOS DIFFÉRÉES (LIMIT 20) ----
  // Chargement asynchrone non-bloquant de mockData avec pagination pour éliminer le goulot d'étranglement
  useEffect(() => {
    let unsubFirestore = () => {};
    let isCancelled = false;

    import('./data/mockData').then(({ mockListings }) => {
      if (isCancelled) return;
      const demoBase = (mockListings || []).map(l => ({ ...l, status: 'active', isDemo: true }));

      // Si le cache local n'avait pas encore les démos, on les injecte
      setListings(prev => {
        const hasDemos = prev.some(item => item.isDemo);
        return hasDemos ? prev : [...prev, ...demoBase];
      });

      // Écoute initiale paginée à 20 pour un FCP et un réseau optimal
      const initialQuery = query(collection(db, 'listings'), orderBy('createdAt', 'desc'), limit(20));
      unsubFirestore = onSnapshot(
        initialQuery,
        (snapshot) => {
          if (isCancelled) return;
          const firestoreListings = snapshot.docs.map((docSnap) => ({
            id: docSnap.data().id || docSnap.id,
            firestoreId: docSnap.id,
            ...docSnap.data(),
            status: docSnap.data().status || 'active',
            isDemo: false,
            _doc: docSnap,
          }));

          const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
          setLastVisibleListingDoc(lastDoc);
          setHasMoreListings(snapshot.docs.length === 20);

          setListings(prev => {
            const customLocalListings = prev.filter(p => !p.isDemo && !firestoreListings.some(f => f.id === p.id));
            return [...demoBase, ...firestoreListings, ...customLocalListings];
          });
        },
        (error) => {
          console.warn('[Firestore] onSnapshot with orderBy error, trying fallback query:', error);
          if (!isCancelled) {
            try {
              const fallbackQuery = query(collection(db, 'listings'), limit(20));
              unsubFirestore = onSnapshot(fallbackQuery, (snapshot) => {
                const firestoreListings = snapshot.docs.map((docSnap) => ({
                  id: docSnap.data().id || docSnap.id,
                  firestoreId: docSnap.id,
                  ...docSnap.data(),
                  status: docSnap.data().status || 'active',
                  isDemo: false,
                  _doc: docSnap,
                }));
                const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
                setLastVisibleListingDoc(lastDoc);
                setHasMoreListings(snapshot.docs.length === 20);
                setListings(prev => {
                  const customLocalListings = prev.filter(p => !p.isDemo && !firestoreListings.some(f => f.id === p.id));
                  return [...demoBase, ...firestoreListings, ...customLocalListings];
                });
              }, () => {
                setListings(prev => prev.length > 0 ? prev : demoBase);
              });
            } catch (_) {
              setListings(prev => prev.length > 0 ? prev : demoBase);
            }
          }
        }
      );
    }).catch(err => {
      console.warn('[MockData] Erreur de chargement différé des annonces démo:', err);
    });

    return () => {
      isCancelled = true;
      unsubFirestore();
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
      console.error('[App] handleLoadMoreListings error:', err);
    } finally {
      setIsLoadingMoreListings(false);
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
    const raw = (debouncedSearchQuery || '').trim();
    if (raw.length >= 3) {
      searchNominatim(raw, { limit: 3 }).then(results => {
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
      }).catch(() => setDynamicSearchAliases([]));
    } else {
      setDynamicSearchAliases([]);
    }
  }, [debouncedSearchQuery]);

  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      const rawQuery = (debouncedSearchQuery || '').trim();
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

      // Filtrage Shadow-Ban & Utilisateurs bannis
      const authorUser = allFirestoreUsers.find(u => (u.name && u.name.trim().toLowerCase() === (item.author || '').trim().toLowerCase()) || (u.uid && item.authorUid && u.uid === item.authorUid));
      if (authorUser?.isBanned) return false;
      if (authorUser?.isShadowBanned && item.author !== profile.name) return false;

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
    debouncedSearchQuery,
    formatFilter,
    selectedCategory,
    selectedLanguages,
    selectedPayment,
    radiusKm,
    isInfiniteRadius,
    profile.name,
    allFirestoreUsers
  ]);

  const listingsGridRef = useRef(null);
  const loadMoreSentinelRef = useRef(null);

  // ---- INFINITE SCROLL AUTOMATIQUE VIA INTERSECTION OBSERVER ----
  useEffect(() => {
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

  const getListingDetail = (listing) => {
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
    } else if (listing.author === 'Sofia M.' && (listing.isDemo || (typeof listing.id === 'number' && listing.id <= 20))) {
      authorReviews = [
        { rating: 5, text: 'Très pédagogique et hyper réactif, j’ai eu un échange de qualité dès le premier message.' },
        { rating: 4, text: 'Un vrai plaisir de travailler avec elle, le format visio est simple et agréable.' },
      ];
    } else if (listing.author === 'Marc L.' && (listing.isDemo || (typeof listing.id === 'number' && listing.id <= 20))) {
      authorReviews = [
        { rating: 5, text: 'Très fiable pour les prêts et les dépannages rapides, j’ai apprécié la transparence.' },
        { rating: 5, text: 'Parfait pour les échanges de proximité, le service est simple et rassurant.' },
      ];
    } else {
      authorReviews = [];
    }

    const hasRealReviews = authorReviews.length > 0;
    const computedRating = hasRealReviews
      ? (listing.rating || (isCurrentUser && averageRating !== '—' ? Number(averageRating) : 5.0))
      : null;
    const computedReviewsCount = hasRealReviews
      ? (isCurrentUser ? authorReviews.length : (listing.reviews || authorReviews.length))
      : 0;

    const authorPortfolio = isCurrentUser
      ? (portfolioImages && portfolioImages.length > 0 ? portfolioImages : (profile?.portfolioImages || profile?.portfolio || []))
      : (listing.portfolio || listing.authorProfile?.portfolio || (listing.isDemo && listing.author === 'Sofia M.' ? [
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80',
      ] : listing.isDemo && listing.author === 'Marc L.' ? [
        'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=600&q=80',
      ] : []));

    const generic = {
      id: listing.id,
      isBoosted: listing.isBoosted || false,
      title: listing.title,
      description: listing.description || 'Ce service combine flexibilité, qualité de partage et une vraie expérience premium. Le créateur a déjà accompagné plusieurs personnes dans des échanges rapides et fiables.',
      image: media.image,
      video: media.video,
      gallery: media.gallery,
      wallet: { euros: 20, tokens: 2 },
      tags: generateTags(listing.title, listing.description || ''),
      compensation: listing.compensation,
      nativeLang: listing.nativeLang || 'FR',
      translations: listing.translations || {},
      rating: computedRating,
      reviews: computedReviewsCount,
      authorProfile: {
        name: listing.author,
        avatar: isCurrentUser ? profile.avatar : getAuthorAvatar(listing.author),
        bio: isCurrentUser ? profile.bio : 'Créateur de contenus, expert en échange de services et passionné de communautés locales.',
        socials: isCurrentUser ? (profile.socials || []) : ['LinkedIn', 'Instagram'],
        portfolio: authorPortfolio,
        reviews: authorReviews,
      },
    };

    if (listing.author === 'Sofia M.' && (listing.isDemo || (typeof listing.id === 'number' && listing.id <= 20))) {
      return {
        ...generic,
        description: listing.description || 'Cours de piano et accompagnement musical pensé pour les débutants et les profils en reconversion. Le cadre est très structuré, chaleureux et adapté à un usage flexible.',
        wallet: { euros: 15, tokens: 1 },
        authorProfile: {
          ...generic.authorProfile,
          avatar: femaleAvatars[0],
          bio: 'Professeure de piano, coach de créativité et experte en échanges à distance.',
          socials: ['LinkedIn', 'Instagram', 'TikTok'],
          portfolio: [
            'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80',
          ],
          reviews: authorReviews,
        },
      };
    }

    if (listing.author === 'Marc L.' && (listing.isDemo || (typeof listing.id === 'number' && listing.id <= 20))) {
      return {
        ...generic,
        description: listing.description || 'Prêt d’outillage et service de dépannage local. Tout est pensé pour qu’un échange soit rapide, concret et sécurisé.',
        wallet: { euros: 12, tokens: 2 },
        authorProfile: {
          ...generic.authorProfile,
          avatar: maleAvatars[0],
          bio: 'Bricoleur local, passionné de matériel et de partage de services de proximité.',
          socials: ['LinkedIn', 'Instagram'],
          portfolio: [
            'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=600&q=80',
          ],
          reviews: authorReviews,
        },
      };
    }

    return generic;
  };

  const handleOpenListing = useCallback((listing) => {
    setSelectedListing(getListingDetail(listing));
  }, [getListingDetail]);

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
    if (window.confirm(t('confirmDeleteText') || 'Voulez-vous vraiment supprimer cette annonce ?')) {
      const targetListing = listings.find(item => item.id === id);
      setListings(prev => prev.filter(item => item.id !== id));
      if (targetListing?.firestoreId) {
        try {
          await deleteDoc(doc(db, 'listings', String(targetListing.firestoreId)));
        } catch (e) {
          console.warn('[Firestore] deleteDoc failed:', e);
        }
      }
      setMobileListingActionTarget(null);
      if (selectedListing?.id === id) {
        setSelectedListing(null);
      }
    }
  };

  const handleTogglePauseListing = (id) => {
    setListings(prev => prev.map(item => item.id === id ? { ...item, status: item.status === 'paused' ? 'active' : 'paused' } : item));
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

  const closeCheckout = () => {
    const { mode, amount, payload, method } = checkout;
    setCheckout(prev => ({ ...prev, open: false, step: 'method', payload: null }));

    // ---- GARDE ANTI-DOUBLE-EXÉCUTION ----
    if (checkoutAppliedRef.current) return;
    checkoutAppliedRef.current = true;

    // Si paiement par solde Troco existant : décrémenter le solde de l'utilisateur
    const isPaidWithWallet = method === 'troco' || method === 'wallet';
    const chargedFromWallet = isPaidWithWallet && amount > 0;

    if (chargedFromWallet) {
      if (profile.euroBalance < amount) {
        alert('Solde Euros insuffisant dans votre portefeuille Troco.');
        return;
      }
      setProfile(prev => {
        const newBal = Number(Math.max(0, prev.euroBalance - amount).toFixed(2));
        if (profile?.uid) {
          updateDoc(doc(db, 'users', profile.uid), {
            euroBalance: newBal,
            updatedAt: serverTimestamp(),
          }).catch(e => console.warn('[Firestore] update balance error:', e));
        }
        return { ...prev, euroBalance: newBal };
      });
    }

    if (mode === 'boost') {
      window.setTimeout(() => {
        setListings(prev => prev.map(item => item.id === payload?.listingId ? { ...item, isBoosted: true } : item));
        setBoostMessage(`Annonce boostée avec succès pendant 7 jours !`);
      }, 400);
      return;
    }

    if (mode === 'deal') {
      window.setTimeout(async () => {
        setChatThreads(prev => ({
          ...prev,
          [payload?.chatId]: (prev[payload?.chatId] || []).map(m => m.id === payload?.dealId ? { ...m, status: 'confirmed' } : m),
        }));
        setChatStatusOverrides(prev => ({ ...prev, [payload?.chatId]: 'Deal Validé' }));

        // Si le deal comprenait des euros et un vendeur identifié, créditer le vendeur
        if (payload?.partnerUid && payload?.euroAmount && Number(payload.euroAmount) > 0) {
          try {
            const partnerRef = doc(db, 'users', String(payload.partnerUid));
            const partnerSnap = await getDoc(partnerRef);
            if (partnerSnap.exists()) {
              const currentPartnerBal = Number(partnerSnap.data().euroBalance) || 0;
              await updateDoc(partnerRef, {
                euroBalance: Number((currentPartnerBal + Number(payload.euroAmount)).toFixed(2)),
                updatedAt: serverTimestamp(),
              });
            }
          } catch (e) {
            console.warn('[Firestore] Credit partner in deal error:', e);
          }
        }
      }, 400);
      return;
    }

    if (mode === 'edit-listing' || mode === 'publish-options') {
      window.setTimeout(async () => {
        const { newListing, invoiceCalc } = payload || {};
        if (!newListing) return;

        // Enregistrement de la transaction avec référence unique TRK-YYYYMM-XXXX
        const invoiceRef = generateInvoiceRef();
        const txRecord = {
          id: `tx-${Date.now()}`,
          type: isEditingListing ? 'edit-listing' : 'publish-options',
          title: isEditingListing ? `Modification annonce — ${newListing.title}` : `Options publication — ${newListing.title}`,
          amount: amount,
          currency: 'EUR',
          status: 'completed',
          invoiceRef: invoiceRef,
          date: new Date().toISOString(),
          createdAt: serverTimestamp(),
          userId: profile.uid || auth.currentUser?.uid || 'anonymous',
          items: invoiceCalc?.items || [],
        };
        try {
          await addDoc(collection(db, 'transactions'), txRecord);
        } catch (e) {
          console.warn('[Firestore] transaction addDoc failed:', e);
        }
        setUserTransactions(prev => [txRecord, ...prev]);

        if (isEditingListing) {
          setListings(prev => prev.map(item => item.id === newListing.id ? newListing : item));
          if (editingOriginalListing?.firestoreId) {
            try {
              const { id: _localId, firestoreId: _fid, ...firestorePayload } = newListing;
              updateDoc(doc(db, 'listings', editingOriginalListing.firestoreId), {
                ...firestorePayload,
                updatedAt: serverTimestamp(),
              }).catch(e => console.warn('[Firestore] updateDoc failed:', e));
            } catch (e) {
              console.warn('[Firestore] updateDoc error:', e);
            }
          }
        } else {
          setListings(prev => [newListing, ...prev]);
          try {
            const { id: _localId, ...firestorePayload } = newListing;
            addDoc(collection(db, 'listings'), {
              ...firestorePayload,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }).catch(e => console.warn('[Firestore] addDoc failed:', e));
          } catch (e) {
            console.warn('[Firestore] addDoc error:', e);
          }
        }

        playApplePaySound();
        const updatedDetail = getListingDetail(newListing);
        setPublishedListing(updatedDetail);
        setShowPublishedPopup(true);
        setSelectedListing(updatedDetail);

        setIsEditingListing(false);
        setEditingOriginalListing(null);
        setPostStep(1);
        setPostDraft(defaultPostDraft);
      }, 400);
      return;
    }
  };

  const openCheckout = ({ mode, amount, label, payload }) => {
    setCheckout({ open: true, mode, amount, label, payload: payload || null, method: 'applePay', step: 'method' });
  };

  const checkoutAppliedRef = useRef(false);

  const handleConfirmPayment = () => {
    // Vérification de sécurité si paiement par solde
    if ((checkout.method === 'troco' || checkout.method === 'wallet') && (profile.euroBalance || 0) < (checkout.amount || 0)) {
      alert(`Solde insuffisant (${(profile.euroBalance || 0).toFixed(2)} € disponibles sur ${(checkout.amount || 0).toFixed(2)} € requis). Veuillez recharger votre portefeuille.`);
      return;
    }
    checkoutAppliedRef.current = false; // reset guard for this payment
    setCheckout(prev => ({ ...prev, step: 'processing' }));
    window.setTimeout(() => {
      playApplePaySound();
      setCheckout(prev => ({ ...prev, step: 'success' }));
      // Auto-close after 1.6s — will call closeCheckout which applies the balance changes once
      window.setTimeout(() => {
        closeCheckout();
      }, 1600);
    }, 1400);
  };

  const confirmBoostListing = () => {
    if (!boostingListing) return;
    if (profile.euroBalance < 2.99) {
      setBoostMessage('Solde insuffisant pour booster cette annonce.');
      return;
    }
    setBoostMessage('');
    setIsBoostModalOpen(false);
    openCheckout({ mode: 'boost', amount: 2.99, label: `Boost 7 jours — ${boostingListing.title}`, payload: { listingId: boostingListing.id } });
    setBoostingListing(null);
  };

  const paymentMethods = [
    { key: 'applePay', label: 'Apple Pay', sub: 'Paiement instantané et sécurisé', icon: <span style={{ backgroundColor: '#000000', color: '#FFF', borderRadius: '7px', padding: '3px 8px', fontSize: '12px', fontWeight: '800', fontStyle: 'italic' }}> Pay</span> },
    { key: 'card', label: 'Carte bancaire', sub: 'Visa • Mastercard • Amex', icon: <CreditCard size={18} color="#C67D5B" /> },
    { key: 'troco', label: 'Solde Troco / Virement', sub: 'Utiliser mes jetons ou virement SEPA', icon: <Coins size={18} color="#C67D5B" /> },
  ];


  // ---- DÉCONNEXION UNIVERSELLE ----
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('SignOut error:', e);
    }
    window.localStorage.removeItem('troco_is_authenticated');
    window.localStorage.removeItem('troco_user_profile');
    setIsAuthenticated(false);
    setSelectedChat(null);
    setSelectedListing(null);
    if (callState.active) endCall();
  };

  // ---- VALIDATION OBLIGATOIRE DES CGU / RGPD ----
  const handleAcceptCgu = async ({ cguVersion, acceptedAt } = {}) => {
    const now = acceptedAt || new Date().toISOString();
    const uid = profile.uid || auth.currentUser?.uid;
    setProfile(prev => {
      const updated = { ...prev, cguAcceptedAt: now, cguVersion: cguVersion || '2026.1' };
      window.localStorage.setItem('troco_user_profile', JSON.stringify(updated));
      return updated;
    });
    if (uid) {
      try {
        await updateDoc(doc(db, 'users', String(uid)), {
          cguAcceptedAt: serverTimestamp(),
          cguVersion: cguVersion || '2026.1',
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('[Firestore] CGU acceptance update failed:', e);
      }
    }
  };

  if (isLoadingSession) {
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
        {/* FOND LIQUIDE IRIDESCENT : DÉGRADÉ STATIQUE LÉGER SUR MOBILE POUR ÉVITER LE CRASH iOS */}
        {isMobile ? (
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
          {/* 🚨 PHASE 83 : SUR MOBILE, REMPLACEMENT STRICT DU LOGO 3D PAR UN MONOGRAMME STATIQUE ULTRA-LÉGER (ANTI-CRASH OOM iOS) */}
          {isMobile ? (
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '22px',
              background: 'linear-gradient(135deg, var(--accent-primary, #C67D5B) 0%, var(--accent-primary-hover, #A8644A) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: '38px',
              fontWeight: '900',
              fontFamily: 'var(--font-editorial, serif)',
              boxShadow: '0 8px 24px rgba(198, 125, 91, 0.35)',
              marginBottom: '24px'
            }}>
              T
            </div>
          ) : (
            <TrocoLogo3D size={100} animated={true} style={{ marginBottom: '28px' }} />
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
      <AuthScreen
        setProfile={setProfile}
        setIsAuthenticated={setIsAuthenticated}
        setProfileDraft={setProfileDraft}
        setSkills={setSkills}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      />
    );
  }

  return (
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
      {/* 🚨 PHASE 49 & 82 : ÉCRAN & BANNIÈRE HORS-LIGNE INTERACTIFS */}
      <OfflineBanner />
      <OfflineScreen />

      {/* 🚨 PHASE 55 : NOTIFICATIONS DYNAMIC ISLAND / TOASTS PREMIUM */}
      <NotificationPill />

      {/* CONSTELLATION GÉOMÉTRIQUE FLUIDE EN ARRIÈRE-PLAN */}
      <GeometricBackground darkMode={darkMode} />

      {/* FOND LIQUIDE IRIDESCENT : DÉGRADÉ STATIQUE SUR MOBILE POUR ÉVITER LE DÉPASSEMENT VRAM iOS */}
      {isMobile ? (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(circle at top right, var(--bg-subtle), var(--bg-global))',
          pointerEvents: 'none',
          zIndex: 0
        }} />
      ) : (
        <div className="liquid-iridescence-container">
          <div className="liquid-blob liquid-blob-1" />
          <div className="liquid-blob liquid-blob-2" />
          <div className="liquid-blob liquid-blob-3" />
        </div>
      )}

      {/* MODALE BLOQUANTE CGU & RGPD OBLIGATOIRE */}
      {isAuthenticated && !profile.cguAcceptedAt && (
        <Suspense fallback={null}>
          <CguConsentModal
            isOpen={isAuthenticated && !profile.cguAcceptedAt}
            onAccept={handleAcceptCgu}
            profile={profile}
            darkMode={darkMode}
            t={t}
          />
        </Suspense>
      )}
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

      {/* 1. FOND GÉOMÉTRIQUE UNIFIÉ DESKTOP & MOBILE */}
      <GeometricBackground darkMode={darkMode} />

      {/* MICRO-INDICATEUR DE PROGRESSION (React 18 useTransition — barre YouTube-style) */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          zIndex: 99999,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, var(--accent-primary, #C67D5B) 0%, #F59E0B 60%, #EC4899 100%)',
            transformOrigin: 'left center',
            transform: isPending ? 'scaleX(0.85)' : 'scaleX(0)',
            opacity: isPending ? 1 : 0,
            transition: isPending
              ? 'transform 1.4s cubic-bezier(0.1, 0.4, 0.2, 1), opacity 0.1s ease'
              : 'transform 0.15s ease, opacity 0.3s ease 0.1s',
            boxShadow: isPending ? '0 0 10px rgba(198,125,91,0.6)' : 'none',
          }}
        />
      </div>

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

      {isBoostModalOpen && boostingListing && (
        <Suspense fallback={null}>
          <BoostListingModal
            isOpen={isBoostModalOpen}
            onClose={() => setIsBoostModalOpen(false)}
            boostingListing={boostingListing}
            confirmBoostListing={confirmBoostListing}
            boostMessage={boostMessage}
            darkMode={darkMode}
            profile={profile}
          />
        </Suspense>
      )}

      {/* ---- CHECKOUT / TUNNEL DE PAIEMENT SIMULÉ ---- */}
      {checkout.open && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(61,53,48,0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 75 }}>
          <div style={{ width: '100%', maxWidth: '460px', backgroundColor: darkMode ? '#231E1B' : '#FAF7F2', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', borderRadius: '28px', padding: '24px', boxShadow: '0 30px 80px rgba(61,53,48,0.30)', border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3', position: 'relative' }}>
            {checkout.step === 'success' ? (
              <div style={{ textAlign: 'center', padding: '18px 8px' }}>
                <div style={{ width: '76px', height: '76px', borderRadius: '50%', backgroundColor: '#EBF0E6', color: '#3D4A35', margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'popIn 0.5s cubic-bezier(0.22,1,0.36,1) both' }}>
                  <Check size={36} strokeWidth={3} />
                </div>
                <h3 className="font-editorial-heading" style={{ margin: '0 0 10px', fontSize: '22px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530', lineHeight: 1.4 }}>{t('transactionSuccess')}</h3>
                <p style={{ margin: '0 0 6px', fontSize: '13px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>{checkout.label}</p>
                <p style={{ margin: '0 0 20px', fontSize: '24px', fontWeight: '800', color: '#C67D5B' }}>{(checkout.amount || 0).toFixed(2)} €</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', color: '#7A8F6A', fontWeight: '700', marginBottom: '18px' }}>
                  <ShieldCheck size={14} /> {t('encryptedPayment')}
                </div>
                <button onClick={closeCheckout} className="premium-button" style={{ width: '100%', border: 'none', borderRadius: '16px', padding: '14px', background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)', color: '#FFF', fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 22px rgba(198,125,91,0.25)' }}>{t('doneButton')}</button>
              </div>
            ) : checkout.step === 'processing' ? (
              <div style={{ textAlign: 'center', padding: '34px 8px' }}>
                <div style={{ width: '46px', height: '46px', margin: '0 auto 20px', border: '3px solid rgba(198,125,91,0.2)', borderTopColor: '#C67D5B', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <div style={{ fontWeight: '800', color: darkMode ? '#FAF7F2' : '#3D3530', fontSize: '15px' }}>{t('transactionProcessing')}</div>
                <p style={{ fontSize: '12px', color: darkMode ? '#D4C5B5' : '#6B5E54', marginTop: '8px' }}>{t('secureBankConnection')}</p>
              </div>
            ) : (
              <>
                <button onClick={closeCheckout} style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', backgroundColor: darkMode ? 'rgba(232,221,211,0.1)' : '#F5EAE4', width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X size={16} color={darkMode ? '#FAF7F2' : '#3D3530'} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Lock size={16} color="#C67D5B" />
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#C67D5B', letterSpacing: '0.04em' }}>{t('securePaymentHeader')}</span>
                </div>
                <h3 className="font-editorial-heading" style={{ margin: '0 0 16px', fontSize: '22px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530' }}>{checkout.label || 'Paiement'}</h3>

                <div style={{ border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '16px', padding: '14px', backgroundColor: darkMode ? '#1A1715' : '#F5F0E8', marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>{t('amountToPay')}</span>
                  <span style={{ fontSize: '22px', fontWeight: '800', color: darkMode ? '#FAF7F2' : '#3D3530' }}>{(checkout.amount || 0).toFixed(2)} €</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {paymentMethods.map(method => (
                    <button key={method.key} onClick={() => setCheckout(prev => ({ ...prev, method: method.key }))} style={{ display: 'flex', alignItems: 'center', gap: '12px', border: checkout.method === method.key ? '1.5px solid #C67D5B' : (darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3'), borderRadius: '14px', padding: '12px 14px', backgroundColor: checkout.method === method.key ? (darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4') : (darkMode ? '#1A1715' : '#FFFFFF'), cursor: 'pointer', textAlign: 'left' }}>
                      {method.icon}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: darkMode ? '#FAF7F2' : '#3D3530' }}>{method.label}</div>
                        <div style={{ fontSize: '11px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>{method.sub}</div>
                      </div>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: checkout.method === method.key ? '5px solid #C67D5B' : '1.5px solid #E8DDD3' }} />
                    </button>
                  ))}
                </div>

                {checkout.method === 'card' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', padding: '12px', borderRadius: '14px', backgroundColor: darkMode ? '#1A1715' : '#F5F0E8', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3' }}>
                    <input placeholder="1234 5678 9012 3456" style={{ width: '100%', padding: '10px 12px', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '10px', fontSize: '13px', backgroundColor: darkMode ? '#231E1B' : '#FFF', color: darkMode ? '#FAF7F2' : '#3D3530' }} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input placeholder="MM/AA" style={{ flex: 1, padding: '10px 12px', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '10px', fontSize: '13px', backgroundColor: darkMode ? '#231E1B' : '#FFF', color: darkMode ? '#FAF7F2' : '#3D3530' }} />
                      <input placeholder="CVC" style={{ flex: 1, padding: '10px 12px', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '10px', fontSize: '13px', backgroundColor: darkMode ? '#231E1B' : '#FFF', color: darkMode ? '#FAF7F2' : '#3D3530' }} />
                    </div>
                  </div>
                )}

                {checkout.method === 'troco' && (
                  <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '14px', backgroundColor: darkMode ? 'rgba(217,119,6,0.15)' : '#FEF3C7', border: '1px solid #E8DDD3', fontSize: '12px', color: darkMode ? '#FDE68A' : '#92400E', lineHeight: 1.6 }}>
                    💡 Recharge depuis ton solde Troco ou par virement SEPA. Tes jetons seront convertis automatiquement si le solde est insuffisant.
                  </div>
                )}

                <button onClick={handleConfirmPayment} className="premium-button" style={{ width: '100%', border: 'none', borderRadius: '16px', padding: '14px', background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)', color: '#FFF', fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 22px rgba(198,125,91,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Lock size={15} /> Payer {(checkout.amount || 0).toFixed(2)} €
                </button>
              </>
            )}
          </div>
        </div>
      )}



      <LanguageSelectModal
        isOpen={isLangModalOpen}
        onClose={() => setIsLangModalOpen(false)}
        currentLang={currentLang}
        onSelectLanguage={(code) => {
          setCurrentLang(code);
          setIsLangModalOpen(false);
        }}
        darkMode={darkMode}
        t={t}
      />

      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        filteredListingsCount={filteredListings.length}
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
        paymentOptions={paymentOptions}
        paymentLabels={paymentLabels}
        darkMode={darkMode}
        t={t}
      />

      {isCategoryModalOpen && (
        <Suspense fallback={null}>
          <CategoryPickerModal
            isOpen={isCategoryModalOpen}
            onClose={() => setIsCategoryModalOpen(false)}
            categoryInput={categoryInput}
            setCategoryInput={setCategoryInput}
            handleAddCategory={handleAddCategory}
            darkMode={darkMode}
            t={t}
          />
        </Suspense>
      )}

      {selectedListing && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(28, 24, 22, 0.72)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          zIndex: 100005,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: isMobile ? '12px 8px 90px' : '24px 16px 60px'
        }}>
          <div style={{
            maxWidth: '760px',
            margin: '0 auto',
            backgroundColor: darkMode ? '#231E1B' : '#FAF7F2',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            borderRadius: '28px',
            overflow: 'hidden',
            boxShadow: darkMode ? '0 30px 90px rgba(0,0,0,0.75)' : '0 30px 90px rgba(61,53,48,0.25)',
            border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
            color: darkMode ? '#FAF7F2' : '#3D3530',
            animation: 'modalSlideIn 0.55s var(--ease-monopo) both'
          }}>

            {/* EN-TÊTE MOBILE RETOUR TACTILE 44x44px (APPLE HIG) */}
            {isMobile && (
              <MobileHeader
                title={selectedListing.title || "Détail de l'annonce"}
                subtitle={selectedListing.category || "Troco"}
                onBack={() => {
                  setSelectedListing(null);
                  setSelectedDetailImageIndex(0);
                  setDetailMediaTab('image');
                }}
                darkMode={darkMode}
              />
            )}

            {/* CARROUSEL HÉRO INTERACTIF */}
            <div
              onTouchStart={handleModalTouchStart}
              onTouchMove={handleModalTouchMove}
              onTouchEnd={handleModalTouchEnd}
              style={{ position: 'relative', width: '100%', height: '340px', backgroundColor: '#1A1715', touchAction: 'pan-y', userSelect: 'none', WebkitUserSelect: 'none', overflow: 'hidden' }}
            >
              {detailMediaTab === 'video' && selectedListing.video ? (
                <video
                  src={selectedListing.video}
                  poster={selectedListing.image}
                  autoPlay
                  loop
                  muted
                  playsInline
                  onError={() => setDetailMediaTab('image')}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                (() => {
                  const gallery = selectedListing.gallery && selectedListing.gallery.length > 0 ? selectedListing.gallery : [selectedListing.image];
                  return (
                    <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                      {gallery.map((imgSrc, idx) => {
                        const isActive = idx === selectedDetailImageIndex;
                        return (
                          <img
                            key={idx}
                            src={imgSrc}
                            alt={selectedListing.title}
                            draggable={false}
                            onError={(e) => { e.target.src = getFallbackImage(selectedListing.category, selectedListing.title); }}
                            style={{
                              position: 'absolute',
                              inset: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              opacity: isActive ? 1 : 0,
                              transition: 'opacity 0.4s ease-in-out, transform 0.4s ease-in-out',
                              transform: isActive ? 'scale(1)' : 'scale(1.03)',
                              pointerEvents: 'none',
                              WebkitUserDrag: 'none',
                              userSelect: 'none',
                              WebkitUserSelect: 'none',
                              zIndex: isActive ? 2 : 1
                            }}
                          />
                        );
                      })}
                    </div>
                  );
                })()
              )}

              {/* BOUTON FERMER */}
              <button onClick={() => { setSelectedListing(null); setSelectedDetailImageIndex(0); setDetailMediaTab('image'); }} style={{ position: 'absolute', top: '14px', right: '14px', border: 'none', width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'rgba(250,247,242,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, boxShadow: '0 4px 12px rgba(61,53,48,0.15)', color: '#3D3530' }}><X size={18} /></button>

              {selectedListing.isBoosted && <span className="sponsored-badge" style={{ position: 'absolute', top: '14px', left: '14px', backgroundColor: '#F59E0B', color: '#FFF', fontSize: '11px', fontWeight: '800', padding: '6px 10px', borderRadius: '10px', boxShadow: '0 6px 16px rgba(245,158,11,0.45)', zIndex: 10 }}>🔥 Sponsorisé</span>}

              {/* FLÈCHES DE NAVIGATION LATÉRALE */}
              {detailMediaTab === 'image' && (selectedListing.gallery?.length || 0) > 1 && (
                <>
                  <button
                    onClick={() => setSelectedDetailImageIndex(prev => (prev > 0 ? prev - 1 : (selectedListing.gallery.length - 1)))}
                    style={{
                      position: 'absolute', top: '50%', left: '12px',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      width: '38px', height: '38px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(61,53,48,0.4)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', zIndex: 10,
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      boxShadow: 'none'
                    }}
                  >
                    <ChevronLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => setSelectedDetailImageIndex(prev => (prev < (selectedListing.gallery.length - 1) ? prev + 1 : 0))}
                    style={{
                      position: 'absolute', top: '50%', right: '12px',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      width: '38px', height: '38px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(61,53,48,0.4)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', zIndex: 10,
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      boxShadow: 'none'
                    }}
                  >
                    <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />
                  </button>
                </>
              )}

              {/* PUCES INDICATRICES */}
              {detailMediaTab === 'image' && (selectedListing.gallery?.length || 0) > 1 && (
                <div style={{ position: 'absolute', bottom: '14px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px', zIndex: 10, backgroundColor: 'rgba(61,53,48,0.6)', padding: '6px 12px', borderRadius: '999px', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
                  {selectedListing.gallery.map((_, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedDetailImageIndex(idx)}
                      style={{
                        width: selectedDetailImageIndex === idx ? '20px' : '8px',
                        height: '8px',
                        borderRadius: '999px',
                        backgroundColor: selectedDetailImageIndex === idx ? '#C67D5B' : 'rgba(255,255,255,0.5)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                    />
                  ))}
                </div>
              )}

              {/* COMMUTATEUR MÉDIA BASCULE VIDÉO / GALERIE */}
              <div style={{ position: 'absolute', bottom: '14px', left: '14px', display: 'flex', gap: '8px', zIndex: 10 }}>
                {selectedListing.video && (
                  <button onClick={() => setDetailMediaTab('video')} style={{ border: 'none', borderRadius: '999px', padding: '7px 14px', backgroundColor: detailMediaTab === 'video' ? '#C67D5B' : 'rgba(61,53,48,0.75)', color: '#FFF', fontSize: '12px', fontWeight: '800', cursor: 'pointer', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Video size={13} /> {t('demoVideo')}
                  </button>
                )}
                <button onClick={() => setDetailMediaTab('image')} style={{ border: 'none', borderRadius: '999px', padding: '7px 14px', backgroundColor: detailMediaTab === 'image' ? '#C67D5B' : 'rgba(61,53,48,0.75)', color: '#FFF', fontSize: '12px', fontWeight: '800', cursor: 'pointer', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Camera size={13} /> Photos ({selectedListing.gallery?.length || 1})
                </button>
              </div>
            </div>

            <div style={{ padding: '20px' }}>
              {(() => {
                const isDetailShowingOriginal = !!showingOriginalListings[selectedListing.id];
                const detailDisplayContent = getListingDisplayContent(selectedListing, currentLang, isDetailShowingOriginal);
                return (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '10px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '999px', backgroundColor: darkMode ? 'rgba(198,125,91,0.2)' : '#F5EAE4', color: darkMode ? '#FAF7F2' : '#A8644A', fontSize: '11px', fontWeight: '800' }}>
                            <Sparkles size={12} /> {t('verifiedOffer')}
                          </div>
                          {(selectedListing.isDemo || (typeof selectedListing.id === 'number' && selectedListing.id <= 20)) && (
                            <span style={{
                              fontSize: '10.5px',
                              fontWeight: '750',
                              letterSpacing: '0.04em',
                              padding: '5px 11px',
                              borderRadius: '999px',
                              backgroundColor: 'var(--bg-subtle)',
                              color: 'var(--accent-primary)',
                              border: '1px solid var(--border-color)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              textTransform: 'uppercase'
                            }}>
                              <Sparkles size={12} color="var(--accent-primary)" />
                              Exemple Démo
                            </span>
                          )}
                        </div>
                        <h3 className="font-editorial-heading" style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530' }}>{detailDisplayContent.title}</h3>
                        {currentLang !== (selectedListing.nativeLang || 'FR') && (
                          <button
                            onClick={(e) => toggleOriginalListing(selectedListing.id, e)}
                            className="premium-button"
                            style={{
                              border: 'none',
                              backgroundColor: 'transparent',
                              color: '#C67D5B',
                              fontSize: '12px',
                              fontWeight: '800',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '2px 0 6px 0'
                            }}
                          >
                            <Globe size={13} color="#C67D5B" />
                            {isDetailShowingOriginal ? t('showTranslation') : t('showOriginal')}
                          </button>
                        )}
                      </div>
                      {(() => {
                        const authorName = selectedListing.authorProfile?.name || selectedListing.author || 'Membre Troco';
                        const authorUid = selectedListing.authorProfile?.uid || selectedListing.authorUid || null;
                        const isOwnListing = Boolean(
                          (profile?.name && authorName === profile.name) ||
                          (authorUid && (authorUid === profile?.uid || authorUid === auth.currentUser?.uid))
                        );

                        return !isOwnListing ? (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => handleViewOnMap(selectedListing)}
                              className="premium-button"
                              title="Centrer la carte interactive sur cette annonce"
                              style={{
                                border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3',
                                borderRadius: '999px',
                                padding: '11px 14px',
                                backgroundColor: darkMode ? '#1A1715' : '#FFF',
                                color: darkMode ? '#FAF7F2' : '#3D3530',
                                fontWeight: '700',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <MapPin size={14} color="#C67D5B" /> {t('viewOnMap') || 'Voir sur la carte'}
                            </button>
                            <button
                              onClick={() => {
                                setReportTarget({
                                  listing: selectedListing,
                                  user: { name: authorName, uid: authorUid }
                                });
                                setIsReportModalOpen(true);
                              }}
                              className="premium-button"
                              title="Signaler un contenu abusif ou suspect"
                              style={{
                                border: 'none',
                                borderRadius: '999px',
                                padding: '11px 14px',
                                backgroundColor: darkMode ? 'rgba(239,68,68,0.2)' : '#FEF2F2',
                                color: '#EF4444',
                                fontWeight: '700',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                              }}
                            >
                              <ShieldAlert size={14} /> Signaler
                            </button>
                            <button onClick={() => handleStartDiscussion({ id: selectedListing.id, title: selectedListing.title, author: authorName, compensation: selectedListing.compensation })} className="premium-button" style={{ border: 'none', borderRadius: '999px', padding: '11px 16px', background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)', color: '#FFF', fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 20px rgba(198,125,91,0.35)' }}>{t('startDiscussion')}</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleViewOnMap(selectedListing)}
                              className="premium-button"
                              title="Centrer la carte interactive sur cette annonce"
                              style={{
                                border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3',
                                borderRadius: '999px',
                                padding: '10px 14px',
                                backgroundColor: darkMode ? '#1A1715' : '#FFF',
                                color: darkMode ? '#FAF7F2' : '#3D3530',
                                fontWeight: '700',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <MapPin size={14} color="#C67D5B" /> {t('viewOnMap') || 'Voir sur la carte'}
                            </button>
                            <div style={{ backgroundColor: darkMode ? '#1A1715' : '#F5F0E8', color: darkMode ? '#D4C5B5' : '#6B5E54', padding: '10px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: '700', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3' }}>{t('authorAnnc')}</div>
                          </div>
                        );
                      })()}
                    </div>
                    <p style={{ margin: '0 0 14px', lineHeight: 1.7, color: darkMode ? '#D4C5B5' : '#6B5E54', fontSize: '14px' }}>{detailDisplayContent.description}</p>
                  </>
                );
              })()}

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {localizeTags(selectedListing.tags, currentLang).map(tag => (
                  <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: darkMode ? 'rgba(198,125,91,0.2)' : '#F5EAE4', color: darkMode ? '#FAF7F2' : '#A8644A', borderRadius: '999px', padding: '5px 10px', fontSize: '11px', fontWeight: '800' }}><Tag size={11} /> {tag}</span>
                ))}
              </div>

              <div style={{ border: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3', borderRadius: '16px', padding: '14px', backgroundColor: darkMode ? '#1A1715' : '#F5F0E8', marginBottom: '14px' }}>
                <div style={{ fontWeight: '800', fontSize: '13px', color: darkMode ? '#FAF7F2' : '#3D3530', marginBottom: '6px' }}>{t('compensation')}</div>
                <div style={{ fontSize: '13px', color: '#C67D5B', fontWeight: '700' }}>{formatCompensation(selectedListing.compensation)}</div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px', padding: '14px', borderRadius: '16px', backgroundColor: darkMode ? '#1A1715' : '#F5F0E8', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3' }}>
                <img src={selectedListing.authorProfile?.avatar || selectedListing.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'} alt={selectedListing.authorProfile?.name || selectedListing.author || 'Auteur'} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #E8DDD3' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '800', color: darkMode ? '#FAF7F2' : '#3D3530' }}>{selectedListing.authorProfile?.name || selectedListing.author || 'Membre Troco'}</div>
                  <div style={{ fontSize: '13px', color: darkMode ? '#D4C5B5' : '#6B5E54', marginTop: '4px' }}>{getBioTranslation(selectedListing.authorProfile?.bio || selectedListing.bio || '', currentLang, !!showingOriginalListings[selectedListing.id])}</div>
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontWeight: '800', fontSize: '13px', color: darkMode ? '#FAF7F2' : '#3D3530', marginBottom: '8px' }}>{t('socialNetworks')}</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(selectedListing.authorProfile?.socials || selectedListing.socials || []).map(link => <span key={link} style={{ border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '999px', padding: '6px 10px', fontSize: '12px', color: '#C67D5B', fontWeight: '700', backgroundColor: darkMode ? '#1A1715' : '#FAF7F2' }}>{link}</span>)}
                </div>
              </div>
              {(selectedListing.authorProfile?.portfolio || selectedListing.portfolio) && (selectedListing.authorProfile?.portfolio || selectedListing.portfolio).length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontWeight: '800', fontSize: '13px', color: darkMode ? '#FAF7F2' : '#3D3530', marginBottom: '8px' }}>{t('portfolio')}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
                    {(selectedListing.authorProfile?.portfolio || selectedListing.portfolio).map((image, index) => (
                      <img key={image + index} src={image} alt="portfolio" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '14px' }} />
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div style={{ fontWeight: '800', fontSize: '13px', color: darkMode ? '#FAF7F2' : '#3D3530', marginBottom: '8px' }}>{t('reviews')}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(selectedListing.authorProfile?.reviews || selectedListing.authorReviews) && (selectedListing.authorProfile?.reviews || selectedListing.authorReviews).length > 0 ? (
                    (selectedListing.authorProfile?.reviews || selectedListing.authorReviews).map((review, index) => (
                      <div key={review.text + index} style={{ border: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3', borderRadius: '14px', padding: '12px', backgroundColor: darkMode ? '#1A1715' : '#F5F0E8' }}>
                        <div style={{ color: '#F59E0B', marginBottom: '4px' }}>{'⭐'.repeat(review.rating)}{'☆'.repeat(Math.max(0, 5 - review.rating))}</div>
                        <div style={{ fontSize: '13px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>{localizeReview(review.text, currentLang)}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '12.5px', color: darkMode ? '#D4C5B5' : '#6B5E54', fontStyle: 'italic', padding: '12px 14px', borderRadius: '14px', backgroundColor: darkMode ? '#1A1715' : '#F5F0E8', border: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3' }}>
                      🤝 Nouveau membre • Aucun avis pour le moment (0 transaction clôturée)
                    </div>
                  )}
                </div>
              </div>

              {isAdmin && (
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: darkMode ? '1px solid rgba(239,68,68,0.3)' : '1px solid #FEE2E2' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`[ADMINISTRATEUR]\nConfirmez-vous la suppression définitive de l'annonce "${selectedListing.title}" ?`)) {
                        handleAdminDeleteListing(selectedListing);
                        setSelectedListing(null);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '14px',
                      backgroundColor: '#EF4444',
                      color: '#FFFFFF',
                      fontWeight: '800',
                      fontSize: '13px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 6px 16px rgba(239,68,68,0.25)'
                    }}
                  >
                    <Trash2 size={16} /> Supprimer cette annonce (Action Administrateur)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
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
          <motion.div
            key="page-feed"
            variants={pageTransitionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransitionConfig}
            style={{ width: '100%' }}
          >
          <div className="feed-layout-container">
            {/* BANNIÈRE LATÉRALE GAUCHE (DESKTOP) */}
            <aside className="desktop-ad-banner" aria-label="Espace Partenaires Troco">
              <div className="ad-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: darkMode ? '#FAF7F2' : '#A8644A', backgroundColor: darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4', padding: '3px 7px', borderRadius: '6px' }}>
                    🌟 Partenaire Pro
                  </span>
                  <span style={{ fontSize: '9px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>Sponsorisé</span>
                </div>
                <img
                  src="https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&q=80"
                  alt="Partenaire Outillage"
                  style={{ width: '100%', height: '85px', objectFit: 'cover', borderRadius: '12px', marginBottom: '8px' }}
                />
                <div style={{ fontSize: '13px', fontWeight: '800', color: darkMode ? '#FAF7F2' : '#3D3530', marginBottom: '4px', lineHeight: 1.3 }}>
                  Brico & Outillage Pro
                </div>
                <div style={{ fontSize: '11px', color: darkMode ? '#D4C5B5' : '#6B5E54', lineHeight: 1.4, marginBottom: '8px' }}>
                  Matériel certifié disponible en prêt immédiat avec caution Troco.
                </div>
                <div style={{ display: 'inline-block', fontSize: '10px', fontWeight: '800', color: '#3D4A35', backgroundColor: '#EBF0E6', padding: '2px 8px', borderRadius: '999px', marginBottom: '8px', border: '1px solid #D4DFCE' }}>
                  -15% membres Troco
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('Outillage');
                    alert("🏷️ Code promo partenaire 'TROCO15' appliqué sur la catégorie Outillage !");
                  }}
                  className="premium-button"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)',
                    color: '#FFF',
                    fontSize: '11px',
                    fontWeight: '700',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Voir les offres
                </button>
              </div>

              <div className="ad-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#D97706', backgroundColor: '#FEF3C7', padding: '3px 7px', borderRadius: '6px' }}>
                    🎓 Mentorat
                  </span>
                  <span style={{ fontSize: '9px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>Publicité</span>
                </div>
                <img
                  src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80"
                  alt="Academia Code"
                  style={{ width: '100%', height: '85px', objectFit: 'cover', borderRadius: '12px', marginBottom: '8px' }}
                />
                <div style={{ fontSize: '13px', fontWeight: '800', color: darkMode ? '#FAF7F2' : '#3D3530', marginBottom: '4px', lineHeight: 1.3 }}>
                  Academia Code & Langues
                </div>
                <div style={{ fontSize: '11px', color: darkMode ? '#D4C5B5' : '#6B5E54', lineHeight: 1.4, marginBottom: '8px' }}>
                  Mentorat accéléré et cours en visioconférence HD.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('Cours/Compétences');
                    setFormatFilter('remote');
                  }}
                  className="premium-button"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    backgroundColor: darkMode ? '#1A1715' : '#FAF7F2',
                    color: darkMode ? '#FAF7F2' : '#3D3530',
                    fontSize: '11px',
                    fontWeight: '700',
                    border: '1px solid #E8DDD3',
                    cursor: 'pointer'
                  }}
                >
                  Trouver un mentor
                </button>
              </div>
            </aside>

            {/* CONTENU CENTRAL DU FEED */}
            <div className="feed-main-content">
              {/* BANNIÈRE D'ANNONCE GLOBALE DYNAMIQUE DU CMS (useGlobalContent) */}
              {globalAnnouncement && (
                <div
                  style={{
                    backgroundColor: darkMode ? 'rgba(198,125,91,0.15)' : '#FBF3EE',
                    border: '1px solid rgba(198,125,91,0.3)',
                    borderRadius: '16px',
                    padding: '10px 16px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    fontSize: '13px',
                    fontWeight: '700',
                    color: darkMode ? '#FAF7F2' : '#8C482F',
                    boxShadow: '0 4px 12px rgba(198,125,91,0.08)',
                    animation: 'fadeIn 0.3s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={16} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                    <span>{globalAnnouncement}</span>
                  </div>
                </div>
              )}

              {/* Ligne Recherche + Filtre Rayon + Bascule Vue Liste / Carte */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-card)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '10px 14px', boxShadow: 'var(--shadow-card)' }}>
                  <Search size={18} color="var(--accent-primary)" style={{ marginRight: '10px' }} />
                  <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} type="text" placeholder={t('searchPlaceholder')} style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', backgroundColor: 'transparent', color: 'var(--text-main)' }} />
                </div>
                <button
                  onClick={() => setIsFilterDrawerOpen(true)}
                  className="premium-button"
                  style={{
                    backgroundColor: isInfiniteRadius || radiusKm >= 100 ? 'var(--bg-subtle)' : 'var(--bg-card)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: isInfiniteRadius || radiusKm >= 100 ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    borderRadius: '16px',
                    padding: '10px 14px',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-card)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: isInfiniteRadius || radiusKm >= 100 ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: '700',
                    fontSize: '13px'
                  }}
                >
                  <Filter size={18} color={isInfiniteRadius || radiusKm >= 100 ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
                  <span>{isInfiniteRadius || radiusKm >= 100 ? `♾️ ${t('infinite')}` : `${radiusKm} km`}</span>
                </button>

                {/* Sélecteur de vue (Liste / Carte) dédié et étanche */}
                <div className="premium-panel" style={{ display: 'inline-flex', flexShrink: 0, border: '1px solid var(--border-color)', borderRadius: '999px', padding: '3px', backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-card)' }}>
                  <button onClick={() => setViewMode('list')} className="premium-nav-btn" style={{ border: 'none', borderRadius: '999px', padding: '8px 14px', backgroundColor: viewMode === 'list' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'list' ? '#FFF' : 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>{t('viewList')}</button>
                  <button onClick={handleSwitchToMap} className="premium-nav-btn" style={{ border: 'none', borderRadius: '999px', padding: '8px 14px', backgroundColor: viewMode === 'map' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'map' ? '#FFF' : 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>{t('viewMap')}</button>
                </div>
              </div>

              {/* Barre des catégories avec Carrousel fluide et flèches de navigation latérales */}
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                marginBottom: '16px',
                width: '100%',
                minWidth: 0,
                gap: '8px'
              }}>
                {/* Flèche de défilement gauche */}
                <button
                  type="button"
                  onClick={() => scrollCategories('left')}
                  title="Faire défiler vers la gauche"
                  className="premium-button"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    boxShadow: 'var(--shadow-card)',
                    zIndex: 2,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Conteneur de défilement des catégories */}
                <div
                  ref={categoryScrollRef}
                  className="category-scroll-container"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    paddingBottom: '4px',
                    scrollBehavior: 'smooth'
                  }}
                >
                  {allCategories.map(category => {
                    const isSel = selectedCategory === category;
                    return (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className="premium-button category-pill"
                        style={{
                          border: isSel ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                          backgroundColor: isSel ? 'var(--bg-subtle)' : 'var(--bg-card)',
                          color: isSel ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          boxShadow: isSel ? 'var(--shadow-accent)' : 'var(--shadow-card)',
                          cursor: 'pointer'
                        }}
                      >
                        {getCategoryLabel(category)}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="premium-button category-pill"
                    style={{
                      border: '1px dashed var(--accent-primary)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--accent-primary)',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    + {t('newCategory')}
                  </button>
                </div>

                {/* Flèche de défilement droite */}
                <button
                  type="button"
                  onClick={() => scrollCategories('right')}
                  title="Faire défiler vers la droite"
                  className="premium-button"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    boxShadow: 'var(--shadow-card)',
                    zIndex: 2,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* SÉLECTEUR FORMAT (Tous / Sur place / À distance) */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                maxWidth: isMobile ? '100%' : '480px',
                width: '100%',
                margin: '0 auto 20px auto',
              }}>
                {/* SÉLECTEUR SEGMENTÉ FORMAT */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '4px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--bg-card)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-card)',
                  boxSizing: 'border-box',
                  gap: '4px'
                }}>
                  <button
                    type="button"
                    onClick={() => setFormatFilter('all')}
                    className="premium-button"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: formatFilter === 'all'
                        ? 'var(--accent-primary)'
                        : 'transparent',
                      color: formatFilter === 'all'
                        ? '#FFFFFF'
                        : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: formatFilter === 'all'
                        ? 'var(--shadow-accent)'
                        : 'none',
                      transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)'
                    }}
                  >
                    <Globe size={13} />
                    <span>{t('all')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormatFilter('onsite')}
                    className="premium-button"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: formatFilter === 'onsite'
                        ? 'var(--accent-primary)'
                        : 'transparent',
                      color: formatFilter === 'onsite'
                        ? '#FFFFFF'
                        : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: formatFilter === 'onsite'
                        ? 'var(--shadow-accent)'
                        : 'none',
                      transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)'
                    }}
                  >
                    <MapPin size={13} />
                    <span>{t('onsite')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormatFilter('remote')}
                    className="premium-button"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: formatFilter === 'remote'
                        ? 'var(--accent-primary)'
                        : 'transparent',
                      color: formatFilter === 'remote'
                        ? '#FFFFFF'
                        : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: formatFilter === 'remote'
                        ? 'var(--shadow-accent)'
                        : 'none',
                      transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)'
                    }}
                  >
                    <Video size={13} />
                    <span>{t('remote')}</span>
                  </button>
                </div>
              </div>

              {filteredListings.length === 0 ? (
                <div style={{ width: '100%', padding: '40px 0', display: 'flex', justifyContent: 'center' }}>
                  <EmptyState
                    icon={<Search size={30} strokeWidth={2.2} />}
                    title="Aucune annonce ne correspond à ta recherche"
                    description="Essaie d'élargir ton rayon de recherche, de changer de catégorie ou de réinitialiser tes filtres pour découvrir les annonces des membres Troco."
                    action={(
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('all');
                          setRadiusKm(100);
                          setIsInfiniteRadius(true);
                          setSelectedLanguages([]);
                          setSelectedPayment('all');
                          setFormatFilter('all');
                        }}
                        className="premium-button"
                        style={{
                          border: 'none',
                          borderRadius: '999px',
                          padding: '12px 24px',
                          background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                          color: '#FFF',
                          fontWeight: '800',
                          fontSize: '13px',
                          cursor: 'pointer',
                          boxShadow: 'var(--shadow-accent)',
                        }}
                      >
                        Réinitialiser tous les filtres
                      </button>
                    )}
                  />
                </div>
              ) : viewMode === 'map' ? (
                <div ref={mapContainerRef} style={{ width: '100%', position: 'relative' }}>
                  <Suspense fallback={null}>
                    <MapSection
                      filteredListings={filteredListings}
                      mapCenter={mapCenter}
                      mapZoom={mapZoom}
                      darkMode={darkMode}
                      currentLang={currentLang}
                      t={t}
                      theme={theme}
                      getCoordinatesForLocation={getCoordinatesForLocation}
                      getSuggestedMedia={getSuggestedMedia}
                      getListingDisplayContent={getListingDisplayContent}
                      localizeLocation={localizeLocation}
                      handleOpenListing={handleOpenListing}
                      onClose={() => setViewMode('list')}
                      onCloseMap={() => setViewMode('list')}
                      mapContainerRef={mapContainerRef}
                    />
                  </Suspense>
                </div>
              ) : (
                <>
                  <motion.div
                    ref={listingsGridRef}
                    variants={{
                      hidden: { opacity: 0 },
                      show: {
                        opacity: 1,
                        transition: {
                          staggerChildren: 0.05,
                        },
                      },
                    }}
                    initial="hidden"
                    animate="show"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(290px, 1fr))',
                      gap: isMobile ? '16px' : '24px',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  >
                    {(filteredListings || []).map((item, index) => {
                      const authorProfile = item?.authorProfile || {
                        name: item?.author || 'Membre Troco',
                        avatar: item?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
                        bio: item?.bio || '',
                        location: item?.location || 'Paris',
                        uid: item?.authorUid || null,
                      };

                      return (
                        <React.Fragment key={item.id || index}>
                          <FeedCardItem
                            item={item}
                            darkMode={darkMode}
                            hoveredCardId={hoveredCardId}
                            setHoveredCardId={setHoveredCardId}
                            hoverSlideIndex={hoverSlideIndex}
                            handleOpenListing={handleOpenListing}
                            getSuggestedMedia={getSuggestedMedia}
                            getFallbackImage={getFallbackImage}
                            formatCompensation={formatCompensation}
                            getListingDisplayContent={getListingDisplayContent}
                            currentLang={currentLang}
                            showingOriginalListings={showingOriginalListings}
                            toggleOriginalListing={toggleOriginalListing}
                            localizeLocation={localizeLocation}
                            localizeTags={localizeTags}
                            generateTags={generateTags}
                            getAuthorAvatar={getAuthorAvatar}
                            profile={profile}
                            handleStartDiscussion={handleStartDiscussion}
                            isAdmin={isAdmin}
                            isGodModeActive={isGodModeActive}
                            onAdminDeleteListing={handleAdminDeleteListing}
                            onAdminToggleHideListing={handleAdminToggleHideListing}
                            onAdminEditListing={handleAdminEditListing}
                            onOpenMobileActions={setMobileListingActionTarget}
                            t={t}
                            onViewUserProfile={() => {
                              const userObj = {
                                id: item.authorUid || item.userId || `user_${item.author}`,
                                uid: item.authorUid || item.userId || null,
                                name: item.author || 'Membre Troco',
                                username: item.author ? `@${item.author.toLowerCase().replace(/\s+/g, '')}` : '@membre',
                                avatar: authorProfile.avatar,
                                bio: authorProfile.bio,
                                location: item.location || 'France',
                                trocoTokens: item.trocoTokens || 12,
                                euroBalance: item.euroBalance || 100,
                                isTrocoPlus: item.isTrocoPlus || false,
                                kycVerified: item.kycVerified || false,
                                dealsCompleted: item.dealsCompleted || 0,
                                authorProfile: authorProfile,
                              };
                              setSelectedPublicUser(userObj);
                            }}
                          />

                          {/* INJECTION FLUIDE D'UNE CARTE SPONSORISÉE TOUTES LES 6 ANNONCES */}
                          {(index + 1) % 6 === 0 && (
                            <SponsoredFeedCard
                              key={`sponsored-card-${index}`}
                              darkMode={darkMode}
                              currentLang={currentLang}
                              t={t}
                              onOpenBoostModal={() => {
                                const myListing = listings.find(l => l.author === profile?.name) || listings[0];
                                setBoostingListing(myListing);
                                setIsBoostModalOpen(true);
                              }}
                              onOpenBusinessOffer={() => {
                                setIsCguViewerOpen(true);
                              }}
                              onClaimBonus={(amount) => {
                                setProfile(prev => ({
                                  ...prev,
                                  euroBalance: Number((prev.euroBalance + amount).toFixed(2))
                                }));
                                playApplePaySound();
                                setSaveMessage(`🎁 Bonus partenaire crédité : +${amount}€ sur votre solde !`);
                                setTimeout(() => setSaveMessage(''), 6000);
                              }}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </motion.div>

                  {/* SENTINELLE OBSERVER POUR AUTO INFINITE SCROLL */}
                  {hasMoreListings && (
                    <div ref={loadMoreSentinelRef} style={{ width: '100%', height: '24px', margin: '8px 0', pointerEvents: 'none' }} />
                  )}

                  {/* BOUTON CHARGER PLUS D'ANNONCES (PAGINATED INFINITE SCROLL) */}
                  {hasMoreListings && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '28px', marginBottom: '20px' }}>
                      <button
                        type="button"
                        onClick={handleLoadMoreListings}
                        disabled={isLoadingMoreListings}
                        className="premium-button"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '12px 30px',
                          borderRadius: '999px',
                          border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.12)',
                          backgroundColor: darkMode ? 'rgba(35,30,27,0.95)' : '#FFFFFF',
                          color: darkMode ? '#FAF7F2' : '#3D3530',
                          fontSize: '13px',
                          fontWeight: '800',
                          cursor: isLoadingMoreListings ? 'not-allowed' : 'pointer',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                          transition: 'all 0.2s ease',
                          opacity: isLoadingMoreListings ? 0.7 : 1,
                        }}
                      >
                        {isLoadingMoreListings ? (
                          <>
                            <div style={{ width: '16px', height: '16px', border: '2px solid #C67D5B', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            <span>Chargement des annonces...</span>
                          </>
                        ) : (
                          <>
                            <span>Charger plus d'annonces</span>
                            <ChevronRight size={16} />
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* BANNIÈRE LATÉRALE DROITE (DESKTOP) */}
            <aside className="desktop-ad-banner" aria-label="Monétisation & Boost Troco">
              <div className="ad-card" style={{ border: darkMode ? '1px solid rgba(245,158,11,0.3)' : '1px solid #FDE68A' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#B45309', backgroundColor: '#FEF3C7', padding: '3px 7px', borderRadius: '6px' }}>
                    🔥 Troco Boost
                  </span>
                  <span style={{ fontSize: '9px', color: darkMode ? '#94A3B8' : '#94A3B8' }}>Visibilité</span>
                </div>
                <img
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=80"
                  alt="Booster annonce"
                  style={{ width: '100%', height: '85px', objectFit: 'cover', borderRadius: '12px', marginBottom: '8px' }}
                />
                <div style={{ fontSize: '13px', fontWeight: '800', color: darkMode ? '#FFFFFF' : '#0F172A', marginBottom: '4px', lineHeight: 1.3 }}>
                  Passez en tête du Feed !
                </div>
                <div style={{ fontSize: '11px', color: darkMode ? '#94A3B8' : '#64748B', lineHeight: 1.4, marginBottom: '6px' }}>
                  Multipliez par 5 vos contacts en plaçant vos annonces en tête d'affiche.
                </div>
                <div style={{ fontSize: '11px', fontWeight: '800', color: darkMode ? '#FBBF24' : '#D97706', marginBottom: '8px' }}>
                  À partir de 2,99€ / 7 jours
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const myListing = listings.find(l => l.author === profile?.name) || listings[0];
                    if (myListing) {
                      setBoostingListing(myListing);
                      setIsBoostModalOpen(true);
                    } else {
                      setActiveTab('profile');
                      alert("💡 Créez ou sélectionnez l'une de vos annonces depuis votre profil pour activer le Boost !");
                    }
                  }}
                  className="premium-button"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    backgroundColor: '#D97706',
                    color: '#FFF',
                    fontSize: '11px',
                    fontWeight: '800',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    boxShadow: '0 4px 12px rgba(217,119,6,0.25)'
                  }}
                >
                  <Flame size={13} /> Booster mon annonce
                </button>
              </div>
              <div className="ad-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#7E22CE', backgroundColor: '#F3E8FF', padding: '3px 7px', borderRadius: '6px' }}>
                    🏢 Espace Pro
                  </span>
                  <span style={{ fontSize: '9px', color: darkMode ? '#94A3B8' : '#94A3B8' }}>Offre Pro</span>
                </div>
                <img
                  src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=400&q=80"
                  alt="Troco Entreprise"
                  style={{ width: '100%', height: '85px', objectFit: 'cover', borderRadius: '12px', marginBottom: '8px' }}
                />
                <div style={{ fontSize: '13px', fontWeight: '800', color: darkMode ? '#FFFFFF' : '#0F172A', marginBottom: '4px', lineHeight: 1.3 }}>
                  Vous êtes une Entreprise ?
                </div>
                <div style={{ fontSize: '11px', color: darkMode ? '#94A3B8' : '#64748B', lineHeight: 1.4, marginBottom: '8px' }}>
                  Abonnement Pro avec facturation TVA et échanges illimités.
                </div>
                <button
                  type="button"
                  onClick={() => setIsCguViewerOpen(true)}
                  className="premium-button"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#F1F5F9',
                    color: darkMode ? '#FFF' : '#0F172A',
                    fontSize: '11px',
                    fontWeight: '700',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  En savoir plus
                </button>
              </div>
            </aside>
          </div>
        </motion.div>
      )}

      {/* ONGLET COMMUNAUTÉ : TROCO LIVE & FIL D'ACTIVITÉ */}
      {activeTab === 'community' && (
        <motion.div
          key="page-community"
          variants={pageTransitionVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransitionConfig}
          style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}
        >
          <SectoralErrorBoundary moduleName="Communauté & Troco Live">
            <Suspense fallback={null}>
              <CommunityHubSection
                currentUser={profile}
                onOpenProfile={(targetUser) => {
                  const targetObj = {
                    id: targetUser.id || targetUser.uid || `user-${Date.now()}`,
                    user: targetUser.name || targetUser.author || 'Membre Troco',
                    avatar: targetUser.avatar,
                    verified: targetUser.verified || false,
                    author: targetUser.name || targetUser.author || 'Membre Troco',
                    authorUsername: targetUser.username || targetUser.authorUsername || '@membre',
                    authorProfile: targetUser,
                  };
                  setCommunityProfileUser(targetObj);
                  setIsCommunityProfileOpen(true);
                }}
                darkMode={darkMode}
                isMobile={isMobile}
              />
            </Suspense>
          </SectoralErrorBoundary>
        </motion.div>
      )}

      {/* ONGLET 2 : MESSAGERIE & NÉGOCIATIONS */}
      {activeTab === 'chat' && (() => {
        const activeChatData = chatsList.find(c => String(c.id) === String(selectedChat?.id));
        const otherUserName = activeChatData?.user || selectedChat?.user;
        const isThemTyping = !!(activeChatData?.typing && otherUserName && activeChatData.typing[otherUserName]);

        return (
          <motion.div
            key="page-chat"
            variants={pageTransitionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransitionConfig}
            style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}
          >
            <SectoralErrorBoundary moduleName="Messagerie & Hub Collaboratif">
              <Suspense fallback={null}>
                <ChatSection
                  activeTab={activeTab}
                  mockChats={chatsList}
                  selectedChat={selectedChat}
                  setSelectedChat={handleSelectChat}
                  chatThreads={chatThreads}
                  readChats={readChats}
                  chatInputText={messageDraft}
                  setChatInputText={setMessageDraft}
                  onTypingChange={handleTypingChange}
                  isThemTyping={isThemTyping}
                  handleSendMessage={handleSendMessage}
                  handleEditMessage={handleEditMessage}
                  handleDeleteMessage={handleDeleteMessage}
                  openCounterOffer={openCounterOffer}
                  startCall={startCall}
                  joinActiveCall={joinActiveCall}
                  handleAcceptDeal={handleAcceptDeal}
                  handleDeclineDeal={handleDeclineDeal}
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
                  allListings={listings}
                  onOpenListing={handleOpenListing}
                />
              </Suspense>
            </SectoralErrorBoundary>
          </motion.div>
        );
      })()}

      {/* ONGLET 3 : DÉPOSER UNE ANNONCE */}
      {activeTab === 'post' && (
        <motion.div
          key="page-post"
          variants={pageTransitionVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransitionConfig}
          style={{ width: '100%' }}
        >
          <SectoralErrorBoundary featureName="Dépôt d'annonce">
            <Suspense fallback={null}>
              <PostListingFeature
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
              />
            </Suspense>
          </SectoralErrorBoundary>
        </motion.div>
      )}

      {/* ONGLET 4 : PROFIL UTILISATEUR */}
      {activeTab === 'profile' && (
        <motion.div
          key="page-profile"
          variants={pageTransitionVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransitionConfig}
          style={{ width: '100%' }}
        >
          <Suspense fallback={null}>
            <ProfileFeature
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
          </Suspense>
        </motion.div>
      )}
      </AnimatePresence>
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

      {/* POPUP CONFIRMATION PUBLICATION */}
      {showPublishedPopup && publishedListing && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 9000 }}
          onClick={() => {
            setShowPublishedPopup(false);
            setSelectedListing(publishedListing);
            setActiveTab('feed');
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg-card)', backdropFilter: 'blur(24px)', borderRadius: '28px', padding: '32px 28px', maxWidth: '380px', width: '100%', boxShadow: 'var(--shadow-modal)', border: '1px solid var(--border-color)', textAlign: 'center', animation: 'popupIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}
          >
            {/* Icône checkmark animée */}
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-success), var(--accent-success))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 12px 32px rgba(122,143,106,0.3)', animation: 'checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.15s both' }}>
              <CheckCircle size={38} color="#FFF" />
            </div>
            <h2 className="font-editorial-heading" style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: '600', color: 'var(--text-main)', lineHeight: 1.2 }}>
              {currentLang === 'FR' ? '🎉 Annonce publiée !' :
                currentLang === 'EN' ? '🎉 Ad published!' :
                  currentLang === 'ES' ? '🎉 ¡Anuncio publicado!' :
                    currentLang === 'IT' ? '🎉 Annuncio pubblicato!' :
                      currentLang === 'DE' ? '🎉 Anzeige veröffentlicht!' :
                        currentLang === 'JA' ? '🎉 広告を公開しました！' :
                          '🎉 广告已发布！'}
            </h2>
            <p style={{ margin: '0 0 6px', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {currentLang === 'FR' ? 'Votre annonce est maintenant visible dans le flux, sur la carte et dans les résultats de recherche.' :
                currentLang === 'EN' ? 'Your ad is now visible in the feed, on the map and in search results.' :
                  currentLang === 'ES' ? 'Tu anuncio ahora es visible en el feed, en el mapa y en los resultados de búsqueda.' :
                    currentLang === 'IT' ? 'Il tuo annuncio è ora visibile nel feed, sulla mappa e nei risultati di recherche.' :
                      currentLang === 'DE' ? 'Ihre Anzeige ist jetzt im Feed, auf der Karte und in den Suchergebnissen sichtbar.' :
                        currentLang === 'JA' ? '広告はフィード、マップ、検索結果に表示されるようになりました。' :
                          '您的广告现在可以在动态、地图和搜索结果中看到。'}
            </p>
            <p style={{ margin: '0 0 24px', fontSize: '13px', fontWeight: '700', color: 'var(--accent-primary)' }}>« {publishedListing.title} »</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowPublishedPopup(false);
                  setSelectedListing(publishedListing);
                  setActiveTab('feed');
                }}
                className="premium-button"
                style={{ width: '100%', border: 'none', borderRadius: '16px', padding: '14px', background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)', color: '#FFF', fontWeight: '800', fontSize: '15px', cursor: 'pointer', boxShadow: 'var(--shadow-accent)' }}
              >
                {currentLang === 'FR' ? 'Voir mon annonce →' :
                  currentLang === 'EN' ? 'View my listing →' :
                    currentLang === 'ES' ? 'Ver mi anuncio →' :
                      currentLang === 'IT' ? 'Vedi il mio annuncio →' :
                        currentLang === 'DE' ? 'Meine Anzeige anzeigen →' :
                          currentLang === 'JA' ? '広告を見る →' : '查看我的广告 →'}
              </button>
              <button
                onClick={() => {
                  setShowPublishedPopup(false);
                  setActiveTab('post');
                  setPostStep(1);
                  setPostDraft(defaultPostDraft);
                }}
                style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '13px', background: 'transparent', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
              >
                {currentLang === 'FR' ? '+ Déposer une autre annonce' :
                  currentLang === 'EN' ? '+ Post another listing' :
                    currentLang === 'ES' ? '+ Publicar otro anuncio' :
                      currentLang === 'IT' ? '+ Pubblica un altro annuncio' :
                        currentLang === 'DE' ? '+ Eine weitere Anzeige aufgeben' :
                          currentLang === 'JA' ? '+ 別の広告を投稿' : '+ 发布另一条广告'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- MODALE D'ACTION TACTILE SUR ANNONCE MOBILE ---- */}
      {mobileListingActionTarget && (
        <div
          onClick={() => setMobileListingActionTarget(null)}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(61, 53, 48, 0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0', zIndex: 4000,
            animation: 'fadeSlideUp 0.25s ease both'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: darkMode ? '#231E1B' : '#FAF7F2',
              borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '500px',
              padding: '20px 20px 32px', boxShadow: '0 -10px 40px rgba(61,53,48,0.25)',
              border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
              position: 'relative', display: 'flex', flexDirection: 'column', gap: '14px'
            }}
          >
            {/* Barre de drag */}
            <div style={{ width: '40px', height: '4px', borderRadius: '999px', backgroundColor: darkMode ? 'rgba(232,221,211,0.2)' : '#D4C5B5', margin: '0 auto 6px' }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <img src={mobileListingActionTarget.image} alt={mobileListingActionTarget.title} style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover' }} />
                <div style={{ minWidth: 0 }}>
                  <div className="font-editorial-heading" style={{ fontWeight: '600', fontSize: '16px', color: darkMode ? '#FAF7F2' : '#3D3530', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {mobileListingActionTarget.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#C67D5B', fontWeight: '700' }}>
                    {mobileListingActionTarget.compensation} • {mobileListingActionTarget.status === 'paused' ? 'En pause' : 'Active'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setMobileListingActionTarget(null)}
                style={{ border: 'none', backgroundColor: darkMode ? 'rgba(232,221,211,0.1)' : '#F5EAE4', color: darkMode ? '#FAF7F2' : '#3D3530', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              {/* MODIFIER */}
              <button
                onClick={() => {
                  const target = mobileListingActionTarget;
                  setMobileListingActionTarget(null);
                  handleStartEditListing(target);
                }}
                className="premium-button"
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                  borderRadius: '16px', border: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3',
                  backgroundColor: darkMode ? '#1A1715' : '#FFF', color: darkMode ? '#FAF7F2' : '#3D3530',
                  fontSize: '14px', fontWeight: '700', cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: '18px' }}>✏️</span>
                <span>Modifier l'annonce</span>
              </button>

              <button
                onClick={() => {
                  const target = mobileListingActionTarget;
                  setMobileListingActionTarget(null);
                  handleBoostListing(target);
                }}
                className="premium-button"
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                  borderRadius: '16px', border: '1px solid #E8DDD3',
                  backgroundColor: darkMode ? 'rgba(217,119,6,0.15)' : '#FEF3C7', color: '#D97706',
                  fontSize: '14px', fontWeight: '800', cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: '18px' }}>🔥</span>
                <span>Booster l'annonce (Top visibilité)</span>
              </button>

              <button
                onClick={() => {
                  const targetId = mobileListingActionTarget.id;
                  handleTogglePauseListing(targetId);
                  setMobileListingActionTarget(null);
                }}
                className="premium-button"
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                  borderRadius: '16px', border: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3',
                  backgroundColor: darkMode ? '#1A1715' : '#FFF', color: darkMode ? '#FAF7F2' : '#3D3530',
                  fontSize: '14px', fontWeight: '700', cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: '18px' }}>{mobileListingActionTarget.status === 'paused' ? '▶️' : '⏸️'}</span>
                <span>{mobileListingActionTarget.status === 'paused' ? 'Réactiver l\'annonce' : 'Mettre en pause'}</span>
              </button>

              <button
                onClick={() => {
                  const targetId = mobileListingActionTarget.id;
                  handleDeleteListing(targetId);
                }}
                className="premium-button"
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                  borderRadius: '16px', border: '1px solid rgba(239,68,68,0.3)',
                  backgroundColor: darkMode ? 'rgba(239,68,68,0.15)' : '#FEF2F2', color: '#EF4444',
                  fontSize: '14px', fontWeight: '800', cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: '18px' }}>🗑️</span>
                <span>Supprimer définitivement l'annonce</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isLangModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(61, 53, 48, 0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 3500 }}>
          <div style={{ backgroundColor: darkMode ? '#231E1B' : '#FAF7F2', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: '24px', width: '100%', maxWidth: '400px', padding: '24px', boxShadow: '0 24px 60px rgba(61,53,48,0.25)', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', position: 'relative' }}>
            <button onClick={() => setIsLangModalOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', backgroundColor: darkMode ? 'rgba(232,221,211,0.1)' : '#F5EAE4', color: darkMode ? '#FAF7F2' : '#3D3530', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={16} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Globe size={20} color="#C67D5B" />
              <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530' }}>{t('selectLanguage')}</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { code: 'FR', label: 'Français', flag: '🇫🇷' },
                { code: 'EN', label: 'English', flag: '🇬🇧' },
                { code: 'ES', label: 'Español', flag: '🇪🇸' },
                { code: 'IT', label: 'Italiano', flag: '🇮🇹' },
                { code: 'DE', label: 'Deutsch', flag: '🇩🇪' },
                { code: 'JA', label: '日本語', flag: '🇯🇵' },
                { code: 'ZH', label: '中文', flag: '🇨🇳' },
              ].map(lang => (
                <button
                  key={lang.code}
                  onClick={() => { setCurrentLang(lang.code); setIsLangModalOpen(false); }}
                  className="premium-button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    border: currentLang === lang.code ? '1.5px solid #C67D5B' : (darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3'),
                    backgroundColor: currentLang === lang.code ? (darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4') : (darkMode ? '#1A1715' : '#FFF'),
                    color: darkMode ? '#FAF7F2' : '#3D3530',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>{lang.flag}</span> {lang.label}
                  </span>
                  {currentLang === lang.code && <Check size={18} color="#C67D5B" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---- OVERLAY WEBRTC APPELS (SONNERIE ENTRANTE & MODAL PLEIN ÉCRAN) ---- */}
      <Suspense fallback={null}>
        <WebRTCCallOverlay
          incomingCall={incomingCall}
          callState={callState}
          isCallPip={isCallPip}
          setIsCallPip={setIsCallPip}
          darkMode={darkMode}
          currentLang={currentLang}
          t={t}
          selectedChat={selectedChat}
          selectedListing={selectedListing}
          profile={profile}
          localStream={localStream}
          remoteStream={remoteStream}
          facingMode={facingMode}
          hasMultipleCameras={hasMultipleCameras}
          switchCamera={switchCamera}
          acceptIncomingCall={acceptIncomingCall}
          declineIncomingCall={declineIncomingCall}
          endCall={endCall}
          toggleMic={toggleMic}
          toggleCam={toggleCam}
          toggleScreenShare={toggleScreenShare}
          hostMuteParticipant={hostMuteParticipant}
          hostStopParticipantScreenShare={hostStopParticipantScreenShare}
          copyInviteLink={copyInviteLink}
          attachLocalStream={attachLocalStream}
          attachRemoteStream={attachRemoteStream}
          handleAcceptIncomingCall={handleAcceptIncomingCall}
          callDuration={callDuration}
          formatCallTimer={formatCallTimer}
          setSettlementCallDuration={setSettlementCallDuration}
          setIsSettlementModalOpen={setIsSettlementModalOpen}
          getAuthorAvatar={getAuthorAvatar}
        />
      </Suspense>

      {/* ---- BULLE FLOTTANTE PIP (PICTURE-IN-PICTURE & DRAG-AND-DROP AVEC POINTER EVENTS) ---- */}
      <Suspense fallback={null}>
        <CallFeature
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
          selectedChat={selectedChat}
          callDuration={callDuration}
          formatCallTimer={formatCallTimer}
          remoteStream={remoteStream}
          localStream={localStream}
          facingMode={facingMode}
          attachRemoteStream={attachRemoteStream}
          attachLocalStream={attachLocalStream}
          hasMultipleCameras={hasMultipleCameras}
          switchCamera={switchCamera}
          toggleMic={toggleMic}
          endCall={endCall}
          currentLang={currentLang}
        />
      </Suspense>

      {/* PANEL ADMINISTRATEUR "GOD MODE" TEMPS RÉEL (/admin) */}
      {isAdminPanelOpen && (
        <Suspense fallback={null}>
          <AdminDashboard
            isOpen={isAdminPanelOpen}
            onClose={() => setIsAdminPanelOpen(false)}
            darkMode={darkMode}
            currentUser={profile}
            onInspectUser={(u) => {
              setIsAdminPanelOpen(false);
              setSelectedPublicUser(u);
            }}
          />
        </Suspense>
      )}

      {/* MODALE DU PROFIL PUBLIC COMPLET */}
      {selectedPublicUser && (
        <Suspense fallback={<SkeletonModalFallback title="Chargement du profil..." />}>
          <PublicProfileModal
            isOpen={Boolean(selectedPublicUser)}
            onClose={() => setSelectedPublicUser(null)}
            targetUser={selectedPublicUser}
            allListings={listings}
            onOpenListing={handleOpenListing}
            onStartDiscussion={handleStartDiscussion}
            currentLang={currentLang}
            darkMode={darkMode}
            t={t}
          />
        </Suspense>
      )}

      {/* MODALE DE SIGNALEMENT COMMUNAUTAIRE */}
      {isReportModalOpen && (
        <Suspense fallback={<SkeletonModalFallback title="Chargement du formulaire de signalement..." />}>
          <ReportModal
            isOpen={isReportModalOpen}
            onClose={() => {
              setIsReportModalOpen(false);
              setReportTarget({ listing: null, user: null });
            }}
            targetListing={reportTarget.listing}
            targetUser={reportTarget.user}
            currentUser={profile}
            darkMode={darkMode}
          />
        </Suspense>
      )}

      {/* MODALE DE PROPOSITION DE DEAL & CONTRE-OFFRE */}
      {isCounterOfferOpen && (
        <Suspense fallback={<SkeletonModalFallback title="Chargement de la négociation de deal..." />}>
          <CounterOfferModal
            isOpen={isCounterOfferOpen}
            onClose={() => {
              setIsCounterOfferOpen(false);
              setEditingDealId(null);
            }}
            onSubmit={handleCounterOfferSubmit}
            initialTerms={editingDealId ? (chatThreads[selectedChat?.id] || []).find(m => String(m.id) === String(editingDealId))?.terms : counterOfferDraft}
            isEditing={Boolean(editingDealId)}
            partnerName={selectedChat?.user || 'Interlocuteur'}
            listingTitle={selectedChat?.listing || ''}
            darkMode={darkMode}
            t={t}
          />
        </Suspense>
      )}

      {/* PASSERELLE DE PAIEMENT & HISTORIQUE MODULAIRE (BLOC 5) */}
      <Suspense fallback={null}>
        <PaymentFeature
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
          profile={profile}
          darkMode={darkMode}
        />
      </Suspense>


      {/* PARCOURS D'ONBOARDING INTERACTIF POUR NOUVEAUX COMPTES (CHANTIER 1) */}
      {isOnboardingOpen && (
        <Suspense fallback={<SkeletonModalFallback title="Bienvenue sur Troco..." />}>
          <OnboardingWizardModal
            isOpen={isOnboardingOpen}
            darkMode={darkMode}
            currentUser={profile}
            onComplete={handleCompleteOnboarding}
          />
        </Suspense>
      )}

      {/* CÉLÉBRATION CADEAU DE BIENVENUE (+10 JETONS ET 0.00€ INITIALISÉ) */}
      {isWelcomeGiftModalOpen && (
        <Suspense fallback={<SkeletonModalFallback title="Cadeau de bienvenue..." />}>
          <WelcomeGiftCelebrationModal
            isOpen={isWelcomeGiftModalOpen}
            onClose={() => setIsWelcomeGiftModalOpen(false)}
            darkMode={darkMode}
            trocoTokens={10}
            euroBalance={0}
          />
        </Suspense>
      )}

      {/* BILAN DE SÉANCE VISIO & RÉTRIBUTION EN JETONS (CHANTIER 5) */}
      {isSettlementModalOpen && (
        <Suspense fallback={<SkeletonModalFallback title="Bilan d'appel..." />}>
          <VisioSettlementModal
            isOpen={isSettlementModalOpen}
            onClose={() => setIsSettlementModalOpen(false)}
            callDuration={settlementCallDuration || callDuration}
            partnerName={selectedChat?.user || 'Interlocuteur'}
            onTransferTokens={handleTransferCallTokens}
            darkMode={darkMode}
            currentUserTokens={profile?.trocoTokens ?? 10}
          />
        </Suspense>
      )}

      {/* MODULE DE VÉRIFICATION D'IDENTITÉ (KYC) */}
      {isKycModalOpen && (
        <Suspense fallback={<SkeletonModalFallback title="Vérification d'identité sécurisée..." />}>
          <KycModal
            isOpen={isKycModalOpen}
            onClose={() => setIsKycModalOpen(false)}
            onComplete={handleKycComplete}
            profile={profile}
            darkMode={darkMode}
          />
        </Suspense>
      )}

      {/* MODALE D'ACCEPTATION & CONSULTATION DES CGU (BLOC 6) */}
      {(isCguViewerOpen || (Boolean(profile?.name) && !profile?.cguAcceptedAt && profile?.onboardingCompleted)) && (
        <Suspense fallback={<SkeletonModalFallback title="Conditions Générales d'Utilisation..." />}>
          <CguModal
            isOpen={isCguViewerOpen || (Boolean(profile?.name) && !profile?.cguAcceptedAt && profile?.onboardingCompleted)}
            isMandatory={Boolean(profile?.name) && !profile?.cguAcceptedAt && profile?.onboardingCompleted}
            onClose={() => setIsCguViewerOpen(false)}
            onAccept={handleAcceptCgu}
            darkMode={darkMode}
            currentUser={profile}
          />
        </Suspense>
      )}

      {/* MODALE PROFIL PUBLIC POUR LA COMMUNAUTÉ ET LE CHAT */}
      {isCommunityProfileOpen && communityProfileUser && (
        <Suspense fallback={<SkeletonModalFallback title="Profil public..." />}>
          <PublicProfileModal
            isOpen={isCommunityProfileOpen}
            onClose={() => setIsCommunityProfileOpen(false)}
            targetUser={communityProfileUser}
            allListings={listings}
            onOpenListing={handleOpenListing}
            currentLang={currentLang}
            darkMode={darkMode}
            t={t}
          />
        </Suspense>
      )}

      {/* CENTRE DE CONFIDENTIALITÉ & GESTION DES DROITS RGPD (BLOC 6) */}
      {isPrivacyCenterOpen && (
        <Suspense fallback={<SkeletonModalFallback title="Centre de confidentialité..." />}>
          <PrivacyCenterModal
            isOpen={isPrivacyCenterOpen}
            onClose={() => setIsPrivacyCenterOpen(false)}
            darkMode={darkMode}
            currentUser={profile}
            userListings={listings}
            userTransactions={userTransactions}
            onDeleteAccount={handleDeleteAccount}
          />
        </Suspense>
      )}

      {/* BANNIÈRE COOKIES & TRACEURS CONFORME CNIL / RGPD (BLOC 6) */}
      <CookieBanner
        darkMode={darkMode}
        onOpenPrivacyCenter={() => setIsPrivacyCenterOpen(true)}
      />

      {/* BANNIÈRE D'INSTALLATION PWA MOBILE 1-CLIC */}
      <PWAInstallBanner />

      {/* OVERLAY CÉLÉBRATION TOP-UP SOLDE & JETONS AU PREMIER PLAN */}
      {topUpCelebration && (
        <div
          style={{
            position: 'fixed',
            top: '85px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 999999,
            backgroundColor: 'var(--bg-card)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '2px solid var(--accent-success)',
            borderRadius: '999px',
            padding: '12px 24px',
            boxShadow: '0 12px 36px rgba(16, 185, 129, 0.4), 0 0 20px rgba(16, 185, 129, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'fadeSlideDown 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
            color: 'var(--text-main)',
          }}
        >
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-success)',
            color: '#FFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.5)',
            flexShrink: 0,
          }}>
            <Sparkles size={20} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '900', color: 'var(--accent-success)', letterSpacing: '-0.01em' }}>
              {topUpCelebration.title}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
              {topUpCelebration.subtitle}
            </div>
          </div>
        </div>
      )}

      {/* ÉCRAN D'EXCLUSION TOTAL EN CAS DE BANNISSEMENT TEMPS RÉEL */}
      {isUserBanned && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000000,
            backgroundColor: '#0F0D0B',
            color: '#FAF7F2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              width: '100%',
              backgroundColor: '#1C1714',
              border: '2px solid #EF4444',
              borderRadius: '28px',
              padding: '38px 32px',
              textAlign: 'center',
              boxShadow: '0 25px 60px rgba(239,68,68,0.25), 0 0 50px rgba(0,0,0,0.8)',
            }}
          >
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239,68,68,0.15)',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 8px 24px rgba(239,68,68,0.3)',
              }}
            >
              <ShieldAlert size={36} />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '900', margin: '0 0 10px', color: '#EF4444', letterSpacing: '-0.02em' }}>
              Compte Suspendu
            </h2>
            <p style={{ fontSize: '14px', color: '#D4C5B5', lineHeight: 1.55, margin: '0 0 20px' }}>
              {bannedReason || "Votre compte a été suspendu par l'administration Troco suite à un non-respect des règles de la communauté."}
            </p>
            <div
              style={{
                fontSize: '12px',
                color: '#A8998C',
                backgroundColor: 'rgba(0,0,0,0.3)',
                padding: '12px 16px',
                borderRadius: '12px',
                marginBottom: '24px',
                lineHeight: 1.4,
              }}
            >
              Pour toute réclamation, contactez la modération officielle à <strong>support@troco.fr</strong> avec votre identifiant.
            </div>
            <button
              type="button"
              onClick={() => {
                window.localStorage.clear();
                window.sessionStorage.clear();
                window.location.reload();
              }}
              className="premium-button"
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: '14px',
                border: 'none',
                backgroundColor: 'rgba(255,255,255,0.12)',
                color: '#FFF',
                fontSize: '13.5px',
                fontWeight: '800',
                cursor: 'pointer',
              }}
            >
              Fermer la session & Revenir à l'accueil
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
