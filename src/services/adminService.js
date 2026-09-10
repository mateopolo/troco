import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

/**
 * 🛠️ Helper de mapping d'erreurs Firebase Functions
 */
function formatFunctionError(error) {
  const code = error?.code || '';
  const message = error?.message || 'Une erreur inconnue est survenue.';

  switch (code) {
    case 'functions/permission-denied':
      return new Error('Accès refusé : privilèges administrateur requis.');
    case 'functions/unauthenticated':
      return new Error('Session expirée ou utilisateur non connecté.');
    case 'functions/resource-exhausted':
      return new Error('Limite de requêtes atteinte (max 10 actions/minute). Réessayez dans un instant.');
    case 'functions/not-found':
      return new Error(`Ressource introuvable : ${message}`);
    case 'functions/invalid-argument':
      return new Error(`Requête invalide : ${message}`);
    default:
      return new Error(message);
  }
}

/**
 * 👑 Accorder ou révoquer les droits administrateur (Custom Claim)
 * @param {string} uid - Identifiant de l'utilisateur
 * @param {boolean} admin - true pour nommer admin, false pour révoquer
 */
export async function setAdminClaim(uid, admin = true) {
  try {
    const fn = httpsCallable(functions, 'setAdminClaim');
    const result = await fn({ uid, admin });
    return result.data;
  } catch (error) {
    console.error('[adminService] setAdminClaim error:', error);
    throw formatFunctionError(error);
  }
}

/**
 * 🗑️ Supprimer définitivement une annonce en tant qu'administrateur
 * @param {string} listingId - ID du listing (Firestore doc ID)
 * @param {string} [reason] - Motif de suppression
 */
export async function deleteListingAsAdmin(listingId, reason = 'Violation des conditions d’utilisation') {
  try {
    const fn = httpsCallable(functions, 'deleteListingAsAdmin');
    const result = await fn({ listingId, reason });
    return result.data;
  } catch (error) {
    console.error('[adminService] deleteListingAsAdmin error:', error);
    throw formatFunctionError(error);
  }
}

/**
 * 🛡️ Réinitialiser le profil d'un utilisateur de manière sécurisée
 * @param {string} uid - Identifiant de l'utilisateur
 * @param {boolean} [preserveWallet=true] - Préserver les soldes euros et jetons
 */
export async function resetUserSafely(uid, preserveWallet = true) {
  try {
    const fn = httpsCallable(functions, 'resetUserSafely');
    const result = await fn({ uid, preserveWallet });
    return result.data;
  } catch (error) {
    console.error('[adminService] resetUserSafely error:', error);
    throw formatFunctionError(error);
  }
}

/**
 * ⚖️ Statuer sur un signalement (résolu ou rejeté)
 * @param {string} reportId - ID du signalement
 * @param {'resolved' | 'dismissed' | 'pending'} status - Statut
 * @param {string} [resolution] - Motif ou explications de la résolution
 */
export async function resolveReport(reportId, status = 'resolved', resolution = '') {
  try {
    const fn = httpsCallable(functions, 'resolveReport');
    const result = await fn({ reportId, status, resolution });
    return result.data;
  } catch (error) {
    console.error('[adminService] resolveReport error:', error);
    throw formatFunctionError(error);
  }
}

/**
 * 👁️ Masquer ou réafficher une annonce dans le feed public
 * @param {string} listingId - ID de l'annonce
 * @param {boolean} [isHidden] - Valeur explicite si fournie
 */
export async function toggleHideListingAsAdmin(listingId, isHidden) {
  try {
    const fn = httpsCallable(functions, 'toggleHideListingAsAdmin');
    const result = await fn({ listingId, isHidden });
    return result.data;
  } catch (error) {
    console.error('[adminService] toggleHideListingAsAdmin error:', error);
    throw formatFunctionError(error);
  }
}

/**
 * 👤 Mettre à jour des attributs administratifs d'un utilisateur
 * @param {string} uid - ID de l'utilisateur
 * @param {Record<string, any>} updates - Mises à jour
 */
export async function updateUserAsAdmin(uid, updates) {
  try {
    const fn = httpsCallable(functions, 'updateUserAsAdmin');
    const result = await fn({ uid, updates });
    return result.data;
  } catch (error) {
    console.error('[adminService] updateUserAsAdmin error:', error);
    throw formatFunctionError(error);
  }
}

/**
 * 📦 Lancer la migration / backfill des utilisateurs vers users_public
 */
export async function migrateUsersPublic() {
  try {
    const fn = httpsCallable(functions, 'migrateUsersPublic');
    const result = await fn();
    return result.data;
  } catch (error) {
    console.error('[adminService] migrateUsersPublic error:', error);
    throw formatFunctionError(error);
  }
}

const adminService = {
  setAdminClaim,
  deleteListingAsAdmin,
  resetUserSafely,
  resolveReport,
  toggleHideListingAsAdmin,
  updateUserAsAdmin,
  migrateUsersPublic,
};

export default adminService;


