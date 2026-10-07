import { getInstantOrQueueTranslation } from './translator';
import { knownTitles } from '../data/translationsData';

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
 * Recherche instantanée (0ms) d'un titre d'annonce dans le dictionnaire des titres connus.
 * @param {string} title - Le titre de l'annonce.
 * @param {string} targetLang - La langue cible (ex: 'IT', 'EN', 'ES', etc.).
 * @returns {string|null} Le titre traduit ou null si non répertorié.
 */
export function getKnownTitleTranslation(title, targetLang = 'FR') {
  if (!title || typeof title !== 'string' || !knownTitles) return null;
  const target = (targetLang || 'FR').toUpperCase();
  if (target === 'FR') return cleanLanguageTag(title);

  const clean = cleanLanguageTag(title).trim();

  // 1. Recherche directe exacte
  if (knownTitles[title]?.[target]) return knownTitles[title][target];
  if (knownTitles[clean]?.[target]) return knownTitles[clean][target];

  // 2. Recherche normalisée insensible à la casse et apostrophes
  const norm = clean.toLowerCase().replace(/[’']/g, "'").trim();
  for (const [k, v] of Object.entries(knownTitles)) {
    if (k.toLowerCase().replace(/[’']/g, "'").trim() === norm && v?.[target]) {
      return v[target];
    }
  }

  // 3. Correspondances partielles (ex: "Séance d'écoute...", "pret de perceuse", "cours de piano")
  if (/perceuse/i.test(clean)) {
    if (/bosch/i.test(clean) && knownTitles["Prêt Perceuse Bosch"]?.[target]) {
      return knownTitles["Prêt Perceuse Bosch"][target];
    }
    if (knownTitles["Prêt Perceuse"]?.[target]) {
      return knownTitles["Prêt Perceuse"][target];
    }
  }

  if (/piano/i.test(clean) && knownTitles["Cours de Piano"]?.[target]) {
    return knownTitles["Cours de Piano"][target];
  }

  if (/violon/i.test(clean) && knownTitles["Cours de violon"]?.[target]) {
    return knownTitles["Cours de violon"][target];
  }

  if (/écoute|vinyle/i.test(clean)) {
    if (knownTitles["Séance d'écoute de vinyles"]?.[target]) {
      return knownTitles["Séance d'écoute de vinyles"][target];
    }
    if (knownTitles["Séance d'écoute"]?.[target]) {
      return knownTitles["Séance d'écoute"][target];
    }
  }

  if (/(figma|ui\/ux)/i.test(clean) && knownTitles["Initiation au Design UI/UX (Figma)"]?.[target]) {
    return knownTitles["Initiation au Design UI/UX (Figma)"][target];
  }

  return null;
}

/**
 * Parse et traduit le contenu dynamique au moment de l'affichage :
 * - Si le texte commence par une balise de langue (regex: /^\[([A-Z]{2})\]/), extrait cette balise.
 * - Si la langue de l'annonce est différente de la langue actuelle (currentLang), déclenche l'API/mock de traduction.
 * - Sinon, affiche simplement le texte nettoyé sans la balise.
 *
 * @param {string} text - Texte brut de l'annonce (titre, description, etc.).
 * @param {string} [currentLang='FR'] - Langue courante de l'interface utilisateur.
 * @param {object} [options={}] - Options (forceOriginal, sourceLang, autoTranslate, forceTranslate).
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
      return cleanText;
    }
    const translated = getInstantOrQueueTranslation(cleanText, targetLang, tag);
    return translated ? cleanLanguageTag(translated) : cleanText;
  }

  // 2. Si une langue source est explicitement indiquée
  if (options.sourceLang) {
    const src = options.sourceLang.toUpperCase();
    if (src !== targetLang) {
      const translated = getInstantOrQueueTranslation(cleanText, targetLang, src);
      return translated ? cleanLanguageTag(translated) : cleanText;
    }
    // Si la langue source déclarée est égale à targetLang, mais que options.forceTranslate est actif
    // ou que l'UI est dans une langue non-française et que le texte semble être en français
    if (options.forceTranslate) {
      const translated = getInstantOrQueueTranslation(cleanText, targetLang, 'auto');
      return translated ? cleanLanguageTag(translated) : cleanText;
    }
    return cleanText;
  }

  // 3. Si aucune balise ni sourceLang explicite :
  // Si l'interface est dans une autre langue que le français par défaut,
  // déclencher systématiquement la traduction dynamique.
  if (targetLang !== 'FR' && options.autoTranslate !== false) {
    const translated = getInstantOrQueueTranslation(cleanText, targetLang, 'auto');
    return translated ? cleanLanguageTag(translated) : cleanText;
  }

  // 4. Sinon (UI en FR et pas de balise étrangère), renvoyer le texte nettoyé
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

  // Mode "voir l'original" forcé
  if (forceOriginal) {
    return {
      title: cleanLanguageTag(rawTitle),
      description: cleanLanguageTag(rawDesc),
      compensation: cleanLanguageTag(rawComp),
    };
  }

  // 1. Si des traductions pré-existantes existent pour targetLang (cas prioritaire des annonces réelles)
  if (listing.translations && listing.translations[targetLang]) {
    const tItem = listing.translations[targetLang];
    return {
      title: cleanLanguageTag(tItem.title || rawTitle),
      description: cleanLanguageTag(tItem.description || rawDesc),
      compensation: cleanLanguageTag(tItem.compensation || rawComp),
    };
  }

  // 2. Détection d'annonce démo (isDemo: true, ID <= 20, ou annonces modèles)
  const isDemo = Boolean(
    listing.isDemo === true ||
    (typeof listing.id === 'number' && listing.id <= 20) ||
    (typeof listing.id === 'string' && /^(demo-|\d+$)/.test(listing.id) && Number(listing.id) <= 20)
  );

  // Détection de la balise ou langue native
  const titleTag = extractLanguageTag(rawTitle);
  const descTag = extractLanguageTag(rawDesc);
  // Les annonces démo sont nativement en français
  const detectedNativeLang = isDemo ? 'FR' : (titleTag || descTag || listing.nativeLang || 'FR').toUpperCase();

  // Si même langue cible que la langue native et pas d'autre demande : texte direct
  if (targetLang === detectedNativeLang && !titleTag && !descTag) {
    return {
      title: cleanLanguageTag(rawTitle),
      description: cleanLanguageTag(rawDesc),
      compensation: cleanLanguageTag(rawComp),
    };
  }

  // 3. Traduction du titre : priorité au dictionnaire instantané knownTitles ou getInstantOrQueueTranslation
  let translatedTitle = getKnownTitleTranslation(rawTitle, targetLang);
  if (!translatedTitle) {
    const cleanTitle = cleanLanguageTag(rawTitle);
    translatedTitle = getInstantOrQueueTranslation(
      cleanTitle,
      targetLang,
      isDemo ? 'FR' : (titleTag || detectedNativeLang || 'auto')
    );
  }

  // 4. Traduction de la description
  const cleanDesc = cleanLanguageTag(rawDesc);
  const translatedDesc = cleanDesc
    ? getInstantOrQueueTranslation(
        cleanDesc,
        targetLang,
        isDemo ? 'FR' : (descTag || detectedNativeLang || 'auto')
      )
    : '';

  // 5. Traduction de la compensation / contrepartie
  const cleanComp = cleanLanguageTag(rawComp);
  const translatedComp = cleanComp
    ? getInstantOrQueueTranslation(
        cleanComp,
        targetLang,
        isDemo ? 'FR' : (detectedNativeLang || 'auto')
      )
    : '';

  return {
    title: cleanLanguageTag(translatedTitle || rawTitle),
    description: cleanLanguageTag(translatedDesc || rawDesc),
    compensation: cleanLanguageTag(translatedComp || rawComp),
  };
}
