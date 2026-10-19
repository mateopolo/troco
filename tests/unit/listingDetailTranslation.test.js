// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ListingDetailModal from '../../src/components/ListingDetailModal';
import { translations } from '../../src/locales/translations';

vi.mock('../../src/firebase', () => ({
  auth: { currentUser: { uid: 'user_viewer_1' } },
  db: { _mock: true },
}));

vi.mock('../../src/utils/translator', () => ({
  getInstantOrQueueTranslation: vi.fn((text, targetLang) => {
    if (text.includes('Gitarrenunterricht')) return 'Cours de guitare à Berlin';
    if (text.includes('Akustik')) return 'Cours de guitare acoustique et électrique pour débutants.';
    return text;
  }),
  subscribeTranslations: vi.fn(() => () => {}),
  translateListingObject: vi.fn((it) => Promise.resolve(it)),
}));

describe('Prompt 16 / MISSING-01 — Voir l’original sur le détail d’annonce', () => {
  const germanListing = {
    id: 'listing-de-1',
    title: 'Gitarrenunterricht in Berlin',
    description: 'Akustik- und E-Gitarrenunterricht für Anfänger und Fortgeschrittene.',
    compensation: '20€ / heure',
    nativeLang: 'DE',
    category: 'Musique',
    author: 'Hans Müller',
    authorUid: 'hans_123',
    status: 'active',
  };

  const frenchListing = {
    id: 'listing-fr-1',
    title: 'Cours de cuisine italienne',
    description: 'Apprenez à faire de véritables pâtes fraîches maison.',
    compensation: '15€ / session',
    nativeLang: 'FR',
    category: 'Cours',
    author: 'Julien Dupont',
    authorUid: 'julien_456',
    status: 'active',
  };

  const getT = (lang = 'FR') => (key) => (translations[lang] && translations[lang][key]) || key;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('affiche le bouton « Voir l’original » (data-testid="listing-toggle-original") pour une annonce en DE vue en FR', () => {
    render(
      <ListingDetailModal
        listing={germanListing}
        currentLang="FR"
        t={getT('FR')}
        onClose={vi.fn()}
      />
    );

    const toggleBtn = screen.getByTestId('listing-toggle-original');
    expect(toggleBtn).toBeDefined();
    expect(toggleBtn.textContent).toContain("Voir l'original");

    // Le titre et la description traduits sont affichés par défaut
    expect(screen.getByText('Cours de guitare à Berlin')).toBeDefined();
    expect(screen.getByText('Cours de guitare acoustique et électrique pour débutants.')).toBeDefined();
  });

  it('bascule vers le texte original en allemand au clic sur le bouton toggle', () => {
    const toggleOriginalMock = vi.fn();
    render(
      <ListingDetailModal
        listing={germanListing}
        currentLang="FR"
        t={getT('FR')}
        toggleOriginalListing={toggleOriginalMock}
        onClose={vi.fn()}
      />
    );

    const toggleBtn = screen.getByTestId('listing-toggle-original');
    expect(toggleBtn.textContent).toContain("Voir l'original");

    // Clic pour voir l'original
    fireEvent.click(toggleBtn);

    // Le libellé du bouton bascule sur "Voir la traduction"
    expect(toggleBtn.textContent).toContain('Voir la traduction');
    expect(toggleOriginalMock).toHaveBeenCalledWith('listing-de-1', expect.anything());

    // Le titre et la description originaux en DE sont affichés
    expect(screen.getByText('Gitarrenunterricht in Berlin')).toBeDefined();
    expect(screen.getByText('Akustik- und E-Gitarrenunterricht für Anfänger und Fortgeschrittene.')).toBeDefined();

    // Deuxième clic pour revenir à la traduction
    fireEvent.click(toggleBtn);
    expect(toggleBtn.textContent).toContain("Voir l'original");
    expect(screen.getByText('Cours de guitare à Berlin')).toBeDefined();
  });

  it('n’affiche PAS le bouton toggle quand l’annonce est dans la même langue que l’interface (FR en FR)', () => {
    render(
      <ListingDetailModal
        listing={frenchListing}
        currentLang="FR"
        t={getT('FR')}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByTestId('listing-toggle-original')).toBeNull();
  });

  it('n’affiche PAS le bouton toggle pour une annonce en DE vue dans une interface en DE', () => {
    render(
      <ListingDetailModal
        listing={germanListing}
        currentLang="DE"
        t={getT('DE')}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByTestId('listing-toggle-original')).toBeNull();
  });

  it('affiche le bouton toggle pour une annonce en FR vue dans une interface en DE', () => {
    render(
      <ListingDetailModal
        listing={frenchListing}
        currentLang="DE"
        t={getT('DE')}
        onClose={vi.fn()}
      />
    );

    const toggleBtn = screen.getByTestId('listing-toggle-original');
    expect(toggleBtn).toBeDefined();
    // En allemand : "Original anzeigen"
    expect(toggleBtn.textContent).toContain('Original anzeigen');
  });
});
