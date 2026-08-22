/**
 * TROCO - Système de Traduction Automatique Dynamique en Temps Réel
 * Traduit instantanément les annonces et les messages de chat entre toutes les langues :
 * FR, EN, ES, IT, DE, JA, ZH
 */

// Cache persistant en mémoire et localStorage pour des temps de réponse instantanés (0ms)
const MEMORY_CACHE = new Map();
const SUBSCRIBERS = new Set();

const CACHE_STORAGE_KEY = 'troco_translation_cache_v1';

// Initialisation du cache depuis localStorage
try {
  const savedCache = window.localStorage.getItem(CACHE_STORAGE_KEY);
  if (savedCache) {
    const parsed = JSON.parse(savedCache);
    Object.entries(parsed).forEach(([key, val]) => {
      MEMORY_CACHE.set(key, val);
    });
  }
} catch (_) {}

function saveCacheToStorage() {
  try {
    const obj = {};
    // Sauvegarder jusqu'à 1500 entrées pour limiter la taille mémoire
    let count = 0;
    for (const [k, v] of MEMORY_CACHE.entries()) {
      if (count++ > 1500) break;
      obj[k] = v;
    }
    window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(obj));
  } catch (_) {}
}

/**
 * Normaliser les codes de langue (support étendu mondial)
 */
export function normalizeLangCode(lang) {
  if (!lang) return 'fr';
  const l = String(lang).trim().toLowerCase();
  if (l === 'en' || l === 'gb' || l === 'us') return 'en';
  if (l === 'es') return 'es';
  if (l === 'it') return 'it';
  if (l === 'de') return 'de';
  if (l === 'pt' || l === 'br') return 'pt';
  if (l === 'ar') return 'ar';
  if (l === 'ru') return 'ru';
  if (l === 'nl') return 'nl';
  if (l === 'ja' || l === 'jp') return 'ja';
  if (l === 'zh' || l === 'cn') return 'zh-CN';
  if (l === 'ko' || l === 'kr') return 'ko';
  if (l === 'tr') return 'tr';
  if (l === 'pl') return 'pl';
  return l.length === 2 ? l : 'fr';
}

/**
 * Clé unique pour le cache
 */
function getCacheKey(text, targetLang, sourceLang = 'auto') {
  return `${sourceLang}_${targetLang.toUpperCase()}_${text.trim()}`;
}

/**
 * Traduire un texte de manière asynchrone avec support multi-API et fallbacks résilients
 */
export async function translateText(text, targetLang = 'FR', sourceLang = 'auto') {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (!trimmed) return '';

  const normTarget = normalizeLangCode(targetLang);
  const normSource = sourceLang === 'auto' ? 'auto' : normalizeLangCode(sourceLang);

  // Si même langue source et cible
  if (normSource !== 'auto' && normSource === normTarget) {
    return trimmed;
  }

  const cacheKey = getCacheKey(trimmed, targetLang, sourceLang);
  if (MEMORY_CACHE.has(cacheKey)) {
    return MEMORY_CACHE.get(cacheKey);
  }

  // 1. Essai API Google Translate Web publique
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${normSource}&tl=${normTarget}&dt=t&q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url, { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translated = data[0].map(segment => segment[0]).filter(Boolean).join('');
        if (translated) {
          MEMORY_CACHE.set(cacheKey, translated);
          saveCacheToStorage();
          notifySubscribers(cacheKey, translated);
          return translated;
        }
      }
    }
  } catch (err) {
    console.debug('[Translator] Primary Google API fetch failed, trying fallback:', err);
  }

  // 2. Fallback API MyMemory Translate
  try {
    const myMemoryPair = `${normSource === 'auto' ? 'autodetect' : normSource}|${normTarget}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${myMemoryPair}`;
    const res = await fetch(url, { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      if (data?.responseData?.translatedText) {
        const translated = data.responseData.translatedText;
        // Vérifier que MyMemory ne renvoie pas un message d'erreur d'usage
        if (!translated.toUpperCase().includes('MYMEMORY WARNING')) {
          MEMORY_CACHE.set(cacheKey, translated);
          saveCacheToStorage();
          notifySubscribers(cacheKey, translated);
          return translated;
        }
      }
    }
  } catch (err) {
    console.debug('[Translator] Secondary MyMemory API fetch failed:', err);
  }

  // En cas d'échec total des APIs externes, renvoyer le texte original
  return trimmed;
}

/**
 * Obtention synchrone depuis le cache + déclenchement de la traduction asynchrone si absente
 */
export function getInstantOrQueueTranslation(text, targetLang = 'FR', sourceLang = 'auto') {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (!trimmed) return '';

  const normTarget = normalizeLangCode(targetLang);
  const normSource = sourceLang === 'auto' ? 'auto' : normalizeLangCode(sourceLang);

  if (normSource !== 'auto' && normSource === normTarget) {
    return trimmed;
  }

  const cacheKey = getCacheKey(trimmed, targetLang, sourceLang);
  if (MEMORY_CACHE.has(cacheKey)) {
    return MEMORY_CACHE.get(cacheKey);
  }

  // Lancer la traduction en tâche de fond
  translateText(trimmed, targetLang, sourceLang).then(res => {
    if (res && res !== trimmed) {
      notifySubscribers(cacheKey, res);
    }
  }).catch(() => {});

  return trimmed; // Renvoyer le texte natif en attendant la résolution
}

function notifySubscribers(cacheKey, translated) {
  SUBSCRIBERS.forEach(cb => {
    try {
      cb(cacheKey, translated);
    } catch (_) {}
  });
}

export function subscribeTranslations(callback) {
  SUBSCRIBERS.add(callback);
  return () => SUBSCRIBERS.delete(callback);
}

/**
 * Traduire un objet annonce complet (titre, description, bio, tags, etc.)
 */
export async function translateListingObject(listing, targetLang = 'FR') {
  if (!listing) return listing;
  const target = targetLang.toUpperCase();
  const native = (listing.nativeLang || 'FR').toUpperCase();

  if (target === native) return listing;

  const [title, description, compensation] = await Promise.all([
    translateText(listing.title, target, native),
    translateText(listing.description || '', target, native),
    translateText(listing.compensation || '', target, native),
  ]);

  return {
    ...listing,
    translatedTitle: title,
    translatedDescription: description,
    translatedCompensation: compensation,
  };
}
