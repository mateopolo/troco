import { getInstantOrQueueTranslation } from './translator';

/**
 * Regex officielle pour détecter et extraire une balise de langue préfixée au format [XX].
 * Exemples : "[EN] I propose...", "[FR] Je propose...", "[ES] Ofrezco..."
 */
export const LANGUAGE_TAG_REGEX = /^\[([A-Z]{2})\]/;

/**
 * Extrait la balise de langue à 2 lettres majuscules si présente au tout début du texte.
 * @param {string} text - Le texte brut de l'annonce ou description.
 * @returns {string|null} Le code de langue (ex: 'EN', 'FR', 'ES') ou null s'il n'y a pas de balise.
 */
export function extractLanguageTag(text) {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(LANGUAGE_TAG_REGEX);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Nettoie la balise de langue au début du texte et les espaces attenants.
 * Exemple : "[EN] Je propose..." => "Je propose..."
 * @param {string} text - Le texte brut contenant potentiellement une balise.
 * @returns {string} Le texte nettoyé sans la balise.
 */
export function cleanLanguageTag(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/^\[[A-Z]{2}\]\s*/, '');
}

/**
 * Parse et traduit le contenu dynamique au moment de l'affichage :
 * - Si le texte commence par une balise de langue (regex: /^\[([A-Z]{2})\]/), extrait cette balise.
 * - Si la langue de l'annonce est différente de la langue actuelle (currentLang), déclenche l'API/mock de traduction.
 * - Sinon, affiche simplement le texte nettoyé sans la balise.
 *
 * Exemple sécurisé : const cleanText = description.replace(/^\[[A-Z]{2}\]\s*\/, '');
 *
 * @param {string} text - Texte brut de l'annonce (titre, description, etc.).
 * @param {string} [currentLang='FR'] - Langue courante de l'interface utilisateur.
 * @param {object} [options={}] - Options (forceOriginal, sourceLang, etc.).
 * @returns {string} Le texte nettoyé et traduit si nécessaire.
 */
export function parseAndTranslateDynamicText(text, currentLang = 'FR', options = {}) {
  if (!text || typeof text !== 'string') return '';

  const targetLang = (currentLang || 'FR').toUpperCase();
  const tag = extractLanguageTag(text);
  const cleanText = text.replace(/^\[[A-Z]{2}\]\s*/, '');

  if (options.forceOriginal) {
    return cleanText;
  }

  // 1. Si une balise de langue explicite est présente (ex: [EN], [FR], [ES])
  if (tag) {
    if (tag === targetLang) {
      // Même langue que l'UI : afficher simplement le texte nettoyé sans la balise
      return cleanText;
    }
    // Langue différente : déclencher l'API/mock de traduction pour le contenu
    const translated = getInstantOrQueueTranslation(cleanText, targetLang, tag);
    return translated ? cleanLanguageTag(translated) : cleanText;
  }

  // 2. Si aucune balise, mais qu'une langue source est indiquée et différente de targetLang
  if (options.sourceLang) {
    const src = options.sourceLang.toUpperCase();
    if (src !== targetLang) {
      const translated = getInstantOrQueueTranslation(cleanText, targetLang, src);
      return translated ? cleanLanguageTag(translated) : cleanText;
    }
  }

  // 3. Sinon, renvoyer le texte nettoyé
  return cleanText;
}

/**
 * Parse et traduit un objet annonce complet (titre, description, compensation).
 * @param {object} listing - L'objet annonce (title, description, compensation, etc.).
 * @param {string} [currentLang='FR'] - Langue courante sélectionnée.
 * @param {boolean} [forceOriginal=false] - Forcer l'affichage du texte original (sans balise).
 * @returns {{ title: string, description: string, compensation: string }}
 */
export function parseAndTranslateListing(listing, currentLang = 'FR', forceOriginal = false) {
  if (!listing) {
    return { title: '', description: '', compensation: '' };
  }

  const targetLang = (currentLang || 'FR').toUpperCase();
  const rawTitle = listing.title || '';
  const rawDesc = listing.description || '';
  const rawComp = listing.compensation || '';

  // Détection d'une éventuelle balise dans le titre ou la description
  const titleTag = extractLanguageTag(rawTitle);
  const descTag = extractLanguageTag(rawDesc);
  const detectedNativeLang = (titleTag || descTag || listing.nativeLang || 'FR').toUpperCase();

  // Mode "voir l'original" forcé
  if (forceOriginal) {
    return {
      title: cleanLanguageTag(rawTitle),
      description: cleanLanguageTag(rawDesc),
      compensation: cleanLanguageTag(rawComp),
    };
  }

  // Si des traductions pré-existantes existent pour targetLang
  if (listing.translations && listing.translations[targetLang]) {
    const tItem = listing.translations[targetLang];
    return {
      title: cleanLanguageTag(tItem.title || rawTitle),
      description: cleanLanguageTag(tItem.description || rawDesc),
      compensation: cleanLanguageTag(tItem.compensation || rawComp),
    };
  }

  // Parsing dynamique et traduction
  const title = parseAndTranslateDynamicText(rawTitle, targetLang, {
    sourceLang: detectedNativeLang,
    forceOriginal,
  });

  const description = parseAndTranslateDynamicText(rawDesc, targetLang, {
    sourceLang: detectedNativeLang,
    forceOriginal,
  });

  const compensation = parseAndTranslateDynamicText(rawComp, targetLang, {
    sourceLang: detectedNativeLang,
    forceOriginal,
  });

  return { title, description, compensation };
}
