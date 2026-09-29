// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUserPresence } from '../../src/hooks/useUserPresence';
import { useFeedStore } from '../../src/stores/useFeedStore';

vi.mock('../../src/firebase', () => ({
  db: { _mock: true },
  auth: { currentUser: { uid: 'user_test_123' } },
}));

const mockDocSnap = {
  data: () => ({
    online: true,
    lastSeenMs: Date.now(),
    uid: 'user_alice',
  }),
};

let snapshotCallback = null;

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((db, col, id, subCol, subId) => {
    return { path: subCol ? `${col}/${id}/${subCol}/${subId}` : `${col}/${id}` };
  }),
  collection: vi.fn((db, col, id, subCol) => ({ path: subCol ? `${col}/${id}/${subCol}` : col })),
  onSnapshot: vi.fn((docRef, cb) => {
    snapshotCallback = cb;
    cb(mockDocSnap);
    return vi.fn(); // unsubscribe
  }),
  getDocs: vi.fn(async () => ({
    forEach: (cb) => {
      cb({
        id: 'filt_1',
        data: () => ({
          name: 'Mon Filtre Test',
          filters: { radiusKm: 45, isInfiniteRadius: false },
          createdAt: 1000,
        }),
      });
    },
  })),
  setDoc: vi.fn(async () => {}),
  updateDoc: vi.fn(async () => {}),
  deleteDoc: vi.fn(async () => {}),
}));

describe('FAC-03: useUserPresence hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns isOnline = false for empty uid', () => {
    const { result } = renderHook(() => useUserPresence(null));
    expect(result.current.isOnline).toBe(false);
  });

  it('subscribes to presence doc and returns online state', () => {
    const { result } = renderHook(() => useUserPresence('user_alice'));
    expect(result.current.isOnline).toBe(true);
    expect(result.current.lastSeen).toBeDefined();
  });

  it('shares single listener for duplicate subscribers (no N+1)', () => {
    const hook1 = renderHook(() => useUserPresence('user_bob'));
    const hook2 = renderHook(() => useUserPresence('user_bob'));

    expect(hook1.result.current).toBeDefined();
    expect(hook2.result.current).toBeDefined();
  });
});

describe('FAC-05: useFeedStore saved filters', () => {
  beforeEach(() => {
    useFeedStore.setState({
      savedFilters: [],
      radiusKm: 20,
      isInfiniteRadius: true,
    });
  });

  it('loads saved filters for user', async () => {
    await useFeedStore.getState().loadSavedFilters('user_test_123');
    const filters = useFeedStore.getState().savedFilters;
    expect(filters.length).toBe(1);
    expect(filters[0].name).toBe('Mon Filtre Test');
  });

  it('adds, renames, applies and deletes saved filter', async () => {
    // 1. Add
    const created = await useFeedStore.getState().addSavedFilter('user_test_123', 'Nouveau Filtre', {
      radiusKm: 50,
      isInfiniteRadius: false,
      selectedPayment: 'credits',
    });

    expect(created).not.toBeNull();
    expect(created.name).toBe('Nouveau Filtre');
    expect(useFeedStore.getState().savedFilters.length).toBe(1);

    // 2. Rename
    const renameOk = await useFeedStore.getState().renameSavedFilter('user_test_123', created.id, 'Filtre Renommé');
    expect(renameOk).toBe(true);
    expect(useFeedStore.getState().savedFilters[0].name).toBe('Filtre Renommé');

    // 3. Apply
    act(() => {
      useFeedStore.getState().applySavedFilter(created);
    });
    expect(useFeedStore.getState().radiusKm).toBe(50);
    expect(useFeedStore.getState().isInfiniteRadius).toBe(false);
    expect(useFeedStore.getState().selectedPayment).toBe('credits');

    // 4. Delete
    const deleteOk = await useFeedStore.getState().deleteSavedFilter('user_test_123', created.id);
    expect(deleteOk).toBe(true);
    expect(useFeedStore.getState().savedFilters.length).toBe(0);
  });
});
