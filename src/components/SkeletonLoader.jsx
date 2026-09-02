import React from 'react';
import TrocoLogo3D from './common/TrocoLogo3D';

// ─── ATOM PARTAGÉ ────────────────────────────────────────────────────────────
// Bloc shimmer réutilisable (jamais de position fixed)
function Shimmer({ style = {} }) {
  return <div className="skeleton-shimmer" style={{ borderRadius: 8, ...style }} />;
}

// ─── CARD FANTÔME ────────────────────────────────────────────────────────────
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
          <Shimmer style={{ width: '100%', height: '180px', borderRadius: 14, marginBottom: 4 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shimmer style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Shimmer style={{ width: '55%', height: 14 }} />
              <Shimmer style={{ width: '35%', height: 11 }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            <Shimmer style={{ width: '85%', height: 16 }} />
            <Shimmer style={{ width: '100%', height: 12 }} />
            <Shimmer style={{ width: '60%', height: 12 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 10, borderTop: '1px solid var(--border-color)' }}>
            <Shimmer style={{ width: 70, height: 22, borderRadius: 999 }} />
            <Shimmer style={{ width: 90, height: 24 }} />
          </div>
        </div>
      ))}
    </>
  );
}

// ─── GRILLE FANTÔME ──────────────────────────────────────────────────────────
export function SkeletonGrid({ count = 6 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', width: '100%' }}>
      <SkeletonCard count={count} />
    </div>
  );
}

// ─── LISTE CHAT FANTÔME ──────────────────────────────────────────────────────
export function SkeletonChatList({ count = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '16px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <Shimmer style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Shimmer style={{ width: '45%', height: 14 }} />
              <Shimmer style={{ width: '20%', height: 10 }} />
            </div>
            <Shimmer style={{ width: '75%', height: 11 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── SKELETON FEED (ONGLET EXPLORER) ────────────────────────────────────────
/**
 * Imite la structure réelle du feed : barre de recherche + filtres + grille de cartes.
 * Jamais de position:fixed. S'insère in-situ dans le flux de la page.
 */
export function SkeletonFeedLayout() {
  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '16px 16px 120px', boxSizing: 'border-box' }}>
      {/* Barre de recherche fantôme */}
      <Shimmer style={{ width: '100%', height: 48, borderRadius: 999, marginBottom: 16 }} />

      {/* Filtres catégories fantômes */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, overflowX: 'hidden' }}>
        {[90, 110, 80, 120, 95, 105].map((w, i) => (
          <Shimmer key={i} style={{ width: w, height: 34, borderRadius: 999, flexShrink: 0 }} />
        ))}
      </div>

      {/* Grille cartes fantômes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
        gap: 20,
        width: '100%'
      }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              borderRadius: 18,
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-card)',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              overflow: 'hidden',
            }}
          >
            <Shimmer style={{ width: '100%', height: 175, borderRadius: 14 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Shimmer style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Shimmer style={{ width: '58%', height: 13 }} />
                <Shimmer style={{ width: '38%', height: 10 }} />
              </div>
            </div>
            <Shimmer style={{ width: '88%', height: 15 }} />
            <Shimmer style={{ width: '100%', height: 11 }} />
            <Shimmer style={{ width: '62%', height: 11 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--border-color)' }}>
              <Shimmer style={{ width: 68, height: 22, borderRadius: 999 }} />
              <Shimmer style={{ width: 88, height: 24 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SKELETON CHAT (ONGLET MESSAGERIE) ──────────────────────────────────────
/**
 * Imite la structure du module Chat : liste de conversations à gauche,
 * et un aperçu de thread à droite sur desktop.
 */
export function SkeletonChatLayout() {
  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', padding: '16px', boxSizing: 'border-box', display: 'flex', gap: 16, height: '100%' }}>
      {/* Liste de discussions */}
      <div style={{ flex: '0 0 340px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Barre de recherche */}
        <Shimmer style={{ width: '100%', height: 42, borderRadius: 999, marginBottom: 6 }} />
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', borderRadius: 16,
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              opacity: 1 - i * 0.08,
            }}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <Shimmer style={{ width: 44, height: 44, borderRadius: '50%' }} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Shimmer style={{ width: '48%', height: 14 }} />
                <Shimmer style={{ width: '18%', height: 10 }} />
              </div>
              <Shimmer style={{ width: '72%', height: 11 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Zone thread (desktop uniquement) */}
      <div style={{ flex: 1, borderRadius: 20, border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header thread */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottom: '1px solid var(--border-color)' }}>
          <Shimmer style={{ width: 40, height: 40, borderRadius: '50%' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Shimmer style={{ width: '30%', height: 14 }} />
            <Shimmer style={{ width: '20%', height: 10 }} />
          </div>
        </div>
        {/* Bulles de messages */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[{ w: '55%', side: 'left' }, { w: '40%', side: 'right' }, { w: '65%', side: 'left' }, { w: '35%', side: 'right' }, { w: '50%', side: 'left' }].map(({ w, side }, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: side === 'right' ? 'flex-end' : 'flex-start' }}>
              <Shimmer style={{ width: w, height: 36, borderRadius: side === 'right' ? '18px 4px 18px 18px' : '4px 18px 18px 18px' }} />
            </div>
          ))}
        </div>
        {/* Input zone */}
        <Shimmer style={{ width: '100%', height: 48, borderRadius: 999 }} />
      </div>
    </div>
  );
}

// ─── SKELETON PROFIL (ONGLET PROFIL) ────────────────────────────────────────
/**
 * Imite la structure de la page profil : bannière hero + avatar + stats + onglets + contenu.
 */
export function SkeletonProfileLayout() {
  return (
    <div style={{ width: '100%', maxWidth: '680px', margin: '0 auto', padding: '0 0 120px', boxSizing: 'border-box' }}>
      {/* Hero banner */}
      <Shimmer style={{ width: '100%', height: 140, borderRadius: '0 0 28px 28px' }} />

      {/* Avatar + nom */}
      <div style={{ padding: '0 20px', marginTop: -36, display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 20 }}>
        <Shimmer style={{ width: 80, height: 80, borderRadius: '50%', flexShrink: 0, border: '4px solid var(--bg-global)' }} />
        <div style={{ flex: 1, paddingBottom: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Shimmer style={{ width: '50%', height: 18 }} />
          <Shimmer style={{ width: '35%', height: 12 }} />
        </div>
        <Shimmer style={{ width: 90, height: 36, borderRadius: 999, marginBottom: 8 }} />
      </div>

      {/* Bio */}
      <div style={{ padding: '0 20px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Shimmer style={{ width: '92%', height: 13 }} />
        <Shimmer style={{ width: '78%', height: 13 }} />
        <Shimmer style={{ width: '60%', height: 13 }} />
      </div>

      {/* Stats row */}
      <div style={{ padding: '0 20px', marginBottom: 24, display: 'flex', gap: 12 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ flex: 1, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            <Shimmer style={{ width: 32, height: 20, borderRadius: 6 }} />
            <Shimmer style={{ width: 50, height: 11, borderRadius: 6 }} />
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{ padding: '0 20px', marginBottom: 20, display: 'flex', gap: 8 }}>
        {[80, 90, 75, 85].map((w, i) => (
          <Shimmer key={i} style={{ width: w, height: 36, borderRadius: 999 }} />
        ))}
      </div>

      {/* Contenu section */}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 18, padding: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
            <Shimmer style={{ width: 56, height: 56, borderRadius: 12, flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Shimmer style={{ width: '65%', height: 14 }} />
              <Shimmer style={{ width: '45%', height: 11 }} />
              <Shimmer style={{ width: '30%', height: 11 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SKELETON COMMUNAUTÉ ─────────────────────────────────────────────────────
/**
 * Imite la structure Troco Live : header + liste d'activité + live card.
 */
export function SkeletonCommunityLayout() {
  return (
    <div style={{ width: '100%', maxWidth: '680px', margin: '0 auto', padding: '16px 16px 120px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Live card hero */}
      <Shimmer style={{ width: '100%', height: 180, borderRadius: 24 }} />
      {/* Titre section */}
      <Shimmer style={{ width: '45%', height: 20, marginTop: 8 }} />
      {/* Feed activité */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', opacity: 1 - i * 0.1 }}>
          <Shimmer style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Shimmer style={{ width: '40%', height: 13 }} />
              <Shimmer style={{ width: '15%', height: 10 }} />
            </div>
            <Shimmer style={{ width: '85%', height: 12 }} />
            <Shimmer style={{ width: '60%', height: 12 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── SKELETON PUBLICATION ────────────────────────────────────────────────────
/**
 * Imite le tunnel de dépôt d'annonce (étapes formulaire).
 */
export function SkeletonPostLayout() {
  return (
    <div style={{ width: '100%', maxWidth: '640px', margin: '0 auto', padding: '24px 16px 120px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Steps indicator */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
        {[1, 2, 3, 4].map(i => (
          <Shimmer key={i} style={{ width: i === 1 ? 32 : 18, height: 8, borderRadius: 999 }} />
        ))}
      </div>
      {/* Titre section */}
      <Shimmer style={{ width: '55%', height: 22, margin: '0 auto' }} />
      <Shimmer style={{ width: '70%', height: 14, margin: '-8px auto 0' }} />
      {/* Champs formulaire */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Shimmer style={{ width: '30%', height: 12 }} />
          <Shimmer style={{ width: '100%', height: 48, borderRadius: 14 }} />
        </div>
      ))}
      {/* Zone photo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[1, 2, 3].map(i => (
          <Shimmer key={i} style={{ width: '100%', height: 90, borderRadius: 14 }} />
        ))}
      </div>
      {/* Bouton CTA */}
      <Shimmer style={{ width: '100%', height: 52, borderRadius: 999, marginTop: 8 }} />
    </div>
  );
}

// ─── FALLBACK MODAL LEGACY ───────────────────────────────────────────────────
/**
 * Écran de chargement minimaliste pour les modales et overlays (conservé pour compatibilité).
 * Ce composant utilise position:fixed car il est réservé aux modales, PAS aux onglets.
 */
export function SkeletonModalFallback({ title = 'Chargement...' }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--bg-global)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000000,
        gap: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      {typeof window !== 'undefined' && window.innerWidth < 768 ? (
        <div style={{
          width: '50px',
          height: '50px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, var(--accent-primary, #C67D5B) 0%, var(--accent-primary-hover, #A8644A) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          fontSize: '24px',
          fontWeight: '900',
          fontFamily: 'var(--font-editorial, serif)',
          boxShadow: '0 4px 16px rgba(198, 125, 91, 0.3)'
        }}>
          T
        </div>
      ) : (
        <TrocoLogo3D animated={true} size={60} />
      )}
      <span
        style={{
          fontSize: '13px',
          fontWeight: '600',
          color: 'var(--text-secondary)',
          letterSpacing: '0.04em',
          opacity: 0.85,
        }}
      >
        {title || 'Chargement...'}
      </span>
    </div>
  );
}

export default SkeletonCard;
