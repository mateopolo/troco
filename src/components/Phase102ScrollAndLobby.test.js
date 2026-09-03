import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import WhiteboardLobby from './WhiteboardLobby';
import CollaborativeWhiteboardModal from './CollaborativeWhiteboardModal';

import { onSnapshot } from 'firebase/firestore';

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

describe('PHASE 102 : Scroll & Whiteboard Lobby Routing', () => {
  beforeEach(() => {
    onSnapshot.mockImplementation((q, cb) => {
      cb({
        forEach: (fn) => {
          fn({
            id: 'test_recent_board',
            data: () => ({
              id: 'test_recent_board',
              title: 'Dernier Croquis Validé',
              version: 'V3',
              updatedAt: { toMillis: () => Date.now() - 60000 },
            }),
          });
        },
      });
      return jest.fn();
    });
  });
  test('WhiteboardLobby renders 2 big centered buttons: Créer un nouveau tableau and Reprendre le dernier tableau', async () => {
    const handleSelect = jest.fn();
    const handleCreate = jest.fn();

    render(
      <WhiteboardLobby
        chatId="chat_phase102"
        onSelect={handleSelect}
        onCreateNew={handleCreate}
      />
    );

    const createBtn = screen.getByText(/Créer un nouveau tableau/i);
    expect(createBtn).toBeInTheDocument();
    fireEvent.click(createBtn);
    expect(handleCreate).toHaveBeenCalledTimes(1);

    await screen.findAllByText(/Dernier Croquis Validé/i);
    const resumeBtn = screen.getByText(/Reprendre le dernier tableau/i);
    expect(resumeBtn).toBeInTheDocument();
    fireEvent.click(resumeBtn);
    expect(handleSelect).toHaveBeenCalledWith('test_recent_board');
  });

  test('CollaborativeWhiteboardModal forces Lobby when currentBoardId is null', () => {
    const { container } = render(
      <CollaborativeWhiteboardModal
        isOpen={true}
        boardId={null}
        workspaceId={null}
        groupId="group_test_lobby"
      />
    );

    expect(screen.getByText(/Bienvenue dans votre Studio Whiteboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Créer un nouveau tableau/i)).toBeInTheDocument();
    expect(screen.getByText(/Reprendre le dernier tableau/i)).toBeInTheDocument();
  });
});
