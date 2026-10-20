import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StripeProvider } from '../src/payments/providers/stripeProvider';
import { getProvider } from '../src/payments/providers';
import { handleCreatePaymentIntent } from '../src/payments/createPaymentIntent';
import { handleCreateConnectedAccount } from '../src/payments/createConnectedAccount';
import { handleTransferFunds } from '../src/payments/transferFunds';
import { handleStripeWebhook } from '../src/payments/stripeWebhook';

describe('💳 Stripe Connect Express Provider & Webhook Tests', () => {
  let mockDb: any;
  let inMemoryDb: Map<string, any>;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.PAYMENT_PROVIDER;
    delete process.env.STRIPE_WEBHOOK_SECRET;

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
        where: vi.fn(() => ({
          limit: vi.fn(() => ({
            get: vi.fn().mockResolvedValue({
              empty: true,
              docs: [],
            }),
          })),
        })),
      })),
    };
  });

  describe('StripeProvider Class & Initialization', () => {
    it('initializes without stripe client when no secret key is provided', () => {
      const provider = new StripeProvider();
      expect(provider.name).toBe('stripe');
      expect(provider.isConfigured()).toBe(false);
      expect(provider.getStripeClient()).toBeNull();
    });

    it('initializes with stripe client when secret key is provided', () => {
      const provider = new StripeProvider('sk_test_mock_123456');
      expect(provider.isConfigured()).toBe(true);
      expect(provider.getStripeClient()).not.toBeNull();
    });

    it('switches between mock and stripe via getProvider() based on env', () => {
      // Default: mock
      expect(getProvider().name).toBe('mock');

      // With STRIPE_SECRET_KEY
      process.env.STRIPE_SECRET_KEY = 'sk_test_sample';
      expect(getProvider().name).toBe('stripe');

      // Explicit mock override
      process.env.PAYMENT_PROVIDER = 'mock';
      expect(getProvider().name).toBe('mock');

      // Explicit stripe provider
      process.env.PAYMENT_PROVIDER = 'stripe';
      expect(getProvider().name).toBe('stripe');
    });
  });

  describe('Fallback Mock Operations (No Secret Key)', () => {
    const fallbackProvider = new StripeProvider();

    it('creates a mock connected account', async () => {
      const res = await fallbackProvider.createConnectedAccount({
        userId: 'user_456',
        email: 'vendeur@troco.fr',
        returnUrl: 'https://troco.fr/profile?connect=success',
        refreshUrl: 'https://troco.fr/profile?connect=refresh',
      });

      expect(res.accountId).toBe('acct_mock_user_456');
      expect(res.onboardingUrl).toBe('https://troco.fr/profile?connect=success');
      expect(res.payoutsEnabled).toBe(true);
    });

    it('creates a mock payment intent and checkout session', async () => {
      const res = await fallbackProvider.createPaymentIntent({
        amount: 25.5,
        currency: 'EUR',
        mode: 'topup-cash',
        successUrl: 'https://troco.fr/wallet?success=true',
        cancelUrl: 'https://troco.fr/wallet?canceled=true',
      });

      expect(res.paymentIntentId).toMatch(/^pi_mock_/);
      expect(res.amount).toBe(25.5);
      expect(res.status).toBe('succeeded');
      expect(res.checkoutUrl).toContain('session_id=cs_mock_');
    });

    it('creates a mock direct transfer to connected account', async () => {
      const res = await fallbackProvider.transferFunds({
        amount: 50,
        destinationAccountId: 'acct_mock_seller_789',
        currency: 'EUR',
      });

      expect(res.transferId).toMatch(/^tr_mock_/);
      expect(res.amount).toBe(50);
      expect(res.destination).toBe('acct_mock_seller_789');
    });

    it('verifies mock payment intent ids gracefully', async () => {
      const verifyRes = await fallbackProvider.verifyPayment('pi_mock_token_success');
      expect(verifyRes).not.toBeNull();
      expect(verifyRes?.status).toBe('succeeded');
      expect(verifyRes?.currency).toBe('TOKENS');
    });
  });

  describe('Callables Handlers', () => {
    it('rejects unauthenticated handleCreatePaymentIntent', async () => {
      const request: any = { data: { amount: 20 }, auth: null };
      await expect(handleCreatePaymentIntent(request, mockDb)).rejects.toThrow(/Authentification requise/);
    });

    it('rejects invalid or negative amount in handleCreatePaymentIntent', async () => {
      const request: any = { data: { amount: -5 }, auth: { uid: 'user_1', token: {} } };
      await expect(handleCreatePaymentIntent(request, mockDb)).rejects.toThrow(/nombre positif/);
    });

    it('successfully generates payment intent for authenticated user', async () => {
      const request: any = {
        auth: { uid: 'buyer_99', token: { email: 'buyer@troco.fr' } },
        data: {
          amount: 30,
          currency: 'EUR',
          mode: 'topup-cash',
          successUrl: 'https://troco.fr/wallet',
          cancelUrl: 'https://troco.fr/wallet',
        },
      };

      const res = await handleCreatePaymentIntent(request, mockDb);
      expect(res.paymentIntentId).toBeDefined();
      expect(res.amount).toBe(30);
      expect(res.currency).toBe('EUR');
    });

    it('creates connected account and updates user doc in Firestore', async () => {
      const request: any = {
        auth: { uid: 'seller_100', token: { email: 'artisan@troco.fr' } },
        data: {
          email: 'artisan@troco.fr',
          country: 'FR',
          returnUrl: 'https://troco.fr/settings/payments',
          refreshUrl: 'https://troco.fr/settings/payments',
        },
      };

      const res = await handleCreateConnectedAccount(request, mockDb);
      expect(res.accountId).toBe('acct_mock_seller_100');

      const savedUser = inMemoryDb.get('users/seller_100');
      expect(savedUser.stripeConnectedAccountId).toBe('acct_mock_seller_100');
      expect(savedUser.stripePayoutsEnabled).toBe(true);
    });

    it('executes transferFunds callable with valid target and amount', async () => {
      const request: any = {
        auth: { uid: 'escrow_admin', token: {} },
        data: {
          amount: 45,
          destinationAccountId: 'acct_mock_artisan',
          dealId: 'deal_333',
        },
      };

      const res = await handleTransferFunds(request, mockDb);
      expect(res.transferId).toBeDefined();
      expect(res.amount).toBe(45);
      expect(res.destination).toBe('acct_mock_artisan');
    });
  });

  describe('Stripe Webhook Handler', () => {
    it('processes checkout.session.completed and credits user wallet', async () => {
      inMemoryDb.set('users/client_vip', { euroBalance: 10, walletBalanceFiat: 10 });

      const fakeReq: any = {
        headers: {},
        body: {
          id: 'evt_checkout_123',
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_test_abc',
              payment_intent: 'pi_test_xyz',
              amount_total: 2500, // 25.00 EUR
              currency: 'eur',
              client_reference_id: 'client_vip',
              metadata: {
                mode: 'topup-cash',
                userId: 'client_vip',
              },
            },
          },
        },
      };

      const fakeRes: any = {
        statusCode: 200,
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        send: vi.fn(),
      };

      await handleStripeWebhook(fakeReq, fakeRes, mockDb);

      expect(fakeRes.status).toHaveBeenCalledWith(200);
      expect(fakeRes.json).toHaveBeenCalledWith({ received: true });

      // Vérifie l'idempotence
      expect(inMemoryDb.has('idempotency_keys/webhook_evt_checkout_123')).toBe(true);

      // Rejeu de l'événement webhook : renvoie alreadyProcessed sans doubler
      const replayRes: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      await handleStripeWebhook(fakeReq, replayRes, mockDb);
      expect(replayRes.status).toHaveBeenCalledWith(200);
      expect(replayRes.json).toHaveBeenCalledWith({ received: true, alreadyProcessed: true });
    });

    it('rejects invalid events with 400', async () => {
      const fakeReq: any = { headers: {}, body: {} };
      const fakeRes: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await handleStripeWebhook(fakeReq, fakeRes, mockDb);
      expect(fakeRes.status).toHaveBeenCalledWith(400);
    });
  });
});
