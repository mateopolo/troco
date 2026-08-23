import React, { useState, useEffect, useRef } from 'react';
import { Video, MapPin, Tag, ArrowRight, Globe, ChevronLeft, ChevronRight } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { getSuggestedMedia as defaultGetSuggestedMedia, getFallbackImage as defaultGetFallbackImage } from '../utils/mediaUtils';
import { localizeLocation as defaultLocalizeLocation, localizeTags as defaultLocalizeTags } from '../locales/translations';
import { getAuthorAvatar as defaultGetAuthorAvatar } from '../data/mockData';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

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
  const cardRef = useRef(null);
  const [localImageIndex, setLocalImageIndex] = useState(0);
  const touchStartRef = useRef(null);
  const touchDeltaXRef = useRef(0);
  const touchDeltaYRef = useRef(0);
  const isSwipingRef = useRef(false);

  // GSAP ScrollTrigger animation
  useGSAP(() => {
    if (!cardRef.current) return;
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 35, scale: 0.98 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: cardRef.current,
          start: 'top 88%',
          toggleActions: 'play none none reverse',
        },
      }
    );
  }, { scope: cardRef });

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
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    };
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

    if (galleryLength > 1 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4 && Math.abs(deltaX) > 24) {
      isSwipingRef.current = true;
    }
  };

  const handleTouchEnd = () => {
    const deltaX = touchDeltaXRef.current;
    if (isSwipingRef.current && Math.abs(deltaX) > 28 && galleryLength > 1) {
      if (deltaX > 0) {
        setLocalImageIndex(prev => (prev + 1) % galleryLength);
      } else {
        setLocalImageIndex(prev => (prev - 1 + galleryLength) % galleryLength);
      }
      setTimeout(() => { isSwipingRef.current = false; }, 80);
    } else {
      isSwipingRef.current = false;
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
    if (handleOpenListing) {
      handleOpenListing(item);
    }
  };

  return (
    <div
      ref={cardRef}
      onClick={() => handleOpenListing(item)}
      onMouseEnter={() => setHoveredCardId(item.id)}
      onMouseLeave={() => setHoveredCardId(null)}
      className="premium-card reveal-card gsap-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-card)',
        border: item.isBoosted ? '2px solid var(--accent-warning)' : '1px solid var(--border-color)',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: item.isBoosted ? 'var(--shadow-accent)' : 'var(--shadow-card)',
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
        style={{ position: 'relative', height: '200px', width: '100%', backgroundColor: 'var(--bg-subtle)', overflow: 'hidden', touchAction: 'pan-y' }}
      >
        {/* SUPERPOSITION DES IMAGES DE LA GALERIE AVEC CROSSFADE & ZOOM SUBTIL */}
        {effectiveGallery.map((imgSrc, idx) => {
          const isActive = currentSlideIndex === idx;
          return (
            <img
              key={idx}
              src={imgSrc}
              alt={`${displayContent.title} - ${idx + 1}`}
              onError={(e) => { e.target.src = safeGetFallbackImage(item.category, item.title); }}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: isActive ? 1 : 0,
                transform: isActive && isHovered ? 'scale(1.06)' : 'scale(1)',
                transition: 'opacity 0.45s ease, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
                zIndex: isActive ? 1 : 0
              }}
            />
          );
        })}

        {/* FLÈCHES MANUELLES DE NAVIGATION GALERIE AU SURVOL */}
        {galleryLength > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLocalImageIndex(prev => (prev - 1 + galleryLength) % galleryLength);
              }}
              style={{
                position: 'absolute',
                left: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                border: 'none',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                opacity: isHovered ? 1 : 0,
                transition: 'opacity 0.2s ease',
                zIndex: 4
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLocalImageIndex(prev => (prev + 1) % galleryLength);
              }}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                border: 'none',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                opacity: isHovered ? 1 : 0,
                transition: 'opacity 0.2s ease',
                zIndex: 4
              }}
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}

        {/* INDICATEURS DE SLIDES STYLE CARROUSEL SUBTIL */}
        {galleryLength > 1 && (
          <div
            style={{
              position: 'absolute',
              bottom: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '5px',
              zIndex: 3,
              backgroundColor: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(4px)',
              padding: '3px 8px',
              borderRadius: '999px'
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
                  backgroundColor: currentSlideIndex === idx ? 'var(--accent-primary)' : 'rgba(255,255,255,0.6)',
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
          <span className="sponsored-badge" style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: 'var(--accent-warning)', color: '#FFF', fontSize: '11px', fontWeight: '800', padding: '5px 10px', borderRadius: '999px', boxShadow: '0 4px 14px rgba(217,119,6,0.4)', zIndex: 4 }}>
            🔥 Sponsorisé
          </span>
        )}
        {item.urgent && (
          <span style={{ position: 'absolute', top: '12px', left: '12px', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', border: '1.5px solid var(--accent-primary)', fontSize: '10px', fontWeight: '800', padding: '4px 10px', borderRadius: '999px', boxShadow: 'var(--shadow-card)', zIndex: 4 }}>
            URGENT
          </span>
        )}
        {(item.isDemo || (typeof item.id === 'number' && item.id <= 20)) && (
          <span style={{
            position: 'absolute',
            top: item.urgent ? '42px' : '12px',
            left: '12px',
            backgroundColor: 'var(--bg-subtle)',
            color: 'var(--accent-primary)',
            border: '1px solid var(--border-color)',
            fontSize: '9.5px',
            fontWeight: '800',
            padding: '4px 10px',
            borderRadius: '999px',
            boxShadow: 'var(--shadow-card)',
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
          <span style={{ position: 'absolute', bottom: '12px', left: '12px', backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', color: 'var(--accent-primary)', fontSize: '10px', fontWeight: '800', padding: '5px 9px', borderRadius: '10px', zIndex: 4, display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.3s ease' }}>
            <Video size={12} color="var(--accent-primary)" /> {isHovered ? (t('livePlayback') || 'Lecture') : (t('demoVideo') || 'Vidéo')}
          </span>
        )}

        <span style={{ position: 'absolute', bottom: '12px', right: '12px', backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', border: '1px solid var(--border-color)', color: '#FAF7F2', fontSize: '11px', fontWeight: '800', padding: '5px 10px', borderRadius: '999px', zIndex: 4 }}>
          {safeFormatCompensation(item.compensation)}
        </span>
      </div>

      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        <div>
          <div>
            <h3 className="font-sans" style={{ fontSize: '15.5px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 4px 0', lineHeight: 1.35, letterSpacing: '-0.02em' }}>
              {displayContent.title}
            </h3>
            {currentLang !== (item.nativeLang || 'FR') && (
              <button
                onClick={(e) => toggleOriginalListing(item.id, e)}
                className="premium-button"
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--accent-primary)',
                  fontSize: '11px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 0 6px 0'
                }}
              >
                <Globe size={12} color="var(--accent-primary)" />
                {showingOriginalListings[item.id] ? t('showTranslation') : t('showOriginal')}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            <span className="font-editorial" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontStyle: 'italic', fontSize: '14px' }}>
              {item.type === 'remote' ? <Video size={13} color="var(--accent-primary)" /> : <MapPin size={13} color="var(--accent-primary)" />}
              {safeLocalizeLocation(item.location, currentLang)}
            </span>
          </div>

          {/* APERÇU ANIMÉ AU SURVOL */}
          {displayContent.description && (
            <div
              style={{
                fontSize: '11.5px',
                color: 'var(--text-secondary)',
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
              <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)', borderRadius: '999px', border: '1px solid var(--border-color)', padding: '4px 10px', fontSize: '10px', fontWeight: '800' }}>
                <Tag size={10} color="var(--accent-primary)" /> {tag}
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border-color)', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: '800', fontSize: '13px', color: 'var(--text-main)' }}>
            <img src={item.author === safeProfile.name ? safeProfile.avatar : safeGetAuthorAvatar(item.author)} alt={item.author} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--accent-primary)' }} />
            {item.author}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {item.author !== safeProfile.name ? (
              <button onClick={(event) => { event.stopPropagation(); handleStartDiscussion(item); }} className="premium-button" style={{ background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '999px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: 'var(--shadow-accent)' }}>{t('proposeDealButton')} <ArrowRight size={12} /></button>
            ) : (
              <span style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '700' }}>{t('authorAnnc')}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
