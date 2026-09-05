import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CloudOfficeSuiteModal from './CloudOfficeSuiteModal';
import * as firestore from 'firebase/firestore';

// Mock Firebase
jest.mock('../firebase', () => ({
  db: {},
  storage: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({ id: 'mock-doc' })),
  onSnapshot: jest.fn((docRef, callback) => {
    return () => {};
  }),
  setDoc: jest.fn(() => Promise.resolve()),
  serverTimestamp: jest.fn(() => 123456789),
}));

// Mock Firebase Storage
jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({})),
  ref: jest.fn(),
  uploadBytes: jest.fn(() => Promise.resolve({ ref: {} })),
  getDownloadURL: jest.fn(() => Promise.resolve('https://troco.app/storage/test-image.png')),
}));

describe('PHASE 125 — Upgrade Majeur Suite Cloud (Troco Docs, Sheets, Slides)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.execCommand = jest.fn();
  });

  describe('1. Troco Docs — A4 Paper & Rich Text Editor', () => {
    test('renders centered A4 paper sheet with exact requested classes', () => {
      render(
        <CloudOfficeSuiteModal
          isOpen={true}
          onClose={jest.fn()}
          initialTab="docs"
          document={{ content: '<p>Bienvenue dans Troco Docs</p>' }}
        />
      );

      const editor = screen.getByPlaceholderText(/Rédigez ici vos comptes-rendus/i);
      expect(editor).toBeInTheDocument();
      expect(editor).toHaveAttribute('contenteditable', 'true');
      expect(editor.className).toContain('bg-white');
      expect(editor.className).toContain('w-[21cm]');
      expect(editor.className).toContain('min-h-[29.7cm]');
      expect(editor.className).toContain('mx-auto');
      expect(editor.className).toContain('shadow-md');
      expect(editor.className).toContain('p-[2cm]');
      expect(editor.className).toContain('text-black');
    });

    test('renders complete rich text formatting toolbar and executes formatting commands', () => {
      render(
        <CloudOfficeSuiteModal
          isOpen={true}
          onClose={jest.fn()}
          initialTab="docs"
        />
      );

      // Vérifie les outils principaux
      const boldBtn = screen.getByTitle(/Gras/i);
      const italicBtn = screen.getByTitle(/Italique/i);
      const underlineBtn = screen.getByTitle(/Souligné/i);
      const strikeBtn = screen.getByTitle(/Barré/i);
      const alignCenterBtn = screen.getByTitle(/Centrer/i);
      const styleSelect = screen.getByTitle(/Style de paragraphe/i);
      const fontSizeSelect = screen.getByTitle(/Taille de police/i);

      expect(boldBtn).toBeInTheDocument();
      expect(italicBtn).toBeInTheDocument();
      expect(underlineBtn).toBeInTheDocument();
      expect(strikeBtn).toBeInTheDocument();
      expect(alignCenterBtn).toBeInTheDocument();
      expect(styleSelect).toBeInTheDocument();
      expect(fontSizeSelect).toBeInTheDocument();

      // Clique sur Gras
      fireEvent.click(boldBtn);
      expect(document.execCommand).toHaveBeenCalledWith('bold', false, null);

      // Clique sur Souligné
      fireEvent.click(underlineBtn);
      expect(document.execCommand).toHaveBeenCalledWith('underline', false, null);

      // Change la taille de police
      fireEvent.change(fontSizeSelect, { target: { value: '5' } });
      expect(document.execCommand).toHaveBeenCalledWith('fontSize', false, '5');

      // Change le style en Titre 1
      fireEvent.change(styleSelect, { target: { value: '<h1>' } });
      expect(document.execCommand).toHaveBeenCalledWith('formatBlock', false, '<h1>');
    });
  });

  describe('2. Troco Sheets — Lignes et Colonnes Dynamiques', () => {
    test('renders persistent buttons for adding rows and columns', () => {
      render(
        <CloudOfficeSuiteModal
          isOpen={true}
          onClose={jest.fn()}
          initialTab="sheets"
        />
      );

      const addRowButtons = screen.getAllByRole('button', { name: /Ajouter Ligne/i });
      const addColButtons = screen.getAllByRole('button', { name: /Ajouter Colonne/i });

      expect(addRowButtons.length).toBeGreaterThan(0);
      expect(addColButtons.length).toBeGreaterThan(0);
    });

    test('clicking "Ajouter Ligne" and "Ajouter Colonne" updates dimensions and syncs Firestore', async () => {
      render(
        <CloudOfficeSuiteModal
          isOpen={true}
          onClose={jest.fn()}
          initialTab="sheets"
          effectiveGroupId="chat_123"
        />
      );

      const addRowBtns = screen.getAllByRole('button', { name: /Ajouter Ligne/i });
      const addColBtns = screen.getAllByRole('button', { name: /Ajouter Colonne/i });

      // Clic pour ajouter une colonne
      fireEvent.click(addColBtns[0]);
      // La colonne H (8e colonne) doit apparaître
      expect(screen.getByText('H')).toBeInTheDocument();

      // Clic pour ajouter une ligne
      fireEvent.click(addRowBtns[0]);
      // La ligne 15 doit apparaître
      expect(screen.getByText('15')).toBeInTheDocument();

      // setDoc de Firestore doit avoir été appelé
      await waitFor(() => {
        expect(firestore.setDoc).toHaveBeenCalled();
      });
    });
  });

  describe('3. Troco Slides — Thèmes de fond et Insertion d\'Images', () => {
    test('renders theme selector with Clair, Sombre, Dégradé and modifies background style', () => {
      render(
        <CloudOfficeSuiteModal
          isOpen={true}
          onClose={jest.fn()}
          initialTab="slides"
        />
      );

      const themeSelect = screen.getByLabelText(/Thème de fond/i);
      expect(themeSelect).toBeInTheDocument();

      // Options requises
      expect(screen.getByRole('option', { name: /Clair/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Sombre/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Dégradé/i })).toBeInTheDocument();

      // Sélectionne le thème Sombre
      fireEvent.change(themeSelect, { target: { value: 'dark' } });
      // Vérifie l'appel de mise à jour Firestore
      expect(firestore.setDoc).toHaveBeenCalled();

      // Sélectionne le thème Dégradé
      fireEvent.change(themeSelect, { target: { value: 'gradient' } });
      expect(firestore.setDoc).toHaveBeenCalled();
    });

    test('renders image upload button and displays resizable image overlay when slide has imageUrl', () => {
      const mockSlides = [
        {
          id: 's1',
          title: 'Diapositive Stratégique',
          subtitle: 'Analyse et métriques clés',
          bullets: ['Objectif Q3 atteint'],
          theme: 'light',
          imageUrl: 'https://troco.app/test-slide-image.png',
          imageWidth: 320,
        },
      ];

      render(
        <CloudOfficeSuiteModal
          isOpen={true}
          onClose={jest.fn()}
          initialTab="slides"
          document={{ slides: mockSlides }}
        />
      );

      // Bouton d'upload d'image
      const uploadBtn = screen.getByTitle(/Insérer une image sur la diapositive/i);
      expect(uploadBtn).toBeInTheDocument();

      // Image affichée en surimpression
      const slideImg = screen.getByAltText(/Illustration diapositive/i);
      expect(slideImg).toBeInTheDocument();
      expect(slideImg).toHaveAttribute('src', 'https://troco.app/test-slide-image.png');
      expect(slideImg.style.width).toBe('320px');

      // Curseur de redimensionnement de l'image
      const resizeSlider = screen.getByRole('slider');
      expect(resizeSlider).toBeInTheDocument();
      expect(resizeSlider.value).toBe('320');

      // Modifier la taille via le slider
      fireEvent.change(resizeSlider, { target: { value: '450' } });
      expect(firestore.setDoc).toHaveBeenCalled();
    });
  });
});
