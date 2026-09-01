import React, { useState, useRef } from 'react';
import { Video, Phone, X, ZoomIn, ZoomOut, Mic, MicOff, Camera, VideoOff, UserPlus, PhoneOff, GripHorizontal } from 'lucide-react';
import { getAuthorAvatar } from '../data/mockData';
import LiveCallSubtitles from './LiveCallSubtitles';

export default function CallModal({
  callState,
  selectedChat,
  endCall,
  toggleMic,
  toggleCam,
  copyInviteLink,
  localStream,
  localVideoRef,
  localZoom,
  setLocalZoom,
  currentLang = 'FR'
}) {
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [controlsPos, setControlsPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });

  if (!callState.active) return null;

  const chatUser = selectedChat?.user || 'Interlocuteur';
  const chatAvatar = (selectedChat?.avatar || (getAuthorAvatar ? getAuthorAvatar(chatUser) : '')) || '';

  const handlePointerDown = (e) => {
    if (e.target.closest('button')) return;
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: controlsPos.x,
      initialY: controlsPos.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    setControlsPos({
      x: dragStartRef.current.initialX + dx,
      y: dragStartRef.current.initialY + dy,
    });
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      backgroundColor: '#000000',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', animation: 'fadeSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
      userSelect: 'none'
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 72%, rgba(0,0,0,0.75) 100%)',
        pointerEvents: 'none',
        zIndex: 2,
      }} />

      {/* BANDEAU SUPÉRIEUR FACETIME DISCRET */}
      <div style={{
        position: 'fixed', top: 'max(16px, env(safe-area-inset-top, 16px))',
        left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: '10px',
        backgroundColor: 'rgba(24, 24, 27, 0.65)', backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        padding: '7px 18px', borderRadius: '999px',
        border: '1px solid rgba(255, 255, 255, 0.16)',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
        zIndex: 50
      }}>
        {chatAvatar ? (
          <img src={chatAvatar} alt={chatUser} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#27272A', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '12px' }}>
            {chatUser[0]}
          </div>
        )}
        <div>
          <div style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '800', lineHeight: 1.2 }}>{chatUser}</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {callState.type === 'video' ? <Video size={11} /> : <Phone size={11} />}
            {callState.type === 'video' ? 'Appel vidéo FaceTime' : 'Appel audio HD'}
          </div>
        </div>
      </div>

      {/* FLUX VIDÉO LOCAL (PIP STYLE FACETIME) */}
      {callState.type === 'video' && localStream && (
        <div style={{
          position: 'fixed', top: '75px', right: '20px',
          width: localZoom ? '160px' : '116px',
          height: localZoom ? '220px' : '162px',
          borderRadius: '24px', overflow: 'hidden',
          border: '1.5px solid rgba(255, 255, 255, 0.22)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.65)',
          zIndex: 40, backgroundColor: '#18181B',
          transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)'
        }}>
          {callState.camOn ? (
            <video ref={localVideoRef} muted playsInline autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover', transform: localZoom ? 'scaleX(-1) scale(1.4)' : 'scaleX(-1) scale(1.0)', transition: 'transform 0.3s ease' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181B', color: 'rgba(255,255,255,0.6)', gap: '6px' }}>
              <VideoOff size={22} color="#EF4444" />
              <span style={{ fontSize: '10px', fontWeight: '700' }}>Caméra coupée</span>
            </div>
          )}
          <button onClick={() => setLocalZoom && setLocalZoom(z => !z)} title={localZoom ? "Zoom arrière" : "Zoom sur ma caméra"} style={{ position: 'absolute', bottom: '8px', right: '8px', border: 'none', borderRadius: '50%', width: '26px', height: '26px', backgroundColor: 'rgba(0,0,0,0.6)', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
            {localZoom ? <ZoomOut size={13} /> : <ZoomIn size={13} />}
          </button>
        </div>
      )}

      {/* VISUEL CENTRAL & FALLBACK QUAND CAMÉRA COUPÉE */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', zIndex: 10, pointerEvents: 'none' }}>
        {callState.type === 'video' && !callState.camOn ? (
          <>
            <div style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {chatAvatar ? (
                <img src={chatAvatar} alt={chatUser} style={{ width: '120px', height: '120px', borderRadius: '50%', border: '4px solid var(--accent-primary)', boxShadow: 'var(--shadow-accent)', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '46px', color: '#FFF', fontWeight: '800', boxShadow: 'var(--shadow-accent)' }}>{chatUser[0]}</div>
              )}
              <div style={{ position: 'absolute', bottom: '4px', right: '4px', backgroundColor: 'var(--accent-danger)', color: '#FFF', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--call-bg)' }}>
                <VideoOff size={14} />
              </div>
            </div>
            <div style={{ color: 'var(--text-main)', fontSize: '20px', fontWeight: '800' }}>{chatUser}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-success)', display: 'inline-block' }} />
              Micro actif • Caméra en veille
            </div>
          </>
        ) : callState.type === 'video' ? (
          <>
            <div style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {chatAvatar ? (
                <img src={chatAvatar} alt={chatUser} style={{ width: '120px', height: '120px', borderRadius: '50%', border: '4px solid var(--accent-primary)', boxShadow: 'var(--shadow-accent)', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '46px', color: '#FFF', fontWeight: '800', boxShadow: 'var(--shadow-accent)' }}>{chatUser[0]}</div>
              )}
            </div>
            <div style={{ color: 'var(--text-main)', fontSize: '18px', fontWeight: '800' }}>{chatUser}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Connexion HD chiffrée de bout en bout</div>
          </>
        ) : (
          <>
            <div className="call-ring" style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '46px', color: '#FFF', fontWeight: '800', boxShadow: 'var(--shadow-accent)' }}>
              {chatAvatar ? (
                <img src={chatAvatar} alt={chatUser} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                chatUser[0]
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '24px' }}>
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="wave-bar" style={{ height: `${10 + (i % 3) * 10}px`, animationDelay: `${i * 0.12}s`, backgroundColor: 'var(--accent-primary)' }} />
              ))}
            </div>
            <div style={{ color: 'var(--text-main)', fontSize: '18px', fontWeight: '800' }}>{chatUser}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Appel audio haute fidélité</div>
          </>
        )}
      </div>

      {/* SOUS-TITRES EN DIRECT ET TRADUCTION VOCALE TEMPS RÉEL (IA) */}
      <LiveCallSubtitles
        isActive={showSubtitles}
        currentLang={currentLang}
        speakerName={chatUser}
        isCompact={false}
      />

      {/* NOTIFICATION D'INVITATION COPIÉE */}
      {callState.copied && (
        <div style={{ position: 'absolute', bottom: '104px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--bg-glass)', color: 'var(--text-main)', padding: '8px 18px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', boxShadow: 'var(--shadow-modal)', border: '1px solid var(--border-color)', zIndex: 60 }}>
          Lien d’invitation copié !
        </div>
      )}

      {/* BARRE DE CONTRÔLES TACTILE FLOTTANTE & DÉPLAÇABLE */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: 'absolute',
          bottom: '32px',
          left: '50%',
          transform: `translate(calc(-50% + ${controlsPos.x}px), ${controlsPos.y}px)`,
          backgroundColor: 'var(--bg-glass)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: '10px 20px',
          borderRadius: '999px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-modal)',
          zIndex: 50,
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none'
        }}
      >
        <div title="Glisser pour déplacer" style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', paddingRight: '4px', cursor: 'grab' }}>
          <GripHorizontal size={16} />
        </div>

        {/* BOUTON SOUS-TITRAGE EN DIRECT (IA) */}
        <button
          type="button"
          onClick={() => setShowSubtitles(s => !s)}
          title={showSubtitles ? "Désactiver les sous-titres en direct" : "Activer les sous-titres et la traduction en direct"}
          style={{
            border: showSubtitles ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            backgroundColor: showSubtitles ? 'var(--accent-primary)' : 'var(--call-button-bg)',
            color: '#FFF',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: '900',
            transition: 'all 0.2s ease',
            flexShrink: 0,
            boxShadow: showSubtitles ? 'var(--shadow-accent)' : 'none'
          }}
        >
          CC
        </button>

        <button
          onClick={toggleMic}
          title={callState.micOn ? "Coupure micro" : "Activer le micro"}
          style={{ border: 'none', width: '46px', height: '46px', borderRadius: '50%', backgroundColor: callState.micOn ? 'var(--call-button-bg)' : 'var(--accent-danger)', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', flexShrink: 0 }}
        >
          {callState.micOn ? <Mic size={18} /> : <MicOff size={18} />}
        </button>

        {callState.type === 'video' && (
          <button
            onClick={toggleCam}
            title={callState.camOn ? "Caméra désactivée" : "Activer la caméra"}
            style={{ border: 'none', width: '46px', height: '46px', borderRadius: '50%', backgroundColor: callState.camOn ? 'var(--call-button-bg)' : 'var(--accent-danger)', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', flexShrink: 0 }}
          >
            {callState.camOn ? <Camera size={18} /> : <VideoOff size={18} />}
          </button>
        )}

        <button
          onClick={copyInviteLink}
          title="Inviter en groupe"
          style={{ border: 'none', width: '46px', height: '46px', borderRadius: '50%', backgroundColor: 'var(--call-button-bg)', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', flexShrink: 0 }}
        >
          <UserPlus size={18} />
        </button>

        <button
          onClick={endCall}
          title="Raccrocher"
          style={{ border: 'none', width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'var(--accent-danger)', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(239,68,68,0.55)', transition: 'transform 0.2s ease', flexShrink: 0 }}
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
}

