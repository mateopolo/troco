import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Globe, Volume2, X, Settings, GripHorizontal, Type, Palette, Sliders } from 'lucide-react';
import { liveTranscriptionService } from '../services/liveTranscriptionService';

const AVAILABLE_LANGUAGES = [
  { code: 'FR', label: 'Français (FR)', flag: '🇫🇷', bcp47: 'fr-FR' },
  { code: 'EN', label: 'English (EN)', flag: '🇬🇧', bcp47: 'en-US' },
  { code: 'ES', label: 'Español (ES)', flag: '🇪🇸', bcp47: 'es-ES' },
  { code: 'IT', label: 'Italiano (IT)', flag: '🇮🇹', bcp47: 'it-IT' },
  { code: 'DE', label: 'Deutsch (DE)', flag: '🇩🇪', bcp47: 'de-DE' },
  { code: 'JA', label: '日本語 (JA)', flag: '🇯🇵', bcp47: 'ja-JP' },
  { code: 'ZH', label: '中文 (ZH)', flag: '🇨🇳', bcp47: 'zh-CN' },
  { code: 'PT', label: 'Português (PT)', flag: '🇵🇹', bcp47: 'pt-PT' },
];

const FONT_SIZES = [
  { id: 'sm', label: 'Petite', px: 15, lineHeight: 1.4 },
  { id: 'md', label: 'Standard', px: 18, lineHeight: 1.45 },
  { id: 'lg', label: 'Cinéma', px: 22, lineHeight: 1.45 },
  { id: 'xl', label: 'Grande', px: 26, lineHeight: 1.4 },
];

const FONT_COLORS = [
  { id: 'white', label: 'Blanc Cinéma', hex: '#FFFFFF', shadow: '0 2px 6px rgba(0,0,0,0.95), 0 0 12px rgba(0,0,0,0.85)' },
  { id: 'yellow', label: 'Jaune Sous-titre', hex: '#FDE047', shadow: '0 2px 6px rgba(0,0,0,0.95), 0 0 12px rgba(0,0,0,0.85)' },
  { id: 'cyan', label: 'Cyan Lumineux', hex: '#38BDF8', shadow: '0 2px 6px rgba(0,0,0,0.95), 0 0 12px rgba(0,0,0,0.85)' },
  { id: 'green', label: 'Vert Menthe', hex: '#4ADE80', shadow: '0 2px 6px rgba(0,0,0,0.95), 0 0 12px rgba(0,0,0,0.85)' },
];

const BG_STYLES = [
  { id: 'cinema', label: 'Bandeau Cinéma (Flou)', bg: 'rgba(0, 0, 0, 0.48)', blur: '10px', border: '1px solid rgba(255, 255, 255, 0.12)' },
  { id: 'transparent', label: 'Transparent (Ombre Seule)', bg: 'transparent', blur: 'none', border: 'none' },
  { id: 'contrast', label: 'Sombre Contrasté', bg: 'rgba(8, 8, 8, 0.88)', blur: '14px', border: '1px solid rgba(255, 255, 255, 0.2)' },
];

export default function LiveCallSubtitles({
  isActive = true,
  currentLang = 'FR',
  speakerName = 'Interlocuteur',
  isCompact = false,
}) {
  const [subtitle, setSubtitle] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Préférences utilisateur persistées
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('troco_subtitles_settings');
      return saved ? JSON.parse(saved) : {
        targetLang: currentLang || 'FR',
        fontSize: 'lg',
        fontColor: 'white',
        bgStyle: 'cinema',
        showDual: true,
      };
    } catch (_) {
      return {
        targetLang: currentLang || 'FR',
        fontSize: 'lg',
        fontColor: 'white',
        bgStyle: 'cinema',
        showDual: true,
      };
    }
  });

  // Position drag & drop
  const [posOffset, setPosOffset] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });
  const containerRef = useRef(null);

  // Sauvegarde des préférences
  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => {
      const merged = { ...prev, ...newSettings };
      try {
        localStorage.setItem('troco_subtitles_settings', JSON.stringify(merged));
      } catch (_) {}
      return merged;
    });
  }, []);

  useEffect(() => {
    if (!isActive) {
      liveTranscriptionService.stopListening();
      setSubtitle(null);
      return;
    }

    const bcpLang = AVAILABLE_LANGUAGES.find(l => l.code === settings.targetLang)?.bcp47 || 'fr-FR';
    liveTranscriptionService.startListening('fr-FR', bcpLang);

    const unsubscribe = liveTranscriptionService.subscribe((data) => {
      setSubtitle(data);
    });

    return () => {
      unsubscribe();
      liveTranscriptionService.stopListening();
    };
  }, [isActive, settings.targetLang]);

  // DRAG AND DROP AVEC POINTER EVENTS
  const handlePointerDown = (e) => {
    // Ne pas drag si clic sur bouton d'action ou settings
    if (e.target.closest('button') || e.target.closest('.subtitles-settings-popover')) return;

    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startX: posOffset.x,
      startY: posOffset.y,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPosOffset({
      x: dragStartRef.current.startX + dx,
      y: dragStartRef.current.startY + dy,
    });
  };

  const handlePointerUp = (e) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  if (!isActive) return null;

  const currentFontSize = FONT_SIZES.find(s => s.id === settings.fontSize) || FONT_SIZES[2];
  const currentFontColor = FONT_COLORS.find(c => c.id === settings.fontColor) || FONT_COLORS[0];
  const currentBgStyle = BG_STYLES.find(b => b.id === settings.bgStyle) || BG_STYLES[0];

  const translatedText = subtitle?.translatedText || subtitle?.originalText || '';
  const originalText = subtitle?.originalText || '';
  const isDifferent = originalText && translatedText && originalText.trim().toLowerCase() !== translatedText.trim().toLowerCase();

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 50,
        overflow: 'hidden',
      }}
    >
      {/* CONTENEUR CINÉMA POSITIONNABLE */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: 'absolute',
          bottom: isCompact ? '60px' : '95px',
          left: '50%',
          transform: `translate(calc(-50% + ${posOffset.x}px), ${posOffset.y}px)`,
          maxWidth: isCompact ? '92%' : '840px',
          width: '92%',
          pointerEvents: 'auto',
          touchAction: 'none',
          cursor: isDraggingRef.current ? 'grabbing' : 'grab',
          userSelect: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: 'fadeIn 0.25s ease',
        }}
      >
        {/* BANDEAU DE CONTRÔLE SUPÉRIEUR DISCRET */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '2px 8px',
            marginBottom: '4px',
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: '11px',
            fontWeight: '700',
          }}
        >
          {/* NOM DU LOCUTEUR AVEC VOYANT LIVE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(8px)', padding: '3px 8px', borderRadius: '999px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 8px #10B981', animation: 'pulse 1.5s infinite' }} />
            <Volume2 size={12} color="#FBBF24" />
            <span style={{ textShadow: '0 1px 2px #000' }}>{subtitle?.speaker || speakerName}</span>
          </div>

          {/* POIGNÉE DE DRAG & BOUTONS PARAMÈTRES / FERMETURE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div
              title="Glisser pour déplacer les sous-titres"
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(8px)',
                padding: '3px 6px',
                borderRadius: '999px',
                color: 'rgba(255, 255, 255, 0.75)',
                cursor: 'grab',
              }}
            >
              <GripHorizontal size={13} />
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowSettings(s => !s);
              }}
              style={{
                border: 'none',
                backgroundColor: showSettings ? 'var(--accent-primary, #C67D5B)' : 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(8px)',
                color: '#FFFFFF',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Paramètres des sous-titres (police, couleur, langue)"
            >
              <Settings size={12} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSubtitle(null);
              }}
              style={{
                border: 'none',
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(8px)',
                color: 'rgba(255, 255, 255, 0.75)',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Masquer le sous-titre actuel"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {/* CADRE SOUS-TITRES STYLE CINÉMA */}
        <div
          style={{
            width: '100%',
            backgroundColor: currentBgStyle.bg,
            backdropFilter: currentBgStyle.blur !== 'none' ? `blur(${currentBgStyle.blur})` : 'none',
            WebkitBackdropFilter: currentBgStyle.blur !== 'none' ? `blur(${currentBgStyle.blur})` : 'none',
            borderRadius: '20px',
            padding: isCompact ? '10px 14px' : '14px 22px',
            border: currentBgStyle.border,
            boxShadow: currentBgStyle.bg !== 'transparent' ? '0 12px 36px rgba(0, 0, 0, 0.55)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        >
          {/* PHRASE PRINCIPALE TRADUITE OU DIRECTE */}
          <div
            style={{
              fontSize: isCompact ? `${Math.max(13, currentFontSize.px - 3)}px` : `${currentFontSize.px}px`,
              lineHeight: currentFontSize.lineHeight,
              fontWeight: '700',
              color: currentFontColor.hex,
              letterSpacing: '0.015em',
              textShadow: currentFontColor.shadow,
              wordBreak: 'break-word',
              transition: 'all 0.2s ease',
            }}
          >
            {translatedText || (
              <span style={{ opacity: 0.65, fontStyle: 'italic', fontSize: '13px' }}>
                🎙️ En écoute de la voix pour la transcription live cinéma...
              </span>
            )}
          </div>

          {/* DUAL SUBTITLES : TEXTE ORIGINAL ENVOYÉ EN PETIT SOUS LA TRADUCTION */}
          {settings.showDual && isDifferent && (
            <div
              style={{
                fontSize: isCompact ? '10.5px' : '12.5px',
                fontWeight: '500',
                color: 'rgba(255, 255, 255, 0.78)',
                letterSpacing: '0.01em',
                textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                paddingTop: '4px',
                marginTop: '2px',
              }}
            >
              {originalText}
            </div>
          )}
        </div>

        {/* POPOVER / MODALE FLOTTANTE DE PARAMÈTRES (ENGRENAGE) */}
        {showSettings && (
          <div
            className="subtitles-settings-popover"
            onClick={(e) => e.stopPropagation()}
            style={{
              marginTop: '8px',
              backgroundColor: 'rgba(18, 16, 14, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '20px',
              padding: '16px 18px',
              color: '#FAF7F2',
              width: '100%',
              maxWidth: '460px',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              animation: 'fadeSlideUp 0.2s ease both',
              cursor: 'default',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.12)', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', fontSize: '13px' }}>
                <Sliders size={15} color="var(--accent-primary, #C67D5B)" />
                <span>Paramètres Sous-titres Cinéma</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer',
                  padding: '2px',
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* 1. LANGUE CIBLE */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Globe size={12} />
                <span>Langue de traduction en direct :</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                {AVAILABLE_LANGUAGES.map((lang) => {
                  const isSelected = settings.targetLang === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => updateSettings({ targetLang: lang.code })}
                      style={{
                        border: isSelected ? '1px solid var(--accent-primary, #C67D5B)' : '1px solid rgba(255, 255, 255, 0.1)',
                        backgroundColor: isSelected ? 'var(--accent-primary, #C67D5B)' : 'rgba(255, 255, 255, 0.08)',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        padding: '6px 4px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.code}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. TAILLE DE LA POLICE */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Type size={12} />
                <span>Taille du texte :</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                {FONT_SIZES.map((size) => {
                  const isSelected = settings.fontSize === size.id;
                  return (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => updateSettings({ fontSize: size.id })}
                      style={{
                        border: isSelected ? '1px solid var(--accent-primary, #C67D5B)' : '1px solid rgba(255, 255, 255, 0.1)',
                        backgroundColor: isSelected ? 'var(--accent-primary, #C67D5B)' : 'rgba(255, 255, 255, 0.08)',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        padding: '6px 4px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      {size.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. COULEUR DE LA POLICE */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Palette size={12} />
                <span>Couleur des sous-titres :</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                {FONT_COLORS.map((col) => {
                  const isSelected = settings.fontColor === col.id;
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => updateSettings({ fontColor: col.id })}
                      style={{
                        border: isSelected ? '2px solid #FFFFFF' : '1px solid rgba(255, 255, 255, 0.15)',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: '8px',
                        padding: '6px 4px',
                        fontSize: '10.5px',
                        fontWeight: '800',
                        color: col.hex,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: col.hex }} />
                      <span>{col.label.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. STYLE DU FOND */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '6px' }}>
                Arrière-plan :
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                {BG_STYLES.map((bg) => {
                  const isSelected = settings.bgStyle === bg.id;
                  return (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => updateSettings({ bgStyle: bg.id })}
                      style={{
                        border: isSelected ? '1px solid var(--accent-primary, #C67D5B)' : '1px solid rgba(255, 255, 255, 0.1)',
                        backgroundColor: isSelected ? 'var(--accent-primary, #C67D5B)' : 'rgba(255, 255, 255, 0.08)',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        padding: '6px 4px',
                        fontSize: '10.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      {bg.label.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. RÉINITIALISATION POSITION */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.12)' }}>
              <button
                type="button"
                onClick={() => setPosOffset({ x: 0, y: 0 })}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--accent-primary, #C67D5B)',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                📍 Recentrer les sous-titres
              </button>

              <button
                type="button"
                onClick={() => setShowSettings(false)}
                style={{
                  border: 'none',
                  backgroundColor: 'var(--accent-primary, #C67D5B)',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: '800',
                  borderRadius: '999px',
                  padding: '5px 14px',
                  cursor: 'pointer',
                }}
              >
                Terminé
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
