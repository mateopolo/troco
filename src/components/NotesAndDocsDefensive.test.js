import React from 'react';
import { render, screen } from '@testing-library/react';
import SharedDocumentModal from './SharedDocumentModal';
import NotesModal from './NotesModal';
import CloudOfficeSuiteModal from './CloudOfficeSuiteModal';
import TrocoDocs, { defaultDoc } from './TrocoDocs';

// Mock Firebase
jest.mock('../firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn(() => Promise.resolve()),
  onSnapshot: jest.fn((ref, callback) => {
    // Simuler document inexistant au départ pour tester la création de squelette sécurisé
    callback({
      exists: () => false,
      data: () => null,
    });
    return jest.fn();
  }),
  serverTimestamp: jest.fn(() => ({})),
}));

describe('PHASE 100 — Defensive Programming for Notes, Docs & Sheets', () => {
  test('defaultDoc skeleton has title, content, cells, lastUpdated', () => {
    expect(defaultDoc).toBeDefined();
    expect(defaultDoc.title).toBe('Nouveau Document');
    expect(defaultDoc.content).toBe('');
    expect(defaultDoc.cells).toEqual({});
    expect(typeof defaultDoc.lastUpdated).toBe('number');
  });

  test('SharedDocumentModal renders safely with empty/null props without ErrorBoundary crash', () => {
    const { container } = render(
      <SharedDocumentModal
        isOpen={true}
        onClose={jest.fn()}
      />
    );

    const textarea = screen.getByPlaceholderText(/Rédigez vos notes partagées ici/i);
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toBe('');
    expect(container).toBeInTheDocument();
  });

  test('NotesModal renders safely with null props', () => {
    const { container } = render(<NotesModal isOpen={true} />);
    expect(container).toBeInTheDocument();
    const textarea = screen.getByPlaceholderText(/Rédigez vos notes partagées ici/i);
    expect(textarea).toBeInTheDocument();
  });

  test('CloudOfficeSuiteModal renders Docs tab safely with empty props and empty content string', () => {
    render(
      <CloudOfficeSuiteModal
        isOpen={true}
        onClose={jest.fn()}
        initialTab="docs"
      />
    );

    const textarea = screen.getByPlaceholderText(/Rédigez ici vos comptes-rendus/i);
    expect(textarea).toBeInTheDocument();
    expect(typeof textarea.value).toBe('string');
  });

  test('CloudOfficeSuiteModal renders Sheets tab safely with null cells without TypeError', () => {
    render(
      <CloudOfficeSuiteModal
        isOpen={true}
        onClose={jest.fn()}
        initialTab="sheets"
        document={{ gridData: null, cells: null }}
      />
    );

    const formulaInput = screen.getByPlaceholderText(/Valeur ou Formule/i);
    expect(formulaInput).toBeInTheDocument();
    expect(formulaInput.value).toBe('Tâche / Livrable');
  });

  test('CloudOfficeSuiteModal renders Slides tab safely with null slides array', () => {
    render(
      <CloudOfficeSuiteModal
        isOpen={true}
        onClose={jest.fn()}
        initialTab="slides"
        document={{ slides: null }}
      />
    );

    const slideTitleInput = screen.getByPlaceholderText(/Titre de la diapositive/i);
    expect(slideTitleInput).toBeInTheDocument();
    expect(typeof slideTitleInput.value).toBe('string');
  });

  test('TrocoDocs defensive component renders safely without crashing', () => {
    const { container } = render(
      <TrocoDocs
        isOpen={true}
        onClose={jest.fn()}
      />
    );

    expect(container).toBeInTheDocument();
    const textarea = screen.getByPlaceholderText(/Rédigez ici vos comptes-rendus/i);
    expect(textarea).toBeInTheDocument();
  });
});
