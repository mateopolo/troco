import {
  fetchUserRealStats,
  sanitizeUserWithDynamicStats,
} from './userStatsService';
import * as firestore from 'firebase/firestore';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  onSnapshot: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
}));

jest.mock('../firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test_user_1', email: 'test@example.com' } },
}));

describe('userStatsService - Real dynamic statistics calculation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('1. Returns 0 stats when uid is missing or invalid', async () => {
    const stats = await fetchUserRealStats(null);
    expect(stats).toEqual({
      reviewsCount: 0,
      averageRating: 0,
      dealsCompleted: 0,
      activeDeals: 0,
    });
  });

  test('2. Correctly counts real reviews and computes average rating', async () => {
    firestore.getDocs.mockImplementation((q) => {
      // Mock reviews collection
      return Promise.resolve({
        size: 3,
        docs: [
          { id: 'rev1', data: () => ({ rating: 5, text: 'Super échange !' }) },
          { id: 'rev2', data: () => ({ rating: 4, text: 'Très bien' }) },
          { id: 'rev3', data: () => ({ rating: 5, text: 'Parfait' }) },
        ],
        forEach: (fn) => {},
      });
    });

    const stats = await fetchUserRealStats('user_with_reviews');
    expect(stats.reviewsCount).toBe(3);
    // (5 + 4 + 5) / 3 = 4.666 -> 4.7
    expect(stats.averageRating).toBe(4.7);
  });

  test('3. Returns 0 deals and 0 reviews when user has zero database relations', async () => {
    firestore.getDocs.mockImplementation(() =>
      Promise.resolve({
        size: 0,
        docs: [],
        forEach: () => {},
      })
    );

    const stats = await fetchUserRealStats('empty_user');
    expect(stats.reviewsCount).toBe(0);
    expect(stats.averageRating).toBe(0);
    expect(stats.dealsCompleted).toBe(0);
    expect(stats.activeDeals).toBe(0);
  });

  test('4. Correctly counts completed deals from transactions', async () => {
    let callCount = 0;
    firestore.getDocs.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // reviews
        return Promise.resolve({ size: 0, docs: [], forEach: () => {} });
      }
      if (callCount === 2) {
        // user transactions
        const txDocs = [
          { id: 'tx1', data: () => ({ type: 'deal', status: 'completed', dealId: 'deal-101' }) },
          { id: 'tx2', data: () => ({ type: 'deal_payment', status: 'completed', dealId: 'deal-102' }) },
        ];
        return Promise.resolve({
          size: 2,
          docs: txDocs,
          forEach: (fn) => txDocs.forEach(fn),
        });
      }
      // partner tx and chats
      return Promise.resolve({ size: 0, docs: [], forEach: () => {} });
    });

    const stats = await fetchUserRealStats('deal_user');
    expect(stats.dealsCompleted).toBe(2);
    expect(stats.activeDeals).toBe(0);
  });

  test('5. sanitizeUserWithDynamicStats overrides stale/mock 20 deals or 6 reviews with verified real stats', () => {
    const staleUser = {
      uid: 'matmot',
      name: 'Matmot',
      dealsCompleted: 20, // Stale mock value
      reviewsCount: 6,    // Stale mock value
      averageRating: 5.0,
    };

    const realStats = {
      reviewsCount: 0,
      averageRating: 0,
      dealsCompleted: 0,
      activeDeals: 0,
    };

    const sanitized = sanitizeUserWithDynamicStats(staleUser, realStats);
    expect(sanitized.dealsCompleted).toBe(0);
    expect(sanitized.reviewsCount).toBe(0);
    expect(sanitized.averageRating).toBe(0);
    expect(sanitized.activeDeals).toBe(0);
  });
});
