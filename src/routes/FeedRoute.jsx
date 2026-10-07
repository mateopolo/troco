import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  MapPin,
  Video,
  Globe,
  Filter,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import FeedCardItem from '../components/FeedCardItem';
import SponsoredFeedCard from '../components/SponsoredFeedCard';
import PullToRefresh from '../components/ui/PullToRefresh';
import { EmptyState } from '../components/ui/EmptyState';
import TranslatedText from '../components/common/TranslatedText';
import CRTOverlay from '../components/onboarding/CRTOverlay';
import { pageTransitionVariants, pageTransitionConfig } from './pageTransitions';

const MapSection = React.lazy(() => import('../features/map/MapSection'));

export { pageTransitionVariants, pageTransitionConfig };

export default function FeedRoute({
  // Global & Layout
  globalAnnouncement,
  darkMode,
  theme,
  isMobile,
  currentLang,
  t,

  // Search & Filters
  searchQuery,
  setSearchQuery,
  deferredSearchQuery,
  isInfiniteRadius,
  setIsInfiniteRadius,
  radiusKm,
  setRadiusKm,
  setIsFilterDrawerOpen,
  setSelectedLanguages,
  setSelectedPayment,
  formatFilter,
  setFormatFilter,

  // View Mode (List / Map)
  viewMode,
  setViewMode,
  handleSwitchToMap,
  mapCenter,
  mapZoom,
  mapContainerRef,
  getCoordinatesForLocation,

  // Categories
  allCategories,
  selectedCategory,
  setSelectedCategory,
  getCategoryLabel,
  setIsCategoryModalOpen,
  scrollCategories,
  categoryScrollRef,

  // Feed & Listings
  filteredListings,
  listings,
  handleRefreshFeed,
  listingsGridRef,
  handleOpenListing,
  hoveredCardId,
  setHoveredCardId,
  hoverSlideIndex,
  getSuggestedMedia,
  getFallbackImage,
  formatCompensation,
  getListingDisplayContent,
  translationRevision,
  showingOriginalListings,
  toggleOriginalListing,
  localizeLocation,
  localizeTags,
  generateTags,
  getAuthorAvatar,
  profile,
  setProfile,
  handleStartDiscussion,
  isAdmin,
  isGodModeActive,
  handleAdminDeleteListing,
  handleAdminToggleHideListing,
  handleAdminEditListing,
  setMobileListingActionTarget,
  setSelectedPublicUser,
  setBoostingListing,
  setIsBoostModalOpen,
  setIsCguViewerOpen,
  playApplePaySound,
  setSaveMessage,
  safeTimeout,

  // Pagination & Infinite Scroll
  hasMoreListings,
  loadMoreSentinelRef,
  handleLoadMoreListings,
  isLoadingMoreListings,
}) {
  // Déformation CRT transitoire lors du défilement (Desktop uniquement, préservation perf mobile)
  const [isScrolling, setIsScrolling] = React.useState(false);
  const scrollTimerRef = React.useRef(null);

  React.useEffect(() => {
    if (isMobile) return;
    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, [isMobile]);

  return (
    <motion.div
      key="page-feed"
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransitionConfig}
      style={{
        width: '100%',
        transform: (!isMobile && isScrolling) ? 'skewX(0.5deg)' : 'none',
        transition: 'transform 0.15s ease-out'
      }}
    >
      <div className="feed-layout-container" style={{ position: 'relative' }}>
        {/* ARRIÈRE-PLAN CRT SUBTIL (5% opacité, désactivé sur mobile) */}
        {!isMobile && (
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 0,
              opacity: 0.05,
            }}
          >
            <CRTOverlay
              showScanlines={true}
              showNoise={true}
              intensity={0.05}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        )}

        {/* CONTENU CENTRAL DU FEED */}
        <div className="feed-main-content">
          {/* BANNIÈRE D'ANNONCE GLOBALE DYNAMIQUE DU CMS (useGlobalContent) */}
          {globalAnnouncement && (
            <div
              style={{
                backgroundColor: darkMode ? 'rgba(198,125,91,0.15)' : '#FBF3EE',
                border: '1px solid rgba(198,125,91,0.3)',
                borderRadius: '16px',
                padding: '10px 16px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                fontSize: '13px',
                fontWeight: '700',
                color: darkMode ? '#FAF7F2' : '#8C482F',
                boxShadow: '0 4px 12px rgba(198,125,91,0.08)',
                animation: 'fadeIn 0.3s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                <span>
                  <TranslatedText
                    text={globalAnnouncement}
                    targetLang={currentLang}
                    fallback={globalAnnouncement}
                  />
                </span>
              </div>
            </div>
          )}

          {/* Ligne Recherche + Filtre Rayon + Bascule Vue Liste / Carte */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-card)', /* [PERF-IOS] */ border: '1px solid var(--border-color)', borderRadius: '16px', padding: '10px 14px', boxShadow: 'var(--shadow-card)' }}>
              <Search size={18} color="var(--accent-primary)" style={{ marginRight: '10px' }} />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} type="text" placeholder={t('searchPlaceholder')} style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', backgroundColor: 'transparent', color: 'var(--text-main)' }} />
            </div>
            <button
              onClick={() => setIsFilterDrawerOpen(true)}
              className="premium-button"
              style={{
                backgroundColor: isInfiniteRadius || radiusKm >= 100 ? 'var(--bg-subtle)' : 'var(--bg-card)',
                /* [PERF-IOS] */
                border: isInfiniteRadius || radiusKm >= 100 ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '10px 14px',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-card)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: isInfiniteRadius || radiusKm >= 100 ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: '700',
                fontSize: '13px'
              }}
            >
              <Filter size={18} color={isInfiniteRadius || radiusKm >= 100 ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
              <span>{isInfiniteRadius || radiusKm >= 100 ? `♾️ ${t('infinite')}` : `${radiusKm} km`}</span>
            </button>

            {/* Sélecteur de vue (Liste / Carte) dédié et étanche */}
            <div className="premium-panel" style={{ display: 'inline-flex', flexShrink: 0, border: '1px solid var(--border-color)', borderRadius: '999px', padding: '3px', backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-card)' }}>
              <button onClick={() => setViewMode('list')} className="premium-nav-btn" style={{ border: 'none', borderRadius: '999px', padding: '8px 14px', backgroundColor: viewMode === 'list' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'list' ? '#FFF' : 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>{t('viewList')}</button>
              <button onClick={handleSwitchToMap} className="premium-nav-btn" style={{ border: 'none', borderRadius: '999px', padding: '8px 14px', backgroundColor: viewMode === 'map' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'map' ? '#FFF' : 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>{t('viewMap')}</button>
            </div>
          </div>

          {/* Barre des catégories avec Carrousel fluide et flèches de navigation latérales */}
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            marginBottom: '16px',
            width: '100%',
            minWidth: 0,
            gap: '8px'
          }}>
            {/* Flèche de défilement gauche */}
            <button
              type="button"
              onClick={() => scrollCategories('left')}
              title="Faire défiler vers la gauche"
              className="premium-button"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                boxShadow: 'var(--shadow-card)',
                zIndex: 2,
                transition: 'all 0.2s ease'
              }}
            >
              <ChevronLeft size={16} />
            </button>

            {/* Conteneur de défilement des catégories */}
            <div
              role="group"
              aria-label="Sélection de catégorie"
              ref={categoryScrollRef}
              className="category-scroll-container"
              style={{
                flex: 1,
                minWidth: 0,
                paddingBottom: '4px',
                scrollBehavior: 'smooth'
              }}
            >
              {allCategories.map(category => {
                const isSel = selectedCategory === category;
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    aria-pressed={isSel}
                    className="premium-button category-pill"
                    style={{
                      border: isSel ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      backgroundColor: isSel ? 'var(--bg-subtle)' : 'var(--bg-card)',
                      color: isSel ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      boxShadow: isSel ? 'var(--shadow-accent)' : 'var(--shadow-card)',
                      cursor: 'pointer'
                    }}
                  >
                    {getCategoryLabel(category, t)}
                  </button>
                );
              })}
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                aria-label="Ajouter une catégorie"
                className="premium-button category-pill"
                style={{
                  border: '1px dashed var(--accent-primary)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--accent-primary)',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                + {t('newCategory')}
              </button>
            </div>

            {/* Flèche de défilement droite */}
            <button
              type="button"
              onClick={() => scrollCategories('right')}
              title="Faire défiler vers la droite"
              className="premium-button"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                boxShadow: 'var(--shadow-card)',
                zIndex: 2,
                transition: 'all 0.2s ease'
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* SÉLECTEUR FORMAT (Tous / Sur place / À distance) */}
          <div role="group" aria-label="Filtre de format" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            maxWidth: isMobile ? '100%' : '480px',
            width: '100%',
            margin: '0 auto 20px auto',
          }}>
            {/* SÉLECTEUR SEGMENTÉ FORMAT */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              padding: '4px',
              borderRadius: '16px',
              backgroundColor: 'var(--bg-card)',
              /* [PERF-IOS] */
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-card)',
              boxSizing: 'border-box',
              gap: '4px'
            }}>
              <button
                type="button"
                onClick={() => setFormatFilter('all')}
                aria-pressed={formatFilter === 'all'}
                className="premium-button"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: formatFilter === 'all'
                    ? 'var(--accent-primary)'
                    : 'transparent',
                  color: formatFilter === 'all'
                    ? '#FFFFFF'
                    : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: formatFilter === 'all'
                    ? 'var(--shadow-accent)'
                    : 'none',
                  transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)'
                }}
              >
                <Globe size={13} />
                <span>{t('all')}</span>
              </button>

              <button
                type="button"
                onClick={() => setFormatFilter('onsite')}
                aria-pressed={formatFilter === 'onsite'}
                className="premium-button"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: formatFilter === 'onsite'
                    ? 'var(--accent-primary)'
                    : 'transparent',
                  color: formatFilter === 'onsite'
                    ? '#FFFFFF'
                    : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: formatFilter === 'onsite'
                    ? 'var(--shadow-accent)'
                    : 'none',
                  transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)'
                }}
              >
                <MapPin size={13} />
                <span>{t('onsite')}</span>
              </button>

              <button
                type="button"
                onClick={() => setFormatFilter('remote')}
                aria-pressed={formatFilter === 'remote'}
                className="premium-button"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: formatFilter === 'remote'
                    ? 'var(--accent-primary)'
                    : 'transparent',
                  color: formatFilter === 'remote'
                    ? '#FFFFFF'
                    : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: formatFilter === 'remote'
                    ? 'var(--shadow-accent)'
                    : 'none',
                  transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)'
                }}
              >
                <Video size={13} />
                <span>{t('remote')}</span>
              </button>
            </div>
          </div>

          {filteredListings.length === 0 ? (
            <div style={{ width: '100%', padding: '40px 0', display: 'flex', justifyContent: 'center' }}>
              <EmptyState
                icon={<Search size={30} strokeWidth={2.2} />}
                title={t('noListingsFoundTitle', 'Aucune annonce ne correspond à ta recherche')}
                description={t('noListingsFoundDesc', "Essaie d'élargir ton rayon de recherche, de changer de catégorie ou de réinitialiser tes filtres pour découvrir les annonces des membres Troco.")}
                action={(
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setRadiusKm(100);
                      setIsInfiniteRadius(true);
                      setSelectedLanguages([]);
                      setSelectedPayment('all');
                      setFormatFilter('all');
                    }}
                    className="premium-button"
                    style={{
                      border: 'none',
                      borderRadius: '999px',
                      padding: '12px 24px',
                      background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                      color: '#FFF',
                      fontWeight: '800',
                      fontSize: '13px',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-accent)',
                    }}
                  >
                    Réinitialiser tous les filtres
                  </button>
                )}
              />
            </div>
          ) : viewMode === 'map' ? (
            <div ref={mapContainerRef} style={{ width: '100%', position: 'relative' }}>
              <Suspense fallback={null}>
                <MapSection
                  filteredListings={filteredListings}
                  mapCenter={mapCenter}
                  mapZoom={mapZoom}
                  darkMode={darkMode}
                  currentLang={currentLang}
                  t={t}
                  theme={theme}
                  getCoordinatesForLocation={getCoordinatesForLocation}
                  getSuggestedMedia={getSuggestedMedia}
                  getListingDisplayContent={getListingDisplayContent}
                  localizeLocation={localizeLocation}
                  handleOpenListing={handleOpenListing}
                  onClose={() => setViewMode('list')}
                  onCloseMap={() => setViewMode('list')}
                  mapContainerRef={mapContainerRef}
                />
              </Suspense>
            </div>
          ) : (
            <PullToRefresh onRefresh={handleRefreshFeed} disabled={viewMode === 'map'}>
              <motion.div
                ref={listingsGridRef}
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.05,
                    },
                  },
                }}
                initial="hidden"
                animate="show"
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(290px, 1fr))',
                  gap: isMobile ? '16px' : '24px',
                  width: '100%',
                  boxSizing: 'border-box',
                  opacity: searchQuery !== deferredSearchQuery ? 0.7 : 1,
                  transition: 'opacity 150ms ease',
                }}
              >
                {(filteredListings || []).map((item, index) => {
                  if (item.isSponsored) {
                    return (
                      <div key={item.id ?? `feed-sponsored-${index}`} className="feed-card-virtualized">
                        <SponsoredFeedCard
                          index={index}
                          darkMode={darkMode}
                          currentLang={currentLang}
                          t={t}
                          onOpenBoostModal={() => {
                            const myListing = (listings || []).find(l => l.author === profile?.name) || (listings && listings[0]);
                            setBoostingListing(myListing);
                            setIsBoostModalOpen(true);
                          }}
                          onOpenBusinessOffer={() => {
                            setIsCguViewerOpen(true);
                          }}
                          onClaimBonus={(amount) => {
                            const bonusVal = typeof amount === 'number' ? amount : (amount?.amount || 2.0);
                            setProfile(prev => ({
                              ...prev,
                              euroBalance: Number((prev.euroBalance + bonusVal).toFixed(2))
                            }));
                            playApplePaySound();
                            setSaveMessage(`🎁 Bonus partenaire crédité : +${bonusVal}€ sur votre solde !`);
                            safeTimeout(() => setSaveMessage(''), 6000);
                          }}
                        />
                      </div>
                    );
                  }

                  const authorProfile = item?.authorProfile || {
                    name: item?.author || 'Membre Troco',
                    avatar: item?.authorAvatar || item?.avatar || item?.authorPhotoURL || '',
                    bio: item?.bio || '',
                    location: item?.location || 'Paris',
                    uid: item?.authorUid || null,
                  };

                  const shouldInjectSponsor = (index + 1) % 6 === 0;

                  return (
                    <React.Fragment key={item.id ?? `feed-item-${index}`}>
                      <div className="feed-card-virtualized">
                        <FeedCardItem
                          item={item}
                          darkMode={darkMode}
                          hoveredCardId={hoveredCardId}
                          setHoveredCardId={setHoveredCardId}
                          hoverSlideIndex={hoverSlideIndex}
                          handleOpenListing={handleOpenListing}
                          getSuggestedMedia={getSuggestedMedia}
                          getFallbackImage={getFallbackImage}
                          formatCompensation={formatCompensation}
                          getListingDisplayContent={getListingDisplayContent}
                          currentLang={currentLang}
                          langRevision={translationRevision}
                          showingOriginalListings={showingOriginalListings}
                          toggleOriginalListing={toggleOriginalListing}
                          localizeLocation={localizeLocation}
                          localizeTags={localizeTags}
                          generateTags={generateTags}
                          getAuthorAvatar={getAuthorAvatar}
                          profile={profile}
                          handleStartDiscussion={handleStartDiscussion}
                          isAdmin={isAdmin}
                          isGodModeActive={isGodModeActive}
                          onAdminDeleteListing={handleAdminDeleteListing}
                          onAdminToggleHideListing={handleAdminToggleHideListing}
                          onAdminEditListing={handleAdminEditListing}
                          onOpenMobileActions={setMobileListingActionTarget}
                          t={t}
                          onViewUserProfile={() => {
                            const userObj = {
                              id: item.authorUid || item.userId || `user_${item.author}`,
                              uid: item.authorUid || item.userId || null,
                              name: item.author || 'Membre Troco',
                              username: item.author ? `@${item.author.toLowerCase().replace(/\s+/g, '')}` : '@membre',
                              avatar: authorProfile.avatar,
                              bio: authorProfile.bio,
                              location: item.location || 'France',
                              trocoTokens: item.trocoTokens || 0,
                              euroBalance: item.euroBalance || 0,
                              isTrocoPlus: item.isTrocoPlus || false,
                              kycVerified: item.kycVerified || false,
                              dealsCompleted: item.dealsCompleted || 0,
                              authorProfile: authorProfile,
                            };
                            setSelectedPublicUser(userObj);
                          }}
                        />
                      </div>

                      {/* INJECTION D'UNE CELLULE SPONSORISÉE DÉDIÉE DANS LA GRILLE TOUTES LES 6 ANNONCES */}
                      {shouldInjectSponsor && (
                        <div key={`sponsored-slot-${index}`} className="feed-card-virtualized">
                          <SponsoredFeedCard
                            index={Math.floor(index / 6)}
                            darkMode={darkMode}
                            currentLang={currentLang}
                            t={t}
                            onOpenBoostModal={() => {
                              const myListing = (listings || []).find(l => l.author === profile?.name) || (listings && listings[0]);
                              setBoostingListing(myListing);
                              setIsBoostModalOpen(true);
                            }}
                            onOpenBusinessOffer={() => {
                              setIsCguViewerOpen(true);
                            }}
                            onClaimBonus={(amount) => {
                              const bonusVal = typeof amount === 'number' ? amount : (amount?.amount || 2.0);
                              setProfile(prev => ({
                                ...prev,
                                euroBalance: Number((prev.euroBalance + bonusVal).toFixed(2))
                              }));
                              playApplePaySound();
                              setSaveMessage(`🎁 Bonus partenaire crédité : +${bonusVal}€ sur votre solde !`);
                              safeTimeout(() => setSaveMessage(''), 6000);
                            }}
                          />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </motion.div>

              {/* SENTINELLE OBSERVER POUR AUTO INFINITE SCROLL */}
              {hasMoreListings && (
                <div ref={loadMoreSentinelRef} style={{ width: '100%', height: '24px', margin: '8px 0', pointerEvents: 'none' }} />
              )}

              {/* BOUTON CHARGER PLUS D'ANNONCES (PAGINATED INFINITE SCROLL) */}
              {hasMoreListings && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '28px', marginBottom: '20px' }}>
                  <button
                    type="button"
                    onClick={handleLoadMoreListings}
                    disabled={isLoadingMoreListings}
                    className="premium-button"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 30px',
                      borderRadius: '999px',
                      border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.12)',
                      backgroundColor: darkMode ? 'rgba(35,30,27,0.95)' : '#FFFFFF',
                      color: darkMode ? '#FAF7F2' : '#3D3530',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: isLoadingMoreListings ? 'not-allowed' : 'pointer',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      transition: 'all 0.2s ease',
                      opacity: isLoadingMoreListings ? 0.7 : 1,
                    }}
                  >
                    {isLoadingMoreListings ? (
                      <>
                        <div style={{ width: '16px', height: '16px', border: '2px solid #C67D5B', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <span>{t('loadingMoreListings', 'Chargement des annonces...')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('loadMoreListings', "Charger plus d'annonces")}</span>
                        <ChevronRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              )}
            </PullToRefresh>
          )}
        </div>

      </div>
    </motion.div>
  );
}
