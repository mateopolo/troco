import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Globe, Volume2, X, Settings, GripHorizontal, Type,
  Palette, Sliders, Mic
} from 'lucide-react';
import { liveTranscriptionService } from '../services/liveTranscriptionService';

const AVAILABLE_LANGUAGES = [
  { code: 'FR', label: 'Français', flag: '🇫🇷', bcp47: 'fr-FR' },
  { code: 'EN', label: 'English', flag: '🇬🇧', bcp47: 'en-US' },
  { code: 'ES', label: 'Español', flag: '🇪🇸', bcp47: 'es-ES' },
  { code: 'IT', label: 'Italiano', flag: '🇮🇹', bcp47: 'it-IT' },
  { code: 'DE', label: 'Deutsch', flag: '🇩🇪', bcp47: 'de-DE' },
  { code: 'JA', label: '日本語', flag: '🇯🇵', bcp47: 'ja-JP' },
  { code: 'ZH', label: '中文', flag: '🇨🇳', bcp47: 'zh-CN' },
  { code: 'PT', label: 'Português', flag: '🇵🇹', bcp47: 'pt-PT' },
];

const FONT_SIZES = [
  { id: 'sm', label: 'Petite', px: 15, lineHeight: 1.4 },
  { id: 'md', label: 'Standard', px: 18, lineHeight: 1.45 },
  { id: 'lg', label: 'Cinéma', px: 22, lineHeight: 1.45 },
  { id: 'xl', label: 'Grande', px: 26, lineHeight: 1.4 },
];

const FONT_COLORS = [
  { id: 'white', label: 'Blanc Cinéma', hex: '#FFFFFF', shadow: '0 2px 8px rgba(0,0,0,0.95), 0 0 16px rgba(0,0,0,0.9)' },
  { id: 'yellow', label: 'Jaune Sous-titre', hex: '#FDE047', shadow: '0 2px 8px rgba(0,0,0,0.95), 0 0 16px rgba(0,0,0,0.9)' },
  { id: 'cyan', label: 'Cyan Lumineux', hex: '#38BDF8', shadow: '0 2px 8px rgba(0,0,0,0.95), 0 0 16px rgba(0,0,0,0.9)' },
  { id: 'green', label: 'Vert Menthe', hex: '#4ADE80', shadow: '0 2px 8px rgba(0,0,0,0.95), 0 0 16px rgba(0,0,0,0.9)' },
];

const BG_STYLES = [
  { id: 'cinema', label: 'Bandeau Cinéma', bg: 'rgba(10, 8, 7, 0.65)', blur: '14px', border: '1px solid rgba(255, 255, 255, 0.12)' },
  { id: 'transparent', label: 'Transparent', bg: 'transparent', blur: 'none', border: 'none' },
  { id: 'contrast', label: 'Sombre Contrasté', bg: 'rgba(0, 0, 0, 0.88)', blur: '18px', border: '1px solid rgba(255, 255, 255, 0.22)' },
];

export default function LiveCallSubtitles({
  isActive = true,
  currentLang = 'FR',
  speakerName = 'Interlocuteur',
  isCompact = false,
}) {
  const [currentSubtitle, setCurrentSubtitle] = useState(null);
  const [recentSentences, setRecentSentences] = useState([]);
  const [showSettings, setShowSettings] = useState(false);

  // État local isolé de la traduction d'appel (découplé du state global de l'application)
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('troco_subtitles_settings_v2');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (_) {}

    return {
      sourceLang: 'FR',
      targetLang: currentLang || 'EN',
      fontSize: 'lg',
      fontColor: 'white',
      bgStyle: 'cinema',
      showDual: true,
    };
  });

  // Position drag & drop
  const [posOffset, setPosOffset] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });
  const containerRef = useRef(null);

  // Sauvegarde des préférences locales uniquement
  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => {
      const merged = { ...prev, ...newSettings };
      try {
        localStorage.setItem('troco_subtitles_settings_v2', JSON.stringify(merged));
      } catch (_) {}
      return merged;
    });
  }, []);

  // Synchronisation avec le moteur de transcription en direct
  useEffect(() => {
    if (!isActive) {
      liveTranscriptionService.stopListening();
      setCurrentSubtitle(null);
      setRecentSentences([]);
      return;
    }

    const sourceBcp = AVAILABLE_LANGUAGES.find(l => l.code === settings.sourceLang)?.bcp47 || 'fr-FR';
    const targetCode = settings.targetLang || 'FR';

    liveTranscriptionService.startListening(sourceBcp, targetCode, speakerName);

    const unsubscribe = liveTranscriptionService.subscribe((data) => {
      setCurrentSubtitle(data);
      if (data.isFinal && data.translatedText) {
        setRecentSentences(prev => {
          const next = [...prev, data.translatedText];
          return next.slice(-2); // Conserve les 2 phrases les plus récentes pour un défilement cinéma fluide
        });
      }
    });

    return () => {
      unsubscribe();
      liveTranscriptionService.stopListening();
    };
  }, [isActive, settings.sourceLang, settings.targetLang, speakerName]);

  // DRAG AND DROP AVEC POINTER EVENTS
  const handlePointerDown = (e) => {
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

  const sourceLangObj = AVAILABLE_LANGUAGES.find(l => l.code === settings.sourceLang) || AVAILABLE_LANGUAGES[0];
  const targetLangObj = AVAILABLE_LANGUAGES.find(l => l.code === settings.targetLang) || AVAILABLE_LANGUAGES[1];

  const activeTranslation = currentSubtitle?.translatedText || currentSubtitle?.originalText || '';
  const activeOriginal = currentSubtitle?.originalText || '';
  const isDifferent = activeOriginal && activeTranslation && activeOriginal.trim().toLowerCase() !== activeTranslation.trim().toLowerCase();

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 100,
        overflow: 'hidden',
      }}
    >
      {/* BANDEAU CINÉMA FLOTTANT & POSITIONNABLE */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: 'absolute',
          bottom: isCompact ? '70px' : 'max(106px, calc(env(safe-area-inset-bottom, 32px) + 74px))',
          left: '50%',
          transform: `translate(calc(-50% + ${posOffset.x}px), ${posOffset.y}px)`,
          maxWidth: isCompact ? '94%' : '900px',
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
        {/* BARRE SUPÉRIEURE D'ÉTAT DU FLUX AUDIO (DISCRÈTE & FLUIDE) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '2px 10px',
            marginBottom: '4px',
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '11px',
            fontWeight: '700',
          }}
        >
          {/* LOCUTEUR + PAIRE DE LANGUES D'APPEL */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(10px)',
              padding: '3px 10px',
              borderRadius: '999px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 8px #10B981', animation: 'pulse 1.5s infinite' }} />
            <Volume2 size={12} color="#FBBF24" />
            <span style={{ textShadow: '0 1px 2px #000' }}>{currentSubtitle?.speaker || speakerName}</span>
            <span style={{ color: 'rgba(255, 255, 255, 0.4)', margin: '0 2px' }}>•</span>
            <span style={{ color: 'var(--accent-primary, #C67D5B)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              {sourceLangObj.flag} ➔ {targetLangObj.flag}
            </span>
          </div>

          {/* POIGNÉE DE DÉPLACEMENT + ENGRENAGE PARAMÈTRES + FERMER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div
              title="Glisser pour déplacer les sous-titres"
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(8px)',
                padding: '4px 6px',
                borderRadius: '999px',
                color: 'rgba(255, 255, 255, 0.75)',
                cursor: 'grab',
                border: '1px solid rgba(255, 255, 255, 0.1)',
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
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backgroundColor: showSettings ? 'var(--accent-primary, #C67D5B)' : 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(8px)',
                color: '#FFFFFF',
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Paramètres de traduction live & sous-titres"
            >
              <Settings size={13} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentSubtitle(null);
                setRecentSentences([]);
              }}
              style={{
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(8px)',
                color: 'rgba(255, 255, 255, 0.75)',
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Masquer le sous-titre actuel"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* CADRE SOUS-TITRES STYLE CINÉMA LARGE & FLUIDE */}
        <div
          style={{
            width: '100%',
            backgroundColor: currentBgStyle.bg,
            backdropFilter: currentBgStyle.blur !== 'none' ? `blur(${currentBgStyle.blur})` : 'none',
            WebkitBackdropFilter: currentBgStyle.blur !== 'none' ? `blur(${currentBgStyle.blur})` : 'none',
            borderRadius: '22px',
            padding: isCompact ? '10px 16px' : '16px 26px',
            border: currentBgStyle.border,
            boxShadow: currentBgStyle.bg !== 'transparent' ? '0 16px 40px rgba(0, 0, 0, 0.6)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        >
          {/* HISTORIQUE PRÉCÉDENT EN DÉFILÉ SUBTIL */}
          {recentSentences.length > 1 && !activeTranslation && (
            <div style={{ fontSize: isCompact ? '11px' : '13px', opacity: 0.6, color: currentFontColor.hex, fontStyle: 'italic', marginBottom: '2px' }}>
              {recentSentences[recentSentences.length - 2]}
            </div>
          )}

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
              transition: 'all 0.15s ease',
            }}
          >
            {activeTranslation ? (
              <span>{activeTranslation}</span>
            ) : (
              <span style={{ opacity: 0.7, fontStyle: 'italic', fontSize: isCompact ? '12px' : '13.5px', color: '#FFFFFF' }}>
                🎙️ En écoute ({sourceLangObj.label} ➔ Traduction en {targetLangObj.label})...
              </span>
            )}
          </div>

          {/* DUAL SUBTITLES : TEXTE ORIGINAL SOURCE EN PLUS PETIT */}
          {settings.showDual && isDifferent && (
            <div
              style={{
                fontSize: isCompact ? '11px' : '13px',
                fontWeight: '500',
                color: 'rgba(255, 255, 255, 0.8)',
                letterSpacing: '0.01em',
                textShadow: '0 1px 3px rgba(0,0,0,0.95)',
                borderTop: '1px solid rgba(255, 255, 255, 0.15)',
                paddingTop: '6px',
                marginTop: '2px',
              }}
            >
              <span style={{ opacity: 0.65, marginRight: '4px' }}>[{sourceLangObj.code}]:</span>
              <span>{activeOriginal}</span>
            </div>
          )}
        </div>

        {/* POPOVER / MODALE FLOTTANTE DE RÉGLAGES (ENGRENAGE) */}
        {showSettings && (
          <div
            className="subtitles-settings-popover"
            onClick={(e) => e.stopPropagation()}
            style={{
              marginTop: '10px',
              backgroundColor: 'rgba(18, 16, 14, 0.96)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '24px',
              padding: '18px 20px',
              color: '#FAF7F2',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.75)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              animation: 'fadeSlideUp 0.2s ease both',
              cursor: 'default',
              boxSizing: 'border-box',
            }}
          >
            {/* HEADER SETTINGS */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.12)', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '13.5px' }}>
                <Sliders size={16} color="var(--accent-primary, #C67D5B)" />
                <span>Paramètres Traduction Live & Sous-titres</span>
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
                <X size={15} />
              </button>
            </div>

            {/* 1. LANGUE PARLÉE (SOURCE) */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255, 255, 255, 0.75)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Mic size={12} color="#10B981" />
                <span>Langue parlée par l'interlocuteur (Micro) :</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px' }}>
                {AVAILABLE_LANGUAGES.map((lang) => {
                  const isSelected = settings.sourceLang === lang.code;
                  return (
                    <button
                      key={`src-${lang.code}`}
                      type="button"
                      onClick={() => updateSettings({ sourceLang: lang.code })}
                      style={{
                        border: isSelected ? '1.5px solid #10B981' : '1px solid rgba(255, 255, 255, 0.1)',
                        backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.07)',
                        color: '#FFFFFF',
                        borderRadius: '10px',
                        padding: '6px 4px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.code}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. LANGUE CIBLE DES SOUS-TITRES (DÉCOUPLÉE DU GLOBALE) */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255, 255, 255, 0.75)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Globe size={12} color="var(--accent-primary, #C67D5B)" />
                <span>Langue de vos sous-titres (Traduction à l'écran) :</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px' }}>
                {AVAILABLE_LANGUAGES.map((lang) => {
                  const isSelected = settings.targetLang === lang.code;
                  return (
                    <button
                      key={`tgt-${lang.code}`}
                      type="button"
                      onClick={() => updateSettings({ targetLang: lang.code })}
                      style={{
                        border: isSelected ? '1.5px solid var(--accent-primary, #C67D5B)' : '1px solid rgba(255, 255, 255, 0.1)',
                        backgroundColor: isSelected ? 'var(--accent-primary, #C67D5B)' : 'rgba(255, 255, 255, 0.07)',
                        color: '#FFFFFF',
                        borderRadius: '10px',
                        padding: '6px 4px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.code}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. TAILLE DU TEXTE & COULEUR */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {/* Taille */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255, 255, 255, 0.75)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Type size={12} />
                  <span>Taille :</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                  {FONT_SIZES.map((size) => {
                    const isSelected = settings.fontSize === size.id;
                    return (
                      <button
                        key={size.id}
                        type="button"
                        onClick={() => updateSettings({ fontSize: size.id })}
                        style={{
                          border: isSelected ? '1px solid var(--accent-primary, #C67D5B)' : '1px solid rgba(255, 255, 255, 0.1)',
                          backgroundColor: isSelected ? 'var(--accent-primary, #C67D5B)' : 'rgba(255, 255, 255, 0.07)',
                          color: '#FFFFFF',
                          borderRadius: '8px',
                          padding: '5px 4px',
                          fontSize: '10.5px',
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

              {/* Couleur */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255, 255, 255, 0.75)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Palette size={12} />
                  <span>Couleur :</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                  {FONT_COLORS.map((col) => {
                    const isSelected = settings.fontColor === col.id;
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => updateSettings({ fontColor: col.id })}
                        style={{
                          border: isSelected ? '2px solid #FFFFFF' : '1px solid rgba(255, 255, 255, 0.12)',
                          backgroundColor: 'rgba(255, 255, 255, 0.07)',
                          borderRadius: '8px',
                          padding: '5px 4px',
                          fontSize: '10px',
                          fontWeight: '800',
                          color: col.hex,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                      >
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: col.hex }} />
                        <span>{col.label.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 4. STYLE D'ARRIÈRE-PLAN */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255, 255, 255, 0.75)', marginBottom: '6px' }}>
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
                        backgroundColor: isSelected ? 'var(--accent-primary, #C67D5B)' : 'rgba(255, 255, 255, 0.07)',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        padding: '6px 4px',
                        fontSize: '10.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      {bg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. BASULE DOUBLE SOUS-TITRES & RECENTRAGE */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.12)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', cursor: 'pointer', color: 'rgba(255,255,255,0.85)' }}>
                <input
                  type="checkbox"
                  checked={settings.showDual}
                  onChange={(e) => updateSettings({ showDual: e.target.checked })}
                  style={{ accentColor: 'var(--accent-primary, #C67D5B)', cursor: 'pointer' }}
                />
                <span>Afficher l'original en sous-titre</span>
              </label>

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
                📍 Recentrer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
