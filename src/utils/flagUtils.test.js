import {
  getFlagEmoji,
  countryCodeToFlagEmoji,
  isoToRegionalIndicator,
  getLanguageFlag,
  LANG_TO_COUNTRY_CODE,
} from './flagUtils';

describe('flagUtils - ISO to Unicode Regional Indicator Symbols', () => {
  test('1. Converts standard ISO-3166-1 alpha-2 country codes to Unicode flag emojis', () => {
    expect(countryCodeToFlagEmoji('FR')).toBe('🇫🇷');
    expect(countryCodeToFlagEmoji('GB')).toBe('🇬🇧');
    expect(countryCodeToFlagEmoji('US')).toBe('🇺🇸');
    expect(countryCodeToFlagEmoji('ES')).toBe('🇪🇸');
    expect(countryCodeToFlagEmoji('IT')).toBe('🇮🇹');
    expect(countryCodeToFlagEmoji('DE')).toBe('🇩🇪');
    expect(countryCodeToFlagEmoji('JP')).toBe('🇯🇵');
    expect(countryCodeToFlagEmoji('CN')).toBe('🇨🇳');
  });

  test('2. Encodes with exact Unicode Regional Indicator Symbol code points (U+1F1E6 - U+1F1FF)', () => {
    // 🇫: 0x1F1EB (127467), 🇷: 0x1F1F7 (127479)
    const frFlag = countryCodeToFlagEmoji('FR');
    const codePoints = [...frFlag].map((c) => c.codePointAt(0));
    expect(codePoints).toEqual([0x1F1EB, 0x1F1F7]);

    // 🇬: 0x1F1EC (127468), 🇧: 0x1F1E7 (127463)
    const gbFlag = countryCodeToFlagEmoji('GB');
    const gbPoints = [...gbFlag].map((c) => c.codePointAt(0));
    expect(gbPoints).toEqual([0x1F1EC, 0x1F1E7]);
  });

  test('3. getFlagEmoji resolves language codes (ISO-639-1) to appropriate national flag emojis', () => {
    // Spoken languages section requested in Prompt 4: FR -> 🇫🇷, EN/GB -> 🇬🇧
    expect(getFlagEmoji('FR')).toBe('🇫🇷');
    expect(getFlagEmoji('GB')).toBe('🇬🇧');
    expect(getFlagEmoji('EN')).toBe('🇬🇧');
    expect(getFlagEmoji('ES')).toBe('🇪🇸');
    expect(getFlagEmoji('IT')).toBe('🇮🇹');
    expect(getFlagEmoji('DE')).toBe('🇩🇪');
    expect(getFlagEmoji('JA')).toBe('🇯🇵');
    expect(getFlagEmoji('ZH')).toBe('🇨🇳');
    expect(getFlagEmoji('KO')).toBe('🇰🇷');
    expect(getFlagEmoji('AR')).toBe('🇸🇦');
    expect(getFlagEmoji('PT')).toBe('🇵🇹');
    expect(getFlagEmoji('RU')).toBe('🇷🇺');
    expect(getFlagEmoji('NL')).toBe('🇳🇱');
  });

  test('4. Handles lowercase and surrounding whitespace smoothly', () => {
    expect(getFlagEmoji('fr')).toBe('🇫🇷');
    expect(getFlagEmoji(' gb ')).toBe('🇬🇧');
    expect(getFlagEmoji('en')).toBe('🇬🇧');
    expect(getFlagEmoji('  es ')).toBe('🇪🇸');
  });

  test('5. Preserves already formed emoji flags and symbols', () => {
    expect(getFlagEmoji('🇫🇷')).toBe('🇫🇷');
    expect(getFlagEmoji('🇬🇧')).toBe('🇬🇧');
    expect(getFlagEmoji('🌐')).toBe('🌐');
  });

  test('6. Returns fallback for invalid or empty inputs', () => {
    expect(getFlagEmoji(null)).toBe('🌐');
    expect(getFlagEmoji(undefined)).toBe('🌐');
    expect(getFlagEmoji('')).toBe('🌐');
    expect(getFlagEmoji('UNKNOWN_CODE', '🏳️')).toBe('🏳️');
  });

  test('7. Aliases isoToRegionalIndicator and getLanguageFlag work identically', () => {
    expect(isoToRegionalIndicator('FR')).toBe('🇫🇷');
    expect(isoToRegionalIndicator('GB')).toBe('🇬🇧');
    expect(getLanguageFlag('EN')).toBe('🇬🇧');
  });
});
