import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CloudOfficeSuiteModal from './CloudOfficeSuiteModal';
import TrocoDocs from './TrocoDocs';
import TrocoSheets from './TrocoSheets';
import TrocoSlides from './TrocoSlides';
import NotesModal from './NotesModal';

// Mock Firebase
jest.mock('../firebase', () => ({
  db: {},
  storage: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({ id: 'mock-doc' })),
  onSnapshot: jest.fn(() => () => {}),
  setDoc: jest.fn(() => Promise.resolve()),
  addDoc: jest.fn(() => Promise.resolve()),
  collection: jest.fn(),
  serverTimestamp: jest.fn(() => 123456789),
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({})),
  ref: jest.fn(),
  uploadBytes: jest.fn(() => Promise.resolve({ ref: {} })),
  getDownloadURL: jest.fn(() => Promise.resolve('https://troco.app/test.png')),
}));

describe('PHASE 126: Workspace Header Unification (Docs, Sheets, Slides, Notes)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. TrocoDocs / Docs Header & Modal Container', () => {
    test('renders Ligne 1 (Fermer left, Title center, syncStatus right) and container classes', () => {
      const handleClose = jest.fn();
      const { baseElement } = render(
        <TrocoDocs
          isOpen={true}
          onClose={handleClose}
          document={{ title: 'Rapport Annuel Troco', content: '<p>Test</p>' }}
        />
      );

      // Modal container has max-h-[90dvh] and overflow-y-auto
      const container = baseElement.querySelector('.max-h-\\[90dvh\\]');
      expect(container).toBeInTheDocument();
      expect(container.className).toContain('overflow-y-auto');

      // Ligne 1
      const line1 = baseElement.querySelector('.flex.justify-between.items-center.w-full.mb-3');
      expect(line1).toBeInTheDocument();

      // Close button
      const closeBtn = screen.getAllByRole('button', { name: /Fermer/i })[0];
      expect(closeBtn).toBeInTheDocument();
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);

      // Title in center
      const titleInput = screen.getByPlaceholderText('Titre du document...');
      expect(titleInput).toBeInTheDocument();
      expect(titleInput.value).toBe('Rapport Annuel Troco');

      // Sync status on right
      expect(screen.getByText(/Synchronisé/i)).toBeInTheDocument();

      // A4 Paper padding
      const a4Paper = screen.getByPlaceholderText(/Rédigez ici vos comptes-rendus/i);
      expect(a4Paper).toBeInTheDocument();
      expect(a4Paper.className).toContain('p-4');
      expect(a4Paper.className).toContain('md:p-8');
    });

    test('renders Ligne 2 action buttons (Télécharger, Imprimer, Partager au chat)', () => {
      render(
        <TrocoDocs
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      expect(screen.getByTitle(/Exporter en PDF imprimable/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Exporter au format Word/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Imprimer le document/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Partager au chat/i)).toBeInTheDocument();
    });

    test('renders Ligne 3 formatting toolbar with overflow-x-auto no-scrollbar', () => {
      const { baseElement } = render(
        <TrocoDocs
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      const line3 = baseElement.querySelector('.overflow-x-auto.no-scrollbar');
      expect(line3).toBeInTheDocument();
      expect(screen.getByTitle(/Gras/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Italique/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Souligné/i)).toBeInTheDocument();
    });
  });

  describe('2. TrocoSheets Header', () => {
    test('renders unified header with Close button, Title, syncStatus, and Actions', () => {
      const handleClose = jest.fn();
      render(
        <TrocoSheets
          isOpen={true}
          onClose={handleClose}
          document={{ sheetTitle: 'Budget Q3' }}
        />
      );

      const closeBtn = screen.getAllByRole('button', { name: /Fermer/i })[0];
      expect(closeBtn).toBeInTheDocument();
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);

      expect(screen.getByPlaceholderText(/Titre de la feuille de calcul/i)).toBeInTheDocument();
      expect(screen.getByText(/Synchronisé/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Exporter au format Excel/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Exporter en CSV/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Imprimer le document/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Partager au chat/i)).toBeInTheDocument();
    });
  });

  describe('3. TrocoSlides Header', () => {
    test('renders unified header with Close button, Title, syncStatus, and Actions', () => {
      const handleClose = jest.fn();
      render(
        <TrocoSlides
          isOpen={true}
          onClose={handleClose}
          document={{ slidesTitle: 'Pitch Deck' }}
        />
      );

      const closeBtn = screen.getAllByRole('button', { name: /Fermer/i })[0];
      expect(closeBtn).toBeInTheDocument();
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);

      expect(screen.getByPlaceholderText(/Titre de la présentation/i)).toBeInTheDocument();
      expect(screen.getByText(/Synchronisé/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Exporter au format PowerPoint/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Imprimer le document/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Partager au chat/i)).toBeInTheDocument();
    });
  });

  describe('4. NotesModal / Notes Header', () => {
    test('renders unified header with Close button, Title in center, syncStatus, and Actions', () => {
      const handleClose = jest.fn();
      const { baseElement } = render(
        <NotesModal
          isOpen={true}
          onClose={handleClose}
          note={{ title: 'Idées Roadmap', content: '# Note' }}
        />
      );

      // Modal container has max-h-[90dvh] and overflow-y-auto
      const container = baseElement.querySelector('.max-h-\\[90dvh\\]');
      expect(container).toBeInTheDocument();
      expect(container.className).toContain('overflow-y-auto');

      // Ligne 1
      const closeBtn = screen.getByTitle('Fermer la note');
      expect(closeBtn).toBeInTheDocument();
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);

      expect(screen.getByPlaceholderText(/Titre de la note/i)).toBeInTheDocument();
      expect(screen.getByText(/Synchronisé/i)).toBeInTheDocument();

      // Ligne 2 Actions
      expect(screen.getByText('Aperçu')).toBeInTheDocument();
      expect(screen.getByTitle(/Exporter au format Markdown/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Imprimer \/ Exporter PDF/i)).toBeInTheDocument();
      expect(screen.getByText(/Partager au Chat/i)).toBeInTheDocument();

      // Ligne 3 Format tools
      expect(screen.getByTitle('Gras')).toBeInTheDocument();
      expect(screen.getByTitle('Italique')).toBeInTheDocument();
    });
  });
});
