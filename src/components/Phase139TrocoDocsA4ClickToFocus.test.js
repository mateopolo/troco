import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TrocoDocs, { TrocoDocsEditor } from './TrocoDocs';

// Mock Firebase
jest.mock('../firebase', () => ({
  db: { id: 'mock-db' },
  storage: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({ id: 'mock-doc' })),
  onSnapshot: jest.fn(() => () => {}),
  setDoc: jest.fn(() => Promise.resolve()),
  updateDoc: jest.fn(() => Promise.resolve()),
  collection: jest.fn(),
  addDoc: jest.fn(() => Promise.resolve()),
  serverTimestamp: jest.fn(() => 'mock-timestamp'),
}));

describe('PHASE 139: TrocoDocs A4 Document Aesthetics & Global Click-to-Focus', () => {
  describe('1. Standalone TrocoDocsEditor Component', () => {
    test('renders Couche 1 (desk/background) and Couche 2 (A4 paper sheet) with requested classes', () => {
      const { container } = render(<TrocoDocsEditor />);

      // Couche 1 : Desk background
      const deskLayer = container.querySelector(
        '.flex-1.overflow-y-auto.bg-gray-100.cursor-text'
      );
      expect(deskLayer).toBeInTheDocument();
      expect(deskLayer.className).toContain('p-4');
      expect(deskLayer.className).toContain('md:p-10');

      // Couche 2 : A4 paper sheet
      const a4Sheet = screen.getByPlaceholderText(/Rédigez ici vos comptes-rendus/i);
      expect(a4Sheet).toBeInTheDocument();
      expect(a4Sheet).toHaveAttribute('contenteditable', 'true');
      expect(a4Sheet.className).toContain('w-full');
      expect(a4Sheet.className).toContain('max-w-[21cm]');
      expect(a4Sheet.className).toContain('min-h-[29.7cm]');
      expect(a4Sheet.className).toContain('mx-auto');
      expect(a4Sheet.className).toContain('bg-white');
      expect(a4Sheet.className).toContain('text-black');
      expect(a4Sheet.className).toContain('p-[2cm]');
      expect(a4Sheet.className).toContain('shadow-xl');
      expect(a4Sheet.className).toContain('outline-none');
      expect(a4Sheet.className).toContain('focus:ring-2');
      expect(a4Sheet.className).toContain('transition-shadow');
    });

    test('clicking Couche 1 (gray background) automatically focuses the A4 paper sheet', () => {
      const { container } = render(<TrocoDocsEditor />);

      const deskLayer = container.querySelector(
        '.flex-1.overflow-y-auto.bg-gray-100.cursor-text'
      );
      const a4Sheet = screen.getByPlaceholderText(/Rédigez ici vos comptes-rendus/i);

      const focusSpy = jest.spyOn(a4Sheet, 'focus');

      // Click anywhere on desk background
      fireEvent.click(deskLayer);

      expect(focusSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. Full TrocoDocs Workspace Integration', () => {
    test('renders A4 paper and click-to-focus desk within TrocoDocs modal', () => {
      const { baseElement } = render(
        <TrocoDocs
          isOpen={true}
          onClose={jest.fn()}
          document={{ title: 'Document Word-Like', content: '<p>Contenu</p>' }}
        />
      );

      // Desk Layer
      const deskLayer = baseElement.querySelector(
        '.flex-1.overflow-y-auto.bg-gray-100.cursor-text'
      );
      expect(deskLayer).toBeInTheDocument();
      expect(deskLayer.className).toContain('md:p-10');

      // A4 Sheet
      const a4Sheet = screen.getByPlaceholderText(/Rédigez ici vos comptes-rendus/i);
      expect(a4Sheet).toBeInTheDocument();
      expect(a4Sheet.className).toContain('max-w-[21cm]');
      expect(a4Sheet.className).toContain('shadow-xl');
      expect(a4Sheet.className).toContain('p-[2cm]');

      // Focus test
      const focusSpy = jest.spyOn(a4Sheet, 'focus');
      fireEvent.click(deskLayer);
      expect(focusSpy).toHaveBeenCalledTimes(1);
    });
  });
});
