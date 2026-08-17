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
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', zIndex: 1000, overflowY: 'auto'
    }}>
      <div style={{
        backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderRadius: '28px', width: '100%', maxWidth: '780px',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.3)',
        border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.8)',
        position: 'relative', padding: '28px'
      }}>
        {/* BOUTON FERMER */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '18px', right: '18px',
            border: 'none', backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
            color: darkMode ? '#FFF' : '#374151', width: '36px', height: '36px',
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
              backgroundColor: darkMode ? 'rgba(96,165,250,0.2)' : '#EFF6FF',
              color: darkMode ? '#93C5FD' : '#04265A', fontSize: '12px', fontWeight: '800',
              padding: '4px 10px', borderRadius: '999px'
            }}>
              {selectedListing.category}
            </span>
            {selectedListing.type === 'remote' ? (
              <span style={{ backgroundColor: '#F0FDF4', color: '#166534', fontSize: '12px', fontWeight: '800', padding: '4px 10px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Globe size={13} /> {t('remoteFormat') || 'À distance'}
              </span>
            ) : (
              <span style={{ backgroundColor: '#FFFBEB', color: '#B45309', fontSize: '12px', fontWeight: '800', padding: '4px 10px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={13} /> {selectedListing.location}
              </span>
            )}
            {selectedListing.urgent && (
              <span style={{ backgroundColor: '#FEF2F2', color: '#DC2626', fontSize: '12px', fontWeight: '900', padding: '4px 10px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🚨 {t('urgentOption') || 'URGENT'}
              </span>
            )}
            {selectedListing.isBoosted && (
              <span className="sponsored-badge" style={{ backgroundColor: '#FEF3C7', color: '#D97706', fontSize: '12px', fontWeight: '800', padding: '4px 10px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Flame size={13} /> Sponsoring Premium
              </span>
            )}
          </div>

          <h2 style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: '800', color: darkMode ? '#FFF' : '#111827', lineHeight: 1.3 }}>
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
                color: darkMode ? '#60A5FA' : '#04265A',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 0 10px 0'
              }}
            >
              <Globe size={13} color={darkMode ? '#60A5FA' : '#04265A'} style={{ flexShrink: 0 }} />
              <span>{isDetailShowingOriginal ? t('showTranslation') : t('showOriginal')}</span>
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px', color: darkMode ? '#94A3B8' : '#64748B' }}>
            <span style={{ fontWeight: '800', color: darkMode ? '#34D399' : '#059669', fontSize: '16px' }}>
              {formatCompensation ? formatCompensation(selectedListing.compensation) : selectedListing.compensation}
            </span>
            {selectedListing.rating && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#F59E0B', fontWeight: '800' }}>
                <Star size={16} fill="#F59E0B" /> {selectedListing.rating} ({selectedListing.reviews || 0} avis)
              </span>
            )}
          </div>
        </div>

        {/* MÉDIAS (IMAGE / GALERIE / VIDÉO) */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <button
              onClick={() => setDetailMediaTab('image')}
              style={{
                border: 'none', borderRadius: '10px', padding: '6px 14px', fontSize: '12px', fontWeight: '800', cursor: 'pointer',
                backgroundColor: detailMediaTab === 'image' ? (darkMode ? '#60A5FA' : '#04265A') : (darkMode ? 'rgba(255,255,255,0.1)' : '#F1F5F9'),
                color: detailMediaTab === 'image' ? '#FFF' : (darkMode ? '#94A3B8' : '#64748B')
              }}
            >
              🖼️ Photos ({gallery.length})
            </button>
            {selectedListing.video && (
              <button
                onClick={() => setDetailMediaTab('video')}
                style={{
                  border: 'none', borderRadius: '10px', padding: '6px 14px', fontSize: '12px', fontWeight: '800', cursor: 'pointer',
                  backgroundColor: detailMediaTab === 'video' ? (darkMode ? '#60A5FA' : '#04265A') : (darkMode ? 'rgba(255,255,255,0.1)' : '#F1F5F9'),
                  color: detailMediaTab === 'video' ? '#FFF' : (darkMode ? '#94A3B8' : '#64748B'),
                  display: 'flex', alignItems: 'center', gap: '4px'
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
            style={{ borderRadius: '20px', overflow: 'hidden', height: '340px', backgroundColor: '#000', position: 'relative', touchAction: 'pan-y' }}
          >
            {detailMediaTab === 'video' && selectedListing.video ? (
              <video src={selectedListing.video} controls autoPlay style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                {gallery.map((imgSrc, idx) => {
                  const isActive = idx === selectedImageIndex;
                  return (
                    <img
                      key={idx}
                      src={imgSrc}
                      alt={selectedListing.title}
                      draggable={false}
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
            )}

            {detailMediaTab === 'image' && gallery.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex(prev => (prev - 1 + gallery.length) % gallery.length);
                  }}
                  className="premium-button"
                  style={{
                    position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)',
                    border: 'none', borderRadius: '50%', width: '38px', height: '38px',
                    backgroundColor: 'rgba(15,23,42,0.65)', color: '#FFF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', zIndex: 10, backdropFilter: 'blur(6px)'
                  }}
                  title="Photo précédente"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex(prev => (prev + 1) % gallery.length);
                  }}
                  className="premium-button"
                  style={{
                    position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)',
                    border: 'none', borderRadius: '50%', width: '38px', height: '38px',
                    backgroundColor: 'rgba(15,23,42,0.65)', color: '#FFF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', zIndex: 10, backdropFilter: 'blur(6px)'
                  }}
                  title="Photo suivante"
                >
                  <ChevronRight size={22} />
                </button>

                <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px', zIndex: 10 }}>
                  {gallery.map((_, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      style={{
                        width: selectedImageIndex === idx ? '16px' : '7px',
                        height: '7px',
                        borderRadius: '999px',
                        backgroundColor: selectedImageIndex === idx ? '#FFF' : 'rgba(255,255,255,0.5)',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {detailMediaTab === 'image' && gallery.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
              {gallery.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  style={{
                    border: selectedImageIndex === idx ? (darkMode ? '2px solid #60A5FA' : '2px solid #04265A') : 'none',
                    borderRadius: '10px', overflow: 'hidden', width: '64px', height: '64px', padding: 0, cursor: 'pointer', flexShrink: 0
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
          <h4 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: '800', color: darkMode ? '#FFF' : '#111827' }}>
            {t('description') || 'Description'}
          </h4>
          <p style={{ margin: '0 0 16px', fontSize: '14px', lineHeight: 1.7, color: darkMode ? '#CBD5E1' : '#475569' }}>
            {displayContent.description}
          </p>

          {selectedListing.tags && selectedListing.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {selectedListing.tags.map((tag, i) => (
                <span key={i} style={{ fontSize: '12px', fontWeight: '700', backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : '#F1F5F9', color: darkMode ? '#94A3B8' : '#64748B', padding: '4px 10px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Tag size={12} /> {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* PROFIL DE L'AUTEUR */}
        {selectedListing.authorProfile && (
          <div style={{
            padding: '16px', borderRadius: '18px',
            backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.6)' : '#F8FAFC',
            border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0',
            marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '14px'
          }}>
            <img src={selectedListing.authorProfile.avatar} alt={selectedListing.author} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', fontSize: '15px', color: darkMode ? '#FFF' : '#111827' }}>
                {selectedListing.author}
                <ShieldCheck size={16} color="#10B981" />
              </div>
              <div style={{ fontSize: '12px', color: darkMode ? '#94A3B8' : '#64748B', marginTop: '2px' }}>
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
                flex: 1, minWidth: '200px', border: 'none', borderRadius: '16px', padding: '14px',
                backgroundColor: darkMode ? '#60A5FA' : '#04265A', color: '#FFF',
                fontWeight: '800', fontSize: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: '0 10px 24px rgba(4,38,90,0.25)'
              }}
            >
              <MessageSquare size={18} /> {t('startDiscussion') || 'Contacter le membre'}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px', width: '100%', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleBoostListing(selectedListing)}
                style={{ flex: 1, border: 'none', borderRadius: '14px', padding: '12px', backgroundColor: '#F59E0B', color: '#FFF', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Flame size={16} /> Booster (2,99€)
              </button>
              <button
                onClick={() => handleStartEditListing(selectedListing)}
                style={{ flex: 1, border: '1px solid #CBD5E1', borderRadius: '14px', padding: '12px', backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#FFF', color: darkMode ? '#FFF' : '#334155', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Pencil size={16} /> Éditer
              </button>
              <button
                onClick={() => handleTogglePauseListing(selectedListing.id)}
                style={{ border: '1px solid #CBD5E1', borderRadius: '14px', padding: '12px 16px', backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#FFF', color: darkMode ? '#FFF' : '#334155', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}
              >
                {selectedListing.status === 'paused' ? 'Reprendre' : 'Pauser'}
              </button>
              <button
                onClick={() => { handleDeleteListing(selectedListing.id); onClose(); }}
                style={{ border: 'none', borderRadius: '14px', padding: '12px 16px', backgroundColor: '#FEF2F2', color: '#DC2626', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
