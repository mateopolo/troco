import React from 'react';
import { renderHook, act } from '@testing-library/react';
import useNetworkStatus from './useNetworkStatus';

describe('Phase 49 : useNetworkStatus Hook', () => {
  it('détecte le statut en ligne initial', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);
  });

  it('réagit aux événements offline et online du navigateur', () => {
    const { result } = renderHook(() => useNetworkStatus());

    // Déclencher offline
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isOffline).toBe(true);
    expect(result.current.wasOffline).toBe(true);

    // Déclencher online
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);
  });
});
