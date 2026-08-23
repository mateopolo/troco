import React, { useState, useEffect, useRef } from 'react';
import { Video, MapPin, Tag, ArrowRight, Globe, ChevronLeft, ChevronRight } from 'lucide-react';
import { getSuggestedMedia as defaultGetSuggestedMedia, getFallbackImage as defaultGetFallbackImage } from '../utils/mediaUtils';
import { localizeLocation as defaultLocalizeLocation, localizeTags as defaultLocalizeTags } from '../locales/translations';
import { getAuthorAvatar as defaultGetAuthorAvatar } from '../data/mockData';
import { useScrollReveal } from '../utils/useScrollReveal';

const defaultGenerateTags = (title = '', description = '') => ['Échange', 'Service'];
const defaultFormatCompensation = (comp) => comp || '';
const defaultGetListingDisplayContent = (item, targetLang, forceOriginal = false) => {
  if (!item) return { title: '', description: '' };
  const nativeLang = item.nativeLang || 'FR';
  if (forceOriginal) return { title: item.title, description: item.description || '' };
  if (item.translations && item.translations[targetLang] && item.translations[targetLang].title) return item.translations[targetLang];
  if (targetLang === nativeLang) return { title: item.title, description: item.description || '' };
  if (item.translations && item.translations['EN'] && item.translations['EN'].title) return item.translations['EN'];
  return { title: item.title, description: item.description || '' };
};

export default function ListingCard({
  item,
  darkMode = false,
  hoveredCardId,
  setHoveredCardId = () => {},
  hoverSlideIndex = 0,
  showingOriginalListings = {},
  toggleOriginalListing = () => {},
  handleOpenListing = () => {},
  handleStartDiscussion = () => {},
  profile = { name: 'MATEO POLO', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80' },
  currentLang = 'FR',
  t = (key) => key,
  getSuggestedMedia = defaultGetSuggestedMedia,
  getFallbackImage = defaultGetFallbackImage,
  formatCompensation = defaultFormatCompensation,
  getListingDisplayContent = defaultGetListingDisplayContent,
  localizeLocation = defaultLocalizeLocation,
  localizeTags = defaultLocalizeTags,
  generateTags = defaultGenerateTags,
  getAuthorAvatar = defaultGetAuthorAvatar,
}) {
  const [localImageIndex, setLocalImageIndex] = useState(0);
  const touchStartRef = useRef(null);
  const touchDeltaXRef = useRef(0);
  const touchDeltaYRef = useRef(0);
  const isSwipingRef = useRef(false);

  // Hook Scroll Reveal natif
  const revealRef = useScrollReveal({ threshold: 0.08 });

  if (!item) return null;

  const safeGetSuggestedMedia = getSuggestedMedia || defaultGetSuggestedMedia;
  const safeGetFallbackImage = getFallbackImage || defaultGetFallbackImage;
  const safeFormatCompensation = formatCompensation || defaultFormatCompensation;
  const safeGetListingDisplayContent = getListingDisplayContent || defaultGetListingDisplayContent;
  const safeLocalizeLocation = localizeLocation || defaultLocalizeLocation;
  const safeLocalizeTags = localizeTags || defaultLocalizeTags;
  const safeGenerateTags = generateTags || defaultGenerateTags;
  const safeGetAuthorAvatar = getAuthorAvatar || defaultGetAuthorAvatar;
  const safeProfile = profile || { name: 'MATEO POLO', avatar: '' };

  const media = safeGetSuggestedMedia(item.title, item.description || '', item.image, item.video);
  const effectiveGallery = (item.gallery && item.gallery.length > 0) ? item.gallery : (media.gallery || [media.image || safeGetFallbackImage(item.category, item.title)]);
  const isHovered = hoveredCardId === item.id;
  const galleryLength = effectiveGallery.length || 1;

  // Défilement automatique au survol desktop toutes les 1 500 ms
  useEffect(() => {
    if (!isHovered || galleryLength <= 1) return;
    const interval = setInterval(() => {
      setLocalImageIndex(prev => (prev + 1) % galleryLength);
    }, 1500);
    return () => clearInterval(interval);
  }, [isHovered, galleryLength]);

  const currentSlideIndex = localImageIndex % galleryLength;
  const displayContent = safeGetListingDisplayContent(item, currentLang, !!showingOriginalListings[item.id]);

  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    if (setHoveredCardId) setHoveredCardId(item.id);
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    touchDeltaXRef.current = 0;
    touchDeltaYRef.current = 0;
    isSwipingRef.current = false;
  };

  const handleTouchMove = (e) => {
    if (!touchStartRef.current || !e.touches || e.touches.length === 0) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = touchStartRef.current.x - currentX;
    const deltaY = touchStartRef.current.y - currentY;

    touchDeltaXRef.current = deltaX;
    touchDeltaYRef.current = deltaY;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 12) {
      isSwipingRef.current = true;
    }
  };

  const handleTouchEnd = () => {
    const deltaX = touchDeltaXRef.current;
    if (isSwipingRef.current && Math.abs(deltaX) > 22 && galleryLength > 1) {
      if (deltaX > 0) {
        setLocalImageIndex(prev => (prev + 1) % galleryLength);
      } else {
        setLocalImageIndex(prev => (prev - 1 + galleryLength) % galleryLength);
      }
    }
    touchStartRef.current = null;
    touchDeltaXRef.current = 0;
    touchDeltaYRef.current = 0;
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
      ref={revealRef}
      onClick={() => handleOpenListing(item)}
      onMouseEnter={() => setHoveredCardId(item.id)}
      onMouseLeave={() => setHoveredCardId(null)}
      className="premium-card reveal-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: darkMode ? '#231E1B' : '#FAF7F2',
        border: item.isBoosted ? '2px solid #D97706' : (darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3'),
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: item.isBoosted ? '0 12px 34px rgba(217,119,6,0.2)' : (darkMode ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(61,53,48,0.06)'),
        cursor: 'pointer',
        transform: isHovered ? 'translateY(-5px) scale(1.015)' : 'none',
        transition: 'transform 0.4s var(--ease-quiet), box-shadow 0.4s var(--ease-quiet)'
      }}
    >
      <div
        onClick={handleCardImageClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ position: 'relative', height: '200px', width: '100%', backgroundColor: '#1A1715', overflow: 'hidden', touchAction: 'pan-y' }}
      >
        {/* SUPERPOSITION DES IMAGES DE LA GALERIE AVEC CROSSFADE & ZOOM SUBTIL */}
        {effectiveGallery.map((imgSrc, idx) => {
          const isActive = idx === currentSlideIndex;
          return (
            <img
              key={idx}
              src={imgSrc}
              alt={item.title}
              draggable={false}
              onError={(e) => { e.target.src = safeGetFallbackImage(item.category, item.title); }}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: isActive ? 1 : 0,
                transition: 'opacity 0.4s ease, transform 1200ms var(--ease-quiet)',
                transform: isHovered && isActive ? 'scale(1.04)' : (isActive ? 'scale(1)' : 'scale(1.02)'),
                pointerEvents: 'none',
                WebkitUserDrag: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                zIndex: isActive ? 2 : 1
              }}
            />
          );
        })}

        {/* VOILE DE CONTRASTE PROGRESSIF */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(26, 23, 21, 0.45) 0%, rgba(26, 23, 21, 0) 50%)',
          pointerEvents: 'none',
          zIndex: 3
        }} />

        {/* FLÈCHES DE NAVIGATION MANUELLE AVEC CLIC DIRECT */}
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
                backgroundColor: 'rgba(26,23,21,0.75)', color: '#FAF7F2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', zIndex: 10, backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                pointerEvents: 'auto',
                transition: 'transform 0.2s var(--ease-quiet), background-color 0.2s ease'
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
                backgroundColor: 'rgba(26,23,21,0.75)', color: '#FAF7F2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', zIndex: 10, backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                pointerEvents: 'auto',
                transition: 'transform 0.2s var(--ease-quiet), background-color 0.2s ease'
              }}
              title="Photo suivante"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}

        {/* PUCES INDICATRICES DE DÉFILEMENT */}
        {galleryLength > 1 && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)',
              display: 'flex', alignItems: 'center', gap: '4px', zIndex: 10,
              backgroundColor: 'rgba(26,23,21,0.65)', padding: '3px 8px', borderRadius: '999px',
              backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', pointerEvents: 'auto'
            }}
          >
            {effectiveGallery.map((_, idx) => (
              <div
                key={idx}
                onClick={(e) => { e.stopPropagation(); setLocalImageIndex(idx); }}
                style={{
                  width: currentSlideIndex === idx ? '14px' : '5px',
                  height: '5px',
                  borderRadius: '999px',
                  backgroundColor: currentSlideIndex === idx ? '#C67D5B' : 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  transition: 'all 0.25s var(--ease-quiet)'
                }}
              />
            ))}
          </div>
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
              opacity: isHovered && currentSlideIndex === 0 ? 1 : 0,
              transition: 'opacity 0.4s ease',
              pointerEvents: 'none',
              zIndex: 2
            }}
          />
        )}

        {item.isBoosted && (
          <span className="sponsored-badge" style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: '#D97706', color: '#FFF', fontSize: '11px', fontWeight: '800', padding: '5px 10px', borderRadius: '999px', boxShadow: '0 4px 14px rgba(217,119,6,0.4)', zIndex: 4 }}>
            🔥 Sponsorisé
          </span>
        )}
        {item.urgent && (
          <span style={{ position: 'absolute', top: '12px', left: '12px', backgroundColor: '#2A1A14', color: '#FAF7F2', border: '1.5px solid #C67D5B', fontSize: '10px', fontWeight: '800', padding: '4px 10px', borderRadius: '999px', boxShadow: '0 4px 14px rgba(0,0,0,0.4)', zIndex: 4 }}>
            URGENT
          </span>
        )}
        {(item.isDemo || (typeof item.id === 'number' && item.id <= 20)) && (
          <span style={{
            position: 'absolute',
            top: item.urgent ? '42px' : '12px',
            left: '12px',
            backgroundColor: darkMode ? '#1A1715' : '#F5EAE4',
            color: darkMode ? '#FAF7F2' : '#A8644A',
            border: '1px solid #E8DDD3',
            fontSize: '9.5px',
            fontWeight: '800',
            padding: '4px 10px',
            borderRadius: '999px',
            boxShadow: '0 4px 12px rgba(61,53,48,0.15)',
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
          <span style={{ position: 'absolute', bottom: '12px', left: '12px', backgroundColor: 'rgba(26,23,21,0.85)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', color: '#C67D5B', fontSize: '10px', fontWeight: '800', padding: '5px 9px', borderRadius: '10px', zIndex: 4, display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.3s ease' }}>
            <Video size={12} color="#C67D5B" /> {isHovered ? (t('livePlayback') || 'Lecture') : (t('demoVideo') || 'Vidéo')}
          </span>
        )}

        <span style={{ position: 'absolute', bottom: '12px', right: '12px', backgroundColor: 'rgba(26,23,21,0.92)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', border: '1px solid rgba(232,221,211,0.2)', color: '#FAF7F2', fontSize: '11px', fontWeight: '800', padding: '5px 10px', borderRadius: '999px', zIndex: 4 }}>
          {safeFormatCompensation(item.compensation)}
        </span>
      </div>

      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        <div>
          <div>
            <h3 className="font-sans" style={{ fontSize: '15.5px', fontWeight: '800', color: darkMode ? '#FAF7F2' : '#1A1512', margin: '0 0 4px 0', lineHeight: 1.35, letterSpacing: '-0.02em' }}>
              {displayContent.title}
            </h3>
            {currentLang !== (item.nativeLang || 'FR') && (
              <button
                onClick={(e) => toggleOriginalListing(item.id, e)}
                className="premium-button"
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#C67D5B',
                  fontSize: '11px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 0 6px 0'
                }}
              >
                <Globe size={12} color="#C67D5B" />
                {showingOriginalListings[item.id] ? t('showTranslation') : t('showOriginal')}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: darkMode ? '#D4C5B5' : '#6B5E54', marginBottom: '8px' }}>
            <span className="font-editorial" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontStyle: 'italic', fontSize: '14px' }}>
              {item.type === 'remote' ? <Video size={13} color="#C67D5B" /> : <MapPin size={13} color="#C67D5B" />}
              {safeLocalizeLocation(item.location, currentLang)}
            </span>
          </div>

          {/* APERÇU ANIMÉ AU SURVOL */}
          {displayContent.description && (
            <div
              style={{
                fontSize: '11.5px',
                color: darkMode ? '#D4C5B5' : '#544940',
                lineHeight: 1.45,
                maxHeight: isHovered ? '48px' : '22px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: isHovered ? 2 : 1,
                WebkitBoxOrient: 'vertical',
                marginBottom: '10px',
                transition: 'max-height 0.3s var(--ease-quiet), color 0.3s ease'
              }}
            >
              {displayContent.description}
            </div>
          )}

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {safeLocalizeTags((item.tags || safeGenerateTags(item.title, item.description || '')), currentLang).slice(0, 3).map(tag => (
              <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: darkMode ? '#1A1715' : '#F5EAE4', color: darkMode ? '#FAF7F2' : '#A8644A', borderRadius: '999px', border: '1px solid #E8DDD3', padding: '4px 10px', fontSize: '10px', fontWeight: '800' }}>
                <Tag size={10} color="#C67D5B" /> {tag}
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: '800', fontSize: '13px', color: darkMode ? '#FAF7F2' : '#1A1512' }}>
            <img src={item.author === safeProfile.name ? safeProfile.avatar : safeGetAuthorAvatar(item.author)} alt={item.author} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #C67D5B' }} />
            {item.author}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {item.author !== safeProfile.name ? (
              <button onClick={(event) => { event.stopPropagation(); handleStartDiscussion(item); }} className="premium-button" style={{ background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '999px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 4px 14px rgba(198,125,91,0.25)' }}>{t('proposeDealButton')} <ArrowRight size={12} /></button>
            ) : (
              <span style={{ backgroundColor: darkMode ? '#1A1715' : '#F5F0E8', color: darkMode ? '#D4C5B5' : '#6B5E54', border: '1px solid #E8DDD3', padding: '6px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '700' }}>{t('authorAnnc')}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
