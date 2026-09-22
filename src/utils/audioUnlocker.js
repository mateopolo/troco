/**
 * audioUnlocker.js
 * Déverrouillage universel et proactif des AudioContext du navigateur.
 * Résout l'avertissement : "The AudioContext was not allowed to start. It must be resumed after a user gesture."
 */

const registeredContexts = new Set();
let isUnlockerInitialized = false;

/**
 * Enregistre un AudioContext pour qu'il soit automatiquement déverrouillé au premier geste utilisateur.
 * @param {AudioContext|webkitAudioContext} ctx 
 */
export function registerAudioContext(ctx) {
  if (!ctx) return;
  registeredContexts.add(ctx);

  // Si l'utilisateur a déjà interagi avec la page, déverrouiller immédiatement
  if (typeof navigator !== 'undefined' && navigator.userActivation?.hasBeenActive) {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  initGlobalAudioUnlocker();
}

/**
 * Déverrouille l'ensemble des AudioContext suspendus sur geste utilisateur (click, touchstart, keydown, pointerdown)
 */
export function unlockAllAudioContexts() {
  registeredContexts.forEach((ctx) => {
    try {
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch (_) {}
  });
}

/**
 * Initialise les écouteurs globaux une seule fois sur la fenêtre
 */
export function initGlobalAudioUnlocker() {
  if (isUnlockerInitialized || typeof window === 'undefined') return;
  isUnlockerInitialized = true;

  const handleUserGesture = () => {
    unlockAllAudioContexts();
    // Conserver les écouteurs passifs pour réactiver si le navigateur suspend à nouveau l'audio
  };

  window.addEventListener('click', handleUserGesture, { capture: true, passive: true });
  window.addEventListener('touchstart', handleUserGesture, { capture: true, passive: true });
  window.addEventListener('pointerdown', handleUserGesture, { capture: true, passive: true });
  window.addEventListener('keydown', handleUserGesture, { capture: true, passive: true });
}

// Auto-initialisation au chargement du module dans l'environnement navigateur
if (typeof window !== 'undefined') {
  initGlobalAudioUnlocker();
}
