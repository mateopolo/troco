// =====================================================================
// UTILITAIRE DE GÉOLOCALISATION MONDIALE OPEN-SOURCE (OPENSTREETMAP NOMINATIM)
// =====================================================================

/**
 * Recherche d'adresses et villes mondiales via l'API publique OpenStreetMap Nominatim.
 * @param {string} query Terme de recherche (ex: "Paris", "75015", "Tokyo", "Montreal")
 * @param {Object} options Options de recherche
 * @returns {Promise<Array>} Liste d'adresses géocodées
 */
export async function searchNominatim(query, { limit = 5, lang = 'fr' } = {}) {
  const cleanQuery = String(query || '').trim();
  if (!cleanQuery || cleanQuery.length < 2) return [];

  try {
    const endpoint = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&addressdetails=1&limit=${limit}&accept-language=${lang}`;
    const response = await fetch(endpoint, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) return [];
    const data = await response.json();

    return data.map((item) => {
      const addr = item.address || {};
      const cityName = addr.city || addr.town || addr.village || addr.municipality || addr.county || item.name || '';
      const countryName = addr.country || '';
      const postcode = addr.postcode || '';
      const shortDisplay = [cityName, postcode, countryName].filter(Boolean).join(', ') || item.display_name;

      return {
        id: item.place_id,
        displayName: item.display_name,
        shortDisplay: shortDisplay,
        cityName: cityName,
        postcode: postcode,
        country: countryName,
        countryCode: (addr.country_code || '').toUpperCase(),
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        type: item.type,
      };
    });
  } catch (error) {
    console.warn('[Nominatim Geocoding] Fetch error:', error);
    return [];
  }
}

/**
 * Géocodage inverse : Coordonnées (Lat, Lon) -> Nom de lieu
 */
export async function reverseGeocodeNominatim(lat, lon, { lang = 'fr' } = {}) {
  if (lat === undefined || lon === undefined) return null;
  try {
    const endpoint = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=${lang}`;
    const response = await fetch(endpoint);
    if (!response.ok) return null;
    const item = await response.json();
    const addr = item.address || {};
    const cityName = addr.city || addr.town || addr.village || addr.municipality || item.name || '';
    const countryName = addr.country || '';
    const postcode = addr.postcode || '';

    return {
      displayName: item.display_name,
      cityName,
      country: countryName,
      postcode,
      shortDisplay: [cityName, countryName].filter(Boolean).join(', ') || item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
    };
  } catch (error) {
    console.warn('[Nominatim Reverse Geocoding] Error:', error);
    return null;
  }
}

/**
 * Calcul précis de la distance orthodromique entre 2 coordonnées GPS (Formule Haversine en km)
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return null;
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return null;

  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10;
}

/**
 * Application d'un flou de confidentialité mathématique (offset d'environ 500m)
 */
export function applyPrivacyBlur(lat, lon, blurRadiusMeters = 500) {
  if (!lat || !lon) return [lat, lon];
  // Décalage angulaire pseudo-aléatoire mais déterministe
  const angle = ((lat * 1000 + lon * 1000) % 360) * (Math.PI / 180);
  const distanceKm = blurRadiusMeters / 1000;
  const deltaLat = (distanceKm / 111.32) * Math.cos(angle);
  const deltaLon = (distanceKm / (111.32 * Math.cos(lat * (Math.PI / 180)))) * Math.sin(angle);
  return [
    Math.round((lat + deltaLat) * 10000) / 10000,
    Math.round((lon + deltaLon) * 10000) / 10000
  ];
}
