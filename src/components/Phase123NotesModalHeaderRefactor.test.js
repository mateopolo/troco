import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SharedDocumentModal from './SharedDocumentModal';
import NotesModal from './NotesModal';

// Mock Firebase
jest.mock('../firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn(() => Promise.resolve()),
  onSnapshot: jest.fn((ref, callback) => {
    callback({
      exists: () => false,
      data: () => null,
    });
    return jest.fn();
  }),
  serverTimestamp: jest.fn(() => ({})),
}));

describe('Phase 123: Notes Modal Header Layout Refactor & Close Button', () => {
  const defaultNote = {
    id: 'note-123',
    title: 'Compte-rendu Réunion Projet',
    content: '# Titre\nTexte de test en markdown.\n- [ ] Action 1',
  };

  test('1. Bouton Fermer is prominent, has "Fermer" label, and triggers onClose on click', () => {
    const handleClose = jest.fn();
    render(
      <SharedDocumentModal
        isOpen={true}
        onClose={handleClose}
        document={defaultNote}
      />
    );

    const closeBtn = screen.getByTitle('Fermer la note');
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn).toHaveTextContent('Fermer');

    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('2. Header Ligne 1 uses flex justify-between items-center w-full mb-3', () => {
    const { baseElement } = render(
      <SharedDocumentModal
        isOpen={true}
        onClose={jest.fn()}
        document={defaultNote}
      />
    );

    const line1 = baseElement.querySelector('.flex.justify-between.items-center.w-full.mb-3');
    expect(line1).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Titre de la note...')).toBeInTheDocument();
  });

  test('3. Header Ligne 2 uses flex flex-wrap items-center gap-2 w-full mb-2 with actions', () => {
    const { baseElement } = render(
      <SharedDocumentModal
        isOpen={true}
        onClose={jest.fn()}
        document={defaultNote}
      />
    );

    const line2 = baseElement.querySelector('.flex.flex-wrap.items-center.gap-2.w-full.mb-2');
    expect(line2).toBeInTheDocument();

    // Check actions
    expect(screen.getByText('Aperçu')).toBeInTheDocument();
    expect(screen.getByText('.md')).toBeInTheDocument();
    expect(screen.getByText('Imprimer')).toBeInTheDocument();
    expect(screen.getByText(/Partager au Chat/i)).toBeInTheDocument();
  });

  test('4. Header Ligne 3 has overflow-x-auto no-scrollbar with statuses and format tools', () => {
    const { baseElement } = render(
      <SharedDocumentModal
        isOpen={true}
        onClose={jest.fn()}
        document={defaultNote}
      />
    );

    const line3 = baseElement.querySelector('.flex.items-center.gap-3.overflow-x-auto.no-scrollbar.w-full.py-2');
    expect(line3).toBeInTheDocument();

    // Statuses
    expect(screen.getByText(/Synchronisé/i)).toBeInTheDocument();
    expect(screen.getByText(/mots/i)).toBeInTheDocument();
    expect(screen.getByText(/caractères/i)).toBeInTheDocument();

    // Format tools titles
    expect(screen.getByTitle('Titre 1')).toBeInTheDocument();
    expect(screen.getByTitle('Titre 2')).toBeInTheDocument();
    expect(screen.getByTitle('Gras')).toBeInTheDocument();
    expect(screen.getByTitle('Italique')).toBeInTheDocument();
  });

  test('5. Modal container has max-h-[90dvh] and overflow-y-auto', () => {
    const { baseElement } = render(
      <SharedDocumentModal
        isOpen={true}
        onClose={jest.fn()}
        document={defaultNote}
      />
    );

    // Modal dialog
    const modalDialog = baseElement.querySelector('.max-h-\\[90dvh\\]');
    expect(modalDialog).toBeInTheDocument();
    expect(modalDialog.className).toContain('overflow-y-auto');
  });

  test('6. NotesModal wrapper correctly forwards onClose and renders header', () => {
    const handleClose = jest.fn();
    render(
      <NotesModal
        isOpen={true}
        onClose={handleClose}
        note={defaultNote}
      />
    );

    const closeBtn = screen.getByTitle('Fermer la note');
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
