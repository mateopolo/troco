import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleCheckRateLimit } from '../src/security/checkRateLimit';

describe('🛡️ Rate Limiting & App Check Tests', () => {
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
        };
        return callback(tx);
      }),
    };
  });

  it('allows requests within rate limit quota', async () => {
    const request: any = {
      auth: { uid: 'user_good', token: {} },
      data: { action: 'send_message' },
    };
    const res = await handleCheckRateLimit(request, mockDb);
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBeGreaterThan(0);
  });

  it('blocks requests when window quota is exceeded with resource-exhausted error', async () => {
    // Simulate pre-existing full quota
    const windowStart = Math.floor(Date.now() / 60000) * 60000;
    const docKey = `rate_limits/spammer_send_message_${windowStart}`;
    inMemoryDb.set(docKey, {
      count: 30, // max limit reached
      windowStart,
      action: 'send_message',
      userId: 'spammer',
    });

    const request: any = {
      auth: { uid: 'spammer', token: {} },
      data: { action: 'send_message' },
    };
    await expect(handleCheckRateLimit(request, mockDb)).rejects.toThrow(/Fréquence trop élevée/);
  });
});
