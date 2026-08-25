import React, { Suspense } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
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
                createModernMapIcon={createModernMapIcon}
              />
            </Suspense>
          </MapContainer>
        </div>
      </div>
    </SectoralErrorBoundary>
  );
}

export default MapSection;
