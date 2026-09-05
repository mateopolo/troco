import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { applyGlobalThemeColor } from '../utils/themeColor';

// ============================================================================
// CHROMATIC INTELLIGENCE & HSL / RGB / YIQ MATH UTILITIES
// ============================================================================

export function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return { r: 185, g: 139, b: 115 };
  let c = hex.replace('#', '').trim();
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  if (c.length !== 6) return { r: 185, g: 139, b: 115 };
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex(r, g, b) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [clamp(r), clamp(g), clamp(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  h /= 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  let r, g, b;
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

export function hslToHex(h, s, l) {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

export function adjustBrightness(hex, percent) {
  try {
    const { r, g, b } = hexToRgb(hex);
    const amount = (percent / 100) * 255;
    return rgbToHex(r + amount, g + amount, b + amount);
  } catch (e) {
    return hex;
  }
}

export function getLuminance(hex) {
  try {
    const { r, g, b } = hexToRgb(hex);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  } catch (e) {
    return 0.5;
  }
}

export function getContrastColor(hexColor) {
  if (!hexColor || typeof hexColor !== 'string') return '#FFFFFF';
  try {
    const { r, g, b } = hexToRgb(hexColor);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 138 ? '#111827' : '#FFFFFF';
  } catch (e) {
    return '#FFFFFF';
  }
}

/**
 * Génère une palette harmonieuse claire (Light Mode) à partir d'une unique couleur HEX
 */
export function generateHarmonicPalette(baseHex) {
  try {
    const { r, g, b } = hexToRgb(baseHex);
    const { h, s } = rgbToHsl(r, g, b);

    const bg = hslToHex(h, Math.min(s, 22), 96);
    const card = '#FFFFFF';
    const subtle = hslToHex(h, Math.min(s, 28), 92);
    const elevated = hslToHex(h, Math.min(s, 32), 88);
    const pill = hslToHex(h, Math.min(s, 36), 84);
    const text = hslToHex(h, Math.min(s, 35), 15);
    const textSecondary = hslToHex(h, Math.min(s, 25), 38);
    const border = hslToHex(h, Math.min(s, 20), 85);
    const primaryHover = hslToHex(h, s, Math.max(10, Math.min(85, rgbToHsl(r, g, b).l - 8)));

    return {
      primary: baseHex,
      bg,
      card,
      subtle,
      elevated,
      pill,
      text,
      textSecondary,
      border,
      primaryHover,
      contrastText: getContrastColor(baseHex),
    };
  } catch (e) {
    return {
      primary: baseHex,
      bg: '#FAF7F2',
      card: '#FFFFFF',
      subtle: '#F5F0E8',
      elevated: '#EFE8DE',
      pill: '#DDBEA9',
      text: '#3F4238',
      textSecondary: '#6B705C',
      border: '#D4C7B0',
      primaryHover: '#A87A63',
      contrastText: '#FFFFFF',
    };
  }
}

/**
 * Génère une palette harmonieuse sombre (Dark Mode Chromatique) à partir d'une couleur HEX
 * Conserve la teinte choisie mais dans des nuances profondes, veloutées et immersives.
 */
export function generateHarmonicDarkPalette(baseHex) {
  try {
    const { r, g, b } = hexToRgb(baseHex);
    const { h, s } = rgbToHsl(r, g, b);

    const bg = hslToHex(h, Math.min(s, 26), 9);
    const card = hslToHex(h, Math.min(s, 28), 14);
    const subtle = hslToHex(h, Math.min(s, 30), 19);
    const elevated = hslToHex(h, Math.min(s, 32), 24);
    const pill = hslToHex(h, Math.min(s, 35), 29);

    const text = hslToHex(h, Math.min(s, 15), 96);
    const textSecondary = hslToHex(h, Math.min(s, 25), 78);
    const textMuted = hslToHex(h, Math.min(s, 20), 58);

    const primary = hslToHex(h, Math.max(s, 55), 65);
    const primaryHover = hslToHex(h, Math.max(s, 60), 72);
    const primarySecondary = hslToHex(h, Math.max(s, 45), 55);

    const { r: pr, g: pg, b: pb } = hexToRgb(primary);
    const borderColor = `rgba(${pr}, ${pg}, ${pb}, 0.22)`;
    const borderDark = `rgba(${pr}, ${pg}, ${pb}, 0.45)`;

    const { r: br, g: bgCol, b: bb } = hexToRgb(card);
    const glassBg = `rgba(${br}, ${bgCol}, ${bb}, 0.85)`;

    return {
      '--bg-global': bg,
      '--bg-card': card,
      '--bg-subtle': subtle,
      '--bg-elevated': elevated,
      '--bg-pill': pill,
      '--bg-glass': glassBg,
      '--text-main': text,
      '--text-secondary': textSecondary,
      '--text-muted': textMuted,
      '--border-color': borderColor,
      '--border-dark': borderDark,
      '--accent-primary': primary,
      '--accent-primary-hover': primaryHover,
      '--accent-secondary': primarySecondary,
      '--accent-contrast-text': getContrastColor(primary),
      '--accent-terracotta': primary,
      '--accent-success': '#86EFAC',
      '--accent-danger': '#FCA5A5',
      '--accent-warning': '#FDE047',
      '--shadow-card': '0 12px 36px rgba(0, 0, 0, 0.65)',
      '--shadow-accent': `0 8px 24px rgba(${pr}, ${pg}, ${pb}, 0.4)`,
      '--shadow-modal': '0 24px 70px rgba(0, 0, 0, 0.85)',
      '--glass-bg': glassBg,
      '--glass-border': borderColor,
      '--overlay-bg': 'rgba(0, 0, 0, 0.82)',
      '--call-bg': hslToHex(h, Math.min(s, 26), 6),
      '--call-card': hslToHex(h, Math.min(s, 28), 11),
      '--call-button-bg': `rgba(${pr}, ${pg}, ${pb}, 0.16)`,
    };
  } catch (e) {
    return generateCustomThemeVariables(baseHex, '#111113', '#1C1C1F', '#F5F5F7');
  }
}

export function generateCustomThemeVariables(primary = '#B98B73', bg = '#FAF7F2', card = null, text = '#3F4238') {
  const isDark = getLuminance(bg) < 0.5;
  const contrastText = getContrastColor(primary);

  let bgCard = card;
  if (!bgCard) {
    bgCard = isDark ? adjustBrightness(bg, 8) : '#FFFFFF';
  }
  const bgSubtle = isDark ? adjustBrightness(bg, 14) : adjustBrightness(bg, -3);
  const bgElevated = isDark ? adjustBrightness(bg, 20) : adjustBrightness(bg, -6);
  const bgPill = isDark ? adjustBrightness(bg, 25) : adjustBrightness(bg, -10);

  const textSecondary = isDark ? adjustBrightness(text, -25) : adjustBrightness(text, 25);
  const textMuted = isDark ? adjustBrightness(text, -45) : adjustBrightness(text, 45);

  const borderColor = isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.12)';
  const borderDark = isDark ? 'rgba(255, 255, 255, 0.28)' : 'rgba(0, 0, 0, 0.25)';

  const primaryHover = isDark ? adjustBrightness(primary, 15) : adjustBrightness(primary, -15);
  const primarySecondary = isDark ? adjustBrightness(primary, 25) : adjustBrightness(primary, 15);

  const { r: br, g: bgCol, b: bb } = hexToRgb(bg);
  const glassBg = `rgba(${br}, ${bgCol}, ${bb}, 0.72)`;

  const { r: pr, g: pg, b: pb } = hexToRgb(primary);
  const { h } = rgbToHsl(pr, pg, pb);

  return {
    '--bg-global': bg,
    '--bg-card': bgCard,
    '--bg-subtle': bgSubtle,
    '--bg-elevated': bgElevated,
    '--bg-pill': bgPill,
    '--bg-glass': glassBg,
    '--text-main': text,
    '--text-secondary': textSecondary,
    '--text-muted': textMuted,
    '--border-color': borderColor,
    '--border-dark': borderDark,
    '--accent-primary': primary,
    '--accent-primary-hover': primaryHover,
    '--accent-secondary': primarySecondary,
    '--accent-contrast-text': contrastText,
    '--accent-terracotta': primary,
    '--accent-success': isDark ? '#86EFAC' : '#7A8F6A',
    '--accent-danger': isDark ? '#FCA5A5' : '#EF4444',
    '--accent-warning': isDark ? '#FDE047' : '#D97706',
    '--shadow-card': isDark ? '0 12px 36px rgba(0, 0, 0, 0.6)' : '0 10px 30px rgba(0, 0, 0, 0.07)',
    '--shadow-accent': `0 8px 24px ${primary}40`,
    '--shadow-modal': isDark ? '0 24px 70px rgba(0, 0, 0, 0.75)' : '0 20px 60px rgba(0, 0, 0, 0.12)',
    '--glass-bg': glassBg,
    '--glass-border': borderColor,
    '--overlay-bg': isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.6)',
    '--call-bg': isDark ? adjustBrightness(bg, -5) : hslToHex(h, 35, 10),
    '--call-card': isDark ? bgCard : hslToHex(h, 25, 16),
    '--call-button-bg': isDark ? bgSubtle : 'rgba(255,255,255,0.14)',
  };
}

export const GLOBAL_COLOR_AMBIANCES = [
  { id: 'rust', name: 'Troco Rust (Défaut)', color: '#C67D5B', hover: '#B56F4F', secondary: '#DDBEA9', isDefault: true },
  { id: 'ocean', name: 'Ocean Blue', color: '#0EA5E9', hover: '#0284C7', secondary: '#BAE6FD' },
  { id: 'emerald', name: 'Emerald', color: '#10B981', hover: '#059669', secondary: '#A7F3D0' },
  { id: 'amethyst', name: 'Amethyst', color: '#8B5CF6', hover: '#7C3AED', secondary: '#DDD6FE' },
  { id: 'rose', name: 'Rose', color: '#F43F5E', hover: '#E11D48', secondary: '#FECDD3' },
  { id: 'midnight', name: 'Midnight', color: '#64748B', hover: '#475569', secondary: '#CBD5E1' },
];

export const TYPOGRAPHY_OPTIONS = {
  inter: {
    id: 'inter',
    name: 'Inter',
    category: 'Moderne & Neutre',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    description: 'Typographie épurée, ultra-lisible et contemporaine',
  },
  poppins: {
    id: 'poppins',
    name: 'Poppins',
    category: 'Rond & Dynamique',
    fontFamily: "'Poppins', sans-serif",
    description: 'Typographie géométrique aux formes douces et chaleureuses',
  },
  montserrat: {
    id: 'montserrat',
    name: 'Montserrat',
    category: 'Géométrique & Audacieux',
    fontFamily: "'Montserrat', sans-serif",
    description: 'Typographie urbaine, affirmée et élégante',
  },
  roboto: {
    id: 'roboto',
    name: 'Roboto',
    category: 'Épuré & Universel',
    fontFamily: "'Roboto', sans-serif",
    description: 'Typographie moderne aux courbes agréables et neutres',
  },
  playfair: {
    id: 'playfair',
    name: 'Playfair Display',
    category: 'Serif Éditorial & Luxueux',
    fontFamily: "'Playfair Display', Georgia, serif",
    description: 'Typographie noble inspirée du siècle des Lumières',
  },
  space_grotesk: {
    id: 'space_grotesk',
    name: 'Space Grotesk',
    category: 'Tech & Futuriste',
    fontFamily: "'Space Grotesk', sans-serif",
    description: 'Typographie d’ingénierie tech aux détails géométriques',
  },
  caveat: {
    id: 'caveat',
    name: 'Caveat',
    category: 'Manuscrit & Créatif',
    fontFamily: "'Caveat', cursive",
    description: 'Écriture manuscrite fluide, chaleureuse et humaine',
  },
  lora: {
    id: 'lora',
    name: 'Lora',
    category: 'Littéraire & Poétique',
    fontFamily: "'Lora', Georgia, serif",
    description: 'Sérif contemporain aux courbes calligraphiques équilibrées',
  },
  quicksand: {
    id: 'quicksand',
    name: 'Quicksand',
    category: 'Rond & Doux',
    fontFamily: "'Quicksand', sans-serif",
    description: 'Typographie amicale aux terminaisons parfaitement arrondies',
  },
  oswald: {
    id: 'oswald',
    name: 'Oswald',
    category: 'Condensé & Impactant',
    fontFamily: "'Oswald', sans-serif",
    description: 'Typographie compacte, audacieuse et percutante',
  },
  lato: {
    id: 'lato',
    name: 'Lato',
    category: 'Stable & Professionnel',
    fontFamily: "'Lato', sans-serif",
    description: 'Harmonie parfaite entre rigueur classique et chaleur humaine',
  },
  nunito: {
    id: 'nunito',
    name: 'Nunito',
    category: 'Arrondi & Équilibré',
    fontFamily: "'Nunito', sans-serif",
    description: 'Sans-serif moderne très bien proportionné et reposant pour les yeux',
  },
  editorial: {
    id: 'editorial',
    name: 'Élégant (Cormorant)',
    category: 'Classique & Prestige',
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    description: 'Typographie noble et soignée pour un rendu boutique de luxe',
  },
  modern: {
    id: 'modern',
    name: 'Moderne (Inter)',
    category: 'Épuré & Tech',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    description: 'Typographie épurée, ultra-lisible et contemporaine',
  },
  techno: {
    id: 'techno',
    name: 'Techno (Roboto Mono)',
    category: 'Code & Monospace',
    fontFamily: "'Roboto Mono', 'Fira Code', monospace",
    description: 'Typographie futuriste et technique à espacement fixe',
  },
};

// ============================================================================
// CONFIGURATION DES THÈMES PRÉDÉFINIS (AVEC VERSIONS JOUR ET NUIT CHROMATIQUES)
// ============================================================================

export const THEMES_CONFIG = {
  earthy: {
    id: 'earthy',
    name: 'Earthy Pastel',
    description: 'Fonds crème & sable, accents terracotta, textes marron',
    previewColors: ['#FAF7F2', '#DDBEA9', '#B98B73', '#3F4238'],
    lightVariables: {
      '--bg-global': '#FAF7F2',
      '--bg-card': '#FFFFFF',
      '--bg-subtle': '#F5F0E8',
      '--bg-elevated': '#EFE8DE',
      '--bg-pill': '#DDBEA9',
      '--bg-glass': 'rgba(250, 247, 242, 0.72)',
      '--text-main': '#3F4238',
      '--text-secondary': '#6B705C',
      '--text-muted': '#A5A58D',
      '--border-color': '#D4C7B0',
      '--border-dark': '#A5A58D',
      '--accent-primary': '#B98B73',
      '--accent-primary-hover': '#A87A63',
      '--accent-secondary': '#CB997E',
      '--accent-contrast-text': '#FFFFFF',
      '--accent-terracotta': '#C29279',
      '--accent-success': '#7A8F6A',
      '--accent-danger': '#C25E5E',
      '--accent-warning': '#D97706',
      '--shadow-card': '0 10px 30px rgba(63, 66, 56, 0.08)',
      '--shadow-accent': '0 8px 24px rgba(185, 139, 115, 0.35)',
      '--shadow-modal': '0 24px 60px rgba(63, 66, 56, 0.18)',
      '--glass-bg': 'rgba(250, 247, 242, 0.72)',
      '--glass-border': 'rgba(212, 199, 176, 0.65)',
      '--overlay-bg': 'rgba(63, 66, 56, 0.65)',
      '--call-bg': '#1E1B18',
      '--call-card': '#2B2622',
      '--call-button-bg': 'rgba(250, 247, 242, 0.12)',
    },
    darkVariables: {
      '--bg-global': '#1C1714',
      '--bg-card': '#28211C',
      '--bg-subtle': '#342B25',
      '--bg-elevated': '#3D332C',
      '--bg-pill': '#4A3E36',
      '--bg-glass': 'rgba(40, 33, 28, 0.85)',
      '--text-main': '#FAF7F2',
      '--text-secondary': '#C5B8AB',
      '--text-muted': '#8E8276',
      '--border-color': 'rgba(212, 157, 126, 0.22)',
      '--border-dark': 'rgba(212, 157, 126, 0.45)',
      '--accent-primary': '#D49D7E',
      '--accent-primary-hover': '#E2AF92',
      '--accent-secondary': '#C58C6E',
      '--accent-contrast-text': '#1C1714',
      '--accent-terracotta': '#D49D7E',
      '--accent-success': '#86EFAC',
      '--accent-danger': '#FCA5A5',
      '--accent-warning': '#FDE047',
      '--shadow-card': '0 12px 36px rgba(0, 0, 0, 0.65)',
      '--shadow-accent': '0 8px 24px rgba(212, 157, 126, 0.4)',
      '--shadow-modal': '0 24px 70px rgba(0, 0, 0, 0.85)',
      '--glass-bg': 'rgba(40, 33, 28, 0.85)',
      '--glass-border': 'rgba(212, 157, 126, 0.22)',
      '--overlay-bg': 'rgba(0, 0, 0, 0.82)',
      '--call-bg': '#120F0D',
      '--call-card': '#1C1714',
      '--call-button-bg': 'rgba(212, 157, 126, 0.16)',
    }
  },
  sakura: {
    id: 'sakura',
    name: 'Soft Sakura',
    description: 'Blanc rosé panna cotta, rose poudré, bordeaux velours',
    previewColors: ['#FFF5F8', '#F5C6D4', '#FFB7C5', '#3A1822'],
    lightVariables: {
      '--bg-global': '#FFF5F8',
      '--bg-card': '#FFFFFF',
      '--bg-subtle': '#FDEAF0',
      '--bg-elevated': '#FAD9E2',
      '--bg-pill': '#F5C6D4',
      '--bg-glass': 'rgba(255, 245, 248, 0.72)',
      '--text-main': '#3A1822',
      '--text-secondary': '#754352',
      '--text-muted': '#A37382',
      '--border-color': '#F2CAD6',
      '--border-dark': '#FFB7C5',
      '--accent-primary': '#FFB7C5',
      '--accent-primary-hover': '#F5A3B3',
      '--accent-secondary': '#FFD1DC',
      '--accent-contrast-text': '#3A1822',
      '--accent-terracotta': '#FFB7C5',
      '--accent-success': '#689F63',
      '--accent-danger': '#E11D48',
      '--accent-warning': '#D97706',
      '--shadow-card': '0 10px 30px rgba(58, 24, 34, 0.07)',
      '--shadow-accent': '0 8px 24px rgba(255, 183, 197, 0.35)',
      '--shadow-modal': '0 24px 60px rgba(58, 24, 34, 0.18)',
      '--glass-bg': 'rgba(255, 245, 248, 0.92)',
      '--glass-border': 'rgba(242, 202, 214, 0.75)',
      '--overlay-bg': 'rgba(58, 24, 34, 0.65)',
      '--call-bg': '#261017',
      '--call-card': '#3A1823',
      '--call-button-bg': 'rgba(255, 245, 248, 0.16)',
    },
    darkVariables: {
      '--bg-global': '#1F1116',
      '--bg-card': '#2B1720',
      '--bg-subtle': '#391E2B',
      '--bg-elevated': '#442333',
      '--bg-pill': '#4C2739',
      '--bg-glass': 'rgba(43, 23, 32, 0.85)',
      '--text-main': '#FFF0F5',
      '--text-secondary': '#E0A8BA',
      '--text-muted': '#9C6F7E',
      '--border-color': 'rgba(244, 114, 155, 0.25)',
      '--border-dark': 'rgba(244, 114, 155, 0.5)',
      '--accent-primary': '#F4729B',
      '--accent-primary-hover': '#FB7185',
      '--accent-secondary': '#FDA4AF',
      '--accent-contrast-text': '#1F1116',
      '--accent-terracotta': '#F4729B',
      '--accent-success': '#86EFAC',
      '--accent-danger': '#FDA4AF',
      '--accent-warning': '#FDE047',
      '--shadow-card': '0 12px 36px rgba(0, 0, 0, 0.65)',
      '--shadow-accent': '0 8px 24px rgba(244, 114, 155, 0.4)',
      '--shadow-modal': '0 24px 70px rgba(0, 0, 0, 0.85)',
      '--glass-bg': 'rgba(43, 23, 32, 0.85)',
      '--glass-border': 'rgba(244, 114, 155, 0.25)',
      '--overlay-bg': 'rgba(0, 0, 0, 0.82)',
      '--call-bg': '#140A0E',
      '--call-card': '#1F1116',
      '--call-button-bg': 'rgba(244, 114, 155, 0.16)',
    }
  },
  emerald: {
    id: 'emerald',
    name: 'Botanical Sage',
    description: 'Sauge pastel, vert sous-bois, nuit émeraude profonde',
    previewColors: ['#F4F8F5', '#C7DBCF', '#8B9A80', '#1B4332'],
    lightVariables: {
      '--bg-global': '#F4F8F5',
      '--bg-card': '#FFFFFF',
      '--bg-subtle': '#E8F1EB',
      '--bg-elevated': '#DAE6DE',
      '--bg-pill': '#C7DBCF',
      '--bg-glass': 'rgba(244, 248, 245, 0.72)',
      '--text-main': '#1B4332',
      '--text-secondary': '#406A56',
      '--text-muted': '#729884',
      '--border-color': '#CDE0D4',
      '--border-dark': '#8B9A80',
      '--accent-primary': '#8B9A80',
      '--accent-primary-hover': '#7A8970',
      '--accent-secondary': '#A3B298',
      '--accent-contrast-text': '#FFFFFF',
      '--accent-terracotta': '#8B9A80',
      '--accent-success': '#52B788',
      '--accent-danger': '#E63946',
      '--accent-warning': '#D97706',
      '--shadow-card': '0 10px 30px rgba(27, 67, 50, 0.07)',
      '--shadow-accent': '0 8px 24px rgba(139, 154, 128, 0.35)',
      '--shadow-modal': '0 24px 60px rgba(27, 67, 50, 0.18)',
      '--glass-bg': 'rgba(244, 248, 245, 0.92)',
      '--glass-border': 'rgba(205, 224, 212, 0.75)',
      '--overlay-bg': 'rgba(27, 67, 50, 0.65)',
      '--call-bg': '#0F1A14',
      '--call-card': '#17271E',
      '--call-button-bg': 'rgba(244, 248, 245, 0.16)',
    },
    darkVariables: {
      '--bg-global': '#0F1A14',
      '--bg-card': '#17271E',
      '--bg-subtle': '#203429',
      '--bg-elevated': '#284032',
      '--bg-pill': '#2D4839',
      '--bg-glass': 'rgba(23, 39, 30, 0.85)',
      '--text-main': '#EDF7F2',
      '--text-secondary': '#A3CBB6',
      '--text-muted': '#6B9480',
      '--border-color': 'rgba(82, 183, 136, 0.22)',
      '--border-dark': 'rgba(82, 183, 136, 0.45)',
      '--accent-primary': '#52B788',
      '--accent-primary-hover': '#74C69D',
      '--accent-secondary': '#95D5B2',
      '--accent-contrast-text': '#0F1A14',
      '--accent-terracotta': '#52B788',
      '--accent-success': '#74C69D',
      '--accent-danger': '#FCA5A5',
      '--accent-warning': '#FDE047',
      '--shadow-card': '0 12px 36px rgba(0, 0, 0, 0.65)',
      '--shadow-accent': '0 8px 24px rgba(82, 183, 136, 0.4)',
      '--shadow-modal': '0 24px 70px rgba(0, 0, 0, 0.85)',
      '--glass-bg': 'rgba(23, 39, 30, 0.85)',
      '--glass-border': 'rgba(82, 183, 136, 0.22)',
      '--overlay-bg': 'rgba(0, 0, 0, 0.82)',
      '--call-bg': '#0A120E',
      '--call-card': '#0F1A14',
      '--call-button-bg': 'rgba(82, 183, 136, 0.16)',
    }
  },
  lavender: {
    id: 'lavender',
    name: 'Pastel Lavender',
    description: 'Brumes de lavande, lilas pastel, nuit pourpre améthyste',
    previewColors: ['#F8F6FD', '#DDD6FE', '#7C3AED', '#2E1065'],
    lightVariables: {
      '--bg-global': '#F8F6FD',
      '--bg-card': '#FFFFFF',
      '--bg-subtle': '#F0EBFC',
      '--bg-elevated': '#E5DCFA',
      '--bg-pill': '#DDD6FE',
      '--bg-glass': 'rgba(248, 246, 253, 0.72)',
      '--text-main': '#2E1065',
      '--text-secondary': '#5B21B6',
      '--text-muted': '#8B5CF6',
      '--border-color': '#DDD6FE',
      '--border-dark': '#7C3AED',
      '--accent-primary': '#7C3AED',
      '--accent-primary-hover': '#6D28D9',
      '--accent-secondary': '#8B5CF6',
      '--accent-contrast-text': '#FFFFFF',
      '--accent-terracotta': '#7C3AED',
      '--accent-success': '#10B981',
      '--accent-danger': '#EF4444',
      '--accent-warning': '#D97706',
      '--shadow-card': '0 10px 30px rgba(46, 16, 101, 0.07)',
      '--shadow-accent': '0 8px 24px rgba(124, 58, 237, 0.35)',
      '--shadow-modal': '0 24px 60px rgba(46, 16, 101, 0.18)',
      '--glass-bg': 'rgba(248, 246, 253, 0.92)',
      '--glass-border': 'rgba(221, 214, 254, 0.75)',
      '--overlay-bg': 'rgba(46, 16, 101, 0.65)',
      '--call-bg': '#161124',
      '--call-card': '#201833',
      '--call-button-bg': 'rgba(248, 246, 253, 0.16)',
    },
    darkVariables: {
      '--bg-global': '#161124',
      '--bg-card': '#201833',
      '--bg-subtle': '#2B2044',
      '--bg-elevated': '#342752',
      '--bg-pill': '#3A2C5C',
      '--bg-glass': 'rgba(32, 24, 51, 0.85)',
      '--text-main': '#F5F3FF',
      '--text-secondary': '#C4B5FD',
      '--text-muted': '#8B5CF6',
      '--border-color': 'rgba(167, 139, 250, 0.22)',
      '--border-dark': 'rgba(167, 139, 250, 0.45)',
      '--accent-primary': '#A78BFA',
      '--accent-primary-hover': '#C4B5FD',
      '--accent-secondary': '#DDD6FE',
      '--accent-contrast-text': '#161124',
      '--accent-terracotta': '#A78BFA',
      '--accent-success': '#86EFAC',
      '--accent-danger': '#FCA5A5',
      '--accent-warning': '#FDE047',
      '--shadow-card': '0 12px 36px rgba(0, 0, 0, 0.65)',
      '--shadow-accent': '0 8px 24px rgba(167, 139, 250, 0.4)',
      '--shadow-modal': '0 24px 70px rgba(0, 0, 0, 0.85)',
      '--glass-bg': 'rgba(32, 24, 51, 0.85)',
      '--glass-border': 'rgba(167, 139, 250, 0.22)',
      '--overlay-bg': 'rgba(0, 0, 0, 0.82)',
      '--call-bg': '#0F0B18',
      '--call-card': '#161124',
      '--call-button-bg': 'rgba(167, 139, 250, 0.16)',
    }
  },
  monochrome: {
    id: 'monochrome',
    name: 'Minimalist Titanium',
    description: 'Blanc pur & noir pur en jour, titane carbone en nuit',
    previewColors: ['#FFFFFF', '#E0E0E0', '#1C1C1F', '#000000'],
    lightVariables: {
      '--bg-global': '#FFFFFF',
      '--bg-card': '#F5F5F5',
      '--bg-subtle': '#EBEBEB',
      '--bg-elevated': '#E0E0E0',
      '--bg-pill': '#D6D6D6',
      '--bg-glass': 'rgba(255, 255, 255, 0.75)',
      '--text-main': '#000000',
      '--text-secondary': '#404040',
      '--text-muted': '#737373',
      '--border-color': '#E0E0E0',
      '--border-dark': '#000000',
      '--accent-primary': '#000000',
      '--accent-primary-hover': '#262626',
      '--accent-secondary': '#525252',
      '--accent-contrast-text': '#FFFFFF',
      '--accent-terracotta': '#171717',
      '--accent-success': '#16A34A',
      '--accent-danger': '#DC2626',
      '--accent-warning': '#CA8A04',
      '--shadow-card': '0 8px 24px rgba(0, 0, 0, 0.06)',
      '--shadow-accent': '0 8px 24px rgba(0, 0, 0, 0.25)',
      '--shadow-modal': '0 20px 50px rgba(0, 0, 0, 0.12)',
      '--glass-bg': 'rgba(255, 255, 255, 0.75)',
      '--glass-border': 'rgba(0, 0, 0, 0.15)',
      '--overlay-bg': 'rgba(0, 0, 0, 0.65)',
      '--call-bg': '#111111',
      '--call-card': '#222222',
      '--call-button-bg': 'rgba(255, 255, 255, 0.15)',
    },
    darkVariables: {
      '--bg-global': '#111113',
      '--bg-card': '#1C1C1F',
      '--bg-subtle': '#28282C',
      '--bg-elevated': '#222226',
      '--bg-pill': '#333338',
      '--bg-glass': 'rgba(28, 28, 31, 0.75)',
      '--text-main': '#F5F5F7',
      '--text-secondary': '#A1A1A6',
      '--text-muted': '#636366',
      '--border-color': 'rgba(245, 245, 247, 0.12)',
      '--border-dark': 'rgba(245, 245, 247, 0.25)',
      '--accent-primary': '#A89F91',
      '--accent-primary-hover': '#BCB4A8',
      '--accent-secondary': '#C9C2B7',
      '--accent-contrast-text': '#111827',
      '--accent-terracotta': '#8E8E93',
      '--accent-success': '#4ADE80',
      '--accent-danger': '#F87171',
      '--accent-warning': '#FBBF24',
      '--shadow-card': '0 12px 36px rgba(0, 0, 0, 0.65)',
      '--shadow-accent': '0 8px 24px rgba(168, 159, 145, 0.35)',
      '--shadow-modal': '0 24px 70px rgba(0, 0, 0, 0.85)',
      '--glass-bg': 'rgba(28, 28, 31, 0.75)',
      '--glass-border': 'rgba(245, 245, 247, 0.12)',
      '--overlay-bg': 'rgba(0, 0, 0, 0.8)',
      '--call-bg': '#0A0A0C',
      '--call-card': '#1C1C1F',
      '--call-button-bg': 'rgba(245, 245, 247, 0.12)',
    }
  }
};

// ============================================================================
// VALEURS EXACTES DES COULEURS PRIMAIRES DES THÈMES PRÉDÉFINIS
// ============================================================================
export const PRESET_THEME_PRIMARY_HEX = {
  sakura: '#FFB7C5',
  emerald: '#8B9A80',
  botanical: '#8B9A80',
  earthy: '#B98B73',
  lavender: '#7C3AED',
  monochrome: '#000000',
};

export const RESOLVE_PRESET_ID = (themeName) => {
  if (!themeName || typeof themeName !== 'string') return 'earthy';
  const lower = themeName.trim().toLowerCase();
  if (THEMES_CONFIG[lower]) return lower;
  if (lower === 'botanical' || lower === 'botanical sage' || lower === 'sage') return 'emerald';
  if (lower === 'sakura' || lower === 'soft sakura') return 'sakura';
  if (lower === 'earthy' || lower === 'earthy pastel') return 'earthy';
  if (lower === 'lavender' || lower === 'pastel lavender') return 'lavender';
  if (lower === 'monochrome' || lower === 'minimalist titanium' || lower === 'titanium') return 'monochrome';
  return THEMES_CONFIG[themeName] ? themeName : 'earthy';
};

const DEFAULT_CUSTOM_COLORS = {
  primary: '#B98B73',
  bg: '#FAF7F2',
  card: '#FFFFFF',
  text: '#3F4238',
};

const DEFAULT_STUDIO_SETTINGS = {
  typography: 'editorial',
  borderRadius: 14,
  baseZoom: 1.0,
  brandColor: '#B98B73',
};

const ThemeContext = createContext({
  themeId: 'earthy',
  theme: THEMES_CONFIG.earthy,
  isDark: false,
  setThemeId: () => { },
  applyPresetTheme: () => { },
  toggleTheme: () => { },
  customColors: DEFAULT_CUSTOM_COLORS,
  setCustomColors: () => { },
  typography: 'editorial',
  setTypography: () => { },
  borderRadius: 14,
  setBorderRadius: () => { },
  baseZoom: 1.0,
  setBaseZoom: () => { },
  brandColor: null,
  customBrandColor: null,
  setCustomBrandColor: () => { },
  applyBrandColor: () => { },
  setBrandColor: () => { },
  resetDesignStudio: () => { },
  allThemes: Object.values(THEMES_CONFIG),
  typographyOptions: TYPOGRAPHY_OPTIONS,
});

export function ThemeProvider({ children }) {
  // Thème de base sauvegardé (ex: 'earthy', 'sakura', 'emerald', 'lavender', 'monochrome', 'custom')
  const [themeId, setThemeIdState] = useState(() => {
    try {
      const saved = localStorage.getItem('troco_theme_base') || localStorage.getItem('troco_theme');
      if (saved && (THEMES_CONFIG[saved] || saved === 'custom')) return saved;
    } catch (e) {
      console.warn('Could not read theme from localStorage', e);
    }
    return 'earthy';
  });

  // État Mode Sombre indépendant et persistant
  const [isDark, setIsDarkState] = useState(() => {
    try {
      const saved = localStorage.getItem('troco_is_dark');
      if (saved !== null) return saved === 'true';
      const legacyTheme = localStorage.getItem('troco_theme');
      if (legacyTheme === 'dark') return true;
    } catch (e) { }
    return false;
  });

  const [customColors, setCustomColorsState] = useState(() => {
    try {
      const saved = localStorage.getItem('troco_custom_colors');
      if (saved) {
        return { ...DEFAULT_CUSTOM_COLORS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Could not read custom colors from localStorage', e);
    }
    return DEFAULT_CUSTOM_COLORS;
  });

  const [typography, setTypographyState] = useState(() => {
    try {
      const saved = localStorage.getItem('troco_studio_typography');
      if (saved && TYPOGRAPHY_OPTIONS[saved]) return saved;
    } catch (e) { }
    return DEFAULT_STUDIO_SETTINGS.typography;
  });

  const [borderRadius, setBorderRadiusState] = useState(() => {
    try {
      const saved = localStorage.getItem('troco_studio_radius');
      if (saved != null) return Number(saved);
    } catch (e) { }
    return DEFAULT_STUDIO_SETTINGS.borderRadius;
  });

  const [baseZoom, setBaseZoomState] = useState(() => {
    try {
      const saved = localStorage.getItem('troco_studio_zoom');
      if (saved != null) return Number(saved);
    } catch (e) { }
    return DEFAULT_STUDIO_SETTINGS.baseZoom;
  });

  const [customBrandColor, setCustomBrandColorState] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('troco_theme_base') || localStorage.getItem('troco_theme');
      if (savedTheme && savedTheme !== 'custom' && THEMES_CONFIG[savedTheme]) {
        return null;
      }
      return (
        localStorage.getItem('troco_custom_color') ||
        localStorage.getItem('troco_studio_brand_color') ||
        null
      );
    } catch (e) {
      return null;
    }
  });

  const brandColor = customBrandColor;
  const setBrandColorState = setCustomBrandColorState;

  const setCustomColors = useCallback((newColors) => {
    setCustomColorsState((prev) => {
      const updated = { ...prev, ...newColors };
      try {
        localStorage.setItem('troco_custom_colors', JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not persist custom colors', e);
      }
      return updated;
    });
  }, []);

  const setTypography = useCallback((newTypo) => {
    if (!TYPOGRAPHY_OPTIONS[newTypo]) return;
    setTypographyState(newTypo);
    try {
      localStorage.setItem('troco_studio_typography', newTypo);
    } catch (e) { }
  }, []);

  const setBorderRadius = useCallback((newRadius) => {
    const val = Math.max(0, Math.min(999, Number(newRadius)));
    setBorderRadiusState(val);
    try {
      localStorage.setItem('troco_studio_radius', String(val));
    } catch (e) { }
  }, []);

  const setBaseZoom = useCallback((newZoom) => {
    const val = Math.max(0.85, Math.min(1.2, Number(newZoom)));
    setBaseZoomState(val);
    try {
      localStorage.setItem('troco_studio_zoom', String(val));
    } catch (e) { }
  }, []);

  // 1. APPLICATION D'UN THÈME PRÉDÉFINI ET RÉINITIALISATION DE LA COULEUR CUSTOM
  const applyPresetTheme = useCallback((themeName) => {
    const targetId = RESOLVE_PRESET_ID(themeName);
    const targetConfig = THEMES_CONFIG[targetId] || THEMES_CONFIG.earthy;

    // A. Vider / Écraser IMMÉDIATEMENT la couleur magique stockée
    setCustomBrandColorState(null);
    setBrandColorState(null);
    try {
      localStorage.removeItem('troco_custom_color');
      localStorage.removeItem('troco_studio_brand_color');
      localStorage.removeItem('troco_custom_colors');
    } catch (e) {
      console.warn('Could not remove custom color from localStorage', e);
    }

    // B. Mettre à jour l'état du thème
    setThemeIdState(targetId);
    try {
      localStorage.setItem('troco_theme_base', targetId);
      localStorage.setItem('troco_theme', targetId);
    } catch (e) {
      console.warn('Could not persist theme to localStorage', e);
    }

    // C. Force la redéfinition immédiate de la variable CSS --accent-primary pour qu'elle utilise
    // la valeur HEX exacte associée au thème prédéfini choisi (ex: Sakura = #FFB7C5, Botanical = #8B9A80)
    const exactHex = PRESET_THEME_PRIMARY_HEX[targetId] ||
      (isDark ? targetConfig.darkVariables['--accent-primary'] : targetConfig.lightVariables['--accent-primary']);

    if (typeof document !== 'undefined' && document.documentElement) {
      const activeVars = isDark ? targetConfig.darkVariables : targetConfig.lightVariables;
      document.documentElement.style.setProperty('--accent-primary', exactHex);
      document.documentElement.style.setProperty(
        '--accent-primary-hover',
        activeVars['--accent-primary-hover'] || adjustBrightness(exactHex, isDark ? 15 : -15)
      );
      document.documentElement.style.setProperty(
        '--accent-secondary',
        activeVars['--accent-secondary'] || adjustBrightness(exactHex, 20)
      );
      document.documentElement.style.setProperty(
        '--shadow-accent',
        activeVars['--shadow-accent'] || `0 8px 24px ${exactHex}40`
      );
      document.documentElement.style.setProperty(
        '--accent-contrast-text',
        activeVars['--accent-contrast-text'] || getContrastColor(exactHex)
      );
    }
  }, [isDark]);

  const setThemeId = useCallback((newId) => {
    if (newId === 'custom') {
      setThemeIdState('custom');
      try {
        localStorage.setItem('troco_theme_base', 'custom');
        localStorage.setItem('troco_theme', 'custom');
      } catch (e) { }
    } else {
      applyPresetTheme(newId);
    }
  }, [applyPresetTheme]);

  // APPLICATION D'UNE COULEUR DE MARQUE PERSONNALISÉE (GÉNÉRATEUR MAGIQUE EN 1 CLIC)
  const applyBrandColor = useCallback((hex) => {
    if (!hex) return;
    setBrandColorState(hex);
    setCustomBrandColorState(hex);
    try {
      localStorage.setItem('troco_studio_brand_color', hex);
      localStorage.setItem('troco_custom_color', hex);
    } catch (e) { }

    const palette = generateHarmonicPalette(hex);
    const newColors = {
      primary: palette.primary,
      bg: palette.bg,
      card: palette.card,
      text: palette.text,
    };
    setCustomColorsState(newColors);
    try {
      localStorage.setItem('troco_custom_colors', JSON.stringify(newColors));
    } catch (e) { }

    setThemeIdState('custom');
    try {
      localStorage.setItem('troco_theme_base', 'custom');
      localStorage.setItem('troco_theme', 'custom');
    } catch (e) { }
  }, []);

  const resetDesignStudio = useCallback(() => {
    applyPresetTheme('earthy');
    setIsDarkState(false);
    setCustomColorsState(DEFAULT_CUSTOM_COLORS);
    setTypographyState(DEFAULT_STUDIO_SETTINGS.typography);
    setBorderRadiusState(DEFAULT_STUDIO_SETTINGS.borderRadius);
    setBaseZoomState(DEFAULT_STUDIO_SETTINGS.baseZoom);
    setBrandColorState(null);
    setCustomBrandColorState(null);

    try {
      localStorage.removeItem('troco_theme_base');
      localStorage.removeItem('troco_theme');
      localStorage.removeItem('troco_is_dark');
      localStorage.removeItem('troco_custom_colors');
      localStorage.removeItem('troco_custom_color');
      localStorage.removeItem('troco_studio_brand_color');
      localStorage.removeItem('troco_studio_typography');
      localStorage.removeItem('troco_studio_radius');
      localStorage.removeItem('troco_studio_zoom');
    } catch (e) { }
  }, [applyPresetTheme]);

  // CALCUL DE LA PALETTE CHROMATIQUE ACTIVE (ADAPTEE AU MODE JOUR / NUIT DU THEME SELECTIONNE)
  const theme = useMemo(() => {
    if (themeId === 'custom') {
      const generatedVars = isDark
        ? generateHarmonicDarkPalette(customColors.primary || '#B98B73')
        : generateCustomThemeVariables(
          customColors.primary,
          customColors.bg,
          customColors.card,
          customColors.text
        );
      return {
        id: 'custom',
        name: 'Sur-Mesure (Studio)',
        description: 'Palette chromatique intelligente et personnalisée',
        isDark,
        previewColors: isDark
          ? [generatedVars['--bg-global'], generatedVars['--bg-card'], generatedVars['--accent-primary'], generatedVars['--text-main']]
          : [customColors.bg, customColors.card || '#FFFFFF', customColors.primary, customColors.text],
        variables: generatedVars,
      };
    }
    const currentConfig = THEMES_CONFIG[themeId] || THEMES_CONFIG.earthy;
    const activeVariables = isDark ? currentConfig.darkVariables : currentConfig.lightVariables;
    return {
      id: currentConfig.id,
      name: currentConfig.name,
      description: currentConfig.description,
      isDark,
      previewColors: isDark
        ? [activeVariables['--bg-global'], activeVariables['--bg-card'], activeVariables['--accent-primary'], activeVariables['--text-main']]
        : currentConfig.previewColors,
      variables: activeVariables,
    };
  }, [themeId, isDark, customColors]);

  // BASCULE DU MODE SOMBRE SANS MODIFIER LE THEME CHOISI
  const toggleTheme = useCallback(() => {
    setIsDarkState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('troco_is_dark', String(next));
      } catch (e) { }
      return next;
    });
  }, []);

  // INJECTION DYNAMIQUE DES VARIABLES CSS SUR DOCUMENT ET BODY
  useEffect(() => {
    const root = document.documentElement;
    const vars = theme.variables;

    root.setAttribute('data-theme', theme.id);
    if (isDark) {
      root.classList.add('dark-theme', 'dark-mode');
      root.classList.remove('light-theme');
      document.body.classList.add('dark-mode');
    } else {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme', 'dark-mode');
      document.body.classList.remove('dark-mode');
    }

    // Palette variables de base
    Object.entries(vars).forEach(([prop, val]) => {
      root.style.setProperty(prop, val);
    });

    // Studio Extended Variables
    const currentFont = TYPOGRAPHY_OPTIONS[typography]?.fontFamily || TYPOGRAPHY_OPTIONS.editorial.fontFamily;
    root.style.setProperty('--font-family-main', currentFont);

    // SÉPARATION STRICTE DE LA GÉOMÉTRIE DU RADIUS (BOUTONS vs CARTES/BULLES)
    const numRadius = Number(borderRadius) || 14;
    const buttonRadius = `${numRadius}px`;
    const cardRadius = `${Math.min(numRadius, 32)}px`;

    root.style.setProperty('--border-radius-button', buttonRadius);
    root.style.setProperty('--border-radius-card', cardRadius);
    root.style.setProperty('--border-radius-main', cardRadius);
    root.style.setProperty('--border-radius', cardRadius);

    root.style.setProperty('--base-zoom', `${baseZoom}`);
    root.style.zoom = `${baseZoom}`;

    // 2. PRIORITÉ DU CSS :
    // Si customBrandColor existe ET qu'aucun thème prédéfini n'est explicitement actif, utilise customBrandColor.
    // SINON, utilise la couleur primaire stricte du thème prédéfini.
    const isPresetThemeActive = themeId !== 'custom' && !!THEMES_CONFIG[themeId];

    if (customBrandColor && !isPresetThemeActive) {
      const ambiance = GLOBAL_COLOR_AMBIANCES.find(a => a.id === customBrandColor || a.color.toLowerCase() === customBrandColor.toLowerCase());
      const accentColor = ambiance ? ambiance.color : customBrandColor;
      const accentHover = ambiance ? ambiance.hover : adjustBrightness(accentColor, isDark ? 15 : -15);
      const accentSecondary = ambiance?.secondary || adjustBrightness(accentColor, 25);

      root.style.setProperty('--accent-primary', accentColor);
      root.style.setProperty('--accent-primary-hover', accentHover);
      root.style.setProperty('--accent-secondary', accentSecondary);
      root.style.setProperty('--shadow-accent', `0 8px 24px ${accentColor}40`);
      root.style.setProperty('--accent-contrast-text', getContrastColor(accentColor));
    } else {
      const targetPresetConfig = THEMES_CONFIG[themeId] || THEMES_CONFIG.earthy;
      const activePresetVars = isDark ? targetPresetConfig.darkVariables : targetPresetConfig.lightVariables;
      const strictPrimary = PRESET_THEME_PRIMARY_HEX[themeId] || activePresetVars['--accent-primary'];
      const strictHover = activePresetVars['--accent-primary-hover'] || adjustBrightness(strictPrimary, isDark ? 15 : -15);
      const strictSecondary = activePresetVars['--accent-secondary'] || adjustBrightness(strictPrimary, 20);
      const strictShadow = activePresetVars['--shadow-accent'] || `0 8px 24px ${strictPrimary}40`;
      const strictContrast = activePresetVars['--accent-contrast-text'] || getContrastColor(strictPrimary);

      root.style.setProperty('--accent-primary', strictPrimary);
      root.style.setProperty('--accent-primary-hover', strictHover);
      root.style.setProperty('--accent-secondary', strictSecondary);
      root.style.setProperty('--shadow-accent', strictShadow);
      root.style.setProperty('--accent-contrast-text', strictContrast);
    }

    // 🚨 PHASE 50 : SYNCHRONISATION DYNAMIQUE DU META THEME-COLOR & BARRE DE STATUT MOBILE
    applyGlobalThemeColor(isDark);
  }, [theme, themeId, isDark, typography, borderRadius, baseZoom, customColors, customBrandColor]);

  const allThemes = useMemo(() => {
    const presets = Object.values(THEMES_CONFIG).map((cfg) => ({
      id: cfg.id,
      name: cfg.name,
      description: cfg.description,
      previewColors: isDark
        ? [cfg.darkVariables['--bg-global'], cfg.darkVariables['--bg-card'], cfg.darkVariables['--accent-primary'], cfg.darkVariables['--text-main']]
        : cfg.previewColors,
    }));
    const customColorsHex = customColors.primary || '#B98B73';
    const { r, g, b } = hexToRgb(customColorsHex);
    const { h } = rgbToHsl(r, g, b);
    const customOption = {
      id: 'custom',
      name: 'Sur-Mesure',
      description: 'Studio de design personnalisé en direct',
      previewColors: isDark
        ? [
          hslToHex(h, 26, 9),
          hslToHex(h, 28, 14),
          hslToHex(h, 60, 65),
          '#FAF7F2'
        ]
        : [customColors.bg, customColors.card || '#FFFFFF', customColors.primary, customColors.text],
    };
    return [...presets, customOption];
  }, [isDark, customColors]);

  const value = useMemo(() => ({
    themeId,
    theme,
    isDark,
    setThemeId,
    applyPresetTheme,
    toggleTheme,
    customColors,
    setCustomColors,
    typography,
    setTypography,
    borderRadius,
    setBorderRadius,
    baseZoom,
    setBaseZoom,
    brandColor: customBrandColor,
    customBrandColor,
    setCustomBrandColor: setCustomBrandColorState,
    applyBrandColor,
    setBrandColor: applyBrandColor,
    resetDesignStudio,
    allThemes,
    typographyOptions: TYPOGRAPHY_OPTIONS,
    globalColorAmbiances: GLOBAL_COLOR_AMBIANCES,
    GLOBAL_COLOR_AMBIANCES,
    PRESET_THEME_PRIMARY_HEX,
    resolvePresetId: RESOLVE_PRESET_ID,
  }), [
    themeId,
    theme,
    isDark,
    setThemeId,
    applyPresetTheme,
    toggleTheme,
    customColors,
    setCustomColors,
    typography,
    setTypography,
    borderRadius,
    setBorderRadius,
    baseZoom,
    setBaseZoom,
    customBrandColor,
    applyBrandColor,
    resetDesignStudio,
    allThemes,
  ]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
