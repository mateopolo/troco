import React from 'react';
import { ArrowLeft, Palette } from 'lucide-react';

/**
 * MobileHeader.jsx — En-tête Mobile Natif (Standard Apple HIG / Material 3)
 * Cible tactile garantie de 44x44px minimum, retour haptique et floutage dynamique.
 */
export default function MobileHeader({
  title = '',
  subtitle = null,
  onBack,
  rightAction = null,
  showWhiteboard = false,
  onOpenWhiteboard = null,
  openWorkspaceTool = null,
  darkMode = false,
  style = {},
}) {
  const handleBackClick = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(10); } catch (_) {}
    }
    if (typeof onBack === 'function') {
      onBack();
    }
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        height: '56px',
        padding: '0 12px',
        paddingTop: 'max(6px, env(safe-area-inset-top, 6px))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: darkMode ? 'rgba(21, 18, 15, 0.88)' : 'rgba(253, 251, 247, 0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: darkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {/* BOUTON RETOUR TACTILE 44x44px (APPLE HIG) */}
      <button
        type="button"
        onClick={handleBackClick}
        className="premium-button"
        style={{
          minWidth: '44px',
          minHeight: '44px',
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)',
          backgroundColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          color: 'var(--text-main, inherit)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        title="Retour"
        aria-label="Retour"
      >
        <ArrowLeft size={20} strokeWidth={2.5} />
      </button>

      {/* TITRE ET SOUS-TITRE CENTRÉS */}
      <div
        style={{
          flex: 1,
          textAlign: 'center',
          padding: '0 8px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {typeof title === 'string' ? (
          <h2
            style={{
              margin: 0,
              fontSize: '15px',
              fontWeight: '700',
              color: 'var(--text-main, inherit)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '220px',
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </h2>
        ) : (
          title
        )}
        {subtitle && (
          <span
            style={{
              fontSize: '11px',
              color: 'var(--text-secondary, rgba(150,150,150,0.8))',
              fontWeight: '500',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '220px',
            }}
          >
            {subtitle}
          </span>
        )}
      </div>

      {/* ACTION DROITE (OU PLACEHOLDER 44px POUR L'ALIGNEMENT SYMÉTRIQUE) */}
      <div
        className="flex items-center justify-end gap-2 flex-shrink-0 max-w-[50%]"
        style={{
          minWidth: '44px',
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          flexShrink: 0,
          maxWidth: '50%',
        }}
      >
        {(showWhiteboard || onOpenWhiteboard || openWorkspaceTool) && (
          <button
            type="button"
            onClick={(e) => {
              e?.preventDefault?.();
              e?.stopPropagation?.();
              try {
                if (typeof openWorkspaceTool === 'function') {
                  openWorkspaceTool('whiteboard');
                } else if (typeof onOpenWhiteboard === 'function') {
                  onOpenWhiteboard();
                }
              } catch (err) {
                console.error('[MobileHeader] Erreur lors de l\'ouverture du Whiteboard:', err);
              }
            }}
            className="premium-button"
            style={{
              minWidth: '44px',
              minHeight: '44px',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)',
              backgroundColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              color: 'var(--accent-primary, #C67D5B)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            title="Créer ou ouvrir un Tableau Blanc"
            aria-label="Créer un nouveau tableau blanc"
          >
            <Palette size={18} />
          </button>
        )}
        {rightAction || (!showWhiteboard && !onOpenWhiteboard && !openWorkspaceTool ? <div style={{ width: '44px', height: '44px' }} /> : null)}
      </div>
    </header>
  );
}
