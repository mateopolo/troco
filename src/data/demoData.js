/**
 * Demo Data and Mode Manager
 * Protects production users from seeing fake transactions or seed listings.
 */

export function isDemoMode() {
  if (typeof window !== 'undefined') {
    if (window.__TROCO_FORCE_DEMO__ !== undefined) {
      return Boolean(window.__TROCO_FORCE_DEMO__);
    }
  }
  return (
    process.env.REACT_APP_DEMO_MODE === 'true' ||
    process.env.VITE_DEMO_MODE === 'true' ||
    (typeof window !== 'undefined' && window.location && window.location.search.includes('demo=true'))
  );
}

export const DEMO_TRANSACTIONS = [
  {
    id: 'tx-seed-1',
    transactionId: 'TRK-202603-4819',
    label: 'Achat 5 Jetons Troco (Essentiel)',
    mode: 'pack-tokens',
    amountTtc: 49.99,
    amountHt: 41.66,
    tva: 8.33,
    currency: 'EUR',
    paymentMethod: 'Apple Pay',
    authRef: 'APL-92KDA81',
    date: '2026-03-10T14:23:00.000Z',
    tokensPurchased: 5,
    isDemo: true,
  },
  {
    id: 'tx-seed-2',
    transactionId: 'TRK-202603-3102',
    label: 'Recharge Portefeuille Troco (20.00 €)',
    mode: 'topup-cash',
    amountTtc: 20.00,
    amountHt: 16.67,
    tva: 3.33,
    currency: 'EUR',
    paymentMethod: 'Carte Bancaire (VISA •••• 4242)',
    authRef: 'STR-71NXL90',
    date: '2026-03-05T09:12:00.000Z',
    cashTopUp: 20.00,
    isDemo: true,
  },
];

export function getInitialTransactions() {
  try {
    const saved = localStorage.getItem('troco_user_transactions');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!isDemoMode()) {
        return parsed.filter(t => !t.id?.startsWith('tx-seed-') && !t.isDemo);
      }
      return parsed;
    }
    return isDemoMode() ? DEMO_TRANSACTIONS : [];
  } catch (e) {
    return isDemoMode() ? DEMO_TRANSACTIONS : [];
  }
}
