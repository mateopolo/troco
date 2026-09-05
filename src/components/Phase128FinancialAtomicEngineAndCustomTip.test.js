import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import VisioSettlementModal from './VisioSettlementModal';
import CallEndModal from './CallEndModal';
import { useChatManager } from '../hooks/useChatManager';
import { sendPostCallTip as firestoreSendPostCallTip } from '../services/firestoreService';
import { runTransaction, doc, collection, increment } from 'firebase/firestore';

jest.mock('../firebase', () => ({
  auth: {
    currentUser: { uid: 'sender_123', email: 'sender@troco.fr' },
  },
  db: { app: {} },
}));

jest.mock('firebase/firestore', () => ({
  getDoc: jest.fn(() => Promise.resolve({ exists: () => true, data: () => ({ trocoTokens: 50 }) })),
  setDoc: jest.fn(() => Promise.resolve({})),
  updateDoc: jest.fn(() => Promise.resolve({})),
  deleteDoc: jest.fn(() => Promise.resolve({})),
  addDoc: jest.fn(() => Promise.resolve({ id: 'mock_doc_id' })),
  onSnapshot: jest.fn(() => () => {}),
  doc: jest.fn((...args) => ({ id: args[2] || args[1] || 'mock_doc', path: args.slice(1).join('/') })),
  collection: jest.fn((...args) => ({ path: args.slice(1).join('/') })),
  query: jest.fn((col, ...args) => ({ col, args })),
  where: jest.fn(),
  orderBy: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ empty: true, docs: [] })),
  runTransaction: jest.fn(),
  increment: jest.fn((val) => `increment(${val})`),
  serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
}));

jest.mock('../utils/audioService', () => ({
  playBetclicBalanceSound: jest.fn(),
  playApplePaySound: jest.fn(),
  playSwooshSound: jest.fn(),
}));

jest.mock('../utils/haptics', () => ({
  hapticLight: jest.fn(),
  hapticSuccess: jest.fn(),
  hapticError: jest.fn(),
}));

describe('PHASE 128 : Moteur transactionnel absolu et montant personnalisé post-appel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.alert = jest.fn();
  });

  describe('1. Montant libre en fin d\'appel (VisioSettlementModal & CallEndModal)', () => {
    test('Affiche les boutons pré-définis [1], [2], [3], [5] et le bouton [Autre]', () => {
      render(
        <VisioSettlementModal
          isOpen={true}
          onClose={jest.fn()}
          callDuration={1800}
          partnerName="Alice"
          currentUserTokens={20}
        />
      );

      expect(screen.getByText('1 🪙')).toBeInTheDocument();
      expect(screen.getByText('2 🪙')).toBeInTheDocument();
      expect(screen.getByText('3 🪙')).toBeInTheDocument();
      expect(screen.getByText('5 🪙')).toBeInTheDocument();
      expect(screen.getByText('Autre')).toBeInTheDocument();
    });

    test('Cliquer sur [Autre] affiche un input number min="1" et transmet le montant saisi', () => {
      const onTransferTokens = jest.fn();
      render(
        <CallEndModal
          isOpen={true}
          onClose={jest.fn()}
          callDuration={1800}
          partnerName="Alice"
          currentUserTokens={50}
          onTransferTokens={onTransferTokens}
        />
      );

      // Cliquer sur le bouton [Autre]
      const autreButton = screen.getByText('Autre');
      fireEvent.click(autreButton);

      // L'input number doit être présent
      const customInput = screen.getByRole('spinbutton');
      expect(customInput).toBeInTheDocument();
      expect(customInput).toHaveAttribute('type', 'number');
      expect(customInput).toHaveAttribute('min', '1');

      // Saisir un montant libre de 12 jetons
      fireEvent.change(customInput, { target: { value: '12' } });
      expect(customInput.value).toBe('12');

      // Le bouton de transfert doit afficher le montant personnalisé
      const transferButton = screen.getByText(/Transférer 12 Jetons à Alice/i);
      expect(transferButton).toBeInTheDocument();
      fireEvent.click(transferButton);

      // Vérifier que le montant exact a bien été transmis
      expect(onTransferTokens).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens: 12,
        })
      );
    });
  });

  describe('2 & 3. Atomicité, résolution stricte du destinataire et notification temps réel', () => {
    test('handleSendToken isole partnerUid, exécute double increment et écrit la notification destinataire', async () => {
      const setProfile = jest.fn();
      const profile = { uid: 'sender_123', trocoTokens: 25, name: 'Expéditeur' };

      let recordedTxUpdates = [];
      let recordedTxSets = [];

      runTransaction.mockImplementation(async (db, updateFunction) => {
        const mockTx = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ trocoTokens: 25 }),
          }),
          update: jest.fn((ref, data) => {
            recordedTxUpdates.push({ ref, data });
          }),
          set: jest.fn((ref, data) => {
            recordedTxSets.push({ ref, data });
          }),
        };
        await updateFunction(mockTx);
      });

      let hookResult;
      function TestComponent() {
        hookResult = useChatManager({
          profile,
          setProfile,
          auth: { currentUser: { uid: 'sender_123' } },
          db: { app: {} },
        });
        return null;
      }

      render(<TestComponent />);

      let res;
      await act(async () => {
        res = await hookResult.handleSendToken('chat_xyz', 4, 'Merci pour les conseils !', 'receiver_789');
      });

      expect(res.success).toBe(true);
      expect(res.partnerUid).toBe('receiver_789');
      expect(res.amount).toBe(4);

      // 2 updates (sender et receiver avec increment)
      expect(recordedTxUpdates.length).toBe(2);
      expect(increment).toHaveBeenCalledWith(-4);
      expect(increment).toHaveBeenCalledWith(4);

      // 1 notification dans users/receiver_789/notifications
      expect(recordedTxSets.length).toBe(1);
      const notifWrite = recordedTxSets[0];
      expect(notifWrite.data).toEqual(
        expect.objectContaining({
          type: 'payment_received',
          amount: 4,
          currency: 'tokens',
          from: 'sender_123',
          read: false,
        })
      );
    });

    test('sendPostCallTip isole partnerUid, exécute double increment et écrit la notification', async () => {
      const setProfile = jest.fn();
      const profile = { uid: 'sender_123', trocoTokens: 30, name: 'Expéditeur' };

      let recordedTxUpdates = [];
      let recordedTxSets = [];

      runTransaction.mockImplementation(async (db, updateFunction) => {
        const mockTx = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ trocoTokens: 30 }),
          }),
          update: jest.fn((ref, data) => {
            recordedTxUpdates.push({ ref, data });
          }),
          set: jest.fn((ref, data) => {
            recordedTxSets.push({ ref, data });
          }),
        };
        await updateFunction(mockTx);
      });

      let hookResult;
      function TestComponent() {
        hookResult = useChatManager({
          profile,
          setProfile,
          auth: { currentUser: { uid: 'sender_123' } },
          db: { app: {} },
        });
        return null;
      }

      render(<TestComponent />);

      let res;
      await act(async () => {
        res = await hookResult.sendPostCallTip({
          amount: 5,
          targetUid: 'receiver_post_call',
        });
      });

      expect(res.success).toBe(true);
      expect(res.partnerUid).toBe('receiver_post_call');
      expect(res.amount).toBe(5);

      expect(recordedTxUpdates.length).toBe(2);
      expect(increment).toHaveBeenCalledWith(-5);
      expect(increment).toHaveBeenCalledWith(5);

      expect(recordedTxSets.length).toBe(1);
      expect(recordedTxSets[0].data).toEqual(
        expect.objectContaining({
          type: 'payment_received',
          amount: 5,
          currency: 'tokens',
          from: 'sender_123',
        })
      );
    });

    test('sendPostCallTip stoppe et lève une erreur si partnerUid est indéfini', async () => {
      const setProfile = jest.fn();
      const profile = { uid: 'sender_123', trocoTokens: 30 };

      let hookResult;
      function TestComponent() {
        hookResult = useChatManager({
          profile,
          setProfile,
          auth: { currentUser: { uid: 'sender_123' } },
          db: { app: {} },
        });
        return null;
      }

      render(<TestComponent />);

      let caughtError = null;
      await act(async () => {
        try {
          await hookResult.sendPostCallTip({
            amount: 3,
            targetUid: null,
          });
        } catch (err) {
          caughtError = err;
        }
      });

      expect(caughtError).not.toBeNull();
      expect(window.alert).toHaveBeenCalled();
    });

    test('executeDealTransaction isole partnerUid, met à jour avec increment et écrit la notification destinataire', async () => {
      const setProfile = jest.fn();
      const profile = { uid: 'buyer_123', trocoTokens: 50, euroBalance: 100, name: 'Acheteur' };

      let recordedTxUpdates = [];
      let recordedTxSets = [];

      runTransaction.mockImplementation(async (db, updateFunction) => {
        const mockTx = {
          get: jest.fn().mockImplementation((ref) => {
            return Promise.resolve({
              exists: () => true,
              data: () => ({ trocoTokens: 50, euroBalance: 100 }),
            });
          }),
          update: jest.fn((ref, data) => {
            recordedTxUpdates.push({ ref, data });
          }),
          set: jest.fn((ref, data) => {
            recordedTxSets.push({ ref, data });
          }),
        };
        await updateFunction(mockTx);
      });

      let hookResult;
      function TestComponent() {
        hookResult = useChatManager({
          profile,
          setProfile,
          auth: { currentUser: { uid: 'buyer_123' } },
          db: { app: {} },
        });
        return null;
      }

      render(<TestComponent />);

      let dealRes;
      await act(async () => {
        dealRes = await hookResult.executeDealTransaction({
          chatId: 'chat_deal_1',
          dealId: 'deal_123',
          buyerUid: 'buyer_123',
          targetUid: 'seller_456',
          tokensAmount: 6,
          euroAmount: 0,
        });
      });

      expect(recordedTxUpdates.length).toBeGreaterThanOrEqual(2);
      expect(increment).toHaveBeenCalledWith(-6);
      expect(increment).toHaveBeenCalledWith(6);

      // Notification set in users/seller_456/notifications
      const notifWrite = recordedTxSets.find(s => s.data?.type === 'payment_received');
      expect(notifWrite).toBeDefined();
      expect(notifWrite.data).toEqual(
        expect.objectContaining({
          type: 'payment_received',
          amount: 6,
          currency: 'tokens',
          from: 'buyer_123',
        })
      );
    });

    test('firestoreService sendPostCallTip effectue la runTransaction et notifie le destinataire', async () => {
      let recordedTxUpdates = [];
      let recordedTxSets = [];

      runTransaction.mockImplementation(async (db, updateFunction) => {
        const mockTx = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ trocoTokens: 40 }),
          }),
          update: jest.fn((ref, data) => {
            recordedTxUpdates.push({ ref, data });
          }),
          set: jest.fn((ref, data) => {
            recordedTxSets.push({ ref, data });
          }),
        };
        await updateFunction(mockTx);
      });

      const res = await firestoreSendPostCallTip({
        senderUid: 'sender_123',
        targetUid: 'receiver_fs_999',
        amount: 8,
      });

      expect(res.success).toBe(true);
      expect(res.partnerUid).toBe('receiver_fs_999');
      expect(res.amount).toBe(8);

      expect(recordedTxUpdates.length).toBe(2);
      expect(increment).toHaveBeenCalledWith(-8);
      expect(increment).toHaveBeenCalledWith(8);

      expect(recordedTxSets.length).toBe(1);
      expect(recordedTxSets[0].data).toEqual(
        expect.objectContaining({
          type: 'payment_received',
          amount: 8,
          currency: 'tokens',
          from: 'sender_123',
        })
      );
    });
  });
});
