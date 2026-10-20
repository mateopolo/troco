import { PaymentProvider, mockProvider } from './mockProvider';
import { stripeProvider } from './stripeProvider';

export * from './mockProvider';
export * from './stripeProvider';

/**
 * Retourne le fournisseur de paiement configuré.
 * Si process.env.STRIPE_SECRET_KEY est présente ou si PAYMENT_PROVIDER === 'stripe',
 * retourne stripeProvider. Fallback automatique sur mockProvider.
 */
export function getProvider(): PaymentProvider {
  const configured = (process.env.PAYMENT_PROVIDER || '').toLowerCase();
  const hasStripeKey = Boolean(process.env.STRIPE_SECRET_KEY);

  if (configured === 'stripe' || (hasStripeKey && configured !== 'mock')) {
    return stripeProvider;
  }

  return mockProvider;
}
