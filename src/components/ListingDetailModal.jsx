import React, { useState, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Video,
  Camera,
  Sparkles,
  Globe,
  MapPin,
  ShieldAlert,
  Tag,
  Trash2
} from 'lucide-react';
import { auth } from '../firebase';
import { BACKDROP_CLASSNAME, BACKDROP_STYLE } from './ui/modalBackdrop';
import MobileHeader from './common/MobileHeader';
import { getFallbackImage } from '../utils/mediaHelpers';
import {
  getListingDisplayContent,
  getBioTranslation,
} from '../utils/translationHelpers';
import {
  localizeTags,
  localizeReview,
} from '../data/translationsData';

/**
 * ListingDetailModal - Modale détaillée d'inspection d'une annonce du feed.
 * Gère le carrousel média (photos/vidéos), les swipes tactiles iOS/Android,
 * la traduction dynamique, et les actions (discuter, carte, signaler, supprimer admin).
 */
export default function ListingDetailModal({
  listing: propListing,
  selectedListing,
  onClose,
  isMobile,
  darkMode,
  currentLang = 'FR',
  t = (k) => k,
  profile,
  showingOriginalListings = {},
  toggleOriginalListing,
  handleViewOnMap,
  handleStartDiscussion,
  setReportTarget,
  setIsReportModalOpen,
  formatCompensation,
  isAdmin = false,
  handleAdminDeleteListing,
  confirm,
}) {
  const listing = propListing || selectedListing;
  const [detailMediaTab, setDetailMediaTab] = useState('video');
  const [selectedDetailImageIndex, setSelectedDetailImageIndex] = useState(0);
  const modalTouchStartRef = useRef(null);

  if (!listing) return null;

  const handleModalTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    modalTouchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleModalTouchMove = () => {
    // Passive touch tracker
  };

  const handleModalTouchEnd = (e) => {
    if (!modalTouchStartRef.current) return;
    const touch = e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0] : null;

    if (touch && listing) {
      const deltaX = touch.clientX - modalTouchStartRef.current.x;
      const deltaY = touch.clientY - modalTouchStartRef.current.y;
      const gallery = listing.gallery && listing.gallery.length > 0 ? listing.gallery : [listing.image];

      if (deltaY > 80 && Math.abs(deltaY) > Math.abs(deltaX)) {
        if (typeof onClose === 'function') onClose();
        setSelectedDetailImageIndex(0);
        modalTouchStartRef.current = null;
        return;
      }

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20 && gallery.length > 1) {
        if (deltaX < 0) {
          setSelectedDetailImageIndex(prev => (prev < gallery.length - 1 ? prev + 1 : 0));
        } else {
          setSelectedDetailImageIndex(prev => (prev > 0 ? prev - 1 : gallery.length - 1));
        }
      }
    }
    modalTouchStartRef.current = null;
  };

  const handleClose = () => {
    if (typeof onClose === 'function') onClose();
    setSelectedDetailImageIndex(0);
    setDetailMediaTab('image');
  };

  const isDetailShowingOriginal = !!showingOriginalListings[listing.id];
  const detailDisplayContent = getListingDisplayContent(listing, currentLang, isDetailShowingOriginal);
  const authorName = listing.authorProfile?.name || listing.author || 'Membre Troco';
  const authorUid = listing.authorProfile?.uid || listing.authorUid || null;
  const isOwnListing = Boolean(
    (profile?.name && authorName === profile.name) ||
    (authorUid && (authorUid === profile?.uid || authorUid === auth.currentUser?.uid))
  );

  return (
    <div
      className={`${BACKDROP_CLASSNAME} z-[99999] z-[100005] overflow-y-auto`}
      style={{
        ...BACKDROP_STYLE,
        position: 'fixed',
        inset: 0,
        zIndex: 100005,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: isMobile ? '12px 8px 90px' : '24px 16px 60px',
      }}
    >
      <div style={{
        maxWidth: '760px',
        margin: '0 auto',
        backgroundColor: darkMode ? '#231E1B' : '#FAF7F2',
        borderRadius: '28px',
        overflow: 'hidden',
        boxShadow: darkMode ? '0 30px 90px rgba(0,0,0,0.75)' : '0 30px 90px rgba(61,53,48,0.25)',
        border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
        color: darkMode ? '#FAF7F2' : '#3D3530',
        animation: 'modalSlideIn 0.55s var(--ease-monopo) both'
      }}>

        {/* EN-TÊTE MOBILE RETOUR TACTILE 44x44px (APPLE HIG) */}
        {isMobile && (
          <MobileHeader
            title={listing.title || "Détail de l'annonce"}
            subtitle={listing.category || "Troco"}
            onBack={handleClose}
            darkMode={darkMode}
          />
        )}

        {/* CARROUSEL HÉRO INTERACTIF */}
        <div
          onTouchStart={handleModalTouchStart}
          onTouchMove={handleModalTouchMove}
          onTouchEnd={handleModalTouchEnd}
          style={{ position: 'relative', width: '100%', height: '340px', backgroundColor: '#1A1715', touchAction: 'pan-y', userSelect: 'none', WebkitUserSelect: 'none', overflow: 'hidden' }}
        >
          {detailMediaTab === 'video' && listing.video ? (
            <video
              src={listing.video}
              poster={listing.image}
              autoPlay
              loop
              muted
              playsInline
              onError={() => setDetailMediaTab('image')}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            (() => {
              const gallery = listing.gallery && listing.gallery.length > 0 ? listing.gallery : [listing.image];
              return (
                <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                  {gallery.map((imgSrc, idx) => {
                    const isActive = idx === selectedDetailImageIndex;
                    return (
                      <img
                        key={idx}
                        src={imgSrc}
                        alt={listing.title}
                        draggable={false}
                        onError={(e) => { e.target.src = getFallbackImage(listing.category, listing.title); }}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          opacity: isActive ? 1 : 0,
                          transition: 'opacity 0.4s ease-in-out, transform 0.4s ease-in-out',
                          transform: isActive ? 'scale(1)' : 'scale(1.03)',
                          pointerEvents: 'none',
                          WebkitUserDrag: 'none',
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          zIndex: isActive ? 2 : 1
                        }}
                      />
                    );
                  })}
                </div>
              );
            })()
          )}

          {/* BOUTON FERMER */}
          <button
            onClick={handleClose}
            aria-label="Fermer les détails de l'annonce"
            style={{ position: 'absolute', top: '14px', right: '14px', border: 'none', width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'rgba(250,247,242,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, boxShadow: '0 4px 12px rgba(61,53,48,0.15)', color: '#3D3530' }}
          >
            <X size={18} />
          </button>

          {listing.isBoosted && <span className="sponsored-badge" style={{ position: 'absolute', top: '14px', left: '14px', backgroundColor: '#F59E0B', color: '#FFF', fontSize: '11px', fontWeight: '800', padding: '6px 10px', borderRadius: '10px', boxShadow: '0 6px 16px rgba(245,158,11,0.45)', zIndex: 10 }}>🔥 Sponsorisé</span>}

          {/* FLÈCHES DE NAVIGATION LATÉRALE */}
          {detailMediaTab === 'image' && (listing.gallery?.length || 0) > 1 && (
            <>
              <button
                onClick={() => setSelectedDetailImageIndex(prev => (prev > 0 ? prev - 1 : (listing.gallery.length - 1)))}
                aria-label="Photo précédente"
                style={{
                  position: 'absolute', top: '50%', left: '12px',
                  transform: 'translateY(-50%)',
                  width: '38px', height: '38px',
                  borderRadius: '50%',
                  // [PERF-IOS] backdrop-filter retiré pour éviter les crashes Jetsam sur Safari iOS
                  backgroundColor: 'rgba(26, 22, 19, 0.92)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', zIndex: 10,
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  boxShadow: 'none'
                }}
              >
                <ChevronLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
              </button>
              <button
                onClick={() => setSelectedDetailImageIndex(prev => (prev < (listing.gallery.length - 1) ? prev + 1 : 0))}
                aria-label="Photo suivante"
                style={{
                  position: 'absolute', top: '50%', right: '12px',
                  transform: 'translateY(-50%)',
                  width: '38px', height: '38px',
                  borderRadius: '50%',
                  // [PERF-IOS] backdrop-filter retiré pour éviter les crashes Jetsam sur Safari iOS
                  backgroundColor: 'rgba(26, 22, 19, 0.92)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', zIndex: 10,
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  boxShadow: 'none'
                }}
              >
                <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />
              </button>
            </>
          )}

          {/* PUCES INDICATRICES */}
          {detailMediaTab === 'image' && (listing.gallery?.length || 0) > 1 && (
            <div style={{ position: 'absolute', bottom: '14px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px', zIndex: 10, backgroundColor: 'rgba(26, 22, 19, 0.92)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '6px 12px', borderRadius: '999px' }}>
              {listing.gallery.map((_, idx) => (
                <div
                  key={idx}
                  role="button"
                  tabIndex={0}
                  aria-label={`Photo numéro ${idx + 1}`}
                  onClick={() => setSelectedDetailImageIndex(idx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedDetailImageIndex(idx);
                    }
                  }}
                  style={{
                    width: selectedDetailImageIndex === idx ? '20px' : '8px',
                    height: '8px',
                    borderRadius: '999px',
                    backgroundColor: selectedDetailImageIndex === idx ? '#C67D5B' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                />
              ))}
            </div>
          )}

          {/* COMMUTATEUR MÉDIA BASCULE VIDÉO / GALERIE */}
          <div style={{ position: 'absolute', bottom: '14px', left: '14px', display: 'flex', gap: '8px', zIndex: 10 }}>
            {listing.video && (
              <button onClick={() => setDetailMediaTab('video')} style={{ border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '999px', padding: '7px 14px', backgroundColor: detailMediaTab === 'video' ? '#C67D5B' : 'rgba(26, 22, 19, 0.92)', color: '#FFF', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Video size={13} /> {t('demoVideo')}
              </button>
            )}
            <button onClick={() => setDetailMediaTab('image')} style={{ border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '999px', padding: '7px 14px', backgroundColor: detailMediaTab === 'image' ? '#C67D5B' : 'rgba(26, 22, 19, 0.92)', color: '#FFF', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Camera size={13} /> Photos ({listing.gallery?.length || 1})
            </button>
          </div>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '10px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '999px', backgroundColor: darkMode ? 'rgba(198,125,91,0.2)' : '#F5EAE4', color: darkMode ? '#FAF7F2' : '#A8644A', fontSize: '11px', fontWeight: '800' }}>
                  <Sparkles size={12} /> {t('verifiedOffer')}
                </div>
                {(listing.isDemo || (typeof listing.id === 'number' && listing.id <= 20)) && (
                  <span style={{
                    fontSize: '10.5px',
                    fontWeight: '750',
                    letterSpacing: '0.04em',
                    padding: '5px 11px',
                    borderRadius: '999px',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--accent-primary)',
                    border: '1px solid var(--border-color)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    textTransform: 'uppercase'
                  }}>
                    <Sparkles size={12} color="var(--accent-primary)" />
                    Exemple Démo
                  </span>
                )}
              </div>
              <h3 className="font-editorial-heading" style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530' }}>{detailDisplayContent.title}</h3>
              {currentLang !== (listing.nativeLang || 'FR') && (
                <button
                  onClick={(e) => typeof toggleOriginalListing === 'function' && toggleOriginalListing(listing.id, e)}
                  className="premium-button"
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#C67D5B',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '2px 0 6px 0'
                  }}
                >
                  <Globe size={13} color="#C67D5B" />
                  {isDetailShowingOriginal ? t('showTranslation') : t('showOriginal')}
                </button>
              )}
            </div>
            {!isOwnListing ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => typeof handleViewOnMap === 'function' && handleViewOnMap(listing)}
                  className="premium-button"
                  title="Centrer la carte interactive sur cette annonce"
                  style={{
                    border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3',
                    borderRadius: '999px',
                    padding: '11px 14px',
                    backgroundColor: darkMode ? '#1A1715' : '#FFF',
                    color: darkMode ? '#FAF7F2' : '#3D3530',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <MapPin size={14} color="#C67D5B" /> {t('viewOnMap') || 'Voir sur la carte'}
                </button>
                <button
                  onClick={() => {
                    if (typeof setReportTarget === 'function') {
                      setReportTarget({
                        listing: listing,
                        user: { name: authorName, uid: authorUid }
                      });
                    }
                    if (typeof setIsReportModalOpen === 'function') setIsReportModalOpen(true);
                  }}
                  className="premium-button"
                  title="Signaler un contenu abusif ou suspect"
                  style={{
                    border: 'none',
                    borderRadius: '999px',
                    padding: '11px 14px',
                    backgroundColor: darkMode ? 'rgba(239,68,68,0.2)' : '#FEF2F2',
                    color: '#EF4444',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <ShieldAlert size={14} /> Signaler
                </button>
                <button
                  onClick={() => typeof handleStartDiscussion === 'function' && handleStartDiscussion({ id: listing.id, title: listing.title, author: authorName, compensation: listing.compensation })}
                  className="premium-button"
                  style={{ border: 'none', borderRadius: '999px', padding: '11px 16px', background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)', color: '#FFF', fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 20px rgba(198,125,91,0.35)' }}
                >
                  {t('startDiscussion')}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => typeof handleViewOnMap === 'function' && handleViewOnMap(listing)}
                  className="premium-button"
                  title="Centrer la carte interactive sur cette annonce"
                  style={{
                    border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3',
                    borderRadius: '999px',
                    padding: '10px 14px',
                    backgroundColor: darkMode ? '#1A1715' : '#FFF',
                    color: darkMode ? '#FAF7F2' : '#3D3530',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <MapPin size={14} color="#C67D5B" /> {t('viewOnMap') || 'Voir sur la carte'}
                </button>
                <div style={{ backgroundColor: darkMode ? '#1A1715' : '#F5F0E8', color: darkMode ? '#D4C5B5' : '#6B5E54', padding: '10px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: '700', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3' }}>{t('authorAnnc')}</div>
              </div>
            )}
          </div>
          <p style={{ margin: '0 0 14px', lineHeight: 1.7, color: darkMode ? '#D4C5B5' : '#6B5E54', fontSize: '14px' }}>{detailDisplayContent.description}</p>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {localizeTags(listing.tags, currentLang).map(tag => (
              <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: darkMode ? 'rgba(198,125,91,0.2)' : '#F5EAE4', color: darkMode ? '#FAF7F2' : '#A8644A', borderRadius: '999px', padding: '5px 10px', fontSize: '11px', fontWeight: '800' }}><Tag size={11} /> {tag}</span>
            ))}
          </div>

          <div style={{ border: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3', borderRadius: '16px', padding: '14px', backgroundColor: darkMode ? '#1A1715' : '#F5F0E8', marginBottom: '14px' }}>
            <div style={{ fontWeight: '800', fontSize: '13px', color: darkMode ? '#FAF7F2' : '#3D3530', marginBottom: '6px' }}>{t('compensation')}</div>
            <div style={{ fontSize: '13px', color: '#C67D5B', fontWeight: '700' }}>{typeof formatCompensation === 'function' ? formatCompensation(listing.compensation) : listing.compensation}</div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px', padding: '14px', borderRadius: '16px', backgroundColor: darkMode ? '#1A1715' : '#F5F0E8', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3' }}>
            <img src={listing.authorProfile?.avatar || listing.avatar || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="%239CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'} alt={listing.authorProfile?.name || listing.author || 'Auteur'} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #E8DDD3' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '800', color: darkMode ? '#FAF7F2' : '#3D3530' }}>{listing.authorProfile?.name || listing.author || 'Membre Troco'}</div>
              <div style={{ fontSize: '13px', color: darkMode ? '#D4C5B5' : '#6B5E54', marginTop: '4px' }}>{getBioTranslation(listing.authorProfile?.bio || listing.bio || '', currentLang, !!showingOriginalListings[listing.id])}</div>
            </div>
          </div>
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontWeight: '800', fontSize: '13px', color: darkMode ? '#FAF7F2' : '#3D3530', marginBottom: '8px' }}>{t('socialNetworks')}</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(listing.authorProfile?.socials || listing.socials || []).map(link => <span key={link} style={{ border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '999px', padding: '6px 10px', fontSize: '12px', color: '#C67D5B', fontWeight: '700', backgroundColor: darkMode ? '#1A1715' : '#FAF7F2' }}>{link}</span>)}
            </div>
          </div>
          {(listing.authorProfile?.portfolio || listing.portfolio) && (listing.authorProfile?.portfolio || listing.portfolio).length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: darkMode ? '#FAF7F2' : '#3D3530', marginBottom: '8px' }}>{t('portfolio')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
                {(listing.authorProfile?.portfolio || listing.portfolio).map((image, index) => (
                  <img key={image + index} src={image} alt={`Réalisation du portfolio numéro ${index + 1}`} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '14px' }} />
                ))}
              </div>
            </div>
          )}
          <div>
            <div style={{ fontWeight: '800', fontSize: '13px', color: darkMode ? '#FAF7F2' : '#3D3530', marginBottom: '8px' }}>{t('reviews')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(listing.authorProfile?.reviews || listing.authorReviews) && (listing.authorProfile?.reviews || listing.authorReviews).length > 0 ? (
                (listing.authorProfile?.reviews || listing.authorReviews).map((review, index) => (
                  <div key={review.text + index} style={{ border: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3', borderRadius: '14px', padding: '12px', backgroundColor: darkMode ? '#1A1715' : '#F5F0E8' }}>
                    <div style={{ color: '#F59E0B', marginBottom: '4px' }}>{'⭐'.repeat(review.rating)}{'☆'.repeat(Math.max(0, 5 - review.rating))}</div>
                    <div style={{ fontSize: '13px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>{localizeReview(review.text, currentLang)}</div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '12.5px', color: darkMode ? '#D4C5B5' : '#6B5E54', fontStyle: 'italic', padding: '12px 14px', borderRadius: '14px', backgroundColor: darkMode ? '#1A1715' : '#F5F0E8', border: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3' }}>
                  🤝 {t('noReviewsZeroTransactions')}
                </div>
              )}
            </div>
          </div>

          {isAdmin && (
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: darkMode ? '1px solid rgba(239,68,68,0.3)' : '1px solid #FEE2E2' }}>
              <button
                type="button"
                onClick={async () => {
                  if (typeof confirm === 'function') {
                    const ok = await confirm({
                      title: t('adminDeleteListingTitle') || 'Suppression administrateur',
                      message: `${t('adminDeleteListingMessage') || 'Confirmez la suppression définitive de'} « ${listing.title} » ?`,
                      confirmLabel: t('delete') || 'Supprimer',
                      cancelLabel: t('cancel') || 'Annuler',
                      variant: 'danger',
                    });
                    if (ok) {
                      if (typeof handleAdminDeleteListing === 'function') handleAdminDeleteListing(listing);
                      handleClose();
                    }
                  } else {
                    if (typeof handleAdminDeleteListing === 'function') handleAdminDeleteListing(listing);
                    handleClose();
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '14px',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  fontWeight: '800',
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 6px 16px rgba(239,68,68,0.25)'
                }}
              >
                <Trash2 size={16} /> Supprimer cette annonce (Action Administrateur)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
