// ---- HAVERSINE DISTANCE & GEOPRIVACY GPS FUZZING ----

/**
 * Calcul de distance Haversine en kilomètres entre deux coordonnées (lat, lon)
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return null;
  const R = 6371; // Rayon moyen de la Terre en kilomètres
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c * 10) / 10;
}

/**
 * Troncature et floutage de sécurité de la position GPS à 2 décimales (~1km)
 * pour protéger la vie privée de l'utilisateur sur les cartes publiques.
 */
export function fuzzCoordinates(lat, lng) {
  const fLat = Math.round(lat * 100) / 100;
  const fLng = Math.round(lng * 100) / 100;
  return [fLat, fLng];
}
