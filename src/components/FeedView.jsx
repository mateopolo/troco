import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, MapPin, Filter, Grid, Map, Globe, Tag } from 'lucide-react';
import { MapContainer, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import ListingCard from './ListingCard';
import { SkeletonCard } from './SkeletonLoader';
import InteractiveMapView from '../features/map/InteractiveMapView';

const createModernMapIcon = () => {
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
        filter: drop-shadow(0 4px 10px var(--shadow-accent));
        cursor: pointer;
      ">
        <svg width="24" height="30" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 30 12 30C12 30 24 21 24 12C24 5.37 18.63 0 12 0Z" 
                fill="var(--accent-primary, #B98B73)" 
                stroke="#FFFFFF" 
                stroke-width="1.8" />
          <circle cx="12" cy="11" r="4.5" fill="var(--bg-global, #FAF7F2)" />
        </svg>
      </div>
    `,
    iconSize: [24, 30],
    iconAnchor: [12, 30],
    popupAnchor: [0, -28],
  });
};


export default function FeedView({
  activeTab = 'feed',
  searchQuery = '',
  setSearchQuery = () => {},
  formatFilter = 'all',
  setFormatFilter = () => {},
  selectedCategory = 'all',
  setSelectedCategory = () => {},
  categories = [],
  viewMode = 'list',
  setViewMode = () => {},
  filteredListings = [],
  handleOpenListing = () => {},
  handleStartDiscussion = () => {},
  setIsFilterDrawerOpen = () => {},
  setIsCategoryModalOpen = () => {},
  mapCenter = [48.8566, 2.3522],
  userCoords = [48.8566, 2.3522],
  currentLang = 'FR',
  t = (key) => key,
  darkMode = false,
  formatCompensation = () => {},
  getListingDisplayContent = (item) => item,
  showingOriginalListings = {},
  toggleOriginalListing = () => {},
  profile = { name: 'MATEO POLO', avatar: '' }
}) {
  const [realtimeListings, setRealtimeListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const mapContainerRef = useRef(null);

  const handleSwitchToMap = () => {
    setViewMode('map');
    setTimeout(() => {
      if (mapContainerRef.current) {
        mapContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'listings'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRealtimeListings(data);
      setIsLoading(false);
    }, () => {
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const displayListings = realtimeListings.length > 0 ? realtimeListings.filter(item => {
    const matchesSearch = item.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFormat = formatFilter === 'all' || item.type === 'both' || item.type === formatFilter;
    const matchesCategory = selectedCategory === 'all' || selectedCategory === 'Tous' || item.category === selectedCategory;
    return matchesSearch && matchesFormat && matchesCategory;
  }) : filteredListings;

  if (activeTab !== 'feed') return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '1280px', margin: '0 auto' }}>
      {/* BARRE DE RECHERCHE, FORMATS & FILTRES SOUVERAINS */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderRadius: '24px', padding: '16px 20px',
        boxShadow: 'var(--shadow-card)',
        border: '1px solid var(--border-color)',
        display: 'flex', flexDirection: 'column', gap: '14px'
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {/* CHAMP DE RECHERCHE PRINCIPAL */}
          <div style={{ flex: '1 1 300px', position: 'relative', minWidth: '240px' }}>
            <Search size={18} color="var(--accent-primary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder') || 'Rechercher une compétence, un outil ou un service...'}
              style={{
                width: '100%', padding: '13px 16px 13px 44px',
                border: '1px solid var(--border-color)',
                borderRadius: '16px', fontSize: '14px', fontWeight: '500',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-main)',
                outline: 'none'
              }}
            />
          </div>

          {/* SÉLECTEUR FORMAT NATIF (SUR PLACE / VISIO / TOUS) */}
          <div style={{ display: 'flex', backgroundColor: 'var(--bg-subtle)', padding: '4px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setFormatFilter('all')}
              className="premium-button"
              style={{
                border: 'none', borderRadius: '12px', padding: '9px 14px', fontSize: '12px', fontWeight: '800', cursor: 'pointer',
                backgroundColor: formatFilter === 'all' ? 'var(--accent-primary)' : 'transparent',
                color: formatFilter === 'all' ? '#FFF' : 'var(--text-secondary)'
              }}
            >
              {t('allFormats') || 'Tous'}
            </button>
            <button
              onClick={() => setFormatFilter('onsite')}
              className="premium-button"
              style={{
                border: 'none', borderRadius: '12px', padding: '9px 14px', fontSize: '12px', fontWeight: '800', cursor: 'pointer',
                backgroundColor: formatFilter === 'onsite' ? 'var(--accent-primary)' : 'transparent',
                color: formatFilter === 'onsite' ? '#FFF' : 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', gap: '5px'
              }}
            >
              <MapPin size={13} /> {t('localFormat') || 'Sur Place'}
            </button>
            <button
              onClick={() => setFormatFilter('remote')}
              className="premium-button"
              style={{
                border: 'none', borderRadius: '12px', padding: '9px 14px', fontSize: '12px', fontWeight: '800', cursor: 'pointer',
                backgroundColor: formatFilter === 'remote' ? 'var(--accent-primary)' : 'transparent',
                color: formatFilter === 'remote' ? '#FFF' : 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', gap: '5px'
              }}
            >
              <Globe size={13} /> {t('remoteFormat') || 'Visio / À distance'}
            </button>
          </div>

          {/* FILTRES & BASCULE VUE LISTE / VUE CARTE */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setIsFilterDrawerOpen(true)}
              className="premium-button"
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: '16px', padding: '10px 16px',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-main)', fontWeight: '700', fontSize: '13px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <Filter size={15} /> {t('filtersButton') || 'Filtres'}
            </button>

            <div style={{ display: 'flex', backgroundColor: 'var(--bg-subtle)', padding: '4px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <button
                onClick={() => setViewMode('list')}
                title="Vue Liste"
                className="premium-button"
                style={{
                  border: 'none', borderRadius: '12px', padding: '8px 12px', cursor: 'pointer',
                  backgroundColor: viewMode === 'list' ? 'var(--accent-primary)' : 'transparent',
                  color: viewMode === 'list' ? '#FFF' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '800'
                }}
              >
                <Grid size={15} /> {t('listView') || 'Vue Liste'}
              </button>
              <button
                onClick={handleSwitchToMap}
                title="Vue Carte"
                className="premium-button"
                style={{
                  border: 'none', borderRadius: '12px', padding: '8px 12px', cursor: 'pointer',
                  backgroundColor: viewMode === 'map' ? 'var(--accent-primary)' : 'transparent',
                  color: viewMode === 'map' ? '#FFF' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '800'
                }}
              >
                <Map size={15} /> {t('mapView') || 'Vue Carte'}
              </button>
            </div>
          </div>
        </div>

        {/* ALIGNEMENT DES CATÉGORIES */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px', alignItems: 'center' }}>
          {categories.map(cat => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="premium-button"
                style={{
                  borderRadius: '999px',
                  padding: '9px 18px',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: isSelected 
                    ? 'var(--accent-primary)' 
                    : 'var(--bg-subtle)',
                  color: isSelected 
                    ? '#FFFFFF' 
                    : 'var(--text-secondary)',
                  border: isSelected
                    ? '1px solid var(--accent-primary)'
                    : '1px solid var(--border-color)',
                  boxShadow: isSelected ? 'var(--shadow-accent)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)'
                }}
              >
                <Tag size={12} color={isSelected ? '#FFF' : 'var(--accent-primary)'} />
                <span>{cat === 'all' || cat === 'Tous' ? (t('allCategories') || 'Toutes les catégories') : cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENU COMPTEUR ET LISTE / CARTE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
        <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-secondary)' }}>
          {displayListings.length} {t('announcementsFound') || 'annonces trouvées'}
        </span>
      </div>

      {viewMode === 'list' ? (
        /* GRILLE DE CARTES ANNONCES */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(285px, 1fr))', gap: '22px' }}>
          {isLoading && realtimeListings.length === 0 ? (
            <SkeletonCard count={6} />
          ) : (
            displayListings.map(item => (
              <ListingCard
                key={item.id}
                item={item}
                handleOpenListing={handleOpenListing}
                handleStartDiscussion={handleStartDiscussion}
                currentLang={currentLang}
                t={t}
                darkMode={darkMode}
                formatCompensation={formatCompensation}
                getListingDisplayContent={getListingDisplayContent}
                showingOriginalListings={showingOriginalListings}
                toggleOriginalListing={toggleOriginalListing}
                profile={profile}
              />
            ))
          )}
        </div>
      ) : (
        /* VUE CARTE CARTE INTERACTIVE LEAFLET (AVEC PORTAL MOBILE & GESTES COOPÉRATIFS) */
        <div ref={mapContainerRef} style={{ width: '100%', position: 'relative' }}>
          <InteractiveMapView
            filteredListings={displayListings}
            mapCenter={userCoords || mapCenter}
            mapZoom={12}
            darkMode={darkMode}
            currentLang={currentLang}
            t={t}
            getCoordinatesForLocation={(loc) => {
              return (userCoords ? [userCoords[0] + (Math.random() - 0.5) * 0.05, userCoords[1] + (Math.random() - 0.5) * 0.05] : [48.8566, 2.3522]);
            }}
            getSuggestedMedia={(title, desc, img, vid) => ({ image: img || 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80', video: vid })}
            getListingDisplayContent={(item) => ({ title: item.title, description: item.description })}
            localizeLocation={(loc) => loc}
            handleOpenListing={handleOpenListing}
            createModernMapIcon={createModernMapIcon}
            onClose={() => setViewMode && setViewMode('list')}
          />
        </div>
      )}
    </div>
  );
}

