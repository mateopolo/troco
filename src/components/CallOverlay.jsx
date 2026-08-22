import React from 'react';
import {
  Maximize2, SwitchCamera, Mic, MicOff, PhoneOff
} from 'lucide-react';

export default function CallOverlay({
  callState,
  isCallPip,
  setIsCallPip,
  pipPosition,
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
}) {
  if (!callState?.active || !isCallPip) return null;

  return (
    <div
      onPointerDown={handlePipPointerDown}
      onPointerMove={handlePipPointerMove}
      onPointerUp={handlePipPointerUp}
      onPointerCancel={handlePipPointerCancel}
      style={{
        position: 'fixed',
        left: `${pipPosition.x}px`,
        top: `${pipPosition.y}px`,
        width: '210px',
        height: '145px',
        zIndex: 3500,
        borderRadius: '18px',
        overflow: 'hidden',
        boxShadow: '0 16px 40px rgba(0,0,0,0.6), 0 0 20px rgba(96,165,250,0.3)',
        border: '2px solid #60A5FA',
        backgroundColor: '#0F172A',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
        cursor: 'grab',
      }}
    >
      {/* HEADER PIP DRAGGABLE */}
      <div
        style={{
          padding: '6px 10px',
          backgroundColor: 'rgba(15,23,42,0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22C55E' }} />
          <span style={{ color: '#FFF', fontSize: '11px', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {selectedChat?.user || 'Appel'}
          </span>
        </div>
        <span style={{ color: '#38BDF8', fontSize: '10px', fontWeight: '800' }}>
          {formatCallTimer ? formatCallTimer(callDuration) : `${callDuration}s`}
        </span>
      </div>

      {/* CONTENU VIDÉO OU AVATAR DU PIP (AVEC DISTINCTION TAP VS DRAG) */}
      <div
        onClick={handlePipContentClick}
        title="Cliquer pour agrandir en plein écran"
        style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
      >
        {callState.type === 'video' && (remoteStream || localStream) ? (
          <video
            ref={remoteStream ? attachRemoteStream : attachLocalStream}
            autoPlay
            playsInline
            muted={!remoteStream}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transform: (!remoteStream && facingMode === 'user') ? 'scaleX(-1)' : 'none',
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', background: 'linear-gradient(135deg, #1E293B, #0F172A)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #60A5FA, #04265A)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: '800', fontSize: '16px' }}>
              {(selectedChat?.user || 'T')[0]}
            </div>
            <span style={{ color: '#93C5FD', fontSize: '10px', fontWeight: '600' }}>En direct</span>
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
            style={{ border: 'none', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(15,23,42,0.85)', color: '#60A5FA', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Maximize2 size={13} />
          </button>

          {hasMultipleCameras && callState.type === 'video' && callState.camOn && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); if (switchCamera) switchCamera(); }}
              title="Changer de caméra"
              style={{ border: 'none', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(15,23,42,0.85)', color: '#38BDF8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <SwitchCamera size={13} />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (toggleMic) toggleMic(); }}
            title={callState.micOn ? "Couper micro" : "Activer micro"}
            style={{ border: 'none', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: callState.micOn ? 'rgba(15,23,42,0.85)' : '#EF4444', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {callState.micOn ? <Mic size={13} /> : <MicOff size={13} />}
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (endCall) endCall(); }}
            title="Raccrocher"
            style={{ border: 'none', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#EF4444', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <PhoneOff size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
