import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Video, Globe, MapPin, Tag, Trash2, ArrowRight } from 'lucide-react';
import { useScrollReveal } from '../utils/useScrollReveal';

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
  const [typedText, setTypedText] = useState('');
  const [isScrollVisible, setIsScrollVisible] = useState(false);
  const cardElementRef = useRef(null);
  const touchStartRef = useRef(null);
  const touchDeltaXRef = useRef(0);
  const touchDeltaYRef = useRef(0);
  const isSwipingRef = useRef(false);
  const longPressTimerRef = useRef(null);

  // Hook Scroll Reveal natif (IntersectionObserver)
  const revealRef = useScrollReveal({ threshold: 0.08 });

  const media = getSuggestedMedia ? getSuggestedMedia(item.title, item.description || '', item.image, item.video) : {};
  const isHovered = hoveredCardId === item.id;
  const displayContent = getListingDisplayContent ? getListingDisplayContent(item, currentLang, !!showingOriginalListings[item.id]) : { title: item.title, description: item.description };

  // DÉTECTION AU SCROLL : DÈS QUE L'ANNONCE EST VISIBLE À 30% DANS L'ÉCRAN
  useEffect(() => {
    const el = cardElementRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsScrollVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsScrollVisible(true);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // EFFET MACHINE À ÉCRIRE (TYPEWRITER) AU SCROLL (30% VISIBLE) OU SURVOL SANS BLOCAGE
  useEffect(() => {
    if ((!isScrollVisible && !isHovered) || !displayContent.description) {
      setTypedText('');
      return;
    }
    let currentIdx = 0;
    const fullText = displayContent.description.slice(0, 110);
    const typingInterval = setInterval(() => {
      currentIdx++;
      setTypedText(fullText.slice(0, currentIdx));
      if (currentIdx >= fullText.length) {
        clearInterval(typingInterval);
      }
    }, 18);
    return () => clearInterval(typingInterval);
  }, [isScrollVisible, isHovered, displayContent.description]);
  
  // Galerie complète : priorité aux photos utilisateurs (gallery), puis médias suggérés, puis fallback
  const gallery = (item.gallery && item.gallery.length > 0)
    ? item.gallery
    : (media.gallery && media.gallery.length > 0
      ? media.gallery
      : [item.image || media.image || getFallbackImage(item.category, item.title)]);
  
  const galleryLength = gallery.length;

  // Défilement automatique desktop au survol toutes les 1 500 ms
  useEffect(() => {
    if (!isHovered || galleryLength <= 1) return;
    const interval = setInterval(() => {
      setLocalImageIndex(prev => (prev + 1) % galleryLength);
    }, 1500);
    return () => clearInterval(interval);
  }, [isHovered, galleryLength]);

  const currentSlideIndex = localImageIndex % galleryLength;

  // GESTION DU SWIPE TACTILE FLUIDE SANS BLOQUER LE SCROLL VERTICAL
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

    // Détection appui long (~500ms) pour l'auteur
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
    touchDeltaYRef.current = deltaY;

    if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    }
    // Si le mouvement horizontal dépasse nettement le mouvement vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 12) {
      isSwipingRef.current = true;
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
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
      ref={(el) => {
        cardElementRef.current = el;
        if (revealRef) {
          if (typeof revealRef === 'function') revealRef(el);
          else revealRef.current = el;
        }
      }}
      onClick={() => handleOpenListing(item)}
      onTouchStart={() => { if (setHoveredCardId) setHoveredCardId(item.id); }}
      onMouseEnter={() => { if (setHoveredCardId) setHoveredCardId(item.id); }}
      onMouseLeave={() => { if (setHoveredCardId) setHoveredCardId(null); }}
      className="premium-card reveal-card"
      style={{
        backgroundColor: darkMode ? 'rgba(30,41,59,0.85)' : '#FFFFFF',
        border: item.isBoosted ? '2px solid #F59E0B' : (darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(229,231,235,0.9)'),
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: item.isBoosted ? '0 12px 34px rgba(245,158,11,0.14)' : '0 2px 14px rgba(15, 23, 42, 0.05)',
        cursor: 'pointer',
        transform: isHovered ? 'translateY(-5px) scale(1.015)' : 'none',
        transition: 'transform 0.4s var(--ease-quiet), box-shadow 0.4s var(--ease-quiet)'
      }}
    >
      {/* CADRE PHOTO AVEC GESTION DU CARROUSEL, SWIPE ET SURVOL */}
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

        {/* VOILE DE CONTRASTE PROGRESSIF DISCRET EN BAS DE PHOTO */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(15, 23, 42, 0.45) 0%, rgba(15, 23, 42, 0) 50%)',
          pointerEvents: 'none',
          zIndex: 3
        }} />

        {/* FLÈCHES DE NAVIGATION MANUELLE (Z-INDEX 10 ET CLIC DIRECT RÉTABLI) */}
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
                backgroundColor: 'rgba(15,23,42,0.65)', color: '#FFF',
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
                backgroundColor: 'rgba(15,23,42,0.65)', color: '#FFF',
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

        {/* PUCES INDICATRICES REFLÉTANT L'INDEX ACTIF */}
        {galleryLength > 1 && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)',
              display: 'flex', alignItems: 'center', gap: '4px', zIndex: 10,
              backgroundColor: 'rgba(15,23,42,0.5)', padding: '3px 8px', borderRadius: '999px',
              backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', pointerEvents: 'auto'
            }}
          >
            {gallery.map((_, idx) => (
              <div
                key={idx}
                onClick={(e) => { e.stopPropagation(); setLocalImageIndex(idx); }}
                style={{
                  width: currentSlideIndex === idx ? '14px' : '5px',
                  height: '5px',
                  borderRadius: '999px',
                  backgroundColor: currentSlideIndex === idx ? '#60A5FA' : 'rgba(255,255,255,0.6)',
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

        {item.isBoosted && (
          <span style={{ position: 'absolute', top: '12px', left: (item.urgent || item.isDemo) ? 'auto' : '12px', right: (item.urgent || item.isDemo) ? '12px' : 'auto', backgroundColor: '#F59E0B', color: '#FFF', fontSize: '10px', fontWeight: '900', padding: '4px 8px', borderRadius: '8px', zIndex: 4, letterSpacing: '0.05em' }}>
            TOP VISIBILITÉ
          </span>
        )}

        <span style={{ position: 'absolute', bottom: '12px', right: '12px', backgroundColor: 'rgba(4,38,90,0.95)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', color: '#FFF', fontSize: '11px', fontWeight: 'bold', padding: '5px 9px', borderRadius: '10px', zIndex: 4 }}>
          {formatCompensation(item.compensation)}
        </span>
      </div>

      {/* CORPS DE CARTE & TYPOGRAPHIE ÉDITORIALE */}
      <div style={{ padding: '16px 18px' }}>
        <div>
          <h3 className="font-sans" style={{ fontSize: '15.5px', fontWeight: '800', color: darkMode ? '#FFFFFF' : '#111827', margin: '0 0 4px 0', lineHeight: 1.35, letterSpacing: '-0.02em', cursor: 'pointer' }}>
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

        {/* LOCALISATION & SOUS-TITRE EN STYLE ÉDITORIAL RAFFINÉ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: darkMode ? '#CBD5E1' : '#6B7280', marginBottom: '8px' }}>
          <span className="font-editorial" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontStyle: 'italic' }}>
            {item.type === 'remote' ? <Video size={13} color={darkMode ? '#60A5FA' : '#04265A'} /> : <MapPin size={13} color={darkMode ? '#60A5FA' : '#04265A'} />}
            {localizeLocation(item.location, currentLang)}
          </span>
        </div>

        {/* MICRO-INTERACTION ÉTAPE 3 : APERÇU ANIMÉ TYPEWRITER DÉCLENCHÉ AU SCROLL (30%) OU SURVOL */}
        {displayContent.description && (
          <div
            style={{
              fontSize: '11.5px',
              color: darkMode ? '#94A3B8' : '#64748B',
              lineHeight: 1.45,
              minHeight: '34px',
              maxHeight: '48px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              marginBottom: '10px',
              transition: 'color 0.25s ease'
            }}
          >
            {(isScrollVisible || isHovered) ? (
              <span>
                {typedText || displayContent.description.slice(0, 110)}
                {typedText.length > 0 && typedText.length < (displayContent.description?.slice(0, 110)?.length || 0) && (
                  <span style={{ color: '#60A5FA', animation: 'pulse 0.8s infinite', fontWeight: '900' }}>|</span>
                )}
              </span>
            ) : (
              displayContent.description
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {localizeTags((item.tags || generateTags(item.title, item.description || '')), currentLang).slice(0, 3).map(tag => (
            <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: darkMode ? 'rgba(4,38,90,0.45)' : '#EFF6FF', color: darkMode ? '#93C5FD' : '#04265A', borderRadius: '999px', padding: '4px 10px', fontSize: '10px', fontWeight: '800' }}>
              <Tag size={10} /> {tag}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #F3F4F6', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: '700', fontSize: '13px', color: darkMode ? '#F8FAFC' : '#374151' }}>
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
