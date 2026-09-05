import React from 'react';
import { Palette, Phone, Video, ArrowLeft } from 'lucide-react';

/**
 * ChatHeader.jsx — En-tête du chat avec accès rapide aux outils de collaboration (Tableau blanc, appels audio/vidéo)
 * Conforme à la Phase Fix : relié directement à openWorkspaceTool('whiteboard') sans bouton mort.
 */
export default function ChatHeader({
  activeChat = null,
  selectedChat = null,
  isMobile = false,
  darkMode = false,
  onBack = null,
  onOpenWhiteboard = null,
  openWorkspaceTool = null,
  startCall = null,
  rightActions = null,
}) {
  const currentChat = activeChat || selectedChat;

  const handleWhiteboardClick = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    try {
      if (typeof openWorkspaceTool === 'function') {
        openWorkspaceTool('whiteboard');
      } else if (typeof onOpenWhiteboard === 'function') {
        onOpenWhiteboard();
      }
    } catch (err) {
      console.error('[ChatHeader] Erreur lors de l\'ouverture du Whiteboard:', err);
    }
  };

  const handleCallClick = (type) => (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    try {
      if (typeof startCall === 'function') {
        startCall(type);
      }
    } catch (err) {
      console.error(`[ChatHeader] Erreur lors de l'appel ${type}:`, err);
    }
  };

  return (
    <header
      className="chat-header-container"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '8px 12px' : '12px 20px',
        borderBottom: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
        backgroundColor: darkMode ? '#12100E' : '#FFFFFF',
        minHeight: '56px',
        boxSizing: 'border-box',
        width: '100%',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        {isMobile && typeof onBack === 'function' && (
          <button
            type="button"
            onClick={onBack}
            className="premium-button"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-main, inherit)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label="Retour"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div style={{ minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontSize: '15px',
              fontWeight: '800',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {currentChat?.user || currentChat?.name || currentChat?.projectTitle || 'Conversation'}
          </h2>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {/* BOUTON CRÉER UN NOUVEAU TABLEAU BLANC / WHITEBOARD */}
        <button
          type="button"
          onClick={handleWhiteboardClick}
          className="premium-button"
          style={{
            border: '1px solid var(--border-color, rgba(198,125,91,0.3))',
            borderRadius: isMobile ? '50%' : '999px',
            width: isMobile ? '44px' : 'auto',
            height: '44px',
            minWidth: '44px',
            minHeight: '44px',
            padding: isMobile ? '0' : '0 12px',
            backgroundColor: 'var(--bg-subtle, rgba(198,125,91,0.08))',
            color: 'var(--accent-primary, #C67D5B)',
            fontWeight: '700',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
          title="Créer un nouveau tableau blanc"
          aria-label="Créer un nouveau tableau blanc"
        >
          <Palette size={16} />
          {!isMobile && <span>Whiteboard</span>}
        </button>

        {typeof startCall === 'function' && (
          <>
            <button
              type="button"
              onClick={handleCallClick('audio')}
              className="premium-button"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: 'var(--bg-subtle, rgba(0,0,0,0.05))',
                color: 'var(--text-main, inherit)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Appel audio"
              aria-label="Appel audio"
            >
              <Phone size={16} />
            </button>
            <button
              type="button"
              onClick={handleCallClick('video')}
              className="premium-button"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: 'var(--bg-subtle, rgba(0,0,0,0.05))',
                color: 'var(--text-main, inherit)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Appel vidéo"
              aria-label="Appel vidéo"
            >
              <Video size={16} />
            </button>
          </>
        )}
        {rightActions}
      </div>
    </header>
  );
}
