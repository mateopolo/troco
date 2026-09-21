import { doc, getDoc } from 'firebase/firestore';
import logger from '../utils/logger';

/**
 * Service singleton de résolution et de mise en cache des profils utilisateurs.
 * Permet de convertir les UIDs bruts (Firebase Auth) en véritables identités
 * (Nom complet / displayName, Photo / avatar, Bio, Compétences, Matériel, etc.).
 */

const CACHE_STORAGE_KEY = 'troco_resolved_users_cache';

// Charger le cache initial depuis le localStorage si disponible (en purgeant les fallbacks robotiques et génériques)
const profileCache = new Map();
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        Object.entries(parsed).forEach(([k, v]) => {
          if (k && v && typeof v === 'object') {
            // Nettoyage immédiat : ne jamais conserver un profil avec avatar robot ou nom générique
            if (typeof v.avatar === 'string' && v.avatar.includes('bottts')) {
              v.avatar = '';
            }
            if (typeof v.photoURL === 'string' && v.photoURL.includes('bottts')) {
              v.photoURL = '';
            }
            if (!v.name || isGenericName(v.name) || isRawUid(v.name)) {
              return;
            }
            profileCache.set(k, v);
          }
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
 * Détermine si un nom est un fallback générique (ex: "Utilisateur Troco", "Membre Troco").
 */
export const isGenericName = (str) => {
  if (!str || typeof str !== 'string') return true;
  const s = str.trim().toLowerCase();
  return (
    s === 'utilisateur troco' ||
    s === 'membre troco' ||
    s === 'interlocuteur' ||
    s === 'membre' ||
    s === 'user' ||
    s === 'utilisateur' ||
    s === 'anonyme' ||
    s === 'anonymous' ||
    s === 'undefined' ||
    s === 'null'
  );
};

/**
 * Nettoie et formate les données d'un profil utilisateur Firestore.
 */
export const sanitizeProfileData = (uid, data = {}) => {
  // Sélection intelligente du nom : privilégier displayName / name non générique, sinon username, sinon préfixe email
  let cleanName = '';

  const candidates = [
    data.displayName,
    data.name,
    data.fullName,
    data.author,
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed && !isRawUid(trimmed) && !isGenericName(trimmed)) {
        cleanName = trimmed;
        break;
      }
    }
  }

  // Si aucun nom trouvé ou nom générique, tester le username
  if (!cleanName && data.username && typeof data.username === 'string') {
    const cleanHandle = data.username.replace(/^@/, '').trim();
    if (cleanHandle && !isRawUid(cleanHandle) && !isGenericName(cleanHandle)) {
      cleanName = cleanHandle;
    }
  }

  // Tester le préfixe email
  if (!cleanName && data.email && typeof data.email === 'string') {
    const emailPrefix = data.email.split('@')[0];
    if (emailPrefix && !isRawUid(emailPrefix) && emailPrefix.length >= 2) {
      cleanName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
    }
  }

  if (!cleanName) {
    cleanName = data.displayName || data.name || data.author || '';
  }

  // Photo de profil réelle (aucun avatar robot de remplacement)
  const rawAvatar = data.photoURL || data.avatar || '';
  const isUnsplash = typeof rawAvatar === 'string' && rawAvatar.includes('unsplash.com');
  const isRobot = typeof rawAvatar === 'string' && rawAvatar.includes('bottts');
  const avatar = (data.photoURL && (!rawAvatar || isUnsplash)) ? data.photoURL : (!isRobot ? rawAvatar : '');

  return {
    uid,
    id: uid,
    name: cleanName,
    displayName: cleanName,
    username: data.username || (cleanName ? `@${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}` : ''),
    avatar: avatar || '',
    photoURL: avatar || '',
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
  return profileCache.get(uid.trim()) || null;
};

/**
 * Résout le profil d'un utilisateur par son UID depuis Firestore (`users` ou `users_public`).
 */
export const resolveUserProfile = async (uid, db) => {
  if (!uid || typeof uid !== 'string') return null;
  const cleanUid = uid.trim();
  if (!cleanUid || cleanUid.startsWith('chat_') || cleanUid.startsWith('group-')) return null;

  // 1. Retour immédiat si déjà en cache avec un vrai nom
  if (profileCache.has(cleanUid)) {
    const existing = profileCache.get(cleanUid);
    if (existing && existing.name && !isGenericName(existing.name)) {
      return existing;
    }
  }

  // 2. Déduplication des requêtes en vol
  if (pendingPromises.has(cleanUid)) {
    return pendingPromises.get(cleanUid);
  }

  if (!db) {
    return null;
  }

  const fetchPromise = (async () => {
    try {
      // 1. Tenter d'abord la collection users
      let userSnap = await getDoc(doc(db, 'users', cleanUid)).catch(() => null);
      let userData = userSnap?.exists() ? userSnap.data() : null;

      // 2. Si non trouvé ou si le nom est générique ou incomplet, tenter users_public
      if (!userData || !userData.name || isGenericName(userData.name)) {
        const publicSnap = await getDoc(doc(db, 'users_public', cleanUid)).catch(() => null);
        if (publicSnap?.exists()) {
          const publicData = publicSnap.data() || {};
          userData = { ...publicData, ...(userData || {}) };
          if (publicData.name && !isGenericName(publicData.name)) {
            userData.name = publicData.name;
          }
          if (publicData.displayName && !isGenericName(publicData.displayName)) {
            userData.displayName = publicData.displayName;
          }
        }
      }

      if (!userData) {
        return null;
      }

      const resolved = sanitizeProfileData(cleanUid, userData);
      if (resolved && resolved.name && !isGenericName(resolved.name)) {
        profileCache.set(cleanUid, resolved);
        persistCache();
        notifySubscribers(cleanUid, resolved);
      }
      return resolved;
    } catch (err) {
      logger.warn(`[userResolverService] Erreur résolution profil UID ${cleanUid}:`, err);
      return null;
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
  const cleanUid = uid.trim();
  const sanitized = sanitizeProfileData(cleanUid, profileData);
  profileCache.set(cleanUid, sanitized);
  persistCache();
  notifySubscribers(cleanUid, sanitized);
};

/**
 * Permet aux composants React de s'abonner aux résolutions de profils pour se rafraîchir.
 */
export const subscribeToUserProfileResolutions = (callback) => {
  if (typeof callback !== 'function') return () => {};
  subscribers.add(callback);
  return () => subscribers.delete(callback);
};

/**
 * Extrait infailliblement l'UID du partenaire de discussion (en excluant formellement l'utilisateur connecté).
 */
export const getChatPartnerUid = (chat, currentUid) => {
  if (!chat) return null;
  const myUidStr = currentUid ? String(currentUid).trim() : null;
  const isValid = (u) =>
    u &&
    typeof u === 'string' &&
    u.trim().length >= 3 &&
    String(u).trim() !== myUidStr &&
    !String(u).includes('@') &&
    u !== 'partner' &&
    u !== 'undefined' &&
    !u.startsWith('chat_') &&
    !u.startsWith('group-');

  // 1. Tableaux de participants
  const pList = Array.isArray(chat.participantUids) && chat.participantUids.length > 0
    ? chat.participantUids
    : (Array.isArray(chat.participants) ? chat.participants : []);

  const found = pList.find(u => isValid(u));
  if (found) return String(found).trim();

  // 2. Propriétés directes
  if (isValid(chat.partnerUid)) return String(chat.partnerUid).trim();
  if (isValid(chat.peerUid)) return String(chat.peerUid).trim();
  if (isValid(chat.recipientUid)) return String(chat.recipientUid).trim();
  if (isValid(chat.senderUid)) return String(chat.senderUid).trim();
  if (isValid(chat.buyerUid)) return String(chat.buyerUid).trim();
  if (isValid(chat.sellerUid)) return String(chat.sellerUid).trim();
  if (isValid(chat.authorUid)) return String(chat.authorUid).trim();
  if (isValid(chat.userId)) return String(chat.userId).trim();

  // 3. Extraction depuis l'ID de chat (ex: chat_UID1_UID2_listing)
  if (typeof chat.id === 'string' && chat.id.startsWith('chat_')) {
    const parts = chat.id.replace(/^chat_/, '').split('_');
    const match = parts.find(u => isValid(u));
    if (match) return String(match).trim();
  }

  return null;
};

/**
 * Extrait le nom affichable réel du partenaire de discussion.
 */
export const getChatPartnerName = (chat, currentUid, currentUserName) => {
  if (!chat) return 'Interlocuteur';
  if (chat.isGroup) return chat.projectTitle || chat.user || 'Groupe';

  const myName = currentUserName ? String(currentUserName).trim().toLowerCase() : '';

  // 1. Profil déjà résolu attaché à l'objet
  const peer = chat.peerProfile;
  if (peer) {
    if (peer.name && !isGenericName(peer.name) && !isRawUid(peer.name)) return peer.name.trim();
    if (peer.displayName && !isGenericName(peer.displayName) && !isRawUid(peer.displayName)) return peer.displayName.trim();
  }

  // 2. Cache profil via UID
  const pUid = getChatPartnerUid(chat, currentUid);
  if (pUid) {
    const cached = getCachedUserProfile(pUid);
    if (cached) {
      if (cached.name && !isGenericName(cached.name) && !isRawUid(cached.name)) return cached.name.trim();
      if (cached.displayName && !isGenericName(cached.displayName) && !isRawUid(cached.displayName)) return cached.displayName.trim();
    }
  }

  // 3. Tester les champs nommés du chat en évitant le nom de l'utilisateur courant et les génériques
  const candidates = [
    chat.partnerName,
    chat.user,
    chat.author,
    chat.authorName,
    chat.recipientName,
    chat.senderName,
    chat.buyerName,
    chat.sellerName,
    chat.otherUserName,
  ];

  for (const cand of candidates) {
    if (cand && typeof cand === 'string') {
      const trimmed = cand.trim();
      if (
        trimmed &&
        !isGenericName(trimmed) &&
        !isRawUid(trimmed) &&
        (!myName || trimmed.toLowerCase() !== myName)
      ) {
        return trimmed;
      }
    }
  }

  // 4. Si username disponible sur le profil
  if (peer?.username && !isRawUid(peer.username)) {
    return peer.username.replace(/^@/, '').trim();
  }

  return 'Interlocuteur';
};

const userResolverService = {
  resolveUserProfile,
  getCachedUserProfile,
  setCachedUserProfile,
  subscribeToUserProfileResolutions,
  isRawUid,
  isGenericName,
  getChatPartnerUid,
  getChatPartnerName,
  sanitizeProfileData,
};

export default userResolverService;
