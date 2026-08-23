import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

// Helpers to compute brightness & blends for custom theme derivation
function hexToRgb(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r, g, b) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [clamp(r), clamp(g), clamp(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

function adjustBrightness(hex, percent) {
  try {
    const { r, g, b } = hexToRgb(hex);
    const amount = (percent / 100) * 255;
    return rgbToHex(r + amount, g + amount, b + amount);
  } catch (e) {
    return hex;
  }
}

function getLuminance(hex) {
  try {
    const { r, g, b } = hexToRgb(hex);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  } catch (e) {
    return 0.5;
  }
}

export function generateCustomThemeVariables(primary = '#B98B73', bg = '#FAF7F2', text = '#3F4238') {
  const isDark = getLuminance(bg) < 0.5;

  const bgCard = isDark ? adjustBrightness(bg, 8) : '#FFFFFF';
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
  const glassBg = `rgba(${br}, ${bgCol}, ${bb}, 0.88)`;

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
    '--call-bg': isDark ? adjustBrightness(bg, -5) : '#1E1B18',
    '--call-card': isDark ? bgCard : '#2B2622',
    '--call-button-bg': isDark ? bgSubtle : 'rgba(255,255,255,0.12)',
  };
}

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
      '--bg-glass': 'rgba(250, 247, 242, 0.90)',
      '--text-main': '#3F4238',
      '--text-secondary': '#6B705C',
      '--text-muted': '#A5A58D',
      '--border-color': '#D4C7B0',
      '--border-dark': '#A5A58D',
      '--accent-primary': '#B98B73',
      '--accent-primary-hover': '#A87A63',
      '--accent-secondary': '#CB997E',
      '--accent-terracotta': '#C29279',
      '--accent-success': '#7A8F6A',
      '--accent-danger': '#C25E5E',
      '--accent-warning': '#D97706',
      '--shadow-card': '0 10px 30px rgba(63, 66, 56, 0.08)',
      '--shadow-accent': '0 8px 24px rgba(185, 139, 115, 0.35)',
      '--shadow-modal': '0 24px 60px rgba(63, 66, 56, 0.18)',
      '--glass-bg': 'rgba(250, 247, 242, 0.90)',
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
      '--bg-glass': 'rgba(28, 28, 31, 0.92)',
      '--text-main': '#F5F5F7',
      '--text-secondary': '#A1A1A6',
      '--text-muted': '#636366',
      '--border-color': 'rgba(245, 245, 247, 0.12)',
      '--border-dark': 'rgba(245, 245, 247, 0.25)',
      '--accent-primary': '#A89F91',
      '--accent-primary-hover': '#BCB4A8',
      '--accent-secondary': '#C9C2B7',
      '--accent-terracotta': '#8E8E93',
      '--accent-success': '#4ADE80',
      '--accent-danger': '#F87171',
      '--accent-warning': '#FBBF24',
      '--shadow-card': '0 12px 36px rgba(0, 0, 0, 0.65)',
      '--shadow-accent': '0 8px 24px rgba(168, 159, 145, 0.35)',
      '--shadow-modal': '0 24px 70px rgba(0, 0, 0, 0.85)',
      '--glass-bg': 'rgba(28, 28, 31, 0.92)',
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
      '--bg-glass': 'rgba(255, 255, 255, 0.94)',
      '--text-main': '#000000',
      '--text-secondary': '#404040',
      '--text-muted': '#737373',
      '--border-color': '#E0E0E0',
      '--border-dark': '#000000',
      '--accent-primary': '#000000',
      '--accent-primary-hover': '#262626',
      '--accent-secondary': '#525252',
      '--accent-terracotta': '#171717',
      '--accent-success': '#16A34A',
      '--accent-danger': '#DC2626',
      '--accent-warning': '#CA8A04',
      '--shadow-card': '0 8px 24px rgba(0, 0, 0, 0.06)',
      '--shadow-accent': '0 8px 24px rgba(0, 0, 0, 0.25)',
      '--shadow-modal': '0 20px 50px rgba(0, 0, 0, 0.12)',
      '--glass-bg': 'rgba(255, 255, 255, 0.94)',
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
    description: 'Blanc rosé, rose poudré délicat, textes prune & marron',
    isDark: false,
    previewColors: ['#FFF9FA', '#FFFFFF', '#D49A9A', '#5C434A'],
    variables: {
      '--bg-global': '#FFF9FA',
      '--bg-card': '#FFFFFF',
      '--bg-subtle': '#FDF0F3',
      '--bg-elevated': '#FAEAEE',
      '--bg-pill': '#F5D7DF',
      '--bg-glass': 'rgba(255, 249, 250, 0.92)',
      '--text-main': '#5C434A',
      '--text-secondary': '#8E6D76',
      '--text-muted': '#B599A1',
      '--border-color': '#F2D5DC',
      '--border-dark': '#D49A9A',
      '--accent-primary': '#D49A9A',
      '--accent-primary-hover': '#C68686',
      '--accent-secondary': '#E5B3BB',
      '--accent-terracotta': '#BA707B',
      '--accent-success': '#88A77E',
      '--accent-danger': '#C95D63',
      '--accent-warning': '#D4A359',
      '--shadow-card': '0 10px 30px rgba(92, 67, 74, 0.08)',
      '--shadow-accent': '0 8px 24px rgba(212, 154, 154, 0.35)',
      '--shadow-modal': '0 24px 60px rgba(92, 67, 74, 0.16)',
      '--glass-bg': 'rgba(255, 249, 250, 0.92)',
      '--glass-border': 'rgba(242, 213, 220, 0.7)',
      '--overlay-bg': 'rgba(92, 67, 74, 0.6)',
      '--call-bg': '#2E2226',
      '--call-card': '#3F3035',
      '--call-button-bg': 'rgba(255, 249, 250, 0.14)',
    }
  }
};

const DEFAULT_CUSTOM_COLORS = {
  primary: '#B98B73',
  bg: '#FAF7F2',
  text: '#3F4238',
};

const ThemeContext = createContext({
  themeId: 'earthy',
  theme: THEMES_CONFIG.earthy,
  isDark: false,
  setThemeId: () => {},
  toggleTheme: () => {},
  customColors: DEFAULT_CUSTOM_COLORS,
  setCustomColors: () => {},
  allThemes: Object.values(THEMES_CONFIG),
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

  const theme = useMemo(() => {
    if (themeId === 'custom') {
      const generatedVars = generateCustomThemeVariables(
        customColors.primary,
        customColors.bg,
        customColors.text
      );
      const isDark = getLuminance(customColors.bg) < 0.5;
      return {
        id: 'custom',
        name: 'Sur-Mesure (Custom)',
        description: 'Thème personnalisé selon vos propres couleurs',
        isDark,
        previewColors: [customColors.bg, customColors.primary, customColors.text, customColors.primary],
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

    Object.entries(vars).forEach(([prop, val]) => {
      root.style.setProperty(prop, val);
    });
  }, [theme]);

  const allThemes = useMemo(() => {
    const presets = Object.values(THEMES_CONFIG);
    const customOption = {
      id: 'custom',
      name: 'Sur-Mesure',
      description: 'Personnalisez vos 3 couleurs en direct',
      isDark: getLuminance(customColors.bg) < 0.5,
      previewColors: [customColors.bg, customColors.primary, customColors.text, customColors.primary],
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
    allThemes,
  }), [themeId, theme, setThemeId, toggleTheme, customColors, setCustomColors, allThemes]);

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

