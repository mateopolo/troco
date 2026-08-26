import React, { useState, useRef } from 'react';
import {
  X, Play, Pause, RotateCcw, Check, Film, Scissors, Maximize, Clock
} from 'lucide-react';

export default function VideoEditorModal({
  isOpen,
  videoSrc,
  onClose,
  onSave,
  initialTrimStart = 0,
  initialTrimEnd = null,
  initialCropRatio = '16:9', // '16:9' | '1:1' | '9:16'
  darkMode = false,
  t = (k) => k,
  currentLang = 'FR',
}) {
  const videoRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trimStart, setTrimStart] = useState(initialTrimStart || 0);
  const [trimEnd, setTrimEnd] = useState(initialTrimEnd || 0);
  const [cropRatio, setCropRatio] = useState(initialCropRatio || '16:9');

  // Charger les métadonnées de la vidéo
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration || 0;
    setDuration(dur);
    const end = (initialTrimEnd && initialTrimEnd <= dur) ? initialTrimEnd : Math.min(dur, (initialTrimStart || 0) + 30);
    setTrimEnd(end);
    setTrimStart(initialTrimStart || 0);
    videoRef.current.currentTime = initialTrimStart || 0;
  };

  // Boucle de lecture stricte entre trimStart et trimEnd
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);
    if (trimEnd > 0 && curr >= trimEnd) {
      videoRef.current.currentTime = trimStart;
      if (!isPlaying) {
        videoRef.current.pause();
      }
    }
  };

  // Toggle Lecture / Pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (videoRef.current.currentTime >= trimEnd || videoRef.current.currentTime < trimStart) {
        videoRef.current.currentTime = trimStart;
      }
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // Modification du Trim Start
  const handleTrimStartChange = (val) => {
    const num = Math.max(0, Math.min(val, trimEnd - 0.5));
    setTrimStart(num);
    if (videoRef.current) {
      videoRef.current.currentTime = num;
      setCurrentTime(num);
    }
  };

  // Modification du Trim End
  const handleTrimEndChange = (val) => {
    const num = Math.min(duration, Math.max(val, trimStart + 0.5));
    setTrimEnd(num);
    if (videoRef.current && videoRef.current.currentTime > num) {
      videoRef.current.currentTime = trimStart;
      setCurrentTime(trimStart);
    }
  };

  // Formatage du temps en mm:ss.s
  const formatTime = (secs) => {
    if (isNaN(secs) || secs == null) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const tenths = Math.floor((secs % 1) * 10);
    return `${m}:${s < 10 ? '0' : ''}${s}.${tenths}s`;
  };

  // Reset
  const handleReset = () => {
    setTrimStart(0);
    setTrimEnd(duration);
    setCropRatio('16:9');
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  // Sauvegarde
  const handleConfirmSave = () => {
    onSave({
      videoUrl: videoSrc,
      trimStart: Number(trimStart.toFixed(2)),
      trimEnd: Number(trimEnd.toFixed(2)),
      cropRatio: cropRatio,
      duration: Number((trimEnd - trimStart).toFixed(2)),
    });
    onClose();
  };

  if (!isOpen || !videoSrc) return null;

  const selectedLength = Math.max(0, trimEnd - trimStart);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.82)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      zIndex: 10000030,
      animation: 'fadeIn 0.25s ease',
    }}>
      <div style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: '24px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-modal)',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '94vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* HEADER */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-glass)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scissors size={18} color="var(--accent-primary)" />
            <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>
              {currentLang === 'FR' ? 'Studio Vidéo : Découpage & Cadrage' : 'Video Studio: Trim & Crop'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'var(--bg-subtle)',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-main)',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ZONE DE VISUALISATION VIDÉO AVEC CADRE DE RECADRAGE VISUEL */}
        <div style={{
          flex: 1,
          minHeight: '260px',
          maxHeight: '360px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          backgroundColor: darkMode ? '#12100E' : '#1E1B18',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Conteneur avec ratio d'aspect choisi */}
          <div style={{
            position: 'relative',
            width: cropRatio === '9:16' ? '180px' : cropRatio === '1:1' ? '280px' : '100%',
            maxWidth: cropRatio === '16:9' ? '480px' : 'none',
            aspectRatio: cropRatio === '9:16' ? '9/16' : cropRatio === '1:1' ? '1/1' : '16/9',
            maxHeight: '100%',
            borderRadius: '14px',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
            backgroundColor: '#000',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <video
              ref={videoRef}
              src={videoSrc}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />

            {/* Bouton de lecture centré par-dessus la vidéo */}
            <button
              type="button"
              onClick={togglePlay}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '2px solid rgba(255, 255, 255, 0.8)',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                opacity: isPlaying ? 0.3 : 0.95,
                transition: 'opacity 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = isPlaying ? '0.3' : '0.95'; }}
            >
              {isPlaying ? <Pause size={22} /> : <Play size={22} style={{ marginLeft: '3px' }} />}
            </button>

            {/* Badge durée sélectionnée */}
            <div style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              color: '#FFF',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '800',
              fontFamily: 'monospace',
              pointerEvents: 'none',
            }}>
              {formatTime(currentTime)} / {formatTime(trimEnd)}
            </div>
          </div>
        </div>

        {/* TOOLBAR DES OPTIONS */}
        <div style={{
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          backgroundColor: 'var(--bg-card)',
          overflowY: 'auto',
        }}>
          {/* FORMATS / RATIOS DE CADRAGE */}
          <div>
            <label style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Format & Cadrage Visuel
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { key: '16:9', label: '16:9 Paysage', icon: Film },
                { key: '1:1', label: '1:1 Carré Feed', icon: Maximize },
                { key: '9:16', label: '9:16 Story / TikTok', icon: Film },
              ].map(r => {
                const Icon = r.icon;
                const isSelected = cropRatio === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setCropRatio(r.key)}
                    className="premium-button"
                    style={{
                      padding: '8px 10px',
                      borderRadius: '12px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                      color: isSelected ? '#FFFFFF' : 'var(--text-main)',
                      border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: isSelected ? 'var(--shadow-accent)' : 'none'
                    }}
                  >
                    <Icon size={13} /> {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* TIMELINE TRIMMING (DÉCOUPAGE DE DURÉE) */}
          <div style={{
            padding: '12px 14px',
            borderRadius: '14px',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-color)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>
                <Clock size={13} color="var(--accent-primary)" />
                <span>Extrait sélectionné : <strong>{formatTime(selectedLength)}</strong></span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700' }}>
                De {formatTime(trimStart)} à {formatTime(trimEnd)}
              </span>
            </div>

            {/* Slider Début */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--text-secondary)', marginBottom: '2px', fontWeight: '700' }}>
                <span>Point de départ (In)</span>
                <span style={{ color: 'var(--accent-primary)', fontWeight: '800' }}>{formatTime(trimStart)}</span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(0.1, duration)}
                step="0.1"
                value={trimStart}
                onChange={(e) => handleTrimStartChange(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
              />
            </div>

            {/* Slider Fin */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--text-secondary)', marginBottom: '2px', fontWeight: '700' }}>
                <span>Point de fin (Out)</span>
                <span style={{ color: 'var(--accent-primary)', fontWeight: '800' }}>{formatTime(trimEnd)}</span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(0.1, duration)}
                step="0.1"
                value={trimEnd}
                onChange={(e) => handleTrimEndChange(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
              />
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-glass)',
        }}>
          <button
            type="button"
            onClick={handleReset}
            className="premium-button"
            style={{
              border: '1px solid var(--border-color)',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              borderRadius: '12px',
              padding: '9px 14px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <RotateCcw size={13} /> Réinitialiser
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              className="premium-button"
              style={{
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-main)',
                borderRadius: '12px',
                padding: '9px 16px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              Annuler
            </button>

            <button
              type="button"
              onClick={handleConfirmSave}
              className="premium-button"
              style={{
                border: 'none',
                background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                color: '#FFFFFF',
                borderRadius: '12px',
                padding: '9px 20px',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: 'var(--shadow-accent)',
              }}
            >
              <Check size={14} /> Valider la vidéo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
