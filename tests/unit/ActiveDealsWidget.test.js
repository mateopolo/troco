// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ActiveDealsWidget, { getActiveDealsFromChats } from '../../src/components/ActiveDealsWidget';
import { useChatStore } from '../../src/stores/useChatStore';

vi.mock('../../src/utils/haptics', () => ({
  default: {
    light: vi.fn(),
    success: vi.fn(),
  },
  safeVibrate: vi.fn(),
}));

describe('ActiveDealsWidget component [MOY-05]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.setState({
      chatsList: [],
      chatThreads: {},
      selectedChat: null,
    });
  });

  describe('getActiveDealsFromChats helper', () => {
    it('returns empty array when chatsList is empty or invalid', () => {
      expect(getActiveDealsFromChats([])).toEqual([]);
      expect(getActiveDealsFromChats(null)).toEqual([]);
      expect(getActiveDealsFromChats(undefined)).toEqual([]);
    });

    it('identifies chats with active lastDealStatus (pending, in_progress, escrow_locked)', () => {
      const mockChats = [
        {
          id: 'chat_1',
          user: 'Alice',
          listing: 'Cours de guitare',
          lastDealStatus: 'pending',
          tokensAmount: 2,
        },
        {
          id: 'chat_2',
          user: 'Bob',
          listing: 'Réparation vélo',
          lastDealStatus: 'in_progress',
          euroAmount: 30,
        },
        {
          id: 'chat_3',
          user: 'Charlie',
          listing: 'Prêt perceuse',
          lastDealStatus: 'declined', // Inactif
        },
        {
          id: 'chat_4',
          user: 'David',
          listing: 'Jardinage',
          lastDealStatus: 'completed', // Inactif
        },
      ];

      const active = getActiveDealsFromChats(mockChats);
      expect(active).toHaveLength(2);
      expect(active[0].partnerName).toBe('Alice');
      expect(active[0].status).toBe('pending');
      expect(active[0].tokensAmount).toBe(2);
      expect(active[1].partnerName).toBe('Bob');
      expect(active[1].status).toBe('in_progress');
      expect(active[1].euroAmount).toBe(30);
    });

    it('identifies deals from chatThreads when messages contain active proposal', () => {
      const mockChats = [
        {
          id: 'chat_with_thread',
          user: 'Emma',
          listing: 'Cours d’espagnol',
        },
      ];

      const mockThreads = {
        chat_with_thread: [
          { id: 'm1', text: 'Bonjour' },
          {
            id: 'm2',
            type: 'deal_proposal',
            status: 'pending',
            dealTerms: {
              tokens: 3,
              serviceTitle: 'Espagnol intensif',
            },
          },
        ],
      };

      const active = getActiveDealsFromChats(mockChats, mockThreads);
      expect(active).toHaveLength(1);
      expect(active[0].partnerName).toBe('Emma');
      expect(active[0].tokensAmount).toBe(3);
      expect(active[0].status).toBe('pending');
    });
  });

  describe('Component Rendering', () => {
    it('returns null and renders nothing when there are no active deals', () => {
      const { container } = render(<ActiveDealsWidget />);
      expect(container.firstChild).toBeNull();
      expect(screen.queryByTestId('active-deals-widget')).toBeNull();
    });

    it('renders the widget when active deals are passed via props', () => {
      const mockDeals = [
        {
          id: 'deal_1',
          chatId: 'chat_1',
          partnerName: 'Sophie',
          partnerAvatar: 'https://example.com/avatar.jpg',
          listingTitle: 'Cours de piano',
          status: 'pending',
          tokensAmount: 2,
          euroAmount: 0,
        },
      ];

      render(<ActiveDealsWidget deals={mockDeals} />);

      const widget = screen.getByTestId('active-deals-widget');
      expect(widget).toBeDefined();
      expect(screen.getByText('Mes deals en cours')).toBeDefined();
      expect(screen.getByText('Sophie')).toBeDefined();
      expect(screen.getByText('Cours de piano')).toBeDefined();
      expect(screen.getByText('2 Jetons')).toBeDefined();
      expect(screen.getByText('Proposition en attente')).toBeDefined();
      expect(screen.getByTestId('resume-deal-btn')).toBeDefined();
    });

    it('renders automatically when useChatStore contains active deals', () => {
      useChatStore.setState({
        chatsList: [
          {
            id: 'chat_store_1',
            user: 'Lucas',
            listing: 'Dépannage plomberie',
            lastDealStatus: 'escrow_locked',
            tokensAmount: 1,
          },
        ],
      });

      render(<ActiveDealsWidget />);

      expect(screen.getByTestId('active-deals-widget')).toBeDefined();
      expect(screen.getByText('Lucas')).toBeDefined();
      expect(screen.getByText('Dépannage plomberie')).toBeDefined();
      expect(screen.getByText('Escrow sécurisé')).toBeDefined();
    });

    it('renders direct swap badge when no tokens or euros are involved', () => {
      const mockDeals = [
        {
          id: 'deal_swap',
          chatId: 'chat_swap',
          partnerName: 'Marc',
          listingTitle: 'Échange plantes',
          status: 'troc_in_progress',
          tokensAmount: 0,
          euroAmount: 0,
        },
      ];

      render(<ActiveDealsWidget deals={mockDeals} />);

      expect(screen.getByText('Troc direct de service')).toBeDefined();
      expect(screen.getByText('Troc en cours')).toBeDefined();
    });

    it('handles resume button click: triggers onOpenChat, updates store, and dispatches troco:open_chat event', () => {
      const onOpenChat = vi.fn();
      const eventSpy = vi.fn();
      window.addEventListener('troco:open_chat', eventSpy);

      const mockDeals = [
        {
          id: 'deal_click',
          chatId: 'chat_click',
          partnerName: 'Camille',
          listingTitle: 'Peinture salon',
          status: 'pending',
          tokensAmount: 5,
        },
      ];

      render(<ActiveDealsWidget deals={mockDeals} onOpenChat={onOpenChat} />);

      const resumeBtn = screen.getByTestId('resume-deal-btn');
      fireEvent.click(resumeBtn);

      expect(onOpenChat).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'chat_click',
          user: 'Camille',
        })
      );

      expect(eventSpy).toHaveBeenCalled();
      const dispatchedEvent = eventSpy.mock.calls[0][0];
      expect(dispatchedEvent.detail.chatId).toBe('chat_click');
      expect(dispatchedEvent.detail.user).toBe('Camille');

      window.removeEventListener('troco:open_chat', eventSpy);
    });

    it('supports custom translation function prop', () => {
      const customT = (k) => {
        if (k === 'dealsWidget.title') return 'My Active Negotiations';
        if (k === 'dealsWidget.resumeChat') return 'Continue';
        return k;
      };

      const mockDeals = [
        {
          id: 'deal_i18n',
          chatId: 'chat_i18n',
          partnerName: 'John',
          listingTitle: 'English lessons',
          status: 'pending',
          tokensAmount: 1,
        },
      ];

      render(<ActiveDealsWidget deals={mockDeals} t={customT} />);

      expect(screen.getByText('My Active Negotiations')).toBeDefined();
      expect(screen.getByText('Continue')).toBeDefined();
    });
  });
});
