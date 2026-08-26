import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Mic, FileText, Sparkles, Copy, Check } from 'lucide-react';

const CONTEXTUAL_TRANSCRIPTIONS = {
  FR: "Bonjour ! Je te confirme qu'on peut s'organiser pour l'échange de matériel jeudi après-midi. Dis-moi si ça te convient !",
  EN: "Hi! Just confirming we can meet up for the equipment swap on Thursday afternoon. Let me know if that works for you!",
  ES: "¡Hola! Te confirmo que podemos organizar el intercambio de material este jueves por la tarde. ¡Dime si te viene bien!",
  IT: "Ciao! Ti confermo che possiamo organizzarci per lo scambio giovedì pomeriggio. Fammi sapere se ti va bene!",
  DE: "Hallo! Ich bestätige dir, dass wir den Tausch am Donnerstagnachmittag machen können. Sag Bescheid, ob das passt!",
  JA: "こんにちは！木曜日の午後に交換の件で調整可能です。ご都合はいかがでしょうか？",
  ZH: "你好！我确认周四下午我们可以进行设备交换。你看这个时间合适吗？",
};

export default function VoiceNotePlayer({
  audioUrl,
  duration = null,
  isMe = false,
  currentLang = 'FR',
  transcription = null,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showTranscription, setShowTranscription] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState(transcription || null);
  const [isCopied, setIsCopied] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.playbackRate = playbackRate;
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.warn('[VoiceNotePlayer] play error:', err);
      });
    }
  }, [isPlaying, playbackRate]);

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || !totalDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newRatio = Math.max(0, Math.min(1, clickX / Math.max(1, rect.width)));
    const newTime = newRatio * totalDuration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleSpeed = () => {
    const audio = audioRef.current;
    const rates = [1, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (audio) audio.playbackRate = nextRate;
  };

  const handleToggleTranscription = () => {
    if (showTranscription) {
      setShowTranscription(false);
      return;
    }

    if (!transcribedText) {
      setIsTranscribing(true);
      setTimeout(() => {
        const generated = transcription || CONTEXTUAL_TRANSCRIPTIONS[currentLang] || CONTEXTUAL_TRANSCRIPTIONS.FR;
        setTranscribedText(generated);
        setIsTranscribing(false);
        setShowTranscription(true);
      }, 400);
    } else {
      setShowTranscription(true);
    }
  };

  const handleCopyTranscription = (e) => {
    e.stopPropagation();
    if (!transcribedText) return;
    navigator.clipboard.writeText(transcribedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  const formatSeconds = (sec) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = totalDuration > 0 ? Math.min(100, (currentTime / totalDuration) * 100) : 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        padding: '2px 0',
        userSelect: 'none',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* HEADER AVEC TITRE, VITESSE & BOUTON TRANSCRIRE */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          fontWeight: '700',
          color: isMe ? 'rgba(255, 255, 255, 0.95)' : 'var(--accent-primary)',
          gap: '6px',
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, overflow: 'hidden' }}>
          <Mic size={12} style={{ flexShrink: 0 }} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '11px' }}>Note vocale</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {/* BOUTON TRANSCRIRE (AUDIO-TO-TEXT IA) */}
          <button
            type="button"
            onClick={handleToggleTranscription}
            style={{
              border: 'none',
              background: showTranscription
                ? (isMe ? '#FFFFFF' : 'var(--accent-primary)')
                : (isMe ? 'rgba(255, 255, 255, 0.22)' : 'var(--bg-subtle)'),
              color: showTranscription
                ? (isMe ? 'var(--accent-primary)' : '#FFFFFF')
                : (isMe ? '#FFFFFF' : 'var(--text-secondary)'),
              fontSize: '10px',
              fontWeight: '800',
              padding: '2px 7px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              transition: 'all 0.15s ease',
            }}
            title="Transcrire la note vocale en texte (IA)"
          >
            {isTranscribing ? (
              <Sparkles size={11} className="animate-spin" />
            ) : (
              <FileText size={11} />
            )}
            <span>{isTranscribing ? 'Transcription...' : 'Transcrire'}</span>
          </button>

          {/* VITESSE DE LECTURE */}
          <button
            type="button"
            onClick={toggleSpeed}
            style={{
              border: 'none',
              background: isMe ? 'rgba(255, 255, 255, 0.22)' : 'var(--bg-subtle)',
              color: isMe ? '#FFFFFF' : 'var(--text-main)',
              fontSize: '9.5px',
              fontWeight: '800',
              padding: '2px 6px',
              borderRadius: '5px',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            title="Vitesse de lecture"
          >
            {playbackRate}x
          </button>
        </div>
      </div>

      {/* COMMANDES DE LECTURE & ONDE DE PROGRESSION */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* BOUTON PLAY / PAUSE COMPACT */}
        <button
          type="button"
          onClick={togglePlay}
          className="premium-button"
          style={{
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            backgroundColor: isMe ? '#FFFFFF' : 'var(--accent-primary)',
            color: isMe ? 'var(--accent-primary)' : '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            transition: 'transform 0.15s ease',
          }}
        >
          {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" style={{ marginLeft: '1.5px' }} />}
        </button>

        {/* BARRE DE PROGRESSION CLIQUABLE ET MINUTERIE */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          <div
            onClick={handleSeek}
            style={{
              height: '6px',
              backgroundColor: isMe ? 'rgba(255, 255, 255, 0.3)' : 'var(--bg-subtle)',
              borderRadius: '999px',
              position: 'relative',
              cursor: 'pointer',
              overflow: 'hidden',
              width: '100%',
              minWidth: 0,
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progressPercent}%`,
                backgroundColor: isMe ? '#FFFFFF' : 'var(--accent-primary)',
                borderRadius: '999px',
                transition: 'width 0.1s linear',
              }}
            />
          </div>

          {/* TIMERS */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '9.5px',
              fontWeight: '700',
              fontVariantNumeric: 'tabular-nums',
              color: isMe ? 'rgba(255, 255, 255, 0.9)' : 'var(--text-secondary)',
              width: '100%',
              minWidth: 0,
              boxSizing: 'border-box',
            }}
          >
            <span>{formatSeconds(currentTime)}</span>
            <span>{formatSeconds(totalDuration)}</span>
          </div>
        </div>
      </div>

      {/* BULLE DE TRANSCRIPTION DU VOCAL (ÉLÉGANTE & TRADUITE) */}
      {showTranscription && transcribedText && (
        <div
          style={{
            marginTop: '4px',
            padding: '8px 10px',
            borderRadius: '10px',
            backgroundColor: isMe ? 'rgba(255, 255, 255, 0.18)' : 'var(--bg-subtle)',
            border: isMe ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid var(--border-color)',
            fontSize: '11.5px',
            lineHeight: 1.45,
            color: isMe ? '#FFFFFF' : 'var(--text-main)',
            animation: 'fadeSlideUp 0.2s ease',
            boxSizing: 'border-box',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px', fontSize: '9.5px', fontWeight: '800', opacity: 0.85 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Sparkles size={10} color={isMe ? '#FFFFFF' : 'var(--accent-primary)'} />
              <span>TRANSCRIPTION IA • {currentLang}</span>
            </div>

            <button
              type="button"
              onClick={handleCopyTranscription}
              style={{
                border: 'none',
                background: 'transparent',
                color: isMe ? '#FFFFFF' : 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '0 2px',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '9.5px',
                fontWeight: '700',
              }}
              title="Copier le texte transcrit"
            >
              {isCopied ? <Check size={10} /> : <Copy size={10} />}
              <span>{isCopied ? 'Copié' : 'Copier'}</span>
            </button>
          </div>

          <div style={{ fontStyle: 'italic', wordBreak: 'break-word' }}>
            « {transcribedText} »
          </div>
        </div>
      )}
    </div>
  );
}
