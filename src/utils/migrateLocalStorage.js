import { isDemoMode } from '../data/demoData';

/**
 * Migration helper to purge mock transactions and demo listings
 * from localStorage when running in production mode.
 */
export function migrateLocalStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    if (!isDemoMode()) {
      // 1. Clean transactions
      const txsRaw = localStorage.getItem('troco_user_transactions');
      if (txsRaw) {
        try {
          const txs = JSON.parse(txsRaw);
          if (Array.isArray(txs)) {
            const cleanedTxs = txs.filter(t => !t.id?.startsWith('tx-seed-') && !t.isDemo);
            if (cleanedTxs.length !== txs.length) {
              localStorage.setItem('troco_user_transactions', JSON.stringify(cleanedTxs));
            }
          }
        } catch (e) {
          // ignore corrupted json
        }
      }

      // 2. Clean demo listings cache
      const listingsRaw = localStorage.getItem('troco_listings');
      if (listingsRaw) {
        try {
          const listings = JSON.parse(listingsRaw);
          if (Array.isArray(listings)) {
            const cleanedListings = listings.filter(l => !l.isDemo && typeof l.id !== 'number');
            if (cleanedListings.length !== listings.length) {
              localStorage.setItem('troco_listings', JSON.stringify(cleanedListings));
            }
          }
        } catch (e) {
          // ignore corrupted json
        }
      }
    }
  } catch (err) {
    console.warn('[migrateLocalStorage] Error during migration:', err);
  }
}
