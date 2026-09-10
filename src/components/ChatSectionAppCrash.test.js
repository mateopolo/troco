import React from 'react';
import { render } from '@testing-library/react';
import ChatSection from '../features/chat/ChatSection';

describe('ChatSection App Crash Reproduction', () => {
  it('renders ChatSection without crashing when selectedChat is null', () => {
    const props = {
      activeTab: 'chat',
      mockChats: [
        { id: 'chat_1', user: 'Alice', avatar: 'https://avatar.cc/1', lastMessage: 'Hello', timestamp: '12:00' }
      ],
      selectedChat: null,
      setSelectedChat: jest.fn(),
      chatThreads: {
        chat_1: [{ id: 'm1', text: 'Hello', sender: 'them', timestamp: '12:00' }]
      },
      readChats: {},
      chatInputText: '',
      setChatInputText: jest.fn(),
      onTypingChange: jest.fn(),
      isThemTyping: false,
      handleSendMessage: jest.fn(),
      handleEditMessage: jest.fn(),
      handleDeleteMessage: jest.fn(),
      openCounterOffer: jest.fn(),
      startCall: jest.fn(),
      joinActiveCall: jest.fn(),
      handleAcceptDeal: jest.fn(),
      handleConfirmTrocCompletion: jest.fn(),
      handleDeclineDeal: jest.fn(),
      handleSendToken: jest.fn(),
      handleReleaseEscrow: jest.fn(),
      onCreateProjectGroup: jest.fn(),
      onProposeReward: jest.fn(),
      onAcceptReward: jest.fn(),
      onSendAudioMessage: jest.fn(),
      profile: { uid: 'user_me', name: 'Moi' },
      setProfile: jest.fn(),
      currentLang: 'fr',
      t: (k) => k,
      darkMode: false,
      getChatMessageDisplayContent: (m) => m.text,
      getListingTitleTranslation: (l) => l,
      formatStatus: (s) => s,
      showingOriginalMessages: {},
      toggleOriginalMessage: jest.fn(),
      isMobile: false,
      presenceMap: {},
      allListings: [],
      onOpenListing: jest.fn(),
    };

    expect(() => render(<ChatSection {...props} />)).not.toThrow();
  });

  it('renders ChatSection when a chat with deals is selected', () => {
    const props = {
      activeTab: 'chat',
      mockChats: [
        { id: 'chat_1', user: 'Alice', avatar: 'https://avatar.cc/1', lastMessage: 'Hello', timestamp: '12:00', uid: 'user_alice' }
      ],
      selectedChat: { id: 'chat_1', user: 'Alice', avatar: 'https://avatar.cc/1', uid: 'user_alice' },
      setSelectedChat: jest.fn(),
      chatThreads: {
        chat_1: [
          {
            id: 'deal_1',
            type: 'deal_proposal',
            sender: 'them',
            senderUid: 'user_alice',
            status: 'pending',
            dealTerms: {
              title: 'Plomberie',
              trocoTokens: 10,
              euroAmount: 0
            }
          },
          {
            id: 'deal_2',
            type: 'deal_proposal',
            sender: 'me',
            senderUid: 'user_me',
            status: 'troc_in_progress',
            dealTerms: {
              title: 'Échange service',
              trocoTokens: 0,
              euroAmount: 0
            },
            completionConfirmations: { user_alice: true }
          },
          {
            id: 'deal_3',
            type: 'deal_proposal',
            sender: 'me',
            senderUid: 'user_me',
            status: 'confirmed',
            dealTerms: {
              title: 'Échange terminé',
              trocoTokens: 0,
              euroAmount: 0
            }
          }
        ]
      },
      readChats: {},
      chatInputText: '',
      setChatInputText: jest.fn(),
      onTypingChange: jest.fn(),
      isThemTyping: false,
      handleSendMessage: jest.fn(),
      handleEditMessage: jest.fn(),
      handleDeleteMessage: jest.fn(),
      openCounterOffer: jest.fn(),
      startCall: jest.fn(),
      joinActiveCall: jest.fn(),
      handleAcceptDeal: jest.fn(),
      handleConfirmTrocCompletion: jest.fn(),
      handleDeclineDeal: jest.fn(),
      handleSendToken: jest.fn(),
      handleReleaseEscrow: jest.fn(),
      onCreateProjectGroup: jest.fn(),
      onProposeReward: jest.fn(),
      onAcceptReward: jest.fn(),
      onSendAudioMessage: jest.fn(),
      profile: { uid: 'user_me', name: 'Moi' },
      setProfile: jest.fn(),
      currentLang: 'fr',
      t: (k) => k,
      darkMode: false,
      getChatMessageDisplayContent: (m) => m.text,
      getListingTitleTranslation: (l) => l,
      formatStatus: (s) => s,
      showingOriginalMessages: {},
      toggleOriginalMessage: jest.fn(),
      isMobile: false,
      presenceMap: {},
      allListings: [],
      onOpenListing: jest.fn(),
    };

    expect(() => render(<ChatSection {...props} />)).not.toThrow();
  });
});
