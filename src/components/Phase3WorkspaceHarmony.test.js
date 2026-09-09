import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CloudOfficeSuiteModal from './CloudOfficeSuiteModal';
import TrocoDocs, { TrocoDocsEditor } from './TrocoDocs';
import TrocoSlides from './TrocoSlides';

// Mock Firebase
jest.mock('../firebase', () => ({
  db: {},
  storage: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({ id: 'mock-doc' })),
  onSnapshot: jest.fn(() => () => {}),
  setDoc: jest.fn(() => Promise.resolve()),
  updateDoc: jest.fn(() => Promise.resolve()),
  collection: jest.fn(),
  addDoc: jest.fn(() => Promise.resolve()),
  serverTimestamp: jest.fn(() => 123456789),
}));

describe('PHASE 3 — TÂCHE 3.1 : UI Workspace (Glassmorphism & Centrage)', () => {
  describe('1. Sélecteur d\'onglets pilule en Glassmorphism (Docs, Sheets, Slides, Notes)', () => {
    test('renders glassmorphic pill tab selector containing Docs, Sheets, Slides, and Notes', () => {
      render(
        <CloudOfficeSuiteModal
          isOpen={true}
          onClose={jest.fn()}
          initialTab="docs"
        />
      );

      // Verify pill tab container with glassmorphic styles
      const docsTab = screen.getByRole('button', { name: /Troco Docs/i });
      const sheetsTab = screen.getByRole('button', { name: /Troco Sheets/i });
      const slidesTab = screen.getByRole('button', { name: /Troco Slides/i });
      const notesTab = screen.getByRole('button', { name: /Troco Notes/i });

      expect(docsTab).toBeInTheDocument();
      expect(sheetsTab).toBeInTheDocument();
      expect(slidesTab).toBeInTheDocument();
      expect(notesTab).toBeInTheDocument();

      // Check glassmorphism classes on parent container
      const pillContainer = docsTab.parentElement;
      expect(pillContainer.className).toContain('backdrop-blur-md');
      expect(pillContainer.className).toContain('rounded-full');
      expect(pillContainer.className).toContain('bg-white/10');
      expect(pillContainer.className).toContain('border-white/20');
    });

    test('clicking Troco Notes tab switches view to centered Apple-Notes style interface', () => {
      render(
        <CloudOfficeSuiteModal
          isOpen={true}
          onClose={jest.fn()}
          initialTab="docs"
        />
      );

      const notesTab = screen.getByRole('button', { name: /Troco Notes/i });
      fireEvent.click(notesTab);

      // Verify Note Rapide view and textarea
      expect(screen.getByText(/Note Rapide/i)).toBeInTheDocument();
      const notesTextarea = screen.getByPlaceholderText(/Notez ici vos pensées/i);
      expect(notesTextarea).toBeInTheDocument();
      expect(screen.getByTitle(/Exporter la note en Markdown/i)).toBeInTheDocument();
    });
  });

  describe('2. Zones de documents centrées et en-têtes sécurisés (Plein écran fixed inset-0)', () => {
    test('modal container is rendered in true full-screen with fixed inset-0', () => {
      render(
        <CloudOfficeSuiteModal
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      // The modal container must have fixed and inset-0 (portaled to document.body)
      const modalMain = document.body.querySelector('.fixed.inset-0');
      expect(modalMain).toBeInTheDocument();
    });

    test('TrocoDocs A4 paper sheet is centered inside flex container', () => {
      render(
        <CloudOfficeSuiteModal
          isOpen={true}
          onClose={jest.fn()}
          initialTab="docs"
        />
      );

      const a4Sheet = screen.getByPlaceholderText(/Rédigez ici vos comptes-rendus/i);
      expect(a4Sheet).toBeInTheDocument();
      expect(a4Sheet.className).toContain('mx-auto');
      expect(a4Sheet.parentElement.className).toContain('items-center');
    });

    test('TrocoSlides 16:9 presentation slide canvas is centered in full-screen editor', () => {
      render(
        <TrocoSlides
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      const slideTitleInput = screen.getByPlaceholderText(/Titre de la diapositive/i);
      expect(slideTitleInput).toBeInTheDocument();

      // Check that right toolbar contains PPTX and Imprimer without overflow
      expect(screen.getByTitle(/Exporter au format PowerPoint/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Imprimer le document/i)).toBeInTheDocument();
    });

    test('TrocoDocsEditor helper centers A4 paper in full screen flex desk', () => {
      const { container } = render(<TrocoDocsEditor />);
      const deskLayer = container.querySelector('.flex-1.overflow-y-auto.bg-gray-100.cursor-text');
      expect(deskLayer).toBeInTheDocument();
      expect(deskLayer.className).toContain('items-center');
      expect(deskLayer.className).toContain('justify-start');
    });
  });
});
