// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { useDealActions } from '../../src/hooks/useDealActions';
import ChatView from '../../src/components/ChatView';

// Mock dependencies
vi.mock('../../src/firebase', () => ({
  auth: {
    currentUser: { uid: 'user_alice', displayName: 'Alice' },
  },
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, ...parts) => ({ path: parts.join('/') })),
  collection: vi.fn((_db, ...parts) => ({ path: parts.join('/') })),
  updateDoc: vi.fn(() => Promise.resolve()),
  setDoc: vi.fn(() => Promise.resolve()),
  getDoc: vi.fn(() => Promise.resolve({
    exists: () => true,
    data: () => ({ swapConfirmedBy: ['user_alice'] }),
  })),
  arrayUnion: vi.fn((...items) => items),
  increment: vi.fn((n) => n),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  onSnapshot: vi.fn(() => () => {}),
  addDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  getDocs: vi.fn(() => Promise.resolve({ empty: true, docs: [] })),
}));

vi.mock('../../src/services/dealService', () => ({
  dealService: {
    transferTokensAtomically: vi.fn(),
  },
}));

vi.mock('../../src/services/paymentService', () => ({
  paymentService: {
    applyPayment: vi.fn(),
  },
}));

vi.mock('../../src/services/audioService', () => ({
  playApplePaySound: vi.fn(),
  playBetclicBalanceSound: vi.fn(),
  playPop: vi.fn(),
  playSwoosh: vi.fn(),
  playSuccessChime: vi.fn(),
}));

vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('🤝 Double validation bilatérale pour le troc pur sans monnaie [MOY-07]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Hook useDealActions - handleConfirmSwapCompletion', () => {
    it('enregistre la confirmation du premier utilisateur avec statut partiel (1/2)', async () => {
      const { getDoc, updateDoc, arrayUnion } = await import('firebase/firestore');
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ swapConfirmedBy: [] }),
      });

      const setSaveMessage = vi.fn();
      const setProfile = vi.fn();
      const { result } = renderHook(() =>
        useDealActions({
          profile: { uid: 'user_alice', name: 'Alice' },
          setProfile,
          setSaveMessage,
          safeTimeout: (fn) => fn(),
        })
      );

      let res;
      await act(async () => {
        res = await result.current.handleConfirmSwapCompletion('chat_123', 'deal_msg_456', {
          partnerUid: 'user_bob',
        });
      });

      expect(res.success).toBe(true);
      expect(res.isFullyConfirmed).toBe(false);
      expect(res.swapConfirmedBy).toEqual(['user_alice']);
      expect(arrayUnion).toHaveBeenCalledWith('user_alice');
      expect(updateDoc).toHaveBeenCalled();
      expect(setSaveMessage).toHaveBeenCalledWith(
        expect.stringContaining('1/2')
      );
    });

    it('clôture le deal et déclenche le succès quand le 2ème participant confirme (2/2)', async () => {
      const { getDoc, updateDoc } = await import('firebase/firestore');
      const { playApplePaySound, playBetclicBalanceSound } = await import('../../src/services/audioService');

      // Bob confirme alors qu Alice a déjà confirmé
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ swapConfirmedBy: ['user_alice'] }),
      });

      const setSaveMessage = vi.fn();
      const setProfile = vi.fn();
      const { result } = renderHook(() =>
        useDealActions({
          profile: { uid: 'user_bob', name: 'Bob' },
          setProfile,
          setSaveMessage,
          playApplePaySound,
          playBetclicBalanceSound,
          safeTimeout: (fn) => fn(),
        })
      );

      let res;
      await act(async () => {
        res = await result.current.handleConfirmSwapCompletion('chat_123', 'deal_msg_456', {
          partnerUid: 'user_alice',
        });
      });

      expect(res.success).toBe(true);
      expect(res.isFullyConfirmed).toBe(true);
      expect(res.swapConfirmedBy).toContain('user_alice');
      expect(res.swapConfirmedBy).toContain('user_bob');
      expect(updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'chats/chat_123/messages/deal_msg_456' }),
        expect.objectContaining({
          status: 'confirmed',
          dealStatus: 'confirmed',
          swapCompleted: true,
          isClosed: true,
        })
      );
      expect(playApplePaySound).toHaveBeenCalled();
      expect(playBetclicBalanceSound).toHaveBeenCalledWith(true);
      expect(setProfile).toHaveBeenCalled();
      expect(setSaveMessage).toHaveBeenCalledWith(
        expect.stringContaining('Troc validé par les deux participants')
      );
    });

    it('refuse la confirmation si l utilisateur n est pas connecté', async () => {
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const { auth } = await import('../../src/firebase');
      const prevUser = auth.currentUser;
      auth.currentUser = null;

      const { result } = renderHook(() =>
        useDealActions({
          profile: null,
        })
      );

      let res;
      await act(async () => {
        res = await result.current.handleConfirmSwapCompletion('chat_123', 'deal_msg_456');
      });

      expect(res.success).toBe(false);
      expect(alertMock).toHaveBeenCalled();
      auth.currentUser = prevUser;
      alertMock.mockRestore();
    });
  });

  describe('2. Interface ChatView - Affichage & interaction du troc pur', () => {
    it('affiche le bouton "Confirmer la fin du troc" pour un troc pur sans monnaie ni jetons', () => {
      const mockChat = {
        id: 'chat_room_pure',
        user: 'Bob',
        partnerUid: 'user_bob',
      };

      const mockDealMsg = {
        id: 'deal_pure_1',
        type: 'deal_proposal',
        status: 'accepted',
        senderId: 'user_bob',
        senderName: 'Bob',
        terms: {
          title: 'Cours de guitare acoustique',
          hours: 2,
          tokens: 0,
          fiatAmount: 0,
        },
        swapConfirmedBy: [],
      };

      const handleConfirmSwapCompletionMock = vi.fn();

      render(
        <ChatView
          isMobile={false}
          selectedChat={mockChat}
          chatThreads={{
            chat_room_pure: [mockDealMsg],
          }}
          profile={{ uid: 'user_alice', name: 'Alice' }}
          handleConfirmSwapCompletion={handleConfirmSwapCompletionMock}
          t={(k, def) => def || k}
        />
      );

      expect(screen.getByTestId('pure-swap-bilateral-container')).toBeTruthy();
      expect(screen.getByTestId('swap-confirmation-count').textContent).toContain('0/2');
      const confirmBtn = screen.getByTestId('confirm-swap-completion-btn');
      expect(confirmBtn).toBeTruthy();
      expect(confirmBtn.textContent).toContain('Confirmer la fin du troc');

      fireEvent.click(confirmBtn);
      expect(handleConfirmSwapCompletionMock).toHaveBeenCalledWith(
        'chat_room_pure',
        'deal_pure_1',
        expect.any(Object)
      );
    });

    it('affiche le badge d attente (1/2) si l utilisateur courant a déjà confirmé', () => {
      const mockChat = {
        id: 'chat_room_pure',
        user: 'Bob',
        partnerUid: 'user_bob',
      };

      const mockDealMsg = {
        id: 'deal_pure_2',
        type: 'deal_proposal',
        status: 'accepted',
        senderId: 'user_bob',
        senderName: 'Bob',
        terms: {
          title: 'Aide déménagement',
          tokens: 0,
          fiatAmount: 0,
        },
        swapConfirmedBy: ['user_alice'],
      };

      render(
        <ChatView
          isMobile={false}
          activeTab="chat"
          selectedChat={mockChat}
          chatThreads={{
            chat_room_pure: [mockDealMsg],
          }}
          profile={{ uid: 'user_alice', name: 'Alice' }}
          t={(k, def) => def || k}
        />
      );

      expect(screen.getByTestId('swap-confirmation-count').textContent).toContain('1/2');
      expect(screen.getByTestId('swap-waiting-partner-badge')).toBeTruthy();
      expect(screen.queryByTestId('confirm-swap-completion-btn')).toBeNull();
    });

    it('affiche le badge de validation finale (2/2) dès que les deux participants ont confirmé', () => {
      const mockChat = {
        id: 'chat_room_pure',
        user: 'Bob',
        partnerUid: 'user_bob',
      };

      const mockDealMsg = {
        id: 'deal_pure_3',
        type: 'deal_proposal',
        status: 'confirmed',
        senderId: 'user_bob',
        senderName: 'Bob',
        terms: {
          title: 'Réparation vélo',
          tokens: 0,
          fiatAmount: 0,
        },
        swapConfirmedBy: ['user_alice', 'user_bob'],
      };

      render(
        <ChatView
          isMobile={false}
          selectedChat={mockChat}
          chatThreads={{
            chat_room_pure: [mockDealMsg],
          }}
          profile={{ uid: 'user_alice', name: 'Alice' }}
          t={(k, def) => def || k}
        />
      );

      expect(screen.getByTestId('swap-confirmation-count').textContent).toContain('2/2');
      const completedBadge = screen.getByTestId('swap-completed-bilateral-badge');
      expect(completedBadge).toBeTruthy();
      expect(completedBadge.textContent).toContain('Troc clôturé avec succès');
      expect(screen.queryByTestId('confirm-swap-completion-btn')).toBeNull();
    });

    it('n affiche PAS le conteneur de troc pur si le deal comporte des euros ou des jetons (utilise le séquestre)', () => {
      const mockChat = {
        id: 'chat_room_paid',
        user: 'Bob',
        partnerUid: 'user_bob',
      };

      const mockDealWithTokens = {
        id: 'deal_tokens_1',
        type: 'deal_proposal',
        status: 'escrow_locked',
        senderId: 'user_bob',
        senderName: 'Bob',
        terms: {
          title: 'Consultation juridique',
          tokens: 5,
          fiatAmount: 0,
        },
        swapConfirmedBy: [],
      };

      render(
        <ChatView
          isMobile={false}
          selectedChat={mockChat}
          chatThreads={{
            chat_room_paid: [mockDealWithTokens],
          }}
          profile={{ uid: 'user_alice', name: 'Alice' }}
          t={(k, def) => def || k}
        />
      );

      expect(screen.queryByTestId('pure-swap-bilateral-container')).toBeNull();
      expect(screen.getByText(/Séquestre Financier Troco Sécurisé/i)).toBeTruthy();
    });
  });
});
