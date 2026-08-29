import React, { Suspense, useCallback, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Loader2, Maximize, X, Hand } from 'lucide-react';
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
          padding: '12px 18px',
          minWidth: '44px',
          minHeight: '44px',
          fontSize: '13px',
          fontWeight: '800',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        title="Me localiser instantanément sur la carte"
        aria-label="Me localiser"
      >
        {isLocating ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Navigation size={18} />
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
  const [showTwoFingerHelper, setShowTwoFingerHelper] = useState(false);
  const touchHelperTimeoutRef = useRef(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Détection des interactions tactiles pour éviter le piège du scroll sur mobile
  const handleTouchStart = (e) => {
    if (!isFullScreen && isMobile) {
      if (e.touches && e.touches.length === 1) {
        setShowTwoFingerHelper(true);
        if (touchHelperTimeoutRef.current) clearTimeout(touchHelperTimeoutRef.current);
        touchHelperTimeoutRef.current = setTimeout(() => {
          setShowTwoFingerHelper(false);
        }, 2200);
      } else {
        setShowTwoFingerHelper(false);
      }
    }
  };

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

  // Contenu interactif de la carte
  const mapElement = (
    <div
      onTouchStart={handleTouchStart}
      style={{
        position: 'relative',
        width: '100%',
        height: isFullScreen ? '100dvh' : '550px',
        borderRadius: isFullScreen ? '0' : '18px',
        overflow: 'hidden',
        boxShadow: isFullScreen ? 'none' : 'var(--shadow-card)',
      }}
    >
      {/* BOUTONS FLOTTANTS EN HAUT */}
      {isFullScreen ? (
        /* BOUTON FERMER LE PLEIN ÉCRAN (TOP-LEFT RETOUR PROÉMINENT - 44px) */
        <div
          style={{
            position: 'absolute',
            top: 'max(16px, env(safe-area-inset-top, 16px))',
            left: '16px',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsFullScreen(false);
            }}
            className="premium-button"
            style={{
              border: darkMode ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(0,0,0,0.12)',
              backgroundColor: darkMode ? 'rgba(30, 25, 22, 0.92)' : 'rgba(255, 255, 255, 0.92)',
              color: 'var(--text-main)',
              borderRadius: '999px',
              padding: '10px 18px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              fontSize: '13px',
              fontWeight: '800',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            title="Fermer la carte plein écran"
            aria-label="Fermer la carte"
          >
            <X size={18} strokeWidth={2.5} />
            <span>Fermer la carte</span>
          </button>
        </div>
      ) : (
        /* BOUTON PLEIN ÉCRAN (TOP-RIGHT) */
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
              setIsFullScreen(true);
            }}
            className="premium-button"
            style={{
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)',
              borderRadius: '14px',
              minWidth: '44px',
              minHeight: '44px',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              transition: 'all 0.2s ease',
            }}
            title="Carte en plein écran (Vue immersive)"
            aria-label="Agrandir la carte"
          >
            <Maximize size={18} />
          </button>
        </div>
      )}

      {/* OVERLAY D'AIDE TACTILE : ANTI SCROLL-TRAP SUR MOBILE */}
      {showTwoFingerHelper && !isFullScreen && isMobile && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 999,
            backgroundColor: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            color: '#FFFFFF',
            textAlign: 'center',
            pointerEvents: 'auto',
            animation: 'fadeIn 0.25s ease both',
          }}
          onClick={() => setShowTwoFingerHelper(false)}
        >
          <Hand size={36} color="#FBBF24" style={{ marginBottom: '10px' }} />
          <p style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: '700', lineHeight: 1.4, maxWidth: '280px' }}>
            Utilisez 2 doigts pour vous déplacer sur la carte, ou passez en Plein Écran.
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsFullScreen(true);
              setShowTwoFingerHelper(false);
            }}
            className="premium-button"
            style={{
              padding: '10px 20px',
              borderRadius: '999px',
              backgroundColor: 'var(--accent-primary, #C67D5B)',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: '800',
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(198,125,91,0.4)',
            }}
          >
            Ouvrir en Plein Écran
          </button>
        </div>
      )}

      <MapContainer
        center={mapCenter || [49.0022, 2.5153]}
        zoom={mapZoom || 12}
        minZoom={2}
        maxBounds={[[-85, -180], [85, 180]]}
        maxBoundsViscosity={1.0}
        worldCopyJump={true}
        dragging={!isMobile || isFullScreen}
        touchZoom={true}
        scrollWheelZoom={isFullScreen}
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
  );

  return (
    <SectoralErrorBoundary moduleName="Carte Interactive & Géolocalisation">
      {isFullScreen && typeof document !== 'undefined' ? (
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100dvh',
              zIndex: 999999,
              backgroundColor: 'var(--bg-global, #0F172A)',
              overflow: 'hidden',
            }}
          >
            {mapElement}
          </div>,
          document.body
        )
      ) : (
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
          {mapElement}
        </div>
      )}
    </SectoralErrorBoundary>
  );
}

export default MapSection;
