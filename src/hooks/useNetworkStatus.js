import { useState, useEffect, useCallback } from 'react';

/**
 * useNetworkStatus.js
 * Hook réactif de détection de l'état du réseau (en ligne / hors-ligne)
 * 
 * @returns {{
 *   isOnline: boolean,
 *   isOffline: boolean,
 *   wasOffline: boolean,
 *   checkConnection: () => Promise<boolean>
 * }}
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() => {
    return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : true;
  });
  const [wasOffline, setWasOffline] = useState(false);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    try {
      window.dispatchEvent(new CustomEvent('troco:online'));
    } catch (_) {}
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setWasOffline(true);
    try {
      window.dispatchEvent(new CustomEvent('troco:offline'));
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialisation
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  const checkConnection = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      return false;
    }
    try {
      // Ping rapide non bloquant
      const res = await fetch('/favicon.ico', { method: 'HEAD', cache: 'no-store' });
      const online = res.ok;
      setIsOnline(online);
      return online;
    } catch (_) {
      setIsOnline(false);
      return false;
    }
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline,
    checkConnection,
  };
}

export default useNetworkStatus;
