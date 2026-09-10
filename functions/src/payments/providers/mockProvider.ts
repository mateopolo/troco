import { Firestore } from 'firebase-admin/firestore';

export interface PaymentVerificationResult {
  paymentIntentId: string;
  amount: number;
  currency: 'EUR' | 'TOKENS';
  status: 'succeeded' | 'failed' | 'pending';
  metadata?: Record<string, unknown>;
}

export interface PaymentProvider {
  name: string;
  verifyPayment(paymentIntentId: string, db?: Firestore): Promise<PaymentVerificationResult | null>;
}

export class MockProvider implements PaymentProvider {
  name = 'mock';

  async verifyPayment(paymentIntentId: string, db?: Firestore): Promise<PaymentVerificationResult | null> {
    if (!paymentIntentId) return null;

    // 1. Vérification dans Firestore si un document mock_payments existe
    if (db) {
      try {
        const snap = await db.doc(`mock_payments/${paymentIntentId}`).get();
        if (snap.exists) {
          const data = snap.data() || {};
          return {
            paymentIntentId,
            amount: Number(data.amount ?? 10),
            currency: (data.currency as 'EUR' | 'TOKENS') || 'EUR',
            status: (data.status as 'succeeded' | 'failed' | 'pending') || 'succeeded',
            metadata: data.metadata || {},
          };
        }
      } catch (err) {
        console.warn('[MockProvider] Firestore check failed:', err);
      }
    }

    // 2. Fallback pour développement / tests unitaires (pi_mock_*)
    if (paymentIntentId.startsWith('pi_mock_') || paymentIntentId.startsWith('mock_')) {
      const isToken = paymentIntentId.includes('token') || paymentIntentId.includes('pack');
      const isFailed = paymentIntentId.includes('fail');
      return {
        paymentIntentId,
        amount: isToken ? 10 : 20.00,
        currency: isToken ? 'TOKENS' : 'EUR',
        status: isFailed ? 'failed' : 'succeeded',
        metadata: {},
      };
    }

    return null;
  }
}

export const mockProvider = new MockProvider();
