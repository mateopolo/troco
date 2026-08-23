import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

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

/**
 * 1. getContrastColor(hexColor):
 * Calcule la luminance YIQ d'une couleur HEX.
 * Si sombre -> retourne #FFFFFF (blanc).
 * Si claire -> retourne #111827 (noir profond).
 * Garantit la conformité d'accessibilité WCAG sur tous les boutons d'action.
 */
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
 * 2. generateHarmonicPalette(baseHex):
 * Génère une palette harmonieuse instantanée à partir d'une unique couleur de marque :
 * - Fond global très clair (Lightness 96%)
 * - Fond de carte blanc / doux (Lightness 92% ou #FFFFFF)
 * - Fond de container / subtil (Lightness 92%)
 * - Texte de base très sombre (Lightness 15%)
 * - Couleur de bordure douce (Lightness 85%)
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

export const TYPOGRAPHY_OPTIONS = {
  editorial: {
    id: 'editorial',
    name: 'Élégant (Cormorant Garamond)',
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    description: 'Typographie noble et soignée pour un rendu boutique de luxe',
  },
  modern: {
    id: 'modern',
    name: 'Moderne (Inter)',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    description: 'Typographie épurée, ultra-lisible et contemporaine',
  },
  techno: {
    id: 'techno',
    name: 'Techno (Roboto Mono)',
    fontFamily: "'Roboto Mono', 'Fira Code', Menlo, Consolas, monospace",
    description: 'Typographie futuriste et technique à espacement fixe',
  },
};

export const THEMES_CONFIG = {
  earthy: {
    id: 'earthy',
    name: 'Earthy Pastel',
    description: 'Fonds crème & sable, accents terracotta, textes marron',
    isDark: false,
    previewColors: ['#FAF7F2', '#DDBEA9', '#B98B73', '#3F4238'],
    variables: {
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
    }
  },
  dark: {
    id: 'dark',
    name: 'Dark Titanium',
    description: 'Noir titane, cartes graphite, accents acier brossé',
    isDark: true,
    previewColors: ['#111113', '#1C1C1F', '#8E8E93', '#F5F5F7'],
    variables: {
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
  },
  monochrome: {
    id: 'monochrome',
    name: 'Minimalist Mono',
    description: 'Blanc pur, cartes gris clair, accents & textes noir pur',
    isDark: false,
    previewColors: ['#FFFFFF', '#F5F5F5', '#000000', '#000000'],
    variables: {
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
    }
  },
  sakura: {
    id: 'sakura',
    name: 'Soft Sakura',
    description: 'Blanc rosé DMC 24, rose punchy DMC 223, textes cerise DMC 838',
    isDark: false,
    previewColors: ['#FFF5F8', '#FFFFFF', '#D6456E', '#3A1822'],
    variables: {
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
      '--border-dark': '#D6456E',
      '--accent-primary': '#D6456E',
      '--accent-primary-hover': '#BF325A',
      '--accent-secondary': '#E87093',
      '--accent-contrast-text': '#FFFFFF',
      '--accent-terracotta': '#D6456E',
      '--accent-success': '#689F63',
      '--accent-danger': '#E11D48',
      '--accent-warning': '#D97706',
      '--shadow-card': '0 10px 30px rgba(58, 24, 34, 0.07)',
      '--shadow-accent': '0 8px 24px rgba(214, 69, 110, 0.35)',
      '--shadow-modal': '0 24px 60px rgba(58, 24, 34, 0.18)',
      '--glass-bg': 'rgba(255, 245, 248, 0.92)',
      '--glass-border': 'rgba(242, 202, 214, 0.75)',
      '--overlay-bg': 'rgba(58, 24, 34, 0.65)',
      '--call-bg': '#261017',
      '--call-card': '#3A1823',
      '--call-button-bg': 'rgba(255, 245, 248, 0.16)',
    }
  }
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
  setThemeId: () => {},
  toggleTheme: () => {},
  customColors: DEFAULT_CUSTOM_COLORS,
  setCustomColors: () => {},
  typography: 'editorial',
  setTypography: () => {},
  borderRadius: 14,
  setBorderRadius: () => {},
  baseZoom: 1.0,
  setBaseZoom: () => {},
  brandColor: '#B98B73',
  applyBrandColor: () => {},
  resetDesignStudio: () => {},
  allThemes: Object.values(THEMES_CONFIG),
  typographyOptions: TYPOGRAPHY_OPTIONS,
});

export function ThemeProvider({ children }) {
  const [themeId, setThemeIdState] = useState(() => {
    try {
      const saved = localStorage.getItem('troco_theme');
      if (saved && (THEMES_CONFIG[saved] || saved === 'custom')) return saved;
    } catch (e) {
      console.warn('Could not read theme from localStorage', e);
    }
    return 'earthy';
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
    } catch (e) {}
    return DEFAULT_STUDIO_SETTINGS.typography;
  });

  const [borderRadius, setBorderRadiusState] = useState(() => {
    try {
      const saved = localStorage.getItem('troco_studio_radius');
      if (saved != null) return Number(saved);
    } catch (e) {}
    return DEFAULT_STUDIO_SETTINGS.borderRadius;
  });

  const [baseZoom, setBaseZoomState] = useState(() => {
    try {
      const saved = localStorage.getItem('troco_studio_zoom');
      if (saved != null) return Number(saved);
    } catch (e) {}
    return DEFAULT_STUDIO_SETTINGS.baseZoom;
  });

  const [brandColor, setBrandColorState] = useState(() => {
    try {
      const saved = localStorage.getItem('troco_studio_brand_color');
      if (saved) return saved;
    } catch (e) {}
    return DEFAULT_STUDIO_SETTINGS.brandColor;
  });

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
    } catch (e) {}
  }, []);

  const setBorderRadius = useCallback((newRadius) => {
    const val = Math.max(0, Math.min(999, Number(newRadius)));
    setBorderRadiusState(val);
    try {
      localStorage.setItem('troco_studio_radius', String(val));
    } catch (e) {}
  }, []);

  const setBaseZoom = useCallback((newZoom) => {
    const val = Math.max(0.85, Math.min(1.2, Number(newZoom)));
    setBaseZoomState(val);
    try {
      localStorage.setItem('troco_studio_zoom', String(val));
    } catch (e) {}
  }, []);

  /**
   * 1-Clic Magic Generator :
   * Repeint instantanément tout le site de manière cohérente à partir de la couleur de marque.
   */
  const applyBrandColor = useCallback((hex) => {
    if (!hex) return;
    setBrandColorState(hex);
    try {
      localStorage.setItem('troco_studio_brand_color', hex);
    } catch (e) {}

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
    } catch (e) {}

    setThemeIdState('custom');
    try {
      localStorage.setItem('troco_theme', 'custom');
    } catch (e) {}
  }, []);

  /**
   * Réinitialisation complète du Design Studio
   */
  const resetDesignStudio = useCallback(() => {
    setThemeIdState('earthy');
    setCustomColorsState(DEFAULT_CUSTOM_COLORS);
    setTypographyState(DEFAULT_STUDIO_SETTINGS.typography);
    setBorderRadiusState(DEFAULT_STUDIO_SETTINGS.borderRadius);
    setBaseZoomState(DEFAULT_STUDIO_SETTINGS.baseZoom);
    setBrandColorState(DEFAULT_STUDIO_SETTINGS.brandColor);

    try {
      localStorage.removeItem('troco_theme');
      localStorage.removeItem('troco_custom_colors');
      localStorage.removeItem('troco_studio_typography');
      localStorage.removeItem('troco_studio_radius');
      localStorage.removeItem('troco_studio_zoom');
      localStorage.removeItem('troco_studio_brand_color');
    } catch (e) {}
  }, []);

  const theme = useMemo(() => {
    if (themeId === 'custom') {
      const generatedVars = generateCustomThemeVariables(
        customColors.primary,
        customColors.bg,
        customColors.card,
        customColors.text
      );
      const isDark = getLuminance(customColors.bg) < 0.5;
      return {
        id: 'custom',
        name: 'Sur-Mesure (Studio)',
        description: 'Palette chromatique intelligente et personnalisée',
        isDark,
        previewColors: [customColors.bg, customColors.card || '#FFFFFF', customColors.primary, customColors.text],
        variables: generatedVars,
      };
    }
    return THEMES_CONFIG[themeId] || THEMES_CONFIG.earthy;
  }, [themeId, customColors]);

  const setThemeId = useCallback((newId) => {
    if (newId !== 'custom' && !THEMES_CONFIG[newId]) return;
    setThemeIdState(newId);
    try {
      localStorage.setItem('troco_theme', newId);
    } catch (e) {
      console.warn('Could not persist theme to localStorage', e);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const nextId = theme.isDark ? 'earthy' : 'dark';
    setThemeId(nextId);
  }, [theme.isDark, setThemeId]);

  // Inject CSS variables onto document.documentElement
  useEffect(() => {
    const root = document.documentElement;
    const vars = theme.variables;

    root.setAttribute('data-theme', theme.id);
    if (theme.isDark) {
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
    } else {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme');
    }

    // Palette variables
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

    // Contrast text on primary button
    const contrastOnPrimary = getContrastColor(vars['--accent-primary'] || customColors.primary);
    root.style.setProperty('--accent-contrast-text', contrastOnPrimary);
  }, [theme, typography, borderRadius, baseZoom, customColors]);

  const allThemes = useMemo(() => {
    const presets = Object.values(THEMES_CONFIG);
    const customOption = {
      id: 'custom',
      name: 'Sur-Mesure',
      description: 'Studio de design personnalisé en direct',
      isDark: getLuminance(customColors.bg) < 0.5,
      previewColors: [customColors.bg, customColors.card || '#FFFFFF', customColors.primary, customColors.text],
    };
    return [...presets, customOption];
  }, [customColors]);

  const value = useMemo(() => ({
    themeId,
    theme,
    isDark: theme.isDark,
    setThemeId,
    toggleTheme,
    customColors,
    setCustomColors,
    typography,
    setTypography,
    borderRadius,
    setBorderRadius,
    baseZoom,
    setBaseZoom,
    brandColor,
    applyBrandColor,
    resetDesignStudio,
    allThemes,
    typographyOptions: TYPOGRAPHY_OPTIONS,
  }), [
    themeId,
    theme,
    setThemeId,
    toggleTheme,
    customColors,
    setCustomColors,
    typography,
    setTypography,
    borderRadius,
    setBorderRadius,
    baseZoom,
    setBaseZoom,
    brandColor,
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
