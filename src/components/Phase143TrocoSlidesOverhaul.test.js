import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TrocoSlides from './TrocoSlides';

// Mock LanguageContext
jest.mock('../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'fr',
    t: (key) => key,
  }),
}));

// Mock Firebase
jest.mock('../firebase', () => ({
  db: {},
  storage: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({})),
  setDoc: jest.fn(() => Promise.resolve()),
  updateDoc: jest.fn(() => Promise.resolve()),
  onSnapshot: jest.fn(() => () => {}),
  serverTimestamp: jest.fn(() => new Date()),
  collection: jest.fn(() => ({})),
  addDoc: jest.fn(() => Promise.resolve()),
}));

describe('WP-FIX-06 : TrocoSlides Overhaul (Inline editing, 12 themes, transitions, miniatures)', () => {
  test('renders 12 themes in theme dropdown', () => {
    render(
      <TrocoSlides
        isOpen={true}
        onClose={jest.fn()}
      />
    );

    const themeSelect = screen.getByLabelText(/Thème de fond/i);
    expect(themeSelect).toBeInTheDocument();

    const expectedThemes = [
      'Terracotta',
      'Sombre',
      'Clair',
      'Dégradé',
      'Modern Blue',
      'Sunset Orange',
      'Mint Green',
      'Dark Luxury',
      'Pastel Pink',
      'Corporate Grey',
      'Forest',
      'Ocean Deep',
    ];

    expect(themeSelect.children).toHaveLength(12);
    expectedThemes.forEach((label) => {
      expect(screen.getByRole('option', { name: label })).toBeInTheDocument();
    });
  });

  test('renders transition selector with fade, slide, and zoom', () => {
    render(
      <TrocoSlides
        isOpen={true}
        onClose={jest.fn()}
      />
    );

    const transitionSelect = screen.getByLabelText(/Transition de diapositive/i);
    expect(transitionSelect).toBeInTheDocument();

    expect(screen.getByRole('option', { name: /Fondu/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Glissement/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Zoom/i })).toBeInTheDocument();

    fireEvent.change(transitionSelect, { target: { value: 'zoom' } });
    expect(transitionSelect.value).toBe('zoom');
  });

  test('edits title inline directly inside the slide card (no external header input)', () => {
    render(
      <TrocoSlides
        isOpen={true}
        onClose={jest.fn()}
      />
    );

    // The inline title input is inside the slide card
    const inlineTitleInput = screen.getByPlaceholderText(/Titre de la diapositive.../i);
    expect(inlineTitleInput).toBeInTheDocument();
    expect(inlineTitleInput.className).toContain('slide-inline-title');

    // Verify typing updates the title
    fireEvent.change(inlineTitleInput, { target: { value: 'Mon Nouveau Titre de Pitch' } });
    expect(inlineTitleInput.value).toBe('Mon Nouveau Titre de Pitch');
  });

  test('renders slide miniatures (thumbnails) in the sidebar for each slide', () => {
    render(
      <TrocoSlides
        isOpen={true}
        onClose={jest.fn()}
      />
    );

    // Default slides count is 3
    const thumb0 = screen.getByTestId('slide-thumbnail-0');
    const thumb1 = screen.getByTestId('slide-thumbnail-1');
    const thumb2 = screen.getByTestId('slide-thumbnail-2');

    expect(thumb0).toBeInTheDocument();
    expect(thumb1).toBeInTheDocument();
    expect(thumb2).toBeInTheDocument();

    // Verify clicking a thumbnail changes the active slide
    fireEvent.click(thumb1);
    expect(screen.getByText(/Diapositive 2 \/ 3/i)).toBeInTheDocument();
  });
});
