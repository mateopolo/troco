import React, { useState, useEffect } from 'react';
import { usersPublicService } from '../../services/usersPublicService';

export function getInitials(name = '') {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getColorFromName(name = '') {
  if (!name) return '#6b7280';
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#6366f1'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export default function Avatar({
  uid,
  src,
  name = '',
  size = 40,
  className = '',
  style = {},
  alt = '',
}) {
  const [imgSrc, setImgSrc] = useState(src || null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (src) {
      setImgSrc(src);
      setHasError(false);
      return;
    }

    if (uid) {
      let isMounted = true;
      usersPublicService.getPublicProfile(uid).then((publicData) => {
        if (isMounted && publicData?.avatar) {
          setImgSrc(publicData.avatar);
          setHasError(false);
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [uid, src]);

  const initials = getInitials(name);
  const bgColor = getColorFromName(name);

  const containerStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    userSelect: 'none',
    backgroundColor: bgColor,
    color: '#ffffff',
    fontWeight: 600,
    fontSize: `${Math.round(size * 0.4)}px`,
    textTransform: 'uppercase',
    ...style,
  };

  if (imgSrc && !hasError) {
    return (
      <div className={`troco-avatar ${className}`} style={containerStyle}>
        <img
          src={imgSrc}
          alt={alt || name || 'Avatar'}
          onError={() => setHasError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>
    );
  }

  return (
    <div className={`troco-avatar troco-avatar-initials ${className}`} style={containerStyle}>
      <span>{initials}</span>
    </div>
  );
}
