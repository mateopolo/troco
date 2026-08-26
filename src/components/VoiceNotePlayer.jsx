import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Mic } from 'lucide-react';

export default function VoiceNotePlayer({
  audioUrl,
  duration = null,
  isMe = false,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
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
        gap: '4px',
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

      {/* HEADER AVEC TITRE ET VITESSE */}
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

        <button
          type="button"
          onClick={toggleSpeed}
          style={{
            border: 'none',
            background: isMe ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-subtle)',
            color: isMe ? '#FFFFFF' : 'var(--text-main)',
            fontSize: '9.5px',
            fontWeight: '800',
            padding: '1px 6px',
            borderRadius: '5px',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'background-color 0.15s ease',
          }}
          title="Vitesse de lecture"
        >
          {playbackRate}x
        </button>
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
            width: '30px',
            height: '30px',
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
          {isPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" style={{ marginLeft: '1.5px' }} />}
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
    </div>
  );
}
