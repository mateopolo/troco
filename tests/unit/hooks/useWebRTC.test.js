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
import { useWebRTC } from '../../../src/hooks/useWebRTC';

// Mock Firebase
vi.mock('../../../src/firebase', () => ({
  auth: { currentUser: { uid: 'user_initiator_uid', displayName: 'Caller' } },
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((db, ...path) => ({ path: path.join('/') })),
  doc: vi.fn((db, ...path) => ({ id: path[path.length - 1], path: path.join('/') })),
  addDoc: vi.fn().mockResolvedValue({ id: 'candidate_doc' }),
  setDoc: vi.fn().mockResolvedValue(),
  updateDoc: vi.fn().mockResolvedValue(),
  deleteDoc: vi.fn().mockResolvedValue(),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
  onSnapshot: vi.fn(() => vi.fn()),
  query: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  serverTimestamp: vi.fn(() => 'MOCK_SERVER_TIMESTAMP'),
}));

vi.mock('../../../src/utils/webrtcTracer', () => ({
  traceWebRTCEvent: vi.fn(),
}));

describe('📞 useWebRTC Hook Unit Tests [VERIF-03]', () => {
  const mockProps = {
    profileName: 'Caller',
    profileUid: 'user_initiator_uid',
    selectedChat: {
      id: 'chat_call_room_1',
      partnerUid: 'user_receiver_uid',
      partnerName: 'Receiver',
      participantUids: ['user_initiator_uid', 'user_receiver_uid'],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Initialise l état de l appel à inactif et cam/mic activés par défaut', () => {
    const { result } = renderHook(() => useWebRTC(mockProps));

    expect(result.current.callState.active).toBe(false);
    expect(result.current.callState.ringing).toBe(false);
    expect(result.current.callState.type).toBeNull();
    expect(result.current.callState.micOn).toBe(true);
    expect(result.current.callState.camOn).toBe(true);
    expect(result.current.callState.isScreenSharing).toBe(false);
  });

  it('2. toggleMic bascule l état du microphone', () => {
    const { result } = renderHook(() => useWebRTC(mockProps));

    act(() => {
      result.current.toggleMic();
    });
    expect(result.current.callState.micOn).toBe(false);

    act(() => {
      result.current.toggleMic();
    });
    expect(result.current.callState.micOn).toBe(true);
  });

  it('3. toggleCam bascule l état de la caméra', () => {
    const { result } = renderHook(() => useWebRTC(mockProps));

    act(() => {
      result.current.toggleCam();
    });
    expect(result.current.callState.camOn).toBe(false);

    act(() => {
      result.current.toggleCam();
    });
    expect(result.current.callState.camOn).toBe(true);
  });

  it('4. endCall réinitialise tous les états à l arrêt de l appel', () => {
    const { result } = renderHook(() => useWebRTC(mockProps));

    act(() => {
      result.current.endCall();
    });

    expect(result.current.callState.active).toBe(false);
    expect(result.current.callState.ringing).toBe(false);
    expect(result.current.callState.type).toBeNull();
    expect(result.current.callState.isHost).toBe(false);
  });

  it('5. declineIncomingCall rejette un appel entrant et nettoie l état', () => {
    const { result } = renderHook(() => useWebRTC(mockProps));

    act(() => {
      result.current.declineIncomingCall();
    });

    expect(result.current.incomingCall).toBeNull();
  });
});
