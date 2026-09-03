import React from 'react';
import { render, screen, fireEvent, waitFor, renderHook, act } from '@testing-library/react';
import AuthScreen from '../features/auth/AuthScreen';
import { useChatManager } from '../hooks/useChatManager';
import { getDoc, setDoc, doc, runTransaction } from 'firebase/firestore';

jest.mock('../firebase', () => ({
  auth: {
    currentUser: { uid: 'user_sender_123', email: 'sender@troco.fr' },
  },
  db: { app: {} },
}));

jest.mock('firebase/firestore', () => ({
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false, data: () => null })),
  setDoc: jest.fn(() => Promise.resolve({})),
  updateDoc: jest.fn(() => Promise.resolve({})),
  deleteDoc: jest.fn(() => Promise.resolve({})),
  addDoc: jest.fn(() => Promise.resolve({ id: 'mock_doc_id' })),
  onSnapshot: jest.fn(() => () => {}),
  doc: jest.fn((...args) => ({ id: args[2] || args[1], path: args.slice(1).join('/') })),
  collection: jest.fn((...args) => ({ path: args.slice(1).join('/') })),
  query: jest.fn((col, ...args) => ({ col, args })),
  where: jest.fn(),
  orderBy: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ empty: true, docs: [] })),
  runTransaction: jest.fn(),
  increment: jest.fn((val) => val),
  serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
}));

describe('PHASE 109 : Synchronisation financière atomique et persistance de session', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.prompt = jest.fn(() => '2609'); // Code administrateur valide
    window.alert = jest.fn();
  });

  test('AuthScreen handleConfirmDemoAuth hydrates profile from existing Firestore data', async () => {
    const setProfile = jest.fn();
    const setIsAuthenticated = jest.fn();

    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        euroBalance: 250,
        trocoTokens: 35,
        rating: 5.0,
      }),
    });

    render(
      <AuthScreen
        setProfile={setProfile}
        setIsAuthenticated={setIsAuthenticated}
        setProfileDraft={jest.fn()}
        setSkills={jest.fn()}
        darkMode={false}
        toggleDarkMode={jest.fn()}
      />
    );

    const demoButton = screen.getByText(/Accès Rapide Démo/i);
    fireEvent.click(demoButton);

    await waitFor(() => {
      expect(getDoc).toHaveBeenCalled();
      expect(setProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'demo_mateopolo',
          euroBalance: 250,
          trocoTokens: 35,
        })
      );
      expect(setIsAuthenticated).toHaveBeenCalledWith(true);
    });
  });

  test('AuthScreen handleConfirmDemoAuth creates initial document if not yet in Firestore', async () => {
    const setProfile = jest.fn();
    const setIsAuthenticated = jest.fn();

    getDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => null,
    });

    render(
      <AuthScreen
        setProfile={setProfile}
        setIsAuthenticated={setIsAuthenticated}
        setProfileDraft={jest.fn()}
        setSkills={jest.fn()}
        darkMode={false}
        toggleDarkMode={jest.fn()}
      />
    );

    const demoButton = screen.getByText(/Accès Rapide Démo/i);
    fireEvent.click(demoButton);

    await waitFor(() => {
      expect(getDoc).toHaveBeenCalled();
      expect(setDoc).toHaveBeenCalled();
      expect(setProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          euroBalance: 128,
          trocoTokens: 12,
        })
      );
    });
  });

  test('useChatManager handleSendToken executes strict atomic runTransaction', async () => {
    const setProfile = jest.fn();
    const profile = { uid: 'sender_123', trocoTokens: 10, name: 'Expéditeur' };

    runTransaction.mockImplementation(async (db, updateFunction) => {
      const mockTx = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({ trocoTokens: 10 }),
        }),
        update: jest.fn(),
        set: jest.fn(),
      };
      await updateFunction(mockTx);
      expect(mockTx.update).toHaveBeenCalledTimes(2);
      expect(mockTx.set).toHaveBeenCalledTimes(1);
    });

    const { result } = renderHook(() =>
      useChatManager({
        profile,
        setProfile,
        auth: { currentUser: { uid: 'sender_123' } },
        db: { app: {} },
      })
    );

    await act(async () => {
      const res = await result.current.handleSendToken('chat_1', 3, 'Test transfert', 'receiver_456');
      expect(res.success).toBe(true);
      expect(res.receiverUid).toBe('receiver_456');
      expect(res.amount).toBe(3);
    });

    expect(runTransaction).toHaveBeenCalled();
    expect(setProfile).toHaveBeenCalled();
  });

  test('useChatManager handleSendToken throws error if receiverUid is missing', async () => {
    const setProfile = jest.fn();
    const profile = { uid: 'sender_123', trocoTokens: 10, name: 'Expéditeur' };

    const { result } = renderHook(() =>
      useChatManager({
        profile,
        setProfile,
        auth: { currentUser: { uid: 'sender_123' } },
        db: { app: {} },
      })
    );

    let caughtError = null;
    await act(async () => {
      try {
        await result.current.handleSendToken('chat_nonexistent', 2);
      } catch (err) {
        caughtError = err;
      }
    });

    expect(caughtError).not.toBeNull();
    expect(caughtError.message).toBe('Destinataire introuvable');
  });
});
