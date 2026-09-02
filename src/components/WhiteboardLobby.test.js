import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import WhiteboardLobby from './WhiteboardLobby';
import { onSnapshot } from 'firebase/firestore';

jest.mock('../firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(),
}));

describe('WhiteboardLobby Component', () => {
  const mockOnSelectBoard = jest.fn();
  const mockOnCreateNewBoard = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnSelectBoard.mockClear();
    mockOnCreateNewBoard.mockClear();
    mockOnClose.mockClear();

    onSnapshot.mockImplementation((q, callback) => {
      callback({
        forEach: (fn) => {
          fn({
            id: 'test_board_1',
            data: () => ({
              id: 'test_board_1',
              title: 'Croquis Prototype Deal',
              version: 2,
              versionNumber: 2,
              updatedAt: { toMillis: () => Date.now() - 300000 },
              thumbnailBase64: 'data:image/jpeg;base64,mockthumb',
              lastModifiedByName: 'Sarah',
            }),
          });
        },
      });
      return jest.fn();
    });
  });

  test('renders header and main create button', async () => {
    render(
      <WhiteboardLobby
        chatId="chat_123"
        onSelectBoard={mockOnSelectBoard}
        onCreateNewBoard={mockOnCreateNewBoard}
        onClose={mockOnClose}
        darkMode={false}
      />
    );

    expect(screen.getByRole('heading', { name: /Tableaux Blancs/i })).toBeInTheDocument();
    expect(screen.getByText(/Créer un nouveau tableau blanc/i)).toBeInTheDocument();
  });

  test('calls onCreateNewBoard when clicking the primary action button', async () => {
    render(
      <WhiteboardLobby
        chatId="chat_123"
        onSelectBoard={mockOnSelectBoard}
        onCreateNewBoard={mockOnCreateNewBoard}
        onClose={mockOnClose}
      />
    );

    const createBtn = screen.getByText(/Créer un nouveau tableau blanc/i).closest('button');
    expect(createBtn).toBeInTheDocument();
    fireEvent.click(createBtn);

    expect(mockOnCreateNewBoard).toHaveBeenCalledTimes(1);
  });

  test('displays existing boards and triggers onSelectBoard on click', async () => {
    render(
      <WhiteboardLobby
        chatId="chat_123"
        onSelectBoard={mockOnSelectBoard}
        onCreateNewBoard={mockOnCreateNewBoard}
        onClose={mockOnClose}
      />
    );

    const titleElement = await screen.findByText('Croquis Prototype Deal');
    expect(titleElement).toBeInTheDocument();
    expect(await screen.findByText('V2')).toBeInTheDocument();
    expect(await screen.findByText('Sarah')).toBeInTheDocument();

    const card = titleElement.closest('.whiteboard-card');
    expect(card).toBeInTheDocument();
    fireEvent.click(card);

    expect(mockOnSelectBoard).toHaveBeenCalledWith('test_board_1', expect.objectContaining({
      id: 'test_board_1',
      title: 'Croquis Prototype Deal',
    }));
  });

  test('calls onClose when clicking close button', async () => {
    render(
      <WhiteboardLobby
        chatId="chat_123"
        onSelectBoard={mockOnSelectBoard}
        onCreateNewBoard={mockOnCreateNewBoard}
        onClose={mockOnClose}
      />
    );

    const closeBtn = screen.getByTitle(/Fermer et revenir au chat/i);
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
