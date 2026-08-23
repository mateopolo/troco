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

  if (!selectedListing) return null;

  const isOwner = selectedListing.author === profile.name;
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
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(26, 23, 21, 0.75)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', zIndex: 1000, overflowY: 'auto'
    }}>
      <div style={{
        backgroundColor: darkMode ? '#231E1B' : '#FAF7F2',
        borderRadius: '28px', width: '100%', maxWidth: '780px',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: darkMode ? '0 30px 80px rgba(0, 0, 0, 0.6)' : '0 30px 80px rgba(61, 53, 48, 0.15)',
        border: darkMode ? '1px solid rgba(232, 221, 211, 0.15)' : '1px solid #E8DDD3',
        position: 'relative', padding: '28px'
      }}>
        {/* BOUTON FERMER */}
        <button
          onClick={onClose}
          className="premium-button"
          style={{
            position: 'absolute', top: '18px', right: '18px',
            border: darkMode ? '1px solid rgba(232, 221, 211, 0.15)' : '1px solid #E8DDD3',
            backgroundColor: darkMode ? '#1A1715' : '#F5F0E8',
            color: darkMode ? '#FAF7F2' : '#3D3530', width: '36px', height: '36px',
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
              backgroundColor: darkMode ? '#1A1715' : '#F5EAE4',
              color: darkMode ? '#FAF7F2' : '#A8644A', fontSize: '12px', fontWeight: '800',
              padding: '4px 12px', borderRadius: '999px', border: '1px solid #E8DDD3'
            }}>
              {selectedListing.category}
            </span>
            {selectedListing.type === 'remote' ? (
              <span style={{ backgroundColor: darkMode ? '#1A1715' : '#FAF7F2', color: darkMode ? '#D4C5B5' : '#6B5E54', fontSize: '12px', fontWeight: '800', padding: '4px 12px', borderRadius: '999px', border: '1px solid #E8DDD3', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Globe size={13} color="#C67D5B" /> {t('remoteFormat') || 'À distance'}
              </span>
            ) : (
              <span style={{ backgroundColor: darkMode ? '#1A1715' : '#FAF7F2', color: darkMode ? '#D4C5B5' : '#6B5E54', fontSize: '12px', fontWeight: '800', padding: '4px 12px', borderRadius: '999px', border: '1px solid #E8DDD3', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={13} color="#C67D5B" /> {selectedListing.location}
              </span>
            )}
            {selectedListing.urgent && (
              <span style={{ backgroundColor: darkMode ? '#2A1A14' : '#F5EAE4', color: darkMode ? '#FAF7F2' : '#A8644A', fontSize: '12px', fontWeight: '900', padding: '4px 12px', borderRadius: '999px', border: '1.5px solid #C67D5B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🚨 {t('urgentOption') || 'URGENT'}
              </span>
            )}
            {selectedListing.isBoosted && (
              <span className="sponsored-badge" style={{ backgroundColor: darkMode ? 'rgba(217,119,6,0.2)' : '#FEF3C7', color: darkMode ? '#FDE68A' : '#D97706', fontSize: '12px', fontWeight: '800', padding: '4px 12px', borderRadius: '999px', border: '1px solid #D97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Flame size={13} /> Sponsoring Premium
              </span>
            )}
          </div>

          <h2 className="font-editorial-heading" style={{ margin: '0 0 6px', fontSize: '28px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#1A1512', lineHeight: 1.25 }}>
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
                color: '#C67D5B',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 0 10px 0'
              }}
            >
              <Globe size={13} color="#C67D5B" style={{ flexShrink: 0 }} />
              <span>{isDetailShowingOriginal ? t('showTranslation') : t('showOriginal')}</span>
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>
            <span style={{ fontWeight: '800', color: '#C67D5B', fontSize: '18px' }}>
              {formatCompensation ? formatCompensation(selectedListing.compensation) : selectedListing.compensation}
            </span>
            {selectedListing.rating && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#D97706', fontWeight: '800' }}>
                <Star size={16} fill="#D97706" color="#D97706" /> {selectedListing.rating} ({selectedListing.reviews || 0} avis)
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
                backgroundColor: detailMediaTab === 'image' ? '#C67D5B' : (darkMode ? '#1A1715' : '#F5F0E8'),
                color: detailMediaTab === 'image' ? '#FFF' : (darkMode ? '#D4C5B5' : '#6B5E54'),
                boxShadow: detailMediaTab === 'image' ? '0 4px 12px rgba(198,125,91,0.25)' : 'none'
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
                  backgroundColor: detailMediaTab === 'video' ? '#C67D5B' : (darkMode ? '#1A1715' : '#F5F0E8'),
                  color: detailMediaTab === 'video' ? '#FFF' : (darkMode ? '#D4C5B5' : '#6B5E54'),
                  display: 'flex', alignItems: 'center', gap: '4px',
                  boxShadow: detailMediaTab === 'video' ? '0 4px 12px rgba(198,125,91,0.25)' : 'none'
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
            style={{ borderRadius: '20px', overflow: 'hidden', height: '340px', backgroundColor: '#1A1715', position: 'relative', touchAction: 'pan-y', border: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3' }}
          >
            {detailMediaTab === 'video' && selectedListing.video ? (
              <video src={selectedListing.video} controls autoPlay style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
                        backgroundColor: 'rgba(26,23,21,0.75)', backdropFilter: 'blur(8px)',
                        color: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                        backgroundColor: 'rgba(26,23,21,0.75)', backdropFilter: 'blur(8px)',
                        color: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                    backgroundColor: 'rgba(26,23,21,0.65)', padding: '4px 10px', borderRadius: '999px',
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
                        backgroundColor: selectedImageIndex === idx ? '#C67D5B' : 'rgba(255,255,255,0.6)',
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
                    border: selectedImageIndex === idx ? '2px solid #C67D5B' : '1px solid rgba(232,221,211,0.2)',
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
          <h4 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '800', color: darkMode ? '#FAF7F2' : '#1A1512' }}>
            {t('description') || 'Description'}
          </h4>
          <p style={{ margin: '0 0 16px', fontSize: '14.5px', lineHeight: 1.7, color: darkMode ? '#D4C5B5' : '#544940' }}>
            {displayContent.description}
          </p>

          {selectedListing.tags && selectedListing.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {selectedListing.tags.map((tag, i) => (
                <span key={i} style={{ fontSize: '12px', fontWeight: '700', backgroundColor: darkMode ? '#1A1715' : '#F5F0E8', color: darkMode ? '#D4C5B5' : '#6B5E54', padding: '4px 12px', borderRadius: '999px', border: '1px solid #E8DDD3', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Tag size={12} color="#C67D5B" /> {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* PROFIL DE L'AUTEUR */}
        {selectedListing.authorProfile && (
          <div style={{
            padding: '16px', borderRadius: '18px',
            backgroundColor: darkMode ? '#1A1715' : '#F5F0E8',
            border: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3',
            marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '14px'
          }}>
            <img src={selectedListing.authorProfile.avatar} alt={selectedListing.author} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #C67D5B' }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', fontSize: '15px', color: darkMode ? '#FAF7F2' : '#1A1512' }}>
                {selectedListing.author}
                <ShieldCheck size={16} color="#C67D5B" />
              </div>
              <div style={{ fontSize: '12px', color: darkMode ? '#D4C5B5' : '#6B5E54', marginTop: '2px' }}>
                {selectedListing.authorProfile.bio}
              </div>
            </div>
          </div>
        )}

        {/* ACTIONS */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {!isOwner ? (
            <button
              onClick={() => handleStartDiscussion(selectedListing)}
              className="premium-button"
              style={{
                flex: 1, minWidth: '200px', border: 'none', borderRadius: '999px', padding: '14px 24px',
                background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)', color: '#FFF',
                fontWeight: '800', fontSize: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: '0 8px 24px rgba(198,125,91,0.35)'
              }}
            >
              <MessageSquare size={18} /> {t('startDiscussion') || 'Contacter le membre'}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px', width: '100%', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleBoostListing(selectedListing)}
                className="premium-button"
                style={{ flex: 1, border: 'none', borderRadius: '999px', padding: '12px', backgroundColor: '#D97706', color: '#FFF', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 14px rgba(217,119,6,0.3)' }}
              >
                <Flame size={16} /> Booster (2,99€)
              </button>
              <button
                onClick={() => handleStartEditListing(selectedListing)}
                className="premium-button"
                style={{ flex: 1, border: '1px solid #E8DDD3', borderRadius: '999px', padding: '12px', backgroundColor: darkMode ? '#1A1715' : '#FAF7F2', color: darkMode ? '#FAF7F2' : '#3D3530', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Pencil size={16} /> Éditer
              </button>
              <button
                onClick={() => handleTogglePauseListing(selectedListing.id)}
                className="premium-button"
                style={{ border: '1px solid #E8DDD3', borderRadius: '999px', padding: '12px 16px', backgroundColor: darkMode ? '#1A1715' : '#FAF7F2', color: darkMode ? '#FAF7F2' : '#3D3530', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}
              >
                {selectedListing.status === 'paused' ? 'Reprendre' : 'Pauser'}
              </button>
              <button
                onClick={() => { handleDeleteListing(selectedListing.id); onClose(); }}
                className="premium-button"
                style={{ border: '1px solid rgba(232,221,211,0.25)', borderRadius: '999px', padding: '12px 16px', backgroundColor: '#2A1A14', color: '#FAF7F2', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
