/**
 * performanceProfiler.js
 * Sonde de mesure des performances React Profiler & Google Web Vitals
 */

const PERF_LOG_ENABLED = process.env.NODE_ENV !== 'production' || (typeof window !== 'undefined' && window.location.search.includes('perf=1'));

/**
 * Callback officiel React Profiler
 * @param {string} id L'identifiant unique du composant profilé
 * @param {'mount' | 'update' | 'nested-update'} phase Phase de montage ou de mise à jour
 * @param {number} actualDuration Temps passé à rendre le composant et ses enfants (ms)
 * @param {number} baseDuration Temps estimé pour rendre le sous-arbre sans mémoïsation (ms)
 * @param {number} startTime Timestamp du début de rendu
 * @param {number} commitTime Timestamp de validation par React
 */
export function onRenderProfilerCallback(
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) {
  // Détection des rendus lents dépassant le budget d'une frame 60fps (16.6ms)
  const isSlow = actualDuration > 16.6;

  if (isSlow) {
    console.warn(
      `⚡ [Performance Drop] <${id}> a pris ${actualDuration.toFixed(2)}ms (${phase}) pour être calculé. Budget 16ms dépassé !`
    );
  } else if (PERF_LOG_ENABLED) {
    console.debug(
      `📊 [React Profiler] <${id}> [${phase}] - Rendu réel: ${actualDuration.toFixed(2)}ms | Base estimée: ${baseDuration.toFixed(2)}ms`
    );
  }

  // Stockage d'échantillons en mémoire pour inspection
  if (typeof window !== 'undefined') {
    if (!window.__TROCO_PERF_METRICS__) {
      window.__TROCO_PERF_METRICS__ = [];
    }
    window.__TROCO_PERF_METRICS__.push({
      id,
      phase,
      actualDuration: Number(actualDuration.toFixed(2)),
      baseDuration: Number(baseDuration.toFixed(2)),
      commitTime: Number(commitTime.toFixed(2)),
      timestamp: Date.now(),
    });
    // Limite à 100 derniers échantillons pour éviter toute fuite mémoire
    if (window.__TROCO_PERF_METRICS__.length > 100) {
      window.__TROCO_PERF_METRICS__.shift();
    }
  }
}

/**
 * Traitement & Journalisation des Google Web Vitals
 * @param {Object} metric 
 */
export function logWebVitalMetric(metric) {
  const { name, value, id, rating } = metric;
  const formattedValue = name === 'CLS' ? value.toFixed(3) : `${Math.round(value)}ms`;

  const color = rating === 'good' ? '#10B981' : rating === 'needs-improvement' ? '#F59E0B' : '#EF4444';

  if (PERF_LOG_ENABLED) {
    console.log(
      `%c🌐 [Web Vitals] ${name}: ${formattedValue} (${rating})`,
      `color: ${color}; font-weight: bold;`,
      { id, delta: metric.delta }
    );
  }

  // Dispatch événement analytique pour monitoring
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('troco:web_vital', {
        detail: { name, value, rating, id },
      })
    );
  }
}

export default onRenderProfilerCallback;
