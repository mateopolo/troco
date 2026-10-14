import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { translations } from '../data/translationsData';

export const LanguageContext = createContext(null);

export const SUPPORTED_LANGUAGES = ['FR', 'EN', 'ES', 'IT', 'DE', 'JA', 'ZH', 'DE-DE', 'DE-de', 'PT', 'NL'];

export function normalizeLanguageCode(code) {
  if (!code || typeof code !== 'string') return 'FR';
  const clean = code.trim();
  const upper = clean.toUpperCase();
  if (['DE-DE', 'DE-DE', 'DE-de', 'de-de', 'de-DE', 'DE'].includes(clean) || upper.startsWith('DE')) return 'DE';
  if (['FR-FR', 'fr-fr', 'FR'].includes(clean) || upper.startsWith('FR')) return 'FR';
  if (['EN-US', 'EN-GB', 'en-us', 'en-gb', 'EN'].includes(clean) || upper.startsWith('EN')) return 'EN';
  if (['ES-ES', 'es-es', 'ES'].includes(clean) || upper.startsWith('ES')) return 'ES';
  if (['IT-IT', 'it-it', 'IT'].includes(clean) || upper.startsWith('IT')) return 'IT';
  if (['JA-JP', 'ja-jp', 'JA', 'JP'].includes(clean) || upper.startsWith('JA')) return 'JA';
  if (['ZH-CN', 'zh-cn', 'ZH', 'CN'].includes(clean) || upper.startsWith('ZH')) return 'ZH';
  const prefix = upper.split(/[-_]/)[0];
  if (SUPPORTED_LANGUAGES.includes(prefix)) return prefix;
  if (SUPPORTED_LANGUAGES.includes(upper)) return upper;
  return 'FR';
}

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
    if (initialLang) return normalizeLanguageCode(initialLang);
    try {
      const stored = localStorage.getItem('troco_language') || localStorage.getItem('troco_lang');
      return stored ? normalizeLanguageCode(stored) : 'FR';
    } catch (_) {
      return 'FR';
    }
  });

  const setLang = useCallback((langCode) => {
    if (!langCode || typeof langCode !== 'string') return;
    const normalized = normalizeLanguageCode(langCode);
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

  const t = useCallback((key, paramsOrDefault) => {
    let str = translations?.[currentLang]?.[key] || translations?.['FR']?.[key];
    if (!str) {
      if (typeof paramsOrDefault === 'string') return paramsOrDefault;
      return key;
    }
    if (paramsOrDefault && typeof paramsOrDefault === 'object') {
      Object.keys(paramsOrDefault).forEach((k) => {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(paramsOrDefault[k]));
      });
    }
    return str;
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

  useEffect(() => {
    const handleLanguageChange = (e) => {
      const detailLang = e?.detail?.lang;
      if (detailLang) {
        const normalized = normalizeLanguageCode(detailLang);
        setCurrentLangState((prev) => (prev !== normalized ? normalized : prev));
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('languagechange', handleLanguageChange);
      return () => window.removeEventListener('languagechange', handleLanguageChange);
    }
  }, []);

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
