import React, { useState, useEffect, useRef } from 'react';
import {
  Maximize2, SwitchCamera, Mic, MicOff, PhoneOff,
  ChevronLeft, ChevronRight, PictureInPicture2
} from 'lucide-react';
import LiveCallSubtitles from './LiveCallSubtitles';

export default function CallOverlay({
  callState,
  isCallPip,
  setIsCallPip,
  pipPosition,
  setPipPosition,
  handlePipPointerDown,
  handlePipPointerMove,
  handlePipPointerUp,
  handlePipPointerCancel,
  handlePipContentClick,
  selectedChat,
  callDuration,
  formatCallTimer,
  remoteStream,
  localStream,
  facingMode,
  attachRemoteStream,
  attachLocalStream,
  hasMultipleCameras,
  switchCamera,
  toggleMic,
  endCall,
  currentLang = 'FR',
}) {
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [isDocked, setIsDocked] = useState(null); // 'left' | 'right' | null
  const videoRef = useRef(null);

  // Détection du bord pour repliage automatique sur le côté (Docking latéral type FaceTime)
  useEffect(() => {
    if (!pipPosition) return;
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 400;
    if (pipPosition.x <= 25) {
      setIsDocked('left');
    } else if (pipPosition.x >= screenW - 65) {
      setIsDocked('right');
    } else {
      setIsDocked(null);
    }
  }, [pipPosition]);

  // Support Picture-in-Picture Natif du navigateur
  const handleRequestNativePip = async (e) => {
    if (e) e.stopPropagation();
    try {
      const vid = videoRef.current;
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (vid && vid.requestPictureInPicture) {
        await vid.requestPictureInPicture();
      } else if (vid && vid.webkitSetPresentationMode) {
        vid.webkitSetPresentationMode('picture-in-picture');
      }
    } catch (err) {
      console.warn('[WebRTC] Native PiP non supporté ou refusé:', err);
    }
  };

  // Passage en PiP natif automatique lors du basculement d'onglet en arrière-plan
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && callState?.active && callState?.type === 'video' && videoRef.current) {
        if (typeof videoRef.current.requestPictureInPicture === 'function' && !document.pictureInPictureElement) {
          videoRef.current.requestPictureInPicture().catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [callState?.active, callState?.type]);

  if (!callState?.active || !isCallPip) return null;

  const handleUndock = (e) => {
    if (e) e.stopPropagation();
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 400;
    if (setPipPosition) {
      setPipPosition(prev => ({
        ...prev,
        x: isDocked === 'left' ? 25 : Math.max(10, screenW - 230),
      }));
    }
    setIsDocked(null);
  };

  const currentX = isDocked === 'left'
    ? -165
    : isDocked === 'right'
      ? (typeof window !== 'undefined' ? window.innerWidth - 45 : 300)
      : pipPosition.x;

  return (
    <div
      onPointerDown={handlePipPointerDown}
      onPointerMove={handlePipPointerMove}
      onPointerUp={handlePipPointerUp}
      onPointerCancel={handlePipPointerCancel}
      style={{
        position: 'fixed',
        left: `${currentX}px`,
        top: `${pipPosition.y}px`,
        width: '210px',
        height: '145px',
        zIndex: 10000000,
        borderRadius: '18px',
        overflow: 'hidden',
        boxShadow: isDocked
          ? '0 8px 30px rgba(0,0,0,0.7), var(--shadow-accent)'
          : '0 16px 40px rgba(0,0,0,0.6), var(--shadow-accent)',
        border: '2px solid var(--accent-primary)',
        backgroundColor: 'var(--call-card)',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
        cursor: isDocked ? 'pointer' : 'grab',
        transition: isDocked ? 'left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
      }}
    >
      {/* LANGUETTE / TIROIR RÉTRACTABLE SUR LE BORD */}
      {isDocked && (
        <div
          onClick={handleUndock}
          title="Faire ressortir l'appel"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'var(--call-card)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isDocked === 'left' ? 'flex-end' : 'flex-start',
            padding: '0 8px',
            zIndex: 100,
            cursor: 'pointer',
          }}
        >
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            color: 'var(--accent-primary)',
          }}>
            <div className="breathing-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)' }} />
            {isDocked === 'left' ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </div>
        </div>
      )}

      {/* HEADER PIP DRAGGABLE */}
      <div
        style={{
          padding: '6px 10px',
          backgroundColor: 'var(--bg-glass)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
          borderBottom: '1px solid var(--border-color)',
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          <div className="breathing-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)' }} />
          <span style={{ color: 'var(--text-main)', fontSize: '11px', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {selectedChat?.user || 'Appel'}
          </span>
        </div>
        <span style={{ color: 'var(--accent-primary)', fontSize: '10px', fontWeight: '800' }}>
          {formatCallTimer ? formatCallTimer(callDuration) : `${callDuration}s`}
        </span>
      </div>

      {/* CONTENU VIDÉO OU AVATAR DU PIP */}
      <div
        onClick={handlePipContentClick}
        title="Cliquer pour agrandir en plein écran"
        style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
      >
        {callState.type === 'video' && (remoteStream || localStream) ? (
          <video
            ref={(el) => {
              videoRef.current = el;
              if (remoteStream && attachRemoteStream) attachRemoteStream(el);
              else if (localStream && attachLocalStream) attachLocalStream(el);
            }}
            autoPlay
            playsInline
            muted={!remoteStream}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transform: (!remoteStream && facingMode === 'user') ? 'scaleX(-1)' : 'none',
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', background: 'var(--call-card)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: '800', fontSize: '16px' }}>
              {(selectedChat?.user || 'T')[0]}
            </div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '10px', fontWeight: '600' }}>En direct</span>
          </div>
        )}

        {/* CONTRÔLES FLOTTANTS MINIATURES SUR LE PIP */}
        <div
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', bottom: '6px', left: '6px', right: '6px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            zIndex: 10
          }}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsCallPip(false); }}
            title="Agrandir en plein écran"
            style={{ border: 'none', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--bg-glass)', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Maximize2 size={13} />
          </button>

          {/* BOUTON PIP NATIF DU SYSTÈME */}
          {callState.type === 'video' && (
            <button
              type="button"
              onClick={handleRequestNativePip}
              title="Activer le PiP natif du navigateur"
              style={{ border: 'none', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--bg-glass)', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <PictureInPicture2 size={13} />
            </button>
          )}

          {hasMultipleCameras && callState.type === 'video' && callState.camOn && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); if (switchCamera) switchCamera(); }}
              title="Changer de caméra"
              style={{ border: 'none', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--bg-glass)', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <SwitchCamera size={13} />
            </button>
          )}

            {/* BOUTON SOUS-TITRES EN DIRECT (IA) */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowSubtitles(s => !s); }}
              title={showSubtitles ? "Désactiver les sous-titres en direct" : "Activer les sous-titres et traduction en direct"}
              style={{
                border: showSubtitles ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: showSubtitles ? 'var(--accent-primary)' : 'var(--bg-glass)',
                color: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: '900',
              }}
            >
              CC
            </button>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); if (toggleMic) toggleMic(); }}
              title={callState.micOn ? "Couper micro" : "Activer micro"}
              style={{ border: callState.micOn ? 'none' : '1px solid var(--border-color)', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: callState.micOn ? 'var(--bg-glass)' : 'var(--accent-danger)', color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {callState.micOn ? <Mic size={13} /> : <MicOff size={13} />}
            </button>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); if (endCall) endCall(); }}
              title="Raccrocher"
              style={{ border: '1px solid var(--border-color)', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--accent-danger)', color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <PhoneOff size={13} />
            </button>
          </div>

          {/* SOUS-TITRES FLOTTANTS COMPACTS EN MODE PIP */}
          <LiveCallSubtitles
            isActive={showSubtitles}
            currentLang={currentLang}
            speakerName={selectedChat?.user || 'Interlocuteur'}
            isCompact={true}
          />
        </div>
      </div>
    );
}

