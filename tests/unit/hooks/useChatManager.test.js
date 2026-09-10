import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
global.window = dom.window;
Object.defineProperty(global, 'document', { value: dom.window.document, configurable: true, writable: true });
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true, writable: true });
global.localStorage = dom.window.localStorage;
global.sessionStorage = dom.window.sessionStorage;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent;

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatManager } from '../../../src/hooks/useChatManager';

// Mocking dependencies to isolate hook logic
vi.mock('../../../src/firebase', () => ({
  auth: { currentUser: { uid: 'user_alice_uid', displayName: 'Alice' } },
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((db, ...path) => ({ path: path.join('/') })),
  doc: vi.fn((db, ...path) => ({ id: path[path.length - 1], path: path.join('/') })),
  addDoc: vi.fn().mockResolvedValue({ id: 'new_msg_doc' }),
  setDoc: vi.fn().mockResolvedValue(),
  updateDoc: vi.fn().mockResolvedValue(),
  deleteDoc: vi.fn().mockResolvedValue(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  onSnapshot: vi.fn(() => vi.fn()),
  query: vi.fn(),
  orderBy: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  serverTimestamp: vi.fn(() => 'MOCK_SERVER_TIMESTAMP'),
  increment: vi.fn((n) => n),
  runTransaction: vi.fn(),
}));

vi.mock('../../../src/utils/haptics', () => ({
  hapticLight: vi.fn(),
  hapticSuccess: vi.fn(),
  hapticError: vi.fn(),
}));

vi.mock('../../../src/utils/audioService', () => ({
  playBetclicBalanceSound: vi.fn(),
  playApplePaySound: vi.fn(),
  playSwooshSound: vi.fn(),
}));

vi.mock('../../../src/services/audioService', () => ({
  playPop: vi.fn(),
  playSuccessChime: vi.fn(),
}));

describe('💬 useChatManager Unit Tests Suite [VERIF-03]', () => {
  const mockProfile = {
    uid: 'user_alice_uid',
    name: 'Alice',
    euroBalance: 100,
    trocoTokens: 5,
  };

  const defaultProps = {
    profile: mockProfile,
    setProfile: vi.fn(),
    auth: { currentUser: { uid: 'user_alice_uid' } },
    db: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('1. Initialise les états par défaut correctement', () => {
    const { result } = renderHook(() => useChatManager(defaultProps));

    expect(result.current.selectedChat).toBeNull();
    expect(result.current.messageDraft).toBe('');
    expect(result.current.isCounterOfferOpen).toBe(false);
    expect(Array.isArray(result.current.chatsList)).toBe(true);
  });

  it('2. handleSelectChat sélectionne le chat et l enregistre dans readChats', () => {
    const { result } = renderHook(() => useChatManager(defaultProps));

    const targetChat = {
      id: 'chat_alice_bob',
      partnerUid: 'user_bob_uid',
      partnerName: 'Bob',
      participantUids: ['user_alice_uid', 'user_bob_uid'],
    };

    act(() => {
      result.current.handleSelectChat(targetChat);
    });

    expect(result.current.selectedChat).toEqual(targetChat);
    expect(result.current.readChats.has('chat_alice_bob')).toBe(true);
  });

  it('3. handleTypingChange met à jour le brouillon local', () => {
    const { result } = renderHook(() => useChatManager(defaultProps));

    act(() => {
      result.current.handleTypingChange('Proposition de troc');
    });

    expect(result.current.messageDraft).toBe('Proposition de troc');
  });

  it('4. buildConversationId génère un identifiant unique et trié indépendamment de l ordre', () => {
    const { result } = renderHook(() => useChatManager(defaultProps));

    const id1 = result.current.buildConversationId('listing_1', 'Alice', 'Bob', 'uid_a', 'uid_b');
    const id2 = result.current.buildConversationId('listing_1', 'Bob', 'Alice', 'uid_b', 'uid_a');

    expect(id1).toBe(id2);
    expect(id1).toBe('chat_uid_a_uid_b_listing_1');
  });

  it('5. openCounterOffer initialise le brouillon et ouvre la modale', () => {
    const { result } = renderHook(() => useChatManager(defaultProps));

    act(() => {
      result.current.handleSelectChat({ id: 'chat_123', partnerUid: 'user_bob' });
    });

    act(() => {
      result.current.openCounterOffer(
        {
          euroAmount: 25,
          trocoTokens: 2,
          conditions: 'Matériel inclus',
        },
        'deal_123'
      );
    });

    expect(result.current.editingDealId).toBe('deal_123');
    expect(result.current.isCounterOfferOpen).toBe(true);
    expect(result.current.counterOfferDraft.euroAmount).toBe('25');
    expect(result.current.counterOfferDraft.conditions).toBe('Matériel inclus');
  });

  it('6. handleSendMessage ignore les envois vides ou constitués d espaces', async () => {
    const { result } = renderHook(() => useChatManager(defaultProps));

    act(() => {
      result.current.setMessageDraft('   ');
    });

    await act(async () => {
      await result.current.handleSendMessage();
    });

    expect(result.current.messageDraft).toBe('   ');
  });

  it('7. [FIX-CHAT] handleSendMessage envoie un message texte direct via addDoc sans dépendre des participants', async () => {
    const { addDoc, updateDoc } = await import('firebase/firestore');
    const { result } = renderHook(() => useChatManager(defaultProps));

    act(() => {
      result.current.handleSelectChat({ id: 'chat_test_123', partnerUid: 'bob_123' });
    });

    await act(async () => {
      await result.current.handleSendMessage('Bonjour Alice !');
    });

    expect(addDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'chats/chat_test_123/messages' }),
      expect.objectContaining({
        content: 'Bonjour Alice !',
        text: 'Bonjour Alice !',
        senderUid: 'user_alice_uid',
        status: 'sent',
      })
    );
    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'chats/chat_test_123' }),
      expect.objectContaining({
        lastMessage: 'Bonjour Alice !',
      })
    );
  });

  it('8. [FIX-CHAT] handleSendMessage vide messageDraft lors de l envoi réussi', async () => {
    const { result } = renderHook(() => useChatManager(defaultProps));

    act(() => {
      result.current.handleSelectChat({ id: 'chat_test_456', partnerUid: 'charlie' });
      result.current.setMessageDraft('Message depuis draft');
    });

    await act(async () => {
      await result.current.handleSendMessage();
    });

    expect(result.current.messageDraft).toBe('');
  });
});
