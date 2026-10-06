import { isTrackerAllowed } from './consentManager';
import { translations } from '../data/translationsData.js';
import { secondaryTranslations } from '../data/translationsSecondary.js';

/**
 * pricingService.js
 * Source Unique de Vérité — Moteur Fintech, Parité de Pouvoir d'Achat (PPP),
 * Verrouillage Géo-IP, Taux de Change Cross-Border et Plans d'Abonnement Troco Plus.
 */

// =====================================================================
// 1. DEVISES, TAUX DE CHANGE ET SYMBOLES
// =====================================================================

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

// =====================================================================
// 2. MATRICES PPP & TARIFS DE BASE TROCO PLUS
// =====================================================================

// Base de référence : France / Eurozone (FR: 1.0)
export const BASE_PRICES_EUR = {
  essential: 9.99,
  pro: 19.99,
};

// Matrice régionale PPP & Tarifs Troco Plus (format services)
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

// Matrice mondiale détaillée des coefficients PPP (format engine)
export const PPP_COUNTRY_MATRIX = {
  // Europe de l'Ouest & Nord
  FR: { coefficient: 1.0, currency: 'EUR', symbol: '€', rateToEur: 1.0, countryName: 'France' },
  BE: { coefficient: 1.0, currency: 'EUR', symbol: '€', rateToEur: 1.0, countryName: 'Belgique' },
  DE: { coefficient: 1.05, currency: 'EUR', symbol: '€', rateToEur: 1.0, countryName: 'Allemagne' },
  IT: { coefficient: 0.95, currency: 'EUR', symbol: '€', rateToEur: 1.0, countryName: 'Italie' },
  ES: { coefficient: 0.9, currency: 'EUR', symbol: '€', rateToEur: 1.0, countryName: 'Espagne' },
  PT: { coefficient: 0.75, currency: 'EUR', symbol: '€', rateToEur: 1.0, countryName: 'Portugal' },
  CH: { coefficient: 1.4, currency: 'CHF', symbol: 'CHF', rateToEur: 0.95, countryName: 'Suisse' },
  NO: { coefficient: 1.4, currency: 'NOK', symbol: 'kr', rateToEur: 0.088, countryName: 'Norvège' },
  SE: { coefficient: 1.1, currency: 'SEK', symbol: 'kr', rateToEur: 0.088, countryName: 'Suède' },
  DK: { coefficient: 1.2, currency: 'DKK', symbol: 'kr', rateToEur: 0.134, countryName: 'Danemark' },
  GB: { coefficient: 1.05, currency: 'GBP', symbol: '£', rateToEur: 1.17, countryName: 'Royaume-Uni' },
  UK: { coefficient: 1.05, currency: 'GBP', symbol: '£', rateToEur: 1.17, countryName: 'Royaume-Uni' },

  // Amérique du Nord & Océanie
  US: { coefficient: 1.1, currency: 'USD', symbol: '$', rateToEur: 0.92, countryName: 'États-Unis' },
  CA: { coefficient: 1.05, currency: 'CAD', symbol: '$', rateToEur: 0.68, countryName: 'Canada' },
  AU: { coefficient: 1.1, currency: 'AUD', symbol: '$', rateToEur: 0.60, countryName: 'Australie' },
  NZ: { coefficient: 1.05, currency: 'NZD', symbol: '$', rateToEur: 0.56, countryName: 'Nouvelle-Zélande' },

  // Asie
  JP: { coefficient: 0.9, currency: 'JPY', symbol: '¥', rateToEur: 0.0062, countryName: 'Japon' },
  IN: { coefficient: 0.25, currency: 'INR', symbol: '₹', rateToEur: 0.011, countryName: 'Inde' },
  KR: { coefficient: 0.9, currency: 'KRW', symbol: '₩', rateToEur: 0.00069, countryName: 'Corée du Sud' },
  VN: { coefficient: 0.25, currency: 'VND', symbol: '₫', rateToEur: 0.000037, countryName: 'Vietnam' },
  ID: { coefficient: 0.25, currency: 'IDR', symbol: 'Rp', rateToEur: 0.000059, countryName: 'Indonésie' },
  PH: { coefficient: 0.3, currency: 'PHP', symbol: '₱', rateToEur: 0.016, countryName: 'Philippines' },

  // Amérique Latine
  BR: { coefficient: 0.4, currency: 'BRL', symbol: 'R$', rateToEur: 0.17, countryName: 'Brésil' },
  MX: { coefficient: 0.35, currency: 'MXN', symbol: '$', rateToEur: 0.054, countryName: 'Mexique' },
  AR: { coefficient: 0.3, currency: 'USD', symbol: '$', rateToEur: 0.92, countryName: 'Argentine' },
  CO: { coefficient: 0.3, currency: 'COP', symbol: '$', rateToEur: 0.00024, countryName: 'Colombie' },
  CL: { coefficient: 0.5, currency: 'CLP', symbol: '$', rateToEur: 0.00098, countryName: 'Chili' },

  // Afrique & Maghreb
  MA: { coefficient: 0.3, currency: 'MAD', symbol: 'DH', rateToEur: 0.093, countryName: 'Maroc' },
  DZ: { coefficient: 0.25, currency: 'DZD', symbol: 'DA', rateToEur: 0.0069, countryName: 'Algérie' },
  TN: { coefficient: 0.25, currency: 'TND', symbol: 'DT', rateToEur: 0.30, countryName: 'Tunisie' },
  SN: { coefficient: 0.2, currency: 'XOF', symbol: 'FCFA', rateToEur: 0.0015, countryName: 'Sénégal' },
  CI: { coefficient: 0.2, currency: 'XOF', symbol: 'FCFA', rateToEur: 0.0015, countryName: 'Côte d\'Ivoire' },
  CM: { coefficient: 0.2, currency: 'XAF', symbol: 'FCFA', rateToEur: 0.0015, countryName: 'Cameroun' },
  MG: { coefficient: 0.2, currency: 'MGA', symbol: 'Ar', rateToEur: 0.00020, countryName: 'Madagascar' },

  // Europe de l'Est & Moyen Orient
  TR: { coefficient: 0.3, currency: 'TRY', symbol: '₺', rateToEur: 0.028, countryName: 'Turquie' },
  PL: { coefficient: 0.65, currency: 'PLN', symbol: 'zł', rateToEur: 0.23, countryName: 'Pologne' },
  RO: { coefficient: 0.5, currency: 'RON', symbol: 'lei', rateToEur: 0.20, countryName: 'Roumanie' },
  AE: { coefficient: 1.15, currency: 'AED', symbol: 'AED', rateToEur: 0.25, countryName: 'Émirats Arabes Unis' },
};

export const TROCO_PLUS_BENEFIT_KEYS = {
  essential: [
    'plan.benefit.tokens_5',
    'plan.benefit.boost_1',
    'plan.benefit.badge_member',
    'plan.benefit.contact_priority',
    'plan.benefit.no_commitment'
  ],
  pro: [
    'plan.benefit.tokens_15',
    'plan.benefit.boosts_3',
    'plan.benefit.badge_vip',
    'plan.benefit.visibility_max',
    'plan.benefit.support_priority',
    'plan.benefit.no_commitment'
  ]
};

// =====================================================================
// 3. FONCTIONS DE DÉTECTION DU PAYS ET DE LA DEVISE
// =====================================================================

/**
 * Détection automatique du pays de l'utilisateur (méthode rapide synchrone)
 */
export function detectUserCountry(fallbackCountry = 'FR') {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Europe/Paris')) return 'FR';
    if (tz.includes('Europe/London')) return 'GB';
    if (tz.includes('Europe/Berlin')) return 'DE';
    if (tz.includes('Europe/Rome')) return 'IT';
    if (tz.includes('Europe/Madrid')) return 'ES';
    if (tz.includes('Europe/Zurich')) return 'CH';
    if (tz.includes('Europe/Oslo')) return 'NO';
    if (tz.includes('Europe/Stockholm')) return 'SE';
    if (tz.includes('America/New_York') || tz.includes('America/Los_Angeles') || tz.includes('America/Chicago')) return 'US';
    if (tz.includes('America/Toronto') || tz.includes('America/Vancouver') || tz.includes('America/Montreal')) return 'CA';
    if (tz.includes('America/Sao_Paulo')) return 'BR';
    if (tz.includes('America/Mexico_City')) return 'MX';
    if (tz.includes('Asia/Tokyo')) return 'JP';
    if (tz.includes('Asia/Kolkata')) return 'IN';
    if (tz.includes('Africa/Casablanca')) return 'MA';
    if (tz.includes('Africa/Algiers')) return 'DZ';
    if (tz.includes('Africa/Tunis')) return 'TN';
    if (tz.includes('Africa/Dakar')) return 'SN';
    if (tz.includes('Africa/Abidjan')) return 'CI';
    if (tz.includes('Australia/')) return 'AU';

    // Détection via locale du navigateur
    if (typeof navigator !== 'undefined') {
      const lang = (navigator.language || navigator.userLanguage || '').toUpperCase();
      const split = lang.split('-');
      if (split[1] && PPP_COUNTRY_MATRIX[split[1]]) return split[1];
      if (split[0] === 'FR') return 'FR';
      if (split[0] === 'EN') return 'US';
      if (split[0] === 'ES') return 'ES';
    }
  } catch (_) {}

  return fallbackCountry;
}

/**
 * Détection automatique & verrouillage strict de la devise par géolocalisation IP
 * Respecte le principe de minimisation RGPD : aucun appel externe à ipapi.co sans consentement préalable.
 */
export async function detectGeoCurrency() {
  // 1. Appel réseau externe SEULEMENT si l'utilisateur a expressément consenti aux fonctionnalités de géolocalisation/analytics
  if (isTrackerAllowed('external_geoip')) {
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

// =====================================================================
// 4. CONVERSIONS DE DEVISES ET FORMATAGES
// =====================================================================

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
 * Formate un prix avec Intl.NumberFormat (alias préservé pour compatibilité pricingEngine)
 */
export function formatPrice(amount, currency = 'EUR', locale = undefined) {
  try {
    const defaultLocale = typeof navigator !== 'undefined' ? (navigator.language || 'fr-FR') : 'fr-FR';
    return new Intl.NumberFormat(locale || defaultLocale, {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: ['JPY', 'KRW', 'XOF', 'XAF', 'IDR', 'VND', 'MGA'].includes(currency) ? 0 : 2,
    }).format(amount);
  } catch (_) {
    return `${amount} ${currency}`;
  }
}

// =====================================================================
// 5. CALCULS PPP ET PLANS D'ABONNEMENT TROCO PLUS
// =====================================================================

/**
 * Calcule le prix indexé sur la Parité de Pouvoir d'Achat (PPP) et converti
 */
export function calculatePppPrice(basePriceEur, countryCode = 'FR') {
  const pppData = PPP_COUNTRY_MATRIX[countryCode.toUpperCase()] || PPP_COUNTRY_MATRIX.FR;
  const pppPriceEur = basePriceEur * pppData.coefficient;
  const localPriceRaw = pppPriceEur / pppData.rateToEur;

  // Arrondi commercial psychologique propre selon la devise
  let roundedPrice = localPriceRaw;
  if (['JPY', 'KRW', 'XOF', 'XAF', 'IDR', 'VND', 'COP', 'CLP', 'MGA'].includes(pppData.currency)) {
    roundedPrice = Math.round(localPriceRaw / 100) * 100 || Math.round(localPriceRaw);
  } else {
    roundedPrice = Math.round(localPriceRaw * 100) / 100;
    // Si c'est proche d'un .99, on ajuste élégamment
    const integerPart = Math.floor(roundedPrice);
    if (Math.abs(roundedPrice - integerPart) > 0.1) {
      roundedPrice = integerPart + 0.99;
    }
  }

  return {
    raw: roundedPrice,
    currency: pppData.currency,
    symbol: pppData.symbol,
    coefficient: pppData.coefficient,
    countryName: pppData.countryName,
    formatted: formatPrice(roundedPrice, pppData.currency),
  };
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

/**
 * Génère les plans d'abonnement Troco Plus localisés selon le pays et la langue
 */
export function getLocalizedTrocoPlusPlans(countryCode = null, lang = null) {
  const code = countryCode || detectUserCountry();
  const essentialCalc = calculatePppPrice(BASE_PRICES_EUR.essential, code);
  const proCalc = calculatePppPrice(BASE_PRICES_EUR.pro, code);

  let currentLanguage = lang;
  if (!currentLanguage && typeof window !== 'undefined') {
    try {
      currentLanguage = localStorage.getItem('troco_app_lang') || localStorage.getItem('troco_language') || localStorage.getItem('troco_lang');
    } catch (_) {}
  }
  let normalizedLang = (typeof currentLanguage === 'string' ? currentLanguage.toUpperCase() : 'FR');
  if (normalizedLang === 'JP') normalizedLang = 'JA';
  if (normalizedLang === 'CN') normalizedLang = 'ZH';
  const t = (k) => translations?.[normalizedLang]?.[k]
    || secondaryTranslations?.[normalizedLang]?.[k]
    || translations?.['FR']?.[k]
    || secondaryTranslations?.['FR']?.[k]
    || k;

  return [
    {
      id: 'plus-essential',
      planKey: 'essential',
      name_key: 'plan.essential.name',
      title: t('plan.essential.name'),
      price: essentialCalc.raw,
      formattedPrice: essentialCalc.formatted,
      currency: essentialCalc.currency,
      countryName: essentialCalc.countryName,
      pppApplied: essentialCalc.coefficient < 1.0,
      pppDiscountPercent: essentialCalc.coefficient < 1.0 ? Math.round((1 - essentialCalc.coefficient) * 100) : 0,
      period_key: 'plan.period.monthly',
      period: t('plan.period.monthly'),
      tokensMonthly: 5,
      boostsMonthly: 1,
      badge_key: 'plan.essential.badge',
      badge: t('plan.essential.badge'),
      popular: true,
      benefit_keys: TROCO_PLUS_BENEFIT_KEYS.essential,
      features: TROCO_PLUS_BENEFIT_KEYS.essential.map(k => t(k)),
      desc_key: 'plan.essential.desc',
      desc: t('plan.essential.desc')
    },
    {
      id: 'plus-pro',
      planKey: 'pro',
      name_key: 'plan.pro.name',
      title: t('plan.pro.name'),
      price: proCalc.raw,
      formattedPrice: proCalc.formatted,
      currency: proCalc.currency,
      countryName: proCalc.countryName,
      pppApplied: proCalc.coefficient < 1.0,
      pppDiscountPercent: proCalc.coefficient < 1.0 ? Math.round((1 - proCalc.coefficient) * 100) : 0,
      period_key: 'plan.period.monthly',
      period: t('plan.period.monthly'),
      tokensMonthly: 15,
      boostsMonthly: 3,
      badge_key: 'plan.pro.badge',
      badge: t('plan.pro.badge'),
      popular: false,
      benefit_keys: TROCO_PLUS_BENEFIT_KEYS.pro,
      features: TROCO_PLUS_BENEFIT_KEYS.pro.map(k => t(k)),
      desc_key: 'plan.pro.desc',
      desc: t('plan.pro.desc')
    },
  ];
}

const pricingService = {
  detectGeoCurrency,
  convertCurrency,
  formatCurrencyAmount,
  formatPrice,
  getRegionalSubscriptionPlan,
  detectUserCountry,
  calculatePppPrice,
  getLocalizedTrocoPlusPlans,
  CURRENCY_SYMBOLS,
  DEFAULT_EXCHANGE_RATES_TO_EUR,
  REGIONAL_PPP_MATRIX,
  PPP_COUNTRY_MATRIX,
  BASE_PRICES_EUR,
  TROCO_PLUS_BENEFIT_KEYS,
};

export default pricingService;
