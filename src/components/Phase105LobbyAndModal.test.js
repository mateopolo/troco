import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import WhiteboardLobby from './WhiteboardLobby';
import { onSnapshot } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

jest.mock('../firebase', () => ({
  db: { type: 'mock-db' },
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false })),
  setDoc: jest.fn(() => Promise.resolve()),
  serverTimestamp: jest.fn(() => ({})),
}));

describe('PHASE 105 : Fix Double Rendu Modale & Logique Lobby Whiteboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('App.js only renders LanguageSelectModal once and does not contain duplicate inline language modal', () => {
    const appJsPath = path.resolve(__dirname, '../App.js');
    const appJsContent = fs.readFileSync(appJsPath, 'utf8');

    // Verification 1: Exactly one <LanguageSelectModal rendered
    const matches = appJsContent.match(/<LanguageSelectModal/g);
    expect(matches).not.toBeNull();
    expect(matches.length).toBe(1);

    // Verification 2: No duplicate inline modal on isLangModalOpen
    expect(appJsContent).not.toContain('{isLangModalOpen && (');
  });

  test('WhiteboardLobby sorts history by lastModified descending and passes latest board ID to onSelect', async () => {
    const mockOnSelect = jest.fn();
    const mockOnCreateNew = jest.fn();

    // Mock returns 2 boards with different timestamps
    onSnapshot.mockImplementation((q, cb) => {
      cb({
        forEach: (fn) => {
          // Ancien tableau
          fn({
            id: 'board_older',
            data: () => ({
              id: 'board_older',
              title: 'Ancien Tableau',
              versionNumber: 1,
              updatedAt: { toMillis: () => 100000 },
            }),
          });
          // Nouveau tableau (plus récent)
          fn({
            id: 'board_latest',
            data: () => ({
              id: 'board_latest',
              title: 'Dernier Tableau Tout Frais',
              versionNumber: 2,
              updatedAt: { toMillis: () => 900000 },
            }),
          });
        },
      });
      return jest.fn();
    });

    render(
      <WhiteboardLobby
        chatId="chat_test_105"
        onSelect={mockOnSelect}
        onCreateNew={mockOnCreateNew}
      />
    );

    await screen.findAllByText(/Dernier Tableau Tout Frais/i);

    const resumeBtn = screen.getByText(/Reprendre le dernier tableau/i);
    fireEvent.click(resumeBtn);

    // The most recent board ID (board_latest) must be passed to onSelect
    expect(mockOnSelect).toHaveBeenCalledWith('board_latest');
    expect(mockOnCreateNew).not.toHaveBeenCalled();
  });

  test('WhiteboardLobby falls back to onCreateNew when history is empty', () => {
    const mockOnSelect = jest.fn();
    const mockOnCreateNew = jest.fn();

    onSnapshot.mockImplementation((q, cb) => {
      cb({
        forEach: () => {},
      });
      return jest.fn();
    });

    render(
      <WhiteboardLobby
        chatId="chat_empty_105"
        onSelect={mockOnSelect}
        onCreateNew={mockOnCreateNew}
      />
    );

    const resumeBtn = screen.getByText(/Reprendre le dernier tableau/i);
    fireEvent.click(resumeBtn);

    expect(mockOnCreateNew).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).not.toHaveBeenCalled();
  });
});
