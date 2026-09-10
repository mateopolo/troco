/**
 * Safely removes only Troco-specific keys from localStorage,
 * preventing accidental wipeout of other domain/app data (GDPR compliant).
 */
export function clearTrocoLocalStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('troco_') || key.startsWith('troco-') || key === 'troco_auth' || key === 'troco_user')) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(k => {
    try {
      localStorage.removeItem(k);
    } catch (e) {
      console.warn(`Failed to remove localStorage key: ${k}`, e);
    }
  });
}
