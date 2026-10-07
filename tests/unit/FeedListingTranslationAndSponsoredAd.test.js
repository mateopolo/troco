// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FeedCardItem from '../../src/components/FeedCardItem';
import ListingDetailModal from '../../src/components/ListingDetailModal';
import SponsoredFeedCard from '../../src/components/SponsoredFeedCard';
import { getListingDisplayContent } from '../../src/utils/translationHelpers';

// Mock IntersectionObserver for framer-motion in jsdom
global.IntersectionObserver = class {
  constructor(cb) {
    this.cb = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock('../../src/firebase', () => ({
  db: { _mock: true },
  auth: { currentUser: { uid: 'user_tester' } },
}));

vi.mock('../../src/hooks/useUserPresence', () => ({
  useUserPresence: () => ({ isOnline: true }),
}));

vi.mock('../../src/services/paymentService', () => ({
  paymentService: {
    claimBonus: vi.fn(async () => ({ success: true, bonusAmount: 2.0 })),
  },
}));

describe('I18N-09, I18N-10 & UI-01: Traduction Feed, Détail et Annonce Sponsorisée', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TÂCHE 1 & 2 : FeedCardItem Traduction et Toggle Original', () => {
    const demoListing = {
      id: 1,
      isDemo: true,
      title: 'pret de perceuse',
      description: 'Prêt rapide de perceuse Bosch.',
      compensation: '1 Jeton',
      nativeLang: 'FR',
    };

    it('affiche le titre traduit en italien quand currentLang === "IT"', () => {
      render(
        <FeedCardItem
          item={demoListing}
          darkMode={false}
          currentLang="IT"
          getListingDisplayContent={getListingDisplayContent}
          formatCompensation={(c) => c}
          t={(k, f) => f || k}
        />
      );

      // Title should be translated in Italian
      expect(screen.getByText('Prestito trapano')).toBeTruthy();
      // Button to view original should be present
      expect(screen.getByText("Voir l'original")).toBeTruthy();
    });

    it('bascule entre traduction et original lors du clic sur le bouton', () => {
      const toggleMock = vi.fn();
      render(
        <FeedCardItem
          item={demoListing}
          darkMode={false}
          currentLang="IT"
          getListingDisplayContent={getListingDisplayContent}
          toggleOriginalListing={toggleMock}
          formatCompensation={(c) => c}
          t={(k, f) => (k === 'showTranslation' ? 'Voir la traduction' : (k === 'showOriginal' ? "Voir l'original" : f || k))}
        />
      );

      const toggleBtn = screen.getByText("Voir l'original");
      fireEvent.click(toggleBtn);

      expect(toggleMock).toHaveBeenCalledWith(1, expect.anything());
      // After clicking, it toggles to original French title
      expect(screen.getByText('pret de perceuse')).toBeTruthy();
      expect(screen.getByText('Voir la traduction')).toBeTruthy();

      // Click again to return to Italian translation
      fireEvent.click(screen.getByText('Voir la traduction'));
      expect(screen.getByText('Prestito trapano')).toBeTruthy();
    });
  });

  describe('TÂCHE 3 : ListingDetailModal bouton "Voir l\'original" / "Voir la traduction"', () => {
    const sampleListing = {
      id: 'listing-42',
      title: "Séance d'écoute de vinyles",
      description: 'Écoute de vinyles de jazz rétro.',
      compensation: '1 Jeton Troco',
      nativeLang: 'FR',
      author: 'Sofia',
    };

    it('affiche la traduction italienne et permet de basculer vers l\'original', () => {
      const toggleMock = vi.fn();
      render(
        <ListingDetailModal
          listing={sampleListing}
          darkMode={false}
          currentLang="IT"
          toggleOriginalListing={toggleMock}
          onClose={() => {}}
          t={(k) => (k === 'showTranslation' ? 'Mostra traduzione' : (k === 'showOriginal' ? 'Mostra originale' : k))}
        />
      );

      // Translated in Italian
      expect(screen.getByText('Sessione di ascolto di vinili')).toBeTruthy();
      const toggleBtn = screen.getByText('Mostra originale');
      expect(toggleBtn).toBeTruthy();

      // Click toggle button
      fireEvent.click(toggleBtn);
      expect(toggleMock).toHaveBeenCalledWith('listing-42', expect.anything());

      // Showing original French
      expect(screen.getByText("Séance d'écoute de vinyles")).toBeTruthy();
      expect(screen.getByText('Mostra traduzione')).toBeTruthy();
    });
  });

  describe('TÂCHE 4 & 5 : SponsoredFeedCard multilingue et intégration', () => {
    it('traduit les partenaires sponsorisés en italien (IT)', () => {
      render(
        <SponsoredFeedCard
          index={0}
          darkMode={false}
          currentLang="IT"
          t={(k, f) => f || k}
        />
      );

      // Verify Italian translations for partner 0 (Bricolage / Outillage)
      expect(screen.getByText('Bricolage e Attrezzature')).toBeTruthy();
      expect(screen.getByText('Noleggio e prestito di elettroutensili professionali')).toBeTruthy();
      expect(screen.getByText('🌟 Partner Certificato')).toBeTruthy();
      expect(screen.getByText('-15% Sconto Partner')).toBeTruthy();
      expect(screen.getByText('Scopri le attrezzature')).toBeTruthy();
      expect(screen.getByText('Sponsorizzato')).toBeTruthy();
    });

    it('traduit les partenaires sponsorisés en anglais (EN)', () => {
      render(
        <SponsoredFeedCard
          index={0}
          darkMode={false}
          currentLang="EN"
          t={(k, f) => f || k}
        />
      );

      expect(screen.getByText('DIY & Equipment')).toBeTruthy();
      expect(screen.getByText('Professional Power Tool Rental & Loan')).toBeTruthy();
      expect(screen.getByText('🌟 Certified Partner')).toBeTruthy();
      expect(screen.getByText('-15% Partner Discount')).toBeTruthy();
      expect(screen.getByText('Discover Equipment')).toBeTruthy();
      expect(screen.getByText('Sponsored')).toBeTruthy();
    });

    it('traduit en japonais (JA) et chinois (ZH)', () => {
      const { unmount } = render(
        <SponsoredFeedCard
          index={0}
          darkMode={false}
          currentLang="JA"
          t={(k, f) => f || k}
        />
      );

      expect(screen.getByText('DIY・工具・機材')).toBeTruthy();
      expect(screen.getByText('プロ用電動工具のレンタル＆貸出')).toBeTruthy();
      expect(screen.getByText('スポンサー')).toBeTruthy();
      unmount();

      render(
        <SponsoredFeedCard
          index={0}
          darkMode={false}
          currentLang="ZH"
          t={(k, f) => f || k}
        />
      );

      expect(screen.getByText('家装与专业工具')).toBeTruthy();
      expect(screen.getByText('专业电动工具租赁与出借')).toBeTruthy();
      expect(screen.getByText('赞助推广')).toBeTruthy();
    });
  });
});
