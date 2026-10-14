import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleGetCurrencyFromIP } from '../src/geolocation/getCurrencyFromIP';

describe('🌍 getCurrencyFromIP Cloud Function Tests', () => {
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
      };
    };

    mockDb = {
      doc: vi.fn((path: string) => getDocRef(path)),
    };
  });

  it('renvoie les données en cache Firestore si moins de 24h', async () => {
    inMemoryDb.set('cache/geo_currency_82_64_10_20', {
      currency: 'EUR',
      countryCode: 'FR',
      countryName: 'France',
      currencySymbol: '€',
      cachedAt: { toMillis: () => Date.now() - 3600000 }, // 1h ago
    });

    const mockRequest: any = {
      rawRequest: {
        headers: { 'x-forwarded-for': '82.64.10.20' },
      },
    };

    const result = await handleGetCurrencyFromIP(mockRequest, mockDb);
    expect(result.currency).toBe('EUR');
    expect(result.cached).toBe(true);
  });

  it('appelle ipapi.co côté serveur et met en cache si non présent', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        currency: 'USD',
        country_code: 'US',
        country_name: 'United States',
        currency_name: '$',
        city: 'New York',
        ip: '198.51.100.1',
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const mockRequest: any = {
      rawRequest: {
        headers: { 'x-forwarded-for': '198.51.100.1' },
      },
    };

    const result = await handleGetCurrencyFromIP(mockRequest, mockDb);
    expect(result.currency).toBe('USD');
    expect(result.countryCode).toBe('US');
    expect(inMemoryDb.has('cache/geo_currency_198_51_100_1')).toBe(true);
  });

  it('fallback gracieux sur EUR en cas d exception réseau', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network timeout'));
    vi.stubGlobal('fetch', mockFetch);

    const mockRequest: any = {
      rawRequest: {
        headers: { 'x-forwarded-for': '203.0.113.195' },
      },
    };

    const result = await handleGetCurrencyFromIP(mockRequest, mockDb);
    expect(result.currency).toBe('EUR');
    expect(result.countryCode).toBe('FR');
  });
});
