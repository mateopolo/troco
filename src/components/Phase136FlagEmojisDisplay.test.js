import fs from 'fs';
import path from 'path';
import {
  getFlagEmoji,
  countryCodeToFlagEmoji,
  isoToRegionalIndicator,
  getLanguageFlag,
} from '../utils/flagUtils';

describe('Phase 136: Flag Emojis Display (Regional Indicator Symbols)', () => {
  const authScreenPath = path.join(__dirname, '../features/auth/AuthScreen.jsx');
  const authScreenContent = fs.readFileSync(authScreenPath, 'utf-8');

  const profileFeaturePath = path.join(__dirname, '../features/profile/ProfileFeature.jsx');
  const profileFeatureContent = fs.readFileSync(profileFeaturePath, 'utf-8');

  const profileViewPath = path.join(__dirname, 'ProfileView.jsx');
  const profileViewContent = fs.readFileSync(profileViewPath, 'utf-8');

  const publicProfileModalPath = path.join(__dirname, 'PublicProfileModal.jsx');
  const publicProfileModalContent = fs.readFileSync(publicProfileModalPath, 'utf-8');

  const appHeaderPath = path.join(__dirname, 'layout/AppHeader.jsx');
  const appHeaderContent = fs.readFileSync(appHeaderPath, 'utf-8');

  const filterDrawerPath = path.join(__dirname, 'modals/FilterDrawer.jsx');
  const filterDrawerContent = fs.readFileSync(filterDrawerPath, 'utf-8');

  test('1. flagUtils accurately converts ISO codes to Unicode Regional Indicator Symbols', () => {
    // Exact requirement from Prompt 4: FR -> 🇫🇷, GB -> 🇬🇧, EN -> 🇬🇧
    expect(countryCodeToFlagEmoji('FR')).toBe('🇫🇷');
    expect(countryCodeToFlagEmoji('GB')).toBe('🇬🇧');
    expect(getFlagEmoji('FR')).toBe('🇫🇷');
    expect(getFlagEmoji('GB')).toBe('🇬🇧');
    expect(getFlagEmoji('EN')).toBe('🇬🇧');

    // Code points verification for 🇫🇷 (0x1F1EB, 0x1F1F7) and 🇬🇧 (0x1F1EC, 0x1F1E7)
    const frPoints = [...getFlagEmoji('FR')].map(c => c.codePointAt(0));
    expect(frPoints).toEqual([0x1F1EB, 0x1F1F7]);

    const gbPoints = [...getFlagEmoji('GB')].map(c => c.codePointAt(0));
    expect(gbPoints).toEqual([0x1F1EC, 0x1F1E7]);
  });

  test('2. AuthScreen.jsx uses getFlagEmoji in Langues Parlées section', () => {
    expect(authScreenContent).toContain("import { getFlagEmoji } from '../../utils/flagUtils';");
    expect(authScreenContent).toContain('{getFlagEmoji(lang)}');
    // Ensure raw text {lang} inside button is replaced
    expect(authScreenContent).not.toMatch(/<button[^>]*>\s*\{lang\}\s*<\/button>/);
  });

  test('3. ProfileFeature.jsx uses getFlagEmoji for spoken languages', () => {
    expect(profileFeatureContent).toContain("import { getFlagEmoji } from '../../utils/flagUtils';");
    expect(profileFeatureContent).toContain('{getFlagEmoji(code)}');
    expect(profileFeatureContent).not.toContain("{ code: 'FR', label: '🇫🇷' }");
  });

  test('4. ProfileView.jsx uses getFlagEmoji for language display', () => {
    expect(profileViewContent).toContain("import { getFlagEmoji } from '../utils/flagUtils';");
    expect(profileViewContent).toContain('<span>{getFlagEmoji(lang)}</span>');
    expect(profileViewContent).not.toContain('LANG_FLAG_EMOJI');
  });

  test('5. PublicProfileModal.jsx renders spoken languages with getFlagEmoji', () => {
    expect(publicProfileModalContent).toContain("import { getFlagEmoji } from '../utils/flagUtils';");
    expect(publicProfileModalContent).toContain('{getFlagEmoji(lang)}');
  });

  test('6. AppHeader.jsx and FilterDrawer.jsx leverage getFlagEmoji for flag emojis', () => {
    expect(appHeaderContent).toContain("import { getFlagEmoji } from '../../utils/flagUtils';");
    expect(appHeaderContent).toContain('{getFlagEmoji(currentLang)}');

    expect(filterDrawerContent).toContain("import { getFlagEmoji } from '../../utils/flagUtils';");
    expect(filterDrawerContent).toContain('{getFlagEmoji(code)}');
  });
});
