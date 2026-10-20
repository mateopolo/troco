import { describe, it, expect, vi, beforeEach } from 'vitest';
import { paymentService } from '../../src/services/paymentService';

// Mock dependencies
vi.mock('../../src/firebase', () => ({
  db: {
    collection: vi.fn(),
    doc: vi.fn(),
  },
  auth: {
    currentUser: {
      uid: 'user_test_stripe',
      email: 'client@troco.fr',
    },
  },
  functions: {
    region: 'europe-west1',
  },
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn((_functions, name) => {
    if (name === 'createPaymentIntent') {
      return vi.fn().mockResolvedValue({
        data: {
          paymentIntentId: 'pi_stripe_live_123',
          sessionId: 'cs_test_session_456',
          checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_session_456',
          clientSecret: 'pi_123_secret_xyz',
          amount: 25,
          currency: 'EUR',
        },
      });
    }
    if (name === 'createConnectedAccount') {
      return vi.fn().mockResolvedValue({
        data: {
          accountId: 'acct_1NxxStripeExpress',
          onboardingUrl: 'https://connect.stripe.com/setup/s/acct_1Nxx',
          payoutsEnabled: true,
        },
      });
    }
    return vi.fn().mockResolvedValue({ data: {} });
  }),
}));

vi.mock('firebase/firestore', () => {
  return {
    doc: vi.fn((_db, col, id) => ({ path: `${col}/${id}` })),
    setDoc: vi.fn().mockResolvedValue(true),
    updateDoc: vi.fn().mockResolvedValue(true),
    addDoc: vi.fn().mockResolvedValue({ id: 'tx_auto_mock' }),
    increment: vi.fn((n) => n),
    serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
    collection: vi.fn((_db, col) => ({ path: col })),
    query: vi.fn((col, ...clauses) => ({ col, clauses })),
    where: vi.fn((field, op, val) => ({ field, op, val })),
    onSnapshot: vi.fn((q, callback) => {
      // Simulation immédiate de notification de transaction validée par le webhook Stripe
      setTimeout(() => {
        callback({
          empty: false,
          docs: [
            {
              data: () => ({
                paymentIntentId: 'pi_stripe_live_123',
                status: 'completed',
                amountTtc: 25,
                userId: 'user_test_stripe',
              }),
            },
          ],
        });
      }, 10);
      return vi.fn(); // unsubscribe
    }),
  };
});

describe('💳 Client paymentService - Stripe Connect Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCheckoutSession', () => {
    it('creates a checkout session and returns paymentIntentId and checkoutUrl without automatic redirect', async () => {
      const res = await paymentService.createCheckoutSession({
        mode: 'topup-cash',
        amount: 25,
        currency: 'EUR',
        redirect: false,
      });

      expect(res.success).toBe(true);
      expect(res.paymentIntentId).toBe('pi_stripe_live_123');
      expect(res.sessionId).toBe('cs_test_session_456');
      expect(res.checkoutUrl).toContain('checkout.stripe.com');
    });

    it('handles fallback gracefully when amount is specified', async () => {
      const res = await paymentService.createCheckoutSession({
        mode: 'boost',
        amount: 4.99,
        listingId: 'listing_123',
        redirect: false,
      });

      expect(res.success).toBe(true);
      expect(res.amount).toBe(25); // mocked response amount
    });
  });

  describe('listenToPaymentSuccess', () => {
    it('listens to real-time firestore updates and resolves on webhook completion', async () => {
      const onUpdate = vi.fn();
      const res = await paymentService.listenToPaymentSuccess({
        paymentIntentId: 'pi_stripe_live_123',
        timeoutMs: 1000,
        onUpdate,
      });

      expect(res.success).toBe(true);
      expect(res.paymentIntentId).toBe('pi_stripe_live_123');
      expect(res.transaction.status).toBe('completed');
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          paymentIntentId: 'pi_stripe_live_123',
        })
      );
    });

    it('rejects if neither paymentIntentId nor sessionId is provided', async () => {
      await expect(paymentService.listenToPaymentSuccess({})).rejects.toThrow(
        /paymentIntentId ou sessionId requis/
      );
    });
  });

  describe('createConnectedAccount', () => {
    it('calls cloud function to onboard express account without redirect', async () => {
      const res = await paymentService.createConnectedAccount({
        email: 'vendeur@troco.fr',
        redirect: false,
      });

      expect(res.success).toBe(true);
      expect(res.accountId).toBe('acct_1NxxStripeExpress');
      expect(res.onboardingUrl).toBe('https://connect.stripe.com/setup/s/acct_1Nxx');
    });
  });

  describe('applyPayment', () => {
    it('applies payment directly with anti-replay lock', async () => {
      const res = await paymentService.applyPayment({
        paymentIntentId: 'pi_unique_tx_999',
        mode: 'topup-cash',
        amount: 15,
        currency: 'EUR',
      });

      expect(res.success).toBe(true);
      expect(res.amount).toBe(15);

      // Second call with same paymentIntentId activates anti-replay lock
      const secondRes = await paymentService.applyPayment({
        paymentIntentId: 'pi_unique_tx_999',
        mode: 'topup-cash',
        amount: 15,
      });

      expect(secondRes.success).toBe(true);
      expect(secondRes.alreadyProcessed).toBe(true);
    });
  });
});
