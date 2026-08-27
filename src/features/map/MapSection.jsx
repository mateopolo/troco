import React, { Suspense, useCallback, useState, useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Loader2, Maximize, Minimize } from 'lucide-react';
import SectoralErrorBoundary from '../../components/SectoralErrorBoundary';

const MapClusterTracker = React.lazy(() => import('../../components/MapClusterTracker'));

// Gestionnaire de redimensionnement et de cycle de vie de Leaflet (Prévention des fuites mémoire GPU/DOM)
function MapLifecycleManager({ isFullScreen }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (map) map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [isFullScreen, map]);

  // Nettoyage strict au démontage du composant
  useEffect(() => {
    return () => {
      if (!map) return;
      try {
        map.stop();
        map.clearAllEventListeners();
        map.eachLayer((layer) => {
          try {
            if (layer && typeof layer.remove === 'function') {
              layer.remove();
            } else if (layer) {
              map.removeLayer(layer);
            }
          } catch (_) {}
        });
      } catch (err) {
        // En cas d'instance déjà libérée
      }
    };
  }, [map]);

  return null;
}

// Composant interne pour le recentrage GPS "Me localiser"
function MapLocateControl({ onLocated }) {
  const map = useMap();
  const [isLocating, setIsLocating] = useState(false);

  const handleLocateMe = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas prise en charge par votre navigateur.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        map.flyTo([latitude, longitude], 14, {
          animate: true,
          duration: 1.5,
        });
        if (onLocated) onLocated([latitude, longitude]);
      },
      (err) => {
        setIsLocating(false);
        console.warn('[Geolocation] Error or permission denied:', err);
        // Fallback smooth recenter sur Roissy-en-France
        map.flyTo([49.0022, 2.5153], 13, {
          animate: true,
          duration: 1.2,
        });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '24px',
        right: '24px',
        zIndex: 1000,
      }}
    >
      <button
        type="button"
        onClick={handleLocateMe}
        className="premium-button"
        style={{
          border: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-card)',
          color: 'var(--accent-primary)',
          borderRadius: '16px',
          padding: '10px 16px',
          fontSize: '13px',
          fontWeight: '800',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
        title="Me localiser instantanément sur la carte"
      >
        {isLocating ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Navigation size={16} />
        )}
        <span>{isLocating ? 'Localisation...' : '🎯 Me localiser'}</span>
      </button>
    </div>
  );
}

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
  const [isFullScreen, setIsFullScreen] = useState(false);

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
        style={isFullScreen ? {
          position: 'fixed',
          inset: 0,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100dvh',
          zIndex: 9999,
          borderRadius: 0,
          padding: 0,
          margin: 0,
          backgroundColor: 'var(--bg-global)',
          boxShadow: 'none',
          border: 'none',
        } : {
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
            height: isFullScreen ? '100dvh' : '550px',
            borderRadius: isFullScreen ? '0' : '18px',
            overflow: 'hidden',
            boxShadow: isFullScreen ? 'none' : 'var(--shadow-card)',
          }}
        >
          {/* BOUTON PLEIN ÉCRAN */}
          <div
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              zIndex: 1000,
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsFullScreen(prev => !prev);
              }}
              className="premium-button"
              style={{
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-main)',
                borderRadius: '14px',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                transition: 'all 0.2s ease',
              }}
              title={isFullScreen ? "Quitter le plein écran" : "Carte en plein écran"}
            >
              {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>

          <MapContainer
            center={mapCenter || [49.0022, 2.5153]}
            zoom={mapZoom || 12}
            minZoom={2}
            maxBounds={[[-85, -180], [85, 180]]}
            maxBoundsViscosity={1.0}
            worldCopyJump={true}
            style={{ width: '100%', height: '100%' }}
          >
            <MapLifecycleManager isFullScreen={isFullScreen} />

            <TileLayer
              noWrap={true}
              bounds={[[-85, -180], [85, 180]]}
              attribution='&copy; Google Maps'
              url={`https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=${currentLang.toLowerCase()}`}
            />

            <MapLocateControl />

            <Suspense fallback={null}>
              <MapClusterTracker
                listings={filteredListings}
                mapCenter={mapCenter || [49.0022, 2.5153]}
                mapZoom={mapZoom || 12}
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
