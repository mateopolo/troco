import React, { useState, useRef } from 'react';
import { Video, MapPin, Tag, ArrowRight, Globe, ChevronLeft, ChevronRight } from 'lucide-react';
import { getSuggestedMedia as defaultGetSuggestedMedia, getFallbackImage as defaultGetFallbackImage } from '../utils/mediaUtils';
import { localizeLocation as defaultLocalizeLocation, localizeTags as defaultLocalizeTags } from '../locales/translations';
import { getAuthorAvatar as defaultGetAuthorAvatar } from '../data/mockData';

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

  const [localImageIndex, setLocalImageIndex] = useState(0);
  const touchStartRef = useRef(null);
  const touchDeltaXRef = useRef(0);
  const isSwipingRef = useRef(false);

  const media = safeGetSuggestedMedia(item.title, item.description || '', item.image, item.video);
  const isHovered = hoveredCardId === item.id;
  const galleryLength = media.gallery?.length || 1;
  const currentSlideIndex = isHovered && media.gallery?.[hoverSlideIndex] !== undefined
    ? hoverSlideIndex
    : localImageIndex;
  const activeImage = media.gallery?.[currentSlideIndex] || media.image;
  const displayContent = safeGetListingDisplayContent(item, currentLang, !!showingOriginalListings[item.id]);

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
    if (isSwipingRef.current && Math.abs(deltaX) > 20 && galleryLength > 1) {
      if (deltaX > 0) {
        // Swiped left -> next photo
        setLocalImageIndex(prev => (prev + 1) % galleryLength);
      } else {
        // Swiped right -> prev photo
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
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
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
        {/* SUPERPOSITION DES IMAGES DE LA GALERIE AVEC EFFET DE FONDU TRANSLUCIDE (CROSSFADE) */}
        {(media.gallery && media.gallery.length > 0 ? media.gallery : [media.image]).map((imgSrc, idx) => {
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

        {/* FLÈCHES TACTILES FLOTTANTES MANUELLES SUR MOBILE */}
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

        {/* COUCHE DE SURVOL : VIDÉO MP4 AVEC POSTER FIXE (SANS ÉCRAN NOIR) */}
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
        
        {item.isDemo && (
          <span style={{ position: 'absolute', top: item.urgent ? '40px' : '12px', left: '12px', backgroundColor: 'rgba(99,102,241,0.95)', color: '#FFF', fontSize: '10px', fontWeight: '800', padding: '5px 9px', borderRadius: '10px', boxShadow: '0 6px 16px rgba(99,102,241,0.35)', zIndex: 4 }}>
            Annonce de Démonstration (IA)
          </span>
        )}

        {media.video && (
          <span style={{ position: 'absolute', bottom: '12px', left: '12px', backgroundColor: isHovered ? '#04265A' : 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', color: '#60A5FA', fontSize: '10px', fontWeight: '800', padding: '5px 9px', borderRadius: '10px', zIndex: 4, display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.3s ease' }}>
            <Video size={12} /> {isHovered ? (t('livePlayback') || 'Lecture') : (t('demoVideo') || 'Vidéo')}
          </span>
        )}

        {/* PUCES INDICATRICES DE DÉFILEMENT (HOVER ET SWIPE MOBILE) */}
        {galleryLength > 1 && (
          <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '4px', zIndex: 4 }}>
            {media.gallery.map((_, idx) => (
              <div key={idx} style={{ width: currentSlideIndex === idx ? '14px' : '6px', height: '6px', borderRadius: '999px', backgroundColor: currentSlideIndex === idx ? '#FFF' : 'rgba(255,255,255,0.5)', transition: 'all 0.3s ease' }} />
            ))}
          </div>
        )}

        <span style={{ position: 'absolute', bottom: '12px', right: '12px', backgroundColor: 'rgba(4,38,90,0.95)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', color: '#FFF', fontSize: '11px', fontWeight: 'bold', padding: '5px 9px', borderRadius: '10px', zIndex: 4 }}>
          {safeFormatCompensation(item.compensation)}
        </span>
      </div>
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: darkMode ? '#FFFFFF' : '#111827', margin: '0 0 4px 0', lineHeight: 1.35 }}>
            {displayContent.title}
          </h3>
          {currentLang !== (item.nativeLang || 'FR') && (
            <button
              onClick={(e) => toggleOriginalListing(item.id, e)}
              style={{
                border: 'none',
                background: 'none',
                backgroundColor: 'transparent',
                color: darkMode ? '#60A5FA' : '#04265A',
                fontSize: '11px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 0',
                margin: '2px 0 4px 0',
                outline: 'none',
                boxShadow: 'none'
              }}
            >
              <Globe size={12} style={{ flexShrink: 0 }} />
              <span>{showingOriginalListings[item.id] ? t('showTranslation') : t('showOriginal')}</span>
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: darkMode ? '#CBD5E1' : '#6B7280', marginBottom: '10px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {item.type === 'remote' ? <Video size={13} color={darkMode ? '#60A5FA' : '#04265A'} /> : <MapPin size={13} color={darkMode ? '#60A5FA' : '#04265A'} />}
            {safeLocalizeLocation(item.location, currentLang)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {safeLocalizeTags((item.tags || safeGenerateTags(item.title, item.description || '')), currentLang).slice(0, 3).map(tag => (
            <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: darkMode ? 'rgba(4,38,90,0.45)' : '#EFF6FF', color: darkMode ? '#93C5FD' : '#04265A', borderRadius: '999px', padding: '4px 10px', fontSize: '10px', fontWeight: '800' }}>
              <Tag size={10} /> {tag}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', marginTop: 'auto', borderTop: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #F3F4F6' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: '600', fontSize: '13px', color: darkMode ? '#F8FAFC' : '#374151' }}>
            <img src={item.author === safeProfile.name ? safeProfile.avatar : safeGetAuthorAvatar(item.author)} alt={item.author} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', border: darkMode ? '1px solid #60A5FA' : '1px solid #E2E8F0' }} />
            {item.author}
          </span>
          {item.author !== safeProfile.name ? (
            <button onClick={(event) => { event.stopPropagation(); handleStartDiscussion(item); }} className="premium-button borderless-orig-btn" style={{ backgroundColor: '#04265A', color: '#FFF', border: 'none', padding: '8px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 6px 14px rgba(4,38,90,0.18)' }}>
              {t('proposeDealButton')} <ArrowRight size={12} />
            </button>
          ) : (
            <span style={{ backgroundColor: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB', padding: '7px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '600' }}>
              {t('authorAnnc')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
