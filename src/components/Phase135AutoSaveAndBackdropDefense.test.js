import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import CloudOfficeSuiteModal from './CloudOfficeSuiteModal';
import * as firestore from 'firebase/firestore';

// Mock Firebase
jest.mock('../firebase', () => ({
  db: { id: 'mock-db' },
  storage: {},
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({ id: 'mock-doc' })),
  updateDoc: jest.fn(() => Promise.resolve()),
  setDoc: jest.fn(() => Promise.resolve()),
  onSnapshot: jest.fn(() => () => {}),
  collection: jest.fn(),
  addDoc: jest.fn(() => Promise.resolve()),
  serverTimestamp: jest.fn(() => 'mock-server-timestamp'),
}));

describe('PHASE 135: Auto-Save Debounce & Accidental Backdrop Closure Defense', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    firestore.doc.mockReturnValue({ id: 'mock-doc' });
    firestore.updateDoc.mockResolvedValue();
    firestore.setDoc.mockResolvedValue();
    firestore.onSnapshot.mockReturnValue(() => {});
    firestore.serverTimestamp.mockReturnValue('mock-server-timestamp');
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('1. Backdrop click does NOT trigger onClose (Accidental closure blocked)', () => {
    const handleClose = jest.fn();
    const { baseElement } = render(
      <CloudOfficeSuiteModal
        isOpen={true}
        onClose={handleClose}
        document={{ title: 'Document de Test', content: 'Contenu initial' }}
      />
    );

    // Overlay / Backdrop is the outer fixed container
    const backdrop = baseElement.querySelector('.fixed.inset-0.z-\\[999999\\]');
    expect(backdrop).toBeInTheDocument();

    // Clicking the backdrop
    fireEvent.click(backdrop);

    // onClose MUST NOT be called on backdrop click
    expect(handleClose).not.toHaveBeenCalled();

    // Clicking the explicit "Fermer" (X) button DOES call onClose
    const closeBtn = screen.getByTitle('Fermer');
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('2. Auto-save debounces 1500ms and updates Firestore with updateDoc', async () => {
    render(
      <CloudOfficeSuiteModal
        isOpen={true}
        onClose={() => {}}
        groupId="group_123"
        docId="doc_123"
        document={{ title: 'Document de Test', content: 'Texte initial' }}
      />
    );

    // Status is initially synchronized
    expect(screen.getByText(/Synchronisé en direct/i)).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/Rédigez ici vos comptes-rendus/i);
    expect(textarea).toBeInTheDocument();

    // User types in the document
    act(() => {
      fireEvent.change(textarea, { target: { value: 'Texte modifié première frappe' } });
    });

    // Should indicate "Sauvegarde..."
    expect(screen.getByText(/Sauvegarde/i)).toBeInTheDocument();

    // At 500ms, updateDoc should NOT have been called yet
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(firestore.updateDoc).not.toHaveBeenCalled();

    // User types again before 1500ms (resets debounce timer)
    act(() => {
      fireEvent.change(textarea, { target: { value: 'Texte modifié deuxième frappe' } });
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    // Still not called because timer was reset
    expect(firestore.updateDoc).not.toHaveBeenCalled();

    // Advance remaining time past 1500ms
    await act(async () => {
      jest.advanceTimersByTime(600);
      await Promise.resolve();
    });

    // Now updateDoc must have been called exactly once with final content
    expect(firestore.updateDoc).toHaveBeenCalledTimes(1);
    expect(firestore.updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        content: 'Texte modifié deuxième frappe',
        lastEdited: 'mock-server-timestamp',
      })
    );
  });
});
