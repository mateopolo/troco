import logger from '../utils/logger';

/**
 * Migration helper to sanitize corrupted or legacy entries in localStorage.
 */
export function migrateLocalStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    // Nettoyage sécurisé du cache des annonces locales corrompues
    const listingsRaw = localStorage.getItem('troco_listings');
    if (listingsRaw) {
      try {
        const listings = JSON.parse(listingsRaw);
        if (Array.isArray(listings)) {
          const cleanedListings = listings.filter(l => l && typeof l.id === 'string');
          if (cleanedListings.length !== listings.length) {
            localStorage.setItem('troco_listings', JSON.stringify(cleanedListings));
          }
        }
      } catch (e) {
        // ignore corrupted json
      }
    }
  } catch (err) {
    logger.warn('[migrateLocalStorage] Error during migration:', err);
  }
}
