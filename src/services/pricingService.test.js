import {
  detectGeoCurrency,
  convertCurrency,
  formatCurrencyAmount,
  getRegionalSubscriptionPlan,
  CURRENCY_SYMBOLS,
  DEFAULT_EXCHANGE_RATES_TO_EUR,
} from './pricingService';

describe('Phase 58 : pricingService (Fintech PPP & Cross-Border FX)', () => {
  it('convertit correctement les montants entre devises via le pivot EUR', () => {
    // 100 EUR vers USD (1 USD = 0.92 EUR -> 100 / 0.92 = 108.70 USD)
    const usdVal = convertCurrency(100, 'EUR', 'USD');
    expect(usdVal).toBeCloseTo(108.7, 1);

    // 100 CHF vers EUR (1 CHF = 1.05 EUR -> 105 EUR)
    const eurVal = convertCurrency(100, 'CHF', 'EUR');
    expect(eurVal).toBe(105);

    // Même devise : renvoie le montant inchangé
    expect(convertCurrency(50, 'EUR', 'EUR')).toBe(50);
  });

  it('fournit une tarification PPP adaptée pour les abonnements Troco Plus régionaux', () => {
    // France (EUR standard)
    const planFr = getRegionalSubscriptionPlan('essential', 'FR');
    expect(planFr.currency).toBe('EUR');
    expect(planFr.price).toBe(9.99);

    // Suisse (CHF adapté)
    const planCh = getRegionalSubscriptionPlan('essential', 'CH');
    expect(planCh.currency).toBe('CHF');
    expect(planCh.price).toBe(11.90);

    // Brésil (BRL avec index PPP fort)
    const planBr = getRegionalSubscriptionPlan('essential', 'BR');
    expect(planBr.currency).toBe('BRL');
    expect(planBr.price).toBe(24.90);
    expect(planBr.pppDiscount).toBe(60);

    // Inde (INR)
    const planIn = getRegionalSubscriptionPlan('essential', 'IN');
    expect(planIn.currency).toBe('INR');
    expect(planIn.price).toBe(249);
    expect(planIn.pppDiscount).toBe(75);
  });

  it('formate proprement les devises avec les symboles monétaires internationaux', () => {
    const formattedEur = formatCurrencyAmount(19.99, 'EUR', 'fr-FR');
    expect(formattedEur).toContain('19,99');

    const formattedUsd = formatCurrencyAmount(9.99, 'USD', 'en-US');
    expect(formattedUsd).toContain('9.99');
  });

  it('détecte la devise par défaut de façon robuste en fallback', async () => {
    const geo = await detectGeoCurrency();
    expect(geo).toBeDefined();
    expect(geo.currency).toBeDefined();
    expect(geo.isGeoLocked).toBe(true);
  });
});
