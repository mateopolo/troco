import React, { useState, useRef } from 'react';
import { X, Star, MapPin, Video, Globe, ShieldCheck, MessageSquare, Flame, Pencil, Trash2, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import { getSuggestedMedia } from '../utils/mediaUtils';

export default function ListingDetailModal({
  selectedListing,
  onClose,
  handleStartDiscussion,
  handleBoostListing,
  handleStartEditListing,
  handleDeleteListing,
  handleTogglePauseListing,
  handleViewOnMap,
  profile,
  currentLang,
  t,
  darkMode,
  formatCompensation,
  getListingDisplayContent,
  showingOriginalListings = {},
  toggleOriginalListing = () => {}
}) {
  const [detailMediaTab, setDetailMediaTab] = useState('image');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const touchStartRef = useRef(null);
  const touchDeltaXRef = useRef(0);
  const isSwipingRef = useRef(false);
  const detailVideoRef = useRef(null);

  if (!selectedListing) return null;

  const isOwner = Boolean(profile?.name && selectedListing.author === profile.name);
  const media = getSuggestedMedia ? getSuggestedMedia(selectedListing.title, selectedListing.description || '', selectedListing.image, selectedListing.video) : {};
  const gallery = (selectedListing.gallery && selectedListing.gallery.length > 0) ? selectedListing.gallery : (media.gallery && media.gallery.length > 0 ? media.gallery : (selectedListing.image ? [selectedListing.image] : []));
  const currentImage = gallery[selectedImageIndex] || selectedListing.image;

  const isDetailShowingOriginal = !!showingOriginalListings[selectedListing.id];
  const displayContent = getListingDisplayContent
    ? getListingDisplayContent(selectedListing, currentLang, isDetailShowingOriginal)
    : { title: selectedListing.title, description: selectedListing.description };
  const nativeLang = selectedListing.nativeLang || 'FR';

  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    touchDeltaXRef.current = 0;
    isSwipingRef.current = false;
  };

  const handleTouchMove = (e) => {
    if (!touchStartRef.current || !e.touches || e.touches.length === 0) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = touchStartRef.current.x - currentX;
    const deltaY = touchStartRef.current.y - currentY;

    touchDeltaXRef.current = deltaX;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 12) {
      isSwipingRef.current = true;
    }
  };

  const handleTouchEnd = () => {
    const deltaX = touchDeltaXRef.current;
    if (isSwipingRef.current && Math.abs(deltaX) > 20 && gallery.length > 1) {
      if (deltaX > 0) {
        // Swiped left -> next photo
        setSelectedImageIndex(prev => (prev + 1) % gallery.length);
      } else {
        // Swiped right -> prev photo
        setSelectedImageIndex(prev => (prev - 1 + gallery.length) % gallery.length);
      }
    }
    touchStartRef.current = null;
    touchDeltaXRef.current = 0;
  };

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/90 md:bg-[var(--overlay-bg)] md:backdrop-blur-md overflow-y-auto flex items-center justify-center p-5"
      style={{
        position: 'fixed', inset: 0,
        zIndex: 1000,
      }}
    >
      <div style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: '28px', width: '100%', maxWidth: '780px',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: 'var(--shadow-modal)',
        border: '1px solid var(--border-color)',
        position: 'relative', padding: '28px'
      }}>
        {/* BOUTON FERMER */}
        <button
          onClick={onClose}
          className="premium-button"
          style={{
            position: 'absolute', top: '18px', right: '18px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-subtle)',
            color: 'var(--text-main)', width: '36px', height: '36px',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 10
          }}
        >
          <X size={18} />
        </button>

        {/* HEADER ANNONCE */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span style={{
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--accent-primary)', fontSize: '12px', fontWeight: '800',
              padding: '4px 12px', borderRadius: '999px', border: '1px solid var(--border-color)'
            }}>
              {selectedListing.category}
            </span>
            {selectedListing.type === 'remote' ? (
              <span style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '800', padding: '4px 12px', borderRadius: '999px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Globe size={13} color="var(--accent-primary)" /> {t('remoteFormat') || 'À distance'}
              </span>
            ) : (
              <span style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '800', padding: '4px 12px', borderRadius: '999px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={13} color="var(--accent-primary)" /> {selectedListing.location}
              </span>
            )}
            {selectedListing.urgent && (
              <span style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)', fontSize: '12px', fontWeight: '900', padding: '4px 12px', borderRadius: '999px', border: '1.5px solid var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🚨 {t('urgentOption') || 'URGENT'}
              </span>
            )}
            {selectedListing.isBoosted && (
              <span className="sponsored-badge" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-warning)', fontSize: '12px', fontWeight: '800', padding: '4px 12px', borderRadius: '999px', border: '1px solid var(--accent-warning)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Flame size={13} /> Sponsoring Premium
              </span>
            )}
          </div>

          <h2 className="font-editorial-heading" style={{ margin: '0 0 6px', fontSize: '28px', fontWeight: '600', color: 'var(--text-main)', lineHeight: 1.25 }}>
            {displayContent.title}
          </h2>
          {currentLang !== nativeLang && (
            <button
              onClick={(e) => toggleOriginalListing(selectedListing.id, e)}
              style={{
                border: 'none',
                background: 'none',
                backgroundColor: 'transparent',
                boxShadow: 'none',
                outline: 'none',
                color: 'var(--accent-primary)',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 0 10px 0'
              }}
            >
              <Globe size={13} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
              <span>{isDetailShowingOriginal ? t('showTranslation') : t('showOriginal')}</span>
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            <span style={{ fontWeight: '800', color: 'var(--accent-primary)', fontSize: '18px' }}>
              {formatCompensation ? formatCompensation(selectedListing.compensation) : selectedListing.compensation}
            </span>
            {selectedListing.rating && selectedListing.reviews > 0 ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-warning)', fontWeight: '800' }}>
                <Star size={16} fill="var(--accent-warning)" color="var(--accent-warning)" /> {selectedListing.rating} ({selectedListing.reviews} avis)
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>
                Nouveau membre (0 avis)
              </span>
            )}
          </div>
        </div>

        {/* MÉDIAS (IMAGE / GALERIE / VIDÉO) */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <button
              onClick={() => setDetailMediaTab('image')}
              className="premium-button"
              style={{
                border: 'none', borderRadius: '12px', padding: '8px 16px', fontSize: '12px', fontWeight: '800', cursor: 'pointer',
                backgroundColor: detailMediaTab === 'image' ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                color: detailMediaTab === 'image' ? '#FFF' : 'var(--text-secondary)',
                boxShadow: detailMediaTab === 'image' ? 'var(--shadow-accent)' : 'none'
              }}
            >
              🖼️ Photos ({gallery.length})
            </button>
            {selectedListing.video && (
              <button
                onClick={() => setDetailMediaTab('video')}
                className="premium-button"
                style={{
                  border: 'none', borderRadius: '12px', padding: '8px 16px', fontSize: '12px', fontWeight: '800', cursor: 'pointer',
                  backgroundColor: detailMediaTab === 'video' ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                  color: detailMediaTab === 'video' ? '#FFF' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', gap: '4px',
                  boxShadow: detailMediaTab === 'video' ? 'var(--shadow-accent)' : 'none'
                }}
              >
                <Video size={14} /> Démo Vidéo
              </button>
            )}
          </div>

          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ borderRadius: '20px', overflow: 'hidden', height: '340px', backgroundColor: 'var(--bg-subtle)', position: 'relative', touchAction: 'pan-y', border: '1px solid var(--border-color)' }}
          >
            {detailMediaTab === 'video' && (selectedListing.video || selectedListing.videoUrl || media.video) ? (
              <video
                ref={detailVideoRef}
                src={selectedListing.video || selectedListing.videoUrl || media.video}
                controls
                autoPlay
                onLoadedMetadata={() => {
                  const start = Number(selectedListing.videoTrimStart || selectedListing.videoMetadata?.trimStart || 0);
                  if (detailVideoRef.current && start > 0) {
                    detailVideoRef.current.currentTime = start;
                  }
                }}
                onTimeUpdate={() => {
                  const end = Number(selectedListing.videoTrimEnd || selectedListing.videoMetadata?.trimEnd || 0);
                  const start = Number(selectedListing.videoTrimStart || selectedListing.videoMetadata?.trimStart || 0);
                  if (detailVideoRef.current && end > 0 && detailVideoRef.current.currentTime >= end) {
                    detailVideoRef.current.currentTime = start;
                    detailVideoRef.current.play().catch(() => {});
                  }
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: (selectedListing.cropRatio === '9:16' || selectedListing.cropRatio === '1:1') ? 'cover' : 'contain'
                }}
              />
            ) : (
              <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                {gallery.map((imgSrc, idx) => {
                  const isActive = idx === selectedImageIndex;
                  return (
                    <div
                      key={idx}
                      style={{
                        position: 'absolute', inset: 0, width: '100%', height: '100%',
                        opacity: isActive ? 1 : 0,
                        transform: isActive ? 'scale(1)' : 'scale(1.04)',
                        transition: 'opacity 0.4s var(--ease-quiet), transform 0.4s var(--ease-quiet)',
                        pointerEvents: isActive ? 'auto' : 'none'
                      }}
                    >
                      <img
                        src={imgSrc}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  );
                })}

                {gallery.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(prev => (prev - 1 + gallery.length) % gallery.length); }}
                      style={{
                        position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                        width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                        backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
                        color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', zIndex: 10
                      }}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(prev => (prev + 1) % gallery.length); }}
                      style={{
                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                        width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                        backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
                        color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', zIndex: 10
                      }}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}

                <div
                  style={{
                    position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
                    display: 'flex', alignItems: 'center', gap: '6px', zIndex: 10,
                    backgroundColor: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: '999px',
                    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', pointerEvents: 'auto'
                  }}
                >
                  {gallery.map((_, idx) => (
                    <div
                      key={idx}
                      onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(idx); }}
                      style={{
                        width: selectedImageIndex === idx ? '18px' : '6px',
                        height: '6px',
                        borderRadius: '999px',
                        backgroundColor: selectedImageIndex === idx ? 'var(--accent-primary)' : 'rgba(255,255,255,0.6)',
                        cursor: 'pointer',
                        transition: 'all 0.25s var(--ease-quiet)'
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {detailMediaTab === 'image' && gallery.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
              {gallery.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  style={{
                    border: selectedImageIndex === idx ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    borderRadius: '12px', overflow: 'hidden', width: '64px', height: '64px', padding: 0, cursor: 'pointer', flexShrink: 0
                  }}
                >
                  <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* DESCRIPTION ET TAGS */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>
            {t('description') || 'Description'}
          </h4>
          <p style={{ margin: '0 0 16px', fontSize: '14.5px', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
            {displayContent.description}
          </p>

          {selectedListing.tags && selectedListing.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {selectedListing.tags.map((tag, i) => (
                <span key={i} style={{ fontSize: '12px', fontWeight: '700', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)', padding: '4px 12px', borderRadius: '999px', border: '1px solid var(--border-color)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Tag size={12} color="var(--accent-primary)" /> {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* PROFIL DE L'AUTEUR */}
        {selectedListing.authorProfile && (
          <div style={{
            padding: '16px', borderRadius: '18px',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-color)',
            marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <img src={selectedListing.authorProfile.avatar} alt={selectedListing.author} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', fontSize: '15px', color: 'var(--text-main)' }}>
                  {selectedListing.author}
                  <ShieldCheck size={16} color="var(--accent-primary)" />
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {selectedListing.authorProfile.bio}
                </div>
              </div>
            </div>

            {/* AVIS DÉTAILLÉS DE L'AUTEUR */}
            {selectedListing.authorProfile.reviews && selectedListing.authorProfile.reviews.length > 0 ? (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '6px' }}>Avis récents :</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedListing.authorProfile.reviews.map((rev, i) => (
                    <div key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '8px 12px', backgroundColor: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <span style={{ color: 'var(--accent-warning)', marginRight: '6px' }}>{'⭐'.repeat(rev.rating)}</span>
                      « {rev.text} »
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', fontSize: '11.5px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                🤝 Nouveau membre • Aucun avis pour le moment (0 transaction clôturée)
              </div>
            )}
          </div>
        )}

        {/* ACTIONS */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {handleViewOnMap && (
            <button
              type="button"
              onClick={() => {
                if (typeof handleViewOnMap === 'function') handleViewOnMap(selectedListing);
                onClose?.();
              }}
              className="premium-button"
              style={{
                border: '1.5px solid var(--border-color)',
                borderRadius: '999px',
                padding: '13px 18px',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontWeight: '800',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
                boxShadow: 'var(--shadow-card)',
              }}
              title="Centrer la carte interactive sur cette annonce"
            >
              <MapPin size={16} color="var(--accent-primary)" />
              <span>{typeof t === 'function' ? (t('viewOnMap') || 'Voir sur la carte') : 'Voir sur la carte'}</span>
            </button>
          )}

          {!isOwner ? (
            <button
              onClick={() => { if (typeof handleStartDiscussion === 'function') handleStartDiscussion(selectedListing); }}
              className="premium-button"
              style={{
                flex: 1, minWidth: '180px', border: 'none', borderRadius: '999px', padding: '14px 24px',
                background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)', color: '#FFF',
                fontWeight: '800', fontSize: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: 'var(--shadow-accent)'
              }}
            >
              <MessageSquare size={18} /> {typeof t === 'function' ? (t('startDiscussion') || 'Contacter le membre') : 'Contacter le membre'}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '220px', flexWrap: 'wrap' }}>
              <button
                onClick={() => { if (typeof handleBoostListing === 'function') handleBoostListing(selectedListing); }}
                className="premium-button"
                style={{ flex: 1, border: 'none', borderRadius: '999px', padding: '12px', backgroundColor: 'var(--accent-warning)', color: '#FFF', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: 'var(--shadow-card)' }}
              >
                <Flame size={16} /> Booster (2,99€)
              </button>
              <button
                onClick={() => { if (typeof handleStartEditListing === 'function') handleStartEditListing(selectedListing); }}
                className="premium-button"
                style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: '999px', padding: '12px', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Pencil size={16} /> Éditer
              </button>
              <button
                onClick={() => { if (typeof handleTogglePauseListing === 'function') handleTogglePauseListing(selectedListing.id); }}
                className="premium-button"
                style={{ border: '1px solid var(--border-color)', borderRadius: '999px', padding: '12px 16px', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}
              >
                {selectedListing.status === 'paused' ? 'Reprendre' : 'Pauser'}
              </button>
              <button
                onClick={() => { if (typeof handleDeleteListing === 'function') handleDeleteListing(selectedListing.id); onClose?.(); }}
                className="premium-button"
                style={{ border: '1px solid var(--accent-danger)', borderRadius: '999px', padding: '12px 16px', backgroundColor: 'var(--accent-danger)', color: '#FFF', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

