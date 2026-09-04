import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { translations } from '../data/translationsData';

export const LanguageContext = createContext(null);

export const SUPPORTED_LANGUAGES = ['FR', 'EN', 'ES', 'IT', 'DE', 'JA', 'ZH'];

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Safe fallback if used outside Provider
    return {
      currentLang: 'FR',
      setCurrentLang: () => {},
      setLang: () => {},
      changeLanguage: () => {},
      t: (key) => translations?.['FR']?.[key] || key,
      i18n: {
        language: 'FR',
        changeLanguage: () => {}
      }
    };
  }
  return context;
}

export function LanguageProvider({ children, initialLang = null }) {
  const [currentLang, setCurrentLangState] = useState(() => {
    if (initialLang) return initialLang.toUpperCase();
    try {
      const stored = localStorage.getItem('troco_language') || localStorage.getItem('troco_lang');
      return stored && SUPPORTED_LANGUAGES.includes(stored.toUpperCase()) ? stored.toUpperCase() : 'FR';
    } catch (_) {
      return 'FR';
    }
  });

  const setLang = useCallback((langCode) => {
    if (!langCode || typeof langCode !== 'string') return;
    const normalized = langCode.toUpperCase();
    setCurrentLangState(normalized);
    try {
      localStorage.setItem('troco_language', normalized);
      localStorage.setItem('troco_lang', normalized);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = normalized.toLowerCase();
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('languagechange', { detail: { lang: normalized } }));
      }
    } catch (_) {}
  }, []);

  const changeLanguage = useCallback((langCode) => {
    setLang(langCode);
  }, [setLang]);

  const t = useCallback((key) => {
    return translations?.[currentLang]?.[key] || translations?.['FR']?.[key] || key;
  }, [currentLang]);

  const i18n = useMemo(() => ({
    language: currentLang,
    changeLanguage: setLang,
    t
  }), [currentLang, setLang, t]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = currentLang.toLowerCase();
    }
  }, [currentLang]);

  const value = useMemo(() => ({
    currentLang,
    setCurrentLang: setLang,
    setLang,
    changeLanguage,
    t,
    i18n
  }), [currentLang, setLang, changeLanguage, t, i18n]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export default LanguageContext;
