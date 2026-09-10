import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleApplyPayment } from '../src/payments/applyPayment';
import { handleClaimBonus } from '../src/payments/claimBonus';
import { handleTransferAtomically } from '../src/payments/transferAtomically';

describe('💳 Cloud Functions Financial & Wallet Engine Tests', () => {
  let mockDb: any;
  let inMemoryDb: Map<string, any>;

  beforeEach(() => {
    vi.clearAllMocks();
    inMemoryDb = new Map();

    const getDocRef = (fullPath: string) => {
      const docId = fullPath.split('/').pop();
      return {
        id: docId,
        path: fullPath,
        get: vi.fn().mockImplementation(async () => {
          const data = inMemoryDb.get(fullPath);
          return {
            exists: Boolean(data),
            id: docId,
            data: () => data,
          };
        }),
        set: vi.fn().mockImplementation(async (newData: any, opts?: any) => {
          if (opts?.merge && inMemoryDb.has(fullPath)) {
            inMemoryDb.set(fullPath, { ...inMemoryDb.get(fullPath), ...newData });
          } else {
            inMemoryDb.set(fullPath, newData);
          }
        }),
        update: vi.fn().mockImplementation(async (updates: any) => {
          const existing = inMemoryDb.get(fullPath) || {};
          inMemoryDb.set(fullPath, { ...existing, ...updates });
        }),
        delete: vi.fn().mockImplementation(async () => {
          inMemoryDb.delete(fullPath);
        }),
      };
    };

    mockDb = {
      doc: vi.fn((path: string) => getDocRef(path)),
      collection: vi.fn((colName: string) => ({
        doc: vi.fn((docId?: string) => {
          const id = docId || `auto_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          return getDocRef(`${colName}/${id}`);
        }),
      })),
      runTransaction: vi.fn().mockImplementation(async (callback: any) => {
        const tx = {
          get: vi.fn(async (docRef: any) => docRef.get()),
          set: vi.fn((docRef: any, data: any, opts: any) => docRef.set(data, opts)),
          update: vi.fn((docRef: any, data: any) => docRef.update(data)),
          delete: vi.fn((docRef: any) => docRef.delete()),
        };
        return callback(tx);
      }),
    };
  });

  describe('applyPayment', () => {
    it('rejects unauthenticated requests', async () => {
      const request: any = { data: { idempotencyKey: 'k1', paymentIntentId: 'pi_1', mode: 'topup-cash', amount: 20 }, auth: null };
      await expect(
        handleApplyPayment(request, mockDb)
      ).rejects.toThrow(/Authentification requise/);
    });

    it('successfully processes topup-cash with mock provider and applies idempotency', async () => {
      inMemoryDb.set('users/user_123', { euroBalance: 15.5, trocoTokens: 5 });

      const request: any = {
        auth: { uid: 'user_123', token: {} },
        data: {
          idempotencyKey: 'idemp-tx-101',
          paymentIntentId: 'pi_mock_12345',
          mode: 'topup-cash',
          amount: 20,
          provider: 'mock',
        },
      };

      const res = await handleApplyPayment(request, mockDb);
      expect(res.success).toBe(true);
      expect(res.newEuroBalance).toBe(35.5);

      // Replaying with identical idempotencyKey returns cached response
      const replayRes = await handleApplyPayment(request, mockDb);
      expect(replayRes.success).toBe(true);
      expect(replayRes.newEuroBalance).toBe(35.5);
    });

    it('credits troco tokens when payment intent denotes token pack', async () => {
      inMemoryDb.set('users/user_plus', { euroBalance: 0, trocoTokens: 2 });

      const request: any = {
        auth: { uid: 'user_plus', token: {} },
        data: {
          idempotencyKey: 'idemp-plus-1',
          paymentIntentId: 'pi_mock_token_15',
          mode: 'pack-tokens',
          amount: 15,
          provider: 'mock',
        },
      };

      const res = await handleApplyPayment(request, mockDb);
      expect(res.success).toBe(true);
      expect(res.newTrocoTokens).toBe(12);
    });
  });

  describe('claimBonus', () => {
    it('claims a bonus once and rejects duplicate claims', async () => {
      inMemoryDb.set('users/user_bonus', { euroBalance: 5, trocoTokens: 0 });

      const request: any = {
        auth: { uid: 'user_bonus', token: {} },
        data: {
          idempotencyKey: 'idemp-bonus-1',
          campaignId: 'sponsor-brico-1',
          amount: 5.0,
          label: 'Atelier & Outillage Pro',
        },
      };

      const res = await handleClaimBonus(request, mockDb);
      expect(res.success).toBe(true);
      expect(res.newBalance).toBe(10.0);

      // Attempting to claim the same campaign again must fail
      await expect(handleClaimBonus(request, mockDb)).rejects.toThrow(/déjà été réclamé/);
    });
  });

  describe('transferAtomically', () => {
    it('transfers tokens atomically from sender to receiver', async () => {
      inMemoryDb.set('users/sender_1', { trocoTokens: 10, euroBalance: 0, dealsCompleted: 2 });
      inMemoryDb.set('users/receiver_2', { trocoTokens: 3, euroBalance: 0, dealsCompleted: 5 });

      const request: any = {
        auth: { uid: 'sender_1', token: {} },
        data: {
          idempotencyKey: 'transfer-tkn-1',
          receiverUid: 'receiver_2',
          currency: 'tokens',
          amount: 4,
          type: 'call_tokens',
          metadata: { duration: 180 },
        },
      };

      const res = await handleTransferAtomically(request, mockDb);
      expect(res.success).toBe(true);
      expect(res.newSenderTokens).toBe(6);
      expect(res.newReceiverTokens).toBe(7);

      const senderData = inMemoryDb.get('users/sender_1');
      const receiverData = inMemoryDb.get('users/receiver_2');
      expect(senderData.trocoTokens).toBe(6);
      expect(receiverData.trocoTokens).toBe(7);
    });

    it('rejects transfer if sender has insufficient balance', async () => {
      inMemoryDb.set('users/poor_sender', { trocoTokens: 1, euroBalance: 0 });
      inMemoryDb.set('users/rich_receiver', { trocoTokens: 10, euroBalance: 0 });

      const request: any = {
        auth: { uid: 'poor_sender', token: {} },
        data: {
          idempotencyKey: 'transfer-fail-1',
          receiverUid: 'rich_receiver',
          currency: 'tokens',
          amount: 5,
          type: 'call_tokens',
        },
      };

      await expect(handleTransferAtomically(request, mockDb)).rejects.toThrow(/insuffisant/);
    });
  });
});
