/**
 * 🚨 PHASE 114 : DÉTECTION MATÉRIELLE TACTILE ROBUSTE (VRAM FIX iOS / iPadOS)
 * Supprime toute dépendance à window.innerWidth < 768.
 */
export const isIosOrTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  return ('ontouchstart' in window || navigator.maxTouchPoints > 0 || /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
};

export default isIosOrTouchDevice;
