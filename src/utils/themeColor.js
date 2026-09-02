/**
 * themeColor.js
 * Gestionnaire dynamique de la balise <meta name="theme-color"> et de la barre de statut mobile
 * 
 * - Bascule fluide entre #0F172A (Dark Mode) et #FFFFFF (Light Mode)
 * - Support d'override pour les expériences immersives (ex: Whiteboard Plein Écran)
 * - Synchronisation avec la balise Apple Mobile Web App Status Bar Style
 */

let currentOverrideColor = null;
let currentBaseIsDark = false;

/**
 * Met à jour ou insère la balise <meta name="theme-color"> dans le <head>
 * @param {string} color - Code couleur hexadécimal ou RGB (ex: '#0F172A', '#FFFFFF')
 */
export function setMetaThemeColor(color) {
  if (typeof document === 'undefined') return;
  if (!color || typeof color !== 'string') return;

  try {
    // 1. Mise à jour de <meta name="theme-color">
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', color);

    // 2. Mise à jour de <meta name="msapplication-navbutton-color"> (Windows Mobile/PWA)
    let metaMsNav = document.querySelector('meta[name="msapplication-navbutton-color"]');
    if (!metaMsNav) {
      metaMsNav = document.createElement('meta');
      metaMsNav.setAttribute('name', 'msapplication-navbutton-color');
      document.head.appendChild(metaMsNav);
    }
    metaMsNav.setAttribute('content', color);

    // 3. Mise à jour du style de barre de statut iOS
    let metaAppleStatus = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!metaAppleStatus) {
      metaAppleStatus = document.createElement('meta');
      metaAppleStatus.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
      document.head.appendChild(metaAppleStatus);
    }

    // Détermination de la luminance pour iOS status bar
    const isDarkColor = isHexDark(color);
    metaAppleStatus.setAttribute('content', isDarkColor ? 'black-translucent' : 'default');
  } catch (e) {
    console.warn('[ThemeColor] Failed to update meta tags:', e);
  }
}

/**
 * Vérifie si une couleur hexadécimale est sombre (YIQ math)
 * @param {string} hex 
 * @returns {boolean}
 */
export function isHexDark(hex) {
  if (!hex || typeof hex !== 'string') return false;
  let c = hex.replace('#', '').trim();
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  if (c.length !== 6) return false;
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 128;
}

/**
 * Récupère la couleur actuelle du meta theme-color
 * @returns {string|null}
 */
export function getMetaThemeColor() {
  if (typeof document === 'undefined') return null;
  const meta = document.querySelector('meta[name="theme-color"]');
  return meta ? meta.getAttribute('content') : null;
}

/**
 * Applique la couleur de statut par défaut selon le mode clair/sombre
 * Dark Mode: #0F172A
 * Light Mode: #FFFFFF
 * @param {boolean} isDark 
 */
export function applyGlobalThemeColor(isDark) {
  currentBaseIsDark = Boolean(isDark);
  if (currentOverrideColor) {
    // Si un override est actif (ex: Whiteboard), conserver l'override
    setMetaThemeColor(currentOverrideColor);
  } else {
    const targetColor = isDark ? '#0F172A' : '#FFFFFF';
    setMetaThemeColor(targetColor);
  }
}

/**
 * Force une couleur spécifique de barre de statut (ex: couleur du canvas Whiteboard)
 * @param {string} color 
 */
export function setThemeColorOverride(color) {
  if (!color) return;
  currentOverrideColor = color;
  setMetaThemeColor(color);
}

/**
 * Supprime l'override et restaure la couleur ambiante du thème global
 */
export function clearThemeColorOverride() {
  currentOverrideColor = null;
  const targetColor = currentBaseIsDark ? '#0F172A' : '#FFFFFF';
  setMetaThemeColor(targetColor);
}

export default {
  setMetaThemeColor,
  getMetaThemeColor,
  applyGlobalThemeColor,
  setThemeColorOverride,
  clearThemeColorOverride,
  isHexDark
};
