/**
 * Utilitaires universels pour les emojis drapeaux natifs et les langues Troco
 */
export const LANGUAGE_FLAGS = {
  FR: '🇫🇷',
  EN: '🇬🇧',
  ES: '🇪🇸',
  IT: '🇮🇹',
  DE: '🇩🇪',
  PT: '🇵🇹',
  AR: '🇸🇦',
  ZH: '🇨🇳',
  JA: '🇯🇵',
  RU: '🇷🇺',
  NL: '🇳🇱',
  KO: '🇰🇷',
  PL: '🇵🇱',
  SV: '🇸🇪',
  TR: '🇹🇷',
  UK: '🇬🇧',
  GB: '🇬🇧',
  US: '🇺🇸',
};

export const getLanguageFlag = (code) => {
  if (!code || typeof code !== 'string') return '🌐';
  const cleanCode = code.toUpperCase().trim();
  return LANGUAGE_FLAGS[cleanCode] || '🌐';
};

export const getLanguageNativeName = (code) => {
  const map = {
    FR: 'Français',
    EN: 'English',
    ES: 'Español',
    IT: 'Italiano',
    DE: 'Deutsch',
    PT: 'Português',
    AR: 'العربية',
    ZH: '中文',
    JA: '日本語',
    RU: 'Русский',
    NL: 'Nederlands',
    KO: '한국어',
    PL: 'Polski',
    SV: 'Svenska',
    TR: 'Türkçe',
  };
  return map[code?.toUpperCase()?.trim()] || code;
};
