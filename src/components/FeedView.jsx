import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, MapPin, Filter, Grid, Map, Globe, Tag } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import ListingCard from './ListingCard';

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
  formatCompensation,
  getListingDisplayContent,
  showingOriginalListings = {},
  toggleOriginalListing = () => {},
  profile = { name: 'MATEO POLO', avatar: '' }
}) {
  const [realtimeListings, setRealtimeListings] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'listings'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRealtimeListings(data);
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
      {/* BARRE DE RECHERCHE, FORMATS & FILTRES SOUVERAINS (UNIFIÉE AIRBNB / APPLE / NIKE) */}
      <div style={{
        backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.88)' : 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderRadius: '24px', padding: '16px 20px',
        boxShadow: darkMode ? '0 12px 36px rgba(0, 0, 0, 0.35)' : '0 10px 30px rgba(15, 23, 42, 0.05)',
        border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(226,232,240,0.8)',
        display: 'flex', flexDirection: 'column', gap: '14px'
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {/* CHAMP DE RECHERCHE PRINCIPAL */}
          <div style={{ flex: '1 1 300px', position: 'relative', minWidth: '240px' }}>
            <Search size={18} color={darkMode ? '#94A3B8' : '#94A3B8'} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder') || 'Rechercher une compétence, un outil ou un service...'}
              style={{
                width: '100%', padding: '13px 16px 13px 44px',
                border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #E2E8F0',
                borderRadius: '16px', fontSize: '14px', fontWeight: '500',
                backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.6)' : '#F8FAFC',
                color: darkMode ? '#FFF' : '#111827',
                outline: 'none'
              }}
            />
          </div>

          {/* SÉLECTEUR FORMAT NATIF (SUR PLACE / VISIO / TOUS) */}
          <div style={{ display: 'flex', backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.6)' : '#F1F5F9', padding: '4px', borderRadius: '16px', border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0' }}>
            <button
              onClick={() => setFormatFilter('all')}
              className="premium-button"
              style={{
                border: 'none', borderRadius: '12px', padding: '9px 14px', fontSize: '12px', fontWeight: '800', cursor: 'pointer',
                backgroundColor: formatFilter === 'all' ? (darkMode ? '#60A5FA' : '#04265A') : 'transparent',
                color: formatFilter === 'all' ? '#FFF' : (darkMode ? '#94A3B8' : '#64748B')
              }}
            >
              {t('allFormats') || 'Tous'}
            </button>
            <button
              onClick={() => setFormatFilter('onsite')}
              className="premium-button"
              style={{
                border: 'none', borderRadius: '12px', padding: '9px 14px', fontSize: '12px', fontWeight: '800', cursor: 'pointer',
                backgroundColor: formatFilter === 'onsite' ? (darkMode ? '#60A5FA' : '#04265A') : 'transparent',
                color: formatFilter === 'onsite' ? '#FFF' : (darkMode ? '#94A3B8' : '#64748B'),
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
                backgroundColor: formatFilter === 'remote' ? (darkMode ? '#60A5FA' : '#04265A') : 'transparent',
                color: formatFilter === 'remote' ? '#FFF' : (darkMode ? '#94A3B8' : '#64748B'),
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
                border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #CBD5E1',
                borderRadius: '16px', padding: '10px 16px',
                backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.8)' : '#FFF',
                color: darkMode ? '#FFF' : '#334155', fontWeight: '700', fontSize: '13px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <Filter size={15} /> {t('filtersButton') || 'Filtres'}
            </button>

            <div style={{ display: 'flex', backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.6)' : '#F1F5F9', padding: '4px', borderRadius: '16px', border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0' }}>
              <button
                onClick={() => setViewMode('list')}
                title="Vue Liste"
                className="premium-button"
                style={{
                  border: 'none', borderRadius: '12px', padding: '8px 12px', cursor: 'pointer',
                  backgroundColor: viewMode === 'list' ? (darkMode ? '#60A5FA' : '#04265A') : 'transparent',
                  color: viewMode === 'list' ? '#FFF' : (darkMode ? '#94A3B8' : '#64748B'),
                  display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '800'
                }}
              >
                <Grid size={15} /> {t('listView') || 'Vue Liste'}
              </button>
              <button
                onClick={() => setViewMode('map')}
                title="Vue Carte"
                className="premium-button"
                style={{
                  border: 'none', borderRadius: '12px', padding: '8px 12px', cursor: 'pointer',
                  backgroundColor: viewMode === 'map' ? (darkMode ? '#60A5FA' : '#04265A') : 'transparent',
                  color: viewMode === 'map' ? '#FFF' : (darkMode ? '#94A3B8' : '#64748B'),
                  display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '800'
                }}
              >
                <Map size={15} /> {t('mapView') || 'Vue Carte'}
              </button>
            </div>
          </div>
        </div>

        {/* ALIGNEMENT PARFAIT DES CATÉGORIES (STYLE TAGS HARMONISÉ) */}
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
                    ? (darkMode ? '#60A5FA' : '#04265A') 
                    : (darkMode ? 'rgba(15,23,42,0.6)' : '#EFF6FF'),
                  color: isSelected 
                    ? '#FFFFFF' 
                    : (darkMode ? '#93C5FD' : '#04265A'),
                  border: isSelected
                    ? 'none'
                    : (darkMode ? '1.5px solid rgba(96,165,250,0.4)' : '1.5px solid #04265A'),
                  boxShadow: isSelected ? '0 6px 18px rgba(4,38,90,0.3)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)'
                }}
              >
                <Tag size={12} color={isSelected ? '#FFF' : (darkMode ? '#93C5FD' : '#04265A')} />
                <span>{cat === 'all' || cat === 'Tous' ? (t('allCategories') || 'Toutes les catégories') : cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENU COMPTEUR ET LISTE / CARTE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
        <span style={{ fontSize: '14px', fontWeight: '800', color: darkMode ? '#94A3B8' : '#64748B' }}>
          {displayListings.length} {t('announcementsFound') || 'annonces trouvées'}
        </span>
      </div>

      {viewMode === 'list' ? (
        /* GRILLE DE CARTES ANNONCES (4 COLONNES HARMONIEUSES ET UNIFIÉES SUR ÉCRANS PC) */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(285px, 1fr))', gap: '22px' }}>
          {displayListings.map(item => (
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
          ))}
        </div>
      ) : (
        /* VUE CARTE CARTE INTERACTIVE LEAFLET */
        <div style={{ borderRadius: '24px', overflow: 'hidden', height: '620px', boxShadow: '0 20px 50px rgba(0,0,0,0.12)', border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0' }}>
          <MapContainer center={userCoords || mapCenter} zoom={12} style={{ width: '100%', height: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url={darkMode ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
            />
            {displayListings.map(item => {
              const coords = item.coordinates || (userCoords ? [userCoords[0] + (Math.random() - 0.5) * 0.05, userCoords[1] + (Math.random() - 0.5) * 0.05] : [48.8566, 2.3522]);
              const modernIcon = createModernMapIcon(darkMode);
              return (
                <Marker key={item.id} position={coords} icon={modernIcon}>
                  <Popup>
                    <div style={{ padding: '6px', maxWidth: '200px' }}>
                      <div style={{ fontWeight: '800', fontSize: '13px', marginBottom: '4px' }}>{item.title}</div>
                      <div style={{ fontSize: '11px', color: '#059669', fontWeight: '700', marginBottom: '8px' }}>{formatCompensation(item.compensation)}</div>
                      <button
                        onClick={() => handleOpenListing(item)}
                        style={{ border: 'none', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#04265A', color: '#FFF', fontSize: '11px', fontWeight: '800', width: '100%', cursor: 'pointer' }}
                      >
                        {t('viewDetail') || 'Voir détails'}
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      )}
    </div>
  );
}
