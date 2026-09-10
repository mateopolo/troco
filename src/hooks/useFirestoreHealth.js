import { useEffect } from 'react';
import { captureFirestoreAlert } from '../utils/sentryFilters';

// Registre mémoire des compteurs d'erreurs récurrentes
const errorCounters = new Map();

/**
 * 🩺 Hook de surveillance proactive de l'état de santé Firestore côté client
 * Détecte les boucles d'erreurs de permissions ou de préconditions et alerte Sentry.
 */
export function useFirestoreHealth() {
  useEffect(() => {
    // Sauvegarde du console.error original
    const originalConsoleError = console.error;

    console.error = (...args) => {
      try {
        const msg = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ');

        // Détection ciblée des erreurs bloquantes de règles ou d'indexation
        if (msg.includes('permission-denied') || msg.includes('failed-precondition') || msg.includes('RESOURCE_EXHAUSTED')) {
          const key = msg.slice(0, 120);
          const currentCount = (errorCounters.get(key) || 0) + 1;
          errorCounters.set(key, currentCount);

          // Seuil d'alerte : 5 erreurs similaires en moins d'une minute
          if (currentCount === 5) {
            captureFirestoreAlert(
              `[ALERTE FIRESTORE] Erreurs répétées détectées (${currentCount}x) : ${key}`,
              {
                count: currentCount,
                sampleMessage: msg,
                url: typeof window !== 'undefined' ? window.location.href : 'unknown',
                timestamp: new Date().toISOString(),
              },
              'error'
            );
          }
        }
      } catch {
        // En cas d'exception dans l'intercepteur, ne jamais bloquer l'application
      }

      // Transmission de l'erreur au handler standard
      originalConsoleError.apply(console, args);
    };

    // Purge périodique des compteurs chaque minute
    const intervalId = setInterval(() => {
      errorCounters.clear();
    }, 60000);

    return () => {
      console.error = originalConsoleError;
      clearInterval(intervalId);
    };
  }, []);
}
