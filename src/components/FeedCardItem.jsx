import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Video, Globe, MapPin, Tag, Trash2, ArrowRight } from 'lucide-react';

export default function FeedCardItem({
  item,
  darkMode,
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
  isAdmin = false,
  onAdminDeleteListing = null,
  onOpenMobileActions = null,
  t = (key) => key
}) {
  const [localImageIndex, setLocalImageIndex] = useState(0);
  const touchStartRef = useRef(null);
  const touchDeltaXRef = useRef(0);
  const isSwipingRef = useRef(false);
  const longPressTimerRef = useRef(null);

  const media = getSuggestedMedia(item.title, item.description || '', item.image, item.video);
  const isHovered = hoveredCardId === item.id;
  const gallery = media.gallery && media.gallery.length > 0 ? media.gallery : [media.image];
  const galleryLength = gallery.length;
  const currentSlideIndex = isHovered && media.gallery?.[hoverSlideIndex] !== undefined
    ? hoverSlideIndex
    : localImageIndex;
  const displayContent = getListingDisplayContent(item, currentLang, !!showingOriginalListings[item.id]);

  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    touchDeltaXRef.current = 0;
    isSwipingRef.current = false;

    // Détection d'un appui long (long-press tactile ~500ms) pour l'auteur de l'annonce
    if (item.author === profile?.name && onOpenMobileActions) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => {
        if (!isSwipingRef.current && onOpenMobileActions) {
          if (navigator.vibrate) navigator.vibrate(50);
          onOpenMobileActions(item);
        }
      }, 500);
    }
  };

  const handleTouchMove = (e) => {
    if (!touchStartRef.current || !e.touches || e.touches.length === 0) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = touchStartRef.current.x - currentX;
    const deltaY = touchStartRef.current.y - currentY;

    touchDeltaXRef.current = deltaX;
    if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    }
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 12) {
      isSwipingRef.current = true;
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    const deltaX = touchDeltaXRef.current;
    if (isSwipingRef.current && Math.abs(deltaX) > 20 && galleryLength > 1) {
      if (deltaX > 0) {
        setLocalImageIndex(prev => (prev + 1) % galleryLength);
      } else {
        setLocalImageIndex(prev => (prev - 1 + galleryLength) % galleryLength);
      }
    }
    touchStartRef.current = null;
    touchDeltaXRef.current = 0;
  };

  const handleCardImageClick = (e) => {
    if (isSwipingRef.current) {
      e.preventDefault();
      e.stopPropagation();
      isSwipingRef.current = false;
      return;
    }
    handleOpenListing(item);
  };

  return (
    <div
      onMouseEnter={() => setHoveredCardId(item.id)}
      onMouseLeave={() => setHoveredCardId(null)}
      className="premium-card"
      style={{
        backgroundColor: darkMode ? 'rgba(30,41,59,0.85)' : '#FFFFFF',
        border: item.isBoosted ? '2px solid #F59E0B' : (darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(229,231,235,0.9)'),
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: item.isBoosted ? '0 12px 34px rgba(245,158,11,0.14)' : '0 2px 14px rgba(15, 23, 42, 0.05)',
        cursor: 'pointer',
        transform: isHovered ? 'translateY(-4px) scale(1.02)' : 'none',
        transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease'
      }}
    >
      <div
        onClick={handleCardImageClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ position: 'relative', height: '200px', width: '100%', backgroundColor: '#F3F4F6', overflow: 'hidden', touchAction: 'pan-y' }}
      >
        {gallery.map((imgSrc, idx) => {
          const isActive = idx === currentSlideIndex;
          return (
            <img
              key={idx}
              src={imgSrc}
              alt={item.title}
              draggable={false}
              onError={(e) => { e.target.src = getFallbackImage(item.category, item.title); }}
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

        {galleryLength > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLocalImageIndex(prev => (prev - 1 + galleryLength) % galleryLength);
              }}
              style={{
                position: 'absolute', top: '50%', left: '8px', transform: 'translateY(-50%)',
                border: 'none', borderRadius: '50%', width: '28px', height: '28px',
                backgroundColor: 'rgba(15,23,42,0.6)', color: '#FFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', zIndex: 5, backdropFilter: 'blur(4px)'
              }}
              title="Photo précédente"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLocalImageIndex(prev => (prev + 1) % galleryLength);
              }}
              style={{
                position: 'absolute', top: '50%', right: '8px', transform: 'translateY(-50%)',
                border: 'none', borderRadius: '50%', width: '28px', height: '28px',
                backgroundColor: 'rgba(15,23,42,0.6)', color: '#FFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', zIndex: 5, backdropFilter: 'blur(4px)'
              }}
              title="Photo suivante"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}

        {media.video && (
          <video
            src={media.video}
            poster={media.image}
            autoPlay
            loop
            muted
            playsInline
            onError={(e) => { e.target.style.display = 'none'; }}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: isHovered && hoverSlideIndex === 0 ? 1 : 0,
              transition: 'opacity 0.4s ease',
              pointerEvents: 'none',
              zIndex: 2
            }}
          />
        )}

        {item.isBoosted && (
          <span className="sponsored-badge" style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: '#F59E0B', color: '#FFF', fontSize: '11px', fontWeight: '800', padding: '6px 10px', borderRadius: '10px', boxShadow: '0 6px 16px rgba(245,158,11,0.45)', zIndex: 4 }}>
            🔥 Sponsorisé
          </span>
        )}
        {item.urgent && (
          <span style={{ position: 'absolute', top: '12px', left: '12px', backgroundColor: 'rgba(239,68,68,0.95)', color: '#FFF', fontSize: '10px', fontWeight: '800', padding: '5px 9px', borderRadius: '10px', boxShadow: '0 6px 16px rgba(239,68,68,0.35)', zIndex: 4 }}>
            URGENT
          </span>
        )}
        {(item.isDemo || (typeof item.id === 'number' && item.id <= 20)) && (
          <span style={{
            position: 'absolute',
            top: item.urgent ? '42px' : '12px',
            left: '12px',
            backgroundColor: darkMode ? 'rgba(126,34,206,0.9)' : '#7E22CE',
            color: '#FFF',
            fontSize: '9.5px',
            fontWeight: '800',
            padding: '4px 8px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(126,34,206,0.35)',
            zIndex: 4,
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            backdropFilter: 'blur(4px)'
          }}>
            🤖 Annonce IA
          </span>
        )}

        {media.video && (
          <span style={{ position: 'absolute', bottom: '12px', left: '12px', backgroundColor: isHovered ? '#04265A' : 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', color: '#60A5FA', fontSize: '10px', fontWeight: '800', padding: '5px 9px', borderRadius: '10px', zIndex: 4, display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.3s ease' }}>
            <Video size={12} /> {isHovered ? (t('livePlayback') || 'Lecture') : (t('demoVideo') || 'Vidéo')}
          </span>
        )}

        {galleryLength > 1 && (
          <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '4px', zIndex: 4 }}>
            {gallery.map((_, idx) => (
              <div key={idx} style={{ width: currentSlideIndex === idx ? '14px' : '6px', height: '6px', borderRadius: '999px', backgroundColor: currentSlideIndex === idx ? '#FFF' : 'rgba(255,255,255,0.5)', transition: 'all 0.3s ease' }} />
            ))}
          </div>
        )}

        <span style={{ position: 'absolute', bottom: '12px', right: '12px', backgroundColor: 'rgba(4,38,90,0.95)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', color: '#FFF', fontSize: '11px', fontWeight: 'bold', padding: '5px 9px', borderRadius: '10px', zIndex: 4 }}>
          {formatCompensation(item.compensation)}
        </span>
      </div>
      <div style={{ padding: '16px 18px' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: darkMode ? '#FFFFFF' : '#111827', margin: '0 0 4px 0', lineHeight: 1.35 }}>
            {displayContent.title}
          </h3>
          {currentLang !== (item.nativeLang || 'FR') && (
            <button
              onClick={(e) => toggleOriginalListing(item.id, e)}
              className="premium-button"
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                color: darkMode ? '#60A5FA' : '#04265A',
                fontSize: '11px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 0 6px 0'
              }}
            >
              <Globe size={12} />
              {showingOriginalListings[item.id] ? t('showTranslation') : t('showOriginal')}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: darkMode ? '#CBD5E1' : '#6B7280', marginBottom: '10px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {item.type === 'remote' ? <Video size={13} color={darkMode ? '#60A5FA' : '#04265A'} /> : <MapPin size={13} color={darkMode ? '#60A5FA' : '#04265A'} />}
            {localizeLocation(item.location, currentLang)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {localizeTags((item.tags || generateTags(item.title, item.description || '')), currentLang).slice(0, 3).map(tag => (
            <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: darkMode ? 'rgba(4,38,90,0.45)' : '#EFF6FF', color: darkMode ? '#93C5FD' : '#04265A', borderRadius: '999px', padding: '4px 10px', fontSize: '10px', fontWeight: '800' }}>
              <Tag size={10} /> {tag}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #F3F4F6', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: '600', fontSize: '13px', color: darkMode ? '#F8FAFC' : '#374151' }}>
            <img src={item.author === profile.name ? profile.avatar : getAuthorAvatar(item.author)} alt={item.author} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', border: darkMode ? '1px solid #60A5FA' : '1px solid #E2E8F0' }} />
            {item.author}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isAdmin && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`[ADMINISTRATEUR]\nVoulez-vous supprimer définitivement l'annonce "${item.title}" ?`)) {
                    if (onAdminDeleteListing) onAdminDeleteListing(item);
                  }
                }}
                className="premium-button"
                style={{
                  border: 'none',
                  borderRadius: '10px',
                  padding: '7px 10px',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 4px 10px rgba(239,68,68,0.25)'
                }}
                title="Supprimer immédiatement cette annonce (Admin)"
              >
                <Trash2 size={12} /> Modérer
              </button>
            )}
            {item.author !== profile.name ? (
              <button onClick={(event) => { event.stopPropagation(); handleStartDiscussion(item); }} className="premium-button" style={{ backgroundColor: '#04265A', color: '#FFF', border: 'none', padding: '8px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 6px 14px rgba(4,38,90,0.18)' }}>{t('proposeDealButton')} <ArrowRight size={12} /></button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ backgroundColor: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB', padding: '6px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '600' }}>{t('authorAnnc')}</span>
                {onOpenMobileActions && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onOpenMobileActions(item); }}
                    className="premium-button"
                    style={{
                      border: '1px solid #93C5FD',
                      backgroundColor: '#EFF6FF',
                      color: '#04265A',
                      padding: '6px 10px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Gérer ou supprimer cette annonce"
                  >
                    ⚙️ Gérer
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
