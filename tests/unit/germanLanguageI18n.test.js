// @vitest-environment jsdom
import { describe, test, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LanguageProvider, useLanguage, SUPPORTED_LANGUAGES, normalizeLanguageCode } from '../../src/contexts/LanguageContext';
import { translations } from '../../src/data/translationsData';
import { translations as localeTranslations } from '../../src/locales/translations';

describe('German (DE) i18n and Fallback Tests [E2E-FAIL-12]', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('SUPPORTED_LANGUAGES includes DE and DE-de', () => {
    expect(SUPPORTED_LANGUAGES).toContain('DE');
    expect(SUPPORTED_LANGUAGES).toContain('DE-de');
  });

  test('normalizeLanguageCode handles DE, de, DE-de, de-de, de-DE', () => {
    expect(normalizeLanguageCode('DE')).toBe('DE');
    expect(normalizeLanguageCode('de')).toBe('DE');
    expect(normalizeLanguageCode('DE-de')).toBe('DE');
    expect(normalizeLanguageCode('de-de')).toBe('DE');
    expect(normalizeLanguageCode('de-DE')).toBe('DE');
  });

  test('German navigation keys in translationsData: explorer=Erkunden, messages=Nachrichten, profile=Profil', () => {
    expect(translations.DE).toBeDefined();
    expect(translations.DE.explorer).toBe('Erkunden');
    expect(translations.DE.explore).toBe('Erkunden');
    expect(translations.DE.messages).toBe('Nachrichten');
    expect(translations.DE.profile).toBe('Profil');
  });

  test('German navigation keys in locales/translations: explorer=Erkunden, messages=Nachrichten, profile=Profil', () => {
    expect(localeTranslations.DE).toBeDefined();
    expect(localeTranslations.DE.explorer).toBe('Erkunden');
    expect(localeTranslations.DE.explore).toBe('Erkunden');
    expect(localeTranslations.DE.messages).toBe('Nachrichten');
    expect(localeTranslations.DE.profile).toBe('Profil');
  });

  test('FR fallback: undefined keys in translations.DE fall back to translations.FR (not EN)', () => {
    const fallbackKey = 'test_fallback_key_' + Math.random().toString(36).substring(7);
    translations.FR[fallbackKey] = 'Texte en français uniquement';
    localeTranslations.FR[fallbackKey] = 'Texte en français uniquement';

    expect(translations.DE[fallbackKey]).toBe('Texte en français uniquement');
    expect(localeTranslations.DE[fallbackKey]).toBe('Texte en français uniquement');
  });

  test('LanguageProvider updates state, localStorage, document.documentElement.lang and dispatches languagechange event on DE switch', () => {
    const events = [];
    const onLangChange = (e) => events.push(e.detail?.lang);
    window.addEventListener('languagechange', onLangChange);

    function TestComp() {
      const { currentLang, setLang, t } = useLanguage();
      return (
        <div>
          <span data-testid="app-lang-indicator">{currentLang}</span>
          <span data-testid="tab-explorer">{t('explorer')}</span>
          <span data-testid="tab-messages">{t('messages')}</span>
          <span data-testid="tab-profile">{t('profile')}</span>
          <button data-testid="btn-de" onClick={() => setLang('DE')}>DE</button>
          <button data-testid="btn-de-de" onClick={() => setLang('de-de')}>DE-DE</button>
        </div>
      );
    }

    render(
      <LanguageProvider initialLang="FR">
        <TestComp />
      </LanguageProvider>
    );

    expect(screen.getByTestId('app-lang-indicator').textContent).toBe('FR');
    expect(screen.getByTestId('tab-explorer').textContent).toBe('Explorer');
    expect(screen.getByTestId('tab-messages').textContent).toBe('Messages');
    expect(screen.getByTestId('tab-profile').textContent).toBe('Profil');

    act(() => {
      fireEvent.click(screen.getByTestId('btn-de'));
    });

    expect(screen.getByTestId('app-lang-indicator').textContent).toBe('DE');
    expect(screen.getByTestId('tab-explorer').textContent).toBe('Erkunden');
    expect(screen.getByTestId('tab-messages').textContent).toBe('Nachrichten');
    expect(screen.getByTestId('tab-profile').textContent).toBe('Profil');
    expect(localStorage.getItem('troco_language')).toBe('DE');
    expect(document.documentElement.lang).toBe('de');
    expect(events).toContain('DE');

    act(() => {
      fireEvent.click(screen.getByTestId('btn-de-de'));
    });
    expect(screen.getByTestId('app-lang-indicator').textContent).toBe('DE');

    window.removeEventListener('languagechange', onLangChange);
  });
});
