/**
 * Calcul de la distance géodésique entre deux coordonnées (formule de Haversine).
 * @param lat1 Latitude point 1
 * @param lon1 Longitude point 1
 * @param lat2 Latitude point 2
 * @param lon2 Longitude point 2
 * @returns Distance en kilomètres ou null si invalide
 */
export const calculateDistance = (
  lat1?: number | string | null,
  lon1?: number | string | null,
  lat2?: number | string | null,
  lon2?: number | string | null
): number | null => {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return null;
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;
  
  const p1Lat = typeof lat1 === 'number' ? lat1 : parseFloat(lat1);
  const p1Lon = typeof lon1 === 'number' ? lon1 : parseFloat(lon1);
  const p2Lat = typeof lat2 === 'number' ? lat2 : parseFloat(lat2);
  const p2Lon = typeof lon2 === 'number' ? lon2 : parseFloat(lon2);

  if (isNaN(p1Lat) || isNaN(p1Lon) || isNaN(p2Lat) || isNaN(p2Lon)) return null;

  const R = 6371; // Rayon de la Terre en km
  const dLat = ((p2Lat - p1Lat) * Math.PI) / 180;
  const dLon = ((p2Lon - p1Lon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1Lat * Math.PI) / 180) *
      Math.cos((p2Lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const getValidPharmacyCoordinates = (
  latitude: unknown,
  longitude: unknown,
): { latitude: number; longitude: number } | null => {
  if (typeof latitude !== 'number' || !Number.isFinite(latitude)) return null;
  if (typeof longitude !== 'number' || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90) return null;
  if (longitude < -180 || longitude > 180) return null;
  if (latitude === 0 && longitude === 0) return null;
  return { latitude, longitude };
};

/**
 * Formate une distance en kilomètres pour un affichage lisible (ex: "850 m" ou "2,4 km")
 */
export const formatDistance = (distanceInKm: number | null): string | null => {
  if (distanceInKm === null || isNaN(distanceInKm)) return null;
  if (distanceInKm < 1) {
    return `${Math.round(distanceInKm * 1000)} m`;
  }
  return `${distanceInKm.toFixed(1).replace('.', ',')} km`;
};
