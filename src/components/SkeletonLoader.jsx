import React from 'react';

/**
 * SkeletonCard — Carte fantôme élégante aux couleurs du thème actif
 */
export function SkeletonCard({ count = 1 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="skeleton-card"
          style={{
            borderRadius: '18px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-card)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: 'var(--shadow-card)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Image fantôme */}
          <div
            className="skeleton-shimmer"
            style={{
              width: '100%',
              height: '180px',
              borderRadius: '14px',
              marginBottom: '4px'
            }}
          />

          {/* En-tête auteur fantôme */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              className="skeleton-shimmer skeleton-avatar"
              style={{ width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0 }}
            />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="skeleton-shimmer" style={{ width: '55%', height: '14px', borderRadius: '6px' }} />
              <div className="skeleton-shimmer" style={{ width: '35%', height: '11px', borderRadius: '4px' }} />
            </div>
          </div>

          {/* Titre & Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <div className="skeleton-shimmer" style={{ width: '85%', height: '16px', borderRadius: '6px' }} />
            <div className="skeleton-shimmer" style={{ width: '100%', height: '12px', borderRadius: '4px' }} />
            <div className="skeleton-shimmer" style={{ width: '60%', height: '12px', borderRadius: '4px' }} />
          </div>

          {/* Tags & Compensation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
            <div className="skeleton-shimmer" style={{ width: '70px', height: '22px', borderRadius: '999px' }} />
            <div className="skeleton-shimmer" style={{ width: '90px', height: '24px', borderRadius: '8px' }} />
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * SkeletonGrid — Grille complète de cartes fantômes pour le feed d'annonces
 */
export function SkeletonGrid({ count = 6 }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '20px',
        width: '100%'
      }}
    >
      <SkeletonCard count={count} />
    </div>
  );
}

/**
 * SkeletonChatList — Liste fantôme pour les conversations
 */
export function SkeletonChatList({ count = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            borderRadius: '16px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)'
          }}
        >
          <div className="skeleton-shimmer" style={{ width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="skeleton-shimmer" style={{ width: '45%', height: '14px', borderRadius: '6px' }} />
              <div className="skeleton-shimmer" style={{ width: '20%', height: '10px', borderRadius: '4px' }} />
            </div>
            <div className="skeleton-shimmer" style={{ width: '75%', height: '11px', borderRadius: '4px' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default SkeletonCard;
