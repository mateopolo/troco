/**
 * pricingService.js
 * Moteur Fintech — Parité de Pouvoir d'Achat (PPP), Verrouillage Géo-IP et Taux de Change Cross-Border
 */

// Devises et Taux de Change de référence temps réel (par rapport à 1.0 EUR)
export const DEFAULT_EXCHANGE_RATES_TO_EUR = {
  EUR: 1.0,
  USD: 0.92,   // 1 USD = 0.92 EUR (1 EUR = 1.087 USD)
  CHF: 1.05,   // 1 CHF = 1.05 EUR (1 EUR = 0.952 CHF)
  GBP: 1.17,   // 1 GBP = 1.17 EUR (1 EUR = 0.855 GBP)
  CAD: 0.68,   // 1 CAD = 0.68 EUR
  AUD: 0.60,   // 1 AUD = 0.60 EUR
  BRL: 0.17,   // 1 BRL = 0.17 EUR
  INR: 0.011,  // 1 INR = 0.011 EUR
  JPY: 0.0062, // 1 JPY = 0.0062 EUR
  SEK: 0.088,  // 1 SEK = 0.088 EUR
  NOK: 0.088,  // 1 NOK = 0.088 EUR
  DKK: 0.134,  // 1 DKK = 0.134 EUR
  PLN: 0.23,   // 1 PLN = 0.23 EUR
  TRY: 0.028,  // 1 TRY = 0.028 EUR
  MAD: 0.093,  // 1 MAD = 0.093 EUR
};

// Symboles des principales devises mondiales
export const CURRENCY_SYMBOLS = {
  EUR: '€',
  USD: '$',
  CHF: 'CHF',
  GBP: '£',
  CAD: 'CA$',
  AUD: 'AU$',
  BRL: 'R$',
  INR: '₹',
  JPY: '¥',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  PLN: 'zł',
  TRY: '₺',
  MAD: 'DH',
  XOF: 'FCFA',
  XAF: 'FCFA',
};

// Matrice mondiale PPP & Tarifs Troco Plus par région
export const REGIONAL_PPP_MATRIX = {
  // Europe de l'Ouest
  FR: { currency: 'EUR', symbol: '€', pppCoeff: 1.0, plusEssential: 9.99, plusPro: 19.99, name: 'France' },
  BE: { currency: 'EUR', symbol: '€', pppCoeff: 1.0, plusEssential: 9.99, plusPro: 19.99, name: 'Belgique' },
  DE: { currency: 'EUR', symbol: '€', pppCoeff: 1.0, plusEssential: 9.99, plusPro: 19.99, name: 'Allemagne' },
  IT: { currency: 'EUR', symbol: '€', pppCoeff: 0.95, plusEssential: 8.99, plusPro: 18.99, name: 'Italie' },
  ES: { currency: 'EUR', symbol: '€', pppCoeff: 0.90, plusEssential: 8.99, plusPro: 17.99, name: 'Espagne' },
  PT: { currency: 'EUR', symbol: '€', pppCoeff: 0.75, plusEssential: 7.49, plusPro: 14.99, name: 'Portugal' },
  CH: { currency: 'CHF', symbol: 'CHF', pppCoeff: 1.4, plusEssential: 11.90, plusPro: 23.90, name: 'Suisse' },
  GB: { currency: 'GBP', symbol: '£', pppCoeff: 1.05, plusEssential: 8.99, plusPro: 17.99, name: 'Royaume-Uni' },

  // Amérique du Nord
  US: { currency: 'USD', symbol: '$', pppCoeff: 1.1, plusEssential: 9.99, plusPro: 19.99, name: 'États-Unis' },
  CA: { currency: 'CAD', symbol: 'CA$', pppCoeff: 1.05, plusEssential: 13.99, plusPro: 27.99, name: 'Canada' },

  // Océanie
  AU: { currency: 'AUD', symbol: 'AU$', pppCoeff: 1.1, plusEssential: 15.99, plusPro: 31.99, name: 'Australie' },

  // Asie & Moyen Orient
  JP: { currency: 'JPY', symbol: '¥', pppCoeff: 0.9, plusEssential: 1400, plusPro: 2800, name: 'Japon' },
  IN: { currency: 'INR', symbol: '₹', pppCoeff: 0.25, plusEssential: 249, plusPro: 499, name: 'Inde' },

  // Amérique Latine
  BR: { currency: 'BRL', symbol: 'R$', pppCoeff: 0.4, plusEssential: 24.90, plusPro: 49.90, name: 'Brésil' },
  MX: { currency: 'MXN', symbol: '$', pppCoeff: 0.35, plusEssential: 99, plusPro: 199, name: 'Mexique' },

  // Afrique & Maghreb
  MA: { currency: 'MAD', symbol: 'DH', pppCoeff: 0.3, plusEssential: 49, plusPro: 99, name: 'Maroc' },
  DZ: { currency: 'DZD', symbol: 'DA', pppCoeff: 0.25, plusEssential: 600, plusPro: 1200, name: 'Algérie' },
  TN: { currency: 'TND', symbol: 'DT', pppCoeff: 0.25, plusEssential: 15, plusPro: 30, name: 'Tunisie' },
  SN: { currency: 'XOF', symbol: 'FCFA', pppCoeff: 0.2, plusEssential: 2500, plusPro: 5000, name: 'Sénégal' },
  CI: { currency: 'XOF', symbol: 'FCFA', pppCoeff: 0.2, plusEssential: 2500, plusPro: 5000, name: 'Côte d\'Ivoire' },
};

/**
 * Détection automatique & verrouillage strict de la devise par géolocalisation IP
 */
export async function detectGeoCurrency() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    // Requête géo-IP légère et rapide
    const response = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const country = (data.country_code || data.country || 'FR').toUpperCase();
      const currency = data.currency || (REGIONAL_PPP_MATRIX[country]?.currency || 'EUR');
      const symbol = CURRENCY_SYMBOLS[currency] || '€';

      return {
        countryCode: country,
        countryName: data.country_name || country,
        currency,
        currencySymbol: symbol,
        city: data.city || '',
        ip: data.ip || '',
        isGeoLocked: true,
      };
    }
  } catch (_) {
    // Fallback gracieux basé sur le fuseau horaire du terminal
  }

  // Fallback déterministe hors-ligne ou si bloqueur de pub
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Zurich') || tz.includes('Geneva')) {
      return { countryCode: 'CH', countryName: 'Suisse', currency: 'CHF', currencySymbol: 'CHF', isGeoLocked: true };
    }
    if (tz.includes('London')) {
      return { countryCode: 'GB', countryName: 'Royaume-Uni', currency: 'GBP', currencySymbol: '£', isGeoLocked: true };
    }
    if (tz.includes('New_York') || tz.includes('Los_Angeles') || tz.includes('Chicago')) {
      return { countryCode: 'US', countryName: 'États-Unis', currency: 'USD', currencySymbol: '$', isGeoLocked: true };
    }
    if (tz.includes('Toronto') || tz.includes('Montreal')) {
      return { countryCode: 'CA', countryName: 'Canada', currency: 'CAD', currencySymbol: 'CA$', isGeoLocked: true };
    }
    if (tz.includes('Sao_Paulo')) {
      return { countryCode: 'BR', countryName: 'Brésil', currency: 'BRL', currencySymbol: 'R$', isGeoLocked: true };
    }
    if (tz.includes('Kolkata')) {
      return { countryCode: 'IN', countryName: 'Inde', currency: 'INR', currencySymbol: '₹', isGeoLocked: true };
    }
    if (tz.includes('Tokyo')) {
      return { countryCode: 'JP', countryName: 'Japon', currency: 'JPY', currencySymbol: '¥', isGeoLocked: true };
    }
  } catch (_) {}

  return {
    countryCode: 'FR',
    countryName: 'France',
    currency: 'EUR',
    currencySymbol: '€',
    isGeoLocked: true,
  };
}

/**
 * Convertit un montant entre deux devises quelconques via le pivot EUR
 * @param {number} amount Montant source
 * @param {string} fromCurrency Devise source
 * @param {string} toCurrency Devise cible
 * @returns {number} Montant converti
 */
export function convertCurrency(amount, fromCurrency = 'EUR', toCurrency = 'EUR') {
  const num = Number(amount) || 0;
  if (fromCurrency === toCurrency || num === 0) return num;

  const fromRate = DEFAULT_EXCHANGE_RATES_TO_EUR[fromCurrency] || 1.0;
  const toRate = DEFAULT_EXCHANGE_RATES_TO_EUR[toCurrency] || 1.0;

  // 1. Conversion vers EUR : amountInEur = amount * fromRate
  const amountInEur = num * fromRate;

  // 2. Conversion EUR vers toCurrency : amountInTarget = amountInEur / toRate
  const converted = amountInEur / toRate;

  // Arrondi selon les décimales de la devise cible
  if (['JPY', 'KRW', 'XOF', 'XAF', 'IDR', 'VND', 'MGA'].includes(toCurrency)) {
    return Math.round(converted);
  }
  return Number(converted.toFixed(2));
}

/**
 * Formate un montant monétaire avec le symbole approprié
 */
export function formatCurrencyAmount(amount, currency = 'EUR', locale = 'fr-FR') {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: ['JPY', 'KRW', 'XOF', 'XAF', 'IDR', 'VND', 'MGA'].includes(currency) ? 0 : 2,
    }).format(amount);
  } catch (_) {
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    return `${Number(amount).toFixed(2)} ${symbol}`;
  }
}

/**
 * Renvoie les informations d'un abonnement Troco Plus indexé sur la parité de pouvoir d'achat (PPP)
 */
export function getRegionalSubscriptionPlan(planKey = 'essential', countryCode = 'FR') {
  const code = (countryCode || 'FR').toUpperCase();
  const region = REGIONAL_PPP_MATRIX[code] || REGIONAL_PPP_MATRIX.FR;
  const price = planKey === 'pro' ? region.plusPro : region.plusEssential;

  return {
    planKey,
    title: planKey === 'pro' ? 'Troco Plus Pro' : 'Troco Plus Essentiel',
    price,
    currency: region.currency,
    currencySymbol: region.symbol,
    formattedPrice: formatCurrencyAmount(price, region.currency),
    countryName: region.name,
    pppCoeff: region.pppCoeff,
    pppDiscount: region.pppCoeff < 1.0 ? Math.round((1 - region.pppCoeff) * 100) : 0,
  };
}

export default {
  detectGeoCurrency,
  convertCurrency,
  formatCurrencyAmount,
  getRegionalSubscriptionPlan,
  CURRENCY_SYMBOLS,
  DEFAULT_EXCHANGE_RATES_TO_EUR,
};
