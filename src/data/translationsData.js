import { getInstantOrQueueTranslation } from '../utils/translator';
import {
  secondaryTranslations,
  knownTitles as secKnownTitles,
  knownMessageTranslations as secKnownMessageTranslations,
  knownCompMap as secKnownCompMap
} from './translationsSecondary';

// ---- DICTIONNAIRE I18N BASE (FR immédiat pour FCP optimal à 0ms) ----
export const translations = {
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
    viewOnMap: "Voir sur la carte",
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
    counterOffer: "Contre-proposition",
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
    collaborativeProjectTitle: "Projet Collaboratif",
    collaborativeProjectSub: "Monter une équipe, un collectif ou un projet à plusieurs avec rétribution en Jetons Troco et groupe dédié.",
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
};


// Fusion synchrone immédiate de toutes les langues pour réactivité 0ms
if (secondaryTranslations) {
  Object.assign(translations, secondaryTranslations);
}

// Tableaux mutables exportés pour compatibilité synchrone
export const knownTitles = { ...(secKnownTitles || {}) };
export const knownMessageTranslations = { ...(secKnownMessageTranslations || {}) };
export const knownCompMap = { ...(secKnownCompMap || {}) };

/**
 * Charge à la demande ou en différé les dictionnaires secondaires (EN, ES, IT, DE, JA, ZH)
 */
export async function loadSecondaryTranslations() {
  return translations;
}

export async function ensureLanguageLoaded(lang) {
  return translations[lang] || translations.FR;
}

// Déclenchement automatique non bloquant en arrière-plan (après hydratation / FCP)
if (typeof window !== 'undefined') {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => loadSecondaryTranslations());
  } else {
    setTimeout(loadSecondaryTranslations, 1000);
  }
}

export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
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

export const localizeLocation = (loc, lang) => {
  if (!loc) return loc;
  if (lang === 'FR') return loc;
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
    return translated;
  }
  return getInstantOrQueueTranslation(loc, lang, 'auto');
};

export const localizeTags = (tags, lang) => {
  if (!tags) return [];
  if (lang === 'FR') return tags;
  const map = {
    EN: { 'Cours': 'Lessons', 'Musique': 'Music', 'Cuisine': 'Cooking', 'Bricolage': 'DIY', 'Dépannage': 'Repair', 'Logement': 'Housing', 'Tech': 'Tech', 'Sport & Bien-être': 'Sports & Wellness', 'Animaux': 'Pets', 'Photo & Vidéo': 'Photo & Video', 'À distance': 'Remote', 'Urgent': 'Urgent', 'Échange': 'Swap' },
    IT: { 'Cours': 'Lezioni', 'Musique': 'Musica', 'Cuisine': 'Cucina', 'Bricolage': 'Fai da te', 'Dépannage': 'Riparazioni', 'Logement': 'Alloggio', 'Tech': 'Tech', 'Sport & Bien-être': 'Sport & Benessere', 'Animaux': 'Animali', 'Photo & Vidéo': 'Foto & Video', 'À distance': 'A distanza', 'Urgent': 'Urgente', 'Échange': 'Scambio' },
    ES: { 'Cours': 'Clases', 'Musique': 'Música', 'Cuisine': 'Cocina', 'Bricolage': 'Bricolaje', 'Dépannage': 'Reparación', 'Logement': 'Alojamiento', 'Tech': 'Tech', 'Sport & Bien-être': 'Deporte & Bienestar', 'Animaux': 'Mascotas', 'Photo & Vidéo': 'Foto & Video', 'À distance': 'Remoto', 'Urgent': 'Urgente', 'Échange': 'Intercambio' },
    DE: { 'Cours': 'Kurse', 'Musique': 'Musik', 'Cuisine': 'Kochen', 'Bricolage': 'Heimwerken', 'Dépannage': 'Reparatur', 'Logement': 'Unterkunft', 'Tech': 'Tech', 'Sport & Bien-être': 'Sport & Wellness', 'Animaux': 'Haustiere', 'Photo & Vidéo': 'Foto & Video', 'À distance': 'Remote', 'Urgent': 'Dringend', 'Échange': 'Tausch' },
    JA: { 'Cours': 'レッスン', 'Musique': '音楽', 'Cuisine': '料理', 'Bricolage': 'DIY', 'Dépannage': '修理', 'Logement': '宿泊', 'Tech': '技術', 'Sport & Bien-être': 'スポーツ＆ウェルネス', 'Animaux': 'ペット', 'Photo & Vidéo': '写真＆動画', 'À distance': 'リモート', 'Urgent': '緊急', 'Échange': '交換' },
    ZH: { 'Cours': '课程', 'Musique': '音乐', 'Cuisine': '烹饪', 'Bricolage': 'DIY', 'Dépannage': '维修', 'Logement': '住宿', 'Tech': '技术', 'Sport & Bien-être': '运动与健康', 'Animaux': '宠物', 'Photo & Vidéo': '照片与视频', 'À distance': '远程', 'Urgent': '紧急', 'Échange': '交换' }
  };
  return tags.map(t => (map[lang] && map[lang][t]) ? map[lang][t] : getInstantOrQueueTranslation(t, lang, 'auto'));
};

export const localizeReview = (text, lang) => {
  if (lang === 'FR' || !text) return text;
  return getInstantOrQueueTranslation(text, lang, 'auto');
};

export const formatTokenCount = (count, lang) => {
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


