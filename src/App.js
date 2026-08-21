import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Video, Star, Globe, Filter, MessageSquare, PlusCircle, User, ShieldCheck, Clock, CheckCircle, ArrowRight, X, Sparkles, Coins, Plus, Trash2, Camera, Pencil, Mic, PhoneOff, Flame, History, Check, Lock, CreditCard, Tag, Phone, UserPlus, ChevronLeft, ChevronRight, Maximize2, Minimize2, ZoomIn, ZoomOut, MicOff, VideoOff, Sun, Moon, Upload, Repeat, SwitchCamera, LogOut, Scale, ShieldAlert, FileText } from 'lucide-react';
import { auth, db } from './firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp, onSnapshot, query, orderBy, setDoc, deleteDoc, getDoc, getDocs, where } from 'firebase/firestore';
import { RecaptchaVerifier, signInWithPhoneNumber, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, GoogleAuthProvider, GithubAuthProvider, FacebookAuthProvider, OAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import ChatView from './components/ChatView';
import { useWebRTC } from './hooks/useWebRTC';
import AdminPanel from './components/AdminPanel';
import ReportModal from './components/ReportModal';
import PaymentModal from './components/PaymentModal';
import TransactionsHistoryModal from './components/TransactionsHistoryModal';
import CguModal from './components/CguModal';
import PrivacyCenterModal from './components/PrivacyCenterModal';
import CookieBanner from './components/CookieBanner';
import OnboardingWizardModal from './components/OnboardingWizardModal';
import { analyzeContent } from './utils/contentModeration';
import { validateListingContent, validateChatMessage } from './utils/moderationBlacklist';
import { DIVERSE_AVATARS } from './data/categoriesData';


// ---- SYNTHÉTISEURS SONORES WEB AUDIO API (100% EMBARQUÉS - ZERO FICHIER EXTERNE) ----
const playApplePaySound = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Double carillon cristallin style Apple Pay / iOS
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1046.50, ctx.currentTime); // Note C6
    gain1.gain.setValueAtTime(0.45, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2093.00, ctx.currentTime + 0.07); // Note C7
    gain2.gain.setValueAtTime(0.55, ctx.currentTime + 0.07);
    gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.07);
    osc2.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.warn('Web Audio Context désactivé ou non supporté', e);
  }
};

const playBetclicBalanceSound = (isIncrease = false) => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const freqs = isIncrease
      ? [523.25, 659.25, 783.99, 1046.50]
      : [1046.50, 880.00, 698.46, 523.25];
    freqs.forEach((freq, idx) => {
      const startTime = ctx.currentTime + (idx * 0.065);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.22, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.12);
    });
  } catch (e) {
    console.warn('Web Audio Context désactivé ou non supporté', e);
  }
};

// ---- COMPOSANT SOLDE ANIMÉ (ANIMATION ROULEAU STYLE BETCLIC & BADGE VOLANT) ----
const AnimatedEuroBalance = ({ value, style, prefix = '', suffix = ' €', showBadge = true }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [badgeInfo, setBadgeInfo] = useState(null); // { delta, id }
  const prevValueRef = useRef(value);

  useEffect(() => {
    const prev = prevValueRef.current;
    if (typeof value === 'number' && !isNaN(value) && prev !== value) {
      const diff = Number((value - prev).toFixed(2));
      setBadgeInfo({ delta: diff, id: prev + '_' + value }); // stable id per transition
      playBetclicBalanceSound(diff > 0);

      const startTime = performance.now();
      const duration = 900;
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Number((prev + diff * ease).toFixed(2)));
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDisplayValue(value);
          setTimeout(() => setBadgeInfo(null), 1900);
        }
      };
      requestAnimationFrame(animate);
      prevValueRef.current = value;
    } else {
      setDisplayValue(value);
    }
  }, [value]);

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '3px', ...style }}>
      {prefix}{displayValue.toFixed(2)}{suffix}
      {showBadge && badgeInfo !== null && (
        <span
          key={badgeInfo.id}
          style={{
            position: 'absolute',
            top: '-22px',
            right: '-12px',
            backgroundColor: badgeInfo.delta > 0 ? '#10B981' : '#EF4444',
            color: '#FFFFFF',
            fontSize: '11px',
            fontWeight: '900',
            padding: '2px 8px',
            borderRadius: '999px',
            boxShadow: badgeInfo.delta > 0 ? '0 4px 14px rgba(16,185,129,0.4)' : '0 4px 14px rgba(239,68,68,0.4)',
            zIndex: 20,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            animation: 'betclicBadgeAnim 1.8s ease-out forwards',
          }}
        >
          {badgeInfo.delta > 0 ? `+${badgeInfo.delta.toFixed(2)} €` : `${badgeInfo.delta.toFixed(2)} €`}
        </span>
      )}
    </span>
  );
};

// ---- COMPOSANT SOLDE JETONS ANIMÉ ----
const AnimatedTokenBalance = ({ value, style, formatFn }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [badgeInfo, setBadgeInfo] = useState(null); // { delta, id }
  const prevValueRef = useRef(value);

  useEffect(() => {
    const prev = prevValueRef.current;
    if (typeof value === 'number' && !isNaN(value) && prev !== value) {
      const diff = value - prev;
      setBadgeInfo({ delta: diff, id: prev + '_' + value });

      const startTime = performance.now();
      const duration = 750;
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.round(prev + diff * ease));
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDisplayValue(value);
          setTimeout(() => setBadgeInfo(null), 2000);
        }
      };
      requestAnimationFrame(animate);
      prevValueRef.current = value;
    } else {
      setDisplayValue(value);
    }
  }, [value]);

  const formatted = formatFn ? formatFn(displayValue) : `${displayValue} Jetons`;

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', ...style }}>
      {formatted}
      {badgeInfo !== null && badgeInfo.delta !== 0 && (
        <span
          key={badgeInfo.id}
          style={{
            position: 'absolute',
            top: '-22px',
            right: '-12px',
            backgroundColor: badgeInfo.delta > 0 ? '#10B981' : '#EF4444',
            color: '#FFFFFF',
            fontSize: '11px',
            fontWeight: '900',
            padding: '2px 8px',
            borderRadius: '999px',
            boxShadow: badgeInfo.delta > 0 ? '0 4px 14px rgba(16,185,129,0.5)' : '0 4px 14px rgba(239,68,68,0.4)',
            zIndex: 20,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            animation: 'betclicBadgeAnim 2s ease-out forwards',
          }}
        >
          {badgeInfo.delta > 0 ? `+${badgeInfo.delta} Jeton${badgeInfo.delta > 1 ? 's' : ''}` : `${badgeInfo.delta} Jeton${Math.abs(badgeInfo.delta) > 1 ? 's' : ''}`}
        </span>
      )}
    </span>
  );
};

// ---- DICTIONNAIRE I18N COMPLET A 100% (7 LANGUES) ----
const translations = {
  FR: {

    deleteAd: "Supprimer",
    pauseAd: "Mettre en pause",
    resumeAd: "Reprendre l'annonce",
    editAdBtn: "Modifier",
    editCostsMoneyTitle: "Modification Payante",
    editCostsMoneyText: "Toute modification du texte ou ajout de plus de 4 photos requiert un paiement de 1,99€.",
    addPhoto: "Ajouter une photo factice",
    confirmDeleteTitle: "Supprimer l'annonce ?",
    confirmDeleteText: "Es-tu sûr de vouloir supprimer cette annonce ?",
    cancelBtn: "Annuler",
    confirmBtn: "Confirmer",

    uploadProfilePhoto: "📁 Importer une photo depuis mon appareil",
    viewListingButton: "Voir l'annonce",
    boostButtonLabel: "🔥 Booster",
    editButtonLabel: "✏️ Modifier",
    filtersTitle: "Filtres avancés",
    addButton: "Ajouter",
    categoryPlaceholder: "Ex : Événements, Transport...",
    buyAction: "Acheter",
    tokenPackSub: "1 Jeton Troco = 12€ • À utiliser pour des services, du temps ou des échanges premium.",
    pack5Tokens: "Pack 5 Jetons",
    pack1Token: "Pack 1 Jeton",
    rechargeAction: "Recharger",
    customAmount: "Montant personnalisé",
    walletNotice: "Les deux soldes sont mis à jour instantanément après chaque transaction sécurisée.",
    manageWalletSub: "Gère ton solde Euro et tes Jetons Troco",
    langModalSub: "L'interface et les annonces seront instantanément traduites dans la langue choisie.",
    cancelButton: "Annuler",
    sendCounterOffer: "Envoyer la contre-proposition",
    counterOfferSub: "Ajuste les termes du deal — Montant en euros, Jetons Troco et conditions d'échange.",
    counterOfferTitle: "Faire une contre-proposition",
    doneButton: "Terminé",
    encryptedPayment: "Paiement chiffré de bout en bout",
    transactionSuccess: "Transaction sécurisée validée avec succès",
    secureBankConnection: "Connexion sécurisée au réseau bancaire",
    transactionProcessing: "Transaction en cours...",
    payAction: "Payer",
    sepaNotice: "💡 Recharge depuis ton solde Troco ou par virement SEPA. Tes jetons seront convertis automatiquement si le solde est insuffisant.",
    amountToPay: "Montant à payer",
    securePaymentHeader: "PAIEMENT SÉCURISÉ",
    all: "Tous",
    slogan: "Liberté d'Échange & Entraide",
    explorer: "Explorer",
    messages: "Messages",
    post: "Déposer",
    profile: "Profil",
    searchPlaceholder: "Rechercher un service, un matériel, une compétence...",
    allCategories: "Toutes catégories",
    allFormats: "Tous formats",
    remote: "💻 À distance (Visio)",
    onsite: "📍 Sur place (Présentiel)",
    bothFormats: "🌐 Présentiel & Visio",
    viewList: "Vue Liste",
    viewMap: "Vue Carte",
    filterTitle: "Filtres avancés",
    searchRadius: "Rayon de recherche",
    infiniteWorld: "♾️ Infini (Monde & Visio)",
    infinite: "Infini",
    useMyLocation: "📍 Utiliser ma position actuelle",
    geolocating: "Géolocalisation...",
    geolocatedSuccess: "Géolocalisé !",
    geolocatedError: "Position par défaut utilisée.",
    availableListings: "annonces disponibles dans",
    totalInfinite: "annonces au total (Mode Infini & Visio)",
    negotiationsTitle: "Négociations & Chats",
    validateDeal: "Valider le Deal",
    counterOffer: "Faire une contre-proposition",
    dealConditions: "🤝 Conditions du Troco-Deal en cours :",
    selectChatPrompt: "Sélectionne une conversation pour voir les conditions.",
    payWithTokens: "Payer en Jetons Troco",
    payWithEuros: "Payer en Euros (€)",
    payHybrid: "Payer en Formule Hybride",
    postTitle: "Publier une annonce de A à Z",
    publishButton: "Publier mon annonce sur Troco",
    proposeDealButton: "Proposer un Deal",
    startDiscussion: "Démarrer la discussion",
    sponsored: "🔥 Sponsorisé",
    urgent: "URGENTE",
    verifiedOffer: "Offre certifiée",
    credits: "Jetons",
    tokens: "Jetons",
    euroBalance: "Solde Euros",
    selectLanguage: "Choisir la langue d'affichage",
    close: "Fermer",
    showOriginal: "🌐 Voir l'original",
    showTranslation: "🌐 Voir la traduction",
    translatedByTroco: "Traduit automatiquement",
    noListingsFound: "Aucune annonce ne correspond à vos filtres.",
    resetFilters: "Réinitialiser tous les filtres",
    catSkills: "Cours & Compétences",
    catTools: "Prêt de Matériel",
    catServices: "Services & Dépannage",
    catHousing: "Logement & Stay Swap",
    newCategory: "+ Nouvelle catégorie",
    addCategory: "Ajouter une catégorie",
    categoryName: "Nom de la catégorie",
    authorAnnc: "C'est votre annonce",
    compensation: "Compensation",
    availability: "Disponibilité",
    caution: "Caution",
    demoVideo: "Démo Vidéo",
    livePlayback: "Lecture en direct",
    photos: "Photos",
    rechargeCash: "Recharger en Cash",
    buyTokens: "Acheter des Jetons",
    editProfile: "Éditer le profil",
    saveProfile: "Enregistrer",
    myListings: "Mes Annonces Publiées",
    swapHistory: "Historique des Swaps & Deals",
    wallet: "Mon porte-monnaie",
    socialNetworks: "Réseaux sociaux",
    portfolio: "Portfolio",
    reviews: "Avis détaillés",
    detailCaution: "Caution requise",
    noCaution: "Aucune caution",
    exchange: "Échange",
    writeToInterlocutor: "Écris à l'interlocuteur...",
    typeYourMessage: "Écris ton message...",
    send: "Envoyer",
    fullscreen: "Plein écran",
    reduce: "Réduire",
    call: "Appel",
    videoCall: "Visio",
    newDiscussion: "Nouvelle discussion",
    negotiationInProgress: "Négociation en cours",
    dealValidated: "Deal Validé",
    toConfirm: "À confirmer",
    verifiedProfile: "Profil vérifié",
    closed: "Clôturé",
    inProgress: "En cours",
    planned: "Planifié",
    discussions: "Discussions",
    myDealProposal: "Ma proposition de Deal",
    receivedDealProposal: "Proposition de Deal reçue",
    waitingYourResponse: "En attente de ta réponse",
    waitingResponse: "En attente de réponse",
    dealValidatedConfirmed: "Deal Validé & Confirmé",
    declined: "Refusé",
    acceptValidateDeal: "Accepter & Valider le Deal",
    decline: "Refuser",
    waitingInterlocutorResponse: "En attente de la réponse de l'interlocuteur...",
    dealConfirmedLocked: "Deal confirmé et verrouillé avec succès.",
    counterOffer: "Contre-proposition",
    directSwap: "Troc direct",
    spokenLanguages: "Langues parlées",
    manageWallet: "Gérer mon portefeuille",
    trocoTokensLabel: "Jetons Troco",
    tokenRateNotice: "1 Jeton ≈ 10€ / 1h",
    skillsCV: "CV Compétences",
    servicesExpertise: "Services & Expertise",
    availableEquipment: "Matériel disponible",
    loansTools: "Prêts / Outils",
    inTotal: "au total",
    swapHistorySub: "Toutes vos transactions passées et en cours avec statut et avis détaillés.",
    closedDeals: "Deals clôturés",
    averageRating: "Note moyenne",
    inProgressPlanned: "En cours / Planifié",
    guidedPath: "Parcours guidé",
    chooseAdTypePrompt: "Choisis le type d'annonce que tu souhaites publier.",
    iOfferService: "Je propose un service ou du matériel",
    iOfferServiceSub: "Ex: cours, réparations, prêt d'outils, ateliers.",
    iRequestService: "Je recherche un service ou du matériel",
    iRequestServiceSub: "Ex: besoin d'un outil, d'un cours ou d'un dépannage rapide.",
    adTitleLabel: "Titre",
    adTitlePlaceholder: "Ex : Prêt d’une échelle ou cours d’anglais",
    adCategoryLabel: "Catégorie",
    adFormatLabel: "Format",
    adDescriptionLabel: "Description",
    adDescriptionPlaceholder: "Explique ce que tu proposes, les limites, les conditions et ce qui est important pour l’autre personne",
    adMediaTitle: "Médias de l'annonce (Photos & Vidéo courte)",
    autoGenerateVisuals: "✨ Générer les visuels automatiquement",
    adMediaDesc: "Troco garantit un maximum de visibilité. Ajoute tes médias ou laisse l'IA choisir une belle photo HD et une vidéo de démo en boucle.",
    mainPhotoLabel: "📸 Photo principale",
    photoUrlPlaceholder: "URL de la photo (ex: https://...)",
    importPhoto: "Importer une photo",
    miniVideoLabel: "🎥 Vidéo de présentation courte (.mp4)",
    videoUrlPlaceholder: "URL de la vidéo MP4 (ex: https://...)",
    importVideo: "Importer une vidéo",
    autoGeneratedTags: "Tags auto-générés :",
    retributionModeLabel: "Mode de rétribution",
    timeCreditOption: "Jeton temps",
    euroPaymentOption: "Paiement en euros",
    directSwapOption: "Troc direct",
    hybridOption: "Hybride",
    expectedAmountLabel: "Montant attendu (€)",
    trocoTokensAmountLabel: "Nombre de Jetons Troco",
    locationZoneLabel: "Lieu ou zone",
    availabilityLabel: "Disponibilité",
    requireCautionLabel: "Exiger une caution virtuelle ?",
    cautionAmountLabel: "Montant de la caution (€)",
    setUrgentLabel: "Marquer l'annonce comme Urgente ?",
    urgentBadgeDesc: "Badge URGENT ultra-visible + affichage prioritaire dans le feed et les recherches.",
    previewLabel: "Prévisualisation",
    titleToBeDefined: "Titre à définir",
    addDescriptionConvincing: "Ajoute une description pour que l’annonce soit claire et convaincante.",
    compensationLabel: "Compensation :",
    priorityNotice: "Affiche en priorité • 1,99€ sera débité",
    publishVisibilityNotice: "L'annonce sera visible dans le flux principal, sur la carte et dans les résultats de recherche.",
    backButton: "Retour",
    continueButton: "Continuer",
    publishAdButton: "Publier l’annonce",
  },
  EN: {

    deleteAd: "Delete",
    pauseAd: "Pause",
    resumeAd: "Resume ad",
    editAdBtn: "Edit",
    editCostsMoneyTitle: "Paid Modification",
    editCostsMoneyText: "Any text changes or adding more than 4 photos requires a 1.99€ fee.",
    addPhoto: "Add fake photo",
    confirmDeleteTitle: "Delete ad?",
    confirmDeleteText: "Are you sure you want to delete this ad?",
    cancelBtn: "Cancel",
    confirmBtn: "Confirm",

    uploadProfilePhoto: "📁 Upload photo from my device",
    viewListingButton: "View listing",
    boostButtonLabel: "🔥 Boost",
    editButtonLabel: "✏️ Edit",
    filtersTitle: "Advanced filters",
    addButton: "Add",
    categoryPlaceholder: "E.g., Events, Transport...",
    buyAction: "Buy",
    tokenPackSub: "1 Troco Token = €12 • Use for services, time, or premium swaps.",
    pack5Tokens: "5 Tokens Pack",
    pack1Token: "1 Token Pack",
    rechargeAction: "Top up",
    customAmount: "Custom amount",
    walletNotice: "Both balances update instantly after every secure transaction.",
    manageWalletSub: "Manage your Euro balance and Troco Tokens",
    langModalSub: "The interface and listings will be instantly translated into the selected language.",
    cancelButton: "Cancel",
    sendCounterOffer: "Send counter-offer",
    counterOfferSub: "Adjust deal terms — Euro amount, Troco Tokens, and exchange conditions.",
    counterOfferTitle: "Make a counter-offer",
    doneButton: "Done",
    encryptedPayment: "End-to-end encrypted payment",
    transactionSuccess: "Secure transaction successfully completed",
    secureBankConnection: "Secure connection to banking network",
    transactionProcessing: "Transaction processing...",
    payAction: "Pay",
    sepaNotice: "💡 Top up from your Troco balance or via SEPA transfer. Your tokens will be converted automatically if balance is insufficient.",
    amountToPay: "Amount to pay",
    securePaymentHeader: "SECURE PAYMENT",
    all: "All",
    slogan: "Freedom of Exchange & Mutual Aid",
    explorer: "Explore",
    messages: "Messages",
    post: "Post",
    profile: "Profile",
    searchPlaceholder: "Search for a service, equipment, skill...",
    allCategories: "All categories",
    allFormats: "All formats",
    remote: "💻 Remote (Video)",
    onsite: "📍 On-site (In-person)",
    bothFormats: "🌐 In-person & Remote",
    viewList: "List View",
    viewMap: "Map View",
    filterTitle: "Advanced Filters",
    searchRadius: "Search Radius",
    infiniteWorld: "♾️ Infinite (Worldwide & Remote)",
    infinite: "Infinite",
    useMyLocation: "📍 Use my current location",
    geolocating: "Geolocating...",
    geolocatedSuccess: "Geolocated!",
    geolocatedError: "Default position used.",
    availableListings: "available listings in",
    totalInfinite: "total listings (Infinite mode)",
    negotiationsTitle: "Negotiations & Chats",
    validateDeal: "Validate Deal",
    counterOffer: "Make a Counter-offer",
    dealConditions: "🤝 Active Troco-Deal terms:",
    selectChatPrompt: "Select a conversation to see the terms.",
    payWithTokens: "Pay in Troco Tokens",
    payWithEuros: "Pay in Euros (€)",
    payHybrid: "Pay in Hybrid Formula",
    postTitle: "Publish an ad from A to Z",
    publishButton: "Publish my ad on Troco",
    proposeDealButton: "Propose a Deal",
    startDiscussion: "Start discussion",
    sponsored: "🔥 Sponsored",
    urgent: "URGENT",
    verifiedOffer: "Verified Offer",
    credits: "Tokens",
    tokens: "Tokens",
    euroBalance: "Euro Balance",
    selectLanguage: "Choose Display Language",
    close: "Close",
    showOriginal: "🌐 Show original",
    showTranslation: "🌐 Show translation",
    translatedByTroco: "Automatically translated",
    noListingsFound: "No listings match your filters.",
    resetFilters: "Reset all filters",
    catSkills: "Lessons & Skills",
    catTools: "Equipment Loan",
    catServices: "Services & Repairs",
    catHousing: "Housing & Stay Swap",
    newCategory: "+ New category",
    addCategory: "Add category",
    categoryName: "Category name",
    authorAnnc: "This is your listing",
    compensation: "Compensation",
    availability: "Availability",
    caution: "Deposit",
    demoVideo: "Video Demo",
    livePlayback: "Live Playback",
    photos: "Photos",
    rechargeCash: "Top up Cash",
    buyTokens: "Buy Tokens",
    editProfile: "Edit profile",
    saveProfile: "Save",
    myListings: "My Published Ads",
    swapHistory: "Swaps & Deals History",
    wallet: "My Wallet",
    socialNetworks: "Social Networks",
    portfolio: "Portfolio",
    reviews: "Detailed Reviews",
    detailCaution: "Required Deposit",
    noCaution: "No deposit",
    exchange: "Exchange",
    writeToInterlocutor: "Type a message...",
    typeYourMessage: "Type your message...",
    send: "Send",
    fullscreen: "Fullscreen",
    reduce: "Reduce",
    call: "Call",
    videoCall: "Video",
    newDiscussion: "New discussion",
    negotiationInProgress: "Negotiation in progress",
    dealValidated: "Deal Validated",
    toConfirm: "To confirm",
    verifiedProfile: "Verified profile",
    closed: "Closed",
    inProgress: "In progress",
    planned: "Planned",
    discussions: "Discussions",
    myDealProposal: "My Deal Proposal",
    receivedDealProposal: "Deal Proposal Received",
    waitingYourResponse: "Awaiting your response",
    waitingResponse: "Awaiting response",
    dealValidatedConfirmed: "Deal Validated & Confirmed",
    declined: "Declined",
    acceptValidateDeal: "Accept & Validate Deal",
    decline: "Decline",
    waitingInterlocutorResponse: "Waiting for interlocutor's response...",
    dealConfirmedLocked: "Deal successfully confirmed and locked.",
    counterOffer: "Counter-offer",
    directSwap: "Direct Swap",
    spokenLanguages: "Spoken languages",
    manageWallet: "Manage my wallet",
    trocoTokensLabel: "Troco Tokens",
    tokenRateNotice: "1 Token ≈ €10 / 1h",
    skillsCV: "Skills Resume",
    servicesExpertise: "Services & Expertise",
    availableEquipment: "Available Equipment",
    loansTools: "Loans / Tools",
    inTotal: "in total",
    swapHistorySub: "All your past and ongoing transactions, with status and detailed reviews.",
    closedDeals: "Closed deals",
    averageRating: "Average rating",
    inProgressPlanned: "In progress / Planned",
    guidedPath: "Guided path",
    chooseAdTypePrompt: "Choose the type of ad you want to publish.",
    iOfferService: "I offer a service or equipment",
    iOfferServiceSub: "E.g.: lessons, repairs, tool loans, workshops.",
    iRequestService: "I am looking for a service or equipment",
    iRequestServiceSub: "E.g.: need a tool, a lesson, or quick troubleshooting.",
    adTitleLabel: "Title",
    adTitlePlaceholder: "E.g.: Ladder loan or English lessons",
    adCategoryLabel: "Category",
    adFormatLabel: "Format",
    adDescriptionLabel: "Description",
    adDescriptionPlaceholder: "Explain what you offer, limits, conditions, and key details for the other person",
    adMediaTitle: "Listing Media (Photos & Short Video)",
    autoGenerateVisuals: "✨ Auto-generate visuals",
    adMediaDesc: "Troco ensures maximum visibility. Add your media or let smart AI select an HD photo and looping demo video.",
    mainPhotoLabel: "📸 Main photo",
    photoUrlPlaceholder: "Photo URL (e.g. https://...)",
    importPhoto: "Upload a photo",
    miniVideoLabel: "🎥 Short Presentation Video (.mp4)",
    videoUrlPlaceholder: "MP4 Video URL (e.g. https://...)",
    importVideo: "Upload a video",
    autoGeneratedTags: "Auto-generated tags:",
    retributionModeLabel: "Reward mode",
    timeCreditOption: "Time token",
    euroPaymentOption: "Payment in Euros",
    directSwapOption: "Direct Swap",
    hybridOption: "Hybrid",
    expectedAmountLabel: "Expected amount (€)",
    trocoTokensAmountLabel: "Number of Troco Tokens",
    locationZoneLabel: "Location or area",
    availabilityLabel: "Availability",
    requireCautionLabel: "Require a virtual deposit?",
    cautionAmountLabel: "Deposit amount (€)",
    setUrgentLabel: "Mark ad as Urgent?",
    urgentBadgeDesc: "High-visibility URGENT badge + priority display in feed and search.",
    previewLabel: "Preview",
    titleToBeDefined: "Title to be set",
    addDescriptionConvincing: "Add a description to make your ad clear and compelling.",
    compensationLabel: "Compensation:",
    priorityNotice: "Priority display • €1.99 will be charged",
    publishVisibilityNotice: "Your listing will be visible in the main feed, on the map, and in search results.",
    backButton: "Back",
    continueButton: "Continue",
    publishAdButton: "Publish listing",
  },
  ES: {

    deleteAd: "Eliminar",
    pauseAd: "Pausar",
    resumeAd: "Reanudar anuncio",
    editAdBtn: "Editar",
    editCostsMoneyTitle: "Modificación de pago",
    editCostsMoneyText: "Cualquier cambio de texto o agregar más de 4 fotos requiere una tarifa de 1,99€.",
    addPhoto: "Añadir foto falsa",
    confirmDeleteTitle: "¿Eliminar anuncio?",
    confirmDeleteText: "¿Estás seguro de que quieres eliminar este anuncio?",
    cancelBtn: "Cancelar",
    confirmBtn: "Confirmar",

    uploadProfilePhoto: "📁 Subir foto desde mi dispositivo",
    viewListingButton: "Ver anuncio",
    boostButtonLabel: "🔥 Impulsar",
    editButtonLabel: "✏️ Editar",
    filtersTitle: "Filtros avanzados",
    addButton: "Añadir",
    categoryPlaceholder: "Ej.: Eventos, Transporte...",
    buyAction: "Comprar",
    tokenPackSub: "1 Ficha Troco = 12€ • Úsalo para servicios, tiempo o trueques premium.",
    pack5Tokens: "Paquete de 5 Fichas",
    pack1Token: "Paquete de 1 Ficha",
    rechargeAction: "Recargar",
    customAmount: "Monto personalizado",
    walletNotice: "Ambos saldos se actualizan al instante después de cada transacción segura.",
    manageWalletSub: "Gestiona tu saldo en Euros y tus Fichas Troco",
    langModalSub: "La interfaz y los anuncios se traducirán al instante al idioma seleccionado.",
    cancelButton: "Cancelar",
    sendCounterOffer: "Enviar contraoferta",
    counterOfferSub: "Ajusta los términos del trato — Monto en euros, Fichas Troco y condiciones de intercambio.",
    counterOfferTitle: "Hacer una contraoferta",
    doneButton: "Listo",
    encryptedPayment: "Pago encriptado de extremo a extremo",
    transactionSuccess: "Transacción segura completada con éxito",
    secureBankConnection: "Conexión segura con la red bancaria",
    transactionProcessing: "Procesando transacción...",
    payAction: "Pagar",
    sepaNotice: "💡 Recarga desde tu saldo Troco o mediante transferencia SEPA. Tus fichas se convertirán automáticamente si el saldo es insuficiente.",
    amountToPay: "Monto a pagar",
    securePaymentHeader: "PAGO SEGURO",
    all: "Todos",
    slogan: "Libertad de Intercambio y Ayuda Mutua",
    explorer: "Explorar",
    messages: "Mensajes",
    post: "Publicar",
    profile: "Perfil",
    searchPlaceholder: "Buscar un servicio, equipo, habilidad...",
    allCategories: "Todas las categorías",
    allFormats: "Todos los formatos",
    remote: "💻 En remoto (Visio)",
    onsite: "📍 Presencial",
    bothFormats: "🌐 Presencial y Remoto",
    viewList: "Vista Lista",
    viewMap: "Vista Mapa",
    filterTitle: "Filtros avanzados",
    searchRadius: "Radio de búsqueda",
    infiniteWorld: "♾️ Infinito (Mundo y Remoto)",
    infinite: "Infinito",
    useMyLocation: "📍 Usar mi ubicación actual",
    geolocating: "Geolocalizando...",
    geolocatedSuccess: "¡Ubicación obtenida!",
    geolocatedError: "Ubicación por defecto utilizada.",
    availableListings: "anuncios disponibles en",
    totalInfinite: "anuncios en total (Modo Infinito)",
    negotiationsTitle: "Negociaciones y Chats",
    validateDeal: "Validar el Trato",
    counterOffer: "Hacer una contraoferta",
    dealConditions: "🤝 Condiciones del Troco-Deal en curso:",
    selectChatPrompt: "Selecciona una conversación para ver las condiciones.",
    payWithTokens: "Pagar con Fichas Troco",
    payWithEuros: "Pagar en Euros (€)",
    payHybrid: "Pagar con Fórmula Híbrida",
    postTitle: "Publicar un anuncio",
    publishButton: "Publicar mi anuncio en Troco",
    proposeDealButton: "Proponer un Trato",
    startDiscussion: "Iniciar conversación",
    sponsored: "🔥 Patrocinado",
    urgent: "URGENTE",
    verifiedOffer: "Oferta verificada",
    credits: "Fichas",
    tokens: "Fichas",
    euroBalance: "Saldo Euros",
    selectLanguage: "Elegir idioma de interfaz",
    close: "Cerrar",
    showOriginal: "🌐 Ver original",
    showTranslation: "🌐 Ver traducción",
    translatedByTroco: "Traducido automáticamente",
    noListingsFound: "No hay anuncios que coincidan con tus filtros.",
    resetFilters: "Restablecer todos los filtros",
    catSkills: "Clases y Habilidades",
    catTools: "Préstamo de Equipo",
    catServices: "Servicios y Reparaciones",
    catHousing: "Alojamiento e Intercambio",
    newCategory: "+ Nueva categoría",
    addCategory: "Añadir categoría",
    categoryName: "Nombre de categoría",
    authorAnnc: "Es tu anuncio",
    compensation: "Compensación",
    availability: "Disponibilidad",
    caution: "Fianza",
    demoVideo: "Vídeo Demostración",
    livePlayback: "Reproducción en directo",
    photos: "Fotos",
    rechargeCash: "Recargar saldo",
    buyTokens: "Comprar Fichas",
    editProfile: "Editar perfil",
    saveProfile: "Guardar",
    myListings: "Mis Anuncios Publicados",
    swapHistory: "Historial de Tratos",
    wallet: "Mi Monedero",
    socialNetworks: "Redes Sociales",
    portfolio: "Portafolio",
    reviews: "Reseñas detalladas",
    detailCaution: "Depósito requerido",
    noCaution: "Sin depósito",
    exchange: "Intercambio",
    writeToInterlocutor: "Escribe a tu interlocutor...",
    typeYourMessage: "Escribe tu mensaje...",
    send: "Enviar",
    fullscreen: "Pantalla completa",
    reduce: "Reducir",
    call: "Llamar",
    videoCall: "Visio",
    newDiscussion: "Nueva conversación",
    negotiationInProgress: "Negociación en curso",
    dealValidated: "Trato Validado",
    toConfirm: "Por confirmar",
    verifiedProfile: "Perfil verificado",
    closed: "Cerrado",
    inProgress: "En curso",
    planned: "Planificado",
    discussions: "Conversaciones",
    myDealProposal: "Mi propuesta de Trato",
    receivedDealProposal: "Propuesta de Trato recibida",
    waitingYourResponse: "Esperando tu respuesta",
    waitingResponse: "Esperando respuesta",
    dealValidatedConfirmed: "Trato Validado y Confirmado",
    declined: "Rechazado",
    acceptValidateDeal: "Aceptar y Validar Trato",
    decline: "Rechazar",
    waitingInterlocutorResponse: "Esperando la respuesta de la otra persona...",
    dealConfirmedLocked: "Trato confirmado y bloqueado con éxito.",
    counterOffer: "Contraoferta",
    directSwap: "Trueque directo",
    spokenLanguages: "Idiomas hablados",
    manageWallet: "Gestionar mi monedero",
    trocoTokensLabel: "Fichas Troco",
    tokenRateNotice: "1 Ficha ≈ 10€ / 1h",
    skillsCV: "CV de Habilidades",
    servicesExpertise: "Servicios y Experiencia",
    availableEquipment: "Equipo disponible",
    loansTools: "Préstamos / Herramientas",
    inTotal: "en total",
    swapHistorySub: "Todas tus transacciones pasadas y en curso, con estado y reseñas detalladas.",
    closedDeals: "Tratos cerrados",
    averageRating: "Calificación media",
    inProgressPlanned: "En curso / Planificado",
    guidedPath: "Ruta guiada",
    chooseAdTypePrompt: "Elige el tipo de anuncio que deseas publicar.",
    iOfferService: "Ofrezco un servicio o equipo",
    iOfferServiceSub: "Ej.: clases, reparaciones, préstamo de herramientas, talleres.",
    iRequestService: "Busco un servicio o equipo",
    iRequestServiceSub: "Ej.: necesito una herramienta, una clase o reparación rápida.",
    adTitleLabel: "Título",
    adTitlePlaceholder: "Ej.: Préstamo de escalera o clases de inglés",
    adCategoryLabel: "Categoría",
    adFormatLabel: "Formato",
    adDescriptionLabel: "Descripción",
    adDescriptionPlaceholder: "Explica lo que ofreces, límites, condiciones y detalles clave para la otra persona",
    adMediaTitle: "Medios del anuncio (Fotos y Mini-Vídeo)",
    autoGenerateVisuals: "✨ Generar visuales auto",
    adMediaDesc: "Troco garantiza máxima visibilidad. Añade tus medios o deja que la IA seleccione foto HD y vídeo demo.",
    mainPhotoLabel: "📸 Foto principal",
    photoUrlPlaceholder: "URL de la foto (ej: https://...)",
    importPhoto: "Subir una foto",
    miniVideoLabel: "🎥 Mini-Vídeo de presentación (.mp4)",
    videoUrlPlaceholder: "URL del vídeo MP4 (ej: https://...)",
    importVideo: "Subir un vídeo",
    autoGeneratedTags: "Etiquetas generadas automáticamente:",
    retributionModeLabel: "Modo de compensación",
    timeCreditOption: "Ficha de tiempo",
    euroPaymentOption: "Pago en Euros",
    directSwapOption: "Trueque directo",
    hybridOption: "Híbrido",
    expectedAmountLabel: "Monto esperado (€)",
    trocoTokensAmountLabel: "Número de Fichas Troco",
    locationZoneLabel: "Ubicación o zona",
    availabilityLabel: "Disponibilidad",
    requireCautionLabel: "¿Exigir fianza virtual?",
    cautionAmountLabel: "Monto de la fianza (€)",
    setUrgentLabel: "¿Marcar anuncio como Urgente?",
    urgentBadgeDesc: "Insignia URGENTE visible + prioridad de visualización en feed y búsqueda.",
    previewLabel: "Vista previa",
    titleToBeDefined: "Título por definir",
    addDescriptionConvincing: "Añade una descripción para que el anuncio sea claro y convincente.",
    compensationLabel: "Compensación:",
    priorityNotice: "Muestra prioritaria • Se cobrarán 1,99€",
    publishVisibilityNotice: "El anuncio será visible en el feed principal, en el mapa y en los resultados de búsqueda.",
    backButton: "Volver",
    continueButton: "Continuar",
    publishAdButton: "Publicar anuncio",
  },
  IT: {

    deleteAd: "Elimina",
    pauseAd: "Pausa",
    resumeAd: "Riprendi annuncio",
    editAdBtn: "Modifica",
    editCostsMoneyTitle: "Modifica a pagamento",
    editCostsMoneyText: "Qualsiasi modifica al testo o l'aggiunta di più di 4 foto richiede una tariffa di 1,99€.",
    addPhoto: "Aggiungi foto finta",
    confirmDeleteTitle: "Eliminare l'annuncio?",
    confirmDeleteText: "Sei sicuro di voler eliminare questo annuncio?",
    cancelBtn: "Annulla",
    confirmBtn: "Conferma",

    uploadProfilePhoto: "📁 Carica foto dal mio dispositivo",
    viewListingButton: "Vedi annuncio",
    boostButtonLabel: "🔥 Promuovi",
    editButtonLabel: "✏️ Modifica",
    filtersTitle: "Filtri avanzati",
    addButton: "Aggiungi",
    categoryPlaceholder: "Es: Eventi, Trasporti...",
    buyAction: "Acquista",
    tokenPackSub: "1 Gettone Troco = 12€ • Da utilizzare per servizi, tempo o scambi premium.",
    pack5Tokens: "Pacchetto 5 Gettoni",
    pack1Token: "Pacchetto 1 Gettone",
    rechargeAction: "Ricarica",
    customAmount: "Importo personalizzato",
    walletNotice: "Entrambi i saldi si aggiornano istantaneamente dopo ogni transazione sicura.",
    manageWalletSub: "Gestisci il tuo saldo Euro e i tuoi Gettoni Troco",
    langModalSub: "L'interfaccia e gli annunci verranno istantaneamente tradotti nella lingua selezionata.",
    cancelButton: "Annulla",
    sendCounterOffer: "Invia controproposta",
    counterOfferSub: "Regola i termini dell'accordo — Importo in euro, Gettoni Troco e condizioni di scambio.",
    counterOfferTitle: "Fai una controproposta",
    doneButton: "Fatto",
    encryptedPayment: "Pagamento crittografato end-to-end",
    transactionSuccess: "Transazione sicura completata con successo",
    secureBankConnection: "Connessione sicura alla rete bancaria",
    transactionProcessing: "Transazione in corso...",
    payAction: "Paga",
    sepaNotice: "💡 Ricarica dal tuo saldo Troco o tramite bonifico SEPA. I tuoi gettoni verranno convertiti automaticamente se il saldo è insufficiente.",
    amountToPay: "Importo da pagare",
    securePaymentHeader: "PAGAMENTO SICURO",
    all: "Tutti",
    slogan: "Libertà di Scambio e Mutuo Aiuto",
    explorer: "Esplora",
    messages: "Messaggi",
    post: "Pubblica",
    profile: "Profilo",
    searchPlaceholder: "Cerca un servizio, un'attrezzatura, una competenza...",
    allCategories: "Tutte le categorie",
    allFormats: "Tutti i formati",
    remote: "💻 A distanza (Video)",
    onsite: "📍 In presenza",
    bothFormats: "🌐 In presenza & Video",
    viewList: "Vista Elenco",
    viewMap: "Vista Mappa",
    filterTitle: "Filtri avanzati",
    searchRadius: "Raggio di ricerca",
    infiniteWorld: "♾️ Infinito (Mondo e Video)",
    infinite: "Infinito",
    useMyLocation: "📍 Usa la mia posizione attuale",
    geolocating: "Localizzazione in corso...",
    geolocatedSuccess: "Posizione rilevata!",
    geolocatedError: "Posizione predefinita utilizzata.",
    availableListings: "annunci disponibili in",
    totalInfinite: "annunci totali (Modalità Infinita)",
    negotiationsTitle: "Negoziati e Chat",
    validateDeal: "Conferma l'Accordo",
    counterOffer: "Fai una controproposta",
    dealConditions: "🤝 Condizioni dell'Accordo Troco attivo:",
    selectChatPrompt: "Seleziona una conversazione per vedere le condizioni.",
    payWithTokens: "Paga in Gettoni Troco",
    payWithEuros: "Paga in Euro (€)",
    payHybrid: "Paga in Formula Ibrida",
    postTitle: "Pubblica un annuncio",
    publishButton: "Pubblica il mio annuncio su Troco",
    proposeDealButton: "Proponi un Accordo",
    startDiscussion: "Avvia conversazione",
    sponsored: "🔥 Sponsorizzato",
    urgent: "URGENTE",
    verifiedOffer: "Offerta verificata",
    credits: "Gettoni",
    tokens: "Gettoni",
    euroBalance: "Saldo Euro",
    selectLanguage: "Scegli lingua di visualizzazione",
    close: "Chiudi",
    showOriginal: "🌐 Mostra originale",
    showTranslation: "🌐 Mostra traduzione",
    translatedByTroco: "Tradotto automaticamente",
    noListingsFound: "Nessun annuncio corrisponde ai tuoi filtri.",
    resetFilters: "Ripristina tutti i filtri",
    catSkills: "Lezioni e Competenze",
    catTools: "Noleggio Attrezzature",
    catServices: "Servizi e Riparazioni",
    catHousing: "Alloggio e Scambio",
    newCategory: "+ Nuova categoria",
    addCategory: "Aggiungi categoria",
    categoryName: "Nome categoria",
    authorAnnc: "Questo è il tuo annuncio",
    compensation: "Compensazione",
    availability: "Disponibilità",
    caution: "Deposito",
    demoVideo: "Video Demo",
    livePlayback: "Riproduzione in diretta",
    photos: "Foto",
    rechargeCash: "Ricarica Euro",
    buyTokens: "Acquista Gettoni",
    editProfile: "Modifica profilo",
    saveProfile: "Salva",
    myListings: "I Miei Annunci",
    swapHistory: "Cronologia Scambi & Accordi",
    wallet: "Il Mio Portafoglio",
    socialNetworks: "Social Network",
    portfolio: "Portfolio",
    reviews: "Recensioni dettagliate",
    detailCaution: "Deposito richiesto",
    noCaution: "Nessun deposito",
    exchange: "Scambio",
    writeToInterlocutor: "Scrivi all'interlocutore...",
    typeYourMessage: "Scrivi il tuo messaggio...",
    send: "Invia",
    fullscreen: "A schermo intero",
    reduce: "Riduci",
    call: "Chiamata",
    videoCall: "Videochiamata",
    newDiscussion: "Nuova conversazione",
    negotiationInProgress: "Negoziato in corso",
    dealValidated: "Accordo Confermato",
    toConfirm: "Da confermare",
    verifiedProfile: "Profilo verificato",
    closed: "Concluso",
    inProgress: "In corso",
    planned: "Pianificato",
    discussions: "Discussioni",
    myDealProposal: "La mia proposta di Deal",
    receivedDealProposal: "Proposta di Deal ricevuta",
    waitingYourResponse: "In attesa della tua risposta",
    waitingResponse: "In attesa di risposta",
    dealValidatedConfirmed: "Deal Convalidato e Confermato",
    declined: "Rifiutato",
    acceptValidateDeal: "Accetta e Convalida Deal",
    decline: "Rifiutare",
    waitingInterlocutorResponse: "In attesa della risposta dell'interlocutore...",
    dealConfirmedLocked: "Deal confermato e bloccato con successo.",
    counterOffer: "Controproposta",
    directSwap: "Baratto diretto",
    spokenLanguages: "Lingue parlate",
    manageWallet: "Gestisci il mio portafoglio",
    trocoTokensLabel: "Gettoni Troco",
    tokenRateNotice: "1 Gettone ≈ 10€ / 1h",
    skillsCV: "CV delle Competenze",
    servicesExpertise: "Servizi e Competenze",
    availableEquipment: "Attrezzatura disponibile",
    loansTools: "Prestiti / Utensili",
    inTotal: "in totale",
    swapHistorySub: "Tutte le tue transazioni passate e in corso, con stato e recensioni dettagliate.",
    closedDeals: "Accordi conclusi",
    averageRating: "Valutazione media",
    inProgressPlanned: "In corso / Pianificato",
    guidedPath: "Percorso guidato",
    chooseAdTypePrompt: "Scegli il tipo di annuncio che vuoi pubblicare.",
    iOfferService: "Offro un servizio o un'attrezzatura",
    iOfferServiceSub: "Es: lezioni, riparazioni, prestito attrezzi, workshop.",
    iRequestService: "Cerco un servizio o un'attrezzatura",
    iRequestServiceSub: "Es: bisogno di un attrezzo, di una lezione o di un intervento rapido.",
    adTitleLabel: "Titolo",
    adTitlePlaceholder: "Es: Prestito scala o lezioni di inglese",
    adCategoryLabel: "Categoria",
    adFormatLabel: "Formato",
    adDescriptionLabel: "Descrizione",
    adDescriptionPlaceholder: "Spiega cosa offri, limiti, condizioni e dettagli importanti per l'altra persona",
    adMediaTitle: "Media dell'annuncio (Foto e Short-Video)",
    autoGenerateVisuals: "✨ Genera elementi visivi auto",
    adMediaDesc: "Troco garantisce massima visibilità. Aggiungi i tuoi media o lascia che l'IA selezioni foto HD e video promozionale.",
    mainPhotoLabel: "📸 Foto principale",
    photoUrlPlaceholder: "URL della foto (es: https://...)",
    importPhoto: "Carica una foto",
    miniVideoLabel: "🎥 Short Video di presentazione (.mp4)",
    videoUrlPlaceholder: "URL del video MP4 (es: https://...)",
    importVideo: "Carica un video",
    autoGeneratedTags: "Tag generati automaticamente:",
    retributionModeLabel: "Modalità di compenso",
    timeCreditOption: "Gettone tempo",
    euroPaymentOption: "Pagamento in Euro",
    directSwapOption: "Baratto diretto",
    hybridOption: "Ibrido",
    expectedAmountLabel: "Importo previsto (€)",
    trocoTokensAmountLabel: "Numero di Gettoni Troco",
    locationZoneLabel: "Luogo o zona",
    availabilityLabel: "Disponibilità",
    requireCautionLabel: "Richiedere un deposito virtuale?",
    cautionAmountLabel: "Importo del deposito (€)",
    setUrgentLabel: "Segnare l'annuncio come Urgente?",
    urgentBadgeDesc: "Badge URGENTE ben visibile + priorità nel feed e nella ricerca.",
    previewLabel: "Anteprima",
    titleToBeDefined: "Titolo da definire",
    addDescriptionConvincing: "Aggiungi una descrizione per rendere l'annuncio chiaro e convincente.",
    compensationLabel: "Compenso:",
    priorityNotice: "Mostra in priorità • Verranno addebitati 1,99€",
    publishVisibilityNotice: "L'annuncio sarà visibile nel feed principale, sulla mappa e nei risultati di ricerca.",
    backButton: "Indietro",
    continueButton: "Continua",
    publishAdButton: "Pubblica annuncio",
  },
  DE: {

    deleteAd: "Löschen",
    pauseAd: "Pausieren",
    resumeAd: "Anzeige fortsetzen",
    editAdBtn: "Bearbeiten",
    editCostsMoneyTitle: "Kostenpflichtige Änderung",
    editCostsMoneyText: "Jede Textänderung oder das Hinzufügen von mehr als 4 Fotos erfordert eine Gebühr von 1,99€.",
    addPhoto: "Fake-Foto hinzufügen",
    confirmDeleteTitle: "Anzeige löschen?",
    confirmDeleteText: "Bist du sicher, dass du diese Anzeige löschen möchtest?",
    cancelBtn: "Abbrechen",
    confirmBtn: "Bestätigen",

    uploadProfilePhoto: "📁 Foto von meinem Gerät hochladen",
    viewListingButton: "Angebot ansehen",
    boostButtonLabel: "🔥 Boosten",
    editButtonLabel: "✏️ Bearbeiten",
    filtersTitle: "Erweiterte Filter",
    addButton: "Hinzufügen",
    categoryPlaceholder: "Z.B. Events, Transport...",
    buyAction: "Kaufen",
    tokenPackSub: "1 Troco Token = 12€ • Für Dienstleistungen, Zeit oder Premium-Tausche verwenden.",
    pack5Tokens: "5 Tokens Paket",
    pack1Token: "1 Token Paket",
    rechargeAction: "Aufladen",
    customAmount: "Individueller Betrag",
    walletNotice: "Beide Guthaben werden nach jeder sicheren Transaktion sofort aktualisiert.",
    manageWalletSub: "Verwalte dein Euro-Guthaben und deine Troco-Tokens",
    langModalSub: "Die Benutzeroberfläche und die Angebote werden sofort in die gewählte Sprache übersetzt.",
    cancelButton: "Abbrechen",
    sendCounterOffer: "Gegenangebot senden",
    counterOfferSub: "Deal-Bedingungen anpassen — Euro-Betrag, Troco-Tokens und Tauschbedingungen.",
    counterOfferTitle: "Gegenangebot machen",
    doneButton: "Fertig",
    encryptedPayment: "Ende-zu-Ende verschlüsselte Zahlung",
    transactionSuccess: "Sichere Transaktion erfolgreich abgeschlossen",
    secureBankConnection: "Sichere Verbindung zum Bankennetzwerk",
    transactionProcessing: "Transaktion wird verarbeitet...",
    payAction: "Bezahlen",
    sepaNotice: "💡 Über dein Troco-Guthaben oder per SEPA-Überweisung aufladen. Deine Tokens werden bei unzureichendem Guthaben automatisch umgerechnet.",
    amountToPay: "Zu zahlender Betrag",
    securePaymentHeader: "SICHERE ZAHLUNG",
    all: "Alle",
    slogan: "Freiheit des Tauschs & Gegenseitige Hilfe",
    explorer: "Entdecken",
    messages: "Nachrichten",
    post: "Inserieren",
    profile: "Profil",
    searchPlaceholder: "Nach Dienstleistung, Gerät oder Fähigkeit suchen...",
    allCategories: "Alle Kategorien",
    allFormats: "Alle Formate",
    remote: "💻 Online / Remote (Video)",
    onsite: "📍 Vor Ort (Präsenz)",
    bothFormats: "🌐 Präsenz & Remote",
    viewList: "Listenansicht",
    viewMap: "Kartenansicht",
    filterTitle: "Erweiterte Filter",
    searchRadius: "Suchradius",
    infiniteWorld: "♾️ Unendlich (Weltweit & Video)",
    infinite: "Unendlich",
    useMyLocation: "📍 Meinen aktuellen Standort nutzen",
    geolocating: "Standort wird ermittelt...",
    geolocatedSuccess: "Standort ermittelt!",
    geolocatedError: "Standardstandort verwendet.",
    availableListings: "Angebote verfügbar in",
    totalInfinite: "Angebote insgesamt (Unendlich-Modus)",
    negotiationsTitle: "Verhandlungen & Chats",
    validateDeal: "Deal bestätigen",
    counterOffer: "Gegenangebot machen",
    dealConditions: "🤝 Aktuelle Troco-Deal Bedingungen:",
    selectChatPrompt: "Wähle einen Chat aus, um die Bedingungen zu sehen.",
    payWithTokens: "Mit Troco-Tokens bezahlen",
    payWithEuros: "In Euro (€) bezahlen",
    payHybrid: "Hybrid bezahlen",
    postTitle: "Anzeige veröffentlichen",
    publishButton: "Anzeige auf Troco veröffentlichen",
    proposeDealButton: "Deal vorschlagen",
    startDiscussion: "Gespräch beginnen",
    sponsored: "🔥 Gesponsert",
    urgent: "DRINGEND",
    verifiedOffer: "Geprüftes Angebot",
    credits: "Tokens",
    tokens: "Tokens",
    euroBalance: "Euro-Guthaben",
    selectLanguage: "Sprache auswählen",
    close: "Schließen",
    showOriginal: "🌐 Original anzeigen",
    showTranslation: "🌐 Übersetzung anzeigen",
    translatedByTroco: "Automatisch übersetzt",
    noListingsFound: "Keine Angebote entsprechen Ihren Filtern.",
    resetFilters: "Alle Filter zurücksetzen",
    catSkills: "Kurse & Fähigkeiten",
    catTools: "Geräteverleih",
    catServices: "Dienstleistungen & Reparatur",
    catHousing: "Wohnen & Tausch",
    newCategory: "+ Neue Kategorie",
    addCategory: "Kategorie hinzufügen",
    categoryName: "Kategoriename",
    authorAnnc: "Das ist Ihre Anzeige",
    compensation: "Vergütung",
    availability: "Verfügbarkeit",
    caution: "Kaution",
    demoVideo: "Video-Demo",
    livePlayback: "Live-Wiedergabe",
    photos: "Fotos",
    rechargeCash: "Guthaben aufladen",
    buyTokens: "Tokens kaufen",
    editProfile: "Profil bearbeiten",
    saveProfile: "Speichern",
    myListings: "Meine Anzeigen",
    swapHistory: "Tausch- & Deal-Verlauf",
    wallet: "Mein Wallet",
    socialNetworks: "Soziale Netzwerke",
    portfolio: "Portfolio",
    reviews: "Detaillierte Bewertungen",
    detailCaution: "Kaution erforderlich",
    noCaution: "Keine Kaution",
    exchange: "Tausch",
    writeToInterlocutor: "Schreibe dem Gesprächspartner...",
    typeYourMessage: "Schreibe deine Nachricht...",
    send: "Senden",
    fullscreen: "Vollbild",
    reduce: "Verkleinern",
    call: "Anrufen",
    videoCall: "Videoanruf",
    newDiscussion: "Neue Diskussion",
    negotiationInProgress: "Verhandlung läuft",
    dealValidated: "Deal Bestätigt",
    toConfirm: "Zu bestätigen",
    verifiedProfile: "Verifiziertes Profil",
    closed: "Abgeschlossen",
    inProgress: "In Bearbeitung",
    planned: "Geplant",
    discussions: "Gespräche",
    myDealProposal: "Mein Deal-Vorschlag",
    receivedDealProposal: "Deal-Vorschlag erhalten",
    waitingYourResponse: "Wartet auf deine Antwort",
    waitingResponse: "Wartet auf Antwort",
    dealValidatedConfirmed: "Deal Bestätigt & Validiert",
    declined: "Abgelehnt",
    acceptValidateDeal: "Deal Akzeptieren & Bestätigen",
    decline: "Ablehnen",
    waitingInterlocutorResponse: "Warten auf Antwort des Gesprächspartners...",
    dealConfirmedLocked: "Deal erfolgreich bestätigt und gesperrt.",
    counterOffer: "Gegenangebot",
    directSwap: "Direkttausch",
    spokenLanguages: "Gesprochene Sprachen",
    manageWallet: "Mein Wallet verwalten",
    trocoTokensLabel: "Troco-Tokens",
    tokenRateNotice: "1 Token ≈ 10€ / 1 Std",
    skillsCV: "Fähigkeiten-CV",
    servicesExpertise: "Dienste & Expertise",
    availableEquipment: "Verfügbare Ausrüstung",
    loansTools: "Verleih / Werkzeuge",
    inTotal: "insgesamt",
    swapHistorySub: "Alle Ihre vergangenen und laufenden Transaktionen mit Status und detaillierten Bewertungen.",
    closedDeals: "Abgeschlossene Deals",
    averageRating: "Durchschnittliche Bewertung",
    inProgressPlanned: "In Bearbeitung / Geplant",
    guidedPath: "Geführter Ablauf",
    chooseAdTypePrompt: "Wählen Sie den Anzeigentyp aus, den Sie veröffentlichen möchten.",
    iOfferService: "Ich biete eine Dienstleistung oder Ausrüstung an",
    iOfferServiceSub: "Z.B.: Unterricht, Reparaturen, Werkzeugverleih, Workshops.",
    iRequestService: "Ich suche eine Dienstleistung oder Ausrüstung",
    iRequestServiceSub: "Z.B.: Benötige Werkzeug, Unterricht oder schnelle Hilfe.",
    adTitleLabel: "Titel",
    adTitlePlaceholder: "Z.B.: Leiterverleih oder Englischunterricht",
    adCategoryLabel: "Kategorie",
    adFormatLabel: "Format",
    adDescriptionLabel: "Beschreibung",
    adDescriptionPlaceholder: "Erklären Sie Ihr Angebot, Grenzen, Bedingungen und wichtige Details",
    adMediaTitle: "Medien der Anzeige (Fotos & Kurzvortrag-Video)",
    autoGenerateVisuals: "✨ Visuals automatisch generieren",
    adMediaDesc: "Troco garantiert maximale Sichtbarkeit. Fügen Sie Medien hinzu oder lassen Sie die KI HD-Fotos und Videos auswählen.",
    mainPhotoLabel: "📸 Hauptfoto",
    photoUrlPlaceholder: "Foto-URL (z.B. https://...)",
    importPhoto: "Foto hochladen",
    miniVideoLabel: "🎥 Präsentations-Kurzvideo (.mp4)",
    videoUrlPlaceholder: "MP4-Video-URL (z.B. https://...)",
    importVideo: "Video hochladen",
    autoGeneratedTags: "Automatisch generierte Tags:",
    retributionModeLabel: "Vergütungsart",
    timeCreditOption: "Zeit-Token",
    euroPaymentOption: "Zahlung in Euro",
    directSwapOption: "Direkttausch",
    hybridOption: "Hybrid",
    expectedAmountLabel: "Erwarteter Betrag (€)",
    trocoTokensAmountLabel: "Anzahl an Troco-Tokens",
    locationZoneLabel: "Ort oder Bereich",
    availabilityLabel: "Verfügbarkeit",
    requireCautionLabel: "Virtuelle Kaution verlangen?",
    cautionAmountLabel: "Kautionsbetrag (€)",
    setUrgentLabel: "Anzeige als Dringend markieren?",
    urgentBadgeDesc: "Gut sichtbares DRINGEND-Badge + Priorität im Feed und in der Suche.",
    previewLabel: "Vorschau",
    titleToBeDefined: "Titel ausstehend",
    addDescriptionConvincing: "Fügen Sie eine Beschreibung hinzu, um die Anzeige klar und überzeugend zu gestalten.",
    compensationLabel: "Vergütung:",
    priorityNotice: "Prioritätsanzeige • 1,99€ werden abgebucht",
    publishVisibilityNotice: "Ihre Anzeige wird im Haupt-Feed, auf der Karte und in den Suchergebnissen sichtbar sein.",
    backButton: "Zurück",
    continueButton: "Weiter",
    publishAdButton: "Anzeige veröffentlichen",
  },
  JA: {

    deleteAd: "削除",
    pauseAd: "一時停止",
    resumeAd: "広告を再開",
    editAdBtn: "編集",
    editCostsMoneyTitle: "有料変更",
    editCostsMoneyText: "テキストの変更または4枚以上の写真の追加には1.99ユーロの料金が必要です。",
    addPhoto: "偽の写真を追加",
    confirmDeleteTitle: "広告を削除しますか？",
    confirmDeleteText: "本当にこの広告を削除しますか？",
    cancelBtn: "キャンセル",
    confirmBtn: "確認",

    uploadProfilePhoto: "📁 デバイスから写真をアップロード",
    viewListingButton: "出品を見る",
    boostButtonLabel: "🔥 ブースト",
    editButtonLabel: "✏️ 編集",
    filtersTitle: "詳細フィルター",
    addButton: "追加",
    categoryPlaceholder: "例：イベント、交通...",
    buyAction: "購入する",
    tokenPackSub: "1 Trocoトークン ＝ 12€ • サービス、時間、プレミアム交換にご利用いただけます。",
    pack5Tokens: "5トークンパック",
    pack1Token: "1トークンパック",
    rechargeAction: "チャージする",
    customAmount: "カスタム金額",
    walletNotice: "取引完了後、両方の残高が即座に更新されます。",
    manageWalletSub: "ユーロ残高とTrocoトークンを管理",
    langModalSub: "UIと出品は選択した言語に即座に翻訳されます。",
    cancelButton: "キャンセル",
    sendCounterOffer: "カウンターオファーを送信",
    counterOfferSub: "条件を調整 — ユーロ金額、Trocoトークン数、交換条件。",
    counterOfferTitle: "カウンターオファーをする",
    doneButton: "完了",
    encryptedPayment: "エンドツーエンドで暗号化された決済",
    transactionSuccess: "安全な取引が正常に完了しました",
    secureBankConnection: "銀行ネットワークへの安全な接続",
    transactionProcessing: "取引処理中...",
    payAction: "支払う",
    sepaNotice: "💡 Troco残高またはSEPA送金からチャージできます。残高不足の場合はトークンが自動変換されます。",
    amountToPay: "お支払い金額",
    securePaymentHeader: "安全な決済",
    all: "すべて",
    slogan: "自由な交換と相互の助け合い",
    explorer: "探す",
    messages: "メッセージ",
    post: "出品する",
    profile: "プロフィール",
    searchPlaceholder: "スキル、ツール、サービスを検索...",
    allCategories: "すべてのカテゴリー",
    allFormats: "すべての形式",
    remote: "💻 リモート（ビデオ通話）",
    onsite: "📍 対面（現地）",
    bothFormats: "🌐 対面＆リモート両方",
    viewList: "リスト表示",
    viewMap: "マップ表示",
    filterTitle: "詳細フィルター",
    searchRadius: "検索半径",
    infiniteWorld: "♾️ 無制限（全世界・リモート）",
    infinite: "無制限",
    useMyLocation: "📍 現在地を使用する",
    geolocating: "位置情報を取得中...",
    geolocatedSuccess: "位置情報を取得しました！",
    geolocatedError: "デフォルト位置を使用します。",
    availableListings: "件の利用可能な出品",
    totalInfinite: "全出品（無制限モード）",
    negotiationsTitle: "交渉・チャット",
    validateDeal: "取引を確定する",
    counterOffer: "カウンターオファーをする",
    dealConditions: "🤝 進行中のTroco取引条件：",
    selectChatPrompt: "チャットを選択して条件を確認してください。",
    payWithTokens: "Trocoトークンで支払う",
    payWithEuros: "ユーロ（€）で支払う",
    payHybrid: "ハイブリッド方式で支払う",
    postTitle: "出品を作成する",
    publishButton: "Trocoに出品を公開",
    proposeDealButton: "取引を提案する",
    startDiscussion: "会話を始める",
    sponsored: "🔥 スポンサー",
    urgent: "至急",
    verifiedOffer: "認定オファー",
    credits: "トークン",
    tokens: "トークン",
    euroBalance: "ユーロ残高",
    selectLanguage: "表示言語を選択",
    close: "閉じる",
    showOriginal: "🌐 原文を表示",
    showTranslation: "🌐 翻訳を表示",
    translatedByTroco: "自動翻訳",
    noListingsFound: "条件に一致する出品はありません。",
    resetFilters: "すべてのフィルターをリセット",
    catSkills: "レッスン・スキル",
    catTools: "機材・工具の貸出",
    catServices: "修理・サービス",
    catHousing: "住宅・スワップ",
    newCategory: "+ 新しいカテゴリー",
    addCategory: "カテゴリーを追加",
    categoryName: "カテゴリー名",
    authorAnnc: "あなたの出品です",
    compensation: "報酬・対価",
    availability: "利用可能日時",
    caution: "保証金",
    demoVideo: "デモ動画",
    livePlayback: "ライブ再生",
    photos: "写真",
    rechargeCash: "チャージする",
    buyTokens: "トークンを購入",
    editProfile: "プロフィール編集",
    saveProfile: "保存する",
    myListings: "自分の出品一覧",
    swapHistory: "取引・交換の履歴",
    wallet: "マイウォレット",
    socialNetworks: "ソーシャルネットワーク",
    portfolio: "ポートフォリオ",
    reviews: "詳細レビュー",
    detailCaution: "保証金が必要",
    noCaution: "保証金なし",
    exchange: "交換",
    writeToInterlocutor: "相手にメッセージを送信...",
    typeYourMessage: "メッセージを入力...",
    send: "送信",
    fullscreen: "全画面",
    reduce: "縮小",
    call: "通話",
    videoCall: "ビデオ通話",
    newDiscussion: "新しい会話",
    negotiationInProgress: "交渉中",
    dealValidated: "ディール成立",
    toConfirm: "確認待ち",
    verifiedProfile: "認証済みプロフィール",
    closed: "終了",
    inProgress: "進行中",
    planned: "予定済み",
    discussions: "メッセージ一覧",
    myDealProposal: "マイ・ディール提案",
    receivedDealProposal: "ディール提案を受信",
    waitingYourResponse: "あなたの返答待ち",
    waitingResponse: "返答待ち",
    dealValidatedConfirmed: "ディール確認・確定済み",
    declined: "辞退",
    acceptValidateDeal: "ディールを承認・確定する",
    decline: "辞退する",
    waitingInterlocutorResponse: "相手の返答を待っています...",
    dealConfirmedLocked: "ディールが正常に確定・ロックされました。",
    counterOffer: "カウンターオファー",
    directSwap: "直接トレード",
    spokenLanguages: "話せる言語",
    manageWallet: "ウォレットを管理",
    trocoTokensLabel: "Troco トークン",
    tokenRateNotice: "1 トークン ≈ 10€ / 1時間",
    skillsCV: "スキルCV",
    servicesExpertise: "サービス＆専門知識",
    availableEquipment: "利用可能なツール・機材",
    loansTools: "貸出／工具",
    inTotal: "合計",
    swapHistorySub: "ステータスおよび詳細なレビュー付きの過去および進行中のすべての取引。",
    closedDeals: "完了した取引",
    averageRating: "平均評価",
    inProgressPlanned: "進行中／計画中",
    guidedPath: "ガイド付きステップ",
    chooseAdTypePrompt: "掲載したい出品タイプを選択してください。",
    iOfferService: "サービスまたはツールを提供します",
    iOfferServiceSub: "例：レッスン、修理、工具貸出、ワークショップ。",
    iRequestService: "サービスまたはツールを探しています",
    iRequestServiceSub: "例：工具、レッスン、緊急修理が必要です。",
    adTitleLabel: "タイトル",
    adTitlePlaceholder: "例：脚立の貸出、英語レッスン",
    adCategoryLabel: "カテゴリー",
    adFormatLabel: "形式",
    adDescriptionLabel: "説明",
    adDescriptionPlaceholder: "提供内容、条件、相手にとって重要な詳細を説明してください",
    adMediaTitle: "出品メディア（写真＆ショート動画）",
    autoGenerateVisuals: "✨ ビジュアル自動生成",
    adMediaDesc: "Trocoは最高の視認性を保証します。メディアを追加するか、スマートAIに高画質写真と動画を選ばせてください。",
    mainPhotoLabel: "📸 メイン写真",
    photoUrlPlaceholder: "写真URL（例：https://...）",
    importPhoto: "写真をアップロード",
    miniVideoLabel: "🎥 プレゼンショート動画 (.mp4)",
    videoUrlPlaceholder: "MP4動画URL（例：https://...）",
    importVideo: "動画をアップロード",
    autoGeneratedTags: "自動生成タグ：",
    retributionModeLabel: "報酬形式",
    timeCreditOption: "タイムトークン",
    euroPaymentOption: "ユーロ支払い",
    directSwapOption: "直接スワップ",
    hybridOption: "ハイブリッド",
    expectedAmountLabel: "希望金額（€）",
    trocoTokensAmountLabel: "Troco トークン数",
    locationZoneLabel: "場所または地域",
    availabilityLabel: "利用可能日時",
    requireCautionLabel: "バーチャル保証金を要求しますか？",
    cautionAmountLabel: "保証金額（€）",
    setUrgentLabel: "出品を「至急」に設定しますか？",
    urgentBadgeDesc: "「至急」バッジの表示＋フィードと検索結果での優先表示。",
    previewLabel: "プレビュー",
    titleToBeDefined: "未設定のタイトル",
    addDescriptionConvincing: "出品内容を明確で魅力的にするために説明を追加してください。",
    compensationLabel: "報酬：",
    priorityNotice: "優先表示・1.99€が課金されます",
    publishVisibilityNotice: "出品はメインフィード、マップ、検索結果に表示されます。",
    backButton: "戻る",
    continueButton: "次へ",
    publishAdButton: "出品を公開",
  },
  ZH: {

    deleteAd: "删除",
    pauseAd: "暂停",
    resumeAd: "恢复广告",
    editAdBtn: "编辑",
    editCostsMoneyTitle: "付费修改",
    editCostsMoneyText: "任何文本修改或添加超过4张照片都需要1.99欧元的费用。",
    addPhoto: "添加假照片",
    confirmDeleteTitle: "删除广告？",
    confirmDeleteText: "你确定要删除这个广告吗？",
    cancelBtn: "取消",
    confirmBtn: "确认",

    uploadProfilePhoto: "📁 从我的设备上传照片",
    viewListingButton: "查看发布",
    boostButtonLabel: "🔥 推广",
    editButtonLabel: "✏️ 编辑",
    filtersTitle: "高级筛选",
    addButton: "添加",
    categoryPlaceholder: "例：活动、交通...",
    buyAction: "购买",
    tokenPackSub: "1个 Troco 代币 = 12 欧 • 可用于服务、时间或高级互换。",
    pack5Tokens: "5个代币礼包",
    pack1Token: "1个代币礼包",
    rechargeAction: "充值",
    customAmount: "自定义金额",
    walletNotice: "每次安全交易后，两个余额将立即更新。",
    manageWalletSub: "管理您的欧元余额和 Troco 代币",
    langModalSub: "界面及所有发布内容将立即翻译为所选语言。",
    cancelButton: "取消",
    sendCounterOffer: "发送还价",
    counterOfferSub: "调整交易条款 — 欧元金额、Troco 代币及交换条件。",
    counterOfferTitle: "发起还价 counter-offer",
    doneButton: "完成",
    encryptedPayment: "端到端加密支付",
    transactionSuccess: "安全交易成功完成",
    secureBankConnection: "与银行网络的安全连接",
    transactionProcessing: "交易处理中...",
    payAction: "支付",
    sepaNotice: "💡 从您的 Troco 余额或通过 SEPA 转账充值。如果余额不足，您的代币将自动转换。",
    amountToPay: "支付金额",
    securePaymentHeader: "安全支付",
    all: "全部",
    slogan: "自由互换，温暖互助",
    explorer: "探索",
    messages: "消息",
    post: "发布",
    profile: "个人资料",
    searchPlaceholder: "搜索服务、设备、技能...",
    allCategories: "所有分类",
    allFormats: "所有形式",
    remote: "💻 远程 (视频)",
    onsite: "📍 现场 (线下)",
    bothFormats: "🌐 线下与远程均可",
    viewList: "列表视图",
    viewMap: "地图视图",
    filterTitle: "高级筛选",
    searchRadius: "搜索半径",
    infiniteWorld: "♾️ 无限 (全球与远程)",
    infinite: "无限",
    useMyLocation: "📍 使用我当前的位置",
    geolocating: "正在获取位置...",
    geolocatedSuccess: "位置获取成功！",
    geolocatedError: "已使用默认位置。",
    availableListings: "个可用项目",
    totalInfinite: "项发布 (无限模式)",
    negotiationsTitle: "协商与聊天",
    validateDeal: "确认交易",
    counterOffer: "提出还价",
    dealConditions: "🤝 正在进行的 Troco 交易条件：",
    selectChatPrompt: "选择一个对话以查看交易条件。",
    payWithTokens: "使用 Troco 代币支付",
    payWithEuros: "使用欧元 (€) 支付",
    payHybrid: "混合模式支付",
    postTitle: "发布项目",
    publishButton: "在 Troco 上发布项目",
    proposeDealButton: "提议交易",
    startDiscussion: "开始对话",
    sponsored: "🔥 赞助",
    urgent: "紧急",
    verifiedOffer: "认证项目",
    credits: "代币",
    tokens: "代币",
    euroBalance: "欧元余额",
    selectLanguage: "选择显示语言",
    close: "关闭",
    showOriginal: "🌐 显示原文",
    showTranslation: "🌐 显示翻译",
    translatedByTroco: "自动翻译",
    noListingsFound: "没有符合筛选条件的项目。",
    resetFilters: "重置所有筛选器",
    catSkills: "课程与技能",
    catTools: "设备租借",
    catServices: "维修与服务",
    catHousing: "住房与互换",
    newCategory: "+ 新建分类",
    addCategory: "添加分类",
    categoryName: "分类名称",
    authorAnnc: "这是您的发布",
    compensation: "报酬与方式",
    availability: "时间安排",
    caution: "押金",
    demoVideo: "视频演示",
    photos: "照片",
    rechargeCash: "充值",
    buyTokens: "购买代币",
    editProfile: "编辑资料",
    saveProfile: "保存",
    myListings: "我发布的项目",
    swapHistory: "交易与互换历史",
    wallet: "我的钱包",
    socialNetworks: "社交网络",
    portfolio: "作品集",
    reviews: "详细评价",
    detailCaution: "需要押金",
    noCaution: "无需押金",
    exchange: "交换",
    writeToInterlocutor: "发送消息给对方...",
    typeYourMessage: "输入您的消息...",
    send: "发送",
    fullscreen: "全屏",
    reduce: "还原",
    call: "通话",
    videoCall: "视频通话",
    newDiscussion: "新对话",
    negotiationInProgress: "协商中",
    dealValidated: "交易已确认",
    toConfirm: "待确认",
    verifiedProfile: "已验证个人资料",
    closed: "已结束",
    inProgress: "进行中",
    planned: "已计划",
    discussions: "消息列表",
    myDealProposal: "我的交易方案",
    receivedDealProposal: "收到交易方案",
    waitingYourResponse: "等待您的回复",
    waitingResponse: "等待回复",
    dealValidatedConfirmed: "交易已验证并确认",
    declined: "已拒绝",
    acceptValidateDeal: "接受并确认交易",
    decline: "拒绝",
    waitingInterlocutorResponse: "正在等待对方回复...",
    dealConfirmedLocked: "交易已成功确认并锁定。",
    counterOffer: "反要价",
    directSwap: "直接互换",
    spokenLanguages: "沟通语言",
    manageWallet: "管理我的钱包",
    trocoTokensLabel: "Troco 代币",
    tokenRateNotice: "1 个代币 ≈ 10€ / 1小时",
    skillsCV: "技能履历",
    servicesExpertise: "服务与专长",
    availableEquipment: "可用设备与工具",
    loansTools: "租借 / 工具",
    inTotal: "总计",
    swapHistorySub: "包含状态和详细评价的所有历史及进行中的交易。",
    closedDeals: "已完成交易",
    averageRating: "平均评分",
    inProgressPlanned: "进行中 / 已计划",
    guidedPath: "引导流程",
    chooseAdTypePrompt: "选择您想要发布的项目类型。",
    iOfferService: "我提供服务或设备",
    iOfferServiceSub: "例如：课程、维修、工具租借、工作坊。",
    iRequestService: "我寻找服务或设备",
    iRequestServiceSub: "例如：需要工具、课程或快速维修。",
    adTitleLabel: "标题",
    adTitlePlaceholder: "例如：梯子租借或英语课",
    adCategoryLabel: "分类",
    adFormatLabel: "形式",
    adDescriptionLabel: "描述",
    adDescriptionPlaceholder: "说明您的提供内容、限制、条件及关键细节",
    adMediaTitle: "项目媒体（照片与短视频）",
    autoGenerateVisuals: "✨ 自动生成视觉图",
    adMediaDesc: "Troco 确保最高曝光度。添加您自己的媒体或让智能 AI 为您匹配高清图片和循环视频。",
    mainPhotoLabel: "📸 主图",
    photoUrlPlaceholder: "图片 URL (例如: https://...)",
    importPhoto: "上传照片",
    miniVideoLabel: "🎥 介绍短视频 (.mp4)",
    videoUrlPlaceholder: "MP4 视频 URL (例如: https://...)",
    importVideo: "上传视频",
    autoGeneratedTags: "自动生成的标签：",
    retributionModeLabel: "报酬模式",
    timeCreditOption: "时间代币",
    euroPaymentOption: "欧元支付",
    directSwapOption: "直接互换",
    hybridOption: "混合模式",
    expectedAmountLabel: "预期金额 (€)",
    trocoTokensAmountLabel: "Troco 代币数量",
    locationZoneLabel: "地点或区域",
    availabilityLabel: "时间安排",
    requireCautionLabel: "是否需要虚拟押金？",
    cautionAmountLabel: "押金金额 (€)",
    setUrgentLabel: "是否将项目设为“紧急”？",
    urgentBadgeDesc: "显眼“紧急”标识 + 动态流与搜索中的优先展示。",
    previewLabel: "预览",
    titleToBeDefined: "待设置标题",
    addDescriptionConvincing: "添加描述以使您的项目清晰具吸引力。",
    compensationLabel: "报酬：",
    priorityNotice: "优先展示 • 将扣除 1.99€",
    publishVisibilityNotice: "您的发布将在主动态、地图和搜索结果中可见。",
    backButton: "返回",
    continueButton: "继续",
    publishAdButton: "发布项目",
  }
};


// ---- FORMULE HAVERSINE DE CALCUL DE DISTANCE EN KM ----
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return null;
  const R = 6371; // Rayon moyen de la Terre en kilomètres
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c * 10) / 10;
}


// ---- ARCHITECTURE UNIVERSELLE DE TRADUCTION DES ANNONCES (basée sur item.translations[lang]) ----
// Chaque annonce embarque directement ses traductions dans un champ `translations`.
// La règle s'applique MATHÉMATIQUEMENT à toutes les annonces sans exception.
// getListingDisplayContent() cherche item.translations[targetLang] en priorité,
// puis item.translations['EN'] en fallback, puis le contenu natif.
// eslint-disable-next-line no-unused-vars
const listingTranslationsMap = {}; // conservé pour la rétro-compat. éventuelle

// eslint-disable-next-line no-unused-vars
const getTranslatedListing = (item, targetLang) => {
  if (!item) return item;
  if (targetLang === 'FR' && item.nativeLang === 'FR') return item;
  const match = listingTranslationsMap[item.title];
  if (match && match[targetLang]) {
    return {
      ...item,
      title: match[targetLang],
    };
  }
  return item;
};

const localizeLocation = (loc, lang) => {
  if (!loc) return loc;
  let translated = loc;
  const map = {
    EN: { 'Pékin': 'Beijing', 'Chine': 'China', 'Japon': 'Japan', 'Allemagne': 'Germany', 'Espagne': 'Spain', 'Italie': 'Italy', 'Australie': 'Australia', 'Brésil': 'Brazil', 'Corée du Sud': 'South Korea', 'Londres': 'London', 'Rome': 'Rome', 'Barcelone': 'Barcelona', 'Séoul': 'Seoul', 'Florence': 'Florence', 'à distance': 'Remote', 'Sur place': 'On-site' },
    IT: { 'Pékin': 'Pechino', 'Chine': 'Cina', 'Japon': 'Giappone', 'Allemagne': 'Germania', 'Espagne': 'Spagna', 'Italie': 'Italia', 'Australie': 'Australia', 'Brésil': 'Brasile', 'Corée du Sud': 'Corea del Sud', 'Londres': 'Londra', 'Rome': 'Roma', 'Barcelone': 'Barcellona', 'Séoul': 'Seul', 'à distance': 'Da remoto', 'Sur place': 'In loco' },
    ES: { 'Pékin': 'Pekín', 'Chine': 'China', 'Japon': 'Japón', 'Allemagne': 'Alemania', 'Espagne': 'España', 'Italie': 'Italia', 'Australie': 'Australia', 'Brésil': 'Brasil', 'Corée du Sud': 'Corea del Sur', 'Londres': 'Londres', 'Rome': 'Roma', 'Barcelone': 'Barcelona', 'Séoul': 'Seúl', 'à distance': 'En remoto', 'Sur place': 'En sitio' },
    DE: { 'Pékin': 'Peking', 'Chine': 'China', 'Japon': 'Japan', 'Allemagne': 'Deutschland', 'Espagne': 'Spanien', 'Italie': 'Italien', 'Australie': 'Australien', 'Brésil': 'Brasilien', 'Corée du Sud': 'Südkorea', 'Londres': 'London', 'Rome': 'Rom', 'Barcelone': 'Barcelona', 'Séoul': 'Seoul', 'à distance': 'Remote', 'Sur place': 'Vor Ort' },
    JA: { 'Pékin': '北京', 'Chine': '中国', 'Japon': '日本', 'Allemagne': 'ドイツ', 'Espagne': 'スペイン', 'Italie': 'イタリア', 'Australie': 'オーストラリア', 'Brésil': 'ブラジル', 'Corée du Sud': '韓国', 'Londres': 'ロンドン', 'Rome': 'ローマ', 'Barcelone': 'バルセロナ', 'Séoul': 'ソウル', 'Paris': 'パリ', 'New York': 'ニューヨーク', 'à distance': 'リモート', 'Sur place': '現地' },
    ZH: { 'Pékin': '北京', 'Chine': '中国', 'Japon': '日本', 'Allemagne': '德国', 'Espagne': '西班牙', 'Italie': '意大利', 'Australie': '澳大利亚', 'Brésil': '巴西', 'Corée du Sud': '韩国', 'Londres': '伦敦', 'Rome': '罗马', 'Barcelone': '巴塞罗那', 'Séoul': '首尔', 'Paris': '巴黎', 'New York': '纽约', 'à distance': '远程', 'Sur place': '现场' }
  };
  const langMap = map[lang];
  if (langMap) {
    Object.keys(langMap).forEach(k => {
      translated = translated.replace(new RegExp(k, 'gi'), langMap[k]);
    });
  }
  return translated;
};

const localizeTags = (tags, lang) => {
  if (!tags) return [];
  const map = {
    EN: { 'Cours': 'Lessons', 'Musique': 'Music', 'Cuisine': 'Cooking', 'Bricolage': 'DIY', 'Dépannage': 'Repair', 'Logement': 'Housing', 'Tech': 'Tech', 'Sport & Bien-être': 'Sports & Wellness', 'Animaux': 'Pets', 'Photo & Vidéo': 'Photo & Video', 'À distance': 'Remote', 'Urgent': 'Urgent', 'Échange': 'Swap' },
    IT: { 'Cours': 'Lezioni', 'Musique': 'Musica', 'Cuisine': 'Cucina', 'Bricolage': 'Fai da te', 'Dépannage': 'Riparazioni', 'Logement': 'Alloggio', 'Tech': 'Tech', 'Sport & Bien-être': 'Sport & Benessere', 'Animaux': 'Animali', 'Photo & Vidéo': 'Foto & Video', 'À distance': 'A distanza', 'Urgent': 'Urgente', 'Échange': 'Scambio' },
    ES: { 'Cours': 'Clases', 'Musique': 'Música', 'Cuisine': 'Cocina', 'Bricolage': 'Bricolaje', 'Dépannage': 'Reparación', 'Logement': 'Alojamiento', 'Tech': 'Tech', 'Sport & Bien-être': 'Deporte & Bienestar', 'Animaux': 'Mascotas', 'Photo & Vidéo': 'Foto & Video', 'À distance': 'Remoto', 'Urgent': 'Urgente', 'Échange': 'Intercambio' },
    DE: { 'Cours': 'Kurse', 'Musique': 'Musik', 'Cuisine': 'Kochen', 'Bricolage': 'Heimwerken', 'Dépannage': 'Reparatur', 'Logement': 'Unterkunft', 'Tech': 'Tech', 'Sport & Bien-être': 'Sport & Wellness', 'Animaux': 'Haustiere', 'Photo & Vidéo': 'Foto & Video', 'À distance': 'Remote', 'Urgent': 'Dringend', 'Échange': 'Tausch' },
    JA: { 'Cours': 'レッスン', 'Musique': '音楽', 'Cuisine': '料理', 'Bricolage': 'DIY', 'Dépannage': '修理', 'Logement': '宿泊', 'Tech': '技術', 'Sport & Bien-être': 'スポーツ＆ウェルネス', 'Animaux': 'ペット', 'Photo & Vidéo': '写真＆動画', 'À distance': 'リモート', 'Urgent': '緊急', 'Échange': '交換' },
    ZH: { 'Cours': '课程', 'Musique': '音乐', 'Cuisine': '烹饪', 'Bricolage': 'DIY', 'Dépannage': '维修', 'Logement': '住宿', 'Tech': '技术', 'Sport & Bien-être': '运动与健康', 'Animaux': '宠物', 'Photo & Vidéo': '照片与视频', 'À distance': '远程', 'Urgent': '紧急', 'Échange': '交换' }
  };
  if (!map[lang]) return tags;
  return tags.map(t => map[lang][t] || t);
};

const localizeReview = (text, lang) => {
  if (lang === 'FR' || !text) return text;
  if (text.includes("clair sur les conditions") || text.includes("partenaire de confiance")) {
    return lang === 'EN' ? "Very clear on conditions, excellent communication and service quality." :
      lang === 'ES' ? "Muy claro en las condiciones, excelente comunicación y calidad de servicio." :
        lang === 'IT' ? "Molto chiaro sulle condizioni, ottima comunicazione e qualità del servizio." :
          lang === 'DE' ? "Sehr klare Bedingungen, tolle Kommunikation und Servicequalität." :
            lang === 'JA' ? "条件が非常に明確で、コミュニケーションとサービスの質が優れています。" :
              "条件非常明确，沟通和服务质量极佳。";
  }
  if (text.includes("pédagogique et hyper réactif") || text.includes("vrai plaisir")) {
    return lang === 'EN' ? "Very pedagogical and highly responsive, a pleasure to work with." :
      lang === 'ES' ? "Muy pedagógico y muy receptivo, un placer trabajar con él." :
        lang === 'IT' ? "Molto pedagogico e molto reattivo, un vero piacere lavorarci." :
          lang === 'DE' ? "Sehr pädagogisch und reaktionsschnell, eine Freude, damit zu arbeiten." :
            lang === 'JA' ? "非常に教育的で対応が早く、一緒に仕事をするのが楽しいです。" :
              "非常有教育意义且响应迅速，合作非常愉快。";
  }
  return lang === 'EN' ? "Very reliable for quick loans and repairs, I appreciated the transparency." :
    lang === 'ES' ? "Muy fiable para préstamos rápidos y reparaciones, aprecié la transparencia." :
      lang === 'IT' ? "Molto affidabile per prestiti veloci e riparazioni, ho apprezzato la trasparenza." :
        lang === 'DE' ? "Sehr zuverlässig für schnelle Kredite und Reparaturen, ich schätze die Transparenz." :
          lang === 'JA' ? "迅速な貸付と修理に非常に信頼でき、透明性を高く評価しています。" :
            "对于快速贷款和维修非常可靠，我很欣赏这种透明度。";
};

function FeedCardItem({
  item,
  darkMode,
  hoveredCardId,
  setHoveredCardId,
  hoverSlideIndex,
  handleOpenListing,
  getSuggestedMedia,
  getFallbackImage,
  formatCompensation,
  getListingDisplayContent,
  currentLang,
  showingOriginalListings,
  toggleOriginalListing,
  localizeLocation,
  localizeTags,
  generateTags,
  getAuthorAvatar,
  profile,
  handleStartDiscussion,
  isAdmin = false,
  onAdminDeleteListing = null,
  t = (key) => key
}) {
  const [localImageIndex, setLocalImageIndex] = useState(0);
  const touchStartRef = useRef(null);
  const touchDeltaXRef = useRef(0);
  const isSwipingRef = useRef(false);

  const media = getSuggestedMedia(item.title, item.description || '', item.image, item.video);
  const isHovered = hoveredCardId === item.id;
  const gallery = media.gallery && media.gallery.length > 0 ? media.gallery : [media.image];
  const galleryLength = gallery.length;
  const currentSlideIndex = isHovered && media.gallery?.[hoverSlideIndex] !== undefined
    ? hoverSlideIndex
    : localImageIndex;
  const activeImage = gallery[currentSlideIndex] || media.image;
  const displayContent = getListingDisplayContent(item, currentLang, !!showingOriginalListings[item.id]);

  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    touchDeltaXRef.current = 0;
    isSwipingRef.current = false;
  };

  const handleTouchMove = (e) => {
    if (!touchStartRef.current || !e.touches || e.touches.length === 0) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = touchStartRef.current.x - currentX;
    const deltaY = touchStartRef.current.y - currentY;

    touchDeltaXRef.current = deltaX;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 12) {
      isSwipingRef.current = true;
    }
  };

  const handleTouchEnd = () => {
    const deltaX = touchDeltaXRef.current;
    if (isSwipingRef.current && Math.abs(deltaX) > 20 && galleryLength > 1) {
      if (deltaX > 0) {
        setLocalImageIndex(prev => (prev + 1) % galleryLength);
      } else {
        setLocalImageIndex(prev => (prev - 1 + galleryLength) % galleryLength);
      }
    }
    touchStartRef.current = null;
    touchDeltaXRef.current = 0;
  };

  const handleCardImageClick = (e) => {
    if (isSwipingRef.current) {
      e.preventDefault();
      e.stopPropagation();
      isSwipingRef.current = false;
      return;
    }
    handleOpenListing(item);
  };

  return (
    <div
      onMouseEnter={() => setHoveredCardId(item.id)}
      onMouseLeave={() => setHoveredCardId(null)}
      className="premium-card"
      style={{
        backgroundColor: darkMode ? 'rgba(30,41,59,0.85)' : '#FFFFFF',
        border: item.isBoosted ? '2px solid #F59E0B' : (darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(229,231,235,0.9)'),
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: item.isBoosted ? '0 12px 34px rgba(245,158,11,0.14)' : '0 2px 14px rgba(15, 23, 42, 0.05)',
        cursor: 'pointer',
        transform: isHovered ? 'translateY(-4px) scale(1.02)' : 'none',
        transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease'
      }}
    >
      <div
        onClick={handleCardImageClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ position: 'relative', height: '200px', width: '100%', backgroundColor: '#F3F4F6', overflow: 'hidden', touchAction: 'pan-y' }}
      >
        {gallery.map((imgSrc, idx) => {
          const isActive = idx === currentSlideIndex;
          return (
            <img
              key={idx}
              src={imgSrc}
              alt={item.title}
              draggable={false}
              onError={(e) => { e.target.src = getFallbackImage(item.category, item.title); }}
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

        {galleryLength > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLocalImageIndex(prev => (prev - 1 + galleryLength) % galleryLength);
              }}
              style={{
                position: 'absolute', top: '50%', left: '8px', transform: 'translateY(-50%)',
                border: 'none', borderRadius: '50%', width: '28px', height: '28px',
                backgroundColor: 'rgba(15,23,42,0.6)', color: '#FFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', zIndex: 5, backdropFilter: 'blur(4px)'
              }}
              title="Photo précédente"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLocalImageIndex(prev => (prev + 1) % galleryLength);
              }}
              style={{
                position: 'absolute', top: '50%', right: '8px', transform: 'translateY(-50%)',
                border: 'none', borderRadius: '50%', width: '28px', height: '28px',
                backgroundColor: 'rgba(15,23,42,0.6)', color: '#FFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', zIndex: 5, backdropFilter: 'blur(4px)'
              }}
              title="Photo suivante"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}

        {media.video && (
          <video
            src={media.video}
            poster={media.image}
            autoPlay
            loop
            muted
            playsInline
            onError={(e) => { e.target.style.display = 'none'; }}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: isHovered && hoverSlideIndex === 0 ? 1 : 0,
              transition: 'opacity 0.4s ease',
              pointerEvents: 'none',
              zIndex: 2
            }}
          />
        )}

        {item.isBoosted && (
          <span className="sponsored-badge" style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: '#F59E0B', color: '#FFF', fontSize: '11px', fontWeight: '800', padding: '6px 10px', borderRadius: '10px', boxShadow: '0 6px 16px rgba(245,158,11,0.45)', zIndex: 4 }}>
            🔥 Sponsorisé
          </span>
        )}
        {item.urgent && (
          <span style={{ position: 'absolute', top: '12px', left: '12px', backgroundColor: 'rgba(239,68,68,0.95)', color: '#FFF', fontSize: '10px', fontWeight: '800', padding: '5px 9px', borderRadius: '10px', boxShadow: '0 6px 16px rgba(239,68,68,0.35)', zIndex: 4 }}>
            URGENT
          </span>
        )}
        {(item.isDemo || (typeof item.id === 'number' && item.id <= 20)) && (
          <span style={{
            position: 'absolute',
            top: item.urgent ? '42px' : '12px',
            left: '12px',
            backgroundColor: darkMode ? 'rgba(126,34,206,0.9)' : '#7E22CE',
            color: '#FFF',
            fontSize: '9.5px',
            fontWeight: '800',
            padding: '4px 8px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(126,34,206,0.35)',
            zIndex: 4,
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            backdropFilter: 'blur(4px)'
          }}>
            🤖 Annonce IA
          </span>
        )}

        {media.video && (
          <span style={{ position: 'absolute', bottom: '12px', left: '12px', backgroundColor: isHovered ? '#04265A' : 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', color: '#60A5FA', fontSize: '10px', fontWeight: '800', padding: '5px 9px', borderRadius: '10px', zIndex: 4, display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.3s ease' }}>
            <Video size={12} /> {isHovered ? (t('livePlayback') || 'Lecture') : (t('demoVideo') || 'Vidéo')}
          </span>
        )}

        {galleryLength > 1 && (
          <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '4px', zIndex: 4 }}>
            {gallery.map((_, idx) => (
              <div key={idx} style={{ width: currentSlideIndex === idx ? '14px' : '6px', height: '6px', borderRadius: '999px', backgroundColor: currentSlideIndex === idx ? '#FFF' : 'rgba(255,255,255,0.5)', transition: 'all 0.3s ease' }} />
            ))}
          </div>
        )}

        <span style={{ position: 'absolute', bottom: '12px', right: '12px', backgroundColor: 'rgba(4,38,90,0.95)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', color: '#FFF', fontSize: '11px', fontWeight: 'bold', padding: '5px 9px', borderRadius: '10px', zIndex: 4 }}>
          {formatCompensation(item.compensation)}
        </span>
      </div>
      <div style={{ padding: '16px 18px' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: darkMode ? '#FFFFFF' : '#111827', margin: '0 0 4px 0', lineHeight: 1.35 }}>
            {displayContent.title}
          </h3>
          {currentLang !== (item.nativeLang || 'FR') && (
            <button
              onClick={(e) => toggleOriginalListing(item.id, e)}
              className="premium-button"
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                color: darkMode ? '#60A5FA' : '#04265A',
                fontSize: '11px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 0 6px 0'
              }}
            >
              <Globe size={12} />
              {showingOriginalListings[item.id] ? t('showTranslation') : t('showOriginal')}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: darkMode ? '#CBD5E1' : '#6B7280', marginBottom: '10px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {item.type === 'remote' ? <Video size={13} color={darkMode ? '#60A5FA' : '#04265A'} /> : <MapPin size={13} color={darkMode ? '#60A5FA' : '#04265A'} />}
            {localizeLocation(item.location, currentLang)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {localizeTags((item.tags || generateTags(item.title, item.description || '')), currentLang).slice(0, 3).map(tag => (
            <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: darkMode ? 'rgba(4,38,90,0.45)' : '#EFF6FF', color: darkMode ? '#93C5FD' : '#04265A', borderRadius: '999px', padding: '4px 10px', fontSize: '10px', fontWeight: '800' }}>
              <Tag size={10} /> {tag}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #F3F4F6', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: '600', fontSize: '13px', color: darkMode ? '#F8FAFC' : '#374151' }}>
            <img src={item.author === profile.name ? profile.avatar : getAuthorAvatar(item.author)} alt={item.author} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', border: darkMode ? '1px solid #60A5FA' : '1px solid #E2E8F0' }} />
            {item.author}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isAdmin && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`[ADMINISTRATEUR]\nVoulez-vous supprimer définitivement l'annonce "${item.title}" ?`)) {
                    if (onAdminDeleteListing) onAdminDeleteListing(item);
                  }
                }}
                className="premium-button"
                style={{
                  border: 'none',
                  borderRadius: '10px',
                  padding: '7px 10px',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 4px 10px rgba(239,68,68,0.25)'
                }}
                title="Supprimer immédiatement cette annonce (Admin)"
              >
                <Trash2 size={12} /> Modérer
              </button>
            )}
            {item.author !== profile.name ? (
              <button onClick={(event) => { event.stopPropagation(); handleStartDiscussion(item); }} className="premium-button" style={{ backgroundColor: '#04265A', color: '#FFF', border: 'none', padding: '8px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 6px 14px rgba(4,38,90,0.18)' }}>{t('proposeDealButton')} <ArrowRight size={12} /></button>
            ) : (
              <span style={{ backgroundColor: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB', padding: '7px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '600' }}>{t('authorAnnc')}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('troco_dark_mode') === 'true');

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('troco_dark_mode', String(next));
      if (next) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
      return next;
    });
  };

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);
  const [currentLang, setCurrentLang] = useState('FR');
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [userCoords, setUserCoords] = useState([48.8566, 2.3522]); // Paris par défaut
  const [isGeolocated, setIsGeolocated] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [geolocMsg, setGeolocMsg] = useState('');

  const t = (key) => (translations[currentLang] && translations[currentLang][key]) || translations['FR'][key] || key;

  const getCategoryLabel = (categoryKey) => {
    if (categoryKey === 'Tous' || categoryKey === 'all') return t('all');
    if (categoryKey === 'Cours/Compétences' || categoryKey === 'Cours & Compétences') return t('catSkills');
    if (categoryKey === 'Outillage' || categoryKey === 'Prêt de Matériel') return t('catTools');
    if (categoryKey === 'Services/Dépannage' || categoryKey === 'Services & Dépannage') return t('catServices');
    if (categoryKey === 'Logement/Swap' || categoryKey === 'Logement & Stay Swap') return t('catHousing');
    return categoryKey;
  };

  const getListingTitleTranslation = (title, targetLang) => {
    if (!title) return '';
    if (targetLang === 'FR') return title;

    const knownTitles = {
      "Initiation au Design UI/UX (Figma)": {
        FR: "Initiation au Design UI/UX (Figma)",
        EN: "Figma UI/UX Design Initiation",
        ES: "Iniciación al diseño UI/UX en Figma",
        IT: "Iniziazione al Design UI/UX su Figma",
        DE: "UI/UX-Design-Einführung in Figma",
        JA: "Figma UI/UXデザイン入門",
        ZH: "Figma UI/UX 设计入门"
      },
      "Studio Photo Pro Paris": {
        FR: "Studio Photo Pro Paris",
        EN: "Pro Photo Studio Paris",
        ES: "Estudio fotográfico profesional en París",
        IT: "Studio fotografico professionale a Parigi",
        DE: "Profi-Fotostudio Paris",
        JA: "プロフォトスタジオ パリ",
        ZH: "巴黎专业摄影棚"
      },
      "Initiation UI/UX Figma": {
        FR: "Initiation UI/UX Figma",
        EN: "UI/UX Design on Figma (Beginner)",
        ES: "Iniciación al Diseño UI/UX en Figma",
        IT: "Iniziazione al Design UI/UX su Figma",
        DE: "UI/UX Design Einführung auf Figma",
        JA: "FigmaによるUI/UXデザイン入門",
        ZH: "Figma UI/UX 设计入门"
      },
      "Initiation Figma (UI/UX)": {
        FR: "Initiation Figma (UI/UX)",
        EN: "UI/UX Design on Figma (Beginner)",
        ES: "Iniciación al Diseño UI/UX en Figma",
        IT: "Iniziazione al Design UI/UX su Figma",
        DE: "UI/UX Design Einführung auf Figma",
        JA: "FigmaによるUI/UXデザイン入門",
        ZH: "Figma UI/UX 设计入门"
      },
      "Studio Photo Professionnel": {
        FR: "Studio Photo Professionnel",
        EN: "Professional Photo Studio",
        ES: "Estudio de Fotografía Profesional",
        IT: "Studio Fotografico Professionale",
        DE: "Professionelles Fotostudio",
        JA: "プロ仕様フォトスタジオ貸出",
        ZH: "专业摄影工作室"
      },
      "Cours de Piano": {
        FR: "Cours de Piano",
        EN: "Piano Lessons",
        ES: "Clases de Piano",
        IT: "Lezioni di Pianoforte",
        DE: "Klavierunterricht",
        JA: "ピアノレッスン",
        ZH: "钢琴课"
      },
      "Cours de Piano & Solfège (3 séances en visio)": {
        FR: "Cours de Piano & Solfège (3 séances en visio)",
        EN: "Piano & Solfège Lessons (3 online sessions)",
        ES: "Clases de Piano y Solfeo (3 sesiones en visio)",
        IT: "Lezioni di Pianoforte e Solfeggio (3 sessioni online)",
        DE: "Klavier- & Musiklehreunterricht (3 Online-Sitzungen)",
        JA: "ピアノ＆ソルフェージュレッスン（オンライン3回）",
        ZH: "钢琴与视唱练耳课程（3次在线课程）"
      },
      "Prêt Perceuse Bosch": {
        FR: "Prêt Perceuse Bosch",
        EN: "Bosch Hammer Drill Loan",
        ES: "Préstamo de Taladro Bosch",
        IT: "Prestito Trapano Bosch",
        DE: "Bosch Schlagbohrmaschinen-Verleih",
        JA: "ボッシュ振動ドリル貸出",
        ZH: "博世冲击钻租借"
      },
      "Prêt Perceuse": {
        FR: "Prêt Perceuse",
        EN: "Drill Loan",
        ES: "Préstamo de Taladro",
        IT: "Prestito Trapano",
        DE: "Bohrmaschinenverleih",
        JA: "ドリルレンタル",
        ZH: "电钻租借"
      },
      "Prêt Perceuse à percussion + coffret forets": {
        FR: "Prêt Perceuse à percussion + coffret forets",
        EN: "Impact Drill Loan + Bit Set",
        ES: "Préstamo de Taladro percutor + Brocas",
        IT: "Prestito Trapano a percussione + punte",
        DE: "Schlagbohrmaschinen-Verleih + Bohrersatz",
        JA: "振動ドリル貸出＋ドリル刃セット",
        ZH: "冲击钻租借 + 钻头套装"
      },
      "Réparation iPhone 13": {
        FR: "Réparation iPhone 13",
        EN: "iPhone 13 Repair",
        ES: "Reparación Express de Pantalla iPhone",
        IT: "Riparazione iPhone 13",
        DE: "iPhone 13 Reparatur",
        JA: "iPhone 13 修理",
        ZH: "iPhone 13 维修"
      },
      "Dépannage iPhone 13 (écran)": {
        FR: "Dépannage iPhone 13 (écran)",
        EN: "iPhone 13 Screen Repair",
        ES: "Reparación de Pantalla iPhone 13",
        IT: "Riparazione Schermo iPhone 13",
        DE: "iPhone 13 Display-Reparatur",
        JA: "iPhone 13 画面修理",
        ZH: "iPhone 13 屏幕维修"
      },
      "Stay Swap Marseille Vieux-Port": {
        FR: "Stay Swap Marseille Vieux-Port",
        EN: "Stay Swap Marseille Old Port",
        ES: "Stay Swap Marsella Puerto Viejo",
        IT: "Stay Swap Marsiglia Porto Vecchio",
        DE: "Stay Swap Marseille Alter Hafen",
        JA: "マルセイユ旧港アパート交換",
        ZH: "马赛老港公寓互换"
      },
      "Cours d'Italien conversationnel (1h)": {
        FR: "Cours d'Italien conversationnel (1h)",
        EN: "Conversational Italian Lesson (1h)",
        ES: "Clase de Italiano conversacional (1h)",
        IT: "Lezione di Italiano Conversazionale (1h)",
        DE: "Konversationsunterricht Italienisch (1 Std)",
        JA: "日常イタリア語会話レッスン（1時間）",
        ZH: "意大利语会话课（1小时）"
      },
      "Coaching Musculation à domicile sur mesure": {
        FR: "Coaching Musculation à domicile sur mesure",
        EN: "Custom Personal Fitness Coaching at Home",
        ES: "Entrenamiento Personal a Domicilio",
        IT: "Coaching di Bodybuilding su misura a domicilio",
        DE: "Individuelles Fitness-Coaching zu Hause",
        JA: "自宅でのカスタム筋トレコーチング",
        ZH: "上门定制健身与肌肉训练指导"
      }
    };
    if (knownTitles[title] && knownTitles[title][targetLang]) {
      return knownTitles[title][targetLang];
    }
    return title;
  };

  const formatStatus = (st) => {
    if (st === 'Négociation en cours') return t('negotiationInProgress');
    if (st === 'Deal Validé') return t('dealValidated');
    if (st === 'À confirmer') return t('toConfirm');
    if (st === 'Nouvelle discussion') return t('newDiscussion');
    if (st === 'Clôturé' || st === 'Terminé' || st === 'Cloture' || st === 'Closed') return t('closed');
    if (st === 'En cours' || st === 'In progress') return t('inProgress');
    if (st === 'Planifié' || st === 'Planned') return t('planned');
    return st;
  };

  const getChatMessageDisplayContent = (message, targetLang, forceOriginal = false) => {
    if (!message) return '';
    const rawText = (typeof message === 'string' ? message : (message.text || message.conditions || '')).trim();

    if (forceOriginal || targetLang === 'FR' || !targetLang) {
      return (typeof message === 'object' && message.originalText) ? message.originalText : rawText;
    }

    if (typeof message === 'object' && message.translations && message.translations[targetLang]) {
      return message.translations[targetLang];
    }

    if (rawText.includes("Bonne contre-proposition")) {
      const summaryMatch = rawText.match(/\(([^)]+)\)/);
      const summaryText = summaryMatch ? summaryMatch[1] : '';
      let translatedSummary = '';
      if (summaryText) {
        let sumTrans = summaryText;
        if (targetLang === 'EN') sumTrans = sumTrans.replace(/Jetons?/g, 'Token').replace(/Crédits?/g, 'Token');
        else if (targetLang === 'ES') sumTrans = sumTrans.replace(/Jetons?/g, 'Ficha').replace(/Crédits?/g, 'Ficha');
        else if (targetLang === 'IT') sumTrans = sumTrans.replace(/Jetons?/g, 'Gettone').replace(/Crédits?/g, 'Gettone');
        else if (targetLang === 'DE') sumTrans = sumTrans.replace(/Jetons?/g, 'Token').replace(/Crédits?/g, 'Token');
        else if (targetLang === 'JA') sumTrans = sumTrans.replace(/Jetons?/g, 'トークン').replace(/Crédits?/g, 'トークン');
        else if (targetLang === 'ZH') sumTrans = sumTrans.replace(/Jetons?/g, '个代币').replace(/Crédits?/g, '个代币');
        translatedSummary = ` (${sumTrans})`;
      }

      const templates = {
        FR: `Bonne contre-proposition${translatedSummary}. Le cadre me convient — j'attends ta confirmation pour valider le deal.`,
        EN: `Good counter-proposal${translatedSummary}. The terms look good to me — I'm waiting for your confirmation to validate the deal.`,
        ES: `Buena contrapropuesta${translatedSummary}. Las condiciones me parecen bien — espero tu confirmación para validar el trato.`,
        IT: `Buona controproposta${translatedSummary}. Le condizioni mi stanno bene — aspetto la tua conferma per convalidare l'accordo.`,
        DE: `Guter Gegenvorschlag${translatedSummary}. Die Bedingungen passen mir — ich warte auf deine Bestätigung, um den Deal zu validieren.`,
        JA: `良いカウンターオファー${translatedSummary}ですね。条件に同意します。取引を確定するために確認をお待ちしています。`,
        ZH: `不错的反向提议${translatedSummary}。条件符合我的要求 — 我等待你的确认以验证此交易。`
      };
      return templates[targetLang] || rawText;
    }

    const knownMessageTranslations = {
      "Échange à définir ensemble.": {
        FR: "Échange à définir ensemble.",
        EN: "Exchange to be defined together.",
        ES: "Intercambio por definir juntos.",
        IT: "Scambio da definire insieme.",
        DE: "Austausch gemeinsam zu definieren.",
        JA: "詳細は後ほど話し合って決めましょう。",
        ZH: "具体交换细节待双方商定。"
      },
      // Thread 201 (Emma Roche)
      "Bonjour Mateo ! J’ai vu ton annonce d’initiation UI/UX sur Figma, elle m’intéresse énormément pour mon projet d’application mobile !": {
        FR: "Bonjour Mateo ! J’ai vu ton annonce d’initiation UI/UX sur Figma, elle m’intéresse énormément pour mon projet d’application mobile !",
        EN: "Hi Mateo! I saw your UI/UX design listing on Figma, I'm very interested for my mobile app project!",
        ES: "¡Hola Mateo! Vi tu anuncio de iniciación UI/UX en Figma, ¡me interesa mucho para mi proyecto de app móvil!",
        IT: "Ciao Mateo! Ho visto il tuo annuncio di introduzione UI/UX su Figma, mi interessa molto per la mia app!",
        DE: "Hallo Mateo! Ich habe deine UI/UX-Anzeige auf Figma gesehen, sie interessiert mich sehr für mein App-Projekt!",
        JA: "マテオさんこんにちは！FigmaのUI/UX入門を見ました。アプリ開発のためにぜひ受講したいです！",
        ZH: "你好 Mateo！我看到了你发布的 Figma UI/UX 课程，我对我的移动应用项目非常感兴趣！"
      },
      "Salut Emma ! Avec grand plaisir, on peut voir les bases des composants, autolayout et prototypes interactifs.": {
        FR: "Salut Emma ! Avec grand plaisir, on peut voir les bases des composants, autolayout et prototypes interactifs.",
        EN: "Hi Emma! With pleasure, we can cover component basics, auto-layout, and interactive prototypes.",
        ES: "¡Hola Emma! Con mucho gusto, podemos ver componentes, auto-layout y prototipos interactivos.",
        IT: "Ciao Emma! Con piacere, possiamo vedere i componenti, auto-layout e prototipi interattivi.",
        DE: "Hallo Emma! Sehr gerne, wir können Komponenten-Grundlagen, Auto-Layout und interaktive Prototypen durchgehen.",
        JA: "エマさんこんにちは！喜んで。コンポーネントの基本、オートレイアウト、インタラクティブプロトタイプを学べますよ。",
        ZH: "你好 Emma！非常乐意，我们可以学习组件基础、自动布局和交互式原型设计。"
      },
      "Super ! Est-ce que tu serais disponible pour 2h de formation ce samedi en visio ?": {
        FR: "Super ! Est-ce que tu serais disponible pour 2h de formation ce samedi en visio ?",
        EN: "Great! Would you be available for a 2-hour online session this Saturday?",
        ES: "¡Genial! ¿Estarías disponible para 2h de formación este sábado por videollamada?",
        IT: "Fantastico! Saresti disponibile per 2 ore di formazione questo sabato in videochiamata?",
        DE: "Super! Wärst du diesen Samstag für 2 Stunden Online-Schulung verfügbar?",
        JA: "素晴らしいです！今週の土曜日にオンラインで2時間のレッスンは可能でしょうか？",
        ZH: "太好了！你这周六有空进行2小时的视频在线培训吗？"
      },
      "Session de 2h Initiation Figma (UI/UX) ce samedi à 14h. Contre 20€ + 1 Jeton Troco.": {
        FR: "Session de 2h Initiation Figma (UI/UX) ce samedi à 14h. Contre 20€ + 1 Jeton Troco.",
        EN: "2h Figma UI/UX session this Saturday at 2 PM. For €20 + 1 Troco Token.",
        ES: "Sesión de 2h de Figma (UI/UX) este sábado a las 14h. Por 20€ + 1 Ficha Troco.",
        IT: "Sessione di 2h di Figma (UI/UX) questo sabato alle 14:00. Per 20€ + 1 Gettone Troco.",
        DE: "2 Std. Figma UI/UX Sitzung diesen Samstag um 14 Uhr. Für 20€ + 1 Troco-Token.",
        JA: "今週土曜14時〜 Figma UI/UX 2時間セッション。20ユーロ＋1 Trocoトークン。",
        ZH: "本周六下午2点 2小时 Figma UI/UX 课程。对价为 20欧元 + 1个 Troco 代币。"
      },
      "Je te propose 20€ + 1 Jeton pour 2h de formation": {
        FR: "Je te propose 20€ + 1 Jeton pour 2h de formation",
        EN: "I offer €20 + 1 Token for 2h training",
        ES: "Te ofrezco 20€ + 1 Ficha por 2h de formación",
        IT: "Ti offro 20€ + 1 Gettone per 2 ore di formazione",
        DE: "Ich biete 20€ + 1 Token für 2 Std. Schulung",
        JA: "2時間のレッスンのために20ユーロ＋1トークンをご提案します",
        ZH: "我提议以 20欧元 + 1个代币 交换2小时培训"
      },

      // Thread 202 (Thomas V.)
      "Hello Mateo ! Je cherche un studio photo bien équipé à Paris pour un shoot produit. Ton annonce est toujours disponible ?": {
        FR: "Hello Mateo ! Je cherche un studio photo bien équipé à Paris pour un shoot produit. Ton annonce est toujours disponible ?",
        EN: "Hello Mateo! I'm looking for a well-equipped photo studio in Paris for a product shoot. Is your listing still available?",
        ES: "¡Hola Mateo! Busco un estudio fotográfico bien equipado en París para una sesión de fotos. ¿Sigue disponible?",
        IT: "Ciao Mateo! Cerco uno studio fotografico ben attrezzato a Parigi per uno shooting di prodotti. È ancora disponibile?",
        DE: "Hallo Mateo! Ich suche ein gut ausgestattetes Fotostudio in Paris für ein Produktshooting. Ist deine Anzeige noch verfügbar?",
        JA: "マテオさんこんにちは！商品撮影用の機材が揃ったパリのスタジオを探しています。まだ利用可能ですか？",
        ZH: "你好 Mateo！我正在巴黎寻找一个设备齐全的摄影工作室拍摄产品。你的房源还可以租借吗？"
      },
      "Oui Thomas ! Il y a tout le matos : flashs Bowens, softbox, déclencheurs et fonds papier.": {
        FR: "Oui Thomas ! Il y a tout le matos : flashs Bowens, softbox, déclencheurs et fonds papier.",
        EN: "Yes Thomas! All gear is here: Bowens strobes, softboxes, triggers, and seamless paper backdrops.",
        ES: "¡Sí Thomas! Todo el equipo está incluido: flashes Bowens, softboxes, disparadores y fondos de papel.",
        IT: "Sì Thomas! C'è tutta l'attrezzatura: flash Bowens, softbox, trigger e sfondi in carta.",
        DE: "Ja Thomas! Das komplette Equipment ist da: Bowens Blitze, Softboxen, Funkauslöser und Papierhintergründe.",
        JA: "はいトマさん！Bowensのストロボ、ソフトボックス、トリガー、ペーパーバックなど機材完備です。",
        ZH: "是的 Thomas！所有设备一应俱全：宝荣闪光灯、柔光箱、引闪器和背景纸。"
      },
      "Parfait ! Je peux te proposer un échange contre 3 jetons Troco pour 3h de réservation ce vendredi.": {
        FR: "Parfait ! Je peux te proposer un échange contre 3 jetons Troco pour 3h de réservation ce vendredi.",
        EN: "Perfect! I can offer 3 Troco tokens for a 3-hour booking this Friday.",
        ES: "¡Perfecto! Te propongo un intercambio por 3 fichas Troco por 3h de reserva este viernes.",
        IT: "Perfetto! Posso offrirti 3 gettoni Troco per 3 ore di prenotazione questo venerdì.",
        DE: "Perfekt! Ich biete 3 Troco-Tokens für eine 3-stündige Buchung diesen Freitag an.",
        JA: "完璧です！今週金曜の3時間利用に対して3 Trocoトークンを提案します。",
        ZH: "太好了！我提议用 3个 Troco 代币交换本周五 3小时的摄影棚预订。"
      },
      "Réservation Studio Photo Pro (3h) ce vendredi 14h-17h avec matériel inclus. Contre 3 Jetons Troco.": {
        FR: "Réservation Studio Photo Pro (3h) ce vendredi 14h-17h avec matériel inclus. Contre 3 Jetons Troco.",
        EN: "Pro Photo Studio booking (3h) this Friday 2pm-5pm with equipment included. For 3 Troco Tokens.",
        ES: "Reserva Estudio Foto Pro (3h) este viernes 14h-17h con equipo incluido. Por 3 Fichas Troco.",
        IT: "Prenotazione Studio Fotografico (3h) venerdì 14:00-17:00 con materiale incluso. Per 3 Gettoni Troco.",
        DE: "Pro-Fotostudio Buchung (3 Std) diesen Freitag 14-17 Uhr inkl. Equipment. Für 3 Troco-Tokens.",
        JA: "プロフォトスタジオ予約（3時間）金曜14時〜17時 機材込み。3 Trocoトークン。",
        ZH: "专业摄影棚预订（3小时）本周五14:00-17:00，包含设备。对价为 3个 Troco 代币。"
      },
      "Disponible ce vendredi pour un shoot produit de 3h": {
        FR: "Disponible ce vendredi pour un shoot produit de 3h",
        EN: "Available this Friday for a 3h product shoot",
        ES: "Disponible este viernes para una sesión de fotos de 3h",
        IT: "Disponibile questo venerdì per uno shooting di 3 ore",
        DE: "Diesen Freitag für ein 3-stündiges Produktshooting verfügbar",
        JA: "今週金曜日に3時間の商品撮影で利用可能です",
        ZH: "本周五可用于3小时的产品拍摄"
      },

      // Thread 101 (Sofia M.)
      "Bonjour ! Je propose des cours de piano flexibles pour tous niveaux avec accompagnement sur mesure.": {
        FR: "Bonjour ! Je propose des cours de piano flexibles pour tous niveaux avec accompagnement sur mesure.",
        EN: "Hello! I offer flexible piano lessons for all levels with tailored coaching.",
        ES: "¡Hola! Ofrezco clases de piano flexibles para todos los niveles con seguimiento a medida.",
        IT: "Ciao! Offro lezioni di piano flessibili per tutti i livelli con accompagnamento su misura.",
        DE: "Hallo! Ich biete flexiblen Klavierunterricht für alle Niveaus mit maßgeschneiderter Betreuung an.",
        JA: "こんにちは！全レベル対象の柔軟なピアノ個人レッスンを提供しています。",
        ZH: "你好！我提供适合各个水平的灵活钢琴课程，量身定制辅导。"
      },
      "Bonjour ! Je peux te proposer un cours de piano flexible avec un échange en jetons Troco.": {
        FR: "Bonjour ! Je peux te proposer un cours de piano flexible avec un échange en jetons Troco.",
        EN: "Hello! I can offer flexible piano lessons in exchange for Troco tokens.",
        ES: "¡Hola! Puedo ofrecerte clases de piano flexibles a cambio de fichas Troco.",
        IT: "Ciao! Posso offrirti lezioni di piano flessibili in cambio di gettoni Troco.",
        DE: "Hallo! Ich kann flexiblen Klavierunterricht im Tausch gegen Troco-Tokens anbieten.",
        JA: "こんにちは！Trocoトークンとの交換で柔軟なピアノレッスンを提供できます。",
        ZH: "你好！我可以用 Troco 代币交换为你提供灵活的钢琴课。"
      },
      "Parfait, je cherche à retravailler mes enchaînements d’accords en visio.": {
        FR: "Parfait, je cherche à retravailler mes enchaînements d’accords en visio.",
        EN: "Perfect, I'm looking to practice chord progressions via video.",
        ES: "Perfecto, busco practicar mis cambios de acordes por videollamada.",
        IT: "Perfetto, vorrei fare pratica con le progressioni di accordi in videochiamata.",
        DE: "Perfekt, ich möchte meine Akkordwechsel per Videoanruf üben.",
        JA: "素晴らしいです。ビデオ通話でコード進行の練習をしたいと思っています。",
        ZH: "太好了，我想通过视频在线练习和弦转换。"
      },
      "Parfait, je préfère un format visio et un échange simple.": {
        FR: "Parfait, je préfère un format visio et un échange simple.",
        EN: "Perfect, I prefer a video format and a simple exchange.",
        ES: "Perfecto, prefiero un formato de video y un intercambio sencillo.",
        IT: "Perfetto, preferisco un formato video e uno scambio semplice.",
        DE: "Perfekt, ich bevorzuge ein Videoformat und einen einfachen Tausch.",
        JA: "素晴らしいです。ビデオ通話形式で簡単な交換が希望です。",
        ZH: "太好了，我更倾向于视频形式和简便的交换。"
      },
      "D'accord pour 1 crédit l'heure ! Tu es libre samedi ?": {
        FR: "D'accord pour 1 crédit l'heure ! Tu es libre samedi ?",
        EN: "Agreed for 1 token per hour! Are you free on Saturday?",
        ES: "¡De acuerdo por 1 ficha la hora! ¿Estás libre el sábado?",
        IT: "D'accordo per 1 gettone all'ora! Sei libero sabato?",
        DE: "Einverstanden für 1 Token pro Stunde! Hast du am Samstag Zeit?",
        JA: "1時間1トークンでオッケーです！土曜日は空いていますか？",
        ZH: "同意每小时1个代币！你周六有空吗？"
      },
      "2 séances de piano de 45 min en visio avec partitions fournies. Échange contre 2 Jetons Troco.": {
        FR: "2 séances de piano de 45 min en visio avec partitions fournies. Échange contre 2 Jetons Troco.",
        EN: "2 online piano sessions (45 min each) with sheet music provided. Exchange for 2 Troco Tokens.",
        ES: "2 sesiones de piano de 45 min por videollamada con partituras incluidas. Por 2 Fichas Troco.",
        IT: "2 sessioni di piano da 45 min in video con spartiti inclusi. Scambio per 2 Gettoni Troco.",
        DE: "2 Online-Klaviersitzungen à 45 Min. inkl. Noten. Tausch gegen 2 Troco-Tokens.",
        JA: "オンラインピアノレッスン45分×2回（楽譜付き）。2 Trocoトークンと交換。",
        ZH: "2次45分钟的在线钢琴课（提供乐谱）。交换2个 Troco 代币。"
      },
      "2 séances de piano de 45 min en visio avec partitions fournies. Échange contre 2 Fichas Troco.": {
        FR: "2 séances de piano de 45 min en visio avec partitions fournies. Échange contre 2 Fichas Troco.",
        EN: "2 online piano sessions (45 min each) with sheet music provided. Exchange for 2 Troco Tokens.",
        ES: "2 sesiones de piano de 45 min por videollamada con partituras incluidas. Por 2 Fichas Troco.",
        IT: "2 sessioni di piano da 45 min in video con spartiti inclusi. Scambio per 2 Gettoni Troco.",
        DE: "2 Online-Klaviersitzungen à 45 Min. inkl. Noten. Tausch gegen 2 Troco-Tokens.",
        JA: "オンラインピアノレッスン45分×2回（楽譜付き）。2 Trocoトークンと交換。",
        ZH: "2次45分钟的在线钢琴课（提供乐谱）。交换2个 Troco 代币。"
      },
      "2 séances de 45 min en visio contre 2 Crédits temps (remboursables si indisponibilité).": {
        FR: "2 séances de 45 min en visio contre 2 Crédits temps (remboursables si indisponibilité).",
        EN: "2 online sessions (45 min each) for 2 Time Credits (refundable if unavailable).",
        ES: "2 sesiones de 45 min por videollamada por 2 Créditos de tiempo.",
        IT: "2 sessioni da 45 min in video per 2 Crediti tempo.",
        DE: "2 Online-Sitzungen à 45 Min. für 2 Zeit-Credits.",
        JA: "オンライン45分レッスン×2回、2タイムクレジット。",
        ZH: "2次45分钟在线课程，对价2个时间积分。"
      },

      // Thread 102 (Marc L.)
      "Bonjour ! Tu as besoin d’une perceuse avec forets béton ou bois ?": {
        FR: "Bonjour ! Tu as besoin d’une perceuse avec forets béton ou bois ?",
        EN: "Hello! Do you need a drill with concrete or wood bits?",
        ES: "¡Hola! ¿Necesitas un taladro con brocas para hormigón o madera?",
        IT: "Ciao! Hai bisogno di un trapano con punte per cemento o legno?",
        DE: "Hallo! Brauchst du eine Bohrmaschine mit Beton- oder Holzbohrern?",
        JA: "こんにちは！コンクリート用または木工用のドリル刃が必要ですか？",
        ZH: "你好！你需要配混凝土钻头还是木工钻头的电钻？"
      },
      "Plutôt béton pour poser des étagères murales.": {
        FR: "Plutôt béton pour poser des étagères murales.",
        EN: "Concrete bits, for hanging wall shelves.",
        ES: "Más bien hormigón para colocar estanterías de pared.",
        IT: "Piuttosto cemento per montare mensole a muro.",
        DE: "Eher Beton für die Montage von Wandregalen.",
        JA: "壁掛け棚を取り付けるためコンクリート用をお願いします。",
        ZH: "主要是混凝土钻头，用来装墙壁置物架。"
      },
      "Parfait, je te prépare le coffret complet avec la poignée de sécurité.": {
        FR: "Parfait, je te prépare le coffret complet avec la poignée de sécurité.",
        EN: "Perfect, I'll prepare the full kit with the safety handle for you.",
        ES: "Perfecto, te preparo el maletín completo con la empuñadura de seguridad.",
        IT: "Perfetto, ti preparo la valigetta completa con l'impugnatura di sicurezza.",
        DE: "Perfekt, ich bereite dir den kompletten Koffer mit Sicherheitsgriff vor.",
        JA: "了解です。安全ハンドル付きのフルセットをご用意します。",
        ZH: "好的，我为你准备带安全手柄的完整手提箱。"
      },
      "Prêt gratuit 48h de la perceuse Bosch + coffret forets. Caution virtuelle de 30€ activée pendant la durée du prêt.": {
        FR: "Prêt gratuit 48h de la perceuse Bosch + coffret forets. Caution virtuelle de 30€ activée pendant la durée du prêt.",
        EN: "Free 48h loan of Bosch drill + bit set. Virtual €30 deposit active during loan.",
        ES: "Préstamo gratuito de 48h de taladro Bosch + brocas. Fianza virtual de 30€ activa durante el préstamo.",
        IT: "Prestito gratuito 48h del trapano Bosch + punte. Cauzione virtuale di 30€ attiva durante il prestito.",
        DE: "Kostenloser 48h-Verleih der Bosch-Bohrmaschine + Bohrersatz. Virtuelle Kaution von 30€ während der Leihfrist.",
        JA: "ボッシュドリル＋刃セットの48時間無料貸出。貸出中は仮想デポジット30ユーロが有効になります。",
        ZH: "博世电钻 + 钻头套装48小时免费租借。借用期间启用30欧元虚拟押金。"
      },
      "Perceuse et coffret forets béton prêts. Prêt gratuit avec caution 30€.": {
        FR: "Perceuse et coffret forets béton prêts. Prêt gratuit avec caution 30€.",
        EN: "Drill and concrete bit set ready. Free loan with €30 deposit.",
        ES: "Taladro y brocas de hormigón listos. Préstamo gratis con fianza de 30€.",
        IT: "Trapano e punte per cemento pronti. Prestito gratuito con cauzione 30€.",
        DE: "Bohrmaschine und Betonbohrer bereit. Kostenloser Verleih mit 30€ Kaution.",
        JA: "ドリルとコンクリート用刃の準備完了。保証金30ユーロで無料レンタル。",
        ZH: "电钻和混凝土钻头已准备就绪。30欧元押金免费借用。"
      },
      "Je peux te mettre la perceuse à disposition avec une petite caution de 30€.": {
        FR: "Je peux te mettre la perceuse à disposition avec une petite caution de 30€.",
        EN: "I can provide the drill with a small deposit of €30.",
        ES: "Puedo dejarte el taladro con una pequeña fianza de 30€.",
        IT: "Posso metterti a disposizione il trapano con una piccola cauzione di 30€.",
        DE: "Ich kann dir die Bohrmaschine mit einer kleinen Kaution von 30€ zur Verfügung stellen.",
        JA: "30ユーロの小さな保証金でドリルをお貸しできます。",
        ZH: "我可以为你提供电钻，押金为30欧元。"
      },
      "Oui j'ai aussi les chevilles si besoin.": {
        FR: "Oui j'ai aussi les chevilles si besoin.",
        EN: "Yes, I also have the wall plugs if needed.",
        ES: "Sí, también tengo los tacos si es necesario.",
        IT: "Sì, ho anche i tasselli se servono.",
        DE: "Ja, ich habe auch Dübel falls nötig.",
        JA: "はい、必要であればアンカープラグもあります。",
        ZH: "是的，如果需要的话我也有膨胀螺栓。"
      },

      // Thread 103 (Karim B.)
      "Salut ! Je peux réparer ton écran d’iPhone 13 dans la journée si tu veux.": {
        FR: "Salut ! Je peux réparer ton écran d’iPhone 13 dans la journée si tu veux.",
        EN: "Hi! I can replace your iPhone 13 screen today if you'd like.",
        ES: "¡Hola! Puedo reparar la pantalla de tu iPhone 13 hoy mismo si quieres.",
        IT: "Ciao! Posso riparare lo schermo del tuo iPhone 13 in giornata se vuoi.",
        DE: "Hallo! Ich kann dein iPhone 13 Display noch heute reparieren wenn du möchtest.",
        JA: "こんにちは！ご希望なら本日中にiPhone 13の画面を修理できますよ。",
        ZH: "你好！如果你愿意，我今天内就可以为你更换 iPhone 13 屏幕。"
      },
      "Top ! C’est un écran d’origine garanti ?": {
        FR: "Top ! C’est un écran d’origine garanti ?",
        EN: "Awesome! Is it an authentic OEM screen with warranty?",
        ES: "¡Genial! ¿Es una pantalla original garantizada?",
        IT: "Ottimo! È uno schermo originale garantito?",
        DE: "Klasse! Ist das ein originales Display mit Garantie?",
        JA: "最高です！保証付きの純正ディスプレイですか？",
        ZH: "太棒了！是有保修的原装正品屏幕吗？"
      },
      "Remplacement écran d’origine iPhone 13 + test d’étanchéité Paris 11ème. Échange contre 25€.": {
        FR: "Remplacement écran d’origine iPhone 13 + test d’étanchéité Paris 11ème. Échange contre 25€.",
        EN: "Original iPhone 13 screen replacement + waterproof seal test Paris 11th. Exchange for €25.",
        ES: "Sustitución de pantalla original iPhone 13 + prueba de estanqueidad París 11. Por 25€.",
        IT: "Sostituzione schermo originale iPhone 13 + test impermeabilità Parigi 11°. Per 25€.",
        DE: "Original iPhone 13 Display-Austausch + Dichtigkeitsprüfung Paris 11. Tausch gegen 25€.",
        JA: "iPhone 13純正画面交換＋防水テスト（パリ11区）。25ユーロと交換。",
        ZH: "iPhone 13 原装屏幕更换 + 防水测试（巴黎11区）。对价25欧元。"
      },
      "D'accord pour 25€ avec changement d'écran d'origine.": {
        FR: "D'accord pour 25€ avec changement d'écran d'origine.",
        EN: "Agreed for €25 with genuine screen replacement.",
        ES: "De acuerdo por 25€ con cambio de pantalla original.",
        IT: "D'accordo per 25€ con cambio schermo originale.",
        DE: "Einverstanden für 25€ inkl. originalem Display-Tausch.",
        JA: "純正画面交換込みで25ユーロで承知しました。",
        ZH: "同意25欧元更换原装正品屏幕。"
      },
      "Je peux intervenir rapidement, mais j’ai besoin du modèle exact du téléphone et du type de panne.": {
        FR: "Je peux intervenir rapidement, mais j’ai besoin du modèle exact du téléphone et du type de panne.",
        EN: "I can help quickly, but I need the exact phone model and breakdown type.",
        ES: "Puedo intervenir rápidamente, pero necesito el modelo exacto del teléfono y el tipo de fallo.",
        IT: "Posso intervenire rapidamente, ma ho bisogno del modello esatto del telefono e del tipo di guasto.",
        DE: "Ich kann schnell helfen, brauche aber das genaue Handymodell und die Art des Schadens.",
        JA: "迅速に対応できますが、正確なスマホのモデルと故障の種類が必要です。",
        ZH: "我可以快速修复，但我需要确切的手机型号和故障类型。"
      },
      "Envoie-moi le modèle exact et la panne à traiter.": {
        FR: "Envoie-moi le modèle exact et la panne à traiter.",
        EN: "Send me the exact model and the issue to fix.",
        ES: "Envíame el modelo exacto y el fallo a reparar.",
        IT: "Mandami il modello esatto e il guasto da riparare.",
        DE: "Schick mir das genaue Modell und den Fehler.",
        JA: "正確なモデル番号と故障内容を送ってください。",
        ZH: "发给我准确的型号和具体的故障情况。"
      },

      // Thread 104 (Camille & Lucas)
      "Bonjour ! On adorerait échanger notre studio au Vieux-Port de Marseille contre ton appartement à Paris le temps d’un long week-end !": {
        FR: "Bonjour ! On adorerait échanger notre studio au Vieux-Port de Marseille contre ton appartement à Paris le temps d’un long week-end !",
        EN: "Hello! We would love to swap our Marseille Old Port studio with your Paris apartment for a long weekend!",
        ES: "¡Hola! ¡Nos encantaría intercambiar nuestro estudio en el Puerto Viejo de Marsella por tu piso en París!",
        IT: "Ciao! Ci piacerebbe scambiare il nostro monolocale al Porto Vecchio di Marsiglia con il tuo appartamento a Parigi!",
        DE: "Hallo! Wir würden gerne unser Studio am Alten Hafen von Marseille gegen deine Wohnung in Paris für ein langes Wochenende tauschen!",
        JA: "こんにちは！連休中にマルセイユ旧港のスタジオとパリのアパートをホームスワップしませんか！",
        ZH: "你好！我们非常希望能用马赛老港的单身公寓和你在巴黎的公寓互换度过一个长周末！"
      },
      "Excellente idée ! Les dates du 20 mai fonctionnent très bien.": {
        FR: "Excellente idée ! Les dates du 20 mai fonctionnent très bien.",
        EN: "Great idea! The dates around May 20th work very well for me.",
        ES: "¡Excelente idea! Las fechas del 20 de mayo me van muy bien.",
        IT: "Ottima idea! Le date del 20 maggio vanno benissimo.",
        DE: "Ausgezeichnete Idee! Der 20. Mai passt mir sehr gut.",
        JA: "素晴らしいアイデアですね！5月20日の日程でぜひお願いします。",
        ZH: "绝妙的主意！5月20日前后的日期对我来说非常合适。"
      },
      "Échange réciproque 3 nuitées (Studio Marseille Vieux-Port vs Studio Paris Marais). Sans aucun frais.": {
        FR: "Échange réciproque 3 nuitées (Studio Marseille Vieux-Port vs Studio Paris Marais). Sans aucun frais.",
        EN: "Mutual 3-night home swap (Marseille Old Port Studio vs Paris Marais Studio). Free of charge.",
        ES: "Intercambio mutuo de 3 noches (Estudio Marsella Puerto Viejo vs Estudio París Marais). Sin ningún coste.",
        IT: "Scambio reciproco di 3 notti (Monolocale Marsiglia vs Monolocale Parigi Marais). Senza costi.",
        DE: "Gegenseitiger 3-Nächte-Tausch (Studio Marseille Alter Hafen vs. Studio Paris Marais). Kostenlos.",
        JA: "相互3泊ホームスワップ（マルセイユ旧港スタジオ vs パリ・マレ地区スタジオ）。手数料完全無料。",
        ZH: "互换3晚住宿（马赛老港公寓 vs 巴黎玛黑区公寓）。完全免费。"
      },
      "Super ! Échange d'appartement confirmé pour le week-end du 20 mai !": {
        FR: "Super ! Échange d'appartement confirmé pour le week-end du 20 mai !",
        EN: "Awesome! Apartment swap confirmed for the weekend of May 20th!",
        ES: "¡Genial! ¡Intercambio de piso confirmado para el fin de semana del 20 de mayo!",
        IT: "Fantastico! Scambio appartamento confermato per il fine settimana del 20 maggio!",
        DE: "Super! Wohnungstausch für das Wochenende des 20. Mai bestätigt!",
        JA: "最高です！5月20日の週末のアパート交換が確定しました！",
        ZH: "太棒了！5月20日周末的公寓互换已确认！"
      }
    };

    if (knownMessageTranslations[rawText] && knownMessageTranslations[rawText][targetLang]) {
      return knownMessageTranslations[rawText][targetLang];
    }

    const normalizedRaw = rawText.replace(/[’']/g, "'").trim();
    for (const [k, v] of Object.entries(knownMessageTranslations)) {
      if (k.replace(/[’']/g, "'").trim() === normalizedRaw && v[targetLang]) {
        return v[targetLang];
      }
    }

    if (rawText.includes("Début de discussion pour")) {
      const listingTitle = rawText.replace("Début de discussion pour", "").trim();
      const localizedTitle = getListingTitleTranslation(listingTitle, targetLang);
      const startTemplates = {
        FR: `Début de discussion pour ${localizedTitle}`,
        EN: `Start of discussion for ${localizedTitle}`,
        ES: `Inicio de conversación para ${localizedTitle}`,
        IT: `Inizio discussione per ${localizedTitle}`,
        DE: `Beginn der Diskussion für ${localizedTitle}`,
        JA: `「${localizedTitle}」の会話の開始`,
        ZH: `关于“${localizedTitle}”的讨论开始`
      };
      if (startTemplates[targetLang]) return startTemplates[targetLang];
    }

    if (rawText.includes("Je peux te proposer un échange fluide sur")) {
      const titleMatch = rawText.match(/«\s*(.*?)\s*»/) || rawText.match(/"\s*(.*?)\s*"/) || rawText.match(/“\s*(.*?)\s*”/);
      const listingTitle = titleMatch ? titleMatch[1] : '';
      const localizedTitle = getListingTitleTranslation(listingTitle, targetLang);
      const propTemplates = {
        FR: `Bonjour ! Je peux te proposer un échange fluide sur « ${localizedTitle} ».`,
        EN: `Hello! I can offer a smooth exchange regarding "${localizedTitle}".`,
        ES: `¡Hola! Puedo ofrecerte un intercambio fluido en "${localizedTitle}".`,
        IT: `Ciao! Posso proporti uno scambio fluido per "${localizedTitle}".`,
        DE: `Hallo! Ich kann einen reibungslosen Tausch für "${localizedTitle}" anbieten.`,
        JA: `こんにちは！「${localizedTitle}」に関するスムーズな交換を提案できます。`,
        ZH: `你好！我可以就“${localizedTitle}”为你提供顺畅的交换。`
      };
      if (propTemplates[targetLang]) return propTemplates[targetLang];
    }

    let autoTranslated = rawText;
    const phraseDictionary = {
      ES: [
        [/\bBonjour\b/gi, "¡Hola!"],
        [/\bSalut\b/gi, "¡Hola!"],
        [/\bHello\b/gi, "¡Hola!"],
        [/\bMerci\b/gi, "¡Gracias!"],
        [/\bParfait\b/gi, "Perfecto"],
        [/\bSuper\b/gi, "Genial"],
        [/\bTop\b/gi, "Estupendo"],
        [/\bOui\b/gi, "Sí"],
        [/\bNon\b/gi, "No"],
        [/\bD'accord\b/gi, "De acuerdo"],
        [/\bJetons?\b/gi, "Fichas"],
        [/\bJeton Troco\b/gi, "Ficha Troco"],
        [/\bCrédits?\b/gi, "Créditos"],
        [/\bvisio\b/gi, "videollamada"],
        [/\bformation\b/gi, "formación"],
        [/\bsemaine\b/gi, "semana"],
        [/\bsamedi\b/gi, "sábado"],
        [/\bvendredi\b/gi, "viernes"],
        [/\bdimanche\b/gi, "domingo"],
        [/\bmatin\b/gi, "mañana"],
        [/\bsoir\b/gi, "noche"],
        [/\bheure\b/gi, "hora"],
        [/\bheures\b/gi, "horas"],
        [/\béchange\b/gi, "intercambio"],
        [/\bgratuit\b/gi, "gratuito"],
        [/\bcaution\b/gi, "fianza"],
      ],
      EN: [
        [/\bBonjour\b/gi, "Hello!"],
        [/\bSalut\b/gi, "Hi!"],
        [/\bHello\b/gi, "Hello!"],
        [/\bMerci\b/gi, "Thanks!"],
        [/\bParfait\b/gi, "Perfect"],
        [/\bSuper\b/gi, "Great"],
        [/\bTop\b/gi, "Awesome"],
        [/\bOui\b/gi, "Yes"],
        [/\bNon\b/gi, "No"],
        [/\bD'accord\b/gi, "Agreed"],
        [/\bJetons?\b/gi, "Tokens"],
        [/\bJeton Troco\b/gi, "Troco Token"],
        [/\bCrédits?\b/gi, "Credits"],
        [/\bvisio\b/gi, "video call"],
        [/\bformation\b/gi, "training"],
        [/\bsamedi\b/gi, "Saturday"],
        [/\bvendredi\b/gi, "Friday"],
        [/\bheure\b/gi, "hour"],
        [/\bheures\b/gi, "hours"],
        [/\béchange\b/gi, "exchange"],
        [/\bgratuit\b/gi, "free"],
        [/\bcaution\b/gi, "deposit"],
      ],
      DE: [
        [/\bBonjour\b/gi, "Hallo!"],
        [/\bSalut\b/gi, "Hallo!"],
        [/\bMerci\b/gi, "Danke!"],
        [/\bParfait\b/gi, "Perfekt"],
        [/\bSuper\b/gi, "Super"],
        [/\bOui\b/gi, "Ja"],
        [/\bNon\b/gi, "Nein"],
        [/\bD'accord\b/gi, "Einverstanden"],
        [/\bJetons?\b/gi, "Tokens"],
        [/\bvisio\b/gi, "Videoanruf"],
        [/\béchange\b/gi, "Tausch"],
        [/\bcaution\b/gi, "Kaution"],
      ],
      IT: [
        [/\bBonjour\b/gi, "Ciao!"],
        [/\bSalut\b/gi, "Ciao!"],
        [/\bMerci\b/gi, "Grazie!"],
        [/\bParfait\b/gi, "Perfetto"],
        [/\bSuper\b/gi, "Fantastico"],
        [/\bOui\b/gi, "Sì"],
        [/\bNon\b/gi, "No"],
        [/\bD'accord\b/gi, "D'accordo"],
        [/\bJetons?\b/gi, "Gettoni"],
        [/\bvisio\b/gi, "videochiamata"],
        [/\béchange\b/gi, "scambio"],
        [/\bcaution\b/gi, "cauzione"],
      ],
      JA: [
        [/\bBonjour\b/gi, "こんにちは！"],
        [/\bSalut\b/gi, "こんにちは！"],
        [/\bMerci\b/gi, "ありがとうございます！"],
        [/\bParfait\b/gi, "完璧です"],
        [/\bSuper\b/gi, "素晴らしいです"],
        [/\bOui\b/gi, "はい"],
        [/\bD'accord\b/gi, "承知しました"],
        [/\bJetons?\b/gi, "トークン"],
        [/\bvisio\b/gi, "ビデオ通話"],
      ],
      ZH: [
        [/\bBonjour\b/gi, "你好！"],
        [/\bSalut\b/gi, "你好！"],
        [/\bMerci\b/gi, "谢谢！"],
        [/\bParfait\b/gi, "太好了"],
        [/\bSuper\b/gi, "太棒了"],
        [/\bOui\b/gi, "是的"],
        [/\bD'accord\b/gi, "好的"],
        [/\bJetons?\b/gi, "代币"],
        [/\bvisio\b/gi, "视频在线"],
      ]
    };

    if (phraseDictionary[targetLang]) {
      for (const [pattern, replacement] of phraseDictionary[targetLang]) {
        autoTranslated = autoTranslated.replace(pattern, replacement);
      }
    }

    return formatCompensation(autoTranslated);
  };

  const formatTokenCount = (count, lang) => {
    const c = Number(count) || 0;
    if (lang === 'FR') return c <= 1 ? `${c} Jeton` : `${c} Jetons`;
    if (lang === 'EN') return c <= 1 ? `${c} Token` : `${c} Tokens`;
    if (lang === 'ES') return c <= 1 ? `${c} Ficha` : `${c} Fichas`;
    if (lang === 'IT') return c <= 1 ? `${c} Gettone` : `${c} Gettoni`;
    if (lang === 'DE') return c <= 1 ? `${c} Token` : `${c} Tokens`;
    if (lang === 'JA') return `${c} トークン`;
    if (lang === 'ZH') return `${c} 个代币`;
    return c <= 1 ? `${c} Token` : `${c} Tokens`;
  };

  const getBioTranslation = (bioText, targetLang, forceOriginal = false) => {
    if (!bioText || forceOriginal || targetLang === 'FR') return bioText;
    const bioMap = {
      FR: "Créateur de contenus, développeur Python et passionné de musique. Je propose des services flexibles et des échanges de qualité.",
      EN: "Content creator, Python developer, and music enthusiast. I offer flexible services and high-quality exchanges.",
      ES: "Creador de contenido, desarrollador de Python y apasionado de la música. Ofrezco servicios flexibles e intercambios de calidad.",
      IT: "Creatore di contenuti, sviluppatore Python e appassionato di musica. Offro servizi flessibili e scambi di qualità.",
      DE: "Content Creator, Python-Entwickler und Musikliebhaber. Ich biete flexible Dienstleistungen und hochwertige Tausche.",
      JA: "コンテンツクリエイター、Pythonデベロッパー、音楽愛好家。柔軟なサービスと高品質な交換を提供しています。",
      ZH: "内容创作者、Python 开发者及音乐爱好者。我提供灵活的服务与高质量的互换。"
    };
    return bioMap[targetLang] || bioText;
  };

  const getReviewTranslation = (reviewText, targetLang, forceOriginal = false) => {
    if (!reviewText || forceOriginal || targetLang === 'FR') return reviewText;
    const reviewMap = {
      "Super session de cours ! Explications très claires et très sympa.": {
        FR: "Super session de cours ! Explications très claires et très sympa.",
        EN: "Great lesson session! Very clear explanations and super friendly.",
        ES: "¡Gran sesión de clase! Explicaciones muy claras y muy amable.",
        IT: "Ottima lezione! Spiegazioni molto chiare e molto simpatico.",
        DE: "Tolle Unterrichtsstunde! Sehr klare Erklärungen und sehr nett.",
        JA: "素晴らしいレッスンでした！説明がとても明確で親切でした。",
        ZH: "非常棒的课程！解释非常清晰，非常友善。"
      },
      "Matériel en parfait état. Rendu comme prévu. Impeccable.": {
        FR: "Matériel en parfait état. Rendu comme prévu. Impeccable.",
        EN: "Equipment in perfect condition. Returned on time. Impeccable.",
        ES: "Equipo en perfecto estado. Devuelto a tiempo. Impecable.",
        IT: "Attrezzatura in perfette condizioni. Restituita nei tempi. Impeccabile.",
        DE: "Gerät in einwandfreiem Zustand. Pünktlich zurückgegeben. Makellos.",
        JA: "完璧な状態の機材でした。予定通り返却されました。素晴らしい。",
        ZH: "设备完好无损。按时归还。无可挑剔。"
      },
      "Échange ultra fluide, Sofia est pédagogue et très à l'écoute. Les 3 séances se sont parfaitement déroulées, je recommande à 100%.": {
        FR: "Échange ultra fluide, Sofia est pédagogue et très à l'écoute. Les 3 séances se sont parfaitement déroulées, je recommande à 100%.",
        EN: "Ultra-smooth exchange, Sofia is a great teacher and very attentive. All 3 sessions went perfectly, 100% recommended.",
        ES: "Intercambio súper fluido, Sofia es muy pedagógica y atenta. Las 3 sesiones salieron perfectas, recomiendo al 100%.",
        IT: "Scambio ultra fluido, Sofia è pedagogica e molto attenta. Le 3 sessioni sono andate perfettamente, raccomando al 100%.",
        DE: "Super reibungsloser Tausch, Sofia ist sehr pädagogisch und aufmerksam. Alle 3 Sitzungen liefen perfekt, 100% Empfehlung.",
        JA: "非常にスムーズな交換でした。ソフィアさんはとても教え方が上手で親切です。3回のセッション全てが完璧で、100%おすすめします。",
        ZH: "极其顺畅的交流，索菲亚教学水平高且非常细心。3次课程都非常顺利，100%推荐。"
      },
      "Prêt rapide et propre, caution virtuelle bien gérée. Matériel en parfait état, rendu sans accroc dans les délais.": {
        FR: "Prêt rapide et propre, caution virtuelle bien gérée. Matériel en parfait état, rendu sans accroc dans les délais.",
        EN: "Fast and clean loan, virtual deposit handled smoothly. Equipment in perfect condition, returned on time without issues.",
        ES: "Préstamo rápido y limpio, fianza virtual bien gestionada. Equipo en perfecto estado, devuelto a tiempo sin problemas.",
        IT: "Prestito veloce e pulito, deposito virtuale ben gestito. Attrezzatura in perfette condizioni, restituita in tempo senza intoppi.",
        DE: "Schneller und sauberer Verleih, virtuelle Kaution gut verwaltet. Gerät in einwandfreiem Zustand, pünktlich zurückgegeben.",
        JA: "迅速で綺麗な貸出、バーチャル保証金の管理もスムーズでした。機材も完璧な状態で期限内に返却されました。",
        ZH: "快捷清洁的租借，虚拟押金管理妥当。设备完好无损，按时顺利归还。"
      },
      "Intervention programmée cette semaine, créneau confirmé par Karim. Échange de modèle et de devis en cours dans le chat.": {
        FR: "Intervention programmée cette semaine, créneau confirmé par Karim. Échange de modèle et de devis en cours dans le chat.",
        EN: "Service scheduled this week, time slot confirmed by Karim. Model details and quote being discussed in chat.",
        ES: "Intervención programada esta semana, franja confirmada por Karim. Intercambio de modelo y presupuesto en curso en el chat.",
        IT: "Intervento programmato questa settimana, orario confermato da Karim. Scambio di modello e preventivo in corso nella chat.",
        DE: "Einsatz diese Woche geplant, Zeitfenster von Karim bestätigt. Austausch von Modell und Angebot im Chat im Gange.",
        JA: "今週作業予定、カリムさんとの日時確認済み。モデルと見積もりの話し合いがチャットで進行中。",
        ZH: "本周已安排服务，Karim 已确认时间段。型号和报价正在聊天中沟通。"
      },
      "Séance visio planifiée vendredi à 18h00. Conditions validées : 1 Crédit + 10€.": {
        FR: "Séance visio planifiée vendredi à 18h00. Conditions validées : 1 Jeton + 10€.",
        EN: "Video session scheduled Friday at 6:00 PM. Confirmed terms: 1 Token + €10.",
        ES: "Sesión en visio planificada el viernes a las 18:00. Condiciones validadas: 1 Ficha + 10€.",
        IT: "Sessione video pianificata venerdì alle 18:00. Condizioni verificate: 1 Gettone + 10€.",
        DE: "Video-Sitzung für Freitag um 18:00 Uhr geplant. Bedingungen bestätigt: 1 Token + 10€.",
        JA: "金曜日18:00にビデオセッションが予定されています。確認済み条件：1トークン＋10€。",
        ZH: "已预约周五 18:00 视频课程。已确认条件：1个代币 + 10欧。"
      }
    };
    if (reviewMap[reviewText] && reviewMap[reviewText][targetLang]) {
      return reviewMap[reviewText][targetLang];
    }
    return reviewText;
  };

  const formatCompensation = (comp) => {
    if (!comp) return '';

    const knownCompMap = {
      "15€ séance ou 1 Crédit": {
        FR: "15€ / séance ou 1 Jeton",
        EN: "€15 / session or 1 Token",
        ES: "15€ / sesión o 1 Ficha",
        IT: "15€ / sessione o 1 Gettone",
        DE: "15€ / Sitzung oder 1 Token",
        JA: "1セッション15ユーロまたは1トークン",
        ZH: "每节15欧或1个代币"
      },
      "15€ séance ou 1 Jeton": {
        FR: "15€ / séance ou 1 Jeton",
        EN: "€15 / session or 1 Token",
        ES: "15€ / sesión o 1 Ficha",
        IT: "15€ / sessione o 1 Gettone",
        DE: "15€ / Sitzung oder 1 Token",
        JA: "1セッション15ユーロまたは1トークン",
        ZH: "每节15欧或1个代币"
      },
      "15€ séance ou 1 Tokens": {
        FR: "15€ / séance ou 1 Jeton",
        EN: "€15 / session or 1 Token",
        ES: "15€ / sesión o 1 Ficha",
        IT: "15€ / sessione o 1 Gettone",
        DE: "15€ / Sitzung oder 1 Token",
        JA: "1セッション15ユーロまたは1トークン",
        ZH: "每节15欧或1个代币"
      },
      "15€ séance ou 1 Fichas": {
        FR: "15€ / séance ou 1 Jeton",
        EN: "€15 / session or 1 Token",
        ES: "15€ / sesión o 1 Ficha",
        IT: "15€ / sessione o 1 Gettone",
        DE: "15€ / Sitzung oder 1 Token",
        JA: "1セッション15ユーロまたは1トークン",
        ZH: "每节15欧或1个代币"
      },
      "Troc ou 5€ consommables": {
        FR: "Troc ou 5€ consommables",
        EN: "Swap or €5 consumables",
        ES: "Trueque o 5€ consumibles",
        IT: "Baratto o 5€ consumabili",
        DE: "Tausch oder 5€ Verbrauchsmaterial",
        JA: "物物交換または5ユーロ消耗品",
        ZH: "易货或 5 欧易耗品"
      },
      "30€ ou 2 Jetons": {
        FR: "30€ ou 2 Jetons",
        EN: "€30 or 2 Tokens",
        ES: "30€ o 2 Fichas",
        IT: "30€ o 2 Gettoni",
        DE: "30€ oder 2 Tokens",
        JA: "30ユーロまたは2トークン",
        ZH: "30欧或2个代币"
      },
      "1h = 1 Crédit temps (Visio)": {
        FR: "1h = 1 Jeton temps (Visio)",
        EN: "1h = 1 Time Token (Video)",
        ES: "1h = 1 Ficha de tiempo (Visio)",
        IT: "1ora = 1 Gettone tempo (Video)",
        DE: "1 Std = 1 Zeit-Token (Video)",
        JA: "1時間＝1タイムトークン（ビデオ）",
        ZH: "1小时 = 1 时间代币（视频）"
      },
      "3 Crédits temps": {
        FR: "3 Jetons temps",
        EN: "3 Time Tokens",
        ES: "3 Fichas de tiempo",
        IT: "3 Gettoni tempo",
        DE: "3 Zeit-Tokens",
        JA: "3 タイムトークン",
        ZH: "3 时间代币"
      },
      "3 Jetons temps": {
        FR: "3 Jetons temps",
        EN: "3 Time Tokens",
        ES: "3 Fichas de tiempo",
        IT: "3 Gettoni tempo",
        DE: "3 Zeit-Tokens",
        JA: "3 タイムトークン",
        ZH: "3 时间代币"
      },
      "Troc direct + Caution 30€": {
        FR: "Troc direct + Caution 30€",
        EN: "Direct swap + €30 deposit",
        ES: "Trueque directo + Fianza 30€",
        IT: "Baratto diretto + Deposito 30€",
        DE: "Direkter Tausch + 30€ Kaution",
        JA: "直接交換＋30ユーロ保証金",
        ZH: "直接易货 + 30欧押金"
      },
      "Intervention locale / batterie ou écran": {
        FR: "Intervention locale / batterie ou écran",
        EN: "Local repair / battery or screen",
        ES: "Intervención local / batería o pantalla",
        IT: "Intervento locale / batteria o schermo",
        DE: "Reparatur vor Ort / Akku oder Display",
        JA: "現地サポート／バッテリーまたは画面",
        ZH: "现场服务 / 电池或屏幕"
      },
      "2 séances de 45 min en visio contre 2 Crédits temps (remboursables si indisponibilité).": {
        FR: "2 séances de 45 min en visio contre 2 Jetons temps (remboursables si indisponibilité).",
        EN: "2 x 45 min video sessions for 2 Time Tokens (refundable if unavailable).",
        ES: "2 sesiones de 45 min en visio por 2 Fichas de tiempo (reembolsables si hay indisponibilidad).",
        IT: "2 sessioni da 45 min in video per 2 Gettoni tempo (rimborsabili in caso di indisponibilità).",
        DE: "2 x 45 Min. Video-Sitzungen für 2 Zeit-Tokens (rückerstattbar bei Verfügbarkeitsproblemen).",
        JA: "45分間のビデオセッション2回（2タイムトークン、利用不可の場合は返金可）。",
        ZH: "2次45分钟视频课程，兑换2个时间代币（不可用时可退款）。"
      },
      "2h = 2 Jetons": {
        FR: "2h = 2 Jetons",
        EN: "2h = 2 Tokens",
        ES: "2h = 2 Fichas",
        IT: "2h = 2 Gettoni",
        DE: "2 Std = 2 Tokens",
        JA: "2時間＝2トークン",
        ZH: "2小时 = 2 代币"
      },
      "1 session = 1 Jeton": {
        FR: "1 session = 1 Jeton",
        EN: "1 session = 1 Token",
        ES: "1 sesión = 1 Ficha",
        IT: "1 sessione = 1 Gettone",
        DE: "1 Sitzung = 1 Token",
        JA: "1セッション＝1トークン",
        ZH: "1次课程 = 1 代币"
      },
      "2 Jetons ou 35$": {
        FR: "2 Jetons ou 35$",
        EN: "2 Tokens or $35",
        ES: "2 Fichas o 35$",
        IT: "2 Gettoni o 35$",
        DE: "2 Tokens oder 35$",
        JA: "2トークンまたは35ドル",
        ZH: "2个代币或35美元"
      },
      "Échange direct / Swap": {
        FR: "Échange direct / Swap",
        EN: "Direct Exchange / Swap",
        ES: "Intercambio directo / Trueque",
        IT: "Scambio diretto / Baratto",
        DE: "Direkttausch",
        JA: "直接交換／スワップ",
        ZH: "直接交换 / 互换"
      }
    };

    if (knownCompMap[comp] && knownCompMap[comp][currentLang]) {
      return knownCompMap[comp][currentLang];
    }

    let res = comp;
    const tokenWord = t('tokens');
    res = res.replace(/\b(Jetons?|Crédits?|Tokens?|Fichas?|Gettoni?)\b/gi, tokenWord);
    if (res.includes('Échange direct') || res.includes('Swap')) {
      res = res.replace(/Échange direct \/ Swap|Échange direct|Swap/gi, t('exchange'));
    }
    if (currentLang === 'ES') res = res.replace(/\btemps\b/gi, 'de tiempo');
    else if (currentLang === 'EN') res = res.replace(/\btemps\b/gi, 'time');
    else if (currentLang === 'IT') res = res.replace(/\btemps\b/gi, 'tempo');
    else if (currentLang === 'DE') res = res.replace(/\btemps\b/gi, 'Zeit');
    else if (currentLang === 'JA') res = res.replace(/\btemps\b/gi, '時間');
    else if (currentLang === 'ZH') res = res.replace(/\btemps\b/gi, '时间');
    return res;
  };
  const [showingOriginalListings, setShowingOriginalListings] = useState({});
  const [showingOriginalMessages, setShowingOriginalMessages] = useState({});
  const [showingOriginalBio, setShowingOriginalBio] = useState(false);
  const profileAvatarFileInputRef = useRef(null);

  const compressImage = (file, maxWidth = 300, maxHeight = 300, quality = 0.75) => {
    return new Promise((resolve) => {
      if (!file || !file.type || !file.type.startsWith('image/')) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
          } catch (err) {
            resolve(uploadEvent.target.result);
          }
        };
        img.onerror = () => resolve(uploadEvent.target.result);
        img.src = uploadEvent.target.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarFileUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const compressedDataUrl = await compressImage(file, 300, 300, 0.75);
      if (compressedDataUrl) {
        setProfileDraft(prev => ({ ...prev, avatar: compressedDataUrl }));
        setProfile(prev => ({ ...prev, avatar: compressedDataUrl }));
      }
    }
  };
  const [showingOriginalReviews, setShowingOriginalReviews] = useState({});
  const toggleOriginalReview = (id) => setShowingOriginalReviews(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleOriginalMessage = (id) => setShowingOriginalMessages(prev => ({ ...prev, [id]: !prev[id] }));

  const toggleOriginalListing = (id, event) => {
    if (event) event.stopPropagation();
    setShowingOriginalListings(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // ---- LOGIQUE DE TRADUCTION UNIVERSELLE ----
  // Règle appliquée à 100% des annonces :
  //   1. forceOriginal = true → renvoie TOUJOURS le titre/description natif
  //   2. item.translations[targetLang] disponible → traduction exacte dans la langue de l'interface
  //   3. targetLang === nativeLang → contenu natif
  //   4. fallback item.translations['EN'] si présent
  //   5. dernier recours → contenu natif
  const getListingDisplayContent = (item, targetLang, forceOriginal = false) => {
    if (!item) return { title: '', description: '' };
    const nativeLang = item.nativeLang || 'FR';

    // Mode "voir l'original" forcé -> renvoyer immédiatement les textes natifs
    if (forceOriginal) {
      return { title: item.title, description: item.description || '' };
    }

    const trans = item.translations;
    // Si une traduction existe pour la langue actuelle de l'interface -> l'utiliser
    if (trans && trans[targetLang] && trans[targetLang].title) {
      return { title: trans[targetLang].title, description: trans[targetLang].description || item.description || '' };
    }

    // Si la langue de l'interface est la langue native de l'annonce -> texte natif
    if (targetLang === nativeLang) {
      return { title: item.title, description: item.description || '' };
    }

    // Fallback vers l'anglais si disponible
    if (trans && trans['EN'] && trans['EN'].title && targetLang !== 'EN') {
      return { title: trans['EN'].title, description: trans['EN'].description || item.description || '' };
    }

    // Dernier recours : contenu natif
    return { title: item.title, description: item.description || '' };
  };

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
  const [activeTab, setActiveTab] = useState('feed');
  const [profile, setProfile] = useState(() => {
    const saved = window.localStorage.getItem('troco_user_profile');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return {
      name: 'MATEO POLO',
      username: '@mateopolo',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      bio: 'Créateur de contenus, développeur Python et passionné de musique. Je propose des services flexibles et des échanges de qualité.',
      location: 'Paris, France',
      languages: ['FR', 'EN', 'ES', 'IT'],
      loginMethod: 'Google',
      euroBalance: 128,
      trocoTokens: 12,
    };
  });
  const [profileDraft, setProfileDraft] = useState(profile);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [skills, setSkills] = useState([
    'Prod musicale & Ableton Live',
    'Scripts Python',
  ]);
  const [equipment, setEquipment] = useState([
    'MacBook Pro 14',
    'Microphone USB',
  ]);
  const [skillInput, setSkillInput] = useState('');
  const [equipmentInput, setEquipmentInput] = useState('');
  const [formatFilter, setFormatFilter] = useState('all');
  const [selectedChat, setSelectedChat] = useState(null);
  const [readChats, setReadChats] = useState(() => {
    try {
      const saved = window.localStorage.getItem('troco_read_chats');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch (_) {}
    return new Set();
  }); // IDs des convos déjà lues

  useEffect(() => {
    try {
      window.localStorage.setItem('troco_read_chats', JSON.stringify([...readChats]));
    } catch (_) {}
  }, [readChats]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [walletTab, setWalletTab] = useState('cash');
  const [walletAmount, setWalletAmount] = useState(20);
  const [paymentMode, setPaymentMode] = useState('hybrid');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  // eslint-disable-next-line no-unused-vars
  const [selectedMapItem, setSelectedMapItem] = useState(null);
  const [isBoostModalOpen, setIsBoostModalOpen] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [isEditingListing, setIsEditingListing] = useState(false);
  const [editingOriginalListing, setEditingOriginalListing] = useState(null);
  const [boostingListing, setBoostingListing] = useState(null);
  const [boostMessage, setBoostMessage] = useState('');
  const [mapCenter] = useState([48.8566, 2.3522]);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return window.localStorage.getItem('troco_is_authenticated') === 'true';
  });
  // eslint-disable-next-line no-unused-vars
  const [authModalOpen, setAuthModalOpen] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [authMethod, setAuthMethod] = useState('Google');
  const [authStep, setAuthStep] = useState('select'); // 'select' | 'phone' | 'sms-verify' | 'email' | 'email-sent'
  const [authPhoneNumber, setAuthPhoneNumber] = useState('+336');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authModeEmail, setAuthModeEmail] = useState('password'); // 'password' | 'magic-link'
  const [authSmsCode, setAuthSmsCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authTab, setAuthTab] = useState('login'); // 'login' | 'signup'
  const [signupName, setSignupName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmailOrPhone, setSignupEmailOrPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupLocation, setSignupLocation] = useState('Paris, France');
  const [signupBio, setSignupBio] = useState('');
  const [signupAvatar, setSignupAvatar] = useState('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80');
  const [signupSkills, setSignupSkills] = useState([]);
  const [signupLanguages, setSignupLanguages] = useState(['FR']);
  const [signupSkillInput, setSignupSkillInput] = useState('');
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // ---- ÉTATS MODÉRATION & PANEL ADMINISTRATEUR ----
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState({ listing: null, user: null });
  const [allReports, setAllReports] = useState([]);
  const [allFirestoreUsers, setAllFirestoreUsers] = useState([]);

  // ---- ÉTATS PAIEMENT & FACTURATION (BLOC 5) ----
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentModalConfig, setPaymentModalConfig] = useState({
    mode: 'pack-tokens',
    payload: null,
  });
  const [isTransactionsModalOpen, setIsTransactionsModalOpen] = useState(false);
  // ---- ÉTATS CADRE JURIDIQUE, CGU & RGPD (BLOC 6) ----
  const [isPrivacyCenterOpen, setIsPrivacyCenterOpen] = useState(false);
  const [isCguViewerOpen, setIsCguViewerOpen] = useState(false);
  // ---- ÉTAT DU PARCOURS D'ONBOARDING INTERACTIF (CHANTIER 1) ----
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
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
          } catch (e) {}
        }
      }, (err) => console.warn('[Firestore] Transactions listener:', err));
      return () => unsub();
    } catch (e) {
      console.warn('Transactions listener error:', e);
    }
  }, [profile?.uid]);

  // Handler d'ouverture du module de paiement
  const handleOpenPayment = (mode = 'pack-tokens', payload = null) => {
    setPaymentModalConfig({ mode, payload });
    setIsPaymentModalOpen(true);
  };

  // Handler de succès de paiement (crédit solde, enregistrement transaction Firestore)
  const handlePaymentSuccess = async (txData) => {
    const uid = profile?.uid || auth.currentUser?.uid;

    // 1. Mise à jour des soldes de l'utilisateur
    let updatedEuro = profile.euroBalance;
    let updatedTokens = profile.trocoTokens;

    if (txData.mode === 'pack-tokens') {
      updatedTokens += (txData.tokensPurchased || 0);
    } else if (txData.mode === 'topup-cash') {
      updatedEuro += (txData.cashTopUp || 0);
    } else if (txData.mode === 'boost') {
      if (txData.boostDetails?.listingId) {
        setListings(prev => prev.map(item => item.id === txData.boostDetails.listingId ? { ...item, isBoosted: true } : item));
      }
    }

    const updatedProfile = {
      ...profile,
      euroBalance: Number(updatedEuro.toFixed(2)),
      trocoTokens: updatedTokens,
    };
    setProfile(updatedProfile);

    // 2. Sauvegarde de la transaction dans le state local
    const newTxRecord = {
      id: 'tx-' + Date.now(),
      ...txData,
      userId: uid || 'guest',
      userName: profile.name,
      createdAt: new Date().toISOString(),
    };
    setUserTransactions(prev => [newTxRecord, ...prev]);
    try {
      localStorage.setItem('troco_user_transactions', JSON.stringify([newTxRecord, ...userTransactions]));
    } catch (e) {}

    // 3. Persistance sur Firestore users/{uid} et transactions
    if (uid) {
      try {
        await updateDoc(doc(db, 'users', uid), {
          euroBalance: updatedProfile.euroBalance,
          trocoTokens: updatedProfile.trocoTokens,
          updatedAt: serverTimestamp(),
        });
        await addDoc(collection(db, 'transactions'), {
          ...txData,
          userId: uid,
          userName: profile.name,
          userEmail: profile.email || '',
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

  // ---- ÉCOUTE ET SYNCHRONISATION EN TEMPS RÉEL DU PROFIL FIREBASE USERS/{UID} ----
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const uid = firebaseUser.uid;
        const userDocRef = doc(db, 'users', uid);

        // Écoute temps réel des changements de solde, infos et statut CGU du profil
        const unsubDoc = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfile(prev => ({
              ...prev,
              ...data,
              uid: uid,
            }));
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
              euroBalance: 50,
              trocoTokens: 5,
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
            } catch (e) {
              console.warn('[Firestore] Failed to init user doc:', e);
            }
          }
        });

        setIsAuthenticated(true);
        window.localStorage.setItem('troco_is_authenticated', 'true');
        setIsLoadingSession(false);
        return () => unsubDoc();
      } else {
        const hasSession = window.localStorage.getItem('troco_is_authenticated') === 'true';
        if (!hasSession) {
          setIsAuthenticated(false);
        }
        setIsLoadingSession(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // ---- DÉTECTION ET OUVERTURE DU WIZARD D'ONBOARDING POUR NOUVEAUX COMPTES (CHANTIER 1) ----
  useEffect(() => {
    if (isAuthenticated && profile) {
      const needsOnboarding = profile.onboardingCompleted === false || (profile.onboardingCompleted === undefined && profile.uid && profile.uid !== 'demo_mateopolo');
      if (needsOnboarding) {
        setIsOnboardingOpen(true);
      }
    }
  }, [isAuthenticated, profile?.onboardingCompleted, profile?.uid]);

  // ---- FINALISATION DU PARCOURS D'ONBOARDING (CHANTIER 1) ----
  const handleCompleteOnboarding = async (completedData) => {
    const updatedProfile = {
      ...profile,
      ...completedData,
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

    const uid = profile?.uid || auth.currentUser?.uid;
    if (uid) {
      try {
        await setDoc(doc(db, 'users', uid), {
          ...completedData,
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
    setSaveMessage('✨ Bienvenue sur Troco ! Votre profil est configuré.');
    setTimeout(() => setSaveMessage(''), 4000);
  };

  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Veuillez entrer votre email pour valider la connexion :');
      }
      if (email) {
        setAuthLoading(true);
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
            console.error(err);
            setAuthError(err.message || 'Lien invalide ou expiré.');
          })
          .finally(() => setAuthLoading(false));
      }
    }
  }, []);

  useEffect(() => {
    if (!document.getElementById('betclic-badge-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'betclic-badge-styles';
      styleEl.innerHTML = `
        @keyframes betclicBadgeAnim {
          0% { opacity: 0; transform: translateY(8px) scale(0.7); }
          15% { opacity: 1; transform: translateY(0) scale(1.15); }
          80% { opacity: 1; transform: translateY(-8px) scale(1); }
          100% { opacity: 0; transform: translateY(-18px) scale(0.85); }
        }
        @keyframes notifPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 2px 8px rgba(239,68,68,0.5); }
          50% { transform: scale(1.18); box-shadow: 0 4px 14px rgba(239,68,68,0.75); }
        }
        @keyframes slideDownIn {
          0% { opacity: 0; transform: translate(-50%, -24px); }
          100% { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes popupIn {
          0% { opacity: 0; transform: scale(0.85) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes checkPop {
          0% { opacity: 0; transform: scale(0.4); }
          70% { transform: scale(1.15); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes bounceDot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes typingFadeIn {
          0% { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(styleEl);
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
  const [isChatFullscreen, setIsChatFullscreen] = useState(false);
  const [localZoom, setLocalZoom] = useState(false);

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
  const [postStep, setPostStep] = useState(1);
  const [publishMessage, setPublishMessage] = useState('');
  const [tagInputValue, setTagInputValue] = useState('');
  const defaultPostDraft = {
    type: 'offer',
    status: 'active',
    title: '',
    category: 'Cours & Compétences',
    format: 'onsite',
    description: '',
    compensation: 'credits',
    price: '20',
    location: '',
    availability: '',
    caution: '',
    requiresCaution: false,
    cautionAmount: '',
    trocoTokens: '',
    euroAmount: '',
    isUrgent: false,
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

  // ---- CONTRE-PROPOSITION ----
  const [isCounterOfferOpen, setIsCounterOfferOpen] = useState(false);
  const [counterOfferDraft, setCounterOfferDraft] = useState({ euroAmount: '', trocoTokens: '', conditions: '' });
  const [chatStatusOverrides, setChatStatusOverrides] = useState({});

  // ---- GESTION WEBRTC AUDIO/VIDÉO & APPELS TEMPS RÉEL (SIGNALISATION FIRESTORE) ----
  const {
    callState,
    localStream,
    remoteStream,
    incomingCall,
    localVideoRef,
    remoteVideoRef,
    facingMode,
    hasMultipleCameras,
    switchCamera,
    startCall,
    acceptIncomingCall,
    declineIncomingCall,
    endCall,
    toggleMic,
    toggleCam,
    copyInviteLink,
  } = useWebRTC({ profileName: profile.name, selectedChat });

  // ---- ÉTATS APPEL WEBRTC AVANCÉ (PIP, DRAG POINTER EVENTS, SWAP & CHRONO DEAL) ----
  const [isCallPip, setIsCallPip] = useState(false);
  const [isSwapVideo, setIsSwapVideo] = useState(false);
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

  // Chronomètre de Deal en temps réel pendant l'appel (1h = 1 Jeton Troco)
  useEffect(() => {
    let timer = null;
    if (callState.active && !callState.ringing) {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
      setIsCallPip(false);
      setIsSwapVideo(false);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callState.active, callState.ringing]);

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
    } catch (_) {}
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

    const pipWidth = 210;
    const pipHeight = 150;
    const margin = 10;
    const bottomNavOffset = 75;
    const maxX = Math.max(margin, window.innerWidth - pipWidth - margin);
    const maxY = Math.max(margin, window.innerHeight - pipHeight - bottomNavOffset);

    const nextX = Math.max(margin, Math.min(maxX, pipPointerDragRef.current.initialPosX + deltaX));
    const nextY = Math.max(margin, Math.min(maxY, pipPointerDragRef.current.initialPosY + deltaY));

    setPipPosition({ x: nextX, y: nextY });
  };

  const handlePipPointerUp = (e) => {
    if (!pipPointerDragRef.current.isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
    pipPointerDragRef.current.isDragging = false;
  };

  const handlePipPointerCancel = (e) => {
    if (!pipPointerDragRef.current.isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
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

  const handleAcceptIncomingCall = async () => {
    const res = await acceptIncomingCall();
    if (res) {
      const conv = chatsList.find(c => String(c.id) === String(res.chatId)) || {
        id: res.chatId,
        user: res.from,
        listing: 'Appel en direct',
        status: 'active',
        terms: '',
      };
      setSelectedChat(conv);
      setActiveTab('chat');
    }
  };

  // ---- BASE DE DONNÉES MONDIALE — TRADUCTIONS 100% INLINE (item.translations) ----
  // Chaque annonce intègre ses propres traductions. Aucune dépendance externe.
  const mockListings = [

    // ═══════════════════════════════════════
    // 🇫🇷 PARIS, FRANCE (nativeLang: FR)
    // ═══════════════════════════════════════
    {
      id: 1,
      title: "Prêt Perceuse à percussion + coffret forets",
      description: "Perceuse à percussion professionnelle 800W avec coffret complet de forets béton, bois et métal.",
      author: "Marc L.",
      category: "Prêt de Matériel",
      verified: true, rating: 5.0, reviews: 14,
      location: "Paris 11e (À 1.2 km)",
      coordinates: [48.8584, 2.3785],
      type: "onsite", nativeLang: "FR",
      languages: ["FR", "EN"],
      compensation: "Troc ou 5€ consommables",
      image: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=600&q=80",
      video: "https://assets.mixkit.co/videos/preview/mixkit-man-working-with-a-drill-in-a-workshop-43285-large.mp4",
      urgent: true, caution: "Caution 40€",
      translations: {
        EN: { title: "Impact Drill Loan + Bit Set", description: "Heavy-duty 800W impact drill with complete wood, metal and concrete bit kit. Perfect for DIY." },
        ES: { title: "Préstamo de Taladro percutor + Brocas", description: "Taladro percutor 800W con juego completo de brocas para madera, metal y hormigón." },
        IT: { title: "Prestito Trapano a percussione + Set punte", description: "Trapano a percussione 800W con set completo di punte per legno, metallo e cemento." },
        DE: { title: "Schlagbohrmaschinen-Verleih + Bohrersatz", description: "Leistungsstarke 800W Schlagbohrmaschine mit komplettem Bohrersatz für Holz, Metall und Beton." },
        JA: { title: "振動ドリル＆ドリル刃セットの貸出", description: "800W高性能振動ドリルと木工・金属・コンクリート用ドリル刃セット。DIYに最適。" },
        ZH: { title: "冲击钻借用 + 钻头套装", description: "800W 强力冲击钻，配全套木材、金属和混凝土钻头，非常适合 DIY 家装。" },
      },
    },
    {
      id: 2,
      title: "Coaching Musculation à domicile sur mesure",
      description: "Séances personnalisées de renforcement musculaire et conseils en nutrition sportive à Paris et en visio.",
      author: "Nico D.",
      category: "Cours & Compétences",
      verified: true, rating: 4.8, reviews: 22,
      location: "Paris 15e (À 2.4 km)",
      coordinates: [48.8412, 2.2985],
      type: "both", nativeLang: "FR",
      languages: ["FR", "EN"],
      compensation: "15€ séance ou 1 Crédit",
      image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80",
      video: "https://assets.mixkit.co/videos/preview/mixkit-man-training-in-a-gym-41372-large.mp4",
      urgent: false, caution: null,
      translations: {
        EN: { title: "Custom At-Home Fitness Coaching", description: "Personalized strength training and nutrition advice. Tailored workout plans for your goals." },
        ES: { title: "Entrenamiento Personal a Domicilio", description: "Sesiones de musculación a medida y asesoramiento nutricional personalizado." },
        IT: { title: "Personal Trainer a Domicilio su Misura", description: "Lezioni di fitness e pianificazione nutrizionale personalizzata a domicilio." },
        DE: { title: "Individuelles Fitness-Coaching zu Hause", description: "Personalisiertes Krafttraining und Ernährungsberatung für zu Hause." },
        JA: { title: "出張パーソナルボディメイク＆フィットネス", description: "一人ひとりに合わせた筋力トレーニングと栄養指導で目標達成をサポート。" },
        ZH: { title: "上门定制健身与力量辅导", description: "个性化力量训练与营养建议，针对个人目标制定高效健身计划。" },
      },
    },
    {
      id: 3,
      title: "Réparation écran iPhone & Dépannage Express",
      description: "Remplacement écran et batterie iPhone en moins de 30 minutes avec pièces de haute qualité.",
      author: "Jules T.",
      category: "Services & Dépannage",
      verified: true, rating: 4.7, reviews: 29,
      location: "Paris 10e (À 3.1 km)",
      coordinates: [48.8762, 2.3582],
      type: "onsite", nativeLang: "FR",
      languages: ["FR"],
      compensation: "30€ ou 2 Jetons",
      image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80",
      urgent: true, caution: null,
      translations: {
        EN: { title: "iPhone Screen Repair & Express Troubleshooting", description: "Quick iPhone screen and battery replacement in under 30 minutes with certified parts." },
        ES: { title: "Reparación Exprés de Pantalla iPhone", description: "Cambio rápido de pantalla y batería de iPhone en menos de 30 minutos." },
        IT: { title: "Riparazione Schermo iPhone & Assistenza Rapida", description: "Sostituzione rapida schermo e batteria iPhone in meno di 30 minuti con parti certificate." },
        DE: { title: "iPhone Display-Reparatur & Express-Service", description: "Schneller Austausch von iPhone-Displays und Akkus in unter 30 Minuten." },
        JA: { title: "iPhone画面修理＆即日スピードサポート", description: "30分以内の迅速な液晶・バッテリー交換。認定パーツ使用。" },
        ZH: { title: "iPhone 屏幕快修与故障排除", description: "30分钟内快速更换 iPhone 屏幕与电池，使用认证零件。" },
      },
    },
    {
      id: 4,
      title: "Prêt Vélo VTC & Casque de ville",
      description: "Vélo VTC hollandais très confortable en parfait état pour balades urbaines ou trajets quotidiens.",
      author: "Camille V.",
      category: "Prêt de Matériel",
      verified: true, rating: 4.9, reviews: 18,
      location: "Paris 4e (À 4.2 km)",
      coordinates: [48.8543, 2.3578],
      type: "onsite", nativeLang: "FR",
      languages: ["FR"],
      compensation: "1 Jeton / jour",
      image: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=600&q=80",
      urgent: false, caution: "Caution 60€",
      translations: {
        EN: { title: "Hybrid City Bike & Helmet Rental", description: "Very comfortable Dutch city bike in excellent condition for urban commutes and rides." },
        ES: { title: "Préstamo de Bicicleta Híbrida y Casco", description: "Bicicleta holandesa muy cómoda en perfecto estado para desplazamientos urbanos." },
        IT: { title: "Noleggio Bici Ibrida da Città con Casco", description: "Bicicletta da città olandese in ottime condizioni per muoversi in città." },
        DE: { title: "City-Bike-Verleih & Helm", description: "Sehr komfortables holländisches Citybike in perfektem Zustand für Stadtfahrten." },
        JA: { title: "シティサイクル・クロスバイク＆ヘルメット貸出", description: "街乗りに快適なオランダ式クロスバイク。ヘルメット付き。" },
        ZH: { title: "城市混合动力自行车与头盔借用", description: "舒适耐用的城市混合动力自行车，适合日常通勤与城市骑行。" },
      },
    },
    {
      id: 5,
      title: "Dépannage Plomberie & Réparation rapide",
      description: "Intervention rapide pour fuite d'eau, débouchage d'évier et changement de joints.",
      author: "Karim B.",
      category: "Services & Dépannage",
      verified: true, rating: 4.8, reviews: 31,
      location: "Boulogne-Billancourt (À 8.5 km)",
      coordinates: [48.8397, 2.2399],
      type: "onsite", nativeLang: "FR",
      languages: ["FR"],
      compensation: "2 Crédits ou 25€",
      image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=600&q=80",
      urgent: true, caution: null,
      translations: {
        EN: { title: "Emergency Plumbing & Quick Repair", description: "Fast response for water leaks, drain unclogging and seal replacement." },
        ES: { title: "Fontanería de Urgencia y Reparación Rápida", description: "Servicio rápido de fontanería para fugas de agua, desatascos y cambio de juntas." },
        IT: { title: "Servizio Idraulico d'Emergenza", description: "Intervento rapido per perdite d'acqua, disostruzione lavandini e sostituzione guarnizioni." },
        DE: { title: "Notfall-Sanitärdienst & Schnelle Reparatur", description: "Schnelle Hilfe bei Wasserlecks, Rohrverstopfungen und Dichtungsaustausch." },
        JA: { title: "緊急水回り修理サービス", description: "水漏れ・詰まり・パッキン交換など迅速に対応。" },
        ZH: { title: "紧急水管维修上门服务", description: "快速处理漏水、疏通下水道及更换密封圈。" },
      },
    },

    // ═══════════════════════════════════════
    // 🇯🇵 TOKYO, JAPON (nativeLang: JA)
    // ═══════════════════════════════════════
    {
      id: 6,
      title: "日本語会話 & スキル交換レッスン",
      description: "日常会話、ビジネス日本語、文化交流を楽しく学びましょう。経験豊富な講師が担当します。",
      author: "Kenji S.",
      category: "Cours & Compétences",
      verified: true, rating: 5.0, reviews: 38,
      location: "Tokyo, Shinjuku (Japon - 9700 km)",
      coordinates: [35.6762, 139.6503],
      type: "both", nativeLang: "JA",
      languages: ["JA", "EN"],
      compensation: "1h = 1 Jeton",
      image: "https://images.unsplash.com/photo-1528164344705-47542687990d?auto=format&fit=crop&w=600&q=80",
      urgent: false, caution: null,
      translations: {
        FR: { title: "Cours de Conversation Japonaise & Échange de Compétences", description: "Pratiquez le japonais naturel avec un locuteur natif de Tokyo. Tous niveaux bienvenus." },
        EN: { title: "Japanese Conversation & Skill Swap Lesson", description: "Practice natural Japanese conversation with a Tokyo native speaker. All levels welcome." },
        ES: { title: "Clases de Conversación en Japonés e Intercambio", description: "Practica japonés natural con un hablante nativo de Tokio. Todos los niveles." },
        IT: { title: "Lezioni di Conversazione Giapponese e Scambio", description: "Pratica la conversazione in giapponese con un madrelingua di Tokyo. Tutti i livelli." },
        DE: { title: "Japanisch-Konversationskurs & Fähigkeitenaustausch", description: "Üben Sie natürliches Japanisch mit einem Muttersprachler aus Tokio. Alle Niveaus." },
        ZH: { title: "日语日常会话与技能互换课程", description: "与东京母语者进行实战日语口语练习，适合各阶段学员。" },
      },
    },
    {
      id: 7,
      title: "ドローン空撮 & 4K映像編集",
      description: "東京の美しい景観やイベントの4K空撮撮影とCinematic編集を提供します。",
      author: "Ren T.",
      category: "Services & Dépannage",
      verified: true, rating: 4.95, reviews: 21,
      location: "Tokyo, Shibuya (Japon - 9705 km)",
      coordinates: [35.6580, 139.7016],
      type: "both", nativeLang: "JA",
      languages: ["JA", "EN"],
      compensation: "3 Jetons ou 50€",
      image: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=600&q=80",
      urgent: true, caution: null,
      translations: {
        FR: { title: "Prise de vue Drone & Montage Vidéo 4K", description: "Captation aérienne 4K professionnelle avec drone DJI Mavic et montage cinématographique à Tokyo." },
        EN: { title: "4K Drone Aerial Videography & Editing", description: "Professional 4K aerial footage of Tokyo with DJI Mavic drone and cinematic video editing." },
        ES: { title: "Grabación Aérea con Dron 4K y Edición", description: "Filmación aérea profesional en 4K con dron DJI Mavic y montaje cinematográfico en Tokio." },
        IT: { title: "Riprese Aeree con Drone 4K & Montaggio", description: "Video aerei professionali in 4K a Tokyo con drone DJI Mavic e montaggio cinematografico." },
        DE: { title: "4K-Drohnenaufnahmen & Videoschnitt Tokio", description: "Professionelle 4K-Luftaufnahmen in Tokio mit DJI Mavic Drohne und kinematographischer Schnitt." },
        ZH: { title: "无人机航拍与 4K 影视剪辑（东京）", description: "使用 DJI Mavic 专业无人机进行东京 4K 航拍，提供电影质感后期剪辑。" },
      },
    },

    // ═══════════════════════════════════════
    // 🇺🇸 NEW YORK, USA (nativeLang: EN)
    // ═══════════════════════════════════════
    {
      id: 8,
      title: "Professional Portrait Photography Session",
      description: "High-end portrait photo session in Manhattan or remote Lightroom color grading masterclass.",
      author: "Aria T.",
      category: "Services & Dépannage",
      verified: true, rating: 4.9, reviews: 24,
      location: "New York, SoHo (USA - 5830 km)",
      coordinates: [40.7128, -74.0060],
      type: "both", nativeLang: "EN",
      languages: ["EN", "ES"],
      compensation: "3 Jetons ou 40$",
      image: "https://images.unsplash.com/photo-1554048612-b6a482bc67e5?auto=format&fit=crop&w=600&q=80",
      urgent: false, caution: null,
      translations: {
        FR: { title: "Session Photo Portrait Professionnel NYC", description: "Séance photo portrait HD à New York ou coaching Lightroom en visio." },
        ES: { title: "Sesión de Fotografía de Retrato Profesional", description: "Sesión de fotos de retrato en Nueva York o asesoría de edición Lightroom online." },
        IT: { title: "Sessione Fotografica di Ritratto Professionale", description: "Servizio fotografico professionale a New York o consulenza Lightroom online." },
        DE: { title: "Professionelles Porträt-Fotoshooting NYC", description: "HD-Porträt-Shooting in New York oder Lightroom-Bildbearbeitungscoaching online." },
        JA: { title: "プロポートレート撮影＆Lightroom指導（NY）", description: "ニューヨークでの高解像度ポートレート撮影または遠隔Lightroomレタッチ指導。" },
        ZH: { title: "纽约专业人像摄影与 Lightroom 后期", description: "纽约曼哈顿高端人像摄影，支持远程 Lightroom 调色教程。" },
      },
    },
    {
      id: 9,
      title: "Manhattan Loft Short Stay Swap",
      description: "Bright designer loft in SoHo New York available for residential stay swap with Europe.",
      author: "Ethan R.",
      category: "Logement & Stay Swap",
      verified: true, rating: 4.95, reviews: 17,
      location: "New York, SoHo (USA - 5832 km)",
      coordinates: [40.7241, -74.0001],
      type: "onsite", nativeLang: "EN",
      languages: ["EN", "FR"],
      compensation: "Stay Swap / Troc logement",
      image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80",
      urgent: false, caution: "Caution 200$",
      translations: {
        FR: { title: "Échange Loft Design Manhattan (SoHo)", description: "Superbe loft baigné de lumière au cœur de SoHo New York disponible pour échange logement." },
        ES: { title: "Intercambio de Loft de Diseño en Manhattan", description: "Espectacular loft luminoso en SoHo Nueva York disponible para intercambio residencial." },
        IT: { title: "Scambio Loft di Design a Manhattan", description: "Splendido loft luminoso nel cuore di SoHo a New York disponibile per scambio casa." },
        DE: { title: "Manhattan Designer Loft Wohnungstausch", description: "Lichtdurchflutetes Designer-Loft in SoHo New York zum Wohnungstausch." },
        JA: { title: "マンハッタンSoHoデザイナーズロフト滞在交換", description: "ニューヨークSoHoの中心にある明るいロフトアパートメントの滞在交換。" },
        ZH: { title: "曼哈顿 SoHo 设计师 Loft 短期互换", description: "位于纽约 SoHo 核心区的采光极佳设计感 Loft，开放房屋互换体验。" },
      },
    },

    // ═══════════════════════════════════════
    // 🇩🇪 BERLIN, ALLEMAGNE (nativeLang: DE)
    // ═══════════════════════════════════════
    {
      id: 10,
      title: "UI/UX Design Workshop & Figma Advanced",
      description: "Lernen Sie professionelles Design System, Auto Layout und interaktive Prototypen in Figma.",
      author: "Lukas K.",
      category: "Cours & Compétences",
      verified: true, rating: 4.95, reviews: 42,
      location: "Berlin, Mitte (Allemagne - 878 km)",
      coordinates: [52.5200, 13.4050],
      type: "remote", nativeLang: "DE",
      languages: ["DE", "EN"],
      compensation: "2h = 2 Jetons",
      image: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=600&q=80",
      urgent: false, caution: null,
      translations: {
        FR: { title: "Atelier Design UI/UX & Figma Avancé", description: "Maîtrisez les Design Systems, Auto Layout et Prototypage interactif sous Figma." },
        EN: { title: "UI/UX Design Workshop & Advanced Figma", description: "Master Design Systems, Auto Layout and interactive prototyping in Figma." },
        ES: { title: "Taller de Diseño UI/UX y Figma Avanzado", description: "Domina Design Systems, Auto Layout y Prototipado interactivo en Figma." },
        IT: { title: "Workshop UI/UX e Figma Avanzato", description: "Impara i Design System, l'Auto Layout e la prototipazione avanzata in Figma." },
        JA: { title: "UI/UXデザインワークショップ＆Figma応用", description: "FigmaのデザインシステムとAuto Layoutをマスターしよう。" },
        ZH: { title: "UI/UX 设计研讨会与 Figma 进阶", description: "深入掌握 Figma 设计系统、Auto Layout 与高级原型制作技巧。" },
      },
    },
    {
      id: 11,
      title: "Techno Music Production & Ableton Live Coaching",
      description: "Produzieren Sie Ihre eigenen Techno-Tracks mit Ableton Live. Sounddesign, Abmischung und Mastering.",
      author: "Max V.",
      category: "Cours & Compétences",
      verified: true, rating: 4.9, reviews: 35,
      location: "Berlin, Friedrichshain (Allemagne - 882 km)",
      coordinates: [52.5159, 13.4540],
      type: "both", nativeLang: "DE",
      languages: ["DE", "EN"],
      compensation: "1h = 1 Jeton",
      image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
      urgent: true, caution: null,
      translations: {
        FR: { title: "Production Musique Techno & Coaching Ableton Live", description: "Créez vos propres morceaux Techno/House sur Ableton Live : Sound design, mixage, mastering." },
        EN: { title: "Techno Music Production & Ableton Live Coaching", description: "Build your own Techno & House tracks in Ableton Live. Sound design, mixing, mastering." },
        ES: { title: "Producción Musical Techno y Coaching Ableton Live", description: "Crea tus propios temas Techno/House en Ableton Live con diseño de sonido y mezcla." },
        IT: { title: "Produzione Musica Techno e Coaching Ableton Live", description: "Crea i tuoi brani Techno e House su Ableton Live (Sound design, mixaggio, mastering)." },
        JA: { title: "テクノ制作＆Ableton Liveサウンドデザイン指導", description: "Ableton Liveを使ったテクノ／ハウス楽曲制作。ミキシングまで徹底指導。" },
        ZH: { title: "Techno 电子乐制作与 Ableton Live 指导", description: "学习用 Ableton Live 创作 Techno/House 音乐，含合成音色设计与混音。" },
      },
    },

    // ═══════════════════════════════════════
    // 🇪🇸 BARCELONE & MADRID, ESPAGNE (nativeLang: ES)
    // ═══════════════════════════════════════
    {
      id: 12,
      title: "Clases de Guitarra Flamenca y Ritmo",
      description: "Aprende los rasgueados, falsetas y compás del flamenco tradicional español a tu ritmo.",
      author: "Carlos N.",
      category: "Cours & Compétences",
      verified: true, rating: 5.0, reviews: 19,
      location: "Barcelone (Espagne - 830 km)",
      coordinates: [41.3851, 2.1734],
      type: "both", nativeLang: "ES",
      languages: ["ES", "EN"],
      compensation: "1h = 1 Jeton",
      image: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=600&q=80",
      urgent: false, caution: null,
      translations: {
        FR: { title: "Cours de Guitare Flamenco & Rythme", description: "Apprenez les rasgueados, falsetas et compás du flamenco traditionnel espagnol à votre rythme." },
        EN: { title: "Flamenco Guitar & Rhythm Coaching", description: "Master traditional Spanish flamenco rasgueados, falsetas and compás rhythm." },
        IT: { title: "Lezioni di Chitarra Flamenco e Ritmo", description: "Impara i rasgueados, le falsetas e il compás del flamenco tradizionale spagnolo." },
        DE: { title: "Flamenco-Gitarrenunterricht & Rhythmus-Coaching", description: "Lernen Sie traditionelle spanische Rasgueados, Falsetas und Flamenco-Rhythmen." },
        JA: { title: "フラメンコギター＆リズムコーチング", description: "本場スペインのラスゲアードやファルセータを丁寧に指導。" },
        ZH: { title: "西班牙弗拉明戈吉他与节奏辅导", description: "系统学习地道弗拉明戈扫弦、指弹与节奏律动技巧。" },
      },
    },
    {
      id: 13,
      title: "Alquiler Cámara 4K y Kit de Iluminación",
      description: "Kit completo de grabación 4K con iluminación LED de estudio y micrófonos inalámbricos.",
      author: "Elena V.",
      category: "Prêt de Matériel",
      verified: true, rating: 4.9, reviews: 12,
      location: "Madrid (Espagne - 1050 km)",
      coordinates: [40.4168, -3.7038],
      type: "onsite", nativeLang: "ES",
      languages: ["ES", "EN"],
      compensation: "Troc matériel ou 15€/jour",
      image: "https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=600&q=80",
      urgent: false, caution: "Caution 100€",
      translations: {
        FR: { title: "Location Caméra 4K & Kit d'Éclairage Studio", description: "Kit complet de tournage 4K avec éclairage LED de studio et microphones sans fil." },
        EN: { title: "4K Camera & Studio Lighting Kit Rental", description: "Complete 4K filming kit with studio LED lighting and wireless microphones." },
        IT: { title: "Noleggio Fotocamera 4K e Kit Luci Studio", description: "Kit completo per riprese 4K con illuminazione LED da studio e microfoni wireless." },
        DE: { title: "4K-Kamera-Verleih & Studio-Licht-Set", description: "Komplettes 4K-Filmset mit Studio-LED-Beleuchtung und kabellosen Mikrofonen." },
        JA: { title: "4Kカメラ＆スタジオ照明キット貸出（マドリード）", description: "4K撮影フルキット：LEDスタジオ照明＋ワイヤレスマイク付き。" },
        ZH: { title: "4K 摄像机与演播室灯光套装租借", description: "完整 4K 拍摄套件，含 LED 演播室灯光及无线麦克风。" },
      },
    },

    // ═══════════════════════════════════════
    // 🇮🇹 FLORENCE & ROME, ITALIE (nativeLang: IT)
    // ═══════════════════════════════════════
    {
      id: 14,
      title: "Scambio Appartamento centro Firenze ↔ Parigi",
      description: "Splendido appartamento storico con vista sul Duomo nel cuore di Firenze, disponibile per scambio casa.",
      author: "Matteo R.",
      category: "Logement & Stay Swap",
      verified: true, rating: 4.9, reviews: 8,
      location: "Florence (Italie - 880 km)",
      coordinates: [43.7696, 11.2558],
      type: "onsite", nativeLang: "IT",
      languages: ["IT", "EN", "FR"],
      compensation: "Échange direct / Swap",
      image: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=600&q=80",
      urgent: false, caution: "Caution 150€",
      translations: {
        FR: { title: "Échange Appartement Historique — Florence ↔ Paris", description: "Splendide appartement historique avec vue sur le Dôme au cœur de Florence, prêt pour un échange logement." },
        EN: { title: "Historic Florence Apartment Swap ↔ Paris", description: "Beautiful historic apartment overlooking the Duomo in central Florence, available for home swap." },
        ES: { title: "Intercambio de Apartamento Histórico Florencia ↔ París", description: "Espléndido apartamento histórico con vistas al Duomo en el centro de Florencia para intercambio." },
        DE: { title: "Historische Wohnung Florenz ↔ Paris Wohnungstausch", description: "Wunderschöne historische Wohnung mit Dom-Blick im Zentrum von Florenz zum Wohnungstausch." },
        JA: { title: "フィレンツェ歴史的アパート交換（↔パリ）", description: "フィレンツェ中心部のドゥオーモを望む歴史的アパートの滞在交換。" },
        ZH: { title: "佛罗伦萨历史公寓互换（↔巴黎）", description: "位于佛罗伦萨核心区、可俯瞰大教堂的历史公寓，开放房屋互换。" },
      },
    },
    {
      id: 17,
      title: "Lezioni di Cucina Romana Tradizionale",
      description: "Scopri i segreti della cucina romana autentica: cacio e pepe, carbonara, supplì e molto altro.",
      author: "Giulia M.",
      category: "Cours & Compétences",
      verified: true, rating: 5.0, reviews: 44,
      location: "Rome (Italie - 1105 km)",
      coordinates: [41.9028, 12.4964],
      type: "both", nativeLang: "IT",
      languages: ["IT", "EN", "FR"],
      compensation: "1 séance = 1 Jeton",
      image: "https://images.unsplash.com/photo-1528137871618-79d2761e3fd5?auto=format&fit=crop&w=600&q=80",
      urgent: false, caution: null,
      translations: {
        FR: { title: "Cours de Cuisine Romaine Traditionnelle", description: "Découvrez les secrets de la vraie cuisine romaine : cacio e pepe, carbonara, supplì et bien plus." },
        EN: { title: "Traditional Roman Cooking Lessons", description: "Discover the secrets of authentic Roman cuisine: cacio e pepe, carbonara, supplì and much more." },
        ES: { title: "Clases de Cocina Romana Tradicional", description: "Descubre los secretos de la auténtica cocina romana: cacio e pepe, carbonara, supplì y más." },
        DE: { title: "Traditionelle Römische Kochstunden", description: "Entdecken Sie die Geheimnisse der echten römischen Küche: Cacio e pepe, Carbonara, Supplì." },
        JA: { title: "ローマ伝統料理レッスン", description: "本場ローマ料理の秘密を学ぶ：カチョエペペ、カルボナーラ、スップリなど。" },
        ZH: { title: "罗马传统料理课程", description: "探索地道罗马菜肴秘方：卡乔内佩珀、意式培根蛋黄面、炸饭团等。" },
      },
    },

    // ═══════════════════════════════════════
    // 🇨🇳 PÉKIN & SHANGHAI, CHINE (nativeLang: ZH)
    // ═══════════════════════════════════════
    {
      id: 15,
      title: "中文与书法艺术线上交流",
      description: "地道中文普通话交流与传统软笔书法体验，含视频课件与汉字艺术辅导。",
      author: "Wei L.",
      category: "Cours & Compétences",
      verified: true, rating: 5.0, reviews: 26,
      location: "Pékin (Chine - 8200 km)",
      coordinates: [39.9042, 116.4074],
      type: "remote", nativeLang: "ZH",
      languages: ["ZH", "EN"],
      compensation: "1h = 1 Jeton",
      image: "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=600&q=80",
      urgent: false, caution: null,
      translations: {
        FR: { title: "Cours de Mandarin & Art de la Calligraphie Chinoise", description: "Échanges conversationnels en mandarin authentique et initiation à la calligraphie traditionnelle au pinceau." },
        EN: { title: "Mandarin Conversation & Chinese Calligraphy Art", description: "Authentic Mandarin conversation exchange and traditional Chinese brush calligraphy coaching." },
        ES: { title: "Conversación en Mandarín y Arte de la Caligrafía China", description: "Intercambio de conversación auténtico en mandarín y tutoría de caligrafía china tradicional." },
        IT: { title: "Conversazione Mandarino & Arte della Calligrafia Cinese", description: "Scambio di conversazione autentica in mandarino e lezioni di calligrafia cinese tradizionale." },
        DE: { title: "Mandarin-Konversation & Chinesische Kalligraphie-Kunst", description: "Authentischer Mandarin-Gesprächsaustausch und traditionelles chinesisches Pinsel-Kalligraphie-Coaching." },
        JA: { title: "中国語会話＆伝統書道アートオンライン交流", description: "本物の普通話会話交流と伝統的な毛筆書道体験。動画教材付き。" },
      },
    },
    {
      id: 18,
      title: "上海国际商务中文培训",
      description: "针对外籍商务人士的专业普通话培训，涵盖商务谈判、邮件写作及跨文化沟通。",
      author: "Lin X.",
      category: "Cours & Compétences",
      verified: true, rating: 4.85, reviews: 31,
      location: "Shanghai (Chine - 9100 km)",
      coordinates: [31.2304, 121.4737],
      type: "remote", nativeLang: "ZH",
      languages: ["ZH", "EN"],
      compensation: "2h = 2 Jetons",
      image: "https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=600&q=80",
      urgent: false, caution: null,
      translations: {
        FR: { title: "Formation Mandarin Business International (Shanghai)", description: "Formation professionnelle en mandarin pour expatriés : négociation, rédaction d'e-mails, communication interculturelle." },
        EN: { title: "Shanghai International Business Mandarin Training", description: "Professional Mandarin training for expats: business negotiation, email writing and cross-cultural communication." },
        ES: { title: "Formación en Chino Mandarín Empresarial Internacional", description: "Formación profesional en mandarín para expatriados: negociación, redacción de emails y comunicación intercultural." },
        IT: { title: "Formazione Mandarino Business Internazionale Shanghai", description: "Formazione professionale in mandarino per expat: negoziazione, scrittura email e comunicazione interculturale." },
        DE: { title: "Shanghai Internationales Business-Mandarin Training", description: "Professionelles Mandarin-Training für Expats: Verhandlung, E-Mail-Schreiben und interkulturelle Kommunikation." },
        JA: { title: "上海国際ビジネス中国語トレーニング", description: "海外赴任者向けビジネス中国語：商談・メール・異文化コミュニケーション対応。" },
      },
    },

    // ═══════════════════════════════════════
    // 🇧🇷 SÃO PAULO, BRÉSIL (nativeLang: PT)
    // ═══════════════════════════════════════
    {
      id: 19,
      title: "Aulas de Capoeira & Cultura Afro-Brasileira",
      description: "Aprenda capoeira Angola e Regional com mestre experiente, incluindo música (berimbau, atabaque) e história.",
      author: "Mestre Bimba Jr.",
      category: "Cours & Compétences",
      verified: true, rating: 5.0, reviews: 52,
      location: "São Paulo (Brésil - 9380 km)",
      coordinates: [-23.5505, -46.6333],
      type: "both", nativeLang: "PT",
      languages: ["PT", "EN", "ES"],
      compensation: "1h = 1 Jeton",
      image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=600&q=80",
      urgent: false, caution: null,
      translations: {
        FR: { title: "Cours de Capoeira & Culture Afro-Brésilienne", description: "Apprenez la capoeira Angola et Régionale avec un maître expérimenté, incluant musique (berimbau) et histoire." },
        EN: { title: "Capoeira Lessons & Afro-Brazilian Culture", description: "Learn Capoeira Angola and Regional with an experienced master, including music (berimbau, atabaque) and history." },
        ES: { title: "Clases de Capoeira & Cultura Afrobrasileña", description: "Aprende Capoeira Angola y Regional con un maestro experimentado, incluyendo música y cultura." },
        IT: { title: "Lezioni di Capoeira & Cultura Afro-Brasiliana", description: "Impara la Capoeira Angola e Regionale con un maestro esperto, musica (berimbau) e storia inclusi." },
        DE: { title: "Capoeira-Unterricht & Afro-Brasilianische Kultur", description: "Lernen Sie Capoeira Angola und Regional mit einem erfahrenen Meister, inklusive Musik und Geschichte." },
        JA: { title: "カポエイラ教室＆アフロ・ブラジル文化体験", description: "経験豊富なメストレによるカポエイラ・アンゴラと南部地域スタイルのレッスン。音楽・歴史も含む。" },
        ZH: { title: "卡波耶拉（Capoeira）课程与非裔巴西文化体验", description: "跟随经验丰富的大师学习卡波耶拉格斗舞蹈，包含乐器（贝林包）与历史文化。" },
      },
    },

    // ═══════════════════════════════════════
    // 🇬🇧 LONDRES, ROYAUME-UNI (nativeLang: EN)
    // ═══════════════════════════════════════
    {
      id: 20,
      title: "London Rooftop Yoga & Mindfulness Sessions",
      description: "Weekly rooftop yoga sessions with breathtaking views of the London skyline. All levels welcome.",
      author: "Sophie H.",
      category: "Cours & Compétences",
      verified: true, rating: 4.95, reviews: 67,
      location: "Londres (UK - 340 km)",
      coordinates: [51.5074, -0.1278],
      type: "both", nativeLang: "EN",
      languages: ["EN", "FR"],
      compensation: "1 session = 1 Jeton",
      image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=600&q=80",
      urgent: false, caution: null,
      translations: {
        FR: { title: "Yoga Rooftop & Pleine Conscience à Londres", description: "Séances hebdomadaires de yoga sur les toits de Londres avec vue imprenable sur la skyline. Tous niveaux." },
        ES: { title: "Yoga en Azotea & Mindfulness en Londres", description: "Sesiones semanales de yoga en las azoteas de Londres con vistas impresionantes. Todos los niveles." },
        IT: { title: "Yoga sul Rooftop & Mindfulness a Londra", description: "Sessioni settimanali di yoga sui tetti di Londra con vista mozzafiato sullo skyline." },
        DE: { title: "London Rooftop Yoga & Achtsamkeitstraining", description: "Wöchentliche Yoga-Sessions auf Londoner Dachterrassen mit atemberaubender Skyline-Aussicht." },
        JA: { title: "ロンドン屋上ヨガ＆マインドフルネス体験", description: "ロンドンのスカイラインを望む屋上で行う週次ヨガセッション。全レベル歓迎。" },
        ZH: { title: "伦敦屋顶瑜伽与正念冥想课程", description: "每周在伦敦屋顶举行的瑜伽冥想课，俯瞰绝美城市天际线，全水平学员均可报名。" },
      },
    },

    // ═══════════════════════════════════════
    // 🇰🇷 SÉOUL, CORÉE DU SUD (nativeLang: KO)
    // ═══════════════════════════════════════
    {
      id: 21,
      title: "K-Pop 댄스 레슨 & 한국어 회화 교환",
      description: "K-Pop 안무, 한국어 기초 회화 및 한국 문화 교류 레슨. 초급부터 중급까지 환영합니다.",
      author: "Ji-Yeon P.",
      category: "Cours & Compétences",
      verified: true, rating: 4.9, reviews: 41,
      location: "Séoul (Corée du Sud - 8900 km)",
      coordinates: [37.5665, 126.9780],
      type: "both", nativeLang: "KO",
      languages: ["KO", "EN"],
      compensation: "1h = 1 Jeton",
      image: "https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?auto=format&fit=crop&w=600&q=80",
      urgent: false, caution: null,
      translations: {
        FR: { title: "Cours de Danse K-Pop & Échange de Coréen", description: "Apprenez les chorégraphies K-Pop, le coréen conversationnel et la culture coréenne. Débutants bienvenus." },
        EN: { title: "K-Pop Dance Lessons & Korean Conversation Swap", description: "Learn K-Pop choreography, conversational Korean and Korean culture. Beginners to intermediate welcome." },
        ES: { title: "Clases de Baile K-Pop & Intercambio de Coreano", description: "Aprende coreografías K-Pop, coreano conversacional y cultura coreana. Principiantes bienvenidos." },
        IT: { title: "Lezioni di Danza K-Pop & Scambio di Coreano", description: "Impara le coreografie K-Pop, il coreano colloquiale e la cultura coreana. Tutti i livelli." },
        DE: { title: "K-Pop Tanzunterricht & Koreanisch Konversationsaustausch", description: "Lernen Sie K-Pop Choreografien, Koreanisch und koreanische Kultur. Anfänger willkommen." },
        JA: { title: "K-POPダンスレッスン＆韓国語会話交換", description: "K-POPの振り付け・韓国語・韓国文化を楽しく学ぶ。初中級者歓迎。" },
        ZH: { title: "K-Pop 舞蹈课程与韩语会话交换", description: "学习 K-Pop 编舞、韩语日常对话与韩国文化，初级到中级均可报名。" },
      },
    },

    // ═══════════════════════════════════════
    // 🇦🇺 SYDNEY, AUSTRALIE (nativeLang: EN)
    // ═══════════════════════════════════════
    {
      id: 16,
      title: "Surfing Lessons & Board Rental",
      description: "Guided surf lessons at Bondi Beach Sydney with surfboard and wetsuit included.",
      author: "Oliver W.",
      category: "Cours & Compétences",
      verified: true, rating: 4.95, reviews: 33,
      location: "Sydney, Bondi (Australie - 16900 km)",
      coordinates: [-33.8688, 151.2093],
      type: "onsite", nativeLang: "EN",
      languages: ["EN"],
      compensation: "2 Jetons ou 35$",
      image: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=600&q=80",
      urgent: false, caution: null,
      translations: {
        FR: { title: "Cours de Surf & Location de Board (Bondi Beach)", description: "Cours de surf encadrés sur la célèbre plage de Bondi à Sydney, planche et combinaison incluses." },
        ES: { title: "Clases de Surf & Alquiler de Tabla (Bondi Beach)", description: "Clases de surf guiadas en la famosa playa de Bondi en Sídney, tabla y traje incluidos." },
        IT: { title: "Lezioni di Surf & Noleggio Tavola (Bondi Beach)", description: "Lezioni di surf guidate sulla famosa spiaggia di Bondi a Sydney, tavola e muta incluse." },
        DE: { title: "Surfunterricht & Boardverleih (Bondi Beach)", description: "Geführte Surfstunden am berühmten Bondi Beach in Sydney, Board und Neoprenanzug inklusive." },
        JA: { title: "ボンダイビーチサーフレッスン＆ボードレンタル", description: "シドニーの名所ボンダイビーチでのガイド付きサーフレッスン。ボードとウェットスーツ込み。" },
        ZH: { title: "邦迪海滩冲浪课程与冲浪板租借", description: "在悉尼著名的邦迪海滩参加专业冲浪课，冲浪板和潜水服均已包含。" },
      },
    },
  ];

  // Conversations de démo enrichies (intelligentes & réalistes)
  const mockChats = [
    {
      id: 201,
      isDemo: true,
      user: "Emma Roche",
      listing: "Initiation au Design UI/UX (Figma)",
      lastMessage: "Je te propose 20€ + 1 Jeton pour 2h de cours ce samedi !",
      status: "Proposition reçue",
      terms: "2h de cours • 20€ + 1 Jeton",
      persona: {
        role: 'Designer Junior',
        skills: ['Figma', 'UI/UX', 'Mobile'],
        style: 'enthousiaste',
        availability: 'samedi',
        negotiation: 'souhaite une formation express contre paiement hybride',
      },
    },
    {
      id: 202,
      isDemo: true,
      user: "Thomas V.",
      listing: "Studio Photo Pro Paris",
      lastMessage: "Disponible ce vendredi pour un shooting contre 3 jetons ?",
      status: "Proposition reçue",
      terms: "3h Studio Photo • 3 Jetons",
      persona: {
        role: 'Photographe Mode',
        skills: ['shooting', 'studio', 'éclairage'],
        style: 'professionnel',
        availability: 'vendredi après-midi',
        negotiation: 'propose un échange de 3 jetons pour 3h de réservation',
      },
    },
    {
      id: 101,
      isDemo: true,
      user: "Sofia M.",
      listing: "Cours de Piano",
      lastMessage: "D'accord pour 1 crédit l'heure ! Tu es libre samedi ?",
      status: "Négociation en cours",
      terms: "2 cours 45 min • 2 Jetons",
      persona: {
        role: 'Professeure de piano',
        skills: ['débutant', 'avancé', 'visio'],
        style: 'chaleureuse et structurée',
        availability: 'soirées et week-ends',
        negotiation: 'propose une heure d’essai contre 1 crédit',
      },
    },
    {
      id: 102,
      isDemo: true,
      user: "Marc L.",
      listing: "Prêt Perceuse Bosch",
      lastMessage: "Perceuse et coffret forets béton prêts. Prêt gratuit avec caution 30€.",
      status: "Deal Validé",
      terms: "Troc direct + Caution 30€",
      persona: {
        role: 'Bricoleur local',
        skills: ['perceuse', 'forets', 'caution virtuelle'],
        style: 'direct et fiable',
        availability: 'week-end',
        negotiation: 'parle de la caution virtuelle et du prêt des forets',
      },
    },
    {
      id: 103,
      isDemo: true,
      user: "Karim B.",
      listing: "Réparation iPhone 13",
      lastMessage: "D'accord pour 25€ avec changement d'écran d'origine.",
      status: "Négociation en cours",
      terms: "Réparation Écran • 25€",
      persona: {
        role: 'Technicien dépannage',
        skills: ['iPhone', 'batterie', 'écran', 'local'],
        style: 'pragmatique et rassurant',
        availability: 'matin et fin de journée',
        negotiation: 'propose un tarif préférentiel à 25€ sur place',
      },
    },
    {
      id: 104,
      isDemo: true,
      user: "Camille & Lucas",
      listing: "Stay Swap Marseille Vieux-Port",
      lastMessage: "Super ! Échange d'appartement confirmé pour le week-end du 20 mai !",
      status: "Deal Validé",
      terms: "Échange de logement • 0€",
      persona: {
        role: 'Voyageurs Troco',
        skills: ['Stay Swap', 'Marseille', 'Paris'],
        style: 'accueillants',
        availability: 'week-ends prolongés',
        negotiation: 'échange réciproque de studio sans frais',
      },
    }
  ];

  const [chatThreads, setChatThreads] = useState({
    201: [
      { id: 1, sender: 'them', text: 'Bonjour Mateo ! J’ai vu ton annonce d’initiation UI/UX sur Figma, elle m’intéresse énormément pour mon projet d’application mobile !' },
      { id: 2, sender: 'me', text: 'Salut Emma ! Avec grand plaisir, on peut voir les bases des composants, autolayout et prototypes interactifs.' },
      { id: 3, sender: 'them', text: 'Super ! Est-ce que tu serais disponible pour 2h de formation ce samedi en visio ?' },
      { id: 4, sender: 'them', kind: 'deal', dealId: 'deal-201-1', status: 'pending', terms: { euroAmount: 20, trocoTokens: 1, conditions: 'Session de 2h Initiation Figma (UI/UX) ce samedi à 14h. Contre 20€ + 1 Jeton Troco.' } },
    ],
    202: [
      { id: 1, sender: 'them', text: 'Hello Mateo ! Je cherche un studio photo bien équipé à Paris pour un shoot produit. Ton annonce est toujours disponible ?' },
      { id: 2, sender: 'me', text: 'Oui Thomas ! Il y a tout le matos : flashs Bowens, softbox, déclencheurs et fonds papier.' },
      { id: 3, sender: 'them', text: 'Parfait ! Je peux te proposer un échange contre 3 jetons Troco pour 3h de réservation ce vendredi.' },
      { id: 4, sender: 'them', kind: 'deal', dealId: 'deal-202-1', status: 'pending', terms: { euroAmount: 0, trocoTokens: 3, conditions: 'Réservation Studio Photo Pro (3h) ce vendredi 14h-17h avec matériel inclus. Contre 3 Jetons Troco.' } },
    ],
    101: [
      { id: 1, sender: 'them', text: 'Bonjour ! Je propose des cours de piano flexibles pour tous niveaux avec accompagnement sur mesure.' },
      { id: 2, sender: 'me', text: 'Parfait, je cherche à retravailler mes enchaînements d’accords en visio.' },
      { id: 3, sender: 'them', kind: 'deal', dealId: 'deal-101-1', status: 'pending', terms: { euroAmount: 0, trocoTokens: 2, conditions: '2 séances de piano de 45 min en visio avec partitions fournies. Échange contre 2 Jetons Troco.' } },
    ],
    102: [
      { id: 1, sender: 'them', text: 'Bonjour ! Tu as besoin d’une perceuse avec forets béton ou bois ?' },
      { id: 2, sender: 'me', text: 'Plutôt béton pour poser des étagères murales.' },
      { id: 3, sender: 'them', text: 'Parfait, je te prépare le coffret complet avec la poignée de sécurité.' },
      { id: 4, sender: 'them', kind: 'deal', dealId: 'deal-102-1', status: 'confirmed', terms: { euroAmount: 0, trocoTokens: 0, conditions: 'Prêt gratuit 48h de la perceuse Bosch + coffret forets. Caution virtuelle de 30€ activée pendant la durée du prêt.' } },
    ],
    103: [
      { id: 1, sender: 'them', text: 'Salut ! Je peux réparer ton écran d’iPhone 13 dans la journée si tu veux.' },
      { id: 2, sender: 'me', text: 'Top ! C’est un écran d’origine garanti ?' },
      { id: 3, sender: 'them', kind: 'deal', dealId: 'deal-103-1', status: 'pending', terms: { euroAmount: 25, trocoTokens: 0, conditions: 'Remplacement écran d’origine iPhone 13 + test d’étanchéité Paris 11ème. Échange contre 25€.' } },
    ],
    104: [
      { id: 1, sender: 'them', text: 'Bonjour ! On adorerait échanger notre studio au Vieux-Port de Marseille contre ton appartement à Paris le temps d’un long week-end !' },
      { id: 2, sender: 'me', text: 'Excellente idée ! Les dates du 20 mai fonctionnent très bien.' },
      { id: 3, sender: 'them', kind: 'deal', dealId: 'deal-104-1', status: 'confirmed', terms: { euroAmount: 0, trocoTokens: 0, conditions: 'Échange réciproque 3 nuitées (Studio Marseille Vieux-Port vs Studio Paris Marais). Sans aucun frais.' } },
    ],
  });

  // État des discussions (fusionne mockChats et Firestore chats filtrés par utilisateur)
  const [chatsList, setChatsList] = useState(mockChats);

  // Synchronisation temps réel des discussions depuis Firestore (CONFIDENTIALITÉ STRICTE : filtrage par participant)
  useEffect(() => {
    if (!profile?.name) return;
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', profile.name)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      // Détection des nouveaux messages entrants en temps réel pour incrémenter le badge (+1)
      snapshot.docChanges().forEach(change => {
        if (change.type === 'modified' || change.type === 'added') {
          const d = change.doc.data();
          const fChatId = d.id || change.doc.id;
          const isFromThem = d.lastSenderName && d.lastSenderName.trim().toLowerCase() !== profile.name.trim().toLowerCase();

          // Seulement si c'est un nouveau message entrant et qu'on n'a pas cette conversation activement ouverte
          if (isFromThem && change.type === 'modified') {
            setReadChats(prev => {
              const next = new Set(prev);
              next.delete(fChatId);
              next.delete(String(fChatId));
              next.delete(Number(fChatId));
              return next;
            });
          }
        }
      });

      const firestoreChats = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        // Identifier le nom de l'interlocuteur (l'autre participant)
        const otherUser = Array.isArray(data.participants)
          ? data.participants.find(p => p && p.trim().toLowerCase() !== profile.name.trim().toLowerCase()) || data.user || 'Interlocuteur'
          : data.user || 'Interlocuteur';
        
        const fChatId = data.id || docSnap.id;

        return {
          id: fChatId,
          firestoreId: docSnap.id,
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
    }, (err) => {
      console.warn('[Firestore] chats onSnapshot error:', err);
    });
    return () => unsub();
  }, [profile?.name]);

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    if (chat?.id) {
      setReadChats(prev => new Set([...prev, chat.id, String(chat.id), Number(chat.id)]));
    }
  };

  // ---- COMPTEUR NON-LUS GLOBAL (Total exact et persistant des messages non lus) ----
  const unreadCount = useMemo(() => {
    const allChats = chatsList && chatsList.length > 0 ? chatsList : mockChats;
    return allChats.reduce((total, chat) => {
      const cidStr = String(chat.id);
      const isCurrentlyViewing = selectedChat && String(selectedChat.id) === cidStr && activeTab === 'chat';
      if (isCurrentlyViewing) return total;

      const isMarkedRead = readChats.has(chat.id) || readChats.has(cidStr) || readChats.has(Number(chat.id));
      if (isMarkedRead) return total;

      const thread = chatThreads[chat.id] || chatThreads[cidStr];
      if (thread && thread.length > 0) {
        const unreadInThread = thread.filter(m => (m.sender === 'them' || m.kind === 'deal' || (m.senderName && m.senderName !== profile?.name)));
        return total + (unreadInThread.length > 0 ? unreadInThread.length : 1);
      }

      if (chat.lastSenderName && chat.lastSenderName.trim().toLowerCase() !== profile?.name?.trim().toLowerCase()) {
        return total + (chat.unreadCount || 1);
      }
      return total;
    }, 0);
  }, [chatsList, mockChats, chatThreads, readChats, selectedChat, activeTab, profile?.name]);

  const createModernMapIcon = (isDarkMode = false) => {
    const primaryBg = isDarkMode ? 'rgba(96, 165, 250, 0.85)' : 'rgba(4, 38, 90, 0.85)';
    const glowColor = isDarkMode ? 'rgba(96, 165, 250, 0.35)' : 'rgba(4, 38, 90, 0.3)';

    return L.divIcon({
      className: 'custom-modern-pin',
      html: `
        <div style="
          position: relative;
          width: 22px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 4px 8px ${glowColor});
          cursor: pointer;
          opacity: 0.88;
        ">
          <svg width="22" height="28" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 30 12 30C12 30 24 21 24 12C24 5.37 18.63 0 12 0Z" 
                  fill="${primaryBg}" 
                  stroke="rgba(255, 255, 255, 0.95)" 
                  stroke-width="1.6" />
            <circle cx="12" cy="11" r="4.5" fill="#FFFFFF" />
          </svg>
        </div>
      `,
      iconSize: [22, 28],
      iconAnchor: [11, 28],
      popupAnchor: [0, -26],
    });
  };

  // eslint-disable-next-line no-unused-vars
  const groupParticipants = [
    { name: 'Sofia', role: 'Mentor', color: '#60A5FA' },
    { name: 'Marc', role: 'Expert', color: '#93C5FD' },
    { name: 'Lina', role: 'Apprenante', color: '#FDBA74' },
    { name: 'Kai', role: 'Coach', color: '#F9A8D4' },
    { name: 'Noa', role: 'Modérateur', color: '#A7F3D0' },
  ];

  const avatarOptions = DIVERSE_AVATARS;

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

  // ---- COORDONNÉES GPS RÉELLES ET RÉSOLUTION MONDIALE ----
  const locationCoordinatesMap = {
    'Florence (Italie)': [43.7696, 11.2558],
    'New York (USA)': [40.7128, -74.0060],
    'Londres (UK)': [51.5074, -0.1278],
    'Tokyo (Japon)': [35.6762, 139.6503],
    'Montréal (Canada)': [45.5017, -73.5673],
    'Barcelone (Espagne)': [41.3851, 2.1734],
    'Rome (Italie)': [41.9028, 12.4964],
    'Nice / Barcelone': [43.7102, 7.2620],
    'Alpes (France)': [45.5646, 6.3900],
    'Savoie (France)': [45.5646, 6.3900],
    'Paris 15e (À 1.1 km)': [48.8412, 2.2985],
    'Biarritz (France)': [43.4832, -1.5586],
    'Strasbourg (France)': [48.5734, 7.7521],
  };

  const getCoordinatesForLocation = (location = '') => {
    if (!location) return [48.8566, 2.3522];
    if (locationCoordinatesMap[location]) return locationCoordinatesMap[location];

    const locLower = String(location).toLowerCase();
    if (locLower.includes('tokyo') || locLower.includes('shibuya') || locLower.includes('japon')) return [35.6580, 139.7016];
    if (locLower.includes('new york') || locLower.includes('soho') || locLower.includes('manhattan') || locLower.includes('usa')) return [40.7128, -74.0060];
    if (locLower.includes('londres') || locLower.includes('london') || locLower.includes('uk')) return [51.5074, -0.1278];
    if (locLower.includes('barcelone') || locLower.includes('barcelona') || locLower.includes('espagne')) return [41.3851, 2.1734];
    if (locLower.includes('montréal') || locLower.includes('montreal') || locLower.includes('canada')) return [45.5017, -73.5673];
    if (locLower.includes('florence') || locLower.includes('italie') || locLower.includes('rome')) return [43.7696, 11.2558];
    if (locLower.includes('biarritz')) return [43.4832, -1.5586];
    if (locLower.includes('strasbourg')) return [48.5734, 7.7521];

    const match = String(location).match(/(\d+(?:\.\d+)?)\s*km/i);
    const dist = match ? parseFloat(match[1]) : 3.0;
    const angle = (dist * 137.5) * (Math.PI / 180);
    const latOffset = (dist / 111) * Math.cos(angle);
    const lngOffset = (dist / (111 * Math.cos(48.8566 * Math.PI / 180))) * Math.sin(angle);
    return [48.8566 + latOffset, 2.3522 + lngOffset];
  };

  // ---- BIBLIOTHÈQUE DE MÉDIAS INTELLIGENTS & GARANTIS (PHOTOS & VIDÉOS MP4 SANS DOUBLONS) ----
  const themeMedia = {
    camping: {
      images: [
        'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-drone-view-of-a-harbor-41588-large.mp4'],
    },
    surf: {
      images: [
        'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1455729552865-3ef5885ab656?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-man-riding-a-bicycle-in-the-city-41376-large.mp4'],
    },
    piano: {
      images: [
        'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1552422535-c45813c61732?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-playing-a-grand-piano-close-up-41589-large.mp4'],
    },
    guitare: {
      images: [
        'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-playing-a-grand-piano-close-up-41589-large.mp4'],
    },
    ikea: {
      images: [
        'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-man-working-with-a-drill-in-a-workshop-43285-large.mp4'],
    },
    drone: {
      images: [
        'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-drone-view-of-a-harbor-41588-large.mp4'],
    },
    iphone: {
      images: [
        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-hands-typing-on-a-laptop-keyboard-41380-large.mp4'],
    },
    cuisine: {
      images: [
        'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-chef-preparing-a-dish-in-a-restaurant-kitchen-42795-large.mp4'],
    },
    musique: {
      images: [
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1526142684086-7ebd69df27a5?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-playing-a-grand-piano-close-up-41589-large.mp4'],
    },
    photo: {
      images: [
        'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1452696193712-6cabf5103b63?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-camera-lens-zooming-in-and-out-41381-large.mp4'],
    },
    bricolage: {
      images: [
        'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-man-working-with-a-drill-in-a-workshop-43285-large.mp4'],
    },
    tech: {
      images: [
        'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-hands-typing-on-a-laptop-keyboard-41380-large.mp4'],
    },
    logement: {
      images: [
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-cozy-living-room-with-a-fireplace-41385-large.mp4'],
    },
    montagne: {
      images: [
        'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-cozy-living-room-with-a-fireplace-41385-large.mp4'],
    },
    sport: {
      images: [
        'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-man-training-in-a-gym-41372-large.mp4'],
    },
    yoga: {
      images: [
        'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-woman-doing-yoga-on-a-mat-41595-large.mp4'],
    },
    animaux: {
      images: [
        'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1477884213360-7e9d7dcc1e48?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-dog-running-in-a-park-41370-large.mp4'],
    },
    velo: {
      images: [
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1571068316344-75bc76f77890?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-man-riding-a-bicycle-in-the-city-41376-large.mp4'],
    },
    jardin: {
      images: [
        'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1561215186-f8d5f62c23c5?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-gardener-watering-plants-in-a-greenhouse-41390-large.mp4'],
    },
    langue: {
      images: [
        'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-hands-typing-on-a-laptop-keyboard-41380-large.mp4'],
    },
    etude: {
      images: [
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-hands-typing-on-a-laptop-keyboard-41380-large.mp4'],
    },
    remorque: {
      images: [
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-man-working-with-a-drill-in-a-workshop-43285-large.mp4'],
    },
    default: {
      images: [
        'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-hands-typing-on-a-laptop-keyboard-41380-large.mp4'],
    },
  };

  const getSuggestedMedia = (title = '', description = '', userImage = '', userVideo = '') => {
    const text = `${title} ${description}`.toLowerCase();
    let themeKey = 'default';

    if (/(camping|tente|sac de couchage|bivouac)/.test(text)) themeKey = 'camping';
    else if (/(surf|planche de surf|vague|océan|ocean)/.test(text)) themeKey = 'surf';
    else if (/(piano|solfège|solfege|partition|piano à queue)/.test(text)) themeKey = 'piano';
    else if (/(guitare|guitare acoustique|rock|chanson|guitare électrique)/.test(text)) themeKey = 'guitare';
    else if (/(ikea|montage meuble|étagère|etagere|armoire|meuble flat)/.test(text)) themeKey = 'ikea';
    else if (/(drone|quadcopter|dji|vol aérien|vol aerien)/.test(text)) themeKey = 'drone';
    else if (/(iphone|réparation iphone|reparation iphone|écran iphone|ecran iphone)/.test(text)) themeKey = 'iphone';
    else if (/(pizza|cuisine|pâtisserie|patisserie|pâte|pate|recette|robot pâtissier|robot patissier|chef|bière|biere|brassage)/.test(text)) themeKey = 'cuisine';
    else if (/(musique|beatmaking|ableton|production musicale|chant|violon|batterie|studio)/.test(text)) themeKey = 'musique';
    else if (/(photo|camera|appareil photo|objectif|montage vidéo|cinéma)/.test(text)) themeKey = 'photo';
    else if (/(plomberie|perceuse|marteau|bricolage|électrique|electricite|nettoyeur|kärcher|karcher|ponceuse|escabeau)/.test(text)) themeKey = 'bricolage';
    else if (/(smartphone|écran cassé|ecran casse|electronique|ordinateur|macbook|pc|python|code|informatique|développement|developpement|script|data|ux|ui|figma|seo|wordpress)/.test(text)) themeKey = 'tech';
    else if (/(appartement|maison|logement|échange|echange|swap|chalet|studio|vacances|weekend|soho|villa|sejour|séjour)/.test(text)) themeKey = /(chalet|montagne|savoie|alpes)/.test(text) ? 'montagne' : 'logement';
    else if (/(musculation|coaching sportif|fitness|cardio|entraînement|entrainement|remise en forme|marathon|boxe|running)/.test(text)) themeKey = 'sport';
    else if (/(yoga|posture|mobilité|mobilite|méditation|meditation|souplesse|pilates)/.test(text)) themeKey = 'yoga';
    else if (/(chien|animal|garde de chien|chat|pets)/.test(text)) themeKey = 'animaux';
    else if (/(vélo|velo|cyclisme|bicyclette|piste cyclable|vélos)/.test(text)) themeKey = 'velo';
    else if (/(jardin|jardinage|tondeuse|haie|plantes|pelouse)/.test(text)) themeKey = 'jardin';
    else if (/(anglais|espagnol|japonais|allemand|chinois|arabe|fle|langue étrangère|cours de langues|conversationnel)/.test(text)) themeKey = 'langue';
    else if (/(math|maths|révision|revision|examen|scolaire|lycée|lycee|étudiant|etudiant|bac|brevet)/.test(text)) themeKey = 'etude';
    else if (/(remorque|déménagement|demenagement|transport|utilitaire)/.test(text)) themeKey = 'remorque';

    const itemTheme = themeMedia[themeKey] || themeMedia.default;
    const allImgs = itemTheme.images || [];

    const rawCandidates = userImage && userImage.trim()
      ? [userImage, ...allImgs]
      : [...allImgs];

    // ÉRADICATION DÉFINITIVE ET STRICTE DES DOUBLONS:
    // Filtre Set radical : exactement les URLs uniques.
    // Si la thématique n'a qu'une seule ou deux images uniques, uniqueImages a 1 ou 2 éléments.
    const uniqueImages = [...new Set(rawCandidates.filter(img => img && typeof img === 'string' && img.trim() !== ''))];

    const mainImage = uniqueImages[0] || defaultPostDraft.image;
    const chosenVideo = userVideo && userVideo.trim() ? userVideo : (itemTheme.videos?.[0] || '');

    return {
      image: mainImage,
      video: chosenVideo,
      gallery: uniqueImages,
    };
  };

  const getSuggestedImage = (title = '', description = '', fallback = defaultPostDraft.image) => {
    return getSuggestedMedia(title, description, fallback).image;
  };

  const fallbackCategoryImages = {
    'Cours & Compétences': 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=800&q=80',
    'Prêt de Matériel': 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=800&q=80',
    'Services & Dépannage': 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80',
    'Logement & Stay Swap': 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
    'Tech': 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=800&q=80',
    'Bien-être': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80',
    default: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
  };

  const getFallbackImage = (category = '', title = '') => {
    if (fallbackCategoryImages[category]) return fallbackCategoryImages[category];
    return getSuggestedImage(title, category) || fallbackCategoryImages.default;
  };

  // ---- TAGS AUTOMATIQUES ----
  const generateTags = (title = '', description = '') => {
    const text = `${title} ${description}`.toLowerCase();
    const tags = [];
    const rules = [
      { re: /(cours|leçon|lecon|coaching|formation|apprendre|séance|seance|niveau)/, tag: 'Cours' },
      { re: /(piano|guitare|musique|beatmaking|ableton|solfège|production|chant)/, tag: 'Musique' },
      { re: /(cuisine|pâtisserie|patisserie|pizza|recette|robot pâtissier)/, tag: 'Cuisine' },
      { re: /(perceuse|outil|outillage|bricolage|forets|nettoyeur|jardinage|tondeuse)/, tag: 'Bricolage' },
      { re: /(iphone|smartphone|écran|ecran|réparation|reparation|panne|dépannage)/, tag: 'Dépannage' },
      { re: /(appartement|maison|logement|échange|echange|swap|chalet|studio|séjour|sejour)/, tag: 'Logement' },
      { re: /(python|code|informatique|développement|developpement|script|données|data)/, tag: 'Tech' },
      { re: /(vélo|velo|sport|musculation|yoga|posture|fitness)/, tag: 'Sport & Bien-être' },
      { re: /(chien|animal|garde)/, tag: 'Animaux' },
      { re: /(photo|camera|vidéo|video|montage|objectif)/, tag: 'Photo & Vidéo' },
      { re: /(visio|distance|en ligne|monde)/, tag: 'À distance' },
      { re: /(urgence|urgent|ce soir|aujourd|rapide|problème|probleme)/, tag: 'Urgent' },
    ];
    rules.forEach(rule => {
      if (rule.re.test(text) && !tags.includes(rule.tag)) tags.push(rule.tag);
    });
    if (tags.length === 0) tags.push('Échange');
    return tags.slice(0, 4);
  };

  // ---- HISTORIQUE DES SWAPS & DEALS ----
  const statusStyles = {
    'Clôturé': { bg: '#ECFDF5', text: '#059669' },
    'En cours': { bg: '#EFF6FF', text: '#04265A' },
    'Planifié': { bg: '#FFFBEB', text: '#D97706' },
    'En attente': { bg: '#F3F4F6', text: '#6B7280' },
  };

  const swapHistory = [
    {
      id: 1,
      counterparty: 'Sofia M.',
      deal: "Cours de Piano & Solfège (3 séances en visio)",
      date: '12 mars 2025',
      status: 'Clôturé',
      rating: 5,
      review: "Échange ultra fluide, Sofia est pédagogue et très à l'écoute. Les 3 séances se sont parfaitement déroulées, je recommande à 100%.",
      compensation: '3 Crédits temps',
    },
    {
      id: 2,
      counterparty: 'Marc L.',
      deal: 'Prêt Perceuse à percussion + coffret forets',
      date: '28 février 2025',
      status: 'Clôturé',
      rating: 4,
      review: "Prêt rapide et propre, caution virtuelle bien gérée. Matériel en parfait état, rendu sans accroc dans les délais.",
      compensation: 'Troc direct + Caution 30€',
    },
    {
      id: 3,
      counterparty: 'Karim B.',
      deal: 'Dépannage iPhone 13 (écran)',
      date: 'Prévu cette semaine',
      status: 'En cours',
      rating: null,
      review: 'Intervention programmée cette semaine, créneau confirmé par Karim. Échange de modèle et de devis en cours dans le chat.',
      compensation: '30€ ou 2 Crédits',
    },
    {
      id: 4,
      counterparty: 'Elisa V.',
      deal: "Cours d'Italien conversationnel (1h)",
      date: 'Vendredi 18h00',
      status: 'Planifié',
      rating: null,
      review: 'Séance visio planifiée vendredi à 18h00. Conditions validées : 1 Crédit + 10€.',
      compensation: '1 Crédit + 10€',
    },
  ];

  const isDemoProfile = profile?.uid === 'demo_mateopolo' || (!profile?.uid && profile?.name === 'MATEO POLO');
  const isAdmin = profile?.email === 'mateopolo91@gmail.com' || auth.currentUser?.email === 'mateopolo91@gmail.com' || profile?.role === 'admin';
  const closedDealsCount = isDemoProfile ? swapHistory.filter(entry => entry.status === 'Clôturé').length : (profile?.dealsCompleted ?? 0);
  const inProgressCount = isDemoProfile ? swapHistory.filter(entry => entry.status === 'En cours' || entry.status === 'Planifié').length : (profile?.dealsInProgress ?? 0);
  const ratedEntries = isDemoProfile ? swapHistory.filter(entry => entry.rating) : [];
  const averageRating = isDemoProfile
    ? (ratedEntries.length ? (ratedEntries.reduce((sum, entry) => sum + entry.rating, 0) / ratedEntries.length).toFixed(1) : '—')
    : (profile?.rating ? Number(profile.rating).toFixed(1) : '—');
  const userSwapHistory = isDemoProfile ? swapHistory : (profile?.swapHistory || []);

  const baseCategories = ['Tous', 'Cours/Compétences', 'Outillage', 'Services/Dépannage', 'Logement/Swap'];
  const allCategories = [...baseCategories, ...customCategories];

  // ---- GESTION COMPÉTENCES & MATÉRIEL AVEC PERSISTANCE FIRESTORE IMMÉDIATE ----
  const handleAddSkill = async () => {
    const value = skillInput.trim();
    if (!value || skills.includes(value)) return;
    const nextSkills = [...skills, value];
    setSkills(nextSkills);
    setProfile(prev => ({ ...prev, skills: nextSkills }));
    setProfileDraft(prev => ({ ...prev, skills: nextSkills }));
    setSkillInput('');

    const uid = profile?.uid || auth.currentUser?.uid;
    if (uid) {
      try {
        await setDoc(doc(db, 'users', String(uid)), { skills: nextSkills, updatedAt: serverTimestamp() }, { merge: true });
      } catch (e) {
        console.warn('[Firestore] Skill save failed:', e);
      }
    }
  };

  const handleRemoveSkill = async (skill) => {
    const nextSkills = skills.filter(item => item !== skill);
    setSkills(nextSkills);
    setProfile(prev => ({ ...prev, skills: nextSkills }));
    setProfileDraft(prev => ({ ...prev, skills: nextSkills }));

    const uid = profile?.uid || auth.currentUser?.uid;
    if (uid) {
      try {
        await setDoc(doc(db, 'users', String(uid)), { skills: nextSkills, updatedAt: serverTimestamp() }, { merge: true });
      } catch (e) {
        console.warn('[Firestore] Skill remove failed:', e);
      }
    }
  };

  const handleAddEquipment = async () => {
    const value = equipmentInput.trim();
    if (!value || equipment.includes(value)) return;
    const nextEquipment = [...equipment, value];
    setEquipment(nextEquipment);
    setProfile(prev => ({ ...prev, equipment: nextEquipment }));
    setProfileDraft(prev => ({ ...prev, equipment: nextEquipment }));
    setEquipmentInput('');

    const uid = profile?.uid || auth.currentUser?.uid;
    if (uid) {
      try {
        await setDoc(doc(db, 'users', String(uid)), { equipment: nextEquipment, updatedAt: serverTimestamp() }, { merge: true });
      } catch (e) {
        console.warn('[Firestore] Equipment save failed:', e);
      }
    }
  };

  const handleRemoveEquipment = async (item) => {
    const nextEquipment = equipment.filter(entry => entry !== item);
    setEquipment(nextEquipment);
    setProfile(prev => ({ ...prev, equipment: nextEquipment }));
    setProfileDraft(prev => ({ ...prev, equipment: nextEquipment }));

    const uid = profile?.uid || auth.currentUser?.uid;
    if (uid) {
      try {
        await setDoc(doc(db, 'users', String(uid)), { equipment: nextEquipment, updatedAt: serverTimestamp() }, { merge: true });
      } catch (e) {
        console.warn('[Firestore] Equipment remove failed:', e);
      }
    }
  };

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

  const toggleLanguage = (language) => {
    setProfile(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(entry => entry !== language)
        : [...prev.languages, language],
    }));
  };

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
    return [defaultUserListing, ...mockListings.map(l => ({ ...l, status: 'active' }))];
  });

  useEffect(() => {
    try {
      localStorage.setItem('troco_user_listings', JSON.stringify(listings));
    } catch (e) {
      console.warn('Erreur sauvegarde localStorage des annonces', e);
    }
  }, [listings]);

  // ---- SYNC TEMPS RÉEL FIRESTORE → état listings ----
  // Fusionne les mockListings (isDemo: true, source immuable hors composant)
  // avec les vraies annonces publiées dans la collection Firestore 'listings'.
  // On lit directement mockListings au lieu de prev.filter() pour éviter
  // que le feed soit vide si prev a été écrasé avant l'arrivée du snapshot.
  useEffect(() => {
    const demoBase = mockListings.map(l => ({ ...l, status: 'active', isDemo: true }));

    const unsub = onSnapshot(
      collection(db, 'listings'),
      (snapshot) => {
        // Annonces réelles depuis Firestore
        const firestoreListings = snapshot.docs.map((docSnap) => ({
          id: docSnap.data().id || docSnap.id,
          firestoreId: docSnap.id,
          ...docSnap.data(),
          status: docSnap.data().status || 'active',
          isDemo: false,
        }));
        // Fusion garantie : démos toujours présentes + annonces Firestore
        setListings([...demoBase, ...firestoreListings]);
      },
      (error) => {
        // En cas d'erreur réseau : on affiche au moins les démos
        console.warn('[Firestore] onSnapshot error:', error);
        setListings(prev => prev.length > 0 ? prev : demoBase);
      }
    );
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- SYNC MESSAGES EN TEMPS RÉEL (chat actif) ----
  // Dès qu'un message arrive dans Firestore, il apparaît instantanément dans la vue.
  useEffect(() => {
    if (!selectedChat?.id) return;
    const chatId = String(selectedChat.id);
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) return;
      const msgs = snapshot.docs.map(d => {
        const data = d.data();
        // Attribution stricte de l'auteur : si senderName correspond à l'utilisateur connecté => 'me' (aligné à droite), sinon 'them' (aligné à gauche)
        const isMe = data.senderName?.trim().toLowerCase() === profile.name?.trim().toLowerCase();
        return {
          id: d.id,
          ...data,
          sender: isMe ? 'me' : 'them',
          senderName: data.senderName || (isMe ? profile.name : (selectedChat.user || 'Interlocuteur')),
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

      // Si le chat est ouvert dans l'onglet 'chat', marquer automatiquement les messages reçus comme "lu" (✓✓ bleu)
      if (activeTab === 'chat' && String(selectedChat.id) === String(chatId)) {
        snapshot.docs.forEach(d => {
          const data = d.data();
          const isFromThem = data.senderName?.trim().toLowerCase() !== profile.name?.trim().toLowerCase();
          if (isFromThem && data.status !== 'read' && !data.read) {
            updateDoc(doc(db, 'chats', chatId, 'messages', d.id), {
              status: 'read',
              read: true,
              readAt: serverTimestamp(),
            }).catch(() => {});
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
  }, [selectedChat?.id, profile.name]);

  const getListingDistance = (item) => {
    if (typeof item.distanceKm === 'number') return item.distanceKm;
    if (item.coordinates && userCoords) {
      return calculateHaversineDistance(userCoords[0], userCoords[1], item.coordinates[0], item.coordinates[1]);
    }
    const match = String(item.location || '').match(/(\d+(?:\.\d+)?)\s*km/i);
    if (match) return parseFloat(match[1]);
    return null;
  };

  const CITY_ALIASES = {
    'parie': 'paris',
    'pari': 'paris',
    'pariss': 'paris',
    'bordeau': 'bordeaux',
    'bordeaux': 'bordeaux',
    'lyons': 'lyon',
    'lion': 'lyon',
    'marseiles': 'marseille',
    'marseil': 'marseille',
    'biariz': 'biarritz',
    'strasburg': 'strasbourg',
    'nantes': 'nantes',
    'toulouse': 'toulouse',
    'lille': 'lille',
    'nice': 'nice',
    'tokyo': 'tokyo',
    'london': 'london',
    'londres': 'london',
    'nyc': 'new york',
    'newyork': 'new york',
  };

  const removeAccents = (str = '') => {
    return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  const filteredListings = listings.filter((item) => {
    const rawQuery = searchQuery.trim();
    const cleanQuery = removeAccents(rawQuery);
    const words = cleanQuery.split(/\s+/).filter(Boolean);
    const expandedWords = words.map(w => CITY_ALIASES[w] || w);

    const itemLocationNorm = removeAccents(item.location || '');
    const itemTitleNorm = removeAccents(item.title || '');
    const itemCategoryNorm = removeAccents(item.category || '');
    const itemCompNorm = removeAccents(item.compensation || '');
    const itemTagsNorm = removeAccents((item.tags || []).join(' '));
    const itemDescNorm = removeAccents(item.description || '');
    const transText = item.translations ? Object.values(item.translations).map(t => `${t.title || ''} ${t.description || ''}`).join(' ') : '';
    const itemTransNorm = removeAccents(transText);

    const searchText = `${itemTitleNorm} ${itemCategoryNorm} ${itemLocationNorm} ${itemCompNorm} ${itemTagsNorm} ${itemDescNorm} ${itemTransNorm}`;

    const matchesSearch = (() => {
      if (!cleanQuery) return true;

      // 1. Match direct du texte
      if (searchText.includes(cleanQuery)) return true;

      // 2. Match via alias étendu (ex: "parie" -> "paris")
      const expandedQuery = expandedWords.join(' ');
      if (searchText.includes(expandedQuery)) return true;

      // 3. Match mot par mot
      return expandedWords.every(w => searchText.includes(w));
    })();
    const matchesFormat = (() => {
      if (formatFilter === 'all' || !formatFilter) return true;
      const itemFormat = item.format || item.type || 'onsite';
      if (formatFilter === 'remote') {
        return itemFormat === 'remote' || itemFormat === 'both';
      }
      if (formatFilter === 'onsite') {
        return itemFormat === 'onsite' || itemFormat === 'both';
      }
      return itemFormat === formatFilter;
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
    const matchesPayment = selectedPayment === 'all' || (selectedPayment === 'credits' && item.compensation.includes('Crédit')) || (selectedPayment === 'cash' && item.compensation.includes('€')) || (selectedPayment === 'troc' && item.compensation.includes('Troc')) || (selectedPayment === 'hybrid' && item.compensation.includes('+'));

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

    // 2. Annonces urgentes en deuxième niveau de priorité
    const aUrgent = (a.urgent || a.isUrgent) ? 1 : 0;
    const bUrgent = (b.urgent || b.isUrgent) ? 1 : 0;
    if (bUrgent !== aUrgent) return bUrgent - aUrgent;

    // 3. Tri chronologique par identifiant
    const aId = Number(a.id) || 0;
    const bId = Number(b.id) || 0;
    return bId - aId;
  });

  const getListingDetail = (listing) => {
    const media = getSuggestedMedia(listing.title, listing.description || '', listing.image, listing.video);
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
      authorProfile: {
        name: listing.author,
        avatar: listing.author === profile.name ? profile.avatar : getAuthorAvatar(listing.author),
        bio: listing.author === profile.name ? profile.bio : 'Créateur de contenus, expert en échange de services et passionné de communautés locales.',
        socials: listing.author === profile.name ? (profile.socials || []) : ['LinkedIn', 'Instagram'],
        portfolio: listing.author === profile.name ? (profile.portfolio || []) : [
          'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=600&q=80',
        ],
        reviews: listing.author === profile.name ? (profile.reviews || []) : [
          { rating: 5, text: 'Très clair sur les conditions, super communication et qualité de service.' },
          { rating: 5, text: 'J’ai trouvé un vrai partenaire de confiance, avec un échange fluide et premium.' },
        ],
      },
    };

    if (listing.author === 'Sofia M.') {
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
          reviews: [
            { rating: 5, text: 'Très pédagogique et hyper réactif, j’ai eu un échange de qualité dès le premier message.' },
            { rating: 4, text: 'Un vrai plaisir de travailler avec elle, le format visio est simple et agréable.' },
          ],
        },
      };
    }

    if (listing.author === 'Marc L.') {
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
          reviews: [
            { rating: 5, text: 'Très fiable pour les prêts et les dépannages rapides, j’ai apprécié la transparence.' },
            { rating: 5, text: 'Parfait pour les échanges de proximité, le service est simple et rassurant.' },
          ],
        },
      };
    }

    return generic;
  };

  const handleOpenListing = (listing) => {
    setSelectedListing(getListingDetail(listing));
  };

  const handleDeleteListing = (id) => {
    if (window.confirm(t('confirmDeleteText') || 'Supprimer ?')) {
      setListings(prev => prev.filter(item => item.id !== id));
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
    const { mode, amount, payload } = checkout;
    setCheckout(prev => ({ ...prev, open: false, step: 'method', payload: null }));

    // ---- GARDE ANTI-DOUBLE-EXÉCUTION ----
    if (checkoutAppliedRef.current) return;
    checkoutAppliedRef.current = true;

    // ---- SÉQUENCE ORDONNANCÉE : les changements de solde se font APRÈS fermeture du modal ----
    if (mode === 'wallet-tokens') {
      // Étape 1 : euros débitées 400ms après la fermeture
      window.setTimeout(() => {
        setProfile(prev => ({ ...prev, euroBalance: Number((prev.euroBalance - amount).toFixed(2)) }));
        playBetclicBalanceSound(false);
      }, 400);
      // Étape 2 : cling Apple Pay + jetons crédités 900ms après (sentiment de transvase)
      window.setTimeout(() => {
        const tokenAmount = payload?.tokenAmount || 0;
        playApplePaySound();
        setProfile(prev => ({ ...prev, trocoTokens: prev.trocoTokens + tokenAmount }));
      }, 900);
      return;
    }

    if (mode === 'wallet-cash') {
      window.setTimeout(() => {
        setProfile(prev => ({ ...prev, euroBalance: Number((prev.euroBalance + amount).toFixed(2)) }));
      }, 400);
      return;
    }

    if (mode === 'boost') {
      window.setTimeout(() => {
        setProfile(prev => ({ ...prev, euroBalance: Number((prev.euroBalance - amount).toFixed(2)) }));
        setListings(prev => prev.map(item => item.id === payload?.listingId ? { ...item, isBoosted: true } : item));
        setBoostMessage(`Annonce boostée avec succès pendant 7 jours !`);
      }, 400);
      return;
    }

    if (mode === 'deal') {
      window.setTimeout(() => {
        setChatThreads(prev => ({
          ...prev,
          [payload?.chatId]: (prev[payload?.chatId] || []).map(m => m.id === payload?.dealId ? { ...m, status: 'confirmed' } : m),
        }));
        setChatStatusOverrides(prev => ({ ...prev, [payload?.chatId]: 'Deal Validé' }));
      }, 400);
      return;
    }

    if (mode === 'edit-listing') {
      window.setTimeout(() => {
        const { newListing, wantsUrgent } = payload;
        setProfile(prev => ({ ...prev, euroBalance: Number((prev.euroBalance - amount).toFixed(2)) }));
        if (wantsUrgent && (!editingOriginalListing || !editingOriginalListing.urgent)) {
          setProfile(prev => ({ ...prev, euroBalance: Number((prev.euroBalance - 1.99).toFixed(2)) }));
        }
        setListings(prev => prev.map(item => item.id === newListing.id ? newListing : item));
      }, 400);
      return;
    }
  };

  const openCheckout = ({ mode, amount, label, payload }) => {
    setCheckout({ open: true, mode, amount, label, payload: payload || null, method: 'applePay', step: 'method' });
  };

  const checkoutAppliedRef = useRef(false);

  const handleConfirmPayment = () => {
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


  const handleImageFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const compressedDataUrl = await compressImage(file, 800, 800, 0.75);
    if (compressedDataUrl) {
      setPostDraft(prev => ({ ...prev, imageUrl: compressedDataUrl }));
    }
  };

  const handleVideoFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPostDraft(prev => ({ ...prev, videoUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handlePublishAnnouncement = async () => {
    const rawTitle = (postDraft.title || '').trim();
    const rawDescription = (postDraft.description || '').trim();

    if (!rawTitle || !rawDescription) {
      setPublishMessage(currentLang === 'FR' ? 'Ajoute un titre et une description pour publier ton annonce.' : currentLang === 'EN' ? 'Add a title and a description to publish your ad.' : currentLang === 'ES' ? 'Añade un título y una descripción para publicar tu anuncio.' : currentLang === 'IT' ? 'Aggiungi un titolo e una descrizione per pubblicare il tuo annuncio.' : currentLang === 'DE' ? 'Füge einen Titel und eine Beschreibung hinzu, um deine Anzeige zu veröffentlichen.' : currentLang === 'JA' ? 'タイトルと説明を追加して広告を公開してください。' : '添加标题和描述以发布您的广告。');
      return;
    }

    // ---- MODÉRATION DE CONTENU AUTOMATIQUE & LISTE NOIRE ----
    const blacklistCheck = validateListingContent({
      title: rawTitle,
      description: rawDescription,
      tags: postDraft.tags || []
    });
    if (!blacklistCheck.isValid) {
      setPublishMessage(blacklistCheck.errorMessage);
      alert(blacklistCheck.errorMessage);
      return;
    }

    const moderationAnalysis = analyzeContent(`${rawTitle} ${rawDescription}`);
    if (!moderationAnalysis.isClean && moderationAnalysis.score >= 40) {
      setPublishMessage(`⚠️ Annonce non conforme aux règles Troco : ${moderationAnalysis.reasons.join(' ')}`);
      return;
    }

    const wantsUrgent = postDraft.isUrgent;
    if (wantsUrgent && profile.euroBalance < 1.99) {
      setPublishMessage(`Solde Euros insuffisant pour activer l'option Urgent (1,99€ requis, solde actuel : ${profile.euroBalance.toFixed(2)}€). Recharge ton portefeuille ou désactive l'option.`);
      setPostStep(3);
      return;
    }

    const compensationText = postDraft.compensation === 'credits'
      ? '1h = 1 Crédit'
      : postDraft.compensation === 'cash'
        ? `${postDraft.price || '20'}€`
        : postDraft.compensation === 'hybrid'
          ? `${postDraft.trocoTokens || 0} Jetons + ${postDraft.euroAmount || 0}€`
          : 'Troc direct';

    const cautionText = postDraft.requiresCaution
      ? `Caution virtuelle ${postDraft.cautionAmount || 0}€`
      : (postDraft.caution && typeof postDraft.caution === 'string' ? postDraft.caution.trim() : null);

    const generatedTags = postDraft.tags && postDraft.tags.length > 0 ? postDraft.tags : generateTags(rawTitle, rawDescription);
    const media = getSuggestedMedia(rawTitle, rawDescription, postDraft.imageUrl, postDraft.videoUrl);

    const baseTranslations = {};
    const lowerTitle = rawTitle.toLowerCase();
    const isPython = lowerTitle.includes('python');
    ['EN', 'ES', 'IT', 'DE', 'JA', 'ZH'].forEach(l => {
      let tTitle = rawTitle;
      let tDesc = rawDescription;
      if (isPython) {
        if (l === 'EN') tTitle = tTitle.replace(/cours/i, 'COURSE');
        if (l === 'ES') tTitle = tTitle.replace(/cours/i, 'CURSO');
        if (l === 'IT') tTitle = tTitle.replace(/cours/i, 'CORSO');
        if (l === 'DE') tTitle = tTitle.replace(/cours/i, 'KURS');
        if (l === 'JA') tTitle = 'Pythonレッスン';
        if (l === 'ZH') tTitle = 'Python课程';
      }
      baseTranslations[l] = { title: tTitle, description: `[${l}] ${tDesc}` };
    });

    const finalGallery = postDraft.gallery && postDraft.gallery.length > 0 ? postDraft.gallery : media.gallery;

    const newListing = {
      ...(isEditingListing ? editingOriginalListing : {}),
      id: isEditingListing ? editingOriginalListing.id : Date.now(),
      title: rawTitle,
      author: profile.name,
      category: postDraft.category,
      verified: isEditingListing ? editingOriginalListing.verified : true,
      rating: isEditingListing ? editingOriginalListing.rating : 4.8,
      reviews: isEditingListing ? editingOriginalListing.reviews : 0,
      status: postDraft.status || 'active',
      location: (postDraft.location || '').trim() || (postDraft.format === 'remote' ? 'À distance' : 'Sur place'),
      type: postDraft.format,
      languages: profile.languages.slice(0, 2),
      compensation: compensationText,
      image: media.image,
      video: media.video,
      gallery: finalGallery,
      urgent: wantsUrgent,
      caution: cautionText,
      description: rawDescription,
      tags: generatedTags,
      nativeLang: 'FR',
      translations: baseTranslations,
    };

    if (isEditingListing) {
      const textChanged = rawTitle !== (editingOriginalListing?.title || '') || rawDescription !== (editingOriginalListing?.description || '');
      const galleryLength = finalGallery.length;
      if (textChanged || galleryLength > 4) {
        openCheckout({
          mode: 'edit-listing',
          amount: 1.99,
          label: t('editCostsMoneyTitle') || 'Modification Payante',
          payload: { newListing, wantsUrgent }
        });
        return; // Stop here and wait for checkout success
      } else {
        if (wantsUrgent && !editingOriginalListing.urgent) {
          playApplePaySound();
          setProfile(prev => ({ ...prev, euroBalance: Number((prev.euroBalance - 1.99).toFixed(2)) }));
        }
        // ── Local state (inchangé) ──
        setListings(prev => prev.map(item => item.id === newListing.id ? newListing : item));
        // ── Firestore : mise à jour du document existant ──
        if (editingOriginalListing.firestoreId) {
          try {
            const { id: _localId, firestoreId: _fid, ...firestorePayload } = newListing;
            await updateDoc(doc(db, 'listings', editingOriginalListing.firestoreId), {
              ...firestorePayload,
              updatedAt: serverTimestamp(),
            });
          } catch (e) {
            console.warn('[Firestore] updateDoc failed:', e);
          }
        }
      }
    } else {
      if (wantsUrgent) {
        playApplePaySound();
        setProfile(prev => ({ ...prev, euroBalance: Number((prev.euroBalance - 1.99).toFixed(2)) }));
      }
      // ── Local state (inchangé) ──
      setListings(prev => [newListing, ...prev]);
      // ── Firestore : création du document ──
      try {
        const { id: _localId, ...firestorePayload } = newListing;
        await addDoc(collection(db, 'listings'), {
          ...firestorePayload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('[Firestore] addDoc failed:', e);
      }
    }
    const urgentMsg = wantsUrgent ? (
      currentLang === 'FR' ? ' • Option Urgent activée (1,99€ déduits de ton solde Euro)' :
        currentLang === 'EN' ? ' • Urgent option activated (€1.99 deducted from your Euro balance)' :
          currentLang === 'ES' ? ' • Opción Urgente activada (1,99€ deducidos de tu saldo)' :
            currentLang === 'IT' ? ' • Opzione Urgente attivata (1,99€ detratti dal tuo saldo)' :
              currentLang === 'DE' ? ' • Dringend-Option aktiviert (1,99€ vom Guthaben abgezogen)' :
                currentLang === 'JA' ? ' • お急ぎオプション有効 (残高から1.99ユーロ控除)' :
                  ' • 紧急选项已激活（从您的余额中扣除1.99欧元）'
    ) : '';
    const publishedMsg = currentLang === 'FR' ? 'Annonce publiée :' : currentLang === 'EN' ? 'Ad published:' : currentLang === 'ES' ? 'Anuncio publicado:' : currentLang === 'IT' ? 'Annuncio pubblicato:' : currentLang === 'DE' ? 'Anzeige veröffentlicht:' : currentLang === 'JA' ? '公開された広告:' : '广告已发布:';
    setPublishMessage(`${publishedMsg} ${newListing.title}${urgentMsg}`);

    // Afficher le popup de confirmation puis naviguer vers l'annonce
    playApplePaySound();
    setPublishedListing(getListingDetail(newListing));
    setShowPublishedPopup(true);

    // Reset du formulaire pour permettre une nouvelle annonce
    setPostStep(1);
    setPostDraft(defaultPostDraft);
  };

  // ---- ISOLATION STRICTE DES DISCUSSIONS PAR PAIRE D'UTILISATEURS ET ANNONCE ----
  const buildConversationId = (listingId, userA, userB) => {
    const uA = String(userA || '').trim().toLowerCase();
    const uB = String(userB || '').trim().toLowerCase();
    const pair = [uA, uB].sort().join('_');
    return `chat_${listingId}_${pair}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  };

  const handleStartDiscussion = async (listing) => {
    if (listing.author === profile.name) return;

    const conversationId = buildConversationId(listing.id, profile.name, listing.author);

    const conversation = {
      id: conversationId,
      user: listing.author,
      listing: listing.title,
      lastMessage: `Début de discussion pour ${listing.title}`,
      status: 'Nouvelle discussion',
      terms: listing.compensation || '',
      participants: [profile.name, listing.author],
    };

    setSelectedChat(conversation);
    setActiveTab('chat');
    setSelectedListing(null);
    if (callState.active) endCall();
    // Marquer la conversation comme lue dès qu'on l'ouvre
    setReadChats(prev => new Set([...prev, conversationId, String(conversationId), Number(conversationId)]));

    // Persistance de la discussion dans Firestore avec les participants
    try {
      await setDoc(doc(db, 'chats', String(conversationId)), {
        id: conversationId,
        user: listing.author,
        listing: listing.title,
        lastMessage: `Début de discussion pour ${listing.title}`,
        status: 'Nouvelle discussion',
        terms: listing.compensation || '',
        participants: [profile.name, listing.author],
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.warn('[Firestore] start discussion failed:', e);
    }

    setChatThreads(prev => {
      if (prev[conversationId]) return prev;
      return {
        ...prev,
        [conversationId]: [{ id: 1, sender: 'them', text: `Bonjour ! Je peux te proposer un échange fluide sur « ${listing.title} ».` }],
      };
    });
  };

  // ---- GESTION DU TYPING INDICATOR TEMPS RÉEL (DEBOUNCE 2.5S) ----
  const typingTimeoutRef = useRef(null);

  const handleTypingChange = (text) => {
    setMessageDraft(text);
    if (!selectedChat?.id || !profile?.name) return;
    const chatId = String(selectedChat.id);

    // Signaler sur Firestore qu'on est en train d'écrire
    setDoc(doc(db, 'chats', chatId), {
      typing: { [profile.name]: true }
    }, { merge: true }).catch(() => {});

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setDoc(doc(db, 'chats', chatId), {
        typing: { [profile.name]: false }
      }, { merge: true }).catch(() => {});
    }, 2500);
  };

  // ---- ENVOI DE MESSAGE (MESSAGERIE) ----
  const handleSendMessage = async () => {
    if (!selectedChat) return;
    const text = messageDraft.trim();
    if (!text) return;

    // ---- MODÉRATION DE MESSAGE (LISTE NOIRE) ----
    const messageCheck = validateChatMessage(text);
    if (!messageCheck.isValid) {
      alert(messageCheck.errorMessage);
      return;
    }

    const chatId = selectedChat.id;

    // Réinitialiser immédiatement l'indicateur d'écriture
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (profile?.name) {
      setDoc(doc(db, 'chats', String(chatId)), {
        typing: { [profile.name]: false }
      }, { merge: true }).catch(() => {});
    }

    const newMessage = {
      id: Date.now(),
      sender: 'me',
      senderName: profile.name,
      text,
      status: 'sent',
      createdAt: new Date(),
      translations: { FR: text }
    };
    // État local immédiat pour réactivité parfaite
    setChatThreads(prev => ({ ...prev, [chatId]: [...(prev[chatId] || []), newMessage] }));
    setMessageDraft('');

    // Mise à jour immédiate de l'aperçu dans la liste des conversations
    setChatsList(prev => prev.map(c => String(c.id) === String(chatId) ? { ...c, lastMessage: text, lastSenderName: profile.name } : c));

    // Persistance Firestore — synchronisation bidirectionnelle PC ↔ Mobile
    try {
      await addDoc(collection(db, 'chats', String(chatId), 'messages'), {
        senderName: profile.name,
        text,
        status: 'sent',
        createdAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'chats', String(chatId)), {
        id: chatId,
        user: selectedChat.user,
        listing: selectedChat.listing,
        lastMessage: text,
        lastSenderName: profile.name,
        participants: selectedChat.participants || [profile.name, selectedChat.user],
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.warn('[Firestore] message write failed:', e);
    }
  };

  // ---- MODIFICATION DE MESSAGE (ÉDITION) ----
  const handleEditMessage = async (chatId, messageId, newText) => {
    if (!newText || !newText.trim()) return;
    const cid = String(chatId);
    const trimmed = newText.trim();

    // ---- MODÉRATION DE MESSAGE (LISTE NOIRE) ----
    const editCheck = validateChatMessage(trimmed);
    if (!editCheck.isValid) {
      alert(editCheck.errorMessage);
      return;
    }

    setChatThreads(prev => ({
      ...prev,
      [chatId]: (prev[chatId] || []).map(m => String(m.id) === String(messageId) ? { ...m, text: trimmed, edited: true } : m),
    }));
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
  };

  // ---- SUPPRESSION DE MESSAGE ----
  const handleDeleteMessage = async (chatId, messageId) => {
    const cid = String(chatId);
    setChatThreads(prev => ({
      ...prev,
      [chatId]: (prev[chatId] || []).filter(m => String(m.id) !== String(messageId)),
    }));
    try {
      await deleteDoc(doc(db, 'chats', cid, 'messages', String(messageId)));
    } catch (e) {
      console.warn('[Firestore] delete message failed:', e);
    }
  };

  // ---- CONTRE-PROPOSITION ----
  const openCounterOffer = () => {
    if (!selectedChat) return;
    setCounterOfferDraft({
      euroAmount: '',
      trocoTokens: '',
      conditions: selectedChat.terms || '',
    });
    setIsCounterOfferOpen(true);
  };

  const submitCounterOffer = async () => {
    if (!selectedChat) return;
    const chatId = selectedChat.id;
    const euroAmount = Number(counterOfferDraft.euroAmount) || 0;
    const trocoTokens = Number(counterOfferDraft.trocoTokens) || 0;
    const conditions = counterOfferDraft.conditions.trim() || 'Échange à définir ensemble.';
    const dealMessage = {
      id: Date.now(),
      sender: 'me',
      kind: 'deal',
      dealId: `deal-${Date.now()}`,
      status: 'pending',
      terms: { euroAmount, trocoTokens, conditions },
    };

    setChatThreads(prev => ({ ...prev, [chatId]: [...(prev[chatId] || []), dealMessage] }));
    setIsCounterOfferOpen(false);

    try {
      await addDoc(collection(db, 'chats', String(chatId), 'messages'), {
        sender: 'me',
        senderName: profile.name,
        kind: 'deal',
        dealId: dealMessage.dealId,
        status: 'pending',
        terms: { euroAmount, trocoTokens, conditions },
        createdAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'chats', String(chatId)), {
        id: chatId,
        user: selectedChat.user,
        listing: selectedChat.listing,
        lastMessage: `Proposition de deal : ${conditions}`,
        lastSenderName: profile.name,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.warn('[Firestore] deal message write failed:', e);
    }
  };

  const handleAcceptDeal = (chatId, dealId, terms) => {
    // Règle métier : un utilisateur ne peut PAS accepter sa propre contre-proposition.
    const dealMessage = (chatThreads[chatId] || []).find(m => m.id === dealId);
    if (!dealMessage || dealMessage.sender === 'me') return;

    setChatThreads(prev => ({
      ...prev,
      [chatId]: prev[chatId].map(m => m.id === dealId ? { ...m, status: 'accepted' } : m),
    }));
    const chat = selectedChat && selectedChat.id === chatId ? selectedChat : mockChats.find(c => c.id === chatId);

    if (terms.euroAmount > 0) {
      openCheckout({
        mode: 'deal',
        amount: terms.euroAmount,
        label: `Paiement du deal avec ${chat?.user || 'l\'interlocuteur'}`,
        payload: { chatId, dealId },
      });
    } else {
      setChatThreads(prev => ({
        ...prev,
        [chatId]: prev[chatId].map(m => m.id === dealId ? { ...m, status: 'confirmed' } : m),
      }));
      setChatStatusOverrides(prev => ({ ...prev, [chatId]: 'Deal Validé' }));
    }
  };

  const handleDeclineDeal = (chatId, dealId) => {
    // Règle métier : seul le destinataire peut refuser.
    const dealMessage = (chatThreads[chatId] || []).find(m => m.id === dealId);
    if (!dealMessage || dealMessage.sender === 'me') return;

    setChatThreads(prev => ({
      ...prev,
      [chatId]: prev[chatId].map(m => m.id === dealId ? { ...m, status: 'declined' } : m),
    }));
  };

  const renderDealCard = (message, chatId, otherName) => {
    const { terms, status, sender } = message;
    const isMine = sender === 'me';
    const isIncoming = sender === 'them';
    return (
      <div style={{ width: '100%', border: '1px solid #99F6E4', borderRadius: '16px', padding: '12px', backgroundColor: '#F0FDFA', boxShadow: '0 8px 20px rgba(4,38,90,0.08)', animation: 'fadeSlideUp 0.35s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800', color: '#04265A' }}>
            <Sparkles size={14} /> {isMine ? 'Ma contre-proposition' : 'Contre-proposition reçue'}
          </div>
          {status === 'pending' && isMine && (
            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#F3F4F6', color: '#6B7280', padding: '4px 9px', borderRadius: '999px' }}>
              En attente de la réponse de {otherName}
            </span>
          )}
          {status === 'pending' && isIncoming && (
            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#FFFBEB', color: '#D97706', padding: '4px 9px', borderRadius: '999px' }}>En attente de ta réponse</span>
          )}
          {status === 'accepted' && <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#EFF6FF', color: '#04265A', padding: '4px 9px', borderRadius: '999px' }}>Acceptée • Paiement en cours</span>}
          {status === 'confirmed' && <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#D1FAE5', color: '#059669', padding: '4px 9px', borderRadius: '999px' }}>Deal validé ✓</span>}
          {status === 'declined' && <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#F3F4F6', color: '#6B7280', padding: '4px 9px', borderRadius: '999px' }}>{isMine ? 'Refusée par l\'autre partie' : 'Refusée'}</span>}
        </div>
        <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, marginBottom: '10px' }}>{terms.conditions}</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {terms.euroAmount > 0 && <span style={{ backgroundColor: '#FFFFFF', border: '1px solid #A7F3D0', color: '#1D4ED8', borderRadius: '999px', padding: '5px 11px', fontSize: '12px', fontWeight: '800' }}>💶 {terms.euroAmount}€</span>}
          {terms.trocoTokens > 0 && <span style={{ backgroundColor: '#FFFFFF', border: '1px solid #A7F3D0', color: '#1D4ED8', borderRadius: '999px', padding: '5px 11px', fontSize: '12px', fontWeight: '800' }}>🪙 {terms.trocoTokens} Jeton{terms.trocoTokens > 1 ? 's' : ''}</span>}
          {terms.euroAmount === 0 && terms.trocoTokens === 0 && <span style={{ backgroundColor: '#FFFFFF', border: '1px solid #A7F3D0', color: '#1D4ED8', borderRadius: '999px', padding: '5px 11px', fontSize: '12px', fontWeight: '800' }}>🤝 Troc direct</span>}
        </div>
        {status === 'pending' && isIncoming && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => handleAcceptDeal(chatId, message.id, terms)} className="premium-button" style={{ flex: 1, border: 'none', borderRadius: '12px', padding: '9px', backgroundColor: '#04265A', color: '#FFF', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}>✓ Accepter</button>
            <button onClick={() => handleDeclineDeal(chatId, message.id)} className="premium-button" style={{ flex: 1, border: '1px solid #D1D5DB', borderRadius: '12px', padding: '9px', backgroundColor: '#FFFFFF', color: '#6B7280', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}>✕ Refuser</button>
          </div>
        )}
        {status === 'pending' && isMine && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#F8FAFC', border: '1px dashed #E2E8F0', color: '#64748B', borderRadius: '12px', padding: '9px 12px', fontSize: '12px', fontWeight: '700' }}>
            <Clock size={13} /> En attente de la réponse de {otherName} — tu ne peux pas accepter ta propre proposition.
          </div>
        )}
        {status === 'confirmed' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#D1FAE5', color: '#1D4ED8', borderRadius: '12px', padding: '9px 12px', fontSize: '12px', fontWeight: '800' }}>
            <CheckCircle size={15} /> Deal confirmé — conditions verrouillées.
          </div>
        )}
        {status === 'declined' && isIncoming && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#F3F4F6', color: '#6B7280', borderRadius: '12px', padding: '9px 12px', fontSize: '12px', fontWeight: '700' }}>
            Proposition refusée. Tu peux en proposer une nouvelle.
          </div>
        )}
        {status === 'declined' && isMine && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#F3F4F6', color: '#6B7280', borderRadius: '12px', padding: '9px 12px', fontSize: '12px', fontWeight: '700' }}>
            {otherName} a refusé cette proposition. Tu peux en proposer une nouvelle.
          </div>
        )}
      </div>
    );
  };

  const paymentMethods = [
    { key: 'applePay', label: 'Apple Pay', sub: 'Paiement instantané et sécurisé', icon: <span style={{ backgroundColor: '#000000', color: '#FFF', borderRadius: '7px', padding: '3px 8px', fontSize: '12px', fontWeight: '800', fontStyle: 'italic' }}> Pay</span> },
    { key: 'card', label: 'Carte bancaire', sub: 'Visa • Mastercard • Amex', icon: <CreditCard size={18} color="#04265A" /> },
    { key: 'troco', label: 'Solde Troco / Virement', sub: 'Utiliser mes jetons ou virement SEPA', icon: <Coins size={18} color="#04265A" /> },
  ];

  // ---- GESTION PROFIL (ÉDITION & SAUVEGARDE SUR FIRESTORE USERS/{UID}) ----
  const handleStartEdit = () => {
    setProfileDraft({ ...profile });
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    const updated = {
      ...profile,
      ...profileDraft,
      skills,
      equipment,
      updatedAt: serverTimestamp(),
    };
    setProfile(updated);
    window.localStorage.setItem('troco_user_profile', JSON.stringify(updated));
    setIsEditingProfile(false);
    setSaveMessage('Profil mis à jour avec succès !');
    setTimeout(() => setSaveMessage(''), 3000);

    const uid = profile.uid || auth.currentUser?.uid;
    if (uid) {
      try {
        await setDoc(doc(db, 'users', String(uid)), updated, { merge: true });
      } catch (e) {
        console.warn('[Firestore] Profile save failed:', e);
      }
    }
  };

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

  // ---- AUTHENTIFICATION MULTI-PROVIDERS ----
  const handleSendSms = async () => {
    setAuthError('');
    if (!authPhoneNumber || authPhoneNumber.length < 8) {
      setAuthError('Veuillez entrer un numéro de téléphone valide (ex: +33612345678).');
      return;
    }
    setAuthLoading(true);
    try {
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch (e) { }
        window.recaptchaVerifier = null;
      }
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => { }
      });
      const confirmation = await signInWithPhoneNumber(auth, authPhoneNumber, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      setAuthStep('sms-verify');
      setAuthError('');
    } catch (err) {
      console.error('Firebase SMS Error:', err);
      const code = err?.code || '';
      const message = err?.message || '';

      if (code === 'auth/billing-not-enabled' || code === 'auth/operation-not-allowed' || message.includes('billing') || message.includes('region enabled')) {
        setConfirmationResult({
          confirm: async (c) => {
            if (c === '123456' || c.length >= 4) {
              return { user: { phoneNumber: authPhoneNumber, uid: 'phone_' + Date.now() } };
            }
            throw new Error('Code incorrect');
          }
        });
        setAuthStep('sms-verify');
        setAuthError('ℹ️ Mode SMS interactif activé ! Entrez le code 123456 pour valider la connexion.');
        return;
      }

      if (code === 'auth/invalid-phone-number') {
        setAuthError('⚠️ Numéro invalide. N’oubliez pas d’inclure l’indicatif (+33 pour la France, ex: +33612345678).');
      } else {
        setAuthError(`Erreur Firebase (${code}) : ${message}`);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifySmsCode = async () => {
    setAuthError('');
    if (!authSmsCode || authSmsCode.length < 4) {
      setAuthError('Veuillez entrer le code reçu par SMS (ex: 123456).');
      return;
    }
    setAuthLoading(true);
    try {
      if (!confirmationResult) return;
      const res = await confirmationResult.confirm(authSmsCode);
      const user = res.user;
      const uid = user.uid || 'phone_' + Date.now();
      const phoneNum = user.phoneNumber || authPhoneNumber;
      setProfile(prev => ({
        ...prev,
        uid,
        loginMethod: 'Téléphone (SMS)',
        name: phoneNum,
        username: '@user_' + phoneNum.replace(/[^0-9]/g, '').slice(-4),
      }));
      setIsAuthenticated(true);
      window.localStorage.setItem('troco_is_authenticated', 'true');
    } catch (err) {
      console.error(err);
      setAuthError('Code de vérification incorrect ou expiré.');
    } finally {
      setAuthLoading(false);
    }
  };

  // ---- GESTIONNAIRE UNIFIÉ & MODULAIRE DES FOURNISSEURS OAUTH (GOOGLE, APPLE, MICROSOFT, FACEBOOK, GITHUB) ----
  const handleGenericOAuthSignIn = async (provider, providerName) => {
    setAuthError('');
    setAuthLoading(true);
    try {
      if (providerName === 'Google' && provider.setCustomParameters) {
        provider.setCustomParameters({ prompt: 'select_account' });
        provider.addScope('profile');
        provider.addScope('email');
      } else if (providerName === 'Apple' && provider.addScope) {
        provider.addScope('email');
        provider.addScope('name');
      } else if (providerName === 'Facebook' && provider.addScope) {
        provider.addScope('public_profile');
        provider.addScope('email');
      } else if (providerName === 'Microsoft' && provider.addScope) {
        provider.addScope('user.read');
        provider.addScope('email');
      }

      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const uid = user.uid;
      const userDocRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userDocRef);

      const realName = user.displayName || user.email?.split('@')[0] || `Utilisateur ${providerName}`;
      const realUsername = '@' + (user.reloadUserInfo?.screenName || realName).toLowerCase().replace(/[^a-z0-9_]/g, '');
      const realAvatar = user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';

      if (!userSnap.exists()) {
        let existingUserByEmail = null;
        if (user.email) {
          try {
            const emailQuery = query(collection(db, 'users'), where('email', '==', user.email));
            const emailSnap = await getDocs(emailQuery);
            if (!emailSnap.empty) {
              existingUserByEmail = emailSnap.docs[0].data();
            }
          } catch (e) {
            console.warn('[Firestore] Email lookup for multi-auth linking failed:', e);
          }
        }

        if (existingUserByEmail) {
          const mergedUserData = {
            ...existingUserByEmail,
            uid,
            email: user.email,
            loginMethod: providerName,
            updatedAt: serverTimestamp(),
          };
          if (user.photoURL && !mergedUserData.avatar) mergedUserData.avatar = user.photoURL;
          if (user.displayName && !mergedUserData.name) mergedUserData.name = user.displayName;
          await setDoc(userDocRef, mergedUserData, { merge: true });
          setProfile(mergedUserData);
          window.localStorage.setItem('troco_user_profile', JSON.stringify(mergedUserData));
        } else {
          const newUserData = {
            uid,
            name: realName,
            username: realUsername || `@user_${uid.slice(0, 6)}`,
            email: user.email || '',
            phoneNumber: user.phoneNumber || '',
            avatar: realAvatar,
            bio: 'Bienvenue sur mon profil Troco ! Prêt à échanger des services et partager des compétences.',
            location: 'Paris, France',
            languages: ['FR'],
            skills: [],
            equipment: [],
            dealsCompleted: 0,
            dealsInProgress: 0,
            rating: null,
            onboardingCompleted: false,
            euroBalance: 50,
            trocoTokens: 5,
            loginMethod: providerName,
            cguAcceptedAt: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(userDocRef, newUserData, { merge: true });
          setProfile(newUserData);
          window.localStorage.setItem('troco_user_profile', JSON.stringify(newUserData));
        }
      } else {
        const existingData = { ...userSnap.data(), uid };
        if (user.photoURL && !existingData.avatar) existingData.avatar = user.photoURL;
        if (user.displayName && !existingData.name) existingData.name = user.displayName;
        setProfile(existingData);
        window.localStorage.setItem('troco_user_profile', JSON.stringify(existingData));
      }
      setIsAuthenticated(true);
      window.localStorage.setItem('troco_is_authenticated', 'true');
    } catch (err) {
      console.warn(`${providerName} Sign-In Error:`, err);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setAuthError('Connexion annulée.');
      } else if (err.code === 'auth/popup-blocked') {
        setAuthError('⚠️ La fenêtre contextuelle a été bloquée par votre navigateur. Veuillez autoriser les popups pour continuer.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setAuthError("⚠️ Domaine non autorisé dans Firebase Console (Authentication > Paramètres > Domaines autorisés).");
      } else if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/configuration-not-found' || err.message?.includes('invalid') || err.message?.includes('provider')) {
        setAuthError(`⚠️ Le fournisseur ${providerName} doit être activé dans votre console Firebase (Authentication > Mode de connexion > ${providerName} > Activer).`);
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setAuthError('Un compte existe déjà avec cette adresse email via un autre mode de connexion.');
      } else {
        setAuthError(err.message || `Erreur lors de la connexion avec ${providerName}.`);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = () => handleGenericOAuthSignIn(new GoogleAuthProvider(), 'Google');
  const handleMicrosoftSignIn = () => handleGenericOAuthSignIn(new OAuthProvider('microsoft.com'), 'Microsoft');
  const handleFacebookSignIn = () => handleGenericOAuthSignIn(new FacebookAuthProvider(), 'Facebook');
  const handleGithubSignIn = () => handleGenericOAuthSignIn(new GithubAuthProvider(), 'GitHub');

  const handleEmailPasswordSignIn = async (e) => {
    if (e) e.preventDefault();
    setAuthError('');
    if (!authEmail || !authEmail.includes('@')) {
      setAuthError('Veuillez entrer une adresse email valide.');
      return;
    }
    if (!authPassword || authPassword.length < 6) {
      setAuthError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setAuthLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, authEmail, authPassword);
      const user = userCredential.user;
      const uid = user.uid;
      const userDocRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        setProfile(prev => ({ ...prev, ...userSnap.data(), uid }));
      }
      setIsAuthenticated(true);
      window.localStorage.setItem('troco_is_authenticated', 'true');
    } catch (err) {
      console.warn('Email/Password Sign-In Error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setAuthError('Identifiants incorrects. Vérifiez votre email et mot de passe ou créez un compte.');
      } else {
        setAuthError(err.message || 'Erreur lors de la connexion.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSendEmailLink = async () => {
    setAuthError('');
    if (!authEmail || !authEmail.includes('@')) {
      setAuthError('Veuillez entrer une adresse email valide.');
      return;
    }
    setAuthLoading(true);
    try {
      const actionCodeSettings = {
        url: window.location.origin,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, authEmail, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', authEmail);
      setAuthStep('email-sent');
    } catch (err) {
      console.warn('Firebase SDK Exception, Basculement en mode Email Simulé:', err);
      window.localStorage.setItem('emailForSignIn', authEmail);
      setAuthStep('email-sent');
      setAuthError('ℹ️ Clé Firebase non renseignée : Mode Email Simulé activé !');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleConfirmDemoAuth = (method) => {
    const demoProfile = {
      uid: 'demo_mateopolo',
      name: 'MATEO POLO',
      username: '@mateopolo',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      bio: 'Créateur de contenus, développeur Python et passionné de musique. Je propose des services flexibles et des échanges de qualité.',
      location: 'Paris, France',
      languages: ['FR', 'EN', 'ES', 'IT'],
      loginMethod: method || 'Démo Rapide',
      euroBalance: 128,
      trocoTokens: 12,
      cguAcceptedAt: new Date().toISOString(),
    };
    setProfile(demoProfile);
    window.localStorage.setItem('troco_user_profile', JSON.stringify(demoProfile));
    window.localStorage.setItem('troco_is_authenticated', 'true');
    setIsAuthenticated(true);
  };

  const handleSignupSubmit = async (e) => {
    if (e) e.preventDefault();
    setAuthError('');
    if (!signupName.trim()) {
      setAuthError('Veuillez renseigner votre nom complet.');
      return;
    }
    if (!signupUsername.trim()) {
      setAuthError('Veuillez renseigner un pseudo.');
      return;
    }
    if (!signupEmailOrPhone.trim()) {
      setAuthError('Veuillez renseigner votre email.');
      return;
    }
    if (!signupPassword || signupPassword.length < 6) {
      setAuthError('Veuillez choisir un mot de passe d’au moins 6 caractères.');
      return;
    }

    const formattedUsername = signupUsername.startsWith('@') ? signupUsername.trim() : '@' + signupUsername.trim();

    setAuthLoading(true);
    try {
      const email = signupEmailOrPhone.trim();
      let uid = 'user_' + Date.now();

      try {
        const res = await createUserWithEmailAndPassword(auth, email, signupPassword);
        uid = res.user.uid;
      } catch (authErr) {
        console.warn('Firebase Auth user creation fallback:', authErr);
        if (authErr.code === 'auth/email-already-in-use') {
          setAuthError('Cette adresse email est déjà associée à un compte. Veuillez vous connecter.');
          setAuthLoading(false);
          return;
        }
      }

      const newProfile = {
        uid,
        name: signupName.trim(),
        username: formattedUsername,
        email: email,
        avatar: signupAvatar,
        bio: signupBio.trim() || 'Nouvel utilisateur Troco ! Prêt à échanger et partager.',
        location: signupLocation.trim() || 'Paris, France',
        languages: signupLanguages.length > 0 ? signupLanguages : ['FR'],
        skills: signupSkills.length > 0 ? signupSkills : [],
        equipment: [],
        dealsCompleted: 0,
        dealsInProgress: 0,
        rating: null,
        onboardingCompleted: false,
        loginMethod: 'Email/Mot de passe',
        euroBalance: 50, // Solde de bienvenue
        trocoTokens: 5,   // Tokens de bienvenue
        cguAcceptedAt: null, // Déclenche la modale CGU obligatoire
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        await setDoc(doc(db, 'users', uid), newProfile, { merge: true });
      } catch (dbErr) {
        console.warn('[Firestore] Failed to save user:', dbErr);
      }

      if (signupSkills.length > 0) {
        setSkills(signupSkills);
      }

      setProfile(newProfile);
      window.localStorage.setItem('troco_user_profile', JSON.stringify(newProfile));
      window.localStorage.setItem('troco_is_authenticated', 'true');
      setIsAuthenticated(true);
    } catch (err) {
      console.error('Signup submit error:', err);
      setAuthError(err.message || 'Erreur lors de l’inscription.');
    } finally {
      setAuthLoading(false);
    }
  };

  if (isLoadingSession) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: darkMode ? '#0B1120' : '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(20,184,166,0.15)', borderTop: '3px solid #14B8A6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
          <div style={{ color: darkMode ? '#94A3B8' : '#64748B', fontSize: '13px', fontWeight: '600' }}>Vérification de la session...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: darkMode ? '#0B1120' : 'linear-gradient(160deg, #F5F5F7 0%, #E8F7F1 100%)', color: darkMode ? '#F8FAFC' : '#0F172A', fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative', transition: 'background 0.3s ease' }}>

        {/* BOUTON SWITCH MODE SOMBRE / CLAIR */}
        <button
          onClick={toggleDarkMode}
          title={darkMode ? "Activer le mode clair" : "Activer le mode sombre"}
          style={{
            position: 'absolute', top: '24px', right: '24px',
            border: 'none', borderRadius: '50%', width: '42px', height: '42px',
            backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.85)',
            color: darkMode ? '#F59E0B' : '#04265A',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)', transition: 'all 0.25s ease', zIndex: 50
          }}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div id="recaptcha-container"></div>
        <div style={{ width: '100%', maxWidth: '520px', backgroundColor: darkMode ? 'rgba(30,41,59,0.85)' : 'rgba(255,255,255,0.75)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderRadius: '28px', boxShadow: darkMode ? '0 24px 60px rgba(0, 0, 0, 0.35)' : '0 24px 60px rgba(15, 23, 42, 0.10)', border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.7)', overflow: 'hidden', transition: 'all 0.3s ease' }}>

          {/* SÉLECTEUR D'ONGLETS CONNEXION / INSCRIPTION */}
          <div style={{ display: 'flex', borderBottom: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(226,232,240,0.8)' }}>
            <button
              onClick={() => { setAuthTab('login'); setAuthError(''); }}
              style={{ flex: 1, padding: '16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '15px', fontWeight: '800', color: authTab === 'login' ? (darkMode ? '#60A5FA' : '#04265A') : (darkMode ? '#94A3B8' : '#94A3B8'), borderBottom: authTab === 'login' ? (darkMode ? '3px solid #60A5FA' : '3px solid #04265A') : '3px solid transparent', transition: 'all 0.2s ease' }}
            >
              Se connecter
            </button>
            <button
              onClick={() => { setAuthTab('signup'); setAuthError(''); }}
              style={{ flex: 1, padding: '16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '15px', fontWeight: '800', color: authTab === 'signup' ? (darkMode ? '#60A5FA' : '#04265A') : (darkMode ? '#94A3B8' : '#94A3B8'), borderBottom: authTab === 'signup' ? (darkMode ? '3px solid #60A5FA' : '3px solid #04265A') : '3px solid transparent', transition: 'all 0.2s ease' }}
            >
              Créer un compte
            </button>
          </div>

          <div style={{ padding: '28px 28px 18px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', padding: '8px 12px', borderRadius: '999px', backgroundColor: darkMode ? 'rgba(4,38,90,0.6)' : '#EFF6FF', color: darkMode ? '#93C5FD' : '#04265A', fontSize: '12px', fontWeight: '700', marginBottom: '14px' }}>
              <Sparkles size={14} style={{ marginRight: '6px' }} />
              {authTab === 'login' ? 'Bienvenue sur Troco' : 'Rejoindre la communauté'}
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 12px', color: darkMode ? '#FFFFFF' : '#111827', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
              {authTab === 'login' ? 'Échange, partage, crée sans limites.' : 'Créez votre compte Troco.'}
            </h1>
            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.7, color: darkMode ? '#94A3B8' : '#64748B' }}>
              {authTab === 'login'
                ? 'Troco réinvente les services, les swaps et les prêts avec une expérience premium multi-plateforme pensée pour les échanges humains.'
                : 'Créez un profil personnalisé premium pour proposer vos compétences et négocier des échanges.'
              }
            </p>
          </div>

          <div style={{ padding: '0 28px 28px' }}>
            {authError && (
              <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '12px', backgroundColor: '#FEF2F2', color: '#991B1B', fontSize: '12px', fontWeight: '600' }}>
                {authError}
              </div>
            )}

            {/* FLUX DE CONNEXION MULTI-PROVIDERS */}
            {authTab === 'login' && (
              <>
                {authStep === 'select' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                    {/* BOUTON GOOGLE */}
                    <button
                      onClick={handleGoogleSignIn}
                      disabled={authLoading}
                      style={{
                        border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(226,232,240,0.9)',
                        borderRadius: '16px', padding: '13px 14px',
                        backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.9)',
                        boxShadow: '0 10px 20px -6px rgba(0,0,0,0.08)', cursor: authLoading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        fontWeight: '700', color: darkMode ? '#F8FAFC' : '#111827'
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      Continuer avec Google
                    </button>

                    {/* BOUTON MICROSOFT */}
                    <button
                      onClick={handleMicrosoftSignIn}
                      disabled={authLoading}
                      style={{
                        border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(226,232,240,0.9)',
                        borderRadius: '16px', padding: '13px 14px',
                        backgroundColor: darkMode ? '#1E293B' : '#F8FAFC',
                        color: darkMode ? '#FFFFFF' : '#1E293B',
                        boxShadow: '0 10px 20px -6px rgba(0,0,0,0.08)', cursor: authLoading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        fontWeight: '700'
                      }}
                    >
                      <svg width="19" height="19" viewBox="0 0 21 21" fill="none">
                        <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                        <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                        <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                        <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                      </svg>
                      Continuer avec Microsoft
                    </button>

                    {/* BOUTON FACEBOOK */}
                    <button
                      onClick={handleFacebookSignIn}
                      disabled={authLoading}
                      style={{
                        border: 'none',
                        borderRadius: '16px', padding: '13px 14px',
                        backgroundColor: '#1877F2',
                        color: '#FFFFFF',
                        boxShadow: '0 10px 20px -6px rgba(24,119,242,0.35)', cursor: authLoading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        fontWeight: '700'
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Continuer avec Facebook
                    </button>

                    {/* BOUTON GITHUB */}
                    <button
                      onClick={handleGithubSignIn}
                      disabled={authLoading}
                      style={{
                        border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(226,232,240,0.9)',
                        borderRadius: '16px', padding: '13px 14px',
                        backgroundColor: darkMode ? '#0D1117' : '#24292F',
                        color: '#FFFFFF',
                        boxShadow: '0 10px 20px -6px rgba(0,0,0,0.15)', cursor: authLoading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        fontWeight: '700'
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                      </svg>
                      Continuer avec GitHub
                    </button>

                    {/* BOUTON TÉLÉPHONE (SMS) */}
                    <button
                      onClick={() => { setAuthStep('phone'); setAuthError(''); }}
                      style={{
                        border: 'none', borderRadius: '16px', padding: '13px 14px',
                        background: 'linear-gradient(135deg, #04265A 0%, #14B8A6 100%)', color: '#FFF',
                        cursor: 'pointer', fontWeight: '700',
                        boxShadow: '0 12px 20px -6px rgba(4, 38, 90, 0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                      }}
                    >
                      <Phone size={18} /> Se connecter par Téléphone (SMS)
                    </button>

                    {/* BOUTON EMAIL / MOT DE PASSE OU MAGIC LINK */}
                    <button
                      onClick={() => { setAuthStep('email'); setAuthError(''); }}
                      style={{
                        border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(226,232,240,0.9)',
                        borderRadius: '16px', padding: '13px 14px',
                        backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.9)',
                        boxShadow: '0 10px 20px -6px rgba(0,0,0,0.08)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        fontWeight: '700', color: darkMode ? '#F8FAFC' : '#111827'
                      }}
                    >
                      <span>📧</span> Se connecter par Email & Mot de passe
                    </button>

                    {/* BOUTON DÉMO RAPIDE */}
                    <button
                      onClick={() => handleConfirmDemoAuth('Démo Rapide')}
                      style={{
                        border: darkMode ? '1px dashed rgba(255,255,255,0.2)' : '1px dashed #CBD5E1',
                        borderRadius: '16px', padding: '10px 14px',
                        backgroundColor: darkMode ? 'rgba(15,23,42,0.5)' : '#F8FAFC',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: '8px', fontWeight: '600', color: darkMode ? '#94A3B8' : '#64748B', fontSize: '12px'
                      }}
                    >
                      ⚡ Accès Rapide Démo
                    </button>
                  </div>
                )}

                {/* SOUS-FLUX TÉLÉPHONE (SMS) */}
                {authStep === 'phone' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: darkMode ? '#CBD5E1' : '#111827' }}>Numéro de téléphone :</label>
                    <input
                      type="tel"
                      value={authPhoneNumber}
                      onChange={(e) => setAuthPhoneNumber(e.target.value)}
                      placeholder="+33612345678"
                      style={{ width: '100%', padding: '12px', border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #D1D5DB', borderRadius: '14px', fontSize: '14px', fontWeight: '600', backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFFFFF', color: darkMode ? '#F8FAFC' : '#0F172A', outline: 'none' }}
                    />
                    <button disabled={authLoading} onClick={handleSendSms} style={{ border: 'none', borderRadius: '14px', padding: '12px', backgroundColor: '#04265A', color: '#FFF', fontWeight: '700', cursor: authLoading ? 'not-allowed' : 'pointer', opacity: authLoading ? 0.7 : 1 }}>
                      {authLoading ? 'Envoi du SMS...' : 'Envoyer le code par SMS'}
                    </button>
                    <button onClick={() => { setAuthStep('select'); setAuthError(''); }} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '12px', cursor: 'pointer', textAlign: 'center' }}>
                      ← Retour aux options
                    </button>
                  </div>
                )}

                {authStep === 'sms-verify' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '13px', color: darkMode ? '#CBD5E1' : '#475569' }}>Un SMS contenant un code de confirmation a été envoyé au <strong>{authPhoneNumber}</strong>.</div>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: darkMode ? '#CBD5E1' : '#111827' }}>Code de confirmation :</label>
                    <input
                      type="text"
                      value={authSmsCode}
                      onChange={(e) => setAuthSmsCode(e.target.value)}
                      placeholder="123456"
                      style={{ width: '100%', padding: '12px', border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #D1D5DB', borderRadius: '14px', fontSize: '16px', fontWeight: '700', letterSpacing: '4px', textAlign: 'center', backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFFFFF', color: darkMode ? '#F8FAFC' : '#0F172A', outline: 'none' }}
                    />
                    <button disabled={authLoading} onClick={handleVerifySmsCode} style={{ border: 'none', borderRadius: '14px', padding: '12px', backgroundColor: '#10B981', color: '#FFF', fontWeight: '700', cursor: authLoading ? 'not-allowed' : 'pointer', opacity: authLoading ? 0.7 : 1 }}>
                      {authLoading ? 'Vérification...' : 'Valider et se connecter'}
                    </button>
                    <button onClick={() => { setAuthStep('phone'); setAuthError(''); }} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '12px', cursor: 'pointer', textAlign: 'center' }}>
                      ← Modifier le numéro
                    </button>
                  </div>
                )}

                {/* SOUS-FLUX EMAIL (MOT DE PASSE OU LIEN MAGIQUE) */}
                {authStep === 'email' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setAuthModeEmail('password')}
                        style={{
                          flex: 1, padding: '8px', borderRadius: '10px', fontSize: '12px', fontWeight: '800',
                          border: authModeEmail === 'password' ? '1px solid #04265A' : '1px solid #E2E8F0',
                          backgroundColor: authModeEmail === 'password' ? (darkMode ? 'rgba(4,38,90,0.8)' : '#EFF6FF') : 'transparent',
                          color: authModeEmail === 'password' ? (darkMode ? '#93C5FD' : '#04265A') : (darkMode ? '#94A3B8' : '#64748B'),
                          cursor: 'pointer'
                        }}
                      >
                        Mot de passe
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthModeEmail('magic-link')}
                        style={{
                          flex: 1, padding: '8px', borderRadius: '10px', fontSize: '12px', fontWeight: '800',
                          border: authModeEmail === 'magic-link' ? '1px solid #04265A' : '1px solid #E2E8F0',
                          backgroundColor: authModeEmail === 'magic-link' ? (darkMode ? 'rgba(4,38,90,0.8)' : '#EFF6FF') : 'transparent',
                          color: authModeEmail === 'magic-link' ? (darkMode ? '#93C5FD' : '#04265A') : (darkMode ? '#94A3B8' : '#64748B'),
                          cursor: 'pointer'
                        }}
                      >
                        Lien magique
                      </button>
                    </div>

                    <label style={{ fontSize: '13px', fontWeight: '700', color: darkMode ? '#CBD5E1' : '#111827' }}>Adresse Email :</label>
                    <input
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="exemple@email.com"
                      style={{ width: '100%', padding: '12px', border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #D1D5DB', borderRadius: '14px', fontSize: '14px', backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFFFFF', color: darkMode ? '#F8FAFC' : '#0F172A', outline: 'none' }}
                    />

                    {authModeEmail === 'password' && (
                      <>
                        <label style={{ fontSize: '13px', fontWeight: '700', color: darkMode ? '#CBD5E1' : '#111827' }}>Mot de passe :</label>
                        <input
                          type="password"
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          placeholder="••••••••"
                          onKeyDown={(e) => e.key === 'Enter' && handleEmailPasswordSignIn()}
                          style={{ width: '100%', padding: '12px', border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #D1D5DB', borderRadius: '14px', fontSize: '14px', backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFFFFF', color: darkMode ? '#F8FAFC' : '#0F172A', outline: 'none' }}
                        />
                        <button disabled={authLoading} onClick={handleEmailPasswordSignIn} style={{ border: 'none', borderRadius: '14px', padding: '12px', backgroundColor: '#04265A', color: '#FFF', fontWeight: '700', cursor: authLoading ? 'not-allowed' : 'pointer', opacity: authLoading ? 0.7 : 1 }}>
                          {authLoading ? 'Connexion en cours...' : 'Se connecter'}
                        </button>
                      </>
                    )}

                    {authModeEmail === 'magic-link' && (
                      <button disabled={authLoading} onClick={handleSendEmailLink} style={{ border: 'none', borderRadius: '14px', padding: '12px', backgroundColor: '#04265A', color: '#FFF', fontWeight: '700', cursor: authLoading ? 'not-allowed' : 'pointer', opacity: authLoading ? 0.7 : 1 }}>
                        {authLoading ? 'Envoi...' : 'Recevoir le lien magique'}
                      </button>
                    )}

                    <button onClick={() => { setAuthStep('select'); setAuthError(''); }} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '12px', cursor: 'pointer', textAlign: 'center' }}>
                      ← Retour aux options
                    </button>
                  </div>
                )}

                {authStep === 'email-sent' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#04265A' }}>✉️ Vérifiez votre boîte mail</div>
                    <div style={{ fontSize: '13px', color: darkMode ? '#CBD5E1' : '#475569', lineHeight: 1.6 }}>Un lien de connexion magique a été envoyé à <strong>{authEmail}</strong>. Cliquez dessus depuis votre appareil pour vous connecter.</div>
                    <button onClick={() => { setAuthStep('select'); setAuthError(''); }} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '12px', cursor: 'pointer', textAlign: 'center', marginTop: '8px' }}>
                      ← Retour aux options
                    </button>
                  </div>
                )}
              </>
            )}

            {/* FORMULAIRE DE CRÉATION DE COMPTE */}
            {authTab === 'signup' && (
              <form onSubmit={handleSignupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>

                {/* NOM COMPLET */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: darkMode ? '#CBD5E1' : '#1E293B', marginBottom: '6px' }}>Nom Complet</label>
                  <input
                    type="text"
                    required
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="ex: Mateo Polo"
                    style={{ width: '100%', padding: '12px 14px', border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #D1D5DB', borderRadius: '14px', fontSize: '14px', fontWeight: '600', backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFFFFF', color: darkMode ? '#F8FAFC' : '#0F172A', outline: 'none' }}
                  />
                </div>

                {/* PSEUDO */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: darkMode ? '#CBD5E1' : '#1E293B', marginBottom: '6px' }}>Pseudo (@)</label>
                  <input
                    type="text"
                    required
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                    placeholder="ex: mateopolo"
                    style={{ width: '100%', padding: '12px 14px', border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #D1D5DB', borderRadius: '14px', fontSize: '14px', fontWeight: '600', backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFFFFF', color: darkMode ? '#F8FAFC' : '#0F172A', outline: 'none' }}
                  />
                </div>

                {/* EMAIL */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: darkMode ? '#CBD5E1' : '#1E293B', marginBottom: '6px' }}>Adresse Email</label>
                  <input
                    type="email"
                    required
                    value={signupEmailOrPhone}
                    onChange={(e) => setSignupEmailOrPhone(e.target.value)}
                    placeholder="ex: mateo@troco.app"
                    style={{ width: '100%', padding: '12px 14px', border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #D1D5DB', borderRadius: '14px', fontSize: '14px', fontWeight: '600', backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFFFFF', color: darkMode ? '#F8FAFC' : '#0F172A', outline: 'none' }}
                  />
                </div>

                {/* MOT DE PASSE */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: darkMode ? '#CBD5E1' : '#1E293B', marginBottom: '6px' }}>Mot de passe (min 6 caractères)</label>
                  <input
                    type="password"
                    required
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ width: '100%', padding: '12px 14px', border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #D1D5DB', borderRadius: '14px', fontSize: '14px', fontWeight: '600', backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFFFFF', color: darkMode ? '#F8FAFC' : '#0F172A', outline: 'none' }}
                  />
                </div>

                {/* VILLE / LOCALISATION */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: darkMode ? '#CBD5E1' : '#1E293B', marginBottom: '6px' }}>Ville / Localisation</label>
                  <input
                    type="text"
                    required
                    value={signupLocation}
                    onChange={(e) => setSignupLocation(e.target.value)}
                    placeholder="ex: Paris, France"
                    style={{ width: '100%', padding: '12px 14px', border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #D1D5DB', borderRadius: '14px', fontSize: '14px', fontWeight: '600', backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFFFFF', color: darkMode ? '#F8FAFC' : '#0F172A', outline: 'none' }}
                  />
                </div>

                {/* BIOGRAPHIE */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: darkMode ? '#CBD5E1' : '#1E293B', marginBottom: '6px' }}>Bio / Description</label>
                  <textarea
                    rows={2}
                    value={signupBio}
                    onChange={(e) => setSignupBio(e.target.value)}
                    placeholder="Parlez-nous de vous, de vos services ou de ce que vous cherchez..."
                    style={{ width: '100%', padding: '12px 14px', border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #D1D5DB', borderRadius: '14px', fontSize: '13px', backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFFFFF', color: darkMode ? '#F8FAFC' : '#0F172A', outline: 'none', resize: 'none' }}
                  />
                </div>

                {/* CHOIX DE L'AVATAR PRESET */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: darkMode ? '#CBD5E1' : '#1E293B', marginBottom: '6px' }}>Choisissez un Avatar</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px' }}>
                    {[
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
                      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
                      'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80',
                      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80',
                      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
                    ].map((av) => (
                      <button
                        key={av}
                        type="button"
                        onClick={() => setSignupAvatar(av)}
                        style={{
                          border: signupAvatar === av ? (darkMode ? '3px solid #60A5FA' : '3px solid #14B8A6') : '3px solid transparent',
                          borderRadius: '50%', padding: 0, background: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
                          transform: signupAvatar === av ? 'scale(1.1)' : 'scale(1)',
                        }}
                      >
                        <img src={av} alt="avatar option" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* LANGUES PARLÉES */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: darkMode ? '#CBD5E1' : '#1E293B', marginBottom: '8px' }}>Langues Parlées</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['FR', 'EN', 'ES', 'IT'].map((lang) => {
                      const selected = signupLanguages.includes(lang);
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => {
                            if (selected) {
                              setSignupLanguages(prev => prev.filter(l => l !== lang));
                            } else {
                              setSignupLanguages(prev => [...prev, lang]);
                            }
                          }}
                          style={{
                            border: selected
                              ? (darkMode ? '1px solid #60A5FA' : '1px solid #04265A')
                              : (darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #E2E8F0'),
                            backgroundColor: selected
                              ? (darkMode ? 'rgba(4,38,90,0.7)' : '#EFF6FF')
                              : (darkMode ? 'rgba(30,41,59,0.5)' : '#F8FAFC'),
                            color: selected
                              ? (darkMode ? '#93C5FD' : '#04265A')
                              : (darkMode ? '#CBD5E1' : '#475569'),
                            padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s ease'
                          }}
                        >
                          {lang}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* COMPÉTENCES / SKILLS */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: darkMode ? '#CBD5E1' : '#1E293B', marginBottom: '6px' }}>Vos Compétences (CV)</label>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      value={signupSkillInput}
                      onChange={(e) => setSignupSkillInput(e.target.value)}
                      placeholder="ex: Bricolage, Ableton..."
                      style={{ flex: 1, padding: '10px 12px', border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #D1D5DB', borderRadius: '12px', fontSize: '13px', outline: 'none', backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFFFFF', color: darkMode ? '#F8FAFC' : '#0F172A' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (signupSkillInput.trim() && !signupSkills.includes(signupSkillInput.trim())) {
                            setSignupSkills(prev => [...prev, signupSkillInput.trim()]);
                            setSignupSkillInput('');
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (signupSkillInput.trim() && !signupSkills.includes(signupSkillInput.trim())) {
                          setSignupSkills(prev => [...prev, signupSkillInput.trim()]);
                          setSignupSkillInput('');
                        }
                      }}
                      style={{ border: 'none', borderRadius: '12px', backgroundColor: '#04265A', color: '#FFF', padding: '10px 14px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Ajouter
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {signupSkills.map((sk) => (
                      <span key={sk} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: darkMode ? 'rgba(4,38,90,0.6)' : '#EFF6FF', color: darkMode ? '#93C5FD' : '#04265A', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
                        {sk}
                        <button
                          type="button"
                          onClick={() => setSignupSkills(prev => prev.filter(s => s !== sk))}
                          style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* BOUTON SOUMISSION */}
                <button
                  type="submit"
                  disabled={authLoading}
                  style={{
                    border: 'none', borderRadius: '16px', padding: '14px', marginTop: '10px',
                    background: 'linear-gradient(135deg, #04265A 0%, #14B8A6 100%)', color: '#FFF',
                    cursor: authLoading ? 'not-allowed' : 'pointer', fontWeight: '800', fontSize: '15px', boxShadow: '0 12px 24px -6px rgba(4, 38, 90, 0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    opacity: authLoading ? 0.7 : 1
                  }}
                >
                  {authLoading ? 'Création du compte...' : 'Créer mon compte & Commencer'}
                </button>
              </form>
            )}

            <div style={{ padding: '16px', borderRadius: '18px', backgroundColor: darkMode ? 'rgba(15,23,42,0.6)' : 'rgba(248,250,252,0.9)', border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(226,232,240,0.8)', color: darkMode ? '#CBD5E1' : '#475569', fontSize: '13px', lineHeight: 1.7, transition: 'all 0.3s ease' }}>
              <div style={{ fontWeight: '700', color: darkMode ? '#FFFFFF' : '#0F172A', marginBottom: '6px' }}>Pourquoi les utilisateurs aiment Troco</div>
              <div>• Connexion sécurisée Google, GitHub, Discord, SMS & Email</div>
              <div>• Profils vérifiés avec réputation et compétences transparentes</div>
              <div>• Espaces de négociation et d'appels vidéo intégrés</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: darkMode ? '#0B1120' : '#F5F5F7', color: darkMode ? '#F8FAFC' : '#0F172A', minHeight: '100vh', transition: 'background-color 0.3s ease, color 0.3s ease', fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif", paddingBottom: '90px', WebkitFontSmoothing: 'antialiased' }}>
      {/* MODALE BLOQUANTE CGU & RGPD OBLIGATOIRE */}
      {isAuthenticated && !profile.cguAcceptedAt && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          animation: 'fadeSlideUp 0.3s ease both'
        }}>
          <div style={{
            maxWidth: '560px', width: '100%',
            backgroundColor: darkMode ? '#1E293B' : '#FFFFFF',
            borderRadius: '28px', padding: '28px',
            border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #E2E8F0',
            boxShadow: '0 25px 60px -15px rgba(0,0,0,0.5)',
            color: darkMode ? '#F8FAFC' : '#0F172A',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: darkMode ? 'rgba(96,165,250,0.2)' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: darkMode ? '#60A5FA' : '#04265A' }}>
                <Scale size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>Conditions Générales & RGPD</h3>
                <p style={{ margin: 0, fontSize: '12px', color: darkMode ? '#94A3B8' : '#64748B' }}>Cadre juridique et engagement communautaire</p>
              </div>
            </div>

            <div style={{
              backgroundColor: darkMode ? 'rgba(15,23,42,0.6)' : '#F8FAFC',
              borderRadius: '16px', padding: '16px', fontSize: '13px', lineHeight: 1.65,
              color: darkMode ? '#CBD5E1' : '#334155',
              border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
              marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px'
            }}>
              <div>
                <strong style={{ color: darkMode ? '#93C5FD' : '#04265A' }}>1. Plateforme d'intermédiation technique</strong>
                <p style={{ margin: '4px 0 0' }}>Troco met à disposition une infrastructure logicielle permettant aux utilisateurs de publier des annonces, échanger des services et communiquer. Troco n'est pas partie prenante aux contrats conclus entre utilisateurs.</p>
              </div>

              <div>
                <strong style={{ color: darkMode ? '#93C5FD' : '#04265A' }}>2. Clause de non-responsabilité (P2P)</strong>
                <p style={{ margin: '4px 0 0' }}>Les échanges, interventions physiques et prêts de matériel relèvent de la responsabilité exclusive des parties prenantes. Chaque membre s'engage à faire preuve de prudence et de diligence.</p>
              </div>

              <div>
                <strong style={{ color: darkMode ? '#93C5FD' : '#04265A' }}>3. Protection des données & RGPD</strong>
                <p style={{ margin: '4px 0 0' }}>Vos données personnelles (nom, email, ville, compétences) sont strictement isolées sur votre espace sécurisé <code>users/{profile.uid || 'uid'}</code> et ne sont jamais revendues à des tiers.</p>
              </div>
            </div>

            <button
              onClick={handleAcceptCgu}
              style={{
                width: '100%', border: 'none', borderRadius: '16px', padding: '14px',
                background: 'linear-gradient(135deg, #04265A 0%, #14B8A6 100%)', color: '#FFF',
                fontWeight: '800', fontSize: '14px', cursor: 'pointer',
                boxShadow: '0 12px 24px -6px rgba(4, 38, 90, 0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              <CheckCircle size={18} /> J'accepte les CGU et la Politique RGPD
            </button>
          </div>
        </div>
      )}
      <style>{`
        * { box-sizing: border-box; }
        .premium-main { animation: fadeSlideUp 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .premium-card, .premium-nav-btn, .premium-pill, .premium-panel, .premium-button {
          transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease, border-color 0.3s ease, background-color 0.3s ease;
        }
        .premium-card { border-radius: 20px !important; }
        .premium-card:hover {
          transform: translateY(-4px) scale(1.02) !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06) !important;
        }
        .premium-nav-btn:hover, .premium-pill:hover, .premium-panel:hover, .premium-button:hover {
          transform: scale(1.02);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
        }
        .glass-surface {
          background: rgba(255,255,255,0.72);
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
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.35); }
          50% { box-shadow: 0 0 0 6px rgba(245,158,11,0); }
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
          width: 4px; border-radius: 999px; background: #60A5FA;
          animation: soundWave 1.1s ease-in-out infinite;
        }
        input, select, textarea { font-family: inherit; }
      `}</style>

      {/* HEADER FIXE GLASSMORPHISM */}
      <header style={{ backgroundColor: darkMode ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', borderBottom: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(226,232,240,0.7)', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 40, boxShadow: '0 1px 24px rgba(15,23,42,0.04)', width: '100%', boxSizing: 'border-box' }}>
        <div className="header-container" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
          {/* PARTIE 3 : LOGO TROCO CLICKABLE -> RETOUR ACCUEIL */}
          <button onClick={() => { setActiveTab('feed'); setSelectedListing(null); setSelectedChat(null); if (callState.active) endCall(); }} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: '12px', textAlign: 'left', flexShrink: 0 }}>
            <h1 style={{ fontSize: '18px', fontWeight: '800', color: darkMode ? '#60A5FA' : '#04265A', margin: 0, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>Troco</h1>
            <p className="logo-slogan" style={{ fontSize: '10px', color: darkMode ? '#94A3B8' : '#6B7280', margin: 0, whiteSpace: 'nowrap' }}>{t('slogan')}</p>
          </button>
          <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
            <button onClick={() => handleOpenPayment('topup-cash')} title="Recharger mon solde Euros" className="premium-button balance-badge" style={{ border: 'none', borderRadius: '999px', padding: '6px 10px', backgroundColor: darkMode ? 'rgba(4,38,90,0.45)' : 'rgba(4,38,90,0.08)', color: darkMode ? '#93C5FD' : '#04265A', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', position: 'relative', overflow: 'visible', whiteSpace: 'nowrap', flexShrink: 0 }}>
              <Coins size={13} style={{ flexShrink: 0 }} /> <AnimatedEuroBalance value={profile.euroBalance} prefix="€ " suffix="" style={{ fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }} />
            </button>
            <button onClick={() => handleOpenPayment('pack-tokens')} title="Acheter des Jetons Troco" className="premium-button balance-badge" style={{ border: 'none', borderRadius: '999px', padding: '6px 10px', backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#F3F4F6', color: darkMode ? '#FFF' : '#111827', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', position: 'relative', overflow: 'visible', whiteSpace: 'nowrap', flexShrink: 0 }}>
              <Clock size={13} style={{ flexShrink: 0 }} /> <AnimatedTokenBalance value={profile.trocoTokens} formatFn={(v) => formatTokenCount(v, currentLang)} style={{ fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }} />
            </button>
            <button onClick={toggleDarkMode} title={darkMode ? "Activer le mode clair" : "Activer le mode sombre"} className="premium-button darkmode-btn" style={{ border: 'none', borderRadius: '50%', width: '34px', height: '34px', backgroundColor: darkMode ? 'rgba(255,255,255,0.12)' : '#F3F4F6', color: darkMode ? '#F59E0B' : '#04265A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', flexShrink: 0 }}>
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={() => setIsLangModalOpen(true)} className="premium-button lang-btn" style={{ border: 'none', borderRadius: '20px', padding: '5px 10px', backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#F3F4F6', color: darkMode ? '#FFF' : '#111827', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', whiteSpace: 'nowrap', flexShrink: 0 }}>
              <Globe size={13} color={darkMode ? '#93C5FD' : '#04265A'} style={{ flexShrink: 0 }} />
              <span>{currentLang === 'FR' ? '🇫🇷 FR' : currentLang === 'EN' ? '🇬🇧 EN' : currentLang === 'ES' ? '🇪🇸 ES' : currentLang === 'IT' ? '🇮🇹 IT' : currentLang === 'DE' ? '🇩🇪 DE' : currentLang === 'JA' ? '🇯🇵 JA' : '🇨🇳 ZH'}</span>
            </button>
          </div>
        </div>
      </header>

      {isBoostModalOpen && boostingListing && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 55 }}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderRadius: '24px', width: '100%', maxWidth: '420px', padding: '22px', boxShadow: '0 24px 60px rgba(0,0,0,0.20)', border: '1px solid rgba(255,255,255,0.7)', position: 'relative' }}>
            <button onClick={() => { setIsBoostModalOpen(false); setBoostingListing(null); setBoostMessage(''); }} style={{ position: 'absolute', top: '14px', right: '14px', border: 'none', backgroundColor: '#F3F4F6', width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={16} color="#374151" />
            </button>
            <div style={{ fontWeight: '800', color: '#111827', marginBottom: '8px', fontSize: '17px' }}>🔥 Booster cette annonce</div>
            <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.6, marginBottom: '14px' }}>Mets en avant <strong>{boostingListing.title}</strong> pendant 7 jours pour <strong>2,99€</strong>.</div>
            <button onClick={confirmBoostListing} className="premium-button" style={{ width: '100%', border: 'none', borderRadius: '14px', padding: '12px', backgroundColor: '#F59E0B', color: '#FFFFFF', fontWeight: '700', cursor: 'pointer', boxShadow: '0 10px 20px rgba(245,158,11,0.25)' }}>Valider le boost — procéder au paiement</button>
            {boostMessage && <div style={{ marginTop: '10px', fontSize: '12px', color: '#04265A', fontWeight: '700' }}>{boostMessage}</div>}
          </div>
        </div>
      )}

      {/* ---- CHECKOUT / TUNNEL DE PAIEMENT SIMULÉ ---- */}
      {checkout.open && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(2,6,23,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 75 }}>
          <div style={{ width: '100%', maxWidth: '460px', backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', borderRadius: '28px', padding: '24px', boxShadow: '0 30px 80px rgba(2,6,23,0.30)', border: '1px solid rgba(255,255,255,0.8)', position: 'relative' }}>
            {checkout.step === 'success' ? (
              <div style={{ textAlign: 'center', padding: '18px 8px' }}>
                <div style={{ width: '76px', height: '76px', borderRadius: '50%', backgroundColor: '#D1FAE5', color: '#059669', margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'popIn 0.5s cubic-bezier(0.22,1,0.36,1) both' }}>
                  <Check size={36} strokeWidth={3} />
                </div>
                <h3 style={{ margin: '0 0 10px', fontSize: '19px', fontWeight: '800', color: '#111827', lineHeight: 1.4 }}>{t('transactionSuccess')}</h3>
                <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#64748B' }}>{checkout.label}</p>
                <p style={{ margin: '0 0 20px', fontSize: '22px', fontWeight: '800', color: '#04265A' }}>{(checkout.amount || 0).toFixed(2)} €</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', color: '#059669', fontWeight: '700', marginBottom: '18px' }}>
                  <ShieldCheck size={14} /> {t('encryptedPayment')}
                </div>
                <button onClick={closeCheckout} className="premium-button" style={{ width: '100%', border: 'none', borderRadius: '16px', padding: '14px', backgroundColor: '#04265A', color: '#FFF', fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 22px rgba(4,38,90,0.25)' }}>{t('doneButton')}</button>
              </div>
            ) : checkout.step === 'processing' ? (
              <div style={{ textAlign: 'center', padding: '34px 8px' }}>
                <div style={{ width: '46px', height: '46px', margin: '0 auto 20px', border: '3px solid rgba(4,38,90,0.18)', borderTopColor: '#04265A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <div style={{ fontWeight: '800', color: '#111827', fontSize: '15px' }}>{t('transactionProcessing')}</div>
                <p style={{ fontSize: '12px', color: '#64748B', marginTop: '8px' }}>{t('secureBankConnection')}</p>
              </div>
            ) : (
              <>
                <button onClick={closeCheckout} style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', backgroundColor: '#F3F4F6', width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X size={16} color="#374151" />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Lock size={16} color="#04265A" />
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#04265A', letterSpacing: '0.04em' }}>{t('securePaymentHeader')}</span>
                </div>
                <h3 style={{ margin: '0 0 16px', fontSize: '19px', fontWeight: '800', color: '#111827' }}>{checkout.label || 'Paiement'}</h3>

                <div style={{ border: '1px solid #E2E8F0', borderRadius: '16px', padding: '14px', backgroundColor: '#F8FAFC', marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>{t('amountToPay')}</span>
                  <span style={{ fontSize: '22px', fontWeight: '800', color: '#111827' }}>{(checkout.amount || 0).toFixed(2)} €</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {paymentMethods.map(method => (
                    <button key={method.key} onClick={() => setCheckout(prev => ({ ...prev, method: method.key }))} style={{ display: 'flex', alignItems: 'center', gap: '12px', border: checkout.method === method.key ? '1.5px solid #04265A' : '1px solid #E2E8F0', borderRadius: '14px', padding: '12px 14px', backgroundColor: checkout.method === method.key ? '#EFF6FF' : '#FFFFFF', cursor: 'pointer', textAlign: 'left' }}>
                      {method.icon}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#111827' }}>{method.label}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{method.sub}</div>
                      </div>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: checkout.method === method.key ? '5px solid #04265A' : '1.5px solid #D1D5DB' }} />
                    </button>
                  ))}
                </div>

                {checkout.method === 'card' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', padding: '12px', borderRadius: '14px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <input placeholder="1234 5678 9012 3456" style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '10px', fontSize: '13px', backgroundColor: '#FFF' }} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input placeholder="MM/AA" style={{ flex: 1, padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '10px', fontSize: '13px', backgroundColor: '#FFF' }} />
                      <input placeholder="CVC" style={{ flex: 1, padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '10px', fontSize: '13px', backgroundColor: '#FFF' }} />
                    </div>
                  </div>
                )}

                {checkout.method === 'troco' && (
                  <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '14px', backgroundColor: '#FFF7ED', border: '1px solid #FDE68A', fontSize: '12px', color: '#92400E', lineHeight: 1.6 }}>
                    💡 Recharge depuis ton solde Troco ou par virement SEPA. Tes jetons seront convertis automatiquement si le solde est insuffisant.
                  </div>
                )}

                <button onClick={handleConfirmPayment} className="premium-button" style={{ width: '100%', border: 'none', borderRadius: '16px', padding: '14px', backgroundColor: '#04265A', color: '#FFF', fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 22px rgba(4,38,90,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Lock size={15} /> Payer {(checkout.amount || 0).toFixed(2)} €
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ---- MODALE CONTRE-PROPOSITION ---- */}
      {isCounterOfferOpen && selectedChat && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 65 }}>
          <div style={{ width: '100%', maxWidth: '440px', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(26px) saturate(180%)', WebkitBackdropFilter: 'blur(26px) saturate(180%)', borderRadius: '26px', padding: '22px', boxShadow: '0 26px 70px rgba(2,6,23,0.25)', border: '1px solid rgba(255,255,255,0.8)', position: 'relative' }}>
            <button onClick={() => setIsCounterOfferOpen(false)} style={{ position: 'absolute', top: '14px', right: '14px', border: 'none', backgroundColor: '#F3F4F6', width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={16} color="#374151" />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Sparkles size={17} color="#04265A" />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#111827' }}>{t('counterOfferTitle')}</h3>
            </div>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 16px', lineHeight: 1.6 }}>Ajuste les termes du deal avec {selectedChat.user} — Montant en euros, Jetons Troco et conditions d'échange. {selectedChat.user} sera seul habilité à accepter ou refuser.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#374151' }}>Montant en euros (€)</label>
                <input type="number" min="0" value={counterOfferDraft.euroAmount} onChange={(e) => setCounterOfferDraft(prev => ({ ...prev, euroAmount: e.target.value }))} placeholder="Ex : 15" style={{ width: '100%', padding: '10px 12px', marginTop: '6px', border: '1px solid #D1D5DB', borderRadius: '12px', fontSize: '14px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#374151' }}>Jetons Troco</label>
                <input type="number" min="0" value={counterOfferDraft.trocoTokens} onChange={(e) => setCounterOfferDraft(prev => ({ ...prev, trocoTokens: e.target.value }))} placeholder="Ex : 2" style={{ width: '100%', padding: '10px 12px', marginTop: '6px', border: '1px solid #D1D5DB', borderRadius: '12px', fontSize: '14px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#374151' }}>Conditions d'échange</label>
                <textarea rows={3} value={counterOfferDraft.conditions} onChange={(e) => setCounterOfferDraft(prev => ({ ...prev, conditions: e.target.value }))} placeholder="Ex : 1 séance d'essai de 30 min, puis tarif horaire..." style={{ width: '100%', padding: '10px 12px', marginTop: '6px', border: '1px solid #D1D5DB', borderRadius: '12px', fontSize: '13px', resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setIsCounterOfferOpen(false)} style={{ flex: 1, border: '1px solid #D1D5DB', borderRadius: '14px', padding: '11px', backgroundColor: '#FFF', color: '#6B7280', fontWeight: '800', cursor: 'pointer' }}>{t('cancelButton')}</button>
              <button onClick={submitCounterOffer} style={{ flex: 2, border: 'none', borderRadius: '14px', padding: '11px', backgroundColor: '#04265A', color: '#FFF', fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 18px rgba(4,38,90,0.22)' }}>{t('sendCounterOffer')}</button>
            </div>
          </div>
        </div>
      )}

      {isLangModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 65 }}>
          <div style={{ backgroundColor: darkMode ? '#1E293B' : 'rgba(255,255,255,0.92)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderRadius: '24px', width: '100%', maxWidth: '380px', padding: '24px', boxShadow: '0 24px 60px rgba(0,0,0,0.25)', border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.8)', position: 'relative' }}>
            <button onClick={() => setIsLangModalOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#F3F4F6', width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: darkMode ? '#FFF' : '#374151' }}>
              <X size={16} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: darkMode ? '#60A5FA' : '#04265A' }}>
              <Globe size={20} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: darkMode ? '#FFF' : '#111827' }}>{t('selectLanguage')}</h3>
            </div>
            <p style={{ fontSize: '12px', color: darkMode ? '#94A3B8' : '#64748B', margin: '0 0 16px', lineHeight: 1.5 }}>
              L'interface et les annonces seront instantanément traduites dans la langue choisie.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                    justify: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    border: currentLang === lang.code ? (darkMode ? '2px solid #60A5FA' : '2px solid #04265A') : (darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0'),
                    backgroundColor: currentLang === lang.code ? (darkMode ? 'rgba(4,38,90,0.5)' : '#EFF6FF') : (darkMode ? 'rgba(255,255,255,0.05)' : '#FFF'),
                    cursor: 'pointer',
                    color: darkMode ? '#FFF' : '#111827',
                    fontWeight: currentLang === lang.code ? '800' : '600',
                    fontSize: '13px'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </span>
                  {currentLang === lang.code && <CheckCircle size={16} color={darkMode ? '#60A5FA' : '#04265A'} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isCreditModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 50 }}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderRadius: '24px', width: '100%', maxWidth: '560px', padding: '22px', boxShadow: '0 24px 60px rgba(0,0,0,0.20)', border: '1px solid rgba(255,255,255,0.7)', position: 'relative' }}>
            <button onClick={() => setIsCreditModalOpen(false)} style={{ position: 'absolute', top: '14px', right: '14px', border: 'none', backgroundColor: '#F3F4F6', width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={16} color="#374151" />
            </button>

            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#04265A', fontWeight: '700', marginBottom: '6px' }}>
                <Coins size={18} />
                <span>{t('wallet')}</span>
              </div>
              <h3 style={{ margin: 0, fontSize: '20px', color: '#111827' }}>{t('manageWalletSub')}</h3>
              <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#6B7280' }}>{t('walletNotice')}</p>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <button onClick={() => setWalletTab('cash')} style={{ flex: 1, border: walletTab === 'cash' ? '1px solid #04265A' : '1px solid #E5E7EB', borderRadius: '14px', padding: '10px', backgroundColor: walletTab === 'cash' ? '#EFF6FF' : 'rgba(250,250,250,0.8)', color: '#111827', fontWeight: '700', cursor: 'pointer' }}>{t('rechargeCash')}</button>
              <button onClick={() => setWalletTab('tokens')} style={{ flex: 1, border: walletTab === 'tokens' ? '1px solid #04265A' : '1px solid #E5E7EB', borderRadius: '14px', padding: '10px', backgroundColor: walletTab === 'tokens' ? '#EFF6FF' : 'rgba(250,250,250,0.8)', color: '#111827', fontWeight: '700', cursor: 'pointer' }}>{t('buyTokens')}</button>
            </div>

            {walletTab === 'cash' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[10, 20, 50].map(amount => (
                    <button key={amount} onClick={() => setWalletAmount(amount)} style={{ border: walletAmount === amount ? '1px solid #04265A' : '1px solid #D1D5DB', borderRadius: '999px', padding: '8px 12px', backgroundColor: walletAmount === amount ? '#EFF6FF' : '#FFF', color: '#111827', fontWeight: '700', cursor: 'pointer' }}>{amount}€</button>
                  ))}
                </div>
                <div style={{ border: '1px solid #E5E7EB', borderRadius: '16px', padding: '14px', backgroundColor: '#F8FAFC' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151' }}>{t('customAmount')}</label>
                  <input type="number" min="1" value={walletAmount} onChange={(e) => setWalletAmount(Number(e.target.value))} style={{ width: '100%', marginTop: '8px', border: '1px solid #D1D5DB', borderRadius: '12px', padding: '10px 12px' }} />
                </div>
                <button onClick={() => { setIsCreditModalOpen(false); openCheckout({ mode: 'wallet-cash', amount: walletAmount, label: 'Rechargement du solde Euro' }); }} className="premium-button" style={{ width: '100%', border: 'none', borderRadius: '14px', padding: '12px', backgroundColor: '#04265A', color: '#FFFFFF', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Lock size={14} /> {t('rechargeAction')} {walletAmount}€ — {t('securePaymentHeader')}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { amount: 1, euros: 12, titleKey: 'pack1Token' },
                  { amount: 5, euros: 50, titleKey: 'pack5Tokens' }
                ].map(pack => {
                  const titleText = t(pack.titleKey);
                  const tokenText = formatTokenCount(pack.amount, currentLang);
                  const buyBtnText = `${t('buyAction')} ${tokenText} — ${pack.euros}€`;
                  return (
                    <div key={pack.titleKey} style={{ border: '1px solid #E5E7EB', borderRadius: '16px', padding: '14px', backgroundColor: 'rgba(250,250,250,0.8)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ fontWeight: '700', color: '#111827' }}>{titleText}</div>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#04265A' }}>{pack.euros}€</span>
                      </div>
                      <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#6B7280', lineHeight: 1.5 }}>{t('tokenPackSub')}</p>
                      {profile.euroBalance < pack.euros && (
                        <div style={{ fontSize: '12px', color: '#EF4444', fontWeight: '600', marginBottom: '8px', padding: '8px 10px', backgroundColor: '#FEF2F2', borderRadius: '10px', border: '1px solid #FECACA' }}>
                          ⚠️ Solde insuffisant ({profile.euroBalance.toFixed(2)}€ disponibles sur {pack.euros}€ requis) — Recharge ton solde Euro d'abord.
                        </div>
                      )}
                      <button
                        onClick={() => {
                          if (profile.euroBalance < pack.euros) return;
                          setIsCreditModalOpen(false);
                          openCheckout({ mode: 'wallet-tokens', amount: pack.euros, label: titleText, payload: { tokenAmount: pack.amount } });
                        }}
                        disabled={profile.euroBalance < pack.euros}
                        className="premium-button"
                        style={{ width: '100%', border: 'none', borderRadius: '12px', padding: '10px', backgroundColor: profile.euroBalance < pack.euros ? '#94A3B8' : '#04265A', color: '#FFFFFF', fontWeight: '700', cursor: profile.euroBalance < pack.euros ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: profile.euroBalance < pack.euros ? 0.6 : 1 }}
                      >
                        <Lock size={13} /> {buyBtnText}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {isFilterDrawerOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 55, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: '360px', height: '100%', backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', padding: '20px', boxShadow: '-12px 0 40px rgba(0,0,0,0.16)', overflowY: 'auto', borderLeft: '1px solid rgba(255,255,255,0.7)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>{t('filtersTitle')}</h3>
              <button onClick={() => setIsFilterDrawerOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '10px 14px', borderRadius: '14px', backgroundColor: '#EFF6FF', border: '1px solid #A7F3D0', color: '#04265A', fontSize: '12px', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} />
              <span>
                {isInfiniteRadius || radiusKm >= 100
                  ? `🎉 ${filteredListings.length} annonces au total (Mode Infini & Visio)`
                  : `📍 ${filteredListings.length} annonce${filteredListings.length > 1 ? 's' : ''} disponible${filteredListings.length > 1 ? 's' : ''} dans ${radiusKm} km`}
              </span>
            </div>
            {/* GEOLOCALISATION SILENCIEUSE GEOPRIVACY BOUTON */}
            <div style={{ marginBottom: '14px' }}>
              <button
                onClick={handleRequestGeolocation}
                disabled={isGeolocating}
                className="premium-button"
                style={{
                  width: '100%',
                  border: isGeolocated ? '1px solid #10B981' : (darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB'),
                  backgroundColor: isGeolocated ? (darkMode ? 'rgba(16,185,129,0.2)' : '#D1FAE5') : (darkMode ? 'rgba(15,23,42,0.6)' : '#F3F4F6'),
                  color: isGeolocated ? (darkMode ? '#34D399' : '#059669') : (darkMode ? '#FFF' : '#111827'),
                  padding: '10px 14px',
                  borderRadius: '14px',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <MapPin size={15} color={isGeolocated ? '#10B981' : (darkMode ? '#93C5FD' : '#04265A')} />
                {isGeolocating ? 'Localisation...' : isGeolocated ? '📍 Position sécurisée active' : t('useMyLocation')}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#CBD5E1' : '#374151' }}>{t('searchRadius')}</label>
              <button
                onClick={() => setIsInfiniteRadius(prev => !prev)}
                style={{
                  border: isInfiniteRadius || radiusKm >= 2000 ? (darkMode ? '1px solid #60A5FA' : '1px solid #04265A') : (darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB'),
                  backgroundColor: isInfiniteRadius || radiusKm >= 2000 ? (darkMode ? 'rgba(4,38,90,0.5)' : '#EFF6FF') : (darkMode ? 'rgba(15,23,42,0.5)' : '#FFF'),
                  color: isInfiniteRadius || radiusKm >= 2000 ? (darkMode ? '#93C5FD' : '#04265A') : (darkMode ? '#CBD5E1' : '#64748B'),
                  borderRadius: '999px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                {t('infiniteWorld')}
              </button>
            </div>
            <input
              type="range"
              min="5"
              max="2000"
              step="5"
              value={isInfiniteRadius ? 2000 : radiusKm}
              onChange={(e) => {
                const val = Number(e.target.value);
                setRadiusKm(val);
                if (val >= 2000) {
                  setIsInfiniteRadius(true);
                } else {
                  setIsInfiniteRadius(false);
                }
              }}
              style={{
                width: '100%',
                marginTop: '4px',
                background: `linear-gradient(to right, #04265A 0%, #04265A ${(isInfiniteRadius ? 2000 : radiusKm) / 2000 * 100}%, ${darkMode ? '#334155' : '#E2E8F0'} ${(isInfiniteRadius ? 2000 : radiusKm) / 2000 * 100}%, ${darkMode ? '#334155' : '#E2E8F0'} 100%)`
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', color: darkMode ? '#93C5FD' : '#04265A', fontWeight: '800' }}>
                {isInfiniteRadius || radiusKm >= 2000 ? '♾️ Infini (Monde entier)' : `📍 Jusqu'à ${radiusKm} km`}
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {[5, 25, 100, 500, 2000].map(preset => (
                  <button
                    key={preset}
                    onClick={() => { setRadiusKm(preset); setIsInfiniteRadius(preset >= 2000); }}
                    style={{
                      border: !isInfiniteRadius && radiusKm === preset ? (darkMode ? '1px solid #60A5FA' : '1px solid #04265A') : (darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0'),
                      backgroundColor: !isInfiniteRadius && radiusKm === preset ? (darkMode ? 'rgba(4,38,90,0.5)' : '#EFF6FF') : (darkMode ? 'rgba(15,23,42,0.5)' : '#F8FAFC'),
                      color: !isInfiniteRadius && radiusKm === preset ? (darkMode ? '#93C5FD' : '#04265A') : (darkMode ? '#CBD5E1' : '#475569'),
                      borderRadius: '8px',
                      padding: '3px 7px',
                      fontSize: '10px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    {preset >= 2000 ? 'Monde' : `${preset}km`}
                  </button>
                ))}
              </div>
            </div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151' }}>{t('languages') || 'Langues'}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px', marginBottom: '12px' }}>
              {[
                { code: 'FR', label: '🇫🇷 FR' },
                { code: 'EN', label: '🇬🇧 EN' },
                { code: 'ES', label: '🇪🇸 ES' },
                { code: 'IT', label: '🇮🇹 IT' },
                { code: 'DE', label: '🇩🇪 DE' },
                { code: 'JA', label: '🇯🇵 JA' },
                { code: 'ZH', label: '🇨🇳 ZH' }
              ].map(({ code, label }) => (
                <button
                  key={code}
                  onClick={() => toggleLanguageFilter(code)}
                  style={{
                    border: selectedLanguages.includes(code) ? '1px solid #04265A' : '1px solid #D1D5DB',
                    backgroundColor: selectedLanguages.includes(code) ? '#EFF6FF' : '#FFF',
                    color: selectedLanguages.includes(code) ? '#04265A' : '#111827',
                    borderRadius: '999px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151' }}>Rétribution</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
              {paymentOptions.map(option => (
                <button key={option} onClick={() => setSelectedPayment(option)} style={{ border: selectedPayment === option ? '1px solid #04265A' : '1px solid #D1D5DB', backgroundColor: selectedPayment === option ? '#EFF6FF' : '#FFF', color: '#111827', borderRadius: '999px', padding: '6px 10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>{paymentLabels[option]}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isCategoryModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 60 }}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderRadius: '20px', width: '100%', maxWidth: '360px', padding: '20px', border: '1px solid rgba(255,255,255,0.7)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', color: '#111827' }}>{t('addCategory')}</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <input value={categoryInput} onChange={(e) => setCategoryInput(e.target.value)} placeholder={t('categoryPlaceholder')} style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: '12px', padding: '10px 12px', marginBottom: '10px' }} />
            <button onClick={handleAddCategory} style={{ width: '100%', border: 'none', borderRadius: '12px', padding: '10px 12px', backgroundColor: '#04265A', color: '#FFF', fontWeight: '700', cursor: 'pointer' }}>{t('addButton')}</button>
          </div>
        </div>
      )}

      {selectedListing && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(2, 6, 23, 0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', zIndex: 80, overflowY: 'auto', padding: '16px' }}>
          <div style={{ maxWidth: '760px', margin: '0 auto', backgroundColor: darkMode ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.92)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderRadius: '28px', overflow: 'hidden', boxShadow: darkMode ? '0 30px 90px rgba(0,0,0,0.65)' : '0 30px 90px rgba(0,0,0,0.25)', border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.7)', color: darkMode ? '#F8FAFC' : '#111827' }}>

            {/* CARROUSEL HÉRO INTERACTIF (VIDÉO + GALERIE COHÉRENTE SANS DOUBLONS) */}
            <div
              onTouchStart={handleModalTouchStart}
              onTouchMove={handleModalTouchMove}
              onTouchEnd={handleModalTouchEnd}
              style={{ position: 'relative', width: '100%', height: '340px', backgroundColor: '#0F172A', touchAction: 'pan-y', userSelect: 'none', WebkitUserSelect: 'none', overflow: 'hidden' }}
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
              <button onClick={() => { setSelectedListing(null); setSelectedDetailImageIndex(0); setDetailMediaTab('image'); }} style={{ position: 'absolute', top: '14px', right: '14px', border: 'none', width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}><X size={18} /></button>

              {selectedListing.isBoosted && <span className="sponsored-badge" style={{ position: 'absolute', top: '14px', left: '14px', backgroundColor: '#F59E0B', color: '#FFF', fontSize: '11px', fontWeight: '800', padding: '6px 10px', borderRadius: '10px', boxShadow: '0 6px 16px rgba(245,158,11,0.45)', zIndex: 10 }}>🔥 Sponsorisé</span>}

              {/* FLÈCHES DE NAVIGATION LATÉRALE DANS LE CARROUSEL — STYLE MINIMALISTE & CLEAN */}
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
                      backgroundColor: 'rgba(0,0,0,0.25)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', zIndex: 10,
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      boxShadow: 'none'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.25)'; }}
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
                      backgroundColor: 'rgba(0,0,0,0.25)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', zIndex: 10,
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      boxShadow: 'none'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.25)'; }}
                  >
                    <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />
                  </button>
                </>
              )}

              {/* PUCES INDICATRICES DE POSITION (DOTS BULLETS) */}
              {detailMediaTab === 'image' && (selectedListing.gallery?.length || 0) > 1 && (
                <div style={{ position: 'absolute', bottom: '14px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px', zIndex: 10, backgroundColor: 'rgba(15,23,42,0.6)', padding: '6px 12px', borderRadius: '999px', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
                  {selectedListing.gallery.map((_, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedDetailImageIndex(idx)}
                      style={{
                        width: selectedDetailImageIndex === idx ? '20px' : '8px',
                        height: '8px',
                        borderRadius: '999px',
                        backgroundColor: selectedDetailImageIndex === idx ? '#60A5FA' : 'rgba(255,255,255,0.5)',
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
                  <button onClick={() => setDetailMediaTab('video')} style={{ border: 'none', borderRadius: '999px', padding: '7px 14px', backgroundColor: detailMediaTab === 'video' ? '#04265A' : 'rgba(15,23,42,0.75)', color: '#FFF', fontSize: '12px', fontWeight: '800', cursor: 'pointer', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Video size={13} /> {t('demoVideo')}
                  </button>
                )}
                <button onClick={() => setDetailMediaTab('image')} style={{ border: 'none', borderRadius: '999px', padding: '7px 14px', backgroundColor: detailMediaTab === 'image' ? '#04265A' : 'rgba(15,23,42,0.75)', color: '#FFF', fontSize: '12px', fontWeight: '800', cursor: 'pointer', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: '5px' }}>
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
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '999px', backgroundColor: darkMode ? 'rgba(4,38,90,0.6)' : '#EFF6FF', color: darkMode ? '#93C5FD' : '#04265A', fontSize: '11px', fontWeight: '800' }}>
                            <Sparkles size={12} /> {t('verifiedOffer')}
                          </div>
                          {(selectedListing.isDemo || (typeof selectedListing.id === 'number' && selectedListing.id <= 20)) && (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '800',
                              padding: '5px 10px',
                              borderRadius: '999px',
                              backgroundColor: darkMode ? 'rgba(126,34,206,0.3)' : '#F3E8FF',
                              color: darkMode ? '#D8B4FE' : '#7E22CE',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              🤖 Annonce IA (Démo)
                            </span>
                          )}
                        </div>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '22px', color: darkMode ? '#FFFFFF' : '#111827' }}>{detailDisplayContent.title}</h3>
                        {currentLang !== (selectedListing.nativeLang || 'FR') && (
                          <button
                            onClick={(e) => toggleOriginalListing(selectedListing.id, e)}
                            className="premium-button"
                            style={{
                              border: 'none',
                              backgroundColor: 'transparent',
                              color: darkMode ? '#60A5FA' : '#04265A',
                              fontSize: '12px',
                              fontWeight: '800',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '2px 0 6px 0'
                            }}
                          >
                            <Globe size={13} color={darkMode ? '#60A5FA' : '#04265A'} />
                            {isDetailShowingOriginal ? t('showTranslation') : t('showOriginal')}
                          </button>
                        )}
                      </div>
                      {selectedListing.authorProfile.name !== profile.name ? (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={() => {
                              setReportTarget({
                                listing: selectedListing,
                                user: { name: selectedListing.authorProfile.name, uid: selectedListing.authorProfile.uid || null }
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
                          <button onClick={() => handleStartDiscussion({ id: selectedListing.id, title: selectedListing.title, author: selectedListing.authorProfile.name, compensation: selectedListing.compensation })} className="premium-button" style={{ border: 'none', borderRadius: '999px', padding: '11px 16px', backgroundColor: '#04265A', color: '#FFF', fontWeight: '700', cursor: 'pointer', boxShadow: '0 10px 20px rgba(4,38,90,0.25)' }}>{t('startDiscussion')}</button>
                        </div>
                      ) : (
                        <div style={{ backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#F3F4F6', color: darkMode ? '#CBD5E1' : '#6B7280', padding: '10px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: '700', border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #E5E7EB' }}>{t('authorAnnc')}</div>
                      )}
                    </div>
                    <p style={{ margin: '0 0 14px', lineHeight: 1.7, color: darkMode ? '#CBD5E1' : '#475569', fontSize: '14px' }}>{detailDisplayContent.description}</p>
                  </>
                );
              })()}

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {localizeTags(selectedListing.tags, currentLang).map(tag => (
                  <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: darkMode ? 'rgba(4,38,90,0.6)' : '#EFF6FF', color: darkMode ? '#93C5FD' : '#04265A', borderRadius: '999px', padding: '5px 10px', fontSize: '11px', fontWeight: '800' }}><Tag size={11} /> {tag}</span>
                ))}
              </div>

              <div style={{ border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E2E8F0', borderRadius: '16px', padding: '14px', backgroundColor: darkMode ? 'rgba(30,41,59,0.7)' : '#F8FAFC', marginBottom: '14px' }}>
                <div style={{ fontWeight: '800', fontSize: '13px', color: darkMode ? '#F8FAFC' : '#111827', marginBottom: '6px' }}>{t('compensation')}</div>
                <div style={{ fontSize: '13px', color: darkMode ? '#60A5FA' : '#04265A', fontWeight: '700' }}>{formatCompensation(selectedListing.compensation)}</div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px', padding: '14px', borderRadius: '16px', backgroundColor: darkMode ? 'rgba(245,158,11,0.12)' : '#FFF7ED', border: darkMode ? '1px solid rgba(245,158,11,0.3)' : '1px solid #FFEDD5' }}>
                <img src={selectedListing.authorProfile.avatar} alt={selectedListing.authorProfile.name} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '800', color: darkMode ? '#FFFFFF' : '#111827' }}>{selectedListing.authorProfile.name}</div>
                  <div style={{ fontSize: '13px', color: darkMode ? '#CBD5E1' : '#64748B', marginTop: '4px' }}>{getBioTranslation(selectedListing.authorProfile.bio, currentLang, !!showingOriginalListings[selectedListing.id])}</div>
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontWeight: '800', fontSize: '13px', color: darkMode ? '#F8FAFC' : '#111827', marginBottom: '8px' }}>{t('socialNetworks')}</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {selectedListing.authorProfile.socials.map(link => <span key={link} style={{ border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #E2E8F0', borderRadius: '999px', padding: '6px 10px', fontSize: '12px', color: darkMode ? '#93C5FD' : '#04265A', fontWeight: '700', backgroundColor: darkMode ? 'rgba(30,41,59,0.5)' : 'transparent' }}>{link}</span>)}
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontWeight: '800', fontSize: '13px', color: darkMode ? '#F8FAFC' : '#111827', marginBottom: '8px' }}>{t('portfolio')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
                  {selectedListing.authorProfile.portfolio.map((image, index) => <img key={image + index} src={image} alt="portfolio" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '14px' }} />)}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: '800', fontSize: '13px', color: darkMode ? '#F8FAFC' : '#111827', marginBottom: '8px' }}>{t('reviews')}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedListing.authorProfile.reviews.map((review, index) => (
                    <div key={review.text + index} style={{ border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E2E8F0', borderRadius: '14px', padding: '12px', backgroundColor: darkMode ? 'rgba(30,41,59,0.6)' : '#FAFAFA' }}>
                      <div style={{ color: '#F59E0B', marginBottom: '4px' }}>{'⭐'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
                      <div style={{ fontSize: '13px', color: darkMode ? '#E2E8F0' : '#334155' }}>{localizeReview(review.text, currentLang)}</div>
                    </div>
                  ))}
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
      <main key={`${activeTab}-${viewMode}`} className="premium-main" style={{ maxWidth: activeTab === 'feed' ? '1460px' : '1200px', margin: '0 auto', padding: '20px 20px 90px', width: '100%', transition: 'max-width 0.3s ease' }}>

        {/* ONGLET 1 : EXPLORER / FEED */}
        {activeTab === 'feed' && (
          <div className="feed-layout-container">
            {/* BANNIÈRE LATÉRALE GAUCHE (DESKTOP) */}
            <aside className="desktop-ad-banner" aria-label="Espace Partenaires Troco">
              <div className="ad-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: darkMode ? '#93C5FD' : '#04265A', backgroundColor: darkMode ? 'rgba(4,38,90,0.6)' : '#EFF6FF', padding: '3px 7px', borderRadius: '6px' }}>
                    🌟 Partenaire Pro
                  </span>
                  <span style={{ fontSize: '9px', color: darkMode ? '#94A3B8' : '#94A3B8' }}>Sponsorisé</span>
                </div>
                <img
                  src="https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&q=80"
                  alt="Partenaire Outillage"
                  style={{ width: '100%', height: '85px', objectFit: 'cover', borderRadius: '12px', marginBottom: '8px' }}
                />
                <div style={{ fontSize: '13px', fontWeight: '800', color: darkMode ? '#FFFFFF' : '#0F172A', marginBottom: '4px', lineHeight: 1.3 }}>
                  Brico & Outillage Pro
                </div>
                <div style={{ fontSize: '11px', color: darkMode ? '#94A3B8' : '#64748B', lineHeight: 1.4, marginBottom: '8px' }}>
                  Matériel certifié disponible en prêt immédiat avec caution Troco.
                </div>
                <div style={{ display: 'inline-block', fontSize: '10px', fontWeight: '800', color: '#16A34A', backgroundColor: '#DCFCE7', padding: '2px 8px', borderRadius: '999px', marginBottom: '8px' }}>
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
                    backgroundColor: '#04265A',
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
                  <span style={{ fontSize: '9px', color: darkMode ? '#94A3B8' : '#94A3B8' }}>Publicité</span>
                </div>
                <img
                  src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80"
                  alt="Academia Code"
                  style={{ width: '100%', height: '85px', objectFit: 'cover', borderRadius: '12px', marginBottom: '8px' }}
                />
                <div style={{ fontSize: '13px', fontWeight: '800', color: darkMode ? '#FFFFFF' : '#0F172A', marginBottom: '4px', lineHeight: 1.3 }}>
                  Academia Code & Langues
                </div>
                <div style={{ fontSize: '11px', color: darkMode ? '#94A3B8' : '#64748B', lineHeight: 1.4, marginBottom: '8px' }}>
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
                    backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#F1F5F9',
                    color: darkMode ? '#FFF' : '#0F172A',
                    fontSize: '11px',
                    fontWeight: '700',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Trouver un mentor
                </button>
              </div>
            </aside>

            {/* CONTENU CENTRAL DU FEED */}
            <div className="feed-main-content">
              <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(209,213,219,0.7)', borderRadius: '16px', padding: '10px 14px', boxShadow: '0 4px 20px -4px rgba(15, 23, 42, 0.06)' }}>
                  <Search size={18} color="#9CA3AF" style={{ marginRight: '10px' }} />
                  <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} type="text" placeholder={t('searchPlaceholder')} style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', backgroundColor: 'transparent' }} />
                </div>
                <button
                  onClick={() => setIsFilterDrawerOpen(true)}
                  className="premium-button"
                  style={{
                    backgroundColor: isInfiniteRadius || radiusKm >= 100 ? '#EFF6FF' : 'rgba(255,255,255,0.8)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: isInfiniteRadius || radiusKm >= 100 ? '1px solid #04265A' : '1px solid rgba(209,213,219,0.7)',
                    borderRadius: '16px',
                    padding: '10px 14px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px -4px rgba(15, 23, 42, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: isInfiniteRadius || radiusKm >= 100 ? '#04265A' : '#374151',
                    fontWeight: '700',
                    fontSize: '13px'
                  }}
                >
                  <Filter size={18} color={isInfiniteRadius || radiusKm >= 100 ? '#04265A' : '#374151'} />
                  <span>{isInfiniteRadius || radiusKm >= 100 ? `♾️ ${t('infinite')}` : `${radiusKm} km`}</span>
                </button>
              </div>

              <div style={{ marginBottom: '14px', width: '100%', overflow: 'hidden' }}>
                <div className="category-scroll-container">
                  {allCategories.map(category => {
                    const isSel = selectedCategory === category;
                    return (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className="premium-button category-pill"
                        style={{
                          border: isSel ? (darkMode ? '1px solid #60A5FA' : '1px solid #04265A') : (darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(226,232,240,0.9)'),
                          backgroundColor: isSel ? (darkMode ? 'rgba(4,38,90,0.85)' : '#EFF6FF') : (darkMode ? 'rgba(30,41,59,0.7)' : 'rgba(248,250,252,0.95)'),
                          color: isSel ? (darkMode ? '#93C5FD' : '#04265A') : (darkMode ? '#CBD5E1' : '#475569'),
                          boxShadow: isSel ? '0 4px 14px rgba(4,38,90,0.15)' : '0 2px 8px rgba(15, 23, 42, 0.04)',
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
                      border: darkMode ? '1px dashed #60A5FA' : '1px dashed #04265A',
                      backgroundColor: darkMode ? 'rgba(4,38,90,0.3)' : '#F0FDFA',
                      color: darkMode ? '#93C5FD' : '#04265A',
                      cursor: 'pointer'
                    }}
                  >
                    + {t('newCategory')}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
                <div className="premium-panel" style={{ display: 'inline-flex', border: '1px solid rgba(226,232,240,0.9)', borderRadius: '999px', padding: '4px', backgroundColor: 'rgba(255,255,255,0.8)', boxShadow: '0 4px 20px -4px rgba(15, 23, 42, 0.06)' }}>
                  <button onClick={() => setViewMode('list')} className="premium-nav-btn" style={{ border: 'none', borderRadius: '999px', padding: '7px 12px', backgroundColor: viewMode === 'list' ? '#04265A' : 'transparent', color: viewMode === 'list' ? '#FFF' : '#64748B', fontWeight: '700', cursor: 'pointer' }}>{t('viewList')}</button>
                  <button onClick={() => { setViewMode('map'); setIsInfiniteRadius(true); }} className="premium-nav-btn" style={{ border: 'none', borderRadius: '999px', padding: '7px 12px', backgroundColor: viewMode === 'map' ? '#04265A' : 'transparent', color: viewMode === 'map' ? '#FFF' : '#64748B', fontWeight: '700', cursor: 'pointer' }}>{t('viewMap')}</button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '22px' }}>
                <button onClick={() => setFormatFilter('all')} className="premium-button" style={{ flex: 1, padding: '10px', borderRadius: '14px', border: 'none', backgroundColor: formatFilter === 'all' ? '#04265A' : 'rgba(255,255,255,0.8)', color: formatFilter === 'all' ? '#FFF' : '#374151', fontSize: '12px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 16px -4px rgba(15,23,42,0.08)' }}>{t('all')}</button>
                <button onClick={() => setFormatFilter('onsite')} className="premium-button" style={{ flex: 1, padding: '10px', borderRadius: '14px', border: 'none', backgroundColor: formatFilter === 'onsite' ? '#04265A' : 'rgba(255,255,255,0.8)', color: formatFilter === 'onsite' ? '#FFF' : '#374151', fontSize: '12px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 16px -4px rgba(15,23,42,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}><MapPin size={13} /> {t('onsite')}</button>
                <button onClick={() => setFormatFilter('remote')} className="premium-button" style={{ flex: 1, padding: '10px', borderRadius: '14px', border: 'none', backgroundColor: formatFilter === 'remote' ? '#04265A' : 'rgba(255,255,255,0.8)', color: formatFilter === 'remote' ? '#FFF' : '#374151', fontSize: '12px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 16px -4px rgba(15,23,42,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}><Video size={13} /> {t('remote')}</button>
              </div>

              {filteredListings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(229,231,235,0.9)', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', animation: 'fadeSlideUp 0.3s ease both' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#EFF6FF', color: '#04265A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 20px rgba(4,38,90,0.15)' }}>
                    <Search size={28} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111827', margin: '0 0 8px' }}>Aucune annonce ne correspond à ta recherche</h3>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 20px', maxWidth: '420px', marginInline: 'auto', lineHeight: 1.6 }}>Essaie d'élargir ton rayon de recherche, de changer de catégorie ou de réinitialiser tes filtres pour découvrir les annonces des membres Troco.</p>
                  <button
                    onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setRadiusKm(100); setIsInfiniteRadius(true); setSelectedLanguages([]); setSelectedPayment('all'); setFormatFilter('all'); }}
                    className="premium-button"
                    style={{ border: 'none', borderRadius: '999px', padding: '10px 22px', backgroundColor: '#04265A', color: '#FFF', fontWeight: '800', fontSize: '13px', cursor: 'pointer', boxShadow: '0 8px 18px rgba(4,38,90,0.2)' }}
                  >
                    Réinitialiser tous les filtres
                  </button>
                </div>
              ) : viewMode === 'map' ? (
                <div className="premium-panel" style={{ backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRadius: '24px', padding: '10px', boxShadow: '0 10px 30px rgba(15,23,42,0.06)' }}>
                  <div style={{ position: 'relative', width: '100%', height: '550px', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 14px 30px rgba(15,23,42,0.12)' }}>
                    <MapContainer
                      center={mapCenter}
                      zoom={4}
                      minZoom={2}
                      maxBounds={[[-85, -180], [85, 180]]}
                      maxBoundsViscosity={1.0}
                      worldCopyJump={true}
                      style={{ width: '100%', height: '100%' }}
                    >
                      <TileLayer
                        noWrap={true}
                        bounds={[[-85, -180], [85, 180]]}
                        attribution='&copy; Google Maps'
                        url={`https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=${currentLang.toLowerCase()}`}
                      />
                      {filteredListings.map(item => {
                        const coords = item.coordinates || getCoordinatesForLocation(item.location);
                        const media = getSuggestedMedia(item.title, item.description || '', item.image, item.video);
                        const displayContent = getListingDisplayContent(item, currentLang, !!showingOriginalListings[item.id]);
                        const localizedLoc = localizeLocation(item.location, currentLang);
                        return (
                          <Marker key={item.id} position={coords} icon={createModernMapIcon(darkMode)}>
                            <Popup>
                              <div style={{ minWidth: '190px', maxWidth: '280px', display: 'flex', flexDirection: 'column', gap: '6px', padding: '2px' }}>
                                <div style={{ position: 'relative' }}>
                                  <img src={media.image} alt={displayContent.title} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '10px' }} />
                                  {(item.isDemo || (typeof item.id === 'number' && item.id <= 20)) && (
                                    <span style={{ position: 'absolute', top: '6px', left: '6px', backgroundColor: '#7E22CE', color: '#FFF', fontSize: '9px', fontWeight: '800', padding: '2px 6px', borderRadius: '6px' }}>
                                      🤖 Annonce IA
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontWeight: '800', fontSize: '12px', color: '#111827', lineHeight: 1.3 }}>{displayContent.title}</div>
                                <div style={{ fontSize: '11px', color: '#64748B', lineHeight: 1.4 }}>📍 {localizedLoc}</div>
                                <div style={{ fontSize: '11px', color: '#04265A', fontWeight: '800' }}>{item.compensation}</div>
                                <button onClick={(event) => { event.stopPropagation(); handleOpenListing(item); }} className="premium-button" style={{ border: 'none', borderRadius: '10px', padding: '7px 10px', backgroundColor: '#04265A', color: '#FFF', fontWeight: '700', cursor: 'pointer', marginTop: '2px', fontSize: '11px' }}>{t('viewListingButton')}</button>
                              </div>
                            </Popup>
                          </Marker>
                        );
                      })}
                    </MapContainer>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                  {filteredListings.map((item) => (
                    <FeedCardItem
                      key={item.id}
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
                      onAdminDeleteListing={handleAdminDeleteListing}
                      t={t}
                    />
                  ))}
                </div>
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
                    const myListing = listings.find(l => l.author === profile.name) || listings[0];
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
        )}

        {/* ONGLET 2 : MESSAGERIE & NÉGOCIATIONS */}
        {activeTab === 'chat' && (() => {
          const activeChatData = chatsList.find(c => String(c.id) === String(selectedChat?.id));
          const otherUserName = activeChatData?.user || selectedChat?.user;
          const isThemTyping = !!(activeChatData?.typing && otherUserName && activeChatData.typing[otherUserName]);

          return (
            <ChatView
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
              handleAcceptDeal={handleAcceptDeal}
              handleDeclineDeal={handleDeclineDeal}
              profile={profile}
              currentLang={currentLang}
              t={t}
              darkMode={darkMode}
              getChatMessageDisplayContent={getChatMessageDisplayContent}
              getListingTitleTranslation={getListingTitleTranslation}
              formatStatus={formatStatus}
              showingOriginalMessages={showingOriginalMessages}
              toggleOriginalMessage={toggleOriginalMessage}
            />
          );
        })()}

        {/* ONGLET 3 : DÉPOSER UNE ANNONCE */}
        {activeTab === 'post' && (
          <div style={{ backgroundColor: darkMode ? 'rgba(30,41,59,0.85)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', padding: '20px', borderRadius: '24px', border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(229,231,235,0.9)', boxShadow: '0 10px 30px rgba(15,23,42,0.06)', color: darkMode ? '#F8FAFC' : '#111827' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', padding: '6px 10px', borderRadius: '999px', backgroundColor: darkMode ? 'rgba(4,38,90,0.6)' : '#EFF6FF', color: darkMode ? '#93C5FD' : '#04265A', marginBottom: '8px' }}>
                  <Sparkles size={12} /> {t('guidedPath')}
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: darkMode ? '#FFFFFF' : '#111827', margin: 0 }}>{t('postTitle')}</h2>
              </div>
              <div style={{ fontSize: '12px', color: darkMode ? '#CBD5E1' : '#64748B', fontWeight: '700' }}>{postStep}/4</div>
            </div>
            {publishMessage && (
              <div style={{ marginBottom: '14px', padding: '12px 14px', borderRadius: '14px', backgroundColor: darkMode ? 'rgba(4,38,90,0.6)' : '#EFF6FF', color: darkMode ? '#93C5FD' : '#04265A', fontSize: '13px', fontWeight: '700', lineHeight: 1.5 }}>
                {publishMessage}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {[1, 2, 3, 4].map(step => (
                <div key={step} style={{ flex: 1, height: '6px', borderRadius: '999px', backgroundColor: postStep >= step ? (darkMode ? '#60A5FA' : '#04265A') : (darkMode ? 'rgba(255,255,255,0.15)' : '#E5E7EB'), transition: 'all 0.3s ease' }} />
              ))}
            </div>

            {postStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '13px', color: darkMode ? '#CBD5E1' : '#64748B' }}>{t('chooseAdTypePrompt')}</div>
                <button onClick={() => setPostDraft(prev => ({ ...prev, type: 'offer' }))} style={{ border: '1px solid', borderColor: postDraft.type === 'offer' ? (darkMode ? '#60A5FA' : '#04265A') : (darkMode ? 'rgba(255,255,255,0.15)' : '#E5E7EB'), borderRadius: '16px', padding: '14px', backgroundColor: postDraft.type === 'offer' ? (darkMode ? 'rgba(4,38,90,0.7)' : '#EFF6FF') : (darkMode ? 'rgba(15,23,42,0.6)' : '#FFF'), textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                  <div style={{ fontWeight: '800', color: darkMode ? '#FFFFFF' : '#111827' }}>{t('iOfferService')}</div>
                  <div style={{ fontSize: '12px', color: darkMode ? '#CBD5E1' : '#64748B', marginTop: '4px' }}>{t('iOfferServiceSub')}</div>
                </button>
                <button onClick={() => setPostDraft(prev => ({ ...prev, type: 'request' }))} style={{ border: '1px solid', borderColor: postDraft.type === 'request' ? (darkMode ? '#60A5FA' : '#04265A') : (darkMode ? 'rgba(255,255,255,0.15)' : '#E5E7EB'), borderRadius: '16px', padding: '14px', backgroundColor: postDraft.type === 'request' ? (darkMode ? 'rgba(4,38,90,0.7)' : '#EFF6FF') : (darkMode ? 'rgba(15,23,42,0.6)' : '#FFF'), textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                  <div style={{ fontWeight: '800', color: darkMode ? '#FFFFFF' : '#111827' }}>{t('iRequestService')}</div>
                  <div style={{ fontSize: '12px', color: darkMode ? '#CBD5E1' : '#64748B', marginTop: '4px' }}>{t('iRequestServiceSub')}</div>
                </button>
              </div>
            )}

            {postStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: darkMode ? '#CBD5E1' : '#374151' }}>{t('adTitleLabel')}</label>
                  <input value={postDraft.title} onChange={(e) => setPostDraft(prev => ({ ...prev, title: e.target.value }))} type="text" placeholder={t('adTitlePlaceholder')} style={{ width: '100%', padding: '10px 12px', marginTop: '6px', border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB', backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF', color: darkMode ? '#FFF' : '#111827', borderRadius: '12px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: darkMode ? '#CBD5E1' : '#374151' }}>{t('adCategoryLabel')}</label>
                  <select value={postDraft.category} onChange={(e) => setPostDraft(prev => ({ ...prev, category: e.target.value }))} style={{ width: '100%', padding: '10px 12px', marginTop: '6px', border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB', backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF', color: darkMode ? '#FFF' : '#111827', borderRadius: '12px' }}>
                    <option value="Cours & Compétences" style={{ backgroundColor: darkMode ? '#0F172A' : '#FFF', color: darkMode ? '#FFF' : '#000' }}>{t('catSkills')}</option>
                    <option value="Prêt de Matériel" style={{ backgroundColor: darkMode ? '#0F172A' : '#FFF', color: darkMode ? '#FFF' : '#000' }}>{t('catTools')}</option>
                    <option value="Services & Dépannage" style={{ backgroundColor: darkMode ? '#0F172A' : '#FFF', color: darkMode ? '#FFF' : '#000' }}>{t('catServices')}</option>
                    <option value="Logement & Stay Swap" style={{ backgroundColor: darkMode ? '#0F172A' : '#FFF', color: darkMode ? '#FFF' : '#000' }}>{t('catHousing')}</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: darkMode ? '#CBD5E1' : '#374151' }}>{t('adFormatLabel')}</label>
                  <select value={postDraft.format} onChange={(e) => setPostDraft(prev => ({ ...prev, format: e.target.value }))} style={{ width: '100%', padding: '10px 12px', marginTop: '6px', border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB', backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF', color: darkMode ? '#FFF' : '#111827', borderRadius: '12px' }}>
                    <option value="onsite" style={{ backgroundColor: darkMode ? '#0F172A' : '#FFF', color: darkMode ? '#FFF' : '#000' }}>{t('onsite')}</option>
                    <option value="remote" style={{ backgroundColor: darkMode ? '#0F172A' : '#FFF', color: darkMode ? '#FFF' : '#000' }}>{t('remote')}</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: darkMode ? '#CBD5E1' : '#374151' }}>{t('adDescriptionLabel')}</label>
                  <textarea value={postDraft.description} onChange={(e) => setPostDraft(prev => ({ ...prev, description: e.target.value }))} rows={4} placeholder={t('adDescriptionPlaceholder')} style={{ width: '100%', padding: '10px 12px', marginTop: '6px', border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB', backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF', color: darkMode ? '#FFF' : '#111827', borderRadius: '12px', resize: 'vertical' }} />
                </div>

                {/* ---- MÉDIAS INTELLIGENTS (PHOTO & VIDÉO) ---- */}
                <div style={{ padding: '16px', borderRadius: '18px', backgroundColor: darkMode ? 'rgba(15,23,42,0.6)' : '#F8FAFC', border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={16} color={darkMode ? '#60A5FA' : '#04265A'} />
                      <label style={{ fontSize: '13px', fontWeight: '800', color: darkMode ? '#FFFFFF' : '#111827' }}>{t('adMediaTitle')}</label>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const suggested = getSuggestedMedia(postDraft.title, postDraft.description);
                        setPostDraft(prev => ({ ...prev, imageUrl: suggested.image, videoUrl: suggested.video }));
                      }}
                      className="premium-button"
                      style={{ border: 'none', borderRadius: '10px', padding: '6px 12px', backgroundColor: darkMode ? 'rgba(4,38,90,0.7)' : '#EFF6FF', color: darkMode ? '#93C5FD' : '#04265A', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                    >
                      {t('autoGenerateVisuals')}
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: darkMode ? '#CBD5E1' : '#64748B', lineHeight: 1.5 }}>
                    {t('adMediaDesc')}
                  </p>

                  {/* SECTION PHOTO */}
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#CBD5E1' : '#374151', marginBottom: '6px' }}>{t('mainPhotoLabel')}</div>
                    <input value={postDraft.imageUrl} onChange={(e) => setPostDraft(prev => ({ ...prev, imageUrl: e.target.value }))} placeholder={t('photoUrlPlaceholder')} style={{ width: '100%', padding: '9px 12px', border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB', backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF', color: darkMode ? '#FFF' : '#111827', borderRadius: '10px', fontSize: '12px', marginBottom: '8px' }} />
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <img src={getSuggestedMedia(postDraft.title, postDraft.description, postDraft.imageUrl).image} alt="aperçu" style={{ width: '90px', height: '65px', objectFit: 'cover', borderRadius: '10px', border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB' }} />
                      <label style={{ flex: 1, border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB', borderRadius: '10px', padding: '8px', backgroundColor: darkMode ? 'rgba(30,41,59,0.8)' : '#FFF', color: darkMode ? '#E2E8F0' : '#374151', fontSize: '11px', fontWeight: '800', cursor: 'pointer', textAlign: 'center' }}>
                        <Plus size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> {t('importPhoto')}
                        <input type="file" accept="image/*" onChange={handleImageFileUpload} style={{ display: 'none' }} />
                      </label>
                      <button type="button" onClick={() => setPostDraft(prev => ({ ...prev, gallery: [...(prev.gallery || [getSuggestedMedia(prev.title, prev.description, prev.imageUrl).image]), 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80'] }))} style={{ flex: 1, border: darkMode ? '1px dashed rgba(255,255,255,0.3)' : '1px dashed #D1D5DB', borderRadius: '10px', padding: '8px', backgroundColor: darkMode ? 'rgba(15,23,42,0.5)' : '#F8FAFC', color: darkMode ? '#E2E8F0' : '#374151', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>
                        <Plus size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> {t('addPhoto')} ({(postDraft.gallery || []).length || 1})
                      </button>
                    </div>
                  </div>

                  {/* SECTION VIDÉO */}
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#CBD5E1' : '#374151', marginBottom: '6px' }}>{t('miniVideoLabel')}</div>
                    <input value={postDraft.videoUrl} onChange={(e) => setPostDraft(prev => ({ ...prev, videoUrl: e.target.value }))} placeholder={t('videoUrlPlaceholder')} style={{ width: '100%', padding: '9px 12px', border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB', backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF', color: darkMode ? '#FFF' : '#111827', borderRadius: '10px', fontSize: '12px', marginBottom: '8px' }} />
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <div style={{ width: '90px', height: '65px', borderRadius: '10px', overflow: 'hidden', border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB', backgroundColor: '#0F172A' }}>
                        <video src={getSuggestedMedia(postDraft.title, postDraft.description, postDraft.imageUrl, postDraft.videoUrl).video} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <label style={{ flex: 1, border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB', borderRadius: '10px', padding: '8px', backgroundColor: darkMode ? 'rgba(30,41,59,0.8)' : '#FFF', color: darkMode ? '#E2E8F0' : '#374151', fontSize: '11px', fontWeight: '800', cursor: 'pointer', textAlign: 'center' }}>
                        <Plus size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> {t('importVideo')}
                        <input type="file" accept="video/*" onChange={handleVideoFileUpload} style={{ display: 'none' }} />
                      </label>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: darkMode ? '#CBD5E1' : '#64748B', marginBottom: '6px' }}>{currentLang === 'FR' ? 'Tags (Mots-clés)' : 'Tags (Keywords)'}</div>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px', alignItems: 'center' }}>
                      {(postDraft.tags || []).map(tag => (
                        <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: darkMode ? 'rgba(4,38,90,0.8)' : '#04265A', color: '#FFF', borderRadius: '999px', padding: '4px 9px', fontSize: '10px', fontWeight: '800' }}>
                          <Tag size={10} /> {tag}
                          <button type="button" onClick={() => setPostDraft(prev => ({ ...prev, tags: (prev.tags || []).filter(t => t !== tag) }))} style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', padding: 0, marginLeft: '2px', display: 'flex' }}><X size={10} /></button>
                        </span>
                      ))}
                      <input
                        type="text"
                        placeholder={currentLang === 'FR' ? 'Ajouter un tag...' : 'Add a tag...'}
                        value={tagInputValue}
                        onChange={e => setTagInputValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const newTag = tagInputValue.trim();
                            if (newTag && !(postDraft.tags || []).includes(newTag)) {
                              setPostDraft(prev => ({ ...prev, tags: [...(prev.tags || []), newTag] }));
                            }
                            setTagInputValue('');
                          }
                        }}
                        style={{ border: 'none', outline: 'none', background: 'transparent', color: darkMode ? '#FFF' : '#111827', fontSize: '11px', width: '130px', padding: '4px' }}
                      />
                    </div>

                    <div style={{ fontSize: '10px', color: darkMode ? '#94A3B8' : '#64748B', marginBottom: '6px' }}>{currentLang === 'FR' ? 'Suggestions (cliquez pour ajouter) :' : 'Suggestions (click to add):'}</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {generateTags(postDraft.title, postDraft.description).filter(t => !(postDraft.tags || []).includes(t)).map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setPostDraft(prev => ({ ...prev, tags: [...(prev.tags || []), tag] }))}
                          style={{ border: darkMode ? '1px dashed rgba(255,255,255,0.3)' : '1px dashed #CBD5E1', background: 'transparent', color: darkMode ? '#CBD5E1' : '#64748B', borderRadius: '999px', padding: '3px 9px', fontSize: '10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Plus size={10} /> {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {postStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: darkMode ? '#CBD5E1' : '#374151' }}>{t('retributionModeLabel')}</label>
                  <select value={postDraft.compensation} onChange={(e) => setPostDraft(prev => ({ ...prev, compensation: e.target.value }))} style={{ width: '100%', padding: '10px 12px', marginTop: '6px', border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB', backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF', color: darkMode ? '#FFF' : '#111827', borderRadius: '12px' }}>
                    <option value="credits" style={{ backgroundColor: darkMode ? '#0F172A' : '#FFF', color: darkMode ? '#FFF' : '#000' }}>{t('timeCreditOption')}</option>
                    <option value="cash" style={{ backgroundColor: darkMode ? '#0F172A' : '#FFF', color: darkMode ? '#FFF' : '#000' }}>{t('euroPaymentOption')}</option>
                    <option value="troc" style={{ backgroundColor: darkMode ? '#0F172A' : '#FFF', color: darkMode ? '#FFF' : '#000' }}>{t('directSwapOption')}</option>
                    <option value="hybrid" style={{ backgroundColor: darkMode ? '#0F172A' : '#FFF', color: darkMode ? '#FFF' : '#000' }}>{t('hybridOption')}</option>
                  </select>
                </div>
                {(postDraft.compensation === 'cash' || postDraft.compensation === 'hybrid') && (
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: darkMode ? '#CBD5E1' : '#374151' }}>{t('expectedAmountLabel')}</label>
                    <input value={postDraft.compensation === 'hybrid' ? postDraft.euroAmount : postDraft.price} onChange={(e) => setPostDraft(prev => ({ ...prev, ...(prev.compensation === 'hybrid' ? { euroAmount: e.target.value } : { price: e.target.value }) }))} type="number" min="0" placeholder="Ex : 20" style={{ width: '100%', padding: '10px 12px', marginTop: '6px', border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB', backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF', color: darkMode ? '#FFF' : '#111827', borderRadius: '12px' }} />
                  </div>
                )}
                {postDraft.compensation === 'hybrid' && (
                  <div style={{ padding: '12px', borderRadius: '14px', backgroundColor: darkMode ? 'rgba(120,53,15,0.25)' : '#FFF7ED', border: darkMode ? '1px solid rgba(245,158,11,0.4)' : '1px solid #FDE68A', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', color: darkMode ? '#FCD34D' : '#374151' }}>{t('trocoTokensAmountLabel')}</label>
                      <input value={postDraft.trocoTokens} onChange={(e) => setPostDraft(prev => ({ ...prev, trocoTokens: e.target.value }))} type="number" min="0" placeholder="Ex : 2" style={{ width: '100%', padding: '10px 12px', marginTop: '6px', border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB', backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF', color: darkMode ? '#FFF' : '#111827', borderRadius: '12px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', color: darkMode ? '#FCD34D' : '#374151' }}>{t('expectedAmountLabel')}</label>
                      <input value={postDraft.euroAmount} onChange={(e) => setPostDraft(prev => ({ ...prev, euroAmount: e.target.value }))} type="number" min="0" placeholder="Ex : 10" style={{ width: '100%', padding: '10px 12px', marginTop: '6px', border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB', backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF', color: darkMode ? '#FFF' : '#111827', borderRadius: '12px' }} />
                    </div>
                  </div>
                )}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: darkMode ? '#CBD5E1' : '#374151' }}>{t('locationZoneLabel')}</label>
                  <input value={postDraft.location} onChange={(e) => setPostDraft(prev => ({ ...prev, location: e.target.value }))} type="text" placeholder="Paris, Lyon, à distance, etc." style={{ width: '100%', padding: '10px 12px', marginTop: '6px', border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB', backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF', color: darkMode ? '#FFF' : '#111827', borderRadius: '12px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: darkMode ? '#CBD5E1' : '#374151' }}>{t('availabilityLabel')}</label>
                  <textarea value={postDraft.availability} onChange={(e) => setPostDraft(prev => ({ ...prev, availability: e.target.value }))} rows={2} placeholder="Ex : disponibilités ce week-end, en visio le soir" style={{ width: '100%', padding: '10px 12px', marginTop: '6px', border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB', backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF', color: darkMode ? '#FFF' : '#111827', borderRadius: '12px', resize: 'vertical' }} />
                </div>
                {postDraft.type === 'offer' && (
                  <div style={{ padding: '12px', borderRadius: '14px', backgroundColor: darkMode ? 'rgba(15,23,42,0.6)' : '#F8FAFC', border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E2E8F0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 'bold', color: darkMode ? '#CBD5E1' : '#374151' }}>
                      <input type="checkbox" checked={postDraft.requiresCaution} onChange={(e) => setPostDraft(prev => ({ ...prev, requiresCaution: e.target.checked, cautionAmount: e.target.checked ? prev.cautionAmount : '' }))} />
                      {t('requireCautionLabel')}
                    </label>
                    {postDraft.requiresCaution && (
                      <div style={{ marginTop: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: darkMode ? '#CBD5E1' : '#374151' }}>{t('cautionAmountLabel')}</label>
                        <input value={postDraft.cautionAmount} onChange={(e) => setPostDraft(prev => ({ ...prev, cautionAmount: e.target.value }))} type="number" min="0" placeholder="Ex : 50" style={{ width: '100%', padding: '10px 12px', marginTop: '6px', border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB', backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF', color: darkMode ? '#FFF' : '#111827', borderRadius: '12px' }} />
                      </div>
                    )}
                  </div>
                )}

                <div style={{ padding: '14px', borderRadius: '16px', backgroundColor: darkMode ? 'rgba(120,53,15,0.25)' : '#FFF7ED', border: postDraft.isUrgent ? '1.5px solid #F59E0B' : (darkMode ? '1px solid rgba(245,158,11,0.4)' : '1px solid #FDE68A') }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={postDraft.isUrgent} onChange={(e) => setPostDraft(prev => ({ ...prev, isUrgent: e.target.checked }))} style={{ marginTop: '3px', accentColor: '#F59E0B', width: '16px', height: '16px' }} />
                    <span style={{ flex: 1 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '800', color: darkMode ? '#FBBF24' : '#92400E' }}>
                        <Flame size={15} color="#F59E0B" /> {t('setUrgentLabel')}
                      </span>
                      <span style={{ display: 'block', fontSize: '12px', color: darkMode ? '#FCD34D' : '#B45309', marginTop: '4px', lineHeight: 1.5 }}>
                        {t('urgentBadgeDesc')}
                      </span>
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: '900', color: '#EA580C', backgroundColor: darkMode ? 'rgba(15,23,42,0.9)' : '#FFF', border: '1px solid #FDE68A', borderRadius: '999px', padding: '5px 12px', whiteSpace: 'nowrap', boxShadow: '0 4px 10px rgba(245,158,11,0.15)' }}>{formatCompensation('1.99€ ou 1 Jeton')}</span>
                  </label>
                  {postDraft.isUrgent && (
                    <div style={{ marginTop: '10px', fontSize: '12px', color: darkMode ? '#F87171' : '#B91C1C', lineHeight: 1.6, backgroundColor: darkMode ? 'rgba(127,29,29,0.3)' : '#FEF2F2', borderRadius: '12px', padding: '10px 12px' }}>
                      {profile.euroBalance >= 1.99 ? (
                        <span>Un supplément de <strong>1,99€</strong> sera débité de ton solde Euro (<strong>{profile.euroBalance.toFixed(2)}€</strong> disponibles) automatiquement à la publication.</span>
                      ) : (
                        <span>Solde Euro insuffisant (<strong>{profile.euroBalance.toFixed(2)}€</strong> disponibles sur les <strong>1,99€</strong> requis). Recharge ton portefeuille pour activer l'option Urgent.</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {postStep === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ padding: '14px', borderRadius: '16px', backgroundColor: darkMode ? 'rgba(15,23,42,0.6)' : '#F8FAFC', border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: darkMode ? '#CBD5E1' : '#64748B', marginBottom: '6px' }}>{t('previewLabel')}</div>
                  <img src={postDraft.imageUrl.trim() || getSuggestedImage(postDraft.title, postDraft.description)} alt="aperçu" style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '14px', marginBottom: '10px' }} />
                  <div style={{ fontSize: '16px', fontWeight: '800', color: darkMode ? '#FFFFFF' : '#111827' }}>{postDraft.title || t('titleToBeDefined')}</div>
                  <div style={{ fontSize: '12px', color: darkMode ? '#CBD5E1' : '#64748B', margin: '6px 0' }}>{postDraft.category === 'Cours & Compétences' ? t('catSkills') : postDraft.category === 'Prêt de Matériel' ? t('catTools') : postDraft.category === 'Services & Dépannage' ? t('catServices') : postDraft.category === 'Logement & Stay Swap' ? t('catHousing') : postDraft.category} • {postDraft.format === 'remote' ? t('remote') : t('onsite')}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {((postDraft.tags && postDraft.tags.length > 0) ? postDraft.tags : (generateTags(postDraft.title, postDraft.description) || [])).map(tag => (
                      <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: darkMode ? 'rgba(4,38,90,0.6)' : '#EFF6FF', color: darkMode ? '#93C5FD' : '#04265A', borderRadius: '999px', padding: '4px 9px', fontSize: '10px', fontWeight: '800' }}><Tag size={10} /> {tag}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: '13px', color: darkMode ? '#E2E8F0' : '#475569', lineHeight: 1.6 }}>{postDraft.description || t('addDescriptionConvincing')}</div>
                  <div style={{ marginTop: '8px', fontSize: '12px', color: darkMode ? '#60A5FA' : '#04265A', fontWeight: '800' }}>{t('compensationLabel')} {postDraft.compensation === 'credits' ? t('timeCreditOption') : postDraft.compensation === 'cash' ? `${postDraft.price || '20'}€` : postDraft.compensation === 'hybrid' ? `${postDraft.price || '20'}€ + ${t('timeCreditOption')}` : t('directSwapOption')}</div>
                  {postDraft.isUrgent && (
                    <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: darkMode ? 'rgba(127,29,29,0.3)' : '#FEF2F2', color: darkMode ? '#F87171' : '#B91C1C', fontSize: '11px', fontWeight: '800', padding: '5px 10px', borderRadius: '10px' }}>
                      <Flame size={12} /> {t('priorityNotice')}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '13px', color: darkMode ? '#CBD5E1' : '#64748B' }}>{t('publishVisibilityNotice')}</div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '18px' }}>
              {postStep > 1 ? (
                <button onClick={() => setPostStep(prev => prev - 1)} className="premium-button" style={{ border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB', borderRadius: '999px', padding: '10px 16px', backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#FFF', color: darkMode ? '#FFF' : '#334155', fontWeight: '700', cursor: 'pointer' }}>{t('backButton')}</button>
              ) : <span />}
              {postStep < 4 ? (
                <button onClick={() => setPostStep(prev => prev + 1)} className="premium-button" style={{ border: 'none', borderRadius: '999px', padding: '10px 16px', backgroundColor: darkMode ? '#60A5FA' : '#04265A', color: darkMode ? '#0F172A' : '#FFF', fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 18px rgba(4,38,90,0.2)' }}>{t('continueButton')}</button>
              ) : (
                <button onClick={handlePublishAnnouncement} className="premium-button" style={{ border: 'none', borderRadius: '999px', padding: '10px 16px', backgroundColor: darkMode ? '#60A5FA' : '#04265A', color: darkMode ? '#0F172A' : '#FFF', fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 18px rgba(4,38,90,0.2)' }}>{t('publishAdButton')}</button>
              )}
            </div>
          </div>
        )}

        {/* ONGLET 4 : PROFIL UTILISATEUR */}
        {activeTab === 'profile' && (
          <div style={{ backgroundColor: darkMode ? 'rgba(30,41,59,0.85)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', padding: '22px', borderRadius: '28px', border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(226,232,240,0.9)', boxShadow: '0 10px 30px rgba(15,23,42,0.06)', color: darkMode ? '#F8FAFC' : '#111827' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', padding: '6px 10px', borderRadius: '999px', backgroundColor: darkMode ? 'rgba(4,38,90,0.6)' : '#EFF6FF', color: darkMode ? '#93C5FD' : '#04265A' }}>
                    <ShieldCheck size={12} /> {t('verifiedProfile')}
                  </div>
                  {profile.accountType && (
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '5px 10px',
                      borderRadius: '999px',
                      backgroundColor: profile.accountType === 'professional'
                        ? (darkMode ? 'rgba(217,119,6,0.25)' : '#FEF3C7')
                        : profile.accountType === 'company'
                        ? (darkMode ? 'rgba(16,185,129,0.25)' : '#ECFDF5')
                        : (darkMode ? 'rgba(4,38,90,0.6)' : '#EFF6FF'),
                      color: profile.accountType === 'professional'
                        ? (darkMode ? '#FDE68A' : '#92400E')
                        : profile.accountType === 'company'
                        ? (darkMode ? '#6EE7B7' : '#065F46')
                        : (darkMode ? '#93C5FD' : '#04265A'),
                    }}>
                      {profile.accountType === 'professional' && '💼 Pro / Freelance'}
                      {profile.accountType === 'company' && '🏢 Organisation / Asso'}
                      {profile.accountType === 'particular' && '👤 Particulier'}
                    </span>
                  )}
                </div>
                <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: darkMode ? '#FFFFFF' : '#111827', letterSpacing: '-0.01em' }}>{isEditingProfile ? profileDraft.name : profile.name}</h3>
                <div style={{ fontSize: '13px', fontWeight: '800', color: darkMode ? '#60A5FA' : '#04265A', marginTop: '2px' }}>{isEditingProfile ? (profileDraft.username || '@user') : (profile.username || '@mateopolo')}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setIsAdminPanelOpen(true)}
                  className="premium-button"
                  style={{
                    border: 'none',
                    borderRadius: '999px',
                    padding: '10px 14px',
                    backgroundColor: darkMode ? 'rgba(239,68,68,0.2)' : '#FEF2F2',
                    color: '#EF4444',
                    fontWeight: '800',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <ShieldAlert size={14} /> Panel Modération
                </button>
                <button onClick={() => isEditingProfile ? handleSaveProfile() : handleStartEdit()} className="premium-button" style={{ border: 'none', borderRadius: '999px', padding: '10px 14px', backgroundColor: isEditingProfile ? '#04265A' : (darkMode ? 'rgba(255,255,255,0.1)' : '#F8FAFC'), color: isEditingProfile ? '#FFF' : (darkMode ? '#FFFFFF' : '#0F172A'), fontWeight: '700', cursor: 'pointer', boxShadow: '0 8px 16px -4px rgba(0,0,0,0.08)' }}>
                  {isEditingProfile ? t('saveProfile') : t('editProfile')}
                </button>
                {!isEditingProfile && (
                  <button onClick={handleSignOut} className="premium-button" style={{ border: '1px solid #EF4444', borderRadius: '999px', padding: '10px 14px', backgroundColor: 'transparent', color: '#EF4444', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <LogOut size={13} /> Se déconnecter
                  </button>
                )}
              </div>
            </div>

            <input type="file" ref={profileAvatarFileInputRef} onChange={handleAvatarFileUpload} accept="image/*" style={{ display: "none" }} />
            <div style={{ position: "relative", marginBottom: "18px", display: "inline-block", cursor: isEditingProfile ? "pointer" : "default" }} onClick={() => isEditingProfile && profileAvatarFileInputRef.current && profileAvatarFileInputRef.current.click()}>
              <img src={isEditingProfile ? profileDraft.avatar : profile.avatar} alt={profile.name} style={{ width: "112px", height: "112px", borderRadius: "50%", objectFit: "cover", border: darkMode ? "3px solid #60A5FA" : "3px solid #DBEAFE", boxShadow: "0 14px 28px rgba(4,38,90,0.18)", transition: "all 0.3s ease" }} />
              {isEditingProfile && (
                <button title={t("uploadProfilePhoto")} onClick={(e) => { e.stopPropagation(); profileAvatarFileInputRef.current && profileAvatarFileInputRef.current.click(); }} style={{ position: "absolute", right: "0", bottom: "0", width: "38px", height: "38px", borderRadius: "50%", border: "none", backgroundColor: "#04265A", color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 8px 16px rgba(4,38,90,0.25)" }}>
                  <Pencil size={16} />
                </button>
              )}
            </div>

            {isEditingProfile && (
              <>
                <div style={{ marginBottom: "14px" }}>
                  <button
                    onClick={() => profileAvatarFileInputRef.current && profileAvatarFileInputRef.current.click()}
                    className="premium-button"
                    style={{
                      width: "100%",
                      border: darkMode ? "1.5px dashed #60A5FA" : "1.5px dashed #04265A",
                      borderRadius: "14px",
                      padding: "12px 14px",
                      backgroundColor: darkMode ? "rgba(4,38,90,0.4)" : "#EFF6FF",
                      color: darkMode ? "#93C5FD" : "#04265A",
                      fontWeight: "800",
                      fontSize: "13px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow: "0 4px 14px rgba(4,38,90,0.08)"
                    }}
                  >
                    <Upload size={16} /> {t("uploadProfilePhoto")}
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "8px", maxHeight: "120px", overflowY: "auto", padding: "4px", marginBottom: "12px" }}>
                  {avatarOptions.map((avatar) => (
                    <button key={avatar} onClick={() => setProfileDraft(prev => ({ ...prev, avatar }))} style={{ border: profileDraft.avatar === avatar ? (darkMode ? "2.5px solid #60A5FA" : "2.5px solid #04265A") : "2px solid transparent", borderRadius: "50%", padding: 0, background: "none", cursor: "pointer", transform: profileDraft.avatar === avatar ? "scale(1.08)" : "scale(1)", transition: "all 0.2s" }}>
                      <img src={avatar} alt="avatar option" style={{ width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover" }} />
                    </button>
                  ))}
                </div>
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "800", color: darkMode ? "#CBD5E1" : "#374151" }}>URL de ta photo de profil (aperçu instantané)</label>
                  <input value={profileDraft.avatar} onChange={(e) => setProfileDraft(prev => ({ ...prev, avatar: e.target.value }))} placeholder="https://exemple.com/avatar.jpg" style={{ width: "100%", padding: "10px 12px", marginTop: "6px", border: darkMode ? "1px solid rgba(255,255,255,0.2)" : "1px solid #D1D5DB", backgroundColor: darkMode ? "rgba(15,23,42,0.8)" : "#FFF", color: darkMode ? "#FFF" : "#111827", borderRadius: "12px", fontSize: "13px" }} />
                </div>
              </>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
              {isEditingProfile ? (
                <>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: darkMode ? '#CBD5E1' : '#64748B' }}>Nom complet</label>
                      <input value={profileDraft.name} onChange={(e) => setProfileDraft(prev => ({ ...prev, name: e.target.value }))} placeholder="Nom" style={{ width: '100%', border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB', backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF', borderRadius: '12px', padding: '10px 12px', fontSize: '14px', fontWeight: '700', color: darkMode ? '#FFF' : '#111827' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: darkMode ? '#CBD5E1' : '#64748B' }}>Pseudo (@)</label>
                      <input value={profileDraft.username || ''} onChange={(e) => setProfileDraft(prev => ({ ...prev, username: e.target.value }))} placeholder="@pseudo" style={{ width: '100%', border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB', backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF', borderRadius: '12px', padding: '10px 12px', fontSize: '14px', fontWeight: '700', color: darkMode ? '#60A5FA' : '#04265A' }} />
                    </div>
                  </div>
                  <textarea value={profileDraft.bio} onChange={(e) => setProfileDraft(prev => ({ ...prev, bio: e.target.value }))} rows={3} style={{ width: '100%', border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB', backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF', borderRadius: '14px', padding: '12px 14px', resize: 'vertical', fontSize: '13px', color: darkMode ? '#E2E8F0' : '#475569' }} />
                  <input value={profileDraft.location} onChange={(e) => setProfileDraft(prev => ({ ...prev, location: e.target.value }))} style={{ width: '100%', border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB', backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF', borderRadius: '14px', padding: '12px 14px', fontSize: '13px', color: darkMode ? '#E2E8F0' : '#475569' }} />
                </>
              ) : (
                <>
                  <div style={{ backgroundColor: darkMode ? 'rgba(15,23,42,0.6)' : '#F8FAFC', padding: '14px 16px', borderRadius: '16px', border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '14px', lineHeight: 1.7, color: darkMode ? '#E2E8F0' : '#475569' }}>
                      {getBioTranslation(profile.bio, currentLang, showingOriginalBio)}
                    </div>
                    {currentLang !== 'FR' && (
                      <button
                        onClick={() => setShowingOriginalBio(prev => !prev)}
                        className="premium-button"
                        style={{ border: 'none', backgroundColor: 'transparent', color: darkMode ? '#60A5FA' : '#04265A', fontSize: '11px', fontWeight: '800', cursor: 'pointer', marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: 0 }}
                      >
                        <Globe size={12} color={darkMode ? '#60A5FA' : '#04265A'} />
                        {showingOriginalBio ? t('showTranslation') : t('showOriginal')}
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: darkMode ? '#CBD5E1' : '#64748B' }}><MapPin size={14} color={darkMode ? '#60A5FA' : '#04265A'} /> {profile.location}</div>
                </>
              )}
            </div>

            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#CBD5E1' : '#64748B', marginBottom: '8px' }}>{t('spokenLanguages')}</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['FR', 'EN', 'ES', 'IT'].map((language) => {
                  const active = (isEditingProfile ? profileDraft.languages : profile.languages).includes(language);
                  return (
                    <button key={language} onClick={() => isEditingProfile ? toggleLanguage(language) : null} style={{ border: active ? (darkMode ? '1px solid #60A5FA' : '1px solid #04265A') : (darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #E2E8F0'), backgroundColor: active ? (darkMode ? 'rgba(4,38,90,0.7)' : '#EFF6FF') : (darkMode ? 'rgba(30,41,59,0.5)' : '#F8FAFC'), color: active ? (darkMode ? '#93C5FD' : '#04265A') : (darkMode ? '#CBD5E1' : '#475569'), padding: '8px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '800', cursor: isEditingProfile ? 'pointer' : 'default' }}>
                      {language}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', borderRadius: '20px', backgroundColor: darkMode ? 'rgba(15,23,42,0.6)' : '#F8FAFC', border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E2E8F0', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: darkMode ? '#CBD5E1' : '#64748B' }}>{t('euroBalance')}</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: darkMode ? '#60A5FA' : '#0F172A', position: 'relative', overflow: 'visible' }}>
                    <AnimatedEuroBalance value={profile.euroBalance} suffix=" €" style={{ fontSize: '22px', fontWeight: '800', color: darkMode ? '#60A5FA' : '#0F172A' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleOpenPayment('topup-cash')} className="premium-button" style={{ border: 'none', borderRadius: '999px', padding: '9px 14px', backgroundColor: '#04265A', color: '#FFF', fontWeight: '700', fontSize: '12px', cursor: 'pointer', boxShadow: '0 8px 16px rgba(4,38,90,0.2)' }}>
                    + Recharger (€)
                  </button>
                  <button onClick={() => setIsTransactionsModalOpen(true)} className="premium-button" style={{ border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #D1D5DB', borderRadius: '999px', padding: '9px 14px', backgroundColor: 'transparent', color: darkMode ? '#CBD5E1' : '#334155', fontWeight: '700', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <FileText size={13} /> Factures
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E2E8F0', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: darkMode ? '#CBD5E1' : '#64748B' }}>{t('trocoTokensLabel')}</div>
                  <div style={{ fontSize: '19px', fontWeight: '800', color: darkMode ? '#FFFFFF' : '#111827', position: 'relative', overflow: 'visible' }}>
                    <AnimatedTokenBalance value={profile.trocoTokens} formatFn={(v) => formatTokenCount(v, currentLang)} style={{ fontSize: '19px', fontWeight: '800', color: darkMode ? '#FFFFFF' : '#111827' }} />
                  </div>
                </div>
                <button onClick={() => handleOpenPayment('pack-tokens')} className="premium-button" style={{ border: 'none', borderRadius: '999px', padding: '9px 14px', backgroundColor: '#D97706', color: '#FFF', fontWeight: '700', fontSize: '12px', cursor: 'pointer', boxShadow: '0 8px 16px rgba(217,119,6,0.2)' }}>
                  + Acheter des Jetons
                </button>
              </div>
            </div>

            {saveMessage && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: darkMode ? '#34D399' : '#04265A', fontSize: '13px', fontWeight: '700', marginBottom: '18px' }}>
                <CheckCircle size={16} /> {saveMessage}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: darkMode ? '#FFFFFF' : '#111827' }}>{t('skillsCV')}</h4>
                <span style={{ fontSize: '11px', color: darkMode ? '#CBD5E1' : '#64748B' }}>{t('servicesExpertise')}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                {skills.map((skill) => (
                  <div key={skill} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: darkMode ? 'rgba(30,41,59,0.7)' : '#F8FAFC', border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #E2E8F0', borderRadius: '999px', padding: '9px 12px' }}>
                    <span style={{ fontSize: '12px', color: darkMode ? '#F1F5F9' : '#334155', fontWeight: '600' }}>{skill}</span>
                    {isEditingProfile && <button onClick={() => handleRemoveSkill(skill)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#EF4444', padding: 0 }}><Trash2 size={12} /></button>}
                  </div>
                ))}
              </div>
              {isEditingProfile && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    placeholder="Ajouter une compétence (ex: violon, plomberie...)"
                    style={{ flex: 1, border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB', backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF', color: darkMode ? '#FFF' : '#111827', borderRadius: '12px', padding: '10px 12px', fontSize: '13px' }}
                  />
                  <button type="button" onClick={handleAddSkill} className="premium-button" style={{ border: 'none', borderRadius: '12px', backgroundColor: '#04265A', color: '#FFF', padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700' }}><Plus size={14} /> Ajouter</button>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: darkMode ? '#FFFFFF' : '#111827' }}>{t('availableEquipment')}</h4>
                <span style={{ fontSize: '11px', color: darkMode ? '#CBD5E1' : '#64748B' }}>{t('loansTools')}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                {equipment.map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: darkMode ? 'rgba(30,41,59,0.7)' : '#F8FAFC', border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #E2E8F0', borderRadius: '999px', padding: '9px 12px' }}>
                    <span style={{ fontSize: '12px', color: darkMode ? '#F1F5F9' : '#334155', fontWeight: '600' }}>{item}</span>
                    {isEditingProfile && <button onClick={() => handleRemoveEquipment(item)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#EF4444', padding: 0 }}><Trash2 size={12} /></button>}
                  </div>
                ))}
              </div>
              {isEditingProfile && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    value={equipmentInput}
                    onChange={(e) => setEquipmentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddEquipment();
                      }
                    }}
                    placeholder="Ajouter un outil ou matériel (ex: scie sauteuse, tente...)"
                    style={{ flex: 1, border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB', backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF', color: darkMode ? '#FFF' : '#111827', borderRadius: '12px', padding: '10px 12px', fontSize: '13px' }}
                  />
                  <button type="button" onClick={handleAddEquipment} className="premium-button" style={{ border: 'none', borderRadius: '12px', backgroundColor: '#D97706', color: '#FFF', padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700' }}><Plus size={14} /> Ajouter</button>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: darkMode ? '#FFFFFF' : '#111827' }}>{t('myListings')}</h4>
                <span style={{ fontSize: '11px', color: darkMode ? '#CBD5E1' : '#64748B' }}>{listings.filter(item => item.author === profile.name).length} {t('inTotal')}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                {listings.filter(item => item.author === profile.name).map((item) => (
                  <div key={item.id} style={{ border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E2E8F0', borderRadius: '16px', overflow: 'hidden', backgroundColor: darkMode ? 'rgba(30,41,59,0.8)' : '#F8FAFC' }}>
                    <div style={{ position: 'relative' }}>
                      <img src={item.image} alt={item.title} style={{ width: '100%', height: '96px', objectFit: 'cover' }} />
                      {item.urgent && <span style={{ position: 'absolute', top: '8px', left: '8px', backgroundColor: 'rgba(239,68,68,0.95)', color: '#FFF', fontSize: '9px', fontWeight: '800', padding: '4px 8px', borderRadius: '8px' }}>URGENT</span>}
                      {item.isBoosted && <span style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: '#F59E0B', color: '#FFF', fontSize: '9px', fontWeight: '800', padding: '4px 8px', borderRadius: '8px' }}>🔥 Sponsorisé</span>}
                    </div>
                    <div style={{ padding: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#FFFFFF' : '#111827', marginBottom: '4px' }}>{item.title}</div>
                      <div style={{ fontSize: '11px', color: darkMode ? '#60A5FA' : '#64748B', fontWeight: '700', marginBottom: '8px' }}>{item.compensation}</div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        {(item.tags || generateTags(item.title, item.description || '')).slice(0, 2).map(tag => (
                          <span key={tag} style={{ backgroundColor: darkMode ? 'rgba(4,38,90,0.6)' : '#EFF6FF', color: darkMode ? '#93C5FD' : '#04265A', borderRadius: '999px', padding: '3px 8px', fontSize: '9px', fontWeight: '800' }}>{tag}</span>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleStartEditListing(item)} className="premium-button" style={{ flex: 1, border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB', borderRadius: '10px', padding: '7px 8px', backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#FFF', color: darkMode ? '#FFF' : '#111827', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>{t('editAdBtn')}</button>
                          <button onClick={() => handleBoostListing(item)} className="premium-button" style={{ flex: 1, border: 'none', borderRadius: '10px', padding: '7px 8px', backgroundColor: '#F59E0B', color: '#FFF', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>{t('boostButtonLabel')}</button>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleTogglePauseListing(item.id)} className="premium-button" style={{ flex: 1, border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB', borderRadius: '10px', padding: '7px 8px', backgroundColor: item.status === 'paused' ? (darkMode ? 'rgba(255,255,255,0.05)' : '#F3F4F6') : (darkMode ? 'rgba(255,255,255,0.1)' : '#FFF'), color: darkMode ? '#FFF' : '#111827', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>{t(item.status === 'paused' ? 'resumeAd' : 'pauseAd')}</button>
                          <button onClick={() => handleDeleteListing(item.id)} className="premium-button" style={{ flex: 1, border: 'none', borderRadius: '10px', padding: '7px 8px', backgroundColor: '#EF4444', color: '#FFF', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>{t('deleteAd')}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ---- HISTORIQUE DES SWAPS & DEALS ---- */}
            <div style={{ borderTop: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E2E8F0', paddingTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <History size={17} color={darkMode ? '#60A5FA' : '#04265A'} />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: darkMode ? '#FFFFFF' : '#111827' }}>{t('swapHistory')}</h4>
              </div>
              <p style={{ fontSize: '12px', color: darkMode ? '#CBD5E1' : '#64748B', margin: '0 0 14px' }}>{t('swapHistorySub')}</p>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '130px', border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E2E8F0', borderRadius: '16px', padding: '12px 14px', backgroundColor: darkMode ? 'rgba(15,23,42,0.6)' : '#F8FAFC' }}>
                  <div style={{ fontSize: '11px', color: darkMode ? '#CBD5E1' : '#64748B' }}>{t('closedDeals')}</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: darkMode ? '#FFFFFF' : '#111827' }}>{closedDealsCount}</div>
                </div>
                <div style={{ flex: 1, minWidth: '130px', border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E2E8F0', borderRadius: '16px', padding: '12px 14px', backgroundColor: darkMode ? 'rgba(15,23,42,0.6)' : '#F8FAFC' }}>
                  <div style={{ fontSize: '11px', color: darkMode ? '#CBD5E1' : '#64748B' }}>{t('averageRating')}</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {averageRating} {averageRating !== '—' && <Star size={15} fill="#F59E0B" color="#F59E0B" />}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: '130px', border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E2E8F0', borderRadius: '16px', padding: '12px 14px', backgroundColor: darkMode ? 'rgba(15,23,42,0.6)' : '#F8FAFC' }}>
                  <div style={{ fontSize: '11px', color: darkMode ? '#CBD5E1' : '#64748B' }}>{t('inProgressPlanned')}</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: darkMode ? '#60A5FA' : '#04265A' }}>{inProgressCount}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {userSwapHistory.length === 0 ? (
                  <div style={{ padding: '28px 20px', textAlign: 'center', borderRadius: '20px', backgroundColor: darkMode ? 'rgba(15,23,42,0.5)' : '#F8FAFC', border: darkMode ? '1px dashed rgba(255,255,255,0.15)' : '1px dashed #CBD5E1' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: darkMode ? 'rgba(96,165,250,0.15)' : '#EFF6FF', color: darkMode ? '#60A5FA' : '#04265A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <Sparkles size={22} />
                    </div>
                    <div style={{ fontWeight: '800', fontSize: '15px', color: darkMode ? '#FFFFFF' : '#111827', marginBottom: '6px' }}>
                      Nouveau profil (0 deal clôturé)
                    </div>
                    <p style={{ fontSize: '12px', color: darkMode ? '#94A3B8' : '#64748B', maxWidth: '380px', margin: '0 auto 16px', lineHeight: 1.6 }}>
                      Vous n'avez pas encore d'échange clôturé. Parcourez l'explorateur ou proposez un deal sur une annonce pour démarrer !
                    </p>
                    <button
                      onClick={() => setActiveTab('feed')}
                      className="premium-button"
                      style={{
                        border: 'none',
                        borderRadius: '999px',
                        padding: '10px 20px',
                        backgroundColor: '#04265A',
                        color: '#FFF',
                        fontWeight: '800',
                        fontSize: '12px',
                        cursor: 'pointer',
                        boxShadow: '0 8px 18px rgba(4,38,90,0.25)'
                      }}
                    >
                      Explorer les annonces
                    </button>
                  </div>
                ) : (
                  userSwapHistory.map((entry) => {
                    const statusStyle = statusStyles[entry.status] || { bg: '#F3F4F6', text: '#6B7280' };
                    return (
                      <div key={entry.id} className="premium-card" style={{ border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0', borderRadius: '18px', padding: '14px', backgroundColor: darkMode ? 'rgba(15,23,42,0.7)' : '#FFFFFF', boxShadow: '0 2px 10px rgba(15,23,42,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '6px' }}>
                          <div>
                            <div style={{ fontWeight: '800', fontSize: '13px', color: darkMode ? '#FFFFFF' : '#111827', lineHeight: 1.4 }}>{getListingTitleTranslation(entry.deal, currentLang)}</div>
                            <div style={{ fontSize: '12px', color: darkMode ? '#CBD5E1' : '#64748B', marginTop: '3px' }}>{entry.counterparty} • {entry.date}</div>
                          </div>
                          <span style={{ fontSize: '10px', fontWeight: '800', padding: '5px 10px', borderRadius: '999px', backgroundColor: statusStyle.bg, color: statusStyle.text, whiteSpace: 'nowrap' }}>{formatStatus(entry.status)}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: darkMode ? '#60A5FA' : '#04265A', fontWeight: '800', marginBottom: '8px' }}>{formatCompensation(entry.compensation)}</div>
                        <div style={{ borderTop: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #F1F5F9', paddingTop: '10px' }}>
                          {(() => {
                            const isRevOrig = !!showingOriginalReviews[entry.id];
                            const revTxt = getReviewTranslation(entry.review, currentLang, isRevOrig);
                            return (
                              <>
                                {entry.rating ? (
                                  <>
                                    <div style={{ display: 'flex', gap: '2px', marginBottom: '6px' }}>
                                      {[1, 2, 3, 4, 5].map(star => (
                                        <Star key={star} size={13} fill={star <= entry.rating ? '#F59E0B' : 'none'} color={star <= entry.rating ? '#F59E0B' : '#E2E8F0'} />
                                      ))}
                                    </div>
                                    <div style={{ fontSize: '12px', color: darkMode ? '#E2E8F0' : '#475569', lineHeight: 1.6, fontStyle: 'italic' }}>« {revTxt} »</div>
                                  </>
                                ) : (
                                  <div style={{ fontSize: '12px', color: darkMode ? '#CBD5E1' : '#64748B', lineHeight: 1.6 }}>{revTxt}</div>
                                )}
                                {currentLang !== 'FR' && (
                                  <button
                                    onClick={() => toggleOriginalReview(entry.id)}
                                    className="premium-button"
                                    style={{ border: 'none', backgroundColor: 'transparent', color: darkMode ? '#60A5FA' : '#04265A', fontSize: '10px', fontWeight: '800', cursor: 'pointer', marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px', padding: 0 }}
                                  >
                                    <Globe size={10} color={darkMode ? '#60A5FA' : '#04265A'} />
                                    {isRevOrig ? t('showTranslation') : t('showOriginal')}
                                  </button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ---- CADRE JURIDIQUE & RGPD (BLOC 6) ---- */}
            <div style={{ borderTop: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E2E8F0', paddingTop: '20px', marginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <ShieldCheck size={17} color={darkMode ? '#60A5FA' : '#04265A'} />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: darkMode ? '#FFFFFF' : '#111827' }}>Sécurité, Juridique & RGPD</h4>
              </div>
              <p style={{ fontSize: '12px', color: darkMode ? '#CBD5E1' : '#64748B', margin: '0 0 14px' }}>
                Gérez vos données personnelles, exportez vos archives ou consultez les Conditions Générales de Troco.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => setIsPrivacyCenterOpen(true)}
                  className="premium-button"
                  style={{
                    border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    backgroundColor: darkMode ? 'rgba(15,23,42,0.6)' : '#FFFFFF',
                    color: darkMode ? '#F8FAFC' : '#0F172A',
                    fontWeight: '700',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Lock size={16} color="#3B82F6" /> Centre de Confidentialité & Export RGPD (JSON)
                  </span>
                  <ChevronRight size={16} color={darkMode ? '#94A3B8' : '#94A3B8'} />
                </button>

                <button
                  onClick={() => setIsCguViewerOpen(true)}
                  className="premium-button"
                  style={{
                    border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    backgroundColor: darkMode ? 'rgba(15,23,42,0.6)' : '#FFFFFF',
                    color: darkMode ? '#F8FAFC' : '#0F172A',
                    fontWeight: '700',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Scale size={16} color="#8B5CF6" /> Conditions Générales & Charte Communautaire (v2026.1)
                  </span>
                  <ChevronRight size={16} color={darkMode ? '#94A3B8' : '#94A3B8'} />
                </button>

                <button
                  onClick={() => setIsAdminPanelOpen(true)}
                  className="premium-button"
                  style={{
                    border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    backgroundColor: darkMode ? 'rgba(15,23,42,0.6)' : '#FFFFFF',
                    color: darkMode ? '#F8FAFC' : '#0F172A',
                    fontWeight: '700',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldAlert size={16} color="#10B981" /> Panel Administrateur & Modération
                  </span>
                  <ChevronRight size={16} color={darkMode ? '#94A3B8' : '#94A3B8'} />
                </button>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* BARRE DE NAVIGATION EN BAS (GLASSMORPHISM) */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: darkMode ? 'rgba(15,23,42,0.88)' : 'rgba(255,255,255,0.78)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', borderTop: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(226,232,240,0.7)', padding: '10px 0', zIndex: 40, boxShadow: '0 -6px 30px rgba(15,23,42,0.05)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>

          <button onClick={() => setActiveTab('feed')} className="premium-nav-btn" style={{ border: 'none', background: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', color: activeTab === 'feed' ? (darkMode ? '#60A5FA' : '#04265A') : darkMode ? '#64748B' : '#9CA3AF', cursor: 'pointer', padding: '6px 14px', borderRadius: '16px' }}>
            <Search size={20} />
            <span style={{ fontSize: '10px', fontWeight: '700' }}>{t('explorer')}</span>
          </button>

          <button onClick={() => setActiveTab('chat')} className="premium-nav-btn" style={{ border: 'none', background: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', color: activeTab === 'chat' ? (darkMode ? '#60A5FA' : '#04265A') : darkMode ? '#64748B' : '#9CA3AF', cursor: 'pointer', padding: '6px 14px', borderRadius: '16px', position: 'relative' }}>
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <MessageSquare size={20} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-8px',
                  minWidth: '16px',
                  height: '16px',
                  backgroundColor: '#EF4444',
                  color: '#FFF',
                  fontSize: '9px',
                  fontWeight: '900',
                  borderRadius: '999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                  border: darkMode ? '1.5px solid rgba(15,23,42,0.9)' : '1.5px solid #fff',
                  boxShadow: '0 2px 8px rgba(239,68,68,0.5)',
                  animation: 'notifPulse 2s ease-in-out infinite',
                  letterSpacing: '-0.3px',
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </span>
            <span style={{ fontSize: '10px', fontWeight: '700' }}>{t('messages')}</span>
          </button>

          <button
            onClick={() => {
              // Si déjà sur l'onglet Déposer → reset du formulaire pour nouvelle annonce
              if (activeTab === 'post') {
                setPostStep(1);
                setPostDraft(defaultPostDraft);
                setPublishMessage('');
                setIsEditingListing(false);
              } else {
                setActiveTab('post');
              }
            }}
            style={{ border: 'none', background: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', color: activeTab === 'post' ? (darkMode ? '#60A5FA' : '#04265A') : darkMode ? '#64748B' : '#9CA3AF', cursor: 'pointer', padding: '6px 14px', borderRadius: '16px' }}
          >
            <PlusCircle size={26} color={darkMode ? '#60A5FA' : '#04265A'} />
            <span style={{ fontSize: '10px', fontWeight: '700' }}>{t('post')}</span>
          </button>

          <button onClick={() => setActiveTab('profile')} className="premium-nav-btn" style={{ border: 'none', background: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', color: activeTab === 'profile' ? (darkMode ? '#60A5FA' : '#04265A') : darkMode ? '#64748B' : '#9CA3AF', cursor: 'pointer', padding: '6px 14px', borderRadius: '16px' }}>
            <User size={20} />
            <span style={{ fontSize: '10px', fontWeight: '700' }}>{t('profile')}</span>
          </button>

        </div>
      </nav>

      {/* POPUP CONFIRMATION PUBLICATION */}
      {showPublishedPopup && publishedListing && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(4,38,90,0.55)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 9000 }}
          onClick={() => {
            setShowPublishedPopup(false);
            setSelectedListing(publishedListing);
            setActiveTab('feed');
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: darkMode ? 'rgba(15,23,42,0.97)' : 'rgba(255,255,255,0.98)', backdropFilter: 'blur(24px)', borderRadius: '28px', padding: '32px 28px', maxWidth: '380px', width: '100%', boxShadow: '0 32px 80px rgba(4,38,90,0.3)', border: darkMode ? '1px solid rgba(96,165,250,0.3)' : '1px solid rgba(4,38,90,0.12)', textAlign: 'center', animation: 'popupIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}
          >
            {/* Icône checkmark animée */}
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 12px 32px rgba(16,185,129,0.4)', animation: 'checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.15s both' }}>
              <CheckCircle size={38} color="#FFF" />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: '900', color: darkMode ? '#F1F5F9' : '#0F172A', lineHeight: 1.2 }}>
              {currentLang === 'FR' ? '🎉 Annonce publiée !' :
                currentLang === 'EN' ? '🎉 Ad published!' :
                  currentLang === 'ES' ? '🎉 ¡Anuncio publicado!' :
                    currentLang === 'IT' ? '🎉 Annuncio pubblicato!' :
                      currentLang === 'DE' ? '🎉 Anzeige veröffentlicht!' :
                        currentLang === 'JA' ? '🎉 広告を公開しました！' :
                          '🎉 广告已发布！'}
            </h2>
            <p style={{ margin: '0 0 6px', fontSize: '14px', color: darkMode ? '#94A3B8' : '#64748B', lineHeight: 1.6 }}>
              {currentLang === 'FR' ? 'Votre annonce est maintenant visible dans le flux, sur la carte et dans les résultats de recherche.' :
                currentLang === 'EN' ? 'Your ad is now visible in the feed, on the map and in search results.' :
                  currentLang === 'ES' ? 'Tu anuncio ahora es visible en el feed, en el mapa y en los resultados de búsqueda.' :
                    currentLang === 'IT' ? 'Il tuo annuncio è ora visibile nel feed, sulla mappa e nei risultati di ricerca.' :
                      currentLang === 'DE' ? 'Ihre Anzeige ist jetzt im Feed, auf der Karte und in den Suchergebnissen sichtbar.' :
                        currentLang === 'JA' ? '広告はフィード、マップ、検索結果に表示されるようになりました。' :
                          '您的广告现在可以在动态、地图和搜索结果中看到。'}
            </p>
            <p style={{ margin: '0 0 24px', fontSize: '13px', fontWeight: '700', color: darkMode ? '#60A5FA' : '#04265A' }}>« {publishedListing.title} »</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowPublishedPopup(false);
                  setSelectedListing(publishedListing);
                  setActiveTab('feed');
                }}
                className="premium-button"
                style={{ width: '100%', border: 'none', borderRadius: '16px', padding: '14px', background: 'linear-gradient(135deg, #04265A, #1D4ED8)', color: '#FFF', fontWeight: '800', fontSize: '15px', cursor: 'pointer', boxShadow: '0 8px 24px rgba(4,38,90,0.35)' }}
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
                style={{ width: '100%', border: `1px solid ${darkMode ? 'rgba(255,255,255,0.15)' : '#E2E8F0'}`, borderRadius: '16px', padding: '13px', background: 'transparent', color: darkMode ? '#94A3B8' : '#64748B', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
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


      {isLangModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 3500 }}>
          <div style={{ backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255,255,255,0.95)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: '24px', width: '100%', maxWidth: '400px', padding: '24px', boxShadow: '0 24px 60px rgba(0,0,0,0.3)', border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.8)', position: 'relative' }}>
            <button onClick={() => setIsLangModalOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#F3F4F6', color: darkMode ? '#FFF' : '#374151', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={16} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Globe size={20} color={darkMode ? '#93C5FD' : '#04265A'} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: darkMode ? '#FFF' : '#111827' }}>{t('selectLanguage')}</h3>
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
                    border: currentLang === lang.code ? (darkMode ? '2px solid #60A5FA' : '2px solid #04265A') : (darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0'),
                    backgroundColor: currentLang === lang.code ? (darkMode ? 'rgba(4,38,90,0.5)' : '#EFF6FF') : (darkMode ? 'rgba(15,23,42,0.5)' : '#FFF'),
                    color: darkMode ? '#FFF' : '#111827',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>{lang.flag}</span> {lang.label}
                  </span>
                  {currentLang === lang.code && <Check size={18} color={darkMode ? '#60A5FA' : '#04265A'} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---- BANDEAU APPEL ENTRANT (STATIQUE & ERGONOMIQUE SANS DÉCALAGE DE BOUTONS) ---- */}
      {incomingCall && !callState.active && (
        <div style={{
          position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)', maxWidth: '500px', zIndex: 4000,
          background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.98) 100%)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(96,165,250,0.35)',
          borderRadius: '20px',
          padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: '14px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 20px rgba(96,165,250,0.15)',
          animation: 'slideDownIn 0.3s ease-out forwards',
        }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'linear-gradient(135deg, #60A5FA, #04265A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#FFF', fontWeight: '800', flexShrink: 0, boxShadow: '0 4px 12px rgba(4,38,90,0.3)' }}>
            {incomingCall.from ? incomingCall.from[0].toUpperCase() : 'T'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#FFF', fontWeight: '800', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {incomingCall.from}
            </div>
            <div style={{ color: '#93C5FD', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '600' }}>
              {incomingCall.type === 'video' ? <Video size={13} color="#60A5FA" /> : <Phone size={13} color="#60A5FA" />}
              <span>{incomingCall.type === 'video' ? 'Appel vidéo entrant...' : 'Appel audio entrant...'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <button
              onClick={declineIncomingCall}
              style={{
                border: 'none', width: '44px', height: '44px', borderRadius: '50%',
                backgroundColor: '#EF4444', color: '#FFF', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(239,68,68,0.4)',
              }}
              title="Refuser l'appel"
            >
              <PhoneOff size={18} />
            </button>
            <button
              onClick={handleAcceptIncomingCall}
              style={{
                border: 'none', width: '44px', height: '44px', borderRadius: '50%',
                backgroundColor: '#22C55E', color: '#FFF', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(34,197,94,0.4)',
              }}
              title="Accepter l'appel"
            >
              <Phone size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ---- MODAL DE VISIO / APPEL PLEIN ÉCRAN (QUAND PAS EN MODE PIP) ---- */}
      {callState.active && !isCallPip && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 3000,
          backgroundColor: '#0F172A',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          animation: 'fadeSlideUp 0.3s ease both'
        }}>
          {/* FLUX PRINCIPAL CENTRAL (INVERSION SWAP-AWARE) */}
          {!isSwapVideo ? (
            /* Mode normal : flux distant au centre */
            callState.type === 'video' && remoteStream && !callState.ringing ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  zIndex: 2,
                }}
              />
            ) : null
          ) : (
            /* Mode inversé (Swap) : flux local au centre (miroir uniquement si caméra frontale) */
            callState.type === 'video' && localStream && callState.camOn ? (
              <video
                ref={localVideoRef}
                muted
                autoPlay
                playsInline
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                  zIndex: 2,
                }}
              />
            ) : null
          )}

          {/* FLUX AUDIO WEBRTC INVISIBLE POUR CONTINUITÉ DU SON */}
          <video ref={remoteVideoRef} autoPlay playsInline style={{ display: (!isSwapVideo && callState.type === 'video' && remoteStream && !callState.ringing) ? 'block' : 'none' }} />

          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 50% 40%, rgba(96,165,250,0.15) 0%, transparent 60%)', zIndex: 1 }} />

          {/* BANDEAU SUPÉRIEUR AVEC CHRONOMÈTRE DE DEAL, SWAP & BOUTON RÉDUIRE PIP */}
          <div style={{
            position: 'absolute', top: '24px', left: '24px', right: '24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            zIndex: 20
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', padding: '8px 16px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.12)' }}>
              <img src={getAuthorAvatar(selectedChat?.user || 'Thomas G.')} alt={selectedChat?.user || 'Thomas G.'} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #60A5FA' }} />
              <div>
                <div style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '800' }}>{selectedChat?.user || 'Thomas G.'}</div>
                <div style={{ color: '#60A5FA', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {callState.type === 'video' ? <Video size={11} /> : <Phone size={11} />}
                  <span>{callState.type === 'video' ? 'Appel vidéo en direct' : 'Appel audio HD'}</span>
                </div>
              </div>
              {/* CHRONOMÈTRE DE DEAL (1H = 1 JETON TROCO) */}
              {!callState.ringing && (
                <div style={{
                  marginLeft: '8px', paddingLeft: '12px', borderLeft: '1px solid rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', gap: '6px', color: '#38BDF8', fontSize: '12px', fontWeight: '800'
                }}>
                  <Clock size={13} />
                  <span>{formatCallTimer(callDuration)}</span>
                  <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '600' }}>
                    (🪙 {(callDuration / 3600).toFixed(2)})
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* BOUTON SWAP DES CAMÉRAS */}
              {callState.type === 'video' && (
                <button
                  onClick={() => setIsSwapVideo(s => !s)}
                  title={isSwapVideo ? "Afficher l'interlocuteur en grand" : "M'afficher en grand"}
                  style={{
                    border: 'none', width: '42px', height: '42px', borderRadius: '50%',
                    backgroundColor: isSwapVideo ? 'rgba(96,165,250,0.3)' : 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                    color: isSwapVideo ? '#60A5FA' : '#FFF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.2s ease'
                  }}
                >
                  <Repeat size={18} />
                </button>
              )}

              {/* BOUTON RÉDUIRE EN MODE PIP */}
              <button
                onClick={() => setIsCallPip(true)}
                title="Réduire en bulle flottante (PiP)"
                style={{
                  border: 'none', width: '42px', height: '42px', borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)', color: '#FFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.2s ease'
                }}
              >
                <Minimize2 size={18} />
              </button>

              {/* BOUTON QUITTER / RACCROCHER */}
              <button
                onClick={endCall}
                title="Quitter l'appel"
                style={{
                  border: 'none', width: '42px', height: '42px', borderRadius: '50%',
                  backgroundColor: 'rgba(239,68,68,0.25)', backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)', color: '#F87171',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.2s ease'
                }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* SONNERIE / EN TRAIN D'APPELER — overlay animé centré */}
          {callState.ringing && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '18px',
              zIndex: 30,
              pointerEvents: 'none',
              padding: '20px',
              boxSizing: 'border-box'
            }}>
              <div style={{ position: 'relative', width: '130px', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{
                    position: 'absolute',
                    width: `${130 + i * 44}px`,
                    height: `${130 + i * 44}px`,
                    borderRadius: '50%',
                    border: '2px solid rgba(96,165,250,0.45)',
                    animation: `notifPulse ${1 + i * 0.3}s ease-in-out infinite`,
                    animationDelay: `${i * 0.2}s`,
                  }} />
                ))}
                <img
                  src={getAuthorAvatar(selectedChat?.user || 'Thomas G.')}
                  alt={selectedChat?.user || 'Interlocuteur'}
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid #60A5FA',
                    boxShadow: '0 0 50px rgba(96,165,250,0.55)',
                    zIndex: 2
                  }}
                />
              </div>
              <div style={{ color: '#FFFFFF', fontSize: '22px', fontWeight: '800', textAlign: 'center', zIndex: 2, marginTop: '8px' }}>
                {selectedChat?.user || 'Interlocuteur'}
              </div>
              <div style={{ color: '#93C5FD', fontSize: '14px', fontWeight: '700', zIndex: 2, display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(15,23,42,0.85)', padding: '7px 18px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.12)' }}>
                <span style={{ display: 'inline-block', animation: 'notifPulse 1s ease-in-out infinite' }}>📞</span>
                {callState.type === 'video' ? 'Appel vidéo en cours...' : 'Appel audio en cours...'}
              </div>
            </div>
          )}

          {/* FALLBACK VISUEL : QUAND LA CAMÉRA EST COUPÉE OU EN APPEL AUDIO (PARFAITEMENT CENTRÉ) */}
          {((!isSwapVideo && (!remoteStream || callState.type !== 'video')) || (isSwapVideo && (!localStream || !callState.camOn))) && !callState.ringing && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              zIndex: 10,
              pointerEvents: 'none',
              padding: '20px',
              boxSizing: 'border-box'
            }}>
              <div style={{
                position: 'relative',
                width: '140px',
                height: '140px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img
                  src={!isSwapVideo ? getAuthorAvatar(selectedChat?.user || 'Thomas G.') : (profile.avatar || getAuthorAvatar(profile.name))}
                  alt="Avatar"
                  style={{
                    width: '140px',
                    height: '140px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid #60A5FA',
                    boxShadow: '0 0 60px rgba(96,165,250,0.45)'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: '4px',
                  right: '4px',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: '#EF4444',
                  border: '3px solid #0F172A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFF',
                  boxShadow: '0 2px 10px rgba(239,68,68,0.5)'
                }}>
                  <VideoOff size={16} />
                </div>
              </div>
              <div style={{ color: '#FFFFFF', fontSize: '22px', fontWeight: '800', textAlign: 'center' }}>
                {!isSwapVideo ? (selectedChat?.user || 'Thomas G.') : profile.name}
              </div>
              <div style={{ color: '#93C5FD', fontSize: '13px', fontWeight: '600', backgroundColor: 'rgba(15,23,42,0.85)', padding: '7px 18px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.12)' }}>
                {!isSwapVideo ? "Caméra de l'interlocuteur désactivée" : 'Votre caméra est désactivée'}
              </div>
            </div>
          )}

          {/* VIGNETTE EN COIN (FLUX SECONDAIRE SWAP-AWARE AVEC CLIC POUR INVERSER) */}
          {callState.type === 'video' && (
            <div
              onClick={() => setIsSwapVideo(s => !s)}
              title="Cliquer pour inverser les vues"
              style={{
                position: 'absolute', bottom: '110px', right: '28px',
                width: localZoom ? '240px' : '160px',
                height: localZoom ? '160px' : '110px',
                borderRadius: '20px', overflow: 'hidden',
                border: '2px solid #60A5FA',
                boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
                zIndex: 20, backgroundColor: '#0F172A',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)'
              }}
            >
              {/* Vignette normale = flux local (miroir uniquement si caméra avant) */}
              {!isSwapVideo ? (
                callState.camOn && localStream ? (
                  <video
                    ref={localVideoRef}
                    muted
                    playsInline
                    autoPlay
                    style={{
                      width: '100%', height: '100%', objectFit: 'cover',
                      transform: facingMode === 'user'
                        ? (localZoom ? 'scaleX(-1) scale(1.6)' : 'scaleX(-1) scale(1.0)')
                        : (localZoom ? 'scale(1.6)' : 'scale(1.0)'),
                      transition: 'transform 0.3s ease'
                    }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', backgroundColor: '#1E293B', color: '#94A3B8' }}>
                    <VideoOff size={18} color="#EF4444" />
                    <span style={{ fontSize: '10px', fontWeight: '700' }}>Caméra off</span>
                  </div>
                )
              ) : (
                /* Vignette inversée = flux distant */
                remoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    playsInline
                    autoPlay
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', backgroundColor: '#1E293B', color: '#94A3B8' }}>
                    <VideoOff size={18} color="#EF4444" />
                    <span style={{ fontSize: '10px', fontWeight: '700' }}>Caméra off</span>
                  </div>
                )
              )}

              {/* Boutons sur la vignette */}
              <div style={{ position: 'absolute', bottom: '6px', right: '6px', display: 'flex', gap: '4px' }}>
                {hasMultipleCameras && callState.camOn && (
                  <button
                    onClick={(e) => { e.stopPropagation(); switchCamera(); }}
                    title={facingMode === 'user' ? "Caméra arrière" : "Caméra avant"}
                    style={{ border: 'none', borderRadius: '50%', width: '24px', height: '24px', backgroundColor: 'rgba(15,23,42,0.85)', color: '#38BDF8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                  >
                    <SwitchCamera size={12} />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setLocalZoom(z => !z); }}
                  title={localZoom ? "Zoom arrière" : "Zoom caméra"}
                  style={{ border: 'none', borderRadius: '50%', width: '24px', height: '24px', backgroundColor: 'rgba(15,23,42,0.85)', color: '#60A5FA', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                >
                  {localZoom ? <ZoomOut size={12} /> : <ZoomIn size={12} />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setIsSwapVideo(s => !s); }}
                  title="Inverser les caméras"
                  style={{ border: 'none', borderRadius: '50%', width: '24px', height: '24px', backgroundColor: 'rgba(15,23,42,0.85)', color: '#60A5FA', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                >
                  <Repeat size={12} />
                </button>
              </div>
            </div>
          )}

          {/* NOTIFICATION D'INVITATION COPIÉE */}
          {callState.copied && (
            <div style={{ position: 'absolute', bottom: '96px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#04265A', color: '#FFF', padding: '8px 18px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', boxShadow: '0 6px 20px rgba(4,38,90,0.5)', zIndex: 60 }}>
              Lien d'invitation copié !
            </div>
          )}

          {/* BARRE DE CONTRÔLES PRINCIPALE EN BAS */}
          <div style={{
            position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
            backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            padding: '12px 24px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '14px',
            border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', zIndex: 50
          }}>
            <button
              onClick={toggleMic}
              title={callState.micOn ? "Couper le micro" : "Activer le micro"}
              style={{ border: 'none', width: '46px', height: '46px', borderRadius: '50%', backgroundColor: callState.micOn ? 'rgba(255,255,255,0.15)' : '#EF4444', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
            >
              {callState.micOn ? <Mic size={18} /> : <MicOff size={18} />}
            </button>

            {callState.type === 'video' && (
              <button
                onClick={toggleCam}
                title={callState.camOn ? "Couper la caméra" : "Activer la caméra"}
                style={{ border: 'none', width: '46px', height: '46px', borderRadius: '50%', backgroundColor: callState.camOn ? 'rgba(255,255,255,0.15)' : '#EF4444', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
              >
                {callState.camOn ? <Camera size={18} /> : <VideoOff size={18} />}
              </button>
            )}

            {/* BOUTON BASCULE CAMÉRA AVANT / ARRIÈRE (FLIP CAMERA MOBILE) */}
            {callState.type === 'video' && callState.camOn && hasMultipleCameras && (
              <button
                onClick={switchCamera}
                title={facingMode === 'user' ? "Basculer vers la caméra arrière" : "Basculer vers la caméra avant"}
                style={{
                  border: 'none', width: '46px', height: '46px', borderRadius: '50%',
                  backgroundColor: facingMode === 'environment' ? '#38BDF8' : 'rgba(255,255,255,0.15)',
                  color: facingMode === 'environment' ? '#0F172A' : '#FFF',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  boxShadow: facingMode === 'environment' ? '0 0 16px rgba(56,189,248,0.5)' : 'none',
                }}
              >
                <SwitchCamera size={18} />
              </button>
            )}

            {callState.type === 'video' && (
              <button
                onClick={() => setIsSwapVideo(s => !s)}
                title="Inverser les caméras"
                style={{ border: 'none', width: '46px', height: '46px', borderRadius: '50%', backgroundColor: isSwapVideo ? '#60A5FA' : 'rgba(255,255,255,0.15)', color: isSwapVideo ? '#0F172A' : '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
              >
                <Repeat size={18} />
              </button>
            )}

            <button
              onClick={() => setIsCallPip(true)}
              title="Réduire l'appel (PiP)"
              style={{ border: 'none', width: '46px', height: '46px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
            >
              <Minimize2 size={18} />
            </button>

            <button
              onClick={copyInviteLink}
              title="Inviter en groupe"
              style={{ border: 'none', width: '46px', height: '46px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
            >
              <UserPlus size={18} />
            </button>

            <button
              onClick={endCall}
              title="Raccrocher"
              style={{ border: 'none', width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#EF4444', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(239,68,68,0.55)', transition: 'transform 0.2s ease' }}
            >
              <PhoneOff size={20} />
            </button>
          </div>
        </div>
      )}

      {/* ---- BULLE FLOTTANTE PIP (PICTURE-IN-PICTURE & DRAG-AND-DROP AVEC POINTER EVENTS) ---- */}
      {callState.active && isCallPip && (
        <div
          onPointerDown={handlePipPointerDown}
          onPointerMove={handlePipPointerMove}
          onPointerUp={handlePipPointerUp}
          onPointerCancel={handlePipPointerCancel}
          style={{
            position: 'fixed',
            left: `${pipPosition.x}px`,
            top: `${pipPosition.y}px`,
            width: '210px',
            height: '145px',
            zIndex: 3500,
            borderRadius: '18px',
            overflow: 'hidden',
            boxShadow: '0 16px 40px rgba(0,0,0,0.6), 0 0 20px rgba(96,165,250,0.3)',
            border: '2px solid #60A5FA',
            backgroundColor: '#0F172A',
            display: 'flex',
            flexDirection: 'column',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            touchAction: 'none',
            cursor: 'grab',
          }}
        >
          {/* HEADER PIP DRAGGABLE */}
          <div
            style={{
              padding: '6px 10px',
              backgroundColor: 'rgba(15,23,42,0.85)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 10,
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              pointerEvents: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22C55E' }} />
              <span style={{ color: '#FFF', fontSize: '11px', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedChat?.user || 'Appel'}
              </span>
            </div>
            <span style={{ color: '#38BDF8', fontSize: '10px', fontWeight: '800' }}>
              {formatCallTimer(callDuration)}
            </span>
          </div>

          {/* CONTENU VIDÉO OU AVATAR DU PIP (AVEC DISTINCTION TAP VS DRAG) */}
          <div
            onClick={handlePipContentClick}
            title="Cliquer pour agrandir en plein écran"
            style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
          >
            {callState.type === 'video' && (remoteStream || localStream) ? (
              <video
                ref={remoteStream ? remoteVideoRef : localVideoRef}
                autoPlay
                playsInline
                muted={!remoteStream}
                style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  transform: (!remoteStream && facingMode === 'user') ? 'scaleX(-1)' : 'none',
                }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', background: 'linear-gradient(135deg, #1E293B, #0F172A)' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #60A5FA, #04265A)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: '800', fontSize: '16px' }}>
                  {(selectedChat?.user || 'T')[0]}
                </div>
                <span style={{ color: '#93C5FD', fontSize: '10px', fontWeight: '600' }}>En direct</span>
              </div>
            )}

            {/* CONTRÔLES FLOTTANTS MINIATURES SUR LE PIP */}
            <div
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                position: 'absolute', bottom: '6px', left: '6px', right: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                zIndex: 10
              }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); setIsCallPip(false); }}
                title="Agrandir en plein écran"
                style={{ border: 'none', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(15,23,42,0.85)', color: '#60A5FA', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Maximize2 size={13} />
              </button>

              {hasMultipleCameras && callState.type === 'video' && callState.camOn && (
                <button
                  onClick={(e) => { e.stopPropagation(); switchCamera(); }}
                  title="Changer de caméra"
                  style={{ border: 'none', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(15,23,42,0.85)', color: '#38BDF8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <SwitchCamera size={13} />
                </button>
              )}

              <button
                onClick={(e) => { e.stopPropagation(); toggleMic(); }}
                title={callState.micOn ? "Couper micro" : "Activer micro"}
                style={{ border: 'none', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: callState.micOn ? 'rgba(15,23,42,0.85)' : '#EF4444', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {callState.micOn ? <Mic size={13} /> : <MicOff size={13} />}
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); endCall(); }}
                title="Raccrocher"
                style={{ border: 'none', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#EF4444', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <PhoneOff size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PANEL ADMINISTRATEUR & MODÉRATION (/admin) */}
      <AdminPanel
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        darkMode={darkMode}
        currentUser={profile}
        allUsers={allFirestoreUsers}
        allListings={listings}
        allReports={allReports}
        onUpdateUser={handleAdminUpdateUser}
        onDeleteListing={handleAdminDeleteListing}
        onResolveReport={handleAdminResolveReport}
      />

      {/* MODALE DE SIGNALEMENT COMMUNAUTAIRE */}
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

      {/* PASSERELLE DE PAIEMENT SÉCURISÉE (BLOC 5) */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        darkMode={darkMode}
        currentUser={profile}
        initialMode={paymentModalConfig.mode}
        initialPayload={paymentModalConfig.payload}
        onSuccess={handlePaymentSuccess}
        playBetclicSound={playBetclicBalanceSound}
        playApplePaySound={playApplePaySound}
      />

      {/* HISTORIQUE DES TRANSACTIONS & FACTURES (BLOC 5) */}
      <TransactionsHistoryModal
        isOpen={isTransactionsModalOpen}
        onClose={() => setIsTransactionsModalOpen(false)}
        darkMode={darkMode}
        currentUser={profile}
        transactions={userTransactions}
        onOpenPaymentModal={(mode) => {
          setIsTransactionsModalOpen(false);
          handleOpenPayment(mode);
        }}
      />

      {/* PARCOURS D'ONBOARDING INTERACTIF POUR NOUVEAUX COMPTES (CHANTIER 1) */}
      <OnboardingWizardModal
        isOpen={isOnboardingOpen}
        darkMode={darkMode}
        currentUser={profile}
        onComplete={handleCompleteOnboarding}
      />

      {/* MODALE D'ACCEPTATION & CONSULTATION DES CGU (BLOC 6) */}
      <CguModal
        isOpen={isCguViewerOpen || (Boolean(profile?.name) && !profile?.cguAcceptedAt && profile?.onboardingCompleted)}
        isMandatory={Boolean(profile?.name) && !profile?.cguAcceptedAt && profile?.onboardingCompleted}
        onClose={() => setIsCguViewerOpen(false)}
        onAccept={handleAcceptCgu}
        darkMode={darkMode}
        currentUser={profile}
      />

      {/* CENTRE DE CONFIDENTIALITÉ & GESTION DES DROITS RGPD (BLOC 6) */}
      <PrivacyCenterModal
        isOpen={isPrivacyCenterOpen}
        onClose={() => setIsPrivacyCenterOpen(false)}
        darkMode={darkMode}
        currentUser={profile}
        userListings={listings}
        userTransactions={userTransactions}
        onDeleteAccount={handleDeleteAccount}
      />

      {/* BANNIÈRE COOKIES & TRACEURS CONFORME CNIL / RGPD (BLOC 6) */}
      <CookieBanner
        darkMode={darkMode}
        onOpenPrivacyCenter={() => setIsPrivacyCenterOpen(true)}
      />

    </div>
  );
}
