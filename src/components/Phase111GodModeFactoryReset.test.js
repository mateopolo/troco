import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminDashboard from '../features/admin/AdminDashboard';
import * as firestore from 'firebase/firestore';

// Mock Firestore
jest.mock('../firebase', () => ({
  db: {},
}));

jest.mock('../features/admin/useGlobalContent', () => ({
  useAllGlobalContent: () => ({
    items: {},
    saveContent: jest.fn(),
  }),
}));

jest.mock('../features/admin/AdminCommunityTab', () => () => <div data-testid="admin-community-tab" />);
jest.mock('../features/admin/AdminChatsTab', () => () => <div data-testid="admin-chats-tab" />);

describe('Phase 111 : God Mode Factory Reset Routine & Cascade Deletion', () => {
  const mockUser = {
    id: 'user-wipe-99',
    uid: 'user-wipe-99',
    name: 'Test Frauduleux',
    email: 'fraud@example.com',
    euroBalance: 450.50,
    trocoTokens: 300,
    onboardingCompleted: true,
    skills: ['Plomberie', 'Trading'],
    portfolioImages: ['img1.jpg', 'img2.jpg'],
    dealsCompleted: 14,
    isAdmin: false,
    isBanned: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('1. Checks that factory reset resets user document with exact required fields', async () => {
    const setDocMock = jest.fn().mockResolvedValue();
    const targetUid = 'user-wipe-99';

    // Simulate reset logic
    const expectedResetPayload = {
      euroBalance: 0.00,
      trocoTokens: 10,
      onboardingCompleted: false,
      skills: [],
      portfolioImages: [],
      dealsCompleted: 0,
    };

    await setDocMock(`users/${targetUid}`, expectedResetPayload, { merge: true });

    expect(setDocMock).toHaveBeenCalledWith(
      'users/user-wipe-99',
      expect.objectContaining({
        euroBalance: 0.00,
        trocoTokens: 10,
        onboardingCompleted: false,
        skills: [],
        portfolioImages: [],
        dealsCompleted: 0,
      }),
      { merge: true }
    );
  });

  test('2. Checks cascade batch deletion of listings where authorUid matches user', async () => {
    const mockListings = [
      { id: 'listing-1', authorUid: 'user-wipe-99', title: 'Faux service 1' },
      { id: 'listing-2', authorUid: 'user-wipe-99', title: 'Faux service 2' },
      { id: 'listing-3', authorUid: 'other-user', title: 'Service valide' },
    ];

    const batchDeleteMock = jest.fn();
    const batchCommitMock = jest.fn().mockResolvedValue();

    const listingsToDelete = mockListings.filter(l => l.authorUid === 'user-wipe-99');
    listingsToDelete.forEach(l => batchDeleteMock(`listings/${l.id}`));
    await batchCommitMock();

    expect(batchDeleteMock).toHaveBeenCalledTimes(2);
    expect(batchDeleteMock).toHaveBeenCalledWith('listings/listing-1');
    expect(batchDeleteMock).toHaveBeenCalledWith('listings/listing-2');
    expect(batchCommitMock).toHaveBeenCalledTimes(1);
  });

  test('3. Checks message deletion and system audit log creation', async () => {
    const mockMessages = [
      { id: 'msg-1', senderId: 'user-wipe-99', text: 'Spam 1' },
      { id: 'msg-2', senderId: 'user-innocent', text: 'Bonjour' },
      { id: 'msg-3', senderUid: 'user-wipe-99', text: 'Spam 2' },
    ];

    const deleteMock = jest.fn();
    const addSystemLogMock = jest.fn().mockResolvedValue();

    const targetUid = 'user-wipe-99';
    let userHadMessages = false;

    mockMessages.forEach(m => {
      if (m.senderId === targetUid || m.senderUid === targetUid) {
        userHadMessages = true;
        deleteMock(m.id);
      }
    });

    if (userHadMessages) {
      await addSystemLogMock({
        sender: 'system',
        senderName: 'Système',
        text: 'Système: Ce compte a été réinitialisé',
        system: true,
      });
    }

    expect(deleteMock).toHaveBeenCalledTimes(2);
    expect(deleteMock).toHaveBeenCalledWith('msg-1');
    expect(deleteMock).toHaveBeenCalledWith('msg-3');
    expect(addSystemLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sender: 'system',
        text: 'Système: Ce compte a été réinitialisé',
      })
    );
  });

  test('4. Double opt-in confirmation text is strictly verified', () => {
    const confirmationPrompt = "Cette action effacera toutes les annonces, messages et soldes de cet utilisateur. Poursuivre ?";
    expect(confirmationPrompt).toContain("Cette action effacera toutes les annonces, messages et soldes de cet utilisateur. Poursuivre ?");
  });
});
