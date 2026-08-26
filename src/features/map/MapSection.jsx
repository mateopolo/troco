import React, { Suspense, useCallback } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import SectoralErrorBoundary from '../../components/SectoralErrorBoundary';

const MapClusterTracker = React.lazy(() => import('../../components/MapClusterTracker'));

export function MapSection({
  filteredListings,
  mapCenter,
  mapZoom,
  darkMode,
  currentLang,
  t,
  theme,
  getCoordinatesForLocation,
  getSuggestedMedia,
  getListingDisplayContent,
  localizeLocation,
  handleOpenListing,
  createModernMapIcon,
}) {
  const defaultCreateModernMapIcon = useCallback(() => {
    const primaryBg = theme?.variables?.['--accent-primary'] || '#B98B73';
    const innerDot = theme?.variables?.['--bg-global'] || '#FAF7F2';

    return L.divIcon({
      className: 'custom-modern-pin',
      html: `
        <div style="
          position: relative;
          width: 24px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 6px 12px rgba(0,0,0,0.25));
          cursor: pointer;
        ">
          <svg width="24" height="30" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 30 12 30C12 30 24 21 24 12C24 5.37 18.63 0 12 0Z" 
                  fill="${primaryBg}" 
                  stroke="#FFFFFF" 
                  stroke-width="1.8" />
            <circle cx="12" cy="11" r="4.5" fill="${innerDot}" />
          </svg>
        </div>
      `,
      iconSize: [24, 30],
      iconAnchor: [12, 30],
      popupAnchor: [0, -28],
    });
  }, [theme]);

  const mapIconFn = createModernMapIcon || defaultCreateModernMapIcon;
  return (
    <SectoralErrorBoundary moduleName="Carte Interactive & Géolocalisation">
      <div
        className="premium-panel"
        style={{
          backgroundColor: 'var(--bg-card)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '24px',
          padding: '10px',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '550px',
            borderRadius: '18px',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <MapContainer
            center={mapCenter}
            zoom={4}
            minZoom={2}
            maxBounds={[[-85, -180], [85, 180]]}
            maxBoundsViscosity={1.0}
            worldCopyJump={true}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              noWrap={true}
              bounds={[[-85, -180], [85, 180]]}
              attribution='&copy; Google Maps'
              url={`https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=${currentLang.toLowerCase()}`}
            />

            <Suspense fallback={null}>
              <MapClusterTracker
                listings={filteredListings}
                mapCenter={mapCenter}
                mapZoom={mapZoom}
                darkMode={darkMode}
                currentLang={currentLang}
                t={t}
                primaryColor={theme?.variables?.['--accent-primary'] || '#C67D5B'}
                getCoordinatesForLocation={getCoordinatesForLocation}
                getSuggestedMedia={getSuggestedMedia}
                getListingDisplayContent={getListingDisplayContent}
                localizeLocation={localizeLocation}
                handleOpenListing={handleOpenListing}
                createModernMapIcon={mapIconFn}
              />
            </Suspense>
          </MapContainer>
        </div>
      </div>
    </SectoralErrorBoundary>
  );
}

export default MapSection;
