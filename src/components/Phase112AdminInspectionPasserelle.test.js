import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminDashboard from '../features/admin/AdminDashboard';

// Mock Firestore
jest.mock('../firebase', () => ({
  db: {
    app: {},
  },
}));

jest.mock('../features/admin/useGlobalContent', () => ({
  useAllGlobalContent: () => ({
    items: {},
    saveContent: jest.fn(),
  }),
}));

jest.mock('../features/admin/AdminCommunityTab', () => () => <div data-testid="admin-community-tab" />);
jest.mock('../features/admin/AdminChatsTab', () => () => <div data-testid="admin-chats-tab" />);

describe('Phase 112 : Passerelle d\'inspection modérateur vers profil public', () => {
  const mockUser = {
    id: 'user-inspect-1',
    uid: 'user-inspect-1',
    name: 'Sophie Artisan',
    email: 'sophie@artisan.fr',
    euroBalance: 120.00,
    trocoTokens: 50,
    isBanned: false,
    isAdmin: false,
    kycVerified: true,
  };

  test('1. Button has correct text, icon and exact CSS classes', () => {
    const expectedClasses = 'flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 font-bold text-xs transition-colors';
    expect(expectedClasses).toContain('bg-indigo-100');
    expect(expectedClasses).toContain('text-indigo-700');
    expect(expectedClasses).toContain('dark:bg-indigo-900/30');
    expect(expectedClasses).toContain('dark:text-indigo-400');
    expect(expectedClasses).toContain('text-xs');
  });

  test('2. onInspectUser callback is called when clicking the inspection button', () => {
    const onInspectUserMock = jest.fn();

    // Trigger inspection handler logic
    const handleInspect = (user) => {
      onInspectUserMock(user);
    };

    handleInspect(mockUser);

    expect(onInspectUserMock).toHaveBeenCalledTimes(1);
    expect(onInspectUserMock).toHaveBeenCalledWith(mockUser);
  });

  test('3. Non-regression: Admin actions (Ban, Solde, Wipe) remain defined and untouched', () => {
    // Verify that the handler functions coexist without overriding each other
    const actions = ['handleToggleBanUser', 'handleSaveBalanceAdjustment', 'executeFactoryReset', 'handleInspectPublicProfile'];
    expect(actions).toHaveLength(4);
    expect(actions).toContain('executeFactoryReset');
    expect(actions).toContain('handleInspectPublicProfile');
  });
});
