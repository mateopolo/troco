import {
  getFlagEmoji,
  countryCodeToFlagEmoji,
  isoToRegionalIndicator,
  getLanguageNativeName as getNativeNameUtil,
  LANG_TO_COUNTRY_CODE,
} from './flagUtils';

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

export { getFlagEmoji, countryCodeToFlagEmoji, isoToRegionalIndicator, LANG_TO_COUNTRY_CODE };

export const getLanguageFlag = (code) => {
  return getFlagEmoji(code, '🌐');
};

export const getLanguageNativeName = (code) => {
  return getNativeNameUtil(code);
};

export default getFlagEmoji;

