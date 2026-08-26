// =====================================================================
// MOTEUR DE TARIFICATION DYNAMIQUE MONDIALE (PARITÉ DE POUVOIR D'ACHAT - PPP)
// =====================================================================

// Base de référence : France / Eurozone (FR: 1.0)
export const BASE_PRICES_EUR = {
  essential: 9.99,
  pro: 19.99,
};

// Matrice mondiale des coefficients de Parité de Pouvoir d'Achat (PPP) et devises
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

/**
 * Détection automatique du pays de l'utilisateur
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
    const lang = (navigator.language || navigator.userLanguage || '').toUpperCase();
    const split = lang.split('-');
    if (split[1] && PPP_COUNTRY_MATRIX[split[1]]) return split[1];
    if (split[0] === 'FR') return 'FR';
    if (split[0] === 'EN') return 'US';
    if (split[0] === 'ES') return 'ES';
  } catch (_) {}

  return fallbackCountry;
}

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
 * Formate un prix avec Intl.NumberFormat
 */
export function formatPrice(amount, currency = 'EUR', locale = undefined) {
  try {
    return new Intl.NumberFormat(locale || navigator.language || 'fr-FR', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: ['JPY', 'KRW', 'XOF', 'XAF', 'IDR', 'VND', 'MGA'].includes(currency) ? 0 : 2,
    }).format(amount);
  } catch (_) {
    return `${amount} ${currency}`;
  }
}

/**
 * Génère les plans d'abonnement Troco Plus localisés selon le pays
 */
export function getLocalizedTrocoPlusPlans(countryCode = null) {
  const code = countryCode || detectUserCountry();
  const essentialCalc = calculatePppPrice(BASE_PRICES_EUR.essential, code);
  const proCalc = calculatePppPrice(BASE_PRICES_EUR.pro, code);

  return [
    {
      id: 'plus-essential',
      planKey: 'essential',
      title: 'Troco Plus Essentiel',
      price: essentialCalc.raw,
      formattedPrice: essentialCalc.formatted,
      currency: essentialCalc.currency,
      countryName: essentialCalc.countryName,
      pppApplied: essentialCalc.coefficient < 1.0,
      pppDiscountPercent: essentialCalc.coefficient < 1.0 ? Math.round((1 - essentialCalc.coefficient) * 100) : 0,
      period: '/ mois',
      tokensMonthly: 5,
      boostsMonthly: 1,
      badge: '⭐ Membre Plus',
      popular: true,
      features: [
        '5 Jetons Troco crédités chaque mois',
        '1 Boost d\'annonce offert par mois',
        'Badge ⭐ Membre Plus sur le profil',
        'Priorité de contact sur les deals',
        'Sans engagement • Annulable en 1 clic'
      ],
      desc: 'Parfait pour échanger régulièrement et booster vos services'
    },
    {
      id: 'plus-pro',
      planKey: 'pro',
      title: 'Troco Plus Illimité & Pro',
      price: proCalc.raw,
      formattedPrice: proCalc.formatted,
      currency: proCalc.currency,
      countryName: proCalc.countryName,
      pppApplied: proCalc.coefficient < 1.0,
      pppDiscountPercent: proCalc.coefficient < 1.0 ? Math.round((1 - proCalc.coefficient) * 100) : 0,
      period: '/ mois',
      tokensMonthly: 15,
      boostsMonthly: 3,
      badge: '👑 VIP Pro',
      popular: false,
      features: [
        '15 Jetons Troco crédités chaque mois',
        '3 Boosts d\'annonces offerts par mois',
        'Badge exclusif 👑 VIP Pro',
        'Visibilité maximale carte & feed',
        'Support prioritaire 7j/7 & 0 commission',
        'Sans engagement • Annulable en 1 clic'
      ],
      desc: 'Idéal pour les experts, artisans et utilisateurs intensifs'
    },
  ];
}
