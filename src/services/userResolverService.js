import { doc, getDoc } from 'firebase/firestore';
import logger from '../utils/logger';

/**
 * Service singleton de résolution et de mise en cache des profils utilisateurs.
 * Permet de convertir les UIDs bruts (Firebase Auth) en véritables identités
 * (Nom complet / displayName, Photo / avatar, Bio, Compétences, Matériel, etc.).
 */

const CACHE_STORAGE_KEY = 'troco_resolved_users_cache';

// Charger le cache initial depuis le localStorage si disponible
const profileCache = new Map();
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        Object.entries(parsed).forEach(([k, v]) => {
          if (k && v && typeof v === 'object') profileCache.set(k, v);
        });
      }
    }
  }
} catch (_) {}

const pendingPromises = new Map();
const subscribers = new Set();

const notifySubscribers = (uid, profile) => {
  subscribers.forEach((callback) => {
    try {
      callback(uid, profile);
    } catch (e) {
      logger.warn('[userResolverService] Subscriber callback error:', e);
    }
  });
};

/**
 * Détermine si une chaîne est un UID brut Firebase plutôt qu'un nom humain.
 */
export const isRawUid = (str) => {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  // Alphanumérique sans espaces, entre 20 et 36 caractères
  return /^[a-zA-Z0-9_-]{20,36}$/.test(trimmed) && !trimmed.includes(' ');
};

/**
 * Nettoie et formate les données d'un profil utilisateur Firestore.
 */
const sanitizeProfileData = (uid, data = {}) => {
  const rawName = data.name || data.displayName || '';
  const isNameRawUid = isRawUid(rawName);

  let cleanName = isNameRawUid || !rawName.trim()
    ? (data.username && !isRawUid(data.username) ? data.username.replace(/^@/, '') : 'Membre Troco')
    : rawName.trim();

  // Photo de profil
  const rawAvatar = data.photoURL || data.avatar || '';
  const isUnsplash = typeof rawAvatar === 'string' && rawAvatar.includes('unsplash.com');
  const avatar = (data.photoURL && (!rawAvatar || isUnsplash)) ? data.photoURL : rawAvatar;

  return {
    uid,
    id: uid,
    name: cleanName,
    displayName: cleanName,
    username: data.username || `@${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
    avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(uid)}`,
    photoURL: avatar,
    bio: data.bio || '',
    location: data.location || 'France',
    skills: Array.isArray(data.skills) ? data.skills : [],
    equipment: Array.isArray(data.equipment) ? data.equipment : [],
    portfolio: Array.isArray(data.portfolio) ? data.portfolio : (Array.isArray(data.portfolioImages) ? data.portfolioImages : []),
    rating: data.rating !== undefined ? Number(data.rating) : (data.averageRating !== undefined ? Number(data.averageRating) : null),
    averageRating: data.averageRating !== undefined ? Number(data.averageRating) : (data.rating !== undefined ? Number(data.rating) : null),
    reviewsCount: Number(data.reviewsCount || data.reviews || 0),
    dealsCompleted: Number(data.dealsCompleted || 0),
    activeDeals: Number(data.activeDeals || data.dealsInProgress || 0),
    isTrocoPlus: Boolean(data.isTrocoPlus),
    kycVerified: Boolean(data.kycVerified),
    socialLinks: Array.isArray(data.socialLinks) ? data.socialLinks : [],
    socialUrl: data.socialUrl || null,
  };
};

/**
 * Sauvegarde le cache en mémoire dans le localStorage de manière asynchrone débattue.
 */
let persistTimeout = null;
const persistCache = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (persistTimeout) clearTimeout(persistTimeout);
  persistTimeout = setTimeout(() => {
    try {
      const obj = {};
      profileCache.forEach((val, key) => {
        obj[key] = val;
      });
      window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(obj));
    } catch (_) {}
  }, 500);
};

/**
 * Récupère un profil utilisateur en cache de manière synchrone.
 */
export const getCachedUserProfile = (uid) => {
  if (!uid || typeof uid !== 'string') return null;
  return profileCache.get(uid) || null;
};

/**
 * Résout le profil d'un utilisateur par son UID depuis Firestore (`users` ou `users_public`).
 */
export const resolveUserProfile = async (uid, db) => {
  if (!uid || typeof uid !== 'string') return null;
  const cleanUid = uid.trim();
  if (!cleanUid) return null;

  // 1. Retour immédiat si déjà en cache
  if (profileCache.has(cleanUid)) {
    return profileCache.get(cleanUid);
  }

  // 2. Déduplication des requêtes en vol
  if (pendingPromises.has(cleanUid)) {
    return pendingPromises.get(cleanUid);
  }

  if (!db) {
    const fallback = sanitizeProfileData(cleanUid, {});
    profileCache.set(cleanUid, fallback);
    return fallback;
  }

  const fetchPromise = (async () => {
    try {
      // Tenter d'abord la collection users
      let userSnap = await getDoc(doc(db, 'users', cleanUid)).catch(() => null);
      let userData = userSnap?.exists() ? userSnap.data() : null;

      // Si non trouvé ou incomplet, tenter users_public
      if (!userData) {
        const publicSnap = await getDoc(doc(db, 'users_public', cleanUid)).catch(() => null);
        if (publicSnap?.exists()) {
          userData = publicSnap.data();
        }
      }

      const resolved = sanitizeProfileData(cleanUid, userData || {});
      profileCache.set(cleanUid, resolved);
      persistCache();
      notifySubscribers(cleanUid, resolved);
      return resolved;
    } catch (err) {
      logger.warn(`[userResolverService] Erreur résolution profil UID ${cleanUid}:`, err);
      const fallback = sanitizeProfileData(cleanUid, {});
      profileCache.set(cleanUid, fallback);
      return fallback;
    } finally {
      pendingPromises.delete(cleanUid);
    }
  })();

  pendingPromises.set(cleanUid, fetchPromise);
  return fetchPromise;
};

/**
 * Enregistre directement un profil connu dans le cache.
 */
export const setCachedUserProfile = (uid, profileData) => {
  if (!uid || typeof uid !== 'string') return;
  const sanitized = sanitizeProfileData(uid, profileData);
  profileCache.set(uid, sanitized);
  persistCache();
  notifySubscribers(uid, sanitized);
};

/**
 * Permet aux composants React de s'abonner aux résolutions de profils pour se rafraîchir.
 */
export const subscribeToUserProfileResolutions = (callback) => {
  if (typeof callback !== 'function') return () => {};
  subscribers.add(callback);
  return () => subscribers.delete(callback);
};

const userResolverService = {
  resolveUserProfile,
  getCachedUserProfile,
  setCachedUserProfile,
  subscribeToUserProfileResolutions,
  isRawUid,
};

export default userResolverService;
