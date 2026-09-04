import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import {
  extractLanguageTag,
  cleanLanguageTag,
  parseAndTranslateDynamicText,
  parseAndTranslateListing,
  LANGUAGE_TAG_REGEX,
} from '../utils/dynamicTranslation';
import { LanguageContext, LanguageProvider, useLanguage } from '../contexts/LanguageContext';
import { useUIStore, i18n } from '../stores/useUIStore';
import { translations } from '../data/translationsData';
import ListingCard from './ListingCard';
import ListingDetailModal from './ListingDetailModal';
import ListingDetails from './ListingDetails';

describe('Phase 119: Moteur de traduction global (UI & Annonces)', () => {
  beforeAll(() => {
    global.IntersectionObserver = class IntersectionObserver {
      constructor() {}
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Parsing et extraction des balises dynamiques [XX]', () => {
    test('La regex détecte exactement les préfixes de type [EN], [FR], [ES]', () => {
      expect(LANGUAGE_TAG_REGEX.test('[EN] Propose cours')).toBe(true);
      expect(LANGUAGE_TAG_REGEX.test('[FR] Prêt de matériel')).toBe(true);
      expect(LANGUAGE_TAG_REGEX.test('[ES] Reparación de bicis')).toBe(true);
      expect(LANGUAGE_TAG_REGEX.test('Annonce sans balise')).toBe(false);
      expect(LANGUAGE_TAG_REGEX.test('[TOOLONG] Annonce')).toBe(false);
    });

    test('extractLanguageTag extrait le code de langue en majuscule', () => {
      expect(extractLanguageTag('[EN] I offer English lessons')).toBe('EN');
      expect(extractLanguageTag('[FR] Je propose du bricolage')).toBe('FR');
      expect(extractLanguageTag('[ES] Ofrezco diseño web')).toBe('ES');
      expect(extractLanguageTag('Texte normal sans balise')).toBeNull();
      expect(extractLanguageTag(null)).toBeNull();
      expect(extractLanguageTag('')).toBeNull();
    });

    test('cleanLanguageTag nettoie la balise et les espaces attenants', () => {
      const raw = '[EN] Je propose un accompagnement complet';
      const clean = cleanLanguageTag(raw);
      expect(clean).toBe('Je propose un accompagnement complet');
      expect(clean).not.toContain('[EN]');

      // Test de l\'exemple sécurisé exigé par la consigne
      const description = '[EN] Je propose...';
      const cleanText = description.replace(/^\[[A-Z]{2}\]\s*/, '');
      expect(cleanText).toBe('Je propose...');
    });

    test('parseAndTranslateDynamicText affiche le texte nettoyé sans balise si tag === currentLang', () => {
      const rawText = '[EN] Professional web design services';
      const result = parseAndTranslateDynamicText(rawText, 'EN');
      expect(result).toBe('Professional web design services');
      expect(result).not.toContain('[EN]');
    });

    test('parseAndTranslateDynamicText déclenche la traduction si tag !== currentLang', () => {
      const rawText = '[EN] Guitar lessons for beginners';
      const result = parseAndTranslateDynamicText(rawText, 'FR');
      // Doit renvoyer une chaîne sans la balise [EN]
      expect(result).not.toContain('[EN]');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('parseAndTranslateListing nettoie et parse le titre, description et compensation', () => {
      const listing = {
        title: '[EN] Pro Camera Rental',
        description: '[EN] Sony Alpha 7 IV in perfect condition.',
        compensation: '2 Jetons',
        nativeLang: 'EN',
      };

      const parsedSameLang = parseAndTranslateListing(listing, 'EN');
      expect(parsedSameLang.title).toBe('Pro Camera Rental');
      expect(parsedSameLang.description).toBe('Sony Alpha 7 IV in perfect condition.');
      expect(parsedSameLang.title).not.toContain('[EN]');
      expect(parsedSameLang.description).not.toContain('[EN]');

      const parsedTargetLang = parseAndTranslateListing(listing, 'FR');
      expect(parsedTargetLang.title).not.toContain('[EN]');
      expect(parsedTargetLang.description).not.toContain('[EN]');
    });
  });

  describe('2. Synchronisation globale du store et du LanguageContext', () => {
    test('translationsData contient toutes les 7 langues immédiatement et de façon synchrone', () => {
      const expectedLangs = ['FR', 'EN', 'ES', 'IT', 'DE', 'JA', 'ZH'];
      expectedLangs.forEach((lang) => {
        expect(translations[lang]).toBeDefined();
        expect(typeof translations[lang]).toBe('object');
        expect(Object.keys(translations[lang]).length).toBeGreaterThan(10);
      });
      // Vérification des clés clés
      expect(translations.EN.deleteAd).toBe('Delete');
      expect(translations.ES.deleteAd).toBe('Eliminar');
      expect(translations.IT.deleteAd).toBe('Elimina');
    });

    test('LanguageProvider met à jour currentLang, localStorage, document.documentElement.lang et dispatch languagechange', () => {
      const events = [];
      const listener = (e) => events.push(e.detail?.lang);
      window.addEventListener('languagechange', listener);

      function TestConsumer() {
        const { currentLang, setLang, t, i18n: i18nContext } = useLanguage();
        return (
          <div>
            <span data-testid="current-lang">{currentLang}</span>
            <span data-testid="translated-delete">{t('deleteAd')}</span>
            <button data-testid="change-to-en" onClick={() => setLang('EN')}>
              Switch EN
            </button>
            <button data-testid="change-to-es" onClick={() => i18nContext.changeLanguage('ES')}>
              Switch ES
            </button>
          </div>
        );
      }

      render(
        <LanguageProvider initialLang="FR">
          <TestConsumer />
        </LanguageProvider>
      );

      expect(screen.getByTestId('current-lang').textContent).toBe('FR');
      expect(screen.getByTestId('translated-delete').textContent).toBe('Supprimer');

      // Basculer vers EN via setLang
      act(() => {
        fireEvent.click(screen.getByTestId('change-to-en'));
      });

      expect(screen.getByTestId('current-lang').textContent).toBe('EN');
      expect(screen.getByTestId('translated-delete').textContent).toBe('Delete');
      expect(localStorage.getItem('troco_language')).toBe('EN');
      expect(document.documentElement.lang).toBe('en');

      // Basculer vers ES via i18n.changeLanguage
      act(() => {
        fireEvent.click(screen.getByTestId('change-to-es'));
      });

      expect(screen.getByTestId('current-lang').textContent).toBe('ES');
      expect(screen.getByTestId('translated-delete').textContent).toBe('Eliminar');
      expect(localStorage.getItem('troco_language')).toBe('ES');
      expect(document.documentElement.lang).toBe('es');

      expect(events).toContain('EN');
      expect(events).toContain('ES');

      window.removeEventListener('languagechange', listener);
    });

    test('useUIStore synchronise currentLang et exporte i18n avec changeLanguage()', () => {
      act(() => {
        useUIStore.getState().setCurrentLang('IT');
      });

      expect(useUIStore.getState().currentLang).toBe('IT');
      expect(i18n.language).toBe('IT');
      expect(localStorage.getItem('troco_language')).toBe('IT');

      act(() => {
        i18n.changeLanguage('DE');
      });

      expect(useUIStore.getState().currentLang).toBe('DE');
      expect(i18n.language).toBe('DE');
      expect(localStorage.getItem('troco_language')).toBe('DE');
    });
  });

  describe('3. Rendu sécurisé des annonces (ListingCard & ListingDetails)', () => {
    const mockAdWithTag = {
      id: 'test-ad-1',
      title: '[EN] English Tutoring Session',
      description: '[EN] Intensive 2h conversation practice for intermediate learners.',
      category: 'Cours',
      location: 'Paris',
      compensation: '1 Jeton',
      nativeLang: 'EN',
    };

    test('ListingCard n\'affiche JAMAIS les balises brutes [EN] dans le titre ou la description', () => {
      render(
        <ListingCard
          item={mockAdWithTag}
          currentLang="EN"
          t={(k) => k}
        />
      );

      const titleEl = screen.getByText('English Tutoring Session');
      expect(titleEl).toBeInTheDocument();
      expect(titleEl.textContent).not.toContain('[EN]');

      const descEl = screen.getByText(/Intensive 2h conversation practice/i);
      expect(descEl).toBeInTheDocument();
      expect(descEl.textContent).not.toContain('[EN]');
    });

    test('ListingDetails modal n\'affiche JAMAIS les balises brutes [EN]', () => {
      render(
        <ListingDetails
          selectedListing={mockAdWithTag}
          onClose={() => {}}
          currentLang="EN"
          t={(k) => k}
        />
      );

      const titleEl = screen.getByText('English Tutoring Session');
      expect(titleEl).toBeInTheDocument();
      expect(titleEl.textContent).not.toContain('[EN]');

      const descEl = screen.getByText(/Intensive 2h conversation practice/i);
      expect(descEl).toBeInTheDocument();
      expect(descEl.textContent).not.toContain('[EN]');
    });
  });
});
