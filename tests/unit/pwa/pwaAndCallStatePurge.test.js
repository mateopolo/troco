import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
  url: 'http://localhost',
});
global.window = dom.window;
Object.defineProperty(global, 'document', {
  value: dom.window.document,
  configurable: true,
  writable: true,
});
Object.defineProperty(global, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
  writable: true,
});
global.localStorage = dom.window.localStorage;
global.sessionStorage = dom.window.sessionStorage;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent;

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useCallStore } from '../../../src/stores/useCallStore';
import { useChatStore } from '../../../src/stores/useChatStore';
import {
  applyServiceWorkerUpdate,
  showUpdateToast,
} from '../../../src/serviceWorkerRegistration';

describe('🛡️ PWA & Call State Purge Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    useCallStore.getState().resetCallState();
    useChatStore.getState().resetCallState();
  });

  afterEach(() => {
    const existing = document.getElementById('troco-pwa-update-toast');
    if (existing) existing.remove();
  });

  it('1. useCallStore initialise strictement toutes les variables d appel à false/null', () => {
    const state = useCallStore.getState();
    expect(state.isCallActive).toBe(false);
    expect(state.callRoomId).toBeNull();
    expect(state.isInCall).toBe(false);
    expect(state.activeCall).toBeNull();
    expect(state.callType).toBeNull();
    expect(state.activeCallPip).toBe(false);
    expect(state.callDuration).toBe(0);
    expect(state.incomingCall).toBeNull();
  });

  it('2. useCallStore met à jour les états et resetCallState les remet à zéro', () => {
    useCallStore.getState().setIsCallActive(true);
    useCallStore.getState().setCallRoomId('room_xyz');
    useCallStore.getState().setIsInCall(true);
    useCallStore.getState().setActiveCall({ isLive: true, type: 'video' });

    let state = useCallStore.getState();
    expect(state.isCallActive).toBe(true);
    expect(state.callRoomId).toBe('room_xyz');
    expect(state.isInCall).toBe(true);
    expect(state.activeCall).toEqual({ isLive: true, type: 'video' });

    useCallStore.getState().resetCallState();
    state = useCallStore.getState();
    expect(state.isCallActive).toBe(false);
    expect(state.callRoomId).toBeNull();
    expect(state.isInCall).toBe(false);
    expect(state.activeCall).toBeNull();
  });

  it('3. useChatStore contient les états d appel et resetCallState les remet à false/null', () => {
    useChatStore.getState().setIsCallActive(true);
    useChatStore.getState().setCallRoomId('room_abc');
    useChatStore.getState().setIsInCall(true);
    useChatStore.getState().setActiveCallPip(true);

    let state = useChatStore.getState();
    expect(state.isCallActive).toBe(true);
    expect(state.callRoomId).toBe('room_abc');
    expect(state.isInCall).toBe(true);
    expect(state.activeCallPip).toBe(true);

    useChatStore.getState().resetCallState();
    state = useChatStore.getState();
    expect(state.isCallActive).toBe(false);
    expect(state.callRoomId).toBeNull();
    expect(state.isInCall).toBe(false);
    expect(state.activeCallPip).toBe(false);
  });

  it('4. showUpdateToast injecte le bandeau PWA et permet de déclencher le rechargement', () => {
    const postMessageMock = vi.fn();
    const mockRegistration = {
      waiting: {
        postMessage: postMessageMock,
      },
    };

    // Mock window.location.reload
    const reloadMock = vi.fn();
    delete window.location;
    window.location = { reload: reloadMock };

    showUpdateToast(mockRegistration);

    const toast = document.getElementById('troco-pwa-update-toast');
    expect(toast).toBeTruthy();
    expect(toast.textContent).toContain('Nouvelle mise à jour disponible !');

    const btn = document.getElementById('troco-pwa-update-btn');
    expect(btn).toBeTruthy();
    btn.click();

    expect(postMessageMock).toHaveBeenCalledWith({ type: 'CLEAR_CACHE' });
    expect(postMessageMock).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(reloadMock).toHaveBeenCalledWith(true);
  });

  it('5. applyServiceWorkerUpdate purge les caches et recharge la page', async () => {
    const postMessageMock = vi.fn();
    const mockRegistration = {
      waiting: {
        postMessage: postMessageMock,
      },
    };

    const deleteMock = vi.fn().mockResolvedValue(true);
    window.caches = {
      keys: vi.fn().mockResolvedValue(['cache-v1', 'cache-v2']),
      delete: deleteMock,
    };
    global.caches = window.caches;

    const reloadMock = vi.fn();
    window.location = { reload: reloadMock };

    applyServiceWorkerUpdate(mockRegistration);

    expect(postMessageMock).toHaveBeenCalledWith({ type: 'CLEAR_CACHE' });
    expect(postMessageMock).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });

    // Attendre la résolution de la promesse de caches
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(deleteMock).toHaveBeenCalledWith('cache-v1');
    expect(deleteMock).toHaveBeenCalledWith('cache-v2');
    expect(reloadMock).toHaveBeenCalledWith(true);
  });
});
