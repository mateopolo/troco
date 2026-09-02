import React, { Suspense, useCallback, useState, useEffect, useRef } from 'react';
import Portal from '../../components/ui/Portal';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Loader2, Maximize, X, Hand, MapPin } from 'lucide-react';
import SectoralErrorBoundary from '../../components/SectoralErrorBoundary';
import useMediaQuery from '../../hooks/useMediaQuery';
import { EmptyState } from '../../components/ui/EmptyState';
import { MAP_I18N, getMapTranslation } from './mapTranslations';

const MapClusterTracker = React.lazy(() => import('../../components/MapClusterTracker'));

export { MAP_I18N, getMapTranslation };

/**
 * Gestionnaire de redimensionnement, de déblocage des contrôles et du cycle de vie Leaflet
 */
function MapLifecycleManager({ isFullScreen, isMobile }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Déblocage complet du drag et du zoom molette sur ordinateur et mobile
    try {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
    } catch (_) {}

    const timer = setTimeout(() => {
      if (map) map.invalidateSize();
    }, 150);

    return () => clearTimeout(timer);
  }, [isFullScreen, isMobile, map]);

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
      } catch (_) {}
    };
  }, [map]);

  return null;
}

/**
 * Bouton de recentrage GPS "Me localiser"
 */
function MapLocateControl({ onLocated, currentLang = 'FR' }) {
  const map = useMap();
  const [isLocating, setIsLocating] = useState(false);

  const handleLocateMe = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!navigator.geolocation) {
      alert(getMapTranslation(currentLang, 'unsupportedGeo'));
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
        title={getMapTranslation(currentLang, 'locateMe')}
        aria-label={getMapTranslation(currentLang, 'locateMe')}
      >
        {isLocating ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Navigation size={18} />
        )}
        <span>
          {isLocating
            ? getMapTranslation(currentLang, 'locating')
            : getMapTranslation(currentLang, 'locateMe')}
        </span>
      </button>
    </div>
  );
}

/**
 * InteractiveMapView.jsx
 * Carte interactive Leaflet haute performance :
 * 1. Scroll & Centrage automatique au milieu de l'écran.
 * 2. Déblocage complet du drag et du zoom molette sur Desktop.
 * 3. Localisation stricte multilingue du bouton ("Fermer la carte" / "Close map" / "Cerrar el mapa" / "Chiudi la mappa").
 */
export function InteractiveMapView({
  filteredListings = [],
  mapCenter = [49.0022, 2.5153],
  mapZoom = 12,
  darkMode = false,
  currentLang = 'FR',
  t = (k) => k,
  theme,
  getCoordinatesForLocation,
  getSuggestedMedia,
  getListingDisplayContent,
  localizeLocation,
  handleOpenListing,
  createModernMapIcon,
  onClose,
  onCloseMap,
  mapContainerRef: externalMapContainerRef,
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showTwoFingerHelper, setShowTwoFingerHelper] = useState(false);
  const touchHelperTimeoutRef = useRef(null);
  const internalContainerRef = useRef(null);

  const containerRef = externalMapContainerRef || internalContainerRef;
  const activeFullScreen = isMobile || isFullScreen;

  // 1. SCROLL ET CENTRAGE AUTOMATIQUE AU MONTAGE
  useEffect(() => {
    if (!activeFullScreen && containerRef.current) {
      const scrollTimer = setTimeout(() => {
        try {
          containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (_) {}
      }, 60);
      return () => clearTimeout(scrollTimer);
    }
  }, [activeFullScreen, containerRef]);

  // Verrouillage du scroll du body en mode plein écran / portail mobile
  useEffect(() => {
    if (activeFullScreen && typeof document !== 'undefined') {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [activeFullScreen]);

  // Détection des interactions tactiles sur mobile pour le cooperative gesture handling si non-fullscreen
  const handleTouchStart = (e) => {
    if (!activeFullScreen) {
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

  const handleClose = useCallback((e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (typeof onClose === 'function') {
      onClose();
    } else if (typeof onCloseMap === 'function') {
      onCloseMap();
    } else {
      setIsFullScreen(false);
    }
  }, [onClose, onCloseMap]);

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

  // Libellé traduit strict pour le bouton de fermeture
  const closeMapText = getMapTranslation(currentLang, 'closeMap');

  // Élément interactif de la carte
  const mapElement = (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      style={{
        position: 'relative',
        width: '100%',
        height: activeFullScreen ? '100dvh' : '560px',
        borderRadius: activeFullScreen ? '0' : '20px',
        overflow: 'hidden',
        boxShadow: activeFullScreen ? 'none' : 'var(--shadow-card)',
        backgroundColor: 'var(--bg-global, #0F172A)',
      }}
    >
      {/* BOUTON FLOTTANT IMPOSANT POUR FERMER LA CARTE (LOCALISATION STRICTE) */}
      {activeFullScreen ? (
        <div
          style={{
            position: 'absolute',
            top: 'max(16px, env(safe-area-inset-top, 16px))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            pointerEvents: 'none',
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            className="premium-button"
            style={{
              pointerEvents: 'auto',
              border: darkMode ? '1.5px solid rgba(255,255,255,0.22)' : '1.5px solid rgba(0,0,0,0.14)',
              backgroundColor: darkMode ? 'rgba(24, 20, 18, 0.94)' : 'rgba(255, 255, 255, 0.94)',
              color: 'var(--text-main, #1F2937)',
              borderRadius: '999px',
              padding: '10px 22px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 12px 36px rgba(0,0,0,0.35)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              fontSize: '13.5px',
              fontWeight: '900',
              transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s ease',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              whiteSpace: 'nowrap',
            }}
            title={closeMapText}
            aria-label={closeMapText}
          >
            <X size={18} strokeWidth={2.6} color="var(--accent-primary, #C67D5B)" />
            <span>{closeMapText}</span>
          </button>
        </div>
      ) : (
        /* BOUTON PLEIN ÉCRAN POUR DESKTOP */
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
            title={getMapTranslation(currentLang, 'immersiveView')}
            aria-label={getMapTranslation(currentLang, 'expandMap')}
          >
            <Maximize size={18} />
          </button>
        </div>
      )}

      {/* OVERLAY D'AIDE TACTILE : COOPERATIVE GESTURE HANDLING SUR CARTE EMBARQUÉE */}
      {showTwoFingerHelper && !activeFullScreen && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 999,
            backgroundColor: 'rgba(0,0,0,0.72)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            color: '#FFFFFF',
            textAlign: 'center',
            pointerEvents: 'auto',
            animation: 'fadeIn 0.2s ease both',
          }}
          onClick={() => setShowTwoFingerHelper(false)}
        >
          <Hand size={42} color="#FBBF24" style={{ marginBottom: '12px' }} />
          <p style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '800', lineHeight: 1.45, maxWidth: '300px' }}>
            {getMapTranslation(currentLang, 'twoFingerHelp')}
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
              padding: '12px 24px',
              borderRadius: '999px',
              backgroundColor: 'var(--accent-primary, #C67D5B)',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: '800',
              fontSize: '13.5px',
              cursor: 'pointer',
              boxShadow: '0 4px 18px rgba(198,125,91,0.45)',
            }}
          >
            {getMapTranslation(currentLang, 'openFullscreen')}
          </button>
        </div>
      )}

      {/* OVERLAY EMPTY STATE SUR LA CARTE SI AUCUN RÉSULTAT */}
      {filteredListings.length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            width: '90%',
            maxWidth: '380px',
            pointerEvents: 'auto',
          }}
        >
          <EmptyState
            compact={true}
            icon={<MapPin size={26} strokeWidth={2.2} />}
            title="Aucun troc dans cette zone"
            description="Élargissez votre zone de recherche géographique ou réinitialisez vos filtres pour découvrir des annonces."
            action={(
              <button
                type="button"
                onClick={() => {
                  try {
                    window.dispatchEvent(new CustomEvent('troco:reset_filters'));
                  } catch (_) {}
                }}
                className="premium-button"
                style={{
                  border: 'none',
                  borderRadius: '999px',
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                  color: '#FFFFFF',
                  fontWeight: '800',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-accent)',
                }}
              >
                Réinitialiser les filtres
              </button>
            )}
          />
        </div>
      )}

      {/* 2. DÉBLOCAGE COMPLET DU DRAG ET DU ZOOM MOLETTE */}
      <MapContainer
        center={mapCenter || [49.0022, 2.5153]}
        zoom={mapZoom || 12}
        minZoom={2}
        maxBounds={[[-85, -180], [85, 180]]}
        maxBoundsViscosity={1.0}
        worldCopyJump={true}
        dragging={true}
        touchZoom={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <MapLifecycleManager isFullScreen={activeFullScreen} isMobile={isMobile} />

        <TileLayer
          noWrap={true}
          bounds={[[-85, -180], [85, 180]]}
          attribution='&copy; Google Maps'
          url={`https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=${(currentLang || 'FR').toLowerCase()}`}
        />

        <MapLocateControl onLocated={() => {}} currentLang={currentLang} />

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
      {activeFullScreen ? (
        <Portal>
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
              zIndex: 99999,
              backgroundColor: 'var(--bg-global, #0F172A)',
              overflow: 'hidden',
            }}
          >
            {mapElement}
          </div>
        </Portal>
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

export default InteractiveMapView;
