import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Video, Globe, MapPin, Tag, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { ProgressiveImage } from './ui/ProgressiveImage';

function FeedCardItem({
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
  showingOriginalListings = {},
  toggleOriginalListing,
  localizeLocation,
  localizeTags,
  generateTags,
  getAuthorAvatar,
  profile,
  handleStartDiscussion,
  isAdmin = false,
  isGodModeActive = false,
  onAdminDeleteListing = null,
  onAdminDelete = null,
  onAdminToggleHideListing = null,
  onAdminToggleHide = null,
  onAdminEditListing = null,
  onOpenMobileActions = null,
  onMobileActionClick = null,
  onAuthorProfileClick = null,
  t = (key) => key
}) {
  const safeOpenMobileActions = onOpenMobileActions || onMobileActionClick;

  const [localImageIndex, setLocalImageIndex] = useState(0);
  const [typedText, setTypedText] = useState('');
  const cardElementRef = useRef(null);
  const videoRef = useRef(null);
  const touchStartRef = useRef(null);
  const touchDeltaXRef = useRef(0);
  const touchDeltaYRef = useRef(0);
  const isSwipingRef = useRef(false);
  const longPressTimerRef = useRef(null);

  const media = typeof getSuggestedMedia === 'function' ? getSuggestedMedia(item?.title, item?.description || '', item?.image, item?.video) : {};
  const isHovered = hoveredCardId === item?.id;
  const displayContent = typeof getListingDisplayContent === 'function'
    ? getListingDisplayContent(item, currentLang, !!showingOriginalListings[item?.id])
    : { title: item?.title || '', description: item?.description || '' };

  const trimStart = Number(item.videoTrimStart || item.videoMetadata?.trimStart || 0);
  const trimEnd = Number(item.videoTrimEnd || item.videoMetadata?.trimEnd || 0);
  const cropRatio = item.cropRatio || item.videoMetadata?.cropRatio || '16:9';

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    if (trimEnd > 0 && v.currentTime >= trimEnd) {
      v.currentTime = trimStart > 0 ? trimStart : 0;
      v.play().catch(() => {});
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    if (trimStart > 0) {
      videoRef.current.currentTime = trimStart;
    }
  };

  // EFFET MACHINE À ÉCRIRE (TYPEWRITER) EXCLUSIF AU SURVOL DE CETTE CARTE
  useEffect(() => {
    if (!isHovered || !displayContent.description) {
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
    return () => {
      clearInterval(typingInterval);
      setTypedText('');
    };
  }, [isHovered, displayContent.description]);
  
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

  // GESTION DU SWIPE TACTILE & LONG-PRESS
  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchDeltaXRef.current = 0;
    touchDeltaYRef.current = 0;
    isSwipingRef.current = false;

    if (onOpenMobileActions) {
      longPressTimerRef.current = setTimeout(() => {
        if (!isSwipingRef.current) {
          try { if (navigator.vibrate) navigator.vibrate(35); } catch (_) {}
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
    // Si le mouvement horizontal est franc sur une galerie
    if (galleryLength > 1 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4 && Math.abs(deltaX) > 24) {
      isSwipingRef.current = true;
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
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
    <motion.div
      ref={cardElementRef}
      variants={{
        hidden: { opacity: 0, y: 20, scale: 0.98 },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            duration: 0.35,
            ease: [0.22, 1, 0.36, 1],
          },
        },
      }}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.05 }}
      onClick={() => handleOpenListing(item)}
      onTouchStart={() => { if (setHoveredCardId) setHoveredCardId(item.id); }}
      onMouseEnter={() => { if (setHoveredCardId) setHoveredCardId(item.id); }}
      onMouseLeave={() => { if (setHoveredCardId) setHoveredCardId(null); }}
      className="feed-card-item premium-card"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: item.isBoosted ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: item.isBoosted
          ? '0 12px 30px rgba(185, 139, 115, 0.45)'
          : (isHovered ? '0 16px 36px rgba(63, 66, 56, 0.12)' : 'var(--shadow-card)'),
        cursor: 'pointer',
        transform: isHovered ? 'translateY(-6px) scale(1.018)' : 'none',
        transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s cubic-bezier(0.22, 1, 0.36, 1)'
      }}
    >
      {/* CADRE PHOTO AVEC GESTION DU CARROUSEL, SWIPE ET SURVOL */}
      <div
        onClick={handleCardImageClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="ken-burns"
        style={{ position: 'relative', height: '200px', width: '100%', backgroundColor: 'var(--bg-subtle)', overflow: 'hidden', touchAction: 'pan-y' }}
      >
        {gallery.map((imgSrc, idx) => {
          const isActive = idx === currentSlideIndex;
          return (
            <ProgressiveImage
              key={idx}
              src={imgSrc}
              fallbackSrc={getFallbackImage(item.category, item.title)}
              alt={item.title}
              draggable={false}
              className="ken-burns-img"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                opacity: isActive ? 1 : 0,
                transition: 'opacity 0.4s ease, transform 900ms var(--ease-quiet)',
                transform: isHovered && isActive ? 'scale(1.05)' : (isActive ? 'scale(1)' : 'scale(1.02)'),
                pointerEvents: 'none',
                WebkitUserDrag: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                zIndex: isActive ? 2 : 1
              }}
              imgStyle={{
                objectFit: 'cover',
              }}
            />
          );
        })}

        {/* VOILE DE CONTRASTE PROGRESSIF DISCRET EN BAS DE PHOTO */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0) 50%)',
          pointerEvents: 'none',
          zIndex: 3
        }} />

        {/* FLÈCHES DE NAVIGATION MANUELLE */}
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
                backgroundColor: 'rgba(0,0,0,0.65)', color: '#FFF',
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
                backgroundColor: 'rgba(0,0,0,0.65)', color: '#FFF',
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
              backgroundColor: 'rgba(0,0,0,0.6)', padding: '3px 8px', borderRadius: '999px',
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
            ref={videoRef}
            src={media.video}
            poster={media.image}
            autoPlay
            loop
            muted
            playsInline
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onError={(e) => { e.target.style.display = 'none'; }}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: cropRatio === '9:16' ? 'scale(1.15)' : cropRatio === '1:1' ? 'scale(1.08)' : 'scale(1)',
              transition: 'transform 0.3s ease',
              zIndex: 2,
              pointerEvents: 'none'
            }}
          />
        )}

        {/* BADGES DISTINCTIFS SUR L'IMAGE */}
        {item.urgent && (
          <span style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            backgroundColor: 'var(--accent-primary)',
            color: '#FFF',
            fontSize: '10px',
            fontWeight: '900',
            padding: '4px 8px',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-accent)',
            zIndex: 4,
            letterSpacing: '0.05em'
          }}>
            URGENT
          </span>
        )}

        {item.isDemo && (
          <span style={{
            position: 'absolute',
            top: '12px',
            left: item.urgent ? 'auto' : '12px',
            right: item.urgent ? '12px' : 'auto',
            backgroundColor: 'rgba(20, 18, 16, 0.75)',
            color: '#FAF7F2',
            fontSize: '10px',
            fontWeight: '750',
            letterSpacing: '0.06em',
            padding: '5px 10px',
            borderRadius: '999px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
            zIndex: 4,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            textTransform: 'uppercase'
          }}>
            <Sparkles size={11} color="var(--accent-primary)" />
            <span>Exemple</span>
          </span>
        )}

        {item.isBoosted && (
          <span style={{ position: 'absolute', top: '12px', left: (item.urgent || item.isDemo) ? 'auto' : '12px', right: (item.urgent || item.isDemo) ? '12px' : 'auto', backgroundColor: 'var(--accent-primary)', color: '#FFF', fontSize: '10px', fontWeight: '900', padding: '4px 8px', borderRadius: '8px', zIndex: 4, letterSpacing: '0.05em' }}>
            TOP VISIBILITÉ
          </span>
        )}

        <span style={{ position: 'absolute', bottom: '12px', right: '12px', backgroundColor: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', color: '#FFFFFF', fontSize: '11px', fontWeight: 'bold', padding: '5px 9px', borderRadius: '10px', zIndex: 4 }}>
          {formatCompensation(item.compensation)}
        </span>
      </div>

      {/* CORPS DE CARTE & TYPOGRAPHIE ÉDITORIALE */}
      <div style={{ padding: '16px 18px' }}>
        <div>
          <h3 className="font-editorial-heading" style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-main)', margin: '0 0 4px 0', lineHeight: 1.3, letterSpacing: '-0.015em', cursor: 'pointer' }}>
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
              <Globe size={12} />
              {showingOriginalListings[item.id] ? t('showTranslation') : t('showOriginal')}
            </button>
          )}
        </div>

        {/* LOCALISATION & SOUS-TITRE EN STYLE ÉDITORIAL RAFFINÉ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          <span className="font-editorial" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontStyle: 'italic' }}>
            {item.type === 'remote' ? <Video size={13} color="var(--accent-primary)" /> : <MapPin size={13} color="var(--accent-primary)" />}
            {localizeLocation(item.location, currentLang)}
          </span>
        </div>

        {/* MICRO-INTERACTION : APERÇU ANIMÉ TYPEWRITER */}
        {displayContent.description && (
          <div
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
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
            {isHovered && typedText ? (
              <span>
                {typedText}
                {typedText.length < (displayContent.description?.slice(0, 110)?.length || 0) && (
                  <span style={{ color: 'var(--accent-primary)', animation: 'pulse 0.8s infinite', fontWeight: '900' }}>|</span>
                )}
              </span>
            ) : (
              displayContent.description
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {(typeof localizeTags === 'function'
            ? localizeTags((item.tags || (typeof generateTags === 'function' ? generateTags(item.title, item.description || '') : [])), currentLang)
            : (item.tags || [])
          ).slice(0, 3).map(tag => (
            <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)', borderRadius: '999px', padding: '4px 10px', fontSize: '10px', fontWeight: '700', border: '1px solid var(--border-color)' }}>
              <Tag size={10} /> {tag}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border-color)', gap: '8px', flexWrap: 'wrap' }}>
          <span
            onClick={(e) => {
              e.stopPropagation();
              if (typeof onAuthorProfileClick === 'function') {
                onAuthorProfileClick(item.authorProfile || { name: item.author, avatar: item.avatar, bio: item.bio });
              }
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: '700', fontSize: '13px', color: 'var(--text-main)', cursor: onAuthorProfileClick ? 'pointer' : 'default' }}
          >
            <ProgressiveImage
              src={(profile?.name && item.author === profile.name) ? (profile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80') : (typeof getAuthorAvatar === 'function' ? getAuthorAvatar(item.author) : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80')}
              alt={item.author || 'Auteur'}
              style={{ width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0, border: '1px solid var(--border-color)', overflow: 'hidden' }}
              imgStyle={{ borderRadius: '50%', objectFit: 'cover' }}
            />
            {item.author || 'Membre Troco'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {(!profile?.name || item.author !== profile.name) ? (
              <button onClick={(event) => { event.stopPropagation(); if (typeof handleStartDiscussion === 'function') handleStartDiscussion(item); else if (typeof handleOpenListing === 'function') handleOpenListing(item); }} className="premium-button" style={{ background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)', color: '#FFF', border: 'none', padding: '9px 16px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: 'var(--shadow-accent)' }}>{typeof t === 'function' ? t('proposeDealButton') : 'Proposer un deal'} <ArrowRight size={12} /></button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', padding: '6px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '600' }}>{typeof t === 'function' ? t('authorAnnc') : 'Mon annonce'}</span>
                {safeOpenMobileActions && (
                  <button
                    onClick={(e) => { e.stopPropagation(); safeOpenMobileActions(item); }}
                    className="premium-button"
                    style={{
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-main)',
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
    </motion.div>
  );
}

export default React.memo(FeedCardItem);

