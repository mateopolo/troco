import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

export const THEMES_CONFIG = {
  earthy: {
    id: 'earthy',
    name: 'Earthy Pastel',
    description: 'Tonalités douces, lin, sable et terracotta',
    isDark: false,
    previewColors: ['#FAF7F2', '#DDBEA9', '#B98B73', '#3F4238'],
    variables: {
      '--bg-global': '#FAF7F2',
      '--bg-card': '#FFFFFF',
      '--bg-subtle': '#F5F0E8',
      '--bg-elevated': '#EFE8DE',
      '--bg-pill': '#DDBEA9',
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
      '--accent-danger': '#2A1A14',
      '--accent-warning': '#D97706',
      '--shadow-card': '0 10px 30px rgba(63, 66, 56, 0.08)',
      '--shadow-accent': '0 8px 24px rgba(185, 139, 115, 0.35)',
      '--glass-bg': 'rgba(250, 247, 242, 0.88)',
      '--glass-border': 'rgba(212, 199, 176, 0.45)',
      '--overlay-bg': 'rgba(63, 66, 56, 0.55)',
    }
  },
  dark: {
    id: 'dark',
    name: 'Dark Titanium',
    description: 'Graphite profond, contrastes saisissants',
    isDark: true,
    previewColors: ['#141210', '#24201D', '#B98B73', '#FAF7F2'],
    variables: {
      '--bg-global': '#141210',
      '--bg-card': '#201D1A',
      '--bg-subtle': '#181614',
      '--bg-elevated': '#2B2724',
      '--bg-pill': '#38332E',
      '--text-main': '#FAF7F2',
      '--text-secondary': '#D4C5B5',
      '--text-muted': '#9A8E84',
      '--border-color': 'rgba(232, 221, 211, 0.16)',
      '--border-dark': 'rgba(232, 221, 211, 0.32)',
      '--accent-primary': '#C29279',
      '--accent-primary-hover': '#B98B73',
      '--accent-secondary': '#CB997E',
      '--accent-terracotta': '#C29279',
      '--accent-success': '#9CAF88',
      '--accent-danger': '#38251D',
      '--accent-warning': '#F59E0B',
      '--shadow-card': '0 12px 36px rgba(0, 0, 0, 0.55)',
      '--shadow-accent': '0 8px 24px rgba(194, 146, 121, 0.35)',
      '--glass-bg': 'rgba(20, 18, 16, 0.88)',
      '--glass-border': 'rgba(232, 221, 211, 0.15)',
      '--overlay-bg': 'rgba(0, 0, 0, 0.75)',
    }
  },
  monochrome: {
    id: 'monochrome',
    name: 'Minimalist Mono',
    description: 'Noir, blanc pur et nuances minérales',
    isDark: false,
    previewColors: ['#F9FAFB', '#FFFFFF', '#111827', '#4B5563'],
    variables: {
      '--bg-global': '#F9FAFB',
      '--bg-card': '#FFFFFF',
      '--bg-subtle': '#F3F4F6',
      '--bg-elevated': '#E5E7EB',
      '--bg-pill': '#E5E7EB',
      '--text-main': '#111827',
      '--text-secondary': '#4B5563',
      '--text-muted': '#9CA3AF',
      '--border-color': '#E5E7EB',
      '--border-dark': '#9CA3AF',
      '--accent-primary': '#111827',
      '--accent-primary-hover': '#000000',
      '--accent-secondary': '#374151',
      '--accent-terracotta': '#1F2937',
      '--accent-success': '#059669',
      '--accent-danger': '#1F2937',
      '--accent-warning': '#D97706',
      '--shadow-card': '0 8px 28px rgba(0, 0, 0, 0.07)',
      '--shadow-accent': '0 8px 24px rgba(17, 24, 39, 0.25)',
      '--glass-bg': 'rgba(255, 255, 255, 0.92)',
      '--glass-border': 'rgba(229, 231, 235, 0.8)',
      '--overlay-bg': 'rgba(17, 24, 39, 0.65)',
    }
  },
  sakura: {
    id: 'sakura',
    name: 'Soft Sakura',
    description: 'Fleurs de cerisier, rose poudré et douceur',
    isDark: false,
    previewColors: ['#FAF5F6', '#FFEAEF', '#D48194', '#4A353B'],
    variables: {
      '--bg-global': '#FAF5F6',
      '--bg-card': '#FFFFFF',
      '--bg-subtle': '#FFF0F3',
      '--bg-elevated': '#FFE0E6',
      '--bg-pill': '#FCD5DC',
      '--text-main': '#4A353B',
      '--text-secondary': '#7D5A64',
      '--text-muted': '#AD8C95',
      '--border-color': '#F2CDD4',
      '--border-dark': '#D48194',
      '--accent-primary': '#D48194',
      '--accent-primary-hover': '#BE6C80',
      '--accent-secondary': '#E59FB0',
      '--accent-terracotta': '#C87285',
      '--accent-success': '#7A9E7E',
      '--accent-danger': '#3D252C',
      '--accent-warning': '#D97706',
      '--shadow-card': '0 10px 30px rgba(74, 53, 59, 0.08)',
      '--shadow-accent': '0 8px 24px rgba(212, 129, 148, 0.35)',
      '--glass-bg': 'rgba(250, 245, 246, 0.90)',
      '--glass-border': 'rgba(242, 205, 212, 0.6)',
      '--overlay-bg': 'rgba(74, 53, 59, 0.6)',
    }
  }
};

const ThemeContext = createContext({
  themeId: 'earthy',
  theme: THEMES_CONFIG.earthy,
  isDark: false,
  setThemeId: () => {},
  toggleTheme: () => {},
  allThemes: Object.values(THEMES_CONFIG),
});

export function ThemeProvider({ children }) {
  const [themeId, setThemeIdState] = useState(() => {
    try {
      const saved = localStorage.getItem('troco_theme');
      if (saved && THEMES_CONFIG[saved]) return saved;
    } catch (e) {
      console.warn('Could not read theme from localStorage', e);
    }
    return 'earthy';
  });

  const theme = useMemo(() => THEMES_CONFIG[themeId] || THEMES_CONFIG.earthy, [themeId]);

  const setThemeId = (newId) => {
    if (!THEMES_CONFIG[newId]) return;
    setThemeIdState(newId);
    try {
      localStorage.setItem('troco_theme', newId);
    } catch (e) {
      console.warn('Could not persist theme to localStorage', e);
    }
  };

  const toggleTheme = useCallback(() => {
    // Quick toggle between earthy and dark
    const nextId = theme.isDark ? 'earthy' : 'dark';
    setThemeId(nextId);
  }, [theme.isDark]);

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

  const value = useMemo(() => ({
    themeId,
    theme,
    isDark: theme.isDark,
    setThemeId,
    toggleTheme,
    allThemes: Object.values(THEMES_CONFIG),
  }), [themeId, theme, toggleTheme]);

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
