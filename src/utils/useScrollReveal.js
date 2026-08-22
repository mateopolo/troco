import { useEffect, useRef } from 'react';

/**
 * useScrollReveal — Détection haute performance de l'entrée dans le viewport
 * via l'API native IntersectionObserver pour les animations de défilement fluides
 */
export function useScrollReveal(options = {}) {
  const elementRef = useRef(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    // Fallback gracieux si l'API n'est pas disponible ou si l'utilisateur réduit les animations
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      el.classList.add('is-revealed');
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            obs.unobserve(entry.target);
          }
        });
      },
      {
        threshold: options.threshold !== undefined ? options.threshold : 0.12,
        rootMargin: options.rootMargin || '0px 0px -40px 0px',
      }
    );

    observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [options.threshold, options.rootMargin]);

  return elementRef;
}

export default useScrollReveal;
