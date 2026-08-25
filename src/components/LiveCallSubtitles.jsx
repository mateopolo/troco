import React, { useState, useEffect } from 'react';
import { Globe, Volume2, X } from 'lucide-react';
import { liveTranscriptionService } from '../services/liveTranscriptionService';

export default function LiveCallSubtitles({
  isActive = true,
  currentLang = 'FR',
  speakerName = 'Interlocuteur',
  isCompact = false,
}) {
  const [subtitle, setSubtitle] = useState(null);
  const [targetLang, setTargetLang] = useState(currentLang || 'FR');
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    setTargetLang(currentLang || 'FR');
  }, [currentLang]);

  useEffect(() => {
    if (!isActive) {
      liveTranscriptionService.stopListening();
      setSubtitle(null);
      return;
    }

    liveTranscriptionService.startListening('fr-FR', targetLang);

    const unsubscribe = liveTranscriptionService.subscribe((data) => {
      setSubtitle(data);
    });

    return () => {
      unsubscribe();
      liveTranscriptionService.stopListening();
    };
  }, [isActive, targetLang]);

  if (!isActive || !subtitle || !subtitle.translatedText) {
    return null;
  }

  const displayText = showOriginal ? subtitle.originalText : subtitle.translatedText;
  const isTranslated = targetLang !== 'FR' && subtitle.originalText !== subtitle.translatedText;

  return (
    <div
      className="live-subtitles-overlay"
      style={{
        position: 'absolute',
        bottom: isCompact ? '60px' : '90px',
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: isCompact ? '90%' : '650px',
        width: 'auto',
        zIndex: 50,
        pointerEvents: 'auto',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(15, 13, 11, 0.82)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '16px',
          padding: isCompact ? '8px 12px' : '10px 16px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '10.5px', color: '#FAF7F2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', color: 'var(--accent-primary, #C67D5B)' }}>
            <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--accent-success, #10B981)', animation: 'pulse 1.5s infinite' }} />
            <Volume2 size={12} />
            <span>{subtitle.speaker || speakerName}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isTranslated && (
              <button
                type="button"
                onClick={() => setShowOriginal(o => !o)}
                style={{
                  border: 'none',
                  background: 'rgba(255, 255, 255, 0.12)',
                  color: '#FAF7F2',
                  borderRadius: '6px',
                  padding: '2px 6px',
                  fontSize: '9.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
                title="Basculer texte original / traduit"
              >
                <Globe size={9} />
                <span>{showOriginal ? 'Voir traduit' : `Traduit en ${targetLang}`}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSubtitle(null)}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'rgba(255, 255, 255, 0.6)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Fermer le sous-titre"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        <div
          style={{
            fontSize: isCompact ? '12px' : '14px',
            lineHeight: 1.4,
            fontWeight: '600',
            color: '#FFFFFF',
            letterSpacing: '0.01em',
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          }}
        >
          {displayText}
        </div>
      </div>
    </div>
  );
}
