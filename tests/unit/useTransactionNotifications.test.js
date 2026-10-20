// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const {
  mockUnsubDoc,
  mockUnsubNotifications,
  mockUpdateDoc,
  mockHaptics,
  snapshotCallbacks,
} = vi.hoisted(() => {
  return {
    mockUnsubDoc: vi.fn(),
    mockUnsubNotifications: vi.fn(),
    mockUpdateDoc: vi.fn().mockResolvedValue(true),
    mockHaptics: {
      success: vi.fn(),
      light: vi.fn(),
      error: vi.fn(),
      trigger: vi.fn(),
    },
    snapshotCallbacks: {
      transactions: null,
      notifications: null,
    },
  };
});

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, ...paths) => ({
    _type: 'collection',
    paths,
    isNotifications: paths.includes('notifications'),
    isTransactions: paths.includes('transactions'),
  })),
  doc: vi.fn((_db, ...paths) => ({ _type: 'doc', paths, name: paths[paths.length - 2], id: paths[paths.length - 1] })),
  query: vi.fn((baseCol, ...args) => ({ _type: 'query', baseCol, args })),
  where: vi.fn((field, op, val) => ({ _type: 'where', field, op, val })),
  orderBy: vi.fn((field, dir) => ({ _type: 'orderBy', field, dir })),
  limit: vi.fn((n) => ({ _type: 'limit', n })),
  serverTimestamp: vi.fn(() => ({ _type: 'serverTimestamp' })),
  getDocs: vi.fn().mockResolvedValue({ forEach: vi.fn(), docs: [] }),
  updateDoc: vi.fn((...args) => mockUpdateDoc(...args)),
  onSnapshot: vi.fn((target, onNext) => {
    if (target?.baseCol?.isNotifications || target?.isNotifications) {
      snapshotCallbacks.notifications = onNext;
      return mockUnsubNotifications;
    }
    snapshotCallbacks.transactions = onNext;
    return mockUnsubDoc;
  }),
}));

vi.mock('../../src/firebase', () => ({
  auth: { currentUser: { uid: 'user_123' } },
  db: { _type: 'mock_db' },
}));

vi.mock('../../src/utils/audioService', () => ({
  playApplePaySound: vi.fn(),
  playBetclicBalanceSound: vi.fn(),
}));

vi.mock('../../src/utils/haptics', () => ({
  default: mockHaptics,
  haptics: mockHaptics,
  safeVibrate: vi.fn(),
}));

vi.mock('../../src/services/notificationService', () => ({
  default: {
    show: vi.fn(),
    dismiss: vi.fn(),
  },
}));

import { useTransactionNotifications } from '../../src/hooks/useTransactionNotifications';
import { playApplePaySound, playBetclicBalanceSound } from '../../src/utils/audioService';

describe('useTransactionNotifications hook [MOY-04]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    snapshotCallbacks.transactions = null;
    snapshotCallbacks.notifications = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with default states', () => {
    const { result } = renderHook(() =>
      useTransactionNotifications({
        profile: { uid: 'user_123', email: 'test@troco.fr' },
      })
    );

    expect(result.current.userTransactions).toEqual([]);
    expect(result.current.topUpCelebration).toBeNull();
    expect(result.current.transactionSuccessModalConfig).toEqual({
      isOpen: false,
      type: 'sent',
      amount: 1,
      currency: 'tokens',
      partnerName: '',
      notificationId: null,
    });
    expect(typeof result.current.notifyTransactionSuccess).toBe('function');
    expect(typeof result.current.triggerCelebrationToast).toBe('function');
    expect(typeof result.current.handleCloseTransactionSuccessModal).toBe('function');
  });

  describe('triggerCelebrationToast', () => {
    it('sets celebration state and auto-dismisses after duration', () => {
      const { result } = renderHook(() =>
        useTransactionNotifications({
          profile: { uid: 'user_123' },
        })
      );

      act(() => {
        result.current.triggerCelebrationToast({
          title: '+10 Jetons !',
          subtitle: 'Recharge réussie',
          currency: 'tokens',
          playSound: true,
          duration: 3000,
        });
      });

      expect(result.current.topUpCelebration).toEqual({
        title: '+10 Jetons !',
        subtitle: 'Recharge réussie',
      });
      expect(playBetclicBalanceSound).toHaveBeenCalledWith(true);
      expect(mockHaptics.success).toHaveBeenCalled();

      // Fast forward duration
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.topUpCelebration).toBeNull();
    });

    it('plays Apple Pay sound when currency is EUR', () => {
      const { result } = renderHook(() =>
        useTransactionNotifications({
          profile: { uid: 'user_123' },
        })
      );

      act(() => {
        result.current.triggerCelebrationToast({
          title: '+25 €',
          subtitle: 'Paiement reçu',
          currency: 'EUR',
          playSound: true,
        });
      });

      expect(playApplePaySound).toHaveBeenCalled();
      expect(playBetclicBalanceSound).not.toHaveBeenCalled();
    });
  });

  describe('notifyTransactionSuccess', () => {
    it('handles token transaction with modal and toast', () => {
      const { result } = renderHook(() =>
        useTransactionNotifications({
          profile: { uid: 'user_123' },
        })
      );

      act(() => {
        result.current.notifyTransactionSuccess({
          type: 'received',
          amount: 50,
          currency: 'tokens',
          partnerName: 'Alice',
          playSound: true,
          showToast: true,
          showModal: true,
        });
      });

      expect(playBetclicBalanceSound).toHaveBeenCalledWith(true);
      expect(mockHaptics.success).toHaveBeenCalled();
      expect(result.current.topUpCelebration).toEqual({
        title: '+50 Jetons Troco 🪙 reçus !',
        subtitle: 'Interlocuteur : Alice',
      });
      expect(result.current.transactionSuccessModalConfig).toEqual({
        isOpen: true,
        type: 'received',
        amount: 50,
        currency: 'tokens',
        partnerName: 'Alice',
        notificationId: null,
      });
    });

    it('handles fiat transaction with Apple Pay sound', () => {
      const { result } = renderHook(() =>
        useTransactionNotifications({
          profile: { uid: 'user_123' },
        })
      );

      act(() => {
        result.current.notifyTransactionSuccess({
          type: 'sent',
          amount: 15,
          currency: 'euros',
          partnerName: 'Bob',
          playSound: true,
          showToast: true,
          showModal: true,
        });
      });

      expect(playApplePaySound).toHaveBeenCalled();
      expect(result.current.transactionSuccessModalConfig).toEqual({
        isOpen: true,
        type: 'sent',
        amount: 15,
        currency: 'fiat',
        partnerName: 'Bob',
        notificationId: null,
      });
    });

    it('closes transaction success modal correctly', () => {
      const { result } = renderHook(() =>
        useTransactionNotifications({
          profile: { uid: 'user_123' },
        })
      );

      act(() => {
        result.current.notifyTransactionSuccess({
          type: 'sent',
          amount: 10,
          currency: 'tokens',
          partnerName: 'Charlie',
        });
      });

      expect(result.current.transactionSuccessModalConfig.isOpen).toBe(true);

      act(() => {
        result.current.handleCloseTransactionSuccessModal();
      });

      expect(result.current.transactionSuccessModalConfig.isOpen).toBe(false);
    });
  });

  describe('Firestore transactions listener', () => {
    it('subscribes to user transactions collection when authenticated', () => {
      const { result } = renderHook(() =>
        useTransactionNotifications({
          profile: { uid: 'user_123' },
        })
      );

      expect(snapshotCallbacks.transactions).toBeTypeOf('function');

      const mockDocs = [
        { id: 'tx_1', data: () => ({ amount: 10, currency: 'tokens', createdAt: 1000 }) },
        { id: 'tx_2', data: () => ({ amount: 20, currency: 'EUR', createdAt: 2000 }) },
      ];

      act(() => {
        snapshotCallbacks.transactions({ docs: mockDocs });
      });

      expect(result.current.userTransactions).toEqual([
        { id: 'tx_1', amount: 10, currency: 'tokens', createdAt: 1000 },
        { id: 'tx_2', amount: 20, currency: 'EUR', createdAt: 2000 },
      ]);
    });

    it('unsubscribes cleanly on unmount', () => {
      const { unmount } = renderHook(() =>
        useTransactionNotifications({
          profile: { uid: 'user_123' },
        })
      );

      unmount();
      expect(mockUnsubDoc).toHaveBeenCalled();
      expect(mockUnsubNotifications).toHaveBeenCalled();
    });
  });

  describe('Incoming payment notification listener', () => {
    it('triggers celebration toast and marks notification as read when payment_received is detected and closed', () => {
      const { result } = renderHook(() =>
        useTransactionNotifications({
          profile: { uid: 'user_123' },
        })
      );

      expect(snapshotCallbacks.notifications).toBeTypeOf('function');

      const mockNotifDoc = {
        id: 'notif_abc',
        data: () => ({
          type: 'payment_received',
          read: false,
          amount: 30,
          currency: 'tokens',
          senderName: 'Sophie',
          createdAt: { toMillis: () => Date.now() },
        }),
      };

      act(() => {
        snapshotCallbacks.notifications({
          empty: false,
          docChanges: () => [
            {
              type: 'added',
              doc: mockNotifDoc,
            },
          ],
        });
      });

      expect(playBetclicBalanceSound).toHaveBeenCalledWith(true);
      expect(result.current.transactionSuccessModalConfig.isOpen).toBe(true);
      expect(result.current.transactionSuccessModalConfig.notificationId).toBe('notif_abc');

      act(() => {
        result.current.handleCloseTransactionSuccessModal();
      });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'notifications', id: 'notif_abc' }),
        expect.objectContaining({ read: true })
      );
    });
  });
});
