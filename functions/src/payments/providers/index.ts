import { PaymentProvider, mockProvider } from './mockProvider';

export * from './mockProvider';

/**
 * Retourne le fournisseur de paiement configuré.
 * Par défaut en dev : mockProvider.
 */
export function getProvider(): PaymentProvider {
  const configured = process.env.PAYMENT_PROVIDER || 'mock';

  if (configured === 'mock') {
    return mockProvider;
  }

  // Support extensible pour les providers de production (ex: Stripe)
  return mockProvider;
}
