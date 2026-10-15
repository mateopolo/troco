// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, renderHook, act } from '@testing-library/react';
import FeedRoute from '../../src/routes/FeedRoute';
import { useFeedListings } from '../../src/hooks/useFeedListings';

// JSDOM IntersectionObserver mock
class MockIntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    MockIntersectionObserver.lastInstance = this;
  }
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.IntersectionObserver = MockIntersectionObserver;
window.IntersectionObserver = MockIntersectionObserver;

vi.mock('../../src/firebase', () => ({
  db: { _mock: true },
  auth: { currentUser: { uid: 'user_test_123' } },
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((db, col) => ({ path: col })),
  query: vi.fn((...args) => ({ _query: true, args })),
  where: vi.fn((field, op, val) => ({ field, op, val })),
  limit: vi.fn((n) => ({ limit: n })),
  onSnapshot: vi.fn((q, cb) => {
    cb({
      docs: Array.from({ length: 8 }, (_, i) => ({
        id: `listing-${i + 1}`,
        data: () => ({
          id: `listing-${i + 1}`,
          title: `Annonce test ${i + 1}`,
          category: 'Services',
          status: 'active',
          price: 20,
        }),
      })),
    });
    return vi.fn();
  }),
  getDocs: vi.fn(async () => ({
    docs: Array.from({ length: 4 }, (_, i) => ({
      id: `listing-page2-${i + 1}`,
      data: () => ({
        id: `listing-page2-${i + 1}`,
        title: `Annonce page 2 test ${i + 1}`,
        category: 'Services',
        status: 'active',
        price: 25,
      }),
    })),
  })),
  startAfter: vi.fn((doc) => ({ startAfter: doc })),
  orderBy: vi.fn((field, dir) => ({ orderBy: field, dir })),
}));

vi.mock('../../src/services/firestoreService', () => ({
  fetchListingsPaginated: vi.fn(async ({ pageSize, lastDoc }) => ({
    items: Array.from({ length: 4 }, (_, i) => ({
      id: `listing-page2-${i + 1}`,
      title: `Annonce page 2 test ${i + 1}`,
      category: 'Services',
      status: 'active',
      price: 25,
    })),
    lastVisible: { id: 'last-doc' },
    hasMore: false,
  })),
  fetchListingsByGeohash: vi.fn(async () => ({ items: [], hasMore: false })),
}));

vi.mock('../../src/hooks/useUsersPublic', () => ({
  useUsersPublic: vi.fn(() => ({ allFirestoreUsers: [], usersPublicMap: new Map() })),
}));

vi.mock('../../src/utils/geocodingNominatim', () => ({
  searchNominatim: vi.fn(async () => []),
  calculateHaversineDistance: vi.fn(() => 5),
}));

describe('Infinite Scroll & Feed Pagination contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders data-testid="feed-card-count" and data-testid="load-more-sentinel" in FeedRoute', () => {
    const sentinelRef = { current: null };
    const mockListings = Array.from({ length: 8 }, (_, i) => ({
      id: `item-${i + 1}`,
      title: `Listing ${i + 1}`,
      description: `Description ${i + 1}`,
      category: 'Services',
      price: 15,
      tokens: 1,
      status: 'active',
      author: 'Tester',
      createdAt: new Date().toISOString(),
    }));

    render(
      <FeedRoute
        t={(k) => k}
        currentLang="FR"
        filteredListings={mockListings}
        listings={mockListings}
        hasMoreListings={true}
        loadMoreSentinelRef={sentinelRef}
        handleLoadMoreListings={vi.fn()}
        isLoadingMoreListings={false}
        viewMode="grid"
        allCategories={['Services', 'Bricolage']}
        selectedCategory="all"
        setSelectedCategory={vi.fn()}
        getCategoryLabel={(cat) => cat}
        getListingDisplayContent={(item) => ({
          title: item.title,
          description: item.description,
          tags: [],
          authorBio: '',
        })}
        formatCompensation={() => '15€'}
        getAuthorAvatar={() => 'avatar.png'}
        getSuggestedMedia={() => ({})}
        getFallbackImage={() => 'fallback.png'}
        profile={{ id: 'u1', name: 'Tester' }}
      />
    );

    const countEl = screen.getByTestId('feed-card-count');
    expect(countEl).toBeDefined();
    expect(countEl.getAttribute('data-count')).toBe('8');

    const sentinelEl = screen.getByTestId('load-more-sentinel');
    expect(sentinelEl).toBeDefined();

    const feedCards = screen.getAllByTestId('feed-card');
    expect(feedCards.length).toBe(8);
  });

  it('useFeedListings initializes with FEED_PAGE_SIZE = 8 and handles intersection / scroll events', async () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    const { result } = renderHook(() =>
      useFeedListings({
        activeTab: 'feed',
        profile: { name: 'Test User', uid: 'user_test_123' },
      })
    );

    // Initial snapshot gave 8 listings -> hasMoreListings should be true
    expect(result.current.hasMoreListings).toBe(true);
    expect(result.current.listings.length).toBe(8);

    // Verify window scroll listener is attached
    expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });

    // Simulate load more
    await act(async () => {
      await result.current.handleLoadMoreListings();
    });

    // Listings should now include page 2 (8 + 4 = 12)
    expect(result.current.listings.length).toBe(12);
    expect(result.current.hasMoreListings).toBe(false);
  });
});
