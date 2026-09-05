import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import WhiteboardLobby from './WhiteboardLobby';
import ChatHeader from './ChatHeader';
import MobileHeader from './common/MobileHeader';
import CollaborativeWhiteboardModal from './CollaborativeWhiteboardModal';
import { onSnapshot, setDoc, deleteDoc, getDoc } from 'firebase/firestore';

jest.mock('../firebase', () => ({
  db: { type: 'mock-db' },
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false, data: () => ({}) })),
  setDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  serverTimestamp: jest.fn(() => ({})),
}));

jest.mock('../services/whiteboardP2PService', () => ({
  whiteboardP2PService: {
    joinRoom: jest.fn(),
    leaveRoom: jest.fn(),
    broadcastDraw: jest.fn(),
    broadcastEvent: jest.fn(),
  },
}));

describe('Phase 127: Fix Dead Buttons for Whiteboard Creation (Header & Lobby)', () => {
  beforeAll(() => {
    HTMLCanvasElement.prototype.getContext = () => ({
      clearRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
      arc: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      fillText: jest.fn(),
      measureText: () => ({ width: 50 }),
      save: jest.fn(),
      restore: jest.fn(),
      scale: jest.fn(),
      translate: jest.fn(),
      setLineDash: jest.fn(),
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    setDoc.mockImplementation(() => Promise.resolve());
    deleteDoc.mockImplementation(() => Promise.resolve());
    getDoc.mockImplementation(() => Promise.resolve({ exists: () => false, data: () => ({}) }));
    onSnapshot.mockImplementation((q, cb) => {
      cb({
        forEach: () => {},
        docChanges: () => [],
        exists: () => false,
        data: () => ({}),
      });
      return jest.fn();
    });
  });

  describe('1. Header Chat Whiteboard Button Repair', () => {
    test('ChatHeader renders quick-access Whiteboard button and triggers openWorkspaceTool("whiteboard")', () => {
      const mockOpenWorkspaceTool = jest.fn();
      const mockStartCall = jest.fn();

      render(
        <ChatHeader
          activeChat={{ id: 'chat_alpha', user: 'Alice' }}
          openWorkspaceTool={mockOpenWorkspaceTool}
          startCall={mockStartCall}
        />
      );

      const wbButton = screen.getByRole('button', { name: /Créer un nouveau tableau blanc/i });
      expect(wbButton).toBeInTheDocument();

      fireEvent.click(wbButton);
      expect(mockOpenWorkspaceTool).toHaveBeenCalledWith('whiteboard');
    });

    test('ChatHeader falls back to onOpenWhiteboard if openWorkspaceTool is not provided', () => {
      const mockOnOpenWhiteboard = jest.fn();

      render(
        <ChatHeader
          activeChat={{ id: 'chat_beta', user: 'Bob' }}
          onOpenWhiteboard={mockOnOpenWhiteboard}
        />
      );

      const wbButton = screen.getByRole('button', { name: /Créer un nouveau tableau blanc/i });
      fireEvent.click(wbButton);
      expect(mockOnOpenWhiteboard).toHaveBeenCalledTimes(1);
    });

    test('MobileHeader renders Whiteboard button when showWhiteboard=true and executes openWorkspaceTool', () => {
      const mockOpenWorkspaceTool = jest.fn();

      render(
        <MobileHeader
          title="Discussion Mobile"
          showWhiteboard={true}
          openWorkspaceTool={mockOpenWorkspaceTool}
        />
      );

      const wbButton = screen.getByRole('button', { name: /Créer un nouveau tableau blanc/i });
      expect(wbButton).toBeInTheDocument();

      fireEvent.click(wbButton);
      expect(mockOpenWorkspaceTool).toHaveBeenCalledWith('whiteboard');
    });
  });

  describe('2. WhiteboardLobby Buttons Repair & Unique ID Generation', () => {
    test('"Créer un nouveau tableau blanc" generates unique ID and calls onCreateNew/onCreateNewBoard', () => {
      const mockOnCreateNew = jest.fn();

      render(
        <WhiteboardLobby
          chatId="chat_test_id"
          onCreateNew={mockOnCreateNew}
        />
      );

      const createBtn = screen.getByRole('button', { name: /Créer un nouveau tableau blanc/i });
      fireEvent.click(createBtn);

      expect(mockOnCreateNew).toHaveBeenCalledTimes(1);
      const generatedId = mockOnCreateNew.mock.calls[0][0];
      expect(typeof generatedId).toBe('string');
      expect(generatedId).toContain('board_chat_test_id_');
    });

    test('"Reprendre le dernier tableau" resumes the latest board from history', async () => {
      onSnapshot.mockImplementation((q, cb) => {
        cb({
          forEach: (fn) => {
            fn({
              id: 'board_recent_999',
              data: () => ({
                id: 'board_recent_999',
                title: 'Tableau Déjà Validé',
                versionNumber: 3,
                updatedAt: { toMillis: () => Date.now() },
              }),
            });
          },
          docChanges: () => [],
        });
        return jest.fn();
      });

      const mockOnSelect = jest.fn();

      render(
        <WhiteboardLobby
          chatId="chat_with_history"
          onSelect={mockOnSelect}
        />
      );

      await screen.findByText('Tableau Déjà Validé');

      const resumeBtn = screen.getByRole('button', { name: /Reprendre le dernier tableau/i });
      fireEvent.click(resumeBtn);

      expect(mockOnSelect).toHaveBeenCalledWith('board_recent_999');
    });

    test('"Reprendre le dernier tableau" falls back to creating a new board with unique ID when history is empty', () => {
      const mockOnCreateNew = jest.fn();

      render(
        <WhiteboardLobby
          chatId="chat_empty"
          onCreateNew={mockOnCreateNew}
        />
      );

      const resumeBtn = screen.getByRole('button', { name: /Reprendre le dernier tableau/i });
      fireEvent.click(resumeBtn);

      expect(mockOnCreateNew).toHaveBeenCalledTimes(1);
      const generatedId = mockOnCreateNew.mock.calls[0][0];
      expect(typeof generatedId).toBe('string');
      expect(generatedId).toContain('board_chat_empty_');
    });

    test('Errors in click handlers are caught silently without unhandled exceptions', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const faultyCreateNew = jest.fn(() => {
        throw new Error('Simulation crash');
      });

      render(
        <WhiteboardLobby
          chatId="chat_crash_test"
          onCreateNew={faultyCreateNew}
        />
      );

      const createBtn = screen.getByRole('button', { name: /Créer un nouveau tableau blanc/i });
      expect(() => fireEvent.click(createBtn)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('3. CollaborativeWhiteboardModal Integration', () => {
    test('CollaborativeWhiteboardModal mounts Lobby when boardId is null, and switches to Canvas on create', () => {
      render(
        <CollaborativeWhiteboardModal
          isOpen={true}
          boardId={null}
          workspaceId={null}
          groupId="group_full_flow"
        />
      );

      // Verify Lobby is active
      expect(screen.getByText(/Bienvenue dans votre Studio Whiteboard/i)).toBeInTheDocument();

      const createBtn = screen.getByRole('button', { name: /Créer un nouveau tableau blanc/i });
      act(() => {
        fireEvent.click(createBtn);
      });

      // Verify it forced view onto empty canvas (Lobby heading disappears, canvas toolbar appears)
      expect(screen.queryByText(/Bienvenue dans votre Studio Whiteboard/i)).not.toBeInTheDocument();
      expect(screen.getByDisplayValue(/Nouveau Tableau Blanc/i)).toBeInTheDocument();
      expect(screen.getByText(/Historique/i)).toBeInTheDocument();
    });
  });
});
