import React, { useRef, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, MapPin, Video, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import FeedCardItem from '../../components/FeedCardItem';
import SponsoredFeedCard from '../../components/SponsoredFeedCard';
import { EmptyState } from '../../components/ui/EmptyState';

export function FeedSection({
  filteredListings,
  viewMode,
  setViewMode,
  setIsInfiniteRadius,
  scrollCategories,
  categoryScrollRef,
  categories,
  selectedCategory,
  setSelectedCategory,
  formatFilter,
  setFormatFilter,
  listingsGridRef,
  hoveredCardId,
  setHoveredCardId,
  hoverSlideIndex,
  handleOpenListing,
  getSuggestedMedia,
  getFallbackImage,
  formatCompensation,
  getListingDisplayContent,
  currentLang,
  showingOriginalListings,
  toggleOriginalListing,
  localizeLocation,
  localizeTags,
  generateTags,
  getAuthorAvatar,
  profile,
  handleStartDiscussion,
  isAdmin,
  isGodModeActive = false,
  handleAdminDeleteListing,
  handleAdminToggleHideListing = null,
  handleAdminEditListing = null,
  setMobileListingActionTarget,
  setSaveMessage,
  setBoostingListing,
  setIsBoostModalOpen,
  setActiveTab,
  setIsCguViewerOpen,
  setSearchQuery,
  setRadiusKm,
  setSelectedLanguages,
  setSelectedPayment,
  isMobile,
  darkMode,
  t,
  listings,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore = null,
  mapContainerRef = null,
}) {
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!hasMore || isLoadingMore || typeof onLoadMore !== 'function') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0] && entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: '300px 0px', threshold: 0.1 }
    );

    const el = sentinelRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasMore, isLoadingMore, onLoadMore]);
  return (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', width: '100%' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Titre éditorial discret et sélecteur de vue */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <button
            type="button"
            onClick={() => { setSelectedCategory('all'); setFormatFilter('all'); setSearchQuery(''); }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'baseline',
              gap: '6px',
              textAlign: 'left'
            }}
          >
            <h2 className="font-editorial-heading" style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
              {t('feedTab')}
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
              ({filteredListings.length})
            </span>
          </button>

          {/* Sélecteur de vue (Liste / Carte) dédié et étanche */}
          <div className="premium-panel" style={{ display: 'inline-flex', flexShrink: 0, border: '1px solid var(--border-color)', borderRadius: '999px', padding: '3px', backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-card)' }}>
            <button onClick={() => setViewMode('list')} className="premium-nav-btn" style={{ border: 'none', borderRadius: '999px', padding: '8px 14px', backgroundColor: viewMode === 'list' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'list' ? '#FFF' : 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>{t('viewList')}</button>
            <button
              onClick={() => {
                setViewMode('map');
                setIsInfiniteRadius(true);
                setTimeout(() => {
                  if (mapContainerRef?.current) {
                    mapContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }, 60);
              }}
              className="premium-nav-btn"
              style={{ border: 'none', borderRadius: '999px', padding: '8px 14px', backgroundColor: viewMode === 'map' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'map' ? '#FFF' : 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}
            >
              {t('viewMap')}
            </button>
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
            ref={categoryScrollRef}
            className="category-scroll-container"
            style={{
              flex: 1,
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              padding: '4px 2px',
              scrollBehavior: 'smooth'
            }}
          >
            {categories.map((category) => {
              const isSelected = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className="premium-category-pill"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '999px',
                    border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--bg-card)',
                    color: isSelected ? '#FFFFFF' : 'var(--text-main)',
                    fontSize: '12px',
                    fontWeight: isSelected ? '800' : '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    boxShadow: isSelected ? 'var(--shadow-accent)' : 'var(--shadow-card)',
                    transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)'
                  }}
                >
                  <span>{category.icon}</span>
                  <span>{category.label}</span>
                </button>
              );
            })}
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
        <div style={{
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
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-card)',
            boxSizing: 'border-box',
            gap: '4px'
          }}>
            <button
              type="button"
              onClick={() => setFormatFilter('all')}
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
              <span>{t('allFormats')}</span>
            </button>

            <button
              type="button"
              onClick={() => setFormatFilter('onsite')}
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
              title="Aucune annonce ne correspond à ta recherche"
              description="Essaie d'élargir ton rayon de recherche, de changer de catégorie ou de réinitialiser tes filtres pour découvrir les annonces de la communauté Troco."
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
        ) : (
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
              boxSizing: 'border-box'
            }}
          >
            {filteredListings.map((item, idx) => {
              const shouldRenderSponsor = (idx + 1) % 5 === 0;
              const sponsorIndex = Math.floor(idx / 5);

              return (
                <React.Fragment key={item.id}>
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
                  />
                  {shouldRenderSponsor && (
                    <SponsoredFeedCard
                      key={`sponsor-slot-${idx}`}
                      index={sponsorIndex}
                      darkMode={darkMode}
                      onOpenNotification={(msg) => {
                        setSaveMessage(msg);
                        setTimeout(() => setSaveMessage(''), 6000);
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </motion.div>

          {/* SENTINELLE OBSERVER POUR AUTO INFINITE SCROLL */}
          {hasMore && (
            <div ref={sentinelRef} style={{ width: '100%', height: '24px', margin: '4px 0', pointerEvents: 'none' }} />
          )}

          {/* BOUTON CHARGEMENT INFINITE SCROLL */}
          {hasMore && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '28px', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={onLoadMore}
                disabled={isLoadingMore}
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
                  cursor: isLoadingMore ? 'not-allowed' : 'pointer',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  transition: 'all 0.2s ease',
                  opacity: isLoadingMore ? 0.7 : 1,
                }}
              >
                {isLoadingMore ? (
                  <>
                    <div style={{ width: '16px', height: '16px', border: '2px solid #C67D5B', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <span>Chargement des annonces...</span>
                  </>
                ) : (
                  <>
                    <span>Charger plus d'annonces</span>
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          )}
        )}
      </div>

      {/* BANNIÈRE LATÉRALE DROITE (DESKTOP) */}
      <aside className="desktop-ad-banner" aria-label="Monétisation & Boost Troco">
        <div className="ad-card" style={{ border: darkMode ? '1px solid rgba(245,158,11,0.3)' : '1px solid #FDE68A' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#B45309', backgroundColor: '#FEF3C7', padding: '3px 7px', borderRadius: '6px' }}>
              🔥 Troco Boost
            </span>
            <span style={{ fontSize: '9px', color: darkMode ? '#94A3B8' : '#94A3B8' }}>Visibilité</span>
          </div>
          <img
            src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=80"
            alt="Booster annonce"
            style={{ width: '100%', height: '85px', objectFit: 'cover', borderRadius: '12px', marginBottom: '8px' }}
          />
          <div style={{ fontSize: '13px', fontWeight: '800', color: darkMode ? '#FFFFFF' : '#0F172A', marginBottom: '4px', lineHeight: 1.3 }}>
            Passez en tête du Feed !
          </div>
          <div style={{ fontSize: '11px', color: darkMode ? '#94A3B8' : '#64748B', lineHeight: 1.4, marginBottom: '6px' }}>
            Multipliez par 5 vos contacts en plaçant vos annonces en tête d'affiche.
          </div>
          <div style={{ fontSize: '11px', fontWeight: '800', color: darkMode ? '#FBBF24' : '#D97706', marginBottom: '8px' }}>
            À partir de 2,99€ / 7 jours
          </div>
          <button
            type="button"
            onClick={() => {
              const myListing = (listings || []).find(l => l.author === profile?.name) || (listings || [])[0];
              if (myListing) {
                setBoostingListing(myListing);
                setIsBoostModalOpen(true);
              } else {
                setActiveTab('profile');
                alert("💡 Créez ou sélectionnez l'une de vos annonces depuis votre profil pour activer le Boost !");
              }
            }}
            className="premium-button"
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '10px',
              backgroundColor: '#D97706',
              color: '#FFF',
              fontSize: '11px',
              fontWeight: '800',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              boxShadow: '0 4px 12px rgba(217,119,6,0.25)'
            }}
          >
            <Flame size={13} /> Booster mon annonce
          </button>
        </div>

        <div className="ad-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#7E22CE', backgroundColor: '#F3E8FF', padding: '3px 7px', borderRadius: '6px' }}>
              🏢 Espace Pro
            </span>
            <span style={{ fontSize: '9px', color: darkMode ? '#94A3B8' : '#94A3B8' }}>Offre Pro</span>
          </div>
          <img
            src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=400&q=80"
            alt="Troco Entreprise"
            style={{ width: '100%', height: '85px', objectFit: 'cover', borderRadius: '12px', marginBottom: '8px' }}
          />
          <div style={{ fontSize: '13px', fontWeight: '800', color: darkMode ? '#FFFFFF' : '#0F172A', marginBottom: '4px', lineHeight: 1.3 }}>
            Vous êtes une Entreprise ?
          </div>
          <div style={{ fontSize: '11px', color: darkMode ? '#94A3B8' : '#64748B', lineHeight: 1.4, marginBottom: '8px' }}>
            Abonnement Pro avec facturation TVA et échanges illimités.
          </div>
          <button
            type="button"
            onClick={() => setIsCguViewerOpen(true)}
            className="premium-button"
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '10px',
              backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#F1F5F9',
              color: darkMode ? '#FFF' : '#0F172A',
              fontSize: '11px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            En savoir plus
          </button>
        </div>
      </aside>
    </div>
  );
}

export default FeedSection;
