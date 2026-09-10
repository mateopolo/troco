import { describe, it, expect, vi, beforeEach } from 'vitest';
import { anonymizeTransactions } from '../src/gdpr/anonymizeTransactions';
import { handleDeleteUserCompletely } from '../src/gdpr/deleteUserCompletely';
import { handleRestoreAccount } from '../src/gdpr/restoreAccount';

describe('🔒 GDPR Art. 17 & Accounting Compliance Tests', () => {
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
        where: vi.fn((field: string, op: string, val: any) => ({
          get: vi.fn().mockImplementation(async () => {
            const docs: any[] = [];
            for (const [key, data] of inMemoryDb.entries()) {
              if (key.startsWith(`${colName}/`) && data[field] === val) {
                const id = key.replace(`${colName}/`, '');
                docs.push({
                  id,
                  data: () => data,
                  ref: {
                    update: vi.fn(async (upd: any) => {
                      inMemoryDb.set(key, { ...data, ...upd });
                    }),
                    delete: vi.fn(async () => {
                      inMemoryDb.delete(key);
                    }),
                  },
                });
              }
            }
            return { docs, size: docs.length, empty: docs.length === 0 };
          }),
        })),
      })),
      batch: vi.fn(() => {
        const ops: Function[] = [];
        return {
          update: vi.fn((ref: any, data: any) => {
            ops.push(() => ref.update(data));
          }),
          delete: vi.fn((ref: any) => {
            ops.push(() => ref.delete());
          }),
          commit: vi.fn(async () => {
            for (const op of ops) await op();
          }),
        };
      }),
    };
  });

  it('anonymizes transactions by pseudonymizing UIDs and replacing names while preserving financial amounts', async () => {
    inMemoryDb.set('transactions/tx_1', {
      userId: 'target_uid_123',
      userName: 'Alice Dupont',
      userEmail: 'alice@example.com',
      amountTtc: 49.99,
      currency: 'EUR',
      date: '2026-03-01T10:00:00Z',
    });

    inMemoryDb.set('transactions/tx_2', {
      userId: 'other_user',
      partnerUid: 'target_uid_123',
      partnerName: 'Alice Dupont',
      amount: 15.00,
      currency: 'EUR',
      date: '2026-03-02T10:00:00Z',
    });

    await anonymizeTransactions('target_uid_123', mockDb);

    const tx1 = inMemoryDb.get('transactions/tx_1');
    expect(tx1.userId).toMatch(/^deleted_/);
    expect(tx1.userName).toBe('Utilisateur supprimé');
    expect(tx1.userEmail).toBe('');
    expect(tx1.amountTtc).toBe(49.99); // Preserved for 10-year accounting
    expect(tx1.anonymized).toBe(true);

    const tx2 = inMemoryDb.get('transactions/tx_2');
    expect(tx2.partnerUid).toMatch(/^deleted_/);
    expect(tx2.partnerName).toBe('Utilisateur supprimé');
  });

  it('schedules soft deletion with 30-day grace period', async () => {
    inMemoryDb.set('users/user_soft', { name: 'Bob', email: 'bob@example.com' });
    inMemoryDb.set('users_public/user_soft', { name: 'Bob' });

    const request: any = {
      auth: { uid: 'user_soft', token: {} },
      data: { confirm: true, immediate: false },
    };
    const res = await handleDeleteUserCompletely(request, mockDb, {} as any);

    expect(res.success).toBe(true);
    expect(res.mode).toBe('soft');

    const userDoc = inMemoryDb.get('users/user_soft');
    expect(userDoc.pendingDeletion).toBe(true);
    expect(userDoc.deletionScheduledAt).toBeDefined();
  });

  it('restores account within grace period', async () => {
    inMemoryDb.set('users/user_restore', {
      name: 'Bob',
      pendingDeletion: true,
      deletionScheduledAt: '2026-04-10T00:00:00Z',
    });

    const request: any = {
      auth: { uid: 'user_restore', token: {} },
      data: {},
    };
    const res = await handleRestoreAccount(request, mockDb);

    expect(res.success).toBe(true);
    const userDoc = inMemoryDb.get('users/user_restore');
    expect(userDoc.pendingDeletion).toBe(false);
  });
});
