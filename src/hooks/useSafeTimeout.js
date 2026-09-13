/**
 * useSafeTimeout - Hook pour gérer les timeouts en toute sécurité
 * Évite les fuites mémoire et les écritures sur composants démontés
 * Compatible StrictMode (pas de double-exécution)
 */
import { useRef, useEffect, useCallback } from 'react';

/**
 * Hook qui track tous les timers et les nettoie automatiquement au démontage
 * @returns {Object} - Objet avec la fonction safeTimeout
 */
export function useSafeTimeout() {
  const timeoutRefs = useRef(new Set());

  // Nettoyage automatique au démontage
  useEffect(() => {
    return () => {
      // Clear tous les timeouts en cours
      timeoutRefs.current.forEach((timerId) => {
        clearTimeout(timerId);
      });
      timeoutRefs.current.clear();
    };
  }, []);

  /**
   * Fonction sûre pour créer un timeout
   * @param {Function} fn - Fonction à exécuter
   * @param {number} delay - Délai en millisecondes
   * @returns {NodeJS.Timeout} - L'ID du timeout (pour cleanup manuel si nécessaire)
   */
  const safeTimeout = useCallback((fn, delay) => {
    const timerId = setTimeout(() => {
      // Vérifier que le composant est toujours monté
      // en vérifiant que la ref n'a pas été vidée par le cleanup
      if (timeoutRefs.current.has(timerId)) {
        fn();
      }
    }, delay);

    // Ajouter le timer à la Set
    timeoutRefs.current.add(timerId);

    return timerId;
  }, []);

  /**
   * Nettoyer un timeout spécifique
   * @param {NodeJS.Timeout} timerId - L'ID du timeout à nettoyer
   */
  const clearSafeTimeout = useCallback((timerId) => {
    clearTimeout(timerId);
    timeoutRefs.current.delete(timerId);
  }, []);

  return { safeTimeout, clearSafeTimeout };
}

export default useSafeTimeout;
