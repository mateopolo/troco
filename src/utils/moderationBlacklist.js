/**
 * Troco Moderation Blacklist & Content Safety Engine
 * Détection stricte et en temps réel des termes interdits (contenu explicite, racisme, insultes, illégal, arnaques).
 */

// Normalisation du texte pour contourner le leetspeak et les ruses de masquage
export const normalizeTextForModeration = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return '';
  return rawText
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents (é -> e)
    .replace(/[@4]/g, 'a')
    .replace(/[3€]/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[5$]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/[^a-z0-9\s]/g, ' ') // Remplace les caractères spéciaux par des espaces
    .replace(/\s+/g, ' ')
    .trim();
};

// 1. Contenus sexuels explicites & pornographie
export const SEXUAL_EXPLICIT_TERMS = [
  'porno', 'pornographie', 'sexe', 'escort', 'escortboy', 'escortgirl',
  'plan cul', 'cam sex', 'nude', 'nudes', 'onlyfans', 'miff', 'dickpic',
  'cybersexe', 'fellatio', 'cunnilingus', 'prostitution', 'pipe tarif'
];

// 2. Propos haineux, racisme, xénophobie & discriminations
export const HATE_SPEECH_TERMS = [
  'negre', 'bougnoule', 'bamboula', 'youpin', 'chinetoque', 'sale juif',
  'sale noir', 'sale arabe', 'sale blanc', 'raciste', 'antisemite',
  'supremaciste', 'nazisme', 'hitler', 'croix gammee', 'sale gouine', 'sale pedale'
];

// 3. Insultes graves, harcèlement & violences
export const HARASSMENT_TERMS = [
  'connard', 'salope', 'pute', 'fils de pute', 'fdp', 'batard', 'encule',
  'nique ta mere', 'suicide toi', 'va crever', 'menace de mort', 'je vais te tuer',
  'ta gueule', 'ordure', 'crevard'
];

// 4. Produits & services illégaux (Drogues, armes, faux documents)
export const ILLEGAL_TERMS = [
  'cocaine', 'coke', 'heroine', 'cannabis livraison', 'weed livraison', 'beuh a vendre',
  'shit a vendre', 'ecstasy', 'mdma', 'faux papiers', 'fausse cni', 'faux permis',
  'carte bancaire volee', 'arme a feu', 'kalachnikov', 'pistolet a vendre',
  'munitions', 'blanchiment', 'faux billets'
];

// 5. Arnaques financières & paiements frauduleux
export const SCAM_FINANCIAL_TERMS = [
  'western union', 'transcash', 'pcs mastercard', 'neosurf', 'mandat cash',
  'mandat postal', 'argent magique', 'gain facile sans effort', 'pyramidale',
  'crypto doublée', 'paypal entre amis uniquement', 'coupon toneo'
];

// Regroupement global
export const ALL_FORBIDDEN_TERMS = [
  ...SEXUAL_EXPLICIT_TERMS,
  ...HATE_SPEECH_TERMS,
  ...HARASSMENT_TERMS,
  ...ILLEGAL_TERMS,
  ...SCAM_FINANCIAL_TERMS
];

/**
 * Valide un texte quelconque contre la liste noire
 * @param {string} text - Le texte à analyser
 * @returns {{ isValid: boolean, forbiddenWord?: string, reason?: string, errorMessage?: string }}
 */
export const validateContentText = (text) => {
  if (!text || typeof text !== 'string') {
    return { isValid: true };
  }

  const normalized = normalizeTextForModeration(text);

  for (const term of ALL_FORBIDDEN_TERMS) {
    const normalizedTerm = normalizeTextForModeration(term);
    // Recherche de mot complet ou expression
    const regex = new RegExp(`\\b${normalizedTerm}\\b`, 'i');
    if (regex.test(normalized) || normalized.includes(normalizedTerm)) {
      let reason = 'Contenu non conforme à la charte communautaire Troco.';
      if (SEXUAL_EXPLICIT_TERMS.includes(term)) {
        reason = 'Les contenus à caractère sexuel explicite ou inappropriés sont strictement interdits.';
      } else if (HATE_SPEECH_TERMS.includes(term)) {
        reason = 'Les propos haineux, racistes ou discriminatoires sont formellement bannis.';
      } else if (HARASSMENT_TERMS.includes(term)) {
        reason = 'Les insultes, le harcèlement et les menaces ne sont pas tolérés sur Troco.';
      } else if (ILLEGAL_TERMS.includes(term)) {
        reason = 'Les propositions de produits ou services illégaux sont strictement prohibées.';
      } else if (SCAM_FINANCIAL_TERMS.includes(term)) {
        reason = 'Les coupons prépayés non sécurisés et mandats risqués (Transcash, Neosurf, etc.) sont interdits.';
      }

      return {
        isValid: false,
        forbiddenWord: term,
        reason,
        errorMessage: `⚠️ Action bloquée : Le terme « ${term} » est interdit sur Troco. ${reason}`
      };
    }
  }

  return { isValid: true };
};

/**
 * Valide une annonce complète avant publication
 * @param {{ title: string, description: string, tags?: string[] }} listingDraft
 * @returns {{ isValid: boolean, errorMessage?: string }}
 */
export const validateListingContent = (listingDraft) => {
  if (!listingDraft) return { isValid: true };

  // Validation du titre
  const titleCheck = validateContentText(listingDraft.title || '');
  if (!titleCheck.isValid) return titleCheck;

  // Validation de la description
  const descCheck = validateContentText(listingDraft.description || '');
  if (!descCheck.isValid) return descCheck;

  // Validation des tags
  if (Array.isArray(listingDraft.tags)) {
    for (const tag of listingDraft.tags) {
      const tagCheck = validateContentText(tag);
      if (!tagCheck.isValid) return tagCheck;
    }
  }

  return { isValid: true };
};

/**
 * Valide un message avant envoi dans le chat
 * @param {string} messageText
 * @returns {{ isValid: boolean, errorMessage?: string }}
 */
export const validateChatMessage = (messageText) => {
  return validateContentText(messageText || '');
};
