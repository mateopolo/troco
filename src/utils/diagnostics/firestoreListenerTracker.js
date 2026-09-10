// src/utils/diagnostics/firestoreListenerTracker.js
// ═══════════════════════════════════════════════════════════════════
// TROCO — FIRESTORE LISTENER TRACKER
// Utility to track and monitor active Firestore snapshot listeners to detect memory leaks & duplicates.
// ═══════════════════════════════════════════════════════════════════

if (typeof window !== 'undefined') {
  window.__firestoreListeners = window.__firestoreListeners || [];
}

/**
 * Registers an active listener into the global diagnostic registry.
 * @param {string} path - Path or identifier of the collection/query/document being listened to.
 * @param {string} type - 'doc' | 'query' | 'collection'
 * @returns {Function} - Function that must be called when unsubscribing.
 */
export function trackListener(path, type = 'query') {
  if (typeof window === 'undefined') return () => {};

  const id = `${path}__${Date.now()}__${Math.random().toString(36).substr(2, 5)}`;
  const entry = {
    id,
    path,
    type,
    ts: Date.now(),
    stack: new Error().stack?.split('\n').slice(2, 5).map(s => s.trim()).join(' -> ') || '',
  };

  window.__firestoreListeners.push(entry);

  return function untrack() {
    window.__firestoreListeners = window.__firestoreListeners.filter(l => l.id !== id);
  };
}

/**
 * Returns current snapshot of active listeners and detects duplicates.
 */
export function getActiveListenersReport() {
  if (typeof window === 'undefined') return { total: 0, listeners: [], duplicates: [] };

  const listeners = window.__firestoreListeners || [];
  const paths = listeners.map(l => l.path);
  const duplicates = paths.filter((p, i) => paths.indexOf(p) !== i);

  return {
    total: listeners.length,
    listeners: [...listeners],
    duplicates: [...new Set(duplicates)],
  };
}

if (typeof window !== 'undefined') {
  window.getActiveListenersReport = getActiveListenersReport;
}
