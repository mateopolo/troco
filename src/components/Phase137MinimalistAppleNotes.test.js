import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NotesModal from './NotesModal';
import * as firestore from 'firebase/firestore';

// Mock Firebase
jest.mock('../firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({ id: 'mock-doc' })),
  onSnapshot: jest.fn(() => () => {}),
  setDoc: jest.fn(() => Promise.resolve()),
  addDoc: jest.fn(() => Promise.resolve()),
  collection: jest.fn(() => ({})),
  serverTimestamp: jest.fn(() => 123456789),
}));

describe('PHASE 137: Minimalist Apple Notes Redesign in NotesModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('1. Purges heavy toolbars, exports, dropdowns and enforces bg-[#F9F9F9] dark:bg-[#1A1A1A]', () => {
    const { container, baseElement } = render(
      <NotesModal
        isOpen={true}
        onClose={jest.fn()}
        note={{ title: 'Ma Réunion', content: 'Points importants' }}
      />
    );

    // Vérifie le fond uni épuré
    const modalDialog = baseElement.querySelector('.bg-\\[\\#F9F9F9\\]');
    expect(modalDialog).toBeInTheDocument();
    expect(modalDialog.className).toContain('dark:bg-[#1A1A1A]');

    // Vérifie l'absence des barres d'outils lourdes (Gras, Italique, Titre 1, etc.)
    expect(screen.queryByTitle(/Titre 1/i)).toBeNull();
    expect(screen.queryByTitle(/Gras/i)).toBeNull();
    expect(screen.queryByTitle(/Italique/i)).toBeNull();
    expect(screen.queryByTitle(/Exporter au format Markdown/i)).toBeNull();
    expect(screen.queryByTitle(/Imprimer/i)).toBeNull();
    expect(screen.queryByText(/Aperçu/i)).toBeNull();

    // Vérifie la zone de saisie sans bordure, resize-none, bg-transparent
    const textarea = screen.getByPlaceholderText(/Rédigez vos notes partagées ici/i);
    expect(textarea).toBeInTheDocument();
    expect(textarea.className).toContain('outline-none');
    expect(textarea.className).toContain('border-none');
    expect(textarea.className).toContain('resize-none');
    expect(textarea.className).toContain('bg-transparent');
  });

  test('2. Enforces system typography and clean 2-element header (Pill close at left, Oval share at right)', () => {
    const handleClose = jest.fn();
    render(
      <NotesModal
        isOpen={true}
        onClose={handleClose}
        note={{ title: 'Idées', content: 'Contenu note' }}
      />
    );

    // Typographie système ultra-lisible
    const textarea = screen.getByPlaceholderText(/Rédigez vos notes partagées ici/i);
    expect(textarea.className).toContain('font-sans');
    expect(textarea.className).toContain('text-lg');
    expect(textarea.className).toContain('leading-relaxed');

    // Bouton retour/fermer sous forme de pilule discrète à gauche
    const closeBtn = screen.getByTitle('Fermer la note');
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn).toHaveTextContent('Fermer');
    expect(closeBtn.className).toContain('rounded-full');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Bouton ovale Partager au Chat et indicateur de sauvegarde à droite
    const shareBtn = screen.getByRole('button', { name: /Partager au Chat/i });
    expect(shareBtn).toBeInTheDocument();
    expect(shareBtn.className).toContain('rounded-full');

    // Indicateur de sauvegarde
    expect(screen.getByText(/Synchronisé/i)).toBeInTheDocument();
  });

  test('3. Defensive checks: returns null if !isOpen and prevents accidental backdrop close', () => {
    const { container: closedContainer } = render(
      <NotesModal isOpen={false} onClose={jest.fn()} />
    );
    expect(closedContainer.firstChild).toBeNull();

    const handleClose = jest.fn();
    const { baseElement } = render(
      <NotesModal isOpen={true} onClose={handleClose} />
    );

    // Clic sur le backdrop ne doit PAS fermer la modale
    const backdrop = baseElement.querySelector('.fixed.inset-0');
    fireEvent.click(backdrop);
    expect(handleClose).not.toHaveBeenCalled();
  });
});
