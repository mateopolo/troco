/**
 * 🚨 PHASE 114 : DÉTECTION MATÉRIELLE TACTILE ROBUSTE (VRAM FIX iOS / iPadOS)
 * Supprime toute dépendance à window.innerWidth < 768.
 */
export const isIosOrTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  return ('ontouchstart' in window || navigator.maxTouchPoints > 0 || /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
};

/**
 * [PERF-DEVICE-01] Détection automatique des appareils d'entrée de gamme ou contraints en mémoire/CPU.
 * Permet de désactiver les animations lourdes pour préserver la réactivité 60 FPS.
 */
export const isLowEndDevice = () => {
  if (typeof window === 'undefined') return false;

  try {
    // 1. Vérification flag explicite utilisateur dans localStorage
    const savedFlag = localStorage.getItem('troco_low_end_device') || localStorage.getItem('troco_reduce_motion');
    if (savedFlag === 'true' || savedFlag === '1') return true;

    // 2. Détection cœurs processeur (<= 2 cœurs logiques)
    if (typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 2) {
      return true;
    }

    // 3. Détection mémoire vive (RAM <= 2 Go, API Device Memory)
    if (typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 2) {
      return true;
    }
  } catch (_) {
    // Silently ignore storage or navigator errors
  }

  return false;
};

export default isIosOrTouchDevice;
