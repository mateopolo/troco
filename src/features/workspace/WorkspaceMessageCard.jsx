/**
 * WorkspaceMessageCard.jsx — Carte Interactive Workspace pour les messages de chat
 * Rendu visuel haut de gamme (Glassmorphism, Preview Canvas, Badge de Version V1/V2/V3).
 * Support tactile Apple HIG (44px min touch target, bypass Safari/Chrome Mobile).
 */

import React from 'react';
import { Palette, FileText, Table, Sparkles, ArrowRight, Layers } from 'lucide-react';

export default function WorkspaceMessageCard({
  msg,
  isMine = false,
  isMobile = false,
  onOpenWorkspace,
  darkMode = false,
}) {
  const wType = msg.workspaceType || 'whiteboard';
  const versionNumber = Number(msg.version) || 1;
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
    <FileText size={18} />
  ) : isDocs ? (
    <FileText size={18} />
  ) : isSheets ? (
    <Table size={18} />
  ) : (
    <Palette size={18} />
  );

  const typeLabel = isNotes
    ? 'Notes Partagées'
    : isDocs
      ? 'Troco Doc'
      : isSheets
        ? 'Troco Sheet'
        : 'Tableau Blanc';

  const handleCardClick = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (typeof onOpenWorkspace === 'function') {
      onOpenWorkspace({
        type: wType,
        workspaceId: msg.workspaceId || msg.boardId,
        boardId: msg.workspaceId || msg.boardId,
        title: msg.workspaceTitle || typeLabel,
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
        margin: '10px 0',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: isMobile ? '94%' : '78%',
          maxWidth: '480px',
          border: `1.5px solid ${accentColor}`,
          borderRadius: '22px',
          padding: isMobile ? '14px' : '18px',
          backgroundColor: 'var(--bg-card, #FFFFFF)',
          boxShadow: 'var(--shadow-card, 0 8px 30px rgba(0, 0, 0, 0.08))',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease',
        }}
      >
        {/* EN-TÊTE DE LA CARTE AVEC BADGE DE VERSION */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                backgroundColor: `${accentColor}22`,
                color: accentColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {typeIcon}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: '800',
                  color: 'var(--text-main, #1F2937)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {msg.workspaceTitle || typeLabel}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary, #6B7280)' }}>
                Par {msg.senderName || (isMine ? 'Vous' : 'Collaborateur')}
              </div>
            </div>
          </div>

          {/* BADGE DE VERSION V1 / V2 / V3 */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: `${accentColor}18`,
              color: accentColor,
              border: `1px solid ${accentColor}44`,
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '11.5px',
              fontWeight: '900',
              flexShrink: 0,
            }}
          >
            <Layers size={12} />
            <span>V{versionNumber}</span>
          </div>
        </div>

        {/* APERÇU MINIATURE CANVAS (SI PRÉSENT) */}
        {msg.previewUrl ? (
          <div
            style={{
              width: '100%',
              height: isMobile ? '140px' : '170px',
              borderRadius: '14px',
              overflow: 'hidden',
              marginBottom: '12px',
              border: '1px solid var(--border-color, rgba(0, 0, 0, 0.08))',
              backgroundColor: darkMode ? '#181513' : '#F9F6F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <img
              src={msg.previewUrl}
              alt="Aperçu Workspace"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '6px',
                right: '8px',
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                color: '#FFFFFF',
                fontSize: '10px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '6px',
              }}
            >
              Aperçu V{versionNumber}
            </div>
          </div>
        ) : (
          <p
            style={{
              margin: '0 0 14px 0',
              fontSize: '12px',
              color: 'var(--text-secondary, #6B7280)',
              lineHeight: 1.45,
            }}
          >
            {isWhiteboard
              ? 'Session de dessin et schémas vectoriels temps réel. Cliquez pour reprendre et enrichir la version actuelle.'
              : 'Espace de travail collaboratif synchronisé. Cliquez pour rejoindre en direct.'}
          </p>
        )}

        {/* BOUTON D'ACTION PRINCIPALE — APPLE HIG TOUCH TARGET (44px MIN) */}
        <button
          type="button"
          onClick={handleCardClick}
          onTouchEnd={handleCardClick}
          className="premium-button"
          style={{
            width: '100%',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 16px',
            minHeight: '44px',
            background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%)`,
            color: '#FFFFFF',
            fontSize: '12.5px',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: 'var(--shadow-accent, 0 4px 14px rgba(198, 125, 91, 0.3))',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <Sparkles size={15} />
          <span>Ouvrir & Éditer ({versionNumber > 1 ? `Reprendre V${versionNumber}` : 'Session Directe'})</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
