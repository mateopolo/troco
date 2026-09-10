/**
 * Utilitaires de gestion des drapeaux de session localStorage pour Troco.
 * 
 * ⚠️ RÈGLE DE SÉCURITÉ STRICTE (P0-SEC-05 / P1-BUG-05) :
 * La SEULE ET UNIQUE source de vérité pour l'authentification est Firebase Auth
 * via onAuthStateChanged(auth, ...).
 * 
 * Le flag 'troco_is_authenticated' est purement indicatif (télémétrie / hints)
 * et ne doit JAMAIS être utilisé côté client comme décision ou fallback d'authentification.
 */

export const AUTH_FLAG_KEY = 'troco_is_authenticated';

/**
 * Définit le flag de session active dans le localStorage.
 * Appelé uniquement après confirmation par Firebase Auth d'un utilisateur valide.
 */
export function setSessionAuthenticated() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(AUTH_FLAG_KEY, 'true');
    }
  } catch (err) {
    console.warn('[SessionFlags] Failed to set auth flag:', err);
  }
}

/**
 * Nettoie immédiatement le flag de session dans le localStorage.
 * Appelé lors de la déconnexion ou dès que onAuthStateChanged renvoie null.
 */
export function clearSessionFlags() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(AUTH_FLAG_KEY);
    }
  } catch (err) {
    console.warn('[SessionFlags] Failed to remove auth flag:', err);
  }
}

/**
 * Lecture sécurisée à des fins de diagnostic ou télémétrie uniquement.
 * ⚠️ NE DOIT JAMAIS DÉCIDER DU STATUT D'AUTHENTIFICATION DANS L'APPLICATION.
 * @returns {boolean} true si le flag est présent, false sinon
 */
export function readSafeSessionFlag() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(AUTH_FLAG_KEY) === 'true';
    }
  } catch (_) {}
  return false;
}
