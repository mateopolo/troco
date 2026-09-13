"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockProvider = exports.MockProvider = void 0;
class MockProvider {
    constructor() {
        this.name = 'mock';
    }
    async verifyPayment(paymentIntentId, db) {
        if (!paymentIntentId)
            return null;
        // 1. Vérification dans Firestore si un document mock_payments existe
        if (db) {
            try {
                const snap = await db.doc(`mock_payments/${paymentIntentId}`).get();
                if (snap.exists) {
                    const data = snap.data() || {};
                    return {
                        paymentIntentId,
                        amount: Number(data.amount ?? 10),
                        currency: data.currency || 'EUR',
                        status: data.status || 'succeeded',
                        metadata: data.metadata || {},
                    };
                }
            }
            catch (err) {
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
exports.MockProvider = MockProvider;
exports.mockProvider = new MockProvider();
//# sourceMappingURL=mockProvider.js.map