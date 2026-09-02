/**
 * WorkspaceMessageCard.jsx — Carte Média Interactive Workspace pour les messages de chat
 * Refonte Visuelle Phase 16 : Conteneur structuré façon WhatsApp/iMessage
 * - Haut de la carte : Image previewUrl (object-fit: contain, fond sombre avec grille subtile)
 * - Bas de la carte : Encart avec le nom du tableau + badge statut
 * - Bouton compact : Icône <Palette size={16} /> et texte "Ouvrir" ou "Rejoindre"
 * - Clic sur le composant global ou sur le bouton déclenche l'ouverture de la modale openWhiteboard(msg.boardId)
 */

import React from 'react';
import { Palette, FileText, Table } from 'lucide-react';

export default function WorkspaceMessageCard({
  msg = {},
  isMine = false,
  isMobile = false,
  onOpenWorkspace,
  darkMode = false,
}) {
  const wType = msg.workspaceType || 'whiteboard';
  const versionNumber = Number(msg.version?.toString().replace(/\D/g, '')) || 1;
  const isNotes = wType === 'notes';
  const isDocs = wType === 'docs';
  const isSheets = wType === 'sheets';
  const isWhiteboard = !isNotes && !isDocs && !isSheets;

  const accentColor = isNotes
    ? '#F59E0B'
    : isDocs
      ? '#3B82F6'
      : isSheets
        ? '#10B981'
        : 'var(--accent-primary, #C67D5B)';

  const typeIcon = isNotes ? (
    <FileText size={16} />
  ) : isDocs ? (
    <FileText size={16} />
  ) : isSheets ? (
    <Table size={16} />
  ) : (
    <Palette size={16} />
  );

  const displayTitle = msg.workspaceTitle || msg.title || (isWhiteboard ? 'Tableau Blanc collaboratif' : isNotes ? 'Notes Partagées' : isDocs ? 'Troco Doc' : 'Troco Sheet');
  const buttonLabel = isMine ? 'Ouvrir' : 'Rejoindre';

  const handleCardClick = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (typeof onOpenWorkspace === 'function') {
      onOpenWorkspace({
        type: wType,
        workspaceId: msg.workspaceId || msg.boardId,
        boardId: msg.boardId || msg.workspaceId,
        title: displayTitle,
        version: versionNumber,
      });
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isMine ? 'flex-end' : 'flex-start',
        width: '100%',
        margin: '6px 0',
        boxSizing: 'border-box',
      }}
    >
      <div
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleCardClick(e);
          }
        }}
        style={{
          width: '100%',
          maxWidth: isMobile ? '290px' : '320px',
          minHeight: isMobile ? '220px' : '240px',
          borderRadius: '16px',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-color, rgba(0, 0, 0, 0.08))',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.07)',
          cursor: 'pointer',
          transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s ease',
          boxSizing: 'border-box',
          userSelect: 'none',
          outline: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 4px 18px rgba(0, 0, 0, 0.07)';
        }}
      >
        {/* HAUT DE LA CARTE : APERÇU MEDIA (IMAGE BASE64 OU SNIPPET TEXTUEL LÉGER) */}
        <div
          style={{
            width: '100%',
            height: isMobile ? '145px' : '160px',
            minHeight: isMobile ? '145px' : '160px',
            backgroundColor: darkMode ? '#12100E' : '#181513',
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px)',
            backgroundSize: '14px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {isWhiteboard && (msg.thumbnailBase64 || msg.previewUrl) ? (
            <img
              src={msg.thumbnailBase64 || msg.previewUrl}
              alt={displayTitle}
              loading="eager"
              decoding="async"
              style={{
                width: '100%',
                height: '100%',
                minHeight: isMobile ? '145px' : '160px',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          ) : (msg.snippet || msg.summary) ? (
            <div
              style={{
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                height: '100%',
                width: '100%',
                boxSizing: 'border-box',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: accentColor, fontSize: '11.5px', fontWeight: '800' }}>
                {typeIcon}
                <span>{isNotes ? 'Note Partagée' : isDocs ? 'Troco Docs' : isSheets ? 'Troco Sheets' : 'Workspace'}</span>
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.78)',
                  fontStyle: 'italic',
                  lineHeight: 1.45,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                "{msg.snippet || msg.summary}"
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: 'rgba(255, 255, 255, 0.45)',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: accentColor,
                }}
              >
                {typeIcon}
              </div>
              <span style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.6)' }}>
                {displayTitle}
              </span>
            </div>
          )}

          {/* BADGE DE VERSION DISCRET EN COIN SUPÉRIEUR */}
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              color: '#FFFFFF',
              fontSize: '10px',
              fontWeight: '800',
              padding: '3px 8px',
              borderRadius: '999px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#10B981' }} />
            <span>V{versionNumber}</span>
          </div>
        </div>

        {/* BAS DE LA CARTE : ENCART AVEC NOM DU TABLEAU + BOUTON COMPACT & ÉLÉGANT */}
        <div
          style={{
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            backgroundColor: 'var(--bg-card, #FFFFFF)',
          }}
        >
          {/* NOM DU TABLEAU ET AUTEUR */}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: '800',
                color: 'var(--text-main, #1F2937)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.3,
              }}
              title={displayTitle}
            >
              {displayTitle}
            </div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-secondary, #6B7280)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginTop: '1px',
              }}
            >
              {msg.senderName ? `Par ${msg.senderName}` : isMine ? 'Par Vous' : 'Tableau partagé'}
            </div>
          </div>

          {/* LE BOUTON COMPACT AVEC ICÔNE PALETTE ET TEXTE "OUVRIR" / "REJOINDRE" */}
          <button
            type="button"
            onClick={handleCardClick}
            className="premium-button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, var(--accent-primary, #C67D5B) 0%, var(--accent-primary-hover, #A8644A) 100%)',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(198, 125, 91, 0.28)',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              transition: 'transform 0.12s ease, opacity 0.12s ease',
            }}
          >
            {typeIcon}
            <span>{buttonLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

