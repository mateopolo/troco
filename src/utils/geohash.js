/**
 * geohash.js — Utilitaire d'indexation spatiale Geohash pour Firestore
 * Permet le calcul de geohashes, de bounding boxes et de plages de requêtes
 * pour le filtrage serveur (startAt / endAt) sans télécharger toute la BDD.
 */

import ngeohash from 'ngeohash';

/**
 * Encode des coordonnées GPS en Geohash
 * @param {number} lat Latitude
 * @param {number} lon Longitude
 * @param {number} precision Précision du hash (défaut: 9 pour ~4.8m x 4.8m)
 * @returns {string} Geohash
 */
export function encodeGeohash(lat, lon, precision = 9) {
  if (lat === undefined || lon === undefined || isNaN(lat) || isNaN(lon)) return null;
  const numLat = Number(lat);
  const numLon = Number(lon);
  if (numLat < -90 || numLat > 90 || numLon < -180 || numLon > 180) return null;
  return ngeohash.encode(numLat, numLon, precision);
}

/**
 * Décode un Geohash en coordonnées GPS { latitude, longitude }
 */
export function decodeGeohash(hash) {
  if (!hash || typeof hash !== 'string') return null;
  return ngeohash.decode(hash);
}

/**
 * Calcule la précision geohash optimale en fonction du rayon en km
 */
export function getGeohashPrecisionForRadius(radiusInKm) {
  const r = Number(radiusInKm) || 20;
  if (r <= 1) return 5;     // ~4.9km x 4.9km
  if (r <= 15) return 4;    // ~39km x 19.5km
  if (r <= 60) return 3;    // ~156km x 156km
  if (r <= 300) return 2;   // ~1250km x 625km
  return 2;
}

/**
 * Calcule les plages de geohash (ranges [start, end]) pour couvrir un rayon donné autour d'un centre
 * @param {[number, number]} center Coordonnées [lat, lon]
 * @param {number} radiusInKm Rayon de recherche en km
 * @returns {Array<[string, string]>} Liste des plages [startHash, endHash] pour Firestore startAt / endAt
 */
export function getGeohashQueryBounds(center, radiusInKm = 20) {
  if (!Array.isArray(center) || center.length < 2 || isNaN(center[0]) || isNaN(center[1])) {
    return [];
  }

  const [lat, lon] = center;
  const radius = Number(radiusInKm) || 20;
  const precision = getGeohashPrecisionForRadius(radius);

  // Détermination de la bounding box GPS
  const latSpan = radius / 111.32;
  const lonSpan = radius / (111.32 * Math.cos((lat * Math.PI) / 180) || 1);

  const minLat = Math.max(-90, lat - latSpan);
  const maxLat = Math.min(90, lat + latSpan);
  const minLon = Math.max(-180, lon - lonSpan);
  const maxLon = Math.min(180, lon + lonSpan);

  // Récupération des geohashes couvrant la bounding box
  let hashes = [];
  try {
    hashes = ngeohash.bboxes(minLat, minLon, maxLat, maxLon, precision);
  } catch (_) {
    const centerHash = ngeohash.encode(lat, lon, precision);
    const neighbors = ngeohash.neighbors(centerHash) || [];
    hashes = [centerHash, ...neighbors];
  }

  if (!hashes || hashes.length === 0) {
    const centerHash = ngeohash.encode(lat, lon, precision);
    hashes = [centerHash];
  }

  // Transformation en plages [geohash, geohash + '~'] (Firestore lexicographical query)
  const ranges = hashes.map((h) => [h, `${h}~`]);

  // Déduplication et fusion des plages contiguës si possible
  ranges.sort((a, b) => a[0].localeCompare(b[0]));
  const merged = [];
  for (const r of ranges) {
    if (merged.length === 0) {
      merged.push(r);
    } else {
      const prev = merged[merged.length - 1];
      if (prev[1] >= r[0]) {
        if (r[1] > prev[1]) prev[1] = r[1];
      } else {
        merged.push(r);
      }
    }
  }

  return merged;
}
