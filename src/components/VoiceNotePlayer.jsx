import React, { useState, useRef, useEffect } from 'react';
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

  const togglePlay = () => {
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
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || !totalDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newRatio = Math.max(0, Math.min(1, clickX / rect.width));
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

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      width: '100%',
      minWidth: '210px',
      maxWidth: '280px',
      padding: '4px 0',
      userSelect: 'none',
    }}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* HEADER AVEC TITRE ET VITESSE */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
        fontWeight: '700',
        color: isMe ? 'rgba(255, 255, 255, 0.9)' : 'var(--accent-primary)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Mic size={13} />
          <span>Note vocale</span>
        </div>

        <button
          type="button"
          onClick={toggleSpeed}
          style={{
            border: 'none',
            background: isMe ? 'rgba(255, 255, 255, 0.2)' : 'var(--bg-subtle)',
            color: isMe ? '#FFFFFF' : 'var(--text-main)',
            fontSize: '10px',
            fontWeight: '800',
            padding: '2px 6px',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
          title="Vitesse de lecture"
        >
          {playbackRate}x
        </button>
      </div>

      {/* COMMANDES DE LECTURE & ONDE DE PROGRESSION */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        {/* BOUTON PLAY / PAUSE */}
        <button
          type="button"
          onClick={togglePlay}
          className="premium-button"
          style={{
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            backgroundColor: isMe ? '#FFFFFF' : 'var(--accent-primary)',
            color: isMe ? 'var(--accent-primary)' : '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            transition: 'transform 0.15s ease',
          }}
        >
          {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" style={{ marginLeft: '2px' }} />}
        </button>

        {/* BARRE DE PROGRESSION CLICQUABLE */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div
            onClick={handleSeek}
            style={{
              height: '8px',
              backgroundColor: isMe ? 'rgba(255, 255, 255, 0.3)' : 'var(--bg-subtle)',
              borderRadius: '999px',
              position: 'relative',
              cursor: 'pointer',
              overflow: 'hidden',
            }}
          >
            <div style={{
              height: '100%',
              width: `${progressPercent}%`,
              backgroundColor: isMe ? '#FFFFFF' : 'var(--accent-primary)',
              borderRadius: '999px',
              transition: 'width 0.1s linear',
            }} />
          </div>

          {/* TIMERS */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '10px',
            fontWeight: '700',
            color: isMe ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-secondary)',
          }}>
            <span>{formatSeconds(currentTime)}</span>
            <span>{formatSeconds(totalDuration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
