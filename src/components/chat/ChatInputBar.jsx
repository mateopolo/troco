import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  Send,
  Sparkles,
  LayoutGrid,
  Plus,
  Paperclip,
  Mic,
  Coins,
  Palette,
  FileText,
  Table,
  Calendar,
  Edit3,
  Check,
  X,
  CornerDownRight,
  Image as ImageIcon,
} from 'lucide-react';
import { haptics } from '../../utils/haptics';

/**
 * ChatInputBar — Composant de saisie isolé et mémoïsé (Phase 63 & 90)
 * Gère son propre état local de saisie pendant la frappe pour garantir un coût de rendu O(1),
 * évitant ainsi le re-rendu de la liste complète des messages dans ChatView.
 */
function ChatInputBar({
  isMobile,
  darkMode,
  t = (k) => k,
  editingMsg = null,
  replyingTo = null,
  onSendMessage,
  handleSendMessage,
  onEditMessage,
  onCancelEdit,
  onCancelReply,
  onTypingChange,
  onOpenDirectTransfer,
  onStartVoiceRecord,
  onOpenWorkspaceTool,
  onOpenWhiteboardPicker,
  onOpenProjectRewards,
  isGroupChat = false,
}) {
  const [localText, setLocalText] = useState(editingMsg ? (editingMsg.text || '') : '');
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const typingTimerRef = useRef(null);
  const imageInputRef = useRef(null);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result;
        if (base64 && typeof onSendMessage === 'function') {
          haptics.success();
          onSendMessage(base64);
        }
      };
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
  };

  // Synchronisation lors de l'activation/désactivation du mode édition
  useEffect(() => {
    if (editingMsg) {
      setLocalText(editingMsg.text || '');
    } else {
      setLocalText('');
    }
  }, [editingMsg]);

  // Gestion de la saisie utilisateur avec debounce pour l'indicateur de frappe
  const handleChange = useCallback((e) => {
    const nextVal = e.target.value;
    setLocalText(nextVal);

    if (onTypingChange) {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      onTypingChange(nextVal);
      typingTimerRef.current = setTimeout(() => {
        onTypingChange('');
      }, 2500);
    }
  }, [onTypingChange]);

  // Soumission finale du message
  const handleSubmit = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmed = localText.trim();
    if (!trimmed) {
      if (typeof handleSendMessage === 'function') {
        handleSendMessage();
      }
      return;
    }

    if (editingMsg && typeof onEditMessage === 'function') {
      onEditMessage(trimmed);
      setLocalText('');
    } else if (typeof handleSendMessage === 'function') {
      handleSendMessage(trimmed);
      setLocalText('');
    } else if (typeof onSendMessage === 'function') {
      onSendMessage(trimmed);
      setLocalText('');
    }

    if (onTypingChange) {
      onTypingChange('');
    }
  }, [localText, editingMsg, onEditMessage, handleSendMessage, onSendMessage, onTypingChange]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape' && editingMsg && onCancelEdit) {
      e.preventDefault();
      onCancelEdit();
    }
  }, [handleSubmit, editingMsg, onCancelEdit]);

  return (
    <div
      style={{
        padding: isMobile ? '8px 10px 10px' : '10px 16px 14px',
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-card)',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.04)',
        position: 'relative',
        zIndex: 50,
      }}
    >
      {/* BANNIÈRE DE RÉPONSE RAPIDE */}
      {replyingTo && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: '12px',
            marginBottom: '8px',
            borderLeft: '4px solid var(--accent-primary)',
            fontSize: '12.5px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
            <CornerDownRight size={14} color="var(--accent-primary)" />
            <span style={{ fontWeight: '700', color: 'var(--text-main)', flexShrink: 0 }}>
              {replyingTo.sender === 'user' ? 'Vous' : (replyingTo.authorName || 'Interlocuteur')} :
            </span>
            <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {replyingTo.text || 'Message'}
            </span>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
            title="Annuler la réponse"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* BANNIÈRE DE MODIFICATION DE MESSAGE */}
      {editingMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            backgroundColor: 'rgba(198, 125, 91, 0.12)',
            borderRadius: '12px',
            marginBottom: '8px',
            borderLeft: '4px solid var(--accent-primary)',
            fontSize: '12.5px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Edit3 size={14} color="var(--accent-primary)" />
            <span style={{ fontWeight: '700', color: 'var(--accent-primary)' }}>Modification du message</span>
          </div>
          <button
            type="button"
            onClick={onCancelEdit}
            style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
            title="Annuler la modification"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* CONTENEUR DE LA BARRE D'INPUT */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '6px' : '8px',
          maxWidth: '680px',
          margin: '0 auto',
          position: 'relative',
        }}
      >
        {/* BOUTON WORKSPACE PREMIUM / OUTILS COLLABORATIFS */}
        {!editingMsg && (
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsWorkspaceMenuOpen((prev) => !prev);
              }}
              className="premium-button"
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: '50%',
                width: '44px',
                height: '44px',
                minWidth: '44px',
                minHeight: '44px',
                backgroundColor: isWorkspaceMenuOpen ? 'var(--accent-primary)' : 'var(--bg-card)',
                color: isWorkspaceMenuOpen ? '#FFF' : 'var(--accent-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-card)',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
              title="Outils Collaboratifs Workspace (Tableau blanc, Documents, Feuilles, Notes)"
            >
              <LayoutGrid size={isMobile ? 16 : 18} />
            </button>

            {/* MENU POPOVER WORKSPACE */}
            {isWorkspaceMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  bottom: '54px',
                  left: 0,
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '20px',
                  padding: '12px',
                  boxShadow: 'var(--shadow-modal)',
                  border: '1px solid var(--border-color)',
                  width: '280px',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  animation: 'fadeSlideUp 0.2s ease-out both',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', borderBottom: '1px solid var(--border-color)', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                    <Sparkles size={13} />
                    <span>WORKSPACE PREMIUM</span>
                  </div>
                  <span style={{ fontSize: '9px', fontWeight: '800', backgroundColor: 'rgba(198, 125, 91, 0.15)', color: 'var(--accent-primary)', padding: '2px 6px', borderRadius: '999px' }}>
                    PRO
                  </span>
                </div>

                {/* 1. TABLEAU BLANC */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsWorkspaceMenuOpen(false);
                    if (onOpenWhiteboardPicker) onOpenWhiteboardPicker();
                  }}
                  className="hover-subtle"
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    borderRadius: '12px',
                    padding: '8px 10px',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: 'rgba(198, 125, 91, 0.15)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Palette size={16} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>Tableau Blanc</span>
                      <span style={{ fontSize: '9px', fontWeight: '800', color: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '1px 5px', borderRadius: '4px' }}>0ms</span>
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Créer un nouveau projet ou reprendre un board</div>
                  </div>
                </button>

                {/* 2. NOTES PARTAGÉES */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsWorkspaceMenuOpen(false);
                    if (onOpenWorkspaceTool) onOpenWorkspaceTool('notes');
                  }}
                  className="hover-subtle"
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    borderRadius: '12px',
                    padding: '8px 10px',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Edit3 size={16} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>Notes Partagées</span>
                      <span style={{ fontSize: '9px', fontWeight: '800', color: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.15)', padding: '1px 5px', borderRadius: '4px' }}>NOTES</span>
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Notes de session & checklist Apple-Style</div>
                  </div>
                </button>

                {/* 3. TROCO DOCS */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsWorkspaceMenuOpen(false);
                    if (onOpenWorkspaceTool) onOpenWorkspaceTool('docs');
                  }}
                  className="hover-subtle"
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    borderRadius: '12px',
                    padding: '8px 10px',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={16} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>Troco Docs</span>
                      <span style={{ fontSize: '9px', fontWeight: '800', color: '#3B82F6', backgroundColor: 'rgba(59, 130, 246, 0.15)', padding: '1px 5px', borderRadius: '4px' }}>DOCS</span>
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Éditeur texte Markdown collaboratif</div>
                  </div>
                </button>

                {/* 4. TROCO SHEETS */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsWorkspaceMenuOpen(false);
                    if (onOpenWorkspaceTool) onOpenWorkspaceTool('sheets');
                  }}
                  className="hover-subtle"
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    borderRadius: '12px',
                    padding: '8px 10px',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Table size={16} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>Troco Sheets</span>
                      <span style={{ fontSize: '9px', fontWeight: '800', color: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '1px 5px', borderRadius: '4px' }}>SHEETS</span>
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Tableur & formules en temps réel</div>
                  </div>
                </button>

                {/* 5. CALENDRIER */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsWorkspaceMenuOpen(false);
                    if (onOpenWorkspaceTool) onOpenWorkspaceTool('calendar');
                  }}
                  className="hover-subtle"
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    borderRadius: '12px',
                    padding: '8px 10px',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: 'rgba(234, 67, 53, 0.15)', color: '#EA4335', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Calendar size={16} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-main)' }}>Planning & Visios HD</div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Calendrier de projet & réunions</div>
                  </div>
                </button>

                {/* 6. TRANSFERT DIRECT DE JETONS */}
                {onOpenDirectTransfer && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsWorkspaceMenuOpen(false);
                      onOpenDirectTransfer();
                    }}
                    className="hover-subtle"
                    style={{
                      border: 'none',
                      backgroundColor: 'transparent',
                      borderRadius: '12px',
                      padding: '8px 10px',
                      minHeight: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Coins size={16} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-main)' }}>Transférer des Jetons</div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Envoi direct de Jetons Troco</div>
                    </div>
                  </button>
                )}

                {/* 7. GESTION DES RÉCOMPENSES JETONS */}
                {isGroupChat && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsWorkspaceMenuOpen(false);
                      if (onOpenProjectRewards) onOpenProjectRewards();
                    }}
                    className="hover-subtle"
                    style={{
                      border: 'none',
                      backgroundColor: 'transparent',
                      borderRadius: '12px',
                      padding: '8px 10px',
                      minHeight: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Coins size={16} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-main)' }}>Rétribution en Jetons</div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Attribuer les gains du projet</div>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* INPUT FICHIER IMAGE CACHÉ */}
        <input
          type="file"
          accept="image/*"
          ref={imageInputRef}
          onChange={handleImageSelect}
          style={{ display: 'none' }}
        />

        {/* BOUTON ENVOI PHOTO / IMAGE */}
        {!editingMsg && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (imageInputRef.current) imageInputRef.current.click();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (imageInputRef.current) imageInputRef.current.click();
            }}
            className="premium-button"
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: '50%',
              width: isMobile ? '40px' : '44px',
              height: isMobile ? '40px' : '44px',
              minWidth: isMobile ? '40px' : '44px',
              minHeight: isMobile ? '40px' : '44px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--accent-primary)',
              cursor: 'pointer',
              display: (isMobile && localText.trim()) ? 'none' : 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-card)',
              flexShrink: 0,
            }}
            title="Envoyer une photo / image"
          >
            <ImageIcon size={isMobile ? 16 : 18} />
          </button>
        )}

        {/* BOUTON TRANSFERT DIRECT DE JETONS (🪙) (Desktop) */}
        {!editingMsg && onOpenDirectTransfer && !isMobile && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDirectTransfer();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenDirectTransfer();
            }}
            className="premium-button"
            style={{
              border: '1.5px solid #F59E0B',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              minWidth: '44px',
              minHeight: '44px',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              color: '#F59E0B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)',
              flexShrink: 0,
              transition: 'transform 0.15s ease',
            }}
            title="Transférer des Jetons Troco instantanément"
          >
            <Coins size={18} />
          </button>
        )}

        {/* BOUTON MICROPHONE / MESSAGE VOCAL (Masqué si texte en cours de frappe sur mobile) */}
        {!editingMsg && onStartVoiceRecord && !localText.trim() && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartVoiceRecord();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onStartVoiceRecord();
            }}
            className="premium-button"
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: '50%',
              width: isMobile ? '40px' : '44px',
              height: isMobile ? '40px' : '44px',
              minWidth: isMobile ? '40px' : '44px',
              minHeight: isMobile ? '40px' : '44px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--accent-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-card)',
              flexShrink: 0,
            }}
            title="Enregistrer une note vocale"
          >
            <Mic size={isMobile ? 16 : 18} />
          </button>
        )}

        {/* CHAMP DE SAISIE DU TEXTE */}
        <input
          type="text"
          value={localText}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={editingMsg ? 'Modifie ton message...' : (t('typeYourMessage') || t('writeToInterlocutor') || 'Écris ton message...')}
          style={{
            flex: 1,
            minWidth: 0,
            padding: isMobile ? '10px 14px' : '11px 16px',
            borderRadius: '24px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-main)',
            fontSize: isMobile ? '16px' : '14px',
            WebkitTextSizeAdjust: '100%',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        {/* BOUTON ENVOYER / SOUMISSION (ACCOMPAGNE DIRECTEMENT L'INPUT À SA DROITE) */}
        <button
          type="button"
          onClick={(e) => {
            if (typeof handleSendMessage === 'function') {
              handleSendMessage(localText);
            }
            handleSubmit(e);
          }}
          onTouchEnd={(e) => {
            if (typeof handleSendMessage === 'function') {
              handleSendMessage(localText);
            }
            handleSubmit(e);
          }}
          className="premium-button"
          style={{
            border: 'none',
            borderRadius: '50%',
            width: isMobile ? '40px' : '44px',
            height: isMobile ? '40px' : '44px',
            minWidth: isMobile ? '40px' : '44px',
            minHeight: isMobile ? '40px' : '44px',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
            color: '#FFF',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-accent)',
            flexShrink: 0,
            transition: 'transform 0.15s ease',
          }}
          title={editingMsg ? 'Valider la modification' : 'Envoyer'}
        >
          {editingMsg ? <Check size={isMobile ? 16 : 18} /> : <Send size={isMobile ? 16 : 18} style={{ transform: 'translateX(-1px)' }} />}
        </button>
      </div>
    </div>
  );
}

export default memo(ChatInputBar);
