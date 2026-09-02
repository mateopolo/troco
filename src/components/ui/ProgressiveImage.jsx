import React, { useState, useEffect, useRef } from 'react';

/**
 * ProgressiveImage.jsx
 * Composant de chargement d'image progressif avec effet de flou (Blur Effect)
 * et transition fluide à l'affichage de l'image haute définition.
 *
 * @param {Object} props
 * @param {string} props.src - URL de l'image haute résolution
 * @param {string} [props.placeholderSrc] - URL de l'image miniature / ultra-compressée
 * @param {string} [props.alt] - Texte alternatif pour l'accessibilité
 * @param {string} [props.className] - Classe CSS pour le conteneur
 * @param {Object} [props.style] - Styles appliqués au conteneur externe
 * @param {Object} [props.imgStyle] - Styles appliqués directement à la balise img
 * @param {string} [props.fallbackSrc] - Image de secours en cas d'erreur de chargement
 * @param {string} [props.objectFit='cover'] - Mode de redimensionnement de l'image ('cover', 'contain', etc.)
 * @param {string} [props.loading='lazy'] - Stratégie de chargement ('lazy' ou 'eager')
 * @param {boolean} [props.draggable=false] - Possibilité de glisser l'image
 * @param {Function} [props.onLoad] - Callback appelé quand l'image HD est chargée
 * @param {Function} [props.onError] - Callback appelé en cas d'erreur de chargement
 * @param {number} [props.blurRadius=20] - Rayon de flou en pixels pour le placeholder
 * @param {number} [props.duration=0.5] - Durée de la transition en secondes
 */
export function ProgressiveImage({
  src,
  placeholderSrc,
  alt = '',
  className = '',
  style = {},
  imgStyle = {},
  fallbackSrc,
  objectFit = 'cover',
  loading = 'lazy',
  draggable = false,
  onLoad,
  onError,
  blurRadius = 20,
  duration = 0.5,
  ...rest
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  // Réinitialiser l'état si l'URL source change
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setCurrentSrc(src);
  }, [src]);

  // Si l'image est déjà en cache du navigateur
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [currentSrc]);

  const handleImageLoad = (e) => {
    setIsLoaded(true);
    if (typeof onLoad === 'function') {
      onLoad(e);
    }
  };

  const handleImageError = (e) => {
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
    } else {
      setHasError(true);
    }
    if (typeof onError === 'function') {
      onError(e);
    }
  };

  return (
    <div
      className={`progressive-image-container ${className}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-subtle, rgba(200, 200, 200, 0.15))',
        ...style,
      }}
      {...rest}
    >
      {/* 1. FOND DE FLOU / PLACEHOLDER ULTRA-COMPRESSÉ */}
      <div
        className="progressive-image-placeholder"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: isLoaded ? 0 : 1,
          transition: `opacity ${duration}s cubic-bezier(0.16, 1, 0.3, 1)`,
          backgroundImage: placeholderSrc ? `url("${placeholderSrc}")` : 'none',
          backgroundSize: objectFit,
          backgroundPosition: 'center',
          backgroundColor: 'var(--bg-subtle, #E2E8F0)',
          filter: `blur(${blurRadius}px)`,
          transform: 'scale(1.08)', // Empêche les bords blancs dus au blur CSS
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        {/* Shimmer / Skeleton animé doux si pas de placeholderSrc */}
        {!placeholderSrc && !isLoaded && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.6s infinite linear',
            }}
          />
        )}
      </div>

      {/* 2. IMAGE HAUTE DÉFINITION PROGRESSIVE */}
      {!hasError ? (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          loading={loading}
          draggable={draggable}
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: objectFit,
            opacity: isLoaded ? 1 : 0,
            filter: isLoaded ? 'none' : `blur(${blurRadius / 2}px)`,
            transform: isLoaded ? 'scale(1)' : 'scale(1.04)',
            transition: `opacity ${duration}s cubic-bezier(0.16, 1, 0.3, 1), filter ${duration}s ease, transform ${duration}s cubic-bezier(0.16, 1, 0.3, 1)`,
            zIndex: 2,
            display: 'block',
            ...imgStyle,
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--bg-subtle)',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            zIndex: 2,
          }}
        >
          📷 Image indisponible
        </div>
      )}
    </div>
  );
}

export default ProgressiveImage;
