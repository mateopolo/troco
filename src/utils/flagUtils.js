/**
 * flagUtils.js
 * Utilitaires pour la conversion dynamique des codes ISO pays / langues
 * en Unicode Regional Indicator Symbols (Drapeaux Emojis natifs).
 *
 * En Unicode, chaque lettre A-Z (ASCII 65-90) correspond à un symbole indicateur régional :
 * 'A' -> U+1F1E6 (127462)
 * ...
 * 'Z' -> U+1F1FF (127487)
 * Deux symboles combinés forment le drapeau officiel du territoire selon la norme ISO 3166-1 alpha-2.
 */

// Table de correspondance des codes de langue ISO 639-1 vers les codes pays ISO 3166-1 alpha-2
export const LANG_TO_COUNTRY_CODE = {
  EN: 'GB', // Anglais -> Drapeau Royaume-Uni 🇬🇧
  JA: 'JP', // Japonais -> Japon 🇯🇵
  ZH: 'CN', // Chinois -> Chine 🇨🇳
  KO: 'KR', // Coréen -> Corée du Sud 🇰🇷
  AR: 'SA', // Arabe -> Arabie Saoudite 🇸🇦
  SV: 'SE', // Suédois -> Suède 🇸🇪
  DA: 'DK', // Danois -> Danemark 🇩🇰
  EL: 'GR', // Grec -> Grèce 🇬🇷
  CS: 'CZ', // Tchèque -> République Tchèque 🇨🇿
  FA: 'IR', // Persan -> Iran 🇮🇷
  HE: 'IL', // Hébreu -> Israël 🇮🇱
  HI: 'IN', // Hindi -> Inde 🇮🇳
  UK: 'UA', // Ukrainien -> Ukraine 🇺🇦
  VI: 'VN', // Vietnamien -> Vietnam 🇻🇳
  NB: 'NO', // Norvégien Bokmål -> Norvège 🇳🇴
  NN: 'NO', // Norvégien Nynorsk -> Norvège 🇳🇴
  ET: 'EE', // Estonien -> Estonie 🇪🇪
  SL: 'SI', // Slovène -> Slovénie 🇸🇮
  SQ: 'AL', // Albanais -> Albanie 🇦🇱
  HY: 'AM', // Arménien -> Arménie 🇦🇲
  KA: 'GE', // Géorgien -> Géorgie 🇬🇪
  BE: 'BY', // Biélorusse -> Biélorussie 🇧🇾
  KK: 'KZ', // Kazakh -> Kazakhstan 🇰🇿
  AZ: 'AZ', // Azéri -> Azerbaïdjan 🇦🇿
  MS: 'MY', // Malais -> Malaisie 🇲🇾
  ID: 'ID', // Indonésien -> Indonésie 🇮🇩
  TH: 'TH', // Thaï -> Thaïlande 🇹🇭
  TL: 'PH', // Tagalog -> Philippines 🇵🇭
  FIL: 'PH', // Filipino -> Philippines 🇵🇭
  BN: 'BD', // Bengali -> Bangladesh 🇧🇩
  UR: 'PK', // Ourdou -> Pakistan 🇵🇰
  SW: 'KE', // Swahili -> Kenya 🇰🇪
  AF: 'ZA', // Afrikaans -> Afrique du Sud 🇿🇦
  // Langues identiques à leur code pays ISO principal
  FR: 'FR',
  GB: 'GB',
  US: 'US',
  ES: 'ES',
  IT: 'IT',
  DE: 'DE',
  PT: 'PT',
  RU: 'RU',
  NL: 'NL',
  PL: 'PL',
  TR: 'TR',
  RO: 'RO',
  HU: 'HU',
  FI: 'FI',
  BG: 'BG',
  HR: 'HR',
  SK: 'SK',
  LT: 'LT',
  LV: 'LV',
  IS: 'IS',
  IE: 'IE',
  NO: 'NO',
  SE: 'SE',
  CA: 'CA',
  AU: 'AU',
  BR: 'BR',
  MX: 'MX',
  CH: 'CH',
  AT: 'AT',
};

// Base Unicode pour le Regional Indicator Symbol Letter A
const REGIONAL_INDICATOR_A = 0x1F1E6; // 127462

/**
 * Convertit un code pays ISO 3166-1 alpha-2 (ex: "FR", "GB", "ES")
 * en séquence Unicode de symboles régionaux (drapeau emoji).
 *
 * @param {string} countryCode Code pays à 2 lettres (ex: "FR", "GB")
 * @returns {string} Emoji drapeau correspondant (ex: "🇫🇷", "🇬🇧")
 */
export function countryCodeToFlagEmoji(countryCode) {
  if (!countryCode || typeof countryCode !== 'string') return '';
  const clean = countryCode.trim().toUpperCase();
  if (clean.length !== 2 || !/^[A-Z]{2}$/.test(clean)) return '';

  const firstChar = REGIONAL_INDICATOR_A + (clean.charCodeAt(0) - 65);
  const secondChar = REGIONAL_INDICATOR_A + (clean.charCodeAt(1) - 65);

  return String.fromCodePoint(firstChar, secondChar);
}

/**
 * Convertit n'importe quel code langue ou pays ISO en emoji drapeau officiel.
 * Gère les codes 2 lettres ISO-639-1 (EN -> 🇬🇧, JA -> 🇯🇵), les codes ISO-3166-1 (FR -> 🇫🇷, GB -> 🇬🇧),
 * et préserve les emojis déjà formés.
 *
 * @param {string} code Code de langue ou de pays (ex: 'FR', 'GB', 'EN', 'ES', 'JA')
 * @param {string} fallback Valeur de secours si le code est invalide (défaut '🌐')
 * @returns {string} Le drapeau emoji correspondant
 */
export function getFlagEmoji(code, fallback = '🌐') {
  if (!code || typeof code !== 'string') return fallback;

  const trimmed = code.trim();
  if (!trimmed) return fallback;

  // Si c'est déjà un emoji ou symbole non-ASCII valide, on le renvoie tel quel
  if ([...trimmed].some((char) => (char.codePointAt(0) || 0) > 127)) {
    return trimmed;
  }


  const upper = trimmed.toUpperCase();

  // Résolution du code pays cible à partir du code langue ou pays
  const targetCountry = LANG_TO_COUNTRY_CODE[upper] || (upper.length === 2 && /^[A-Z]{2}$/.test(upper) ? upper : null);

  if (targetCountry) {
    const flag = countryCodeToFlagEmoji(targetCountry);
    if (flag) return flag;
  }

  return fallback;
}

/**
 * Alias de compatibilité
 */
export const isoToRegionalIndicator = getFlagEmoji;
export const getLanguageFlag = getFlagEmoji;

/**
 * Retourne le nom natif d'une langue courante
 */
export function getLanguageNativeName(code) {
  const map = {
    FR: 'Français',
    EN: 'English',
    GB: 'English (UK)',
    US: 'English (US)',
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
}

export default getFlagEmoji;
