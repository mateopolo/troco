import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useMap, useMapEvents, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

/**
 * Contrôleur de centrage fluide & synchronisation automatique de la carte
 */
function MapFlyController({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
      const targetZoom = zoom || map.getZoom();
      map.flyTo(center, targetZoom, {
        animate: true,
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  }, [center, zoom, map]);

  return null;
}

export default function MapClusterTracker({
  listings = [],
  mapCenter,
  mapZoom,
  darkMode = false,
  currentLang = 'FR',
  t = (k) => k,
  primaryColor = '#C67D5B',
  getCoordinatesForLocation,
  getSuggestedMedia,
  getListingDisplayContent,
  localizeLocation,
  handleOpenListing,
  createModernMapIcon,
}) {
  const map = useMap();
  const [currentZoom, setCurrentZoom] = useState(() => map.getZoom());

  // Écouter les événements de zoom et de déplacement pour actualiser les clusters
  useMapEvents({
    zoomend: () => {
      setCurrentZoom(map.getZoom());
    },
  });

  // Création d'icône de Cluster avec style Apple-grade & animations
  const createClusterIcon = useCallback((count) => {
    const size = count < 5 ? 38 : count < 20 ? 46 : 54;
    const fontSize = count < 10 ? 13 : 11.5;
    const borderWeight = count < 10 ? 2.5 : 3;

    return L.divIcon({
      className: 'troco-cluster-icon',
      html: `
        <div style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: linear-gradient(135deg, ${primaryColor} 0%, #A8644A 100%);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-weight: 900;
          font-size: ${fontSize}px;
          box-shadow: 0 6px 18px rgba(0,0,0,0.35), 0 0 16px ${primaryColor}77;
          border: ${borderWeight}px solid #FFFFFF;
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          transform-origin: center center;
          user-select: none;
        "
        onmouseover="this.style.transform='scale(1.15)';"
        onmouseout="this.style.transform='scale(1)';"
        >
          <span>${count}</span>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }, [primaryColor]);

  // Algorithme de clustering spatial ultra-optimisé O(N) basé sur la grille écran
  const clusters = useMemo(() => {
    if (!listings || listings.length === 0) return [];

    // Si on est en zoom très proche (>= 14), éclater systématiquement tous les pins
    if (currentZoom >= 14) {
      return listings.map(item => {
        const coords = item.coordinates || (getCoordinatesForLocation ? getCoordinatesForLocation(item.location) : [48.8566, 2.3522]);
        return {
          isCluster: false,
          center: coords,
          item,
        };
      });
    }

    const gridSize = currentZoom <= 4 ? 120 : currentZoom <= 7 ? 90 : currentZoom <= 10 ? 65 : 45;
    const grid = new Map();

    listings.forEach(item => {
      const coords = item.coordinates || (getCoordinatesForLocation ? getCoordinatesForLocation(item.location) : [48.8566, 2.3522]);
      if (!coords || !Array.isArray(coords) || coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) return;

      let pt;
      try {
        pt = map.latLngToLayerPoint(coords);
      } catch (_) {
        return;
      }

      const gridX = Math.floor(pt.x / gridSize);
      const gridY = Math.floor(pt.y / gridSize);
      const key = `${gridX}_${gridY}`;

      if (!grid.has(key)) {
        grid.set(key, {
          totalLat: coords[0],
          totalLng: coords[1],
          items: [item],
        });
      } else {
        const cell = grid.get(key);
        cell.totalLat += coords[0];
        cell.totalLng += coords[1];
        cell.items.push(item);
      }
    });

    const result = [];
    grid.forEach(cell => {
      const count = cell.items.length;
      const center = [cell.totalLat / count, cell.totalLng / count];

      if (count > 1) {
        result.push({
          isCluster: true,
          count,
          center,
          items: cell.items,
        });
      } else {
        result.push({
          isCluster: false,
          center: cell.items[0].coordinates || (getCoordinatesForLocation ? getCoordinatesForLocation(cell.items[0].location) : center),
          item: cell.items[0],
        });
      }
    });

    return result;
  }, [listings, currentZoom, map, getCoordinatesForLocation]);

  const handleClusterClick = useCallback((cluster) => {
    if (!cluster || !cluster.center) return;
    const nextZoom = Math.min(map.getZoom() + 3, 16);
    map.flyTo(cluster.center, nextZoom, {
      animate: true,
      duration: 0.8,
    });
  }, [map]);

  return (
    <>
      {/* Synchronisation fluide lors d'un appel à "Voir sur la carte" */}
      <MapFlyController center={mapCenter} zoom={mapZoom} />

      {/* Rendu dynamique des Clusters et Marqueurs individuels */}
      {clusters.map((c, idx) => {
        if (c.isCluster) {
          return (
            <Marker
              key={`cluster-${idx}-${c.count}-${c.center[0]}-${c.center[1]}`}
              position={c.center}
              icon={createClusterIcon(c.count)}
              eventHandlers={{
                click: () => handleClusterClick(c),
              }}
            />
          );
        }

        const item = c.item;
        const media = getSuggestedMedia ? getSuggestedMedia(item.title, item.description || '', item.image, item.video) : { image: item.image };
        const displayContent = getListingDisplayContent ? getListingDisplayContent(item, currentLang, false) : { title: item.title };
        const localizedLoc = localizeLocation ? localizeLocation(item.location, currentLang) : item.location;
        const pinIcon = createModernMapIcon ? createModernMapIcon(darkMode) : undefined;

        return (
          <Marker
            key={`marker-${item.id}-${c.center[0]}-${c.center[1]}`}
            position={c.center}
            icon={pinIcon}
          >
            <Popup>
              <div style={{ minWidth: '200px', maxWidth: '280px', display: 'flex', flexDirection: 'column', gap: '6px', padding: '2px' }}>
                <div style={{ position: 'relative' }}>
                  <img
                    src={media.image}
                    alt={displayContent.title}
                    style={{ width: '100%', height: '85px', objectFit: 'cover', borderRadius: '10px' }}
                  />
                  {(item.isDemo || (typeof item.id === 'number' && item.id <= 20)) && (
                    <span style={{
                      position: 'absolute', top: '6px', left: '6px',
                      backgroundColor: 'rgba(20,18,16,0.75)', color: '#FAF7F2',
                      fontSize: '9px', fontWeight: '750', padding: '3px 7px',
                      borderRadius: '999px', backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      textTransform: 'uppercase', letterSpacing: '0.04em'
                    }}>
                      Exemple
                    </span>
                  )}
                </div>
                <div style={{ fontWeight: '800', fontSize: '12.5px', color: '#3D3530', lineHeight: 1.3 }}>
                  {displayContent.title}
                </div>
                <div style={{ fontSize: '11px', color: '#6B5E54', lineHeight: 1.4 }}>
                  📍 {localizedLoc} {item.locationPrivacy === 'blurred' && '• ~500m'}
                </div>
                <div style={{ fontSize: '11.5px', color: primaryColor, fontWeight: '800' }}>
                  {item.compensation}
                </div>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    if (handleOpenListing) handleOpenListing(item);
                  }}
                  className="premium-button"
                  style={{
                    border: 'none',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    background: `linear-gradient(135deg, ${primaryColor} 0%, #A8644A 100%)`,
                    color: '#FFF',
                    fontWeight: '800',
                    cursor: 'pointer',
                    marginTop: '4px',
                    fontSize: '11.5px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}
                >
                  {t('viewListingButton') || 'Voir l’annonce'}
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
