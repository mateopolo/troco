// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { getListingDisplayContent } from '../../src/utils/translationHelpers';
import { parseAndTranslateListing, getKnownTitleTranslation } from '../../src/utils/dynamicTranslation';
import TranslatedText from '../../src/components/common/TranslatedText';
import { subscribeTranslations } from '../../src/utils/translator';
import { DEFAULT_GLOBAL_CONTENT } from '../../src/features/admin/useGlobalContent';

describe('I18N-07 & I18N-08: Traduction des annonces démo et bannière admin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TÂCHE 1 & 2 : getListingDisplayContent pour les annonces démo', () => {
    it('traduit les annonces démo en italien (IT) : perceuse, écoute, violon', () => {
      const demoPerceuse = {
        id: 1,
        isDemo: true,
        title: 'pret de perceuse',
        description: 'Prêt rapide de perceuse Bosch.',
        compensation: '1 Jeton',
        nativeLang: 'FR',
      };

      const resultIT = getListingDisplayContent(demoPerceuse, 'IT');
      expect(resultIT.title).toBe('Prestito trapano');

      const demoEcoute = {
        id: 'demo-2',
        isDemo: true,
        title: "Séance d'écoute de vinyles",
        description: 'Écoute de vinyles jazz vintage.',
        compensation: 'Café offert',
        nativeLang: 'FR',
      };

      const resultEcouteIT = getListingDisplayContent(demoEcoute, 'IT');
      expect(resultEcouteIT.title).toBe('Sessione di ascolto di vinili');

      const demoViolon = {
        id: 3,
        isDemo: true,
        title: 'Cours de violon',
        description: 'Initiation au violon classique.',
        compensation: '2 Jetons',
      };

      const resultViolonIT = getListingDisplayContent(demoViolon, 'IT');
      expect(resultViolonIT.title).toBe('Lezioni di violino');
    });

    it('traduit les annonces démo en anglais (EN), espagnol (ES), japonais (JA), chinois (ZH)', () => {
      const demoPerceuse = { id: 1, isDemo: true, title: 'Prêt de perceuse' };

      expect(getListingDisplayContent(demoPerceuse, 'EN').title).toBe('Drill Loan');
      expect(getListingDisplayContent(demoPerceuse, 'ES').title).toBe('Préstamo de taladro');
      expect(getListingDisplayContent(demoPerceuse, 'JA').title).toBe('ドリルレンタル');
      expect(getListingDisplayContent(demoPerceuse, 'ZH').title).toBe('电钻租借');
    });

    it('utilise en priorité item.translations[targetLang] pour les annonces réelles', () => {
      const realListing = {
        id: 'real-uuid-999',
        title: 'Titre Original FR',
        description: 'Description FR',
        compensation: '10€',
        nativeLang: 'FR',
        translations: {
          IT: {
            title: 'Titolo Personalizzato Reale IT',
            description: 'Descrizione Reale IT',
            compensation: '10€',
          },
        },
      };

      const resultIT = getListingDisplayContent(realListing, 'IT');
      expect(resultIT.title).toBe('Titolo Personalizzato Reale IT');
      expect(resultIT.description).toBe('Descrizione Reale IT');
    });

    it('respecte le mode "voir l\'original" (forceOriginal = true) sans balises', () => {
      const listingWithTag = {
        id: 'tag-123',
        title: '[FR] Séance de yoga dynamique',
        description: '[FR] Séance en plein air au parc.',
        compensation: '1 Jeton',
      };

      const original = getListingDisplayContent(listingWithTag, 'IT', true);
      expect(original.title).toBe('Séance de yoga dynamique');
      expect(original.description).toBe('Séance en plein air au parc.');
      expect(original.title).not.toContain('[FR]');
    });

    it('gère les annonces sans objet ou vides avec résilience', () => {
      expect(getListingDisplayContent(null, 'IT')).toEqual({ title: '', description: '', compensation: '' });
      expect(getListingDisplayContent(undefined, 'IT')).toEqual({ title: '', description: '', compensation: '' });
    });
  });

  describe('TÂCHE 3 : Traduction de la bannière administrative Nouveauté (TranslatedText)', () => {
    it('traduit le texte d\'annonce par défaut en italien (IT)', () => {
      const announcement = DEFAULT_GLOBAL_CONTENT.platform_announcement;

      render(
        <TranslatedText
          text={announcement}
          targetLang="IT"
          fallback={announcement}
        />
      );

      expect(screen.getByText(/Novità.*Lavagna Collaborativa/i)).toBeTruthy();
    });

    it('traduit le texte d\'annonce par défaut en anglais (EN)', () => {
      const announcement = DEFAULT_GLOBAL_CONTENT.platform_announcement;

      render(
        <TranslatedText
          text={announcement}
          targetLang="EN"
          fallback={announcement}
        />
      );

      expect(screen.getByText(/What's New.*Collaborative Whiteboard/i)).toBeTruthy();
    });

    it('affiche le texte d\'origine en français (FR)', () => {
      const announcement = DEFAULT_GLOBAL_CONTENT.platform_announcement;

      render(
        <TranslatedText
          text={announcement}
          targetLang="FR"
          fallback={announcement}
        />
      );

      expect(screen.getByText(/📢 Nouveauté : Hubs de Projets et Whiteboard Collaboratif 100% P2P disponibles !/i)).toBeTruthy();
    });
  });
});
