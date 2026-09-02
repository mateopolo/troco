/**
 * haptics.js
 * Utilitaire universel de retour haptique (Vibration API) pour mobile
 * Silencieux et sécurisé : ne s'exécute que si l'API est supportée par l'appareil.
 */

export const HAPTIC_PATTERNS = {
  light: 15,
  success: [20, 50, 20],
  error: [50, 50, 50],
};

/**
 * Vérifie si l'API de vibration haptique est disponible sur l'appareil
 * @returns {boolean}
 */
export const isHapticSupported = () => {
  return (
    typeof window !== 'undefined' &&
    typeof window.navigator !== 'undefined' &&
    typeof window.navigator.vibrate === 'function'
  );
};

/**
 * Déclenche un retour haptique de manière sécurisée et silencieuse
 * @param {'light' | 'success' | 'error' | number | number[]} type - Le type de vibration ou un pattern personnalisé
 * @returns {boolean} - True si la vibration a été envoyée
 */
export const triggerHaptic = (type = 'light') => {
  if (!isHapticSupported()) return false;

  try {
    const pattern = typeof type === 'string' ? (HAPTIC_PATTERNS[type] ?? HAPTIC_PATTERNS.light) : type;
    return window.navigator.vibrate(pattern);
  } catch (err) {
    // Échec silencieux
    return false;
  }
};

/**
 * Raccourci pour un retour haptique léger (ex: navigation, bascule d'onglets, clic simple)
 */
export const hapticLight = () => triggerHaptic('light');

/**
 * Raccourci pour un retour haptique de succès (ex: deal accepté, paiement validé, action réussie)
 */
export const hapticSuccess = () => triggerHaptic('success');

/**
 * Raccourci pour un retour haptique d'erreur (ex: paiement refusé, formulaire invalide, alerte)
 */
export const hapticError = () => triggerHaptic('error');

export const haptics = {
  light: hapticLight,
  success: hapticSuccess,
  error: hapticError,
  trigger: triggerHaptic,
  isSupported: isHapticSupported,
  PATTERNS: HAPTIC_PATTERNS,
};

export default haptics;
