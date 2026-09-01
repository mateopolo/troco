import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Camera,
  Monitor,
  MonitorOff,
  SwitchCamera,
  Repeat,
  UserPlus,
  Eye,
  EyeOff,
  Minimize2,
  X,
  Clock,
  Coins,
  Crown,
  ChevronUp,
  GripHorizontal,
} from 'lucide-react';

const LiveCallSubtitles = React.lazy(() => import('../../components/LiveCallSubtitles'));

/**
 * Format standard du chronomètre d'appel (HH:MM:SS ou MM:SS).
 */
const defaultFormatCallTimer = (totalSeconds = 0) => {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Fallback avatar generator
 */
const defaultGetAvatar = (name) => {
  return 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80';
};

export default function WebRTCCallOverlay({
  incomingCall,
  callState,
  isCallPip,
  setIsCallPip,
  darkMode = false,
  currentLang = 'FR',
  t = (k) => k,
  selectedChat,
  selectedListing,
  profile,
  localStream,
  remoteStream,
  facingMode = 'user',
  hasMultipleCameras = false,
  switchCamera,
  acceptIncomingCall,
  declineIncomingCall,
  endCall,
  toggleMic,
  toggleCam,
  toggleScreenShare,
  hostMuteParticipant,
  hostStopParticipantScreenShare,
  copyInviteLink,
  attachLocalStream,
  attachRemoteStream,
  handleAcceptIncomingCall,
  callDuration = 0,
  formatCallTimer = defaultFormatCallTimer,
  setSettlementCallDuration,
  setIsSettlementModalOpen,
  getAuthorAvatar = defaultGetAvatar,
}) {
  // ---- ÉTATS INTERNES D'APPEL PLEIN ÉCRAN ----
  const [isSwapVideo, setIsSwapVideo] = useState(false);
  const [showCallSubtitles, setShowCallSubtitles] = useState(true);
  const [showCallControls, setShowCallControls] = useState(true);
  const [isTeacherMenuOpen, setIsTeacherMenuOpen] = useState(false);

  // Détection du rôle Professeur / Hôte
  const isTeacher = Boolean(
    callState?.isHost ||
    (selectedChat?.author && profile?.name && selectedChat.author.toLowerCase() === profile.name.toLowerCase()) ||
    (selectedListing?.authorProfile?.name && profile?.name && selectedListing.authorProfile.name.toLowerCase() === profile.name.toLowerCase()) ||
    (selectedChat?.listing && profile?.skills?.some(s => selectedChat.listing.toLowerCase().includes(s.toLowerCase())))
  );

  // ---- DÉPLACEMENT TACTILE & DRAG-AND-DROP DE LA VIGNETTE VIDÉO FLOTTANTE ----
  const [localVideoPosition, setLocalVideoPosition] = useState({
    x: typeof window !== 'undefined' ? Math.max(16, window.innerWidth - 130) : 250,
    y: 85,
  });
  const localVideoPointerDragRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialPosX: 0,
    initialPosY: 0,
    movedDistance: 0,
  });

  const handleLocalVideoPointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
    localVideoPointerDragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: localVideoPosition.x,
      initialPosY: localVideoPosition.y,
      movedDistance: 0,
    };
  };

  const handleLocalVideoPointerMove = (e) => {
    if (!localVideoPointerDragRef.current.isDragging) return;
    const deltaX = e.clientX - localVideoPointerDragRef.current.startX;
    const deltaY = e.clientY - localVideoPointerDragRef.current.startY;
    localVideoPointerDragRef.current.movedDistance = Math.hypot(deltaX, deltaY);

    const vidW = 110;
    const vidH = 150;
    const maxX = Math.max(10, window.innerWidth - vidW - 10);
    const maxY = Math.max(10, window.innerHeight - vidH - 80);

    const nextX = Math.max(10, Math.min(maxX, localVideoPointerDragRef.current.initialPosX + deltaX));
    const nextY = Math.max(10, Math.min(maxY, localVideoPointerDragRef.current.initialPosY + deltaY));

    setLocalVideoPosition({ x: nextX, y: nextY });
  };

  const handleLocalVideoPointerUp = (e) => {
    if (!localVideoPointerDragRef.current.isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
    localVideoPointerDragRef.current.isDragging = false;
  };

  const handleLocalVideoClick = () => {
    if (localVideoPointerDragRef.current.movedDistance >= 6) return;
    setIsSwapVideo(prev => !prev);
  };

  // Ajustement fluide de la position de la vidéo flottante lors de la rotation d'écran (Portrait <-> Paysage)
  useEffect(() => {
    const handleScreenResize = () => {
      setLocalVideoPosition(prev => {
        const vidW = 110;
        const vidH = 150;
        const maxX = Math.max(10, (typeof window !== 'undefined' ? window.innerWidth : 400) - vidW - 10);
        const maxY = Math.max(10, (typeof window !== 'undefined' ? window.innerHeight : 700) - vidH - 80);
        return {
          x: Math.max(10, Math.min(maxX, prev.x)),
          y: Math.max(10, Math.min(maxY, prev.y)),
        };
      });
    };
    window.addEventListener('resize', handleScreenResize);
    window.addEventListener('orientationchange', handleScreenResize);
    return () => {
      window.removeEventListener('resize', handleScreenResize);
      window.removeEventListener('orientationchange', handleScreenResize);
    };
  }, []);

  // ---- MODE IMMERSION & TRANSPARENCE AUTOMATIQUE (INACTIVITÉ 5 SECONDES) ----
  const [isCallInactive, setIsCallInactive] = useState(false);
  const callInactivityTimerRef = useRef(null);

  const resetCallInactivity = useCallback(() => {
    setIsCallInactive(false);
    if (callInactivityTimerRef.current) {
      clearTimeout(callInactivityTimerRef.current);
    }
    callInactivityTimerRef.current = setTimeout(() => {
      setIsCallInactive(true);
    }, 5000);
  }, []);

  useEffect(() => {
    if (callState?.active && !isCallPip) {
      resetCallInactivity();
      return () => {
        if (callInactivityTimerRef.current) {
          clearTimeout(callInactivityTimerRef.current);
        }
      };
    } else {
      setIsCallInactive(false);
    }
  }, [callState?.active, isCallPip, resetCallInactivity]);

  // Masquage automatique des commandes lors du lancement d'un partage d'écran
  useEffect(() => {
    if (callState?.isScreenSharing || callState?.remoteScreenSharing) {
      setShowCallControls(false);
    }
  }, [callState?.isScreenSharing, callState?.remoteScreenSharing]);

  // ---- DÉPLACEMENT TACTILE DE LA BARRE DE CONTRÔLES D'APPEL ----
  const [callControlsPos, setCallControlsPos] = useState({ x: 0, y: 0 });
  const [isDraggingCallControls, setIsDraggingCallControls] = useState(false);
  const dragCallControlsRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });

  const handleCallControlsPointerDown = (e) => {
    if (e.target.closest('button')) return;
    setIsDraggingCallControls(true);
    dragCallControlsRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: callControlsPos.x,
      initialY: callControlsPos.y,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handleCallControlsPointerMove = (e) => {
    if (!isDraggingCallControls) return;
    const dx = e.clientX - dragCallControlsRef.current.startX;
    const dy = e.clientY - dragCallControlsRef.current.startY;
    setCallControlsPos({
      x: dragCallControlsRef.current.initialX + dx,
      y: dragCallControlsRef.current.initialY + dy,
    });
  };

  const handleCallControlsPointerUp = (e) => {
    if (isDraggingCallControls) {
      setIsDraggingCallControls(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
  };

  const onAccept = handleAcceptIncomingCall || acceptIncomingCall;

  return (
    <>
      {/* 1. OVERLAY DE SONNERIE ENTRANTE */}
      {incomingCall && !callState?.active && (
        <div style={{
          position: 'fixed',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: '520px',
          zIndex: 10000005,
          background: darkMode ? 'rgba(35,30,27,0.98)' : 'rgba(250,247,242,0.98)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1.5px solid var(--accent-primary)',
          borderRadius: '24px',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5), var(--shadow-accent)',
          animation: 'slideDownIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            color: '#FFF',
            fontWeight: '800',
            flexShrink: 0,
            boxShadow: 'var(--shadow-accent)',
          }}>
            {incomingCall.from ? incomingCall.from[0].toUpperCase() : 'T'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--text-main)', fontWeight: '800', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {incomingCall.from}
            </div>
            <div style={{ color: 'var(--accent-primary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '700' }}>
              {incomingCall.type === 'video' ? <Video size={13} color="var(--accent-primary)" /> : <Phone size={13} color="var(--accent-primary)" />}
              <span>{incomingCall.type === 'video' ? 'Appel vidéo entrant...' : 'Appel audio entrant...'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <button
              onClick={declineIncomingCall}
              style={{
                border: 'none',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-danger, #EF4444)',
                color: '#FFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(239,68,68,0.4)',
              }}
              title="Refuser l'appel"
            >
              <PhoneOff size={18} />
            </button>
            <button
              onClick={onAccept}
              style={{
                border: 'none',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-success, #10B981)',
                color: '#FFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(16,185,129,0.4)',
              }}
              title="Accepter l'appel"
            >
              <Phone size={18} />
            </button>
          </div>
        </div>
      )}

      {/* 2. MODAL D'APPEL WEBRTC PLEIN ÉCRAN */}
      {callState?.active && !isCallPip && (
        <div
          onPointerDown={resetCallInactivity}
          onPointerMove={resetCallInactivity}
          onTouchStart={resetCallInactivity}
          onClick={resetCallInactivity}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000000,
            backgroundColor: 'var(--call-bg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            animation: 'fadeSlideUp 0.3s ease both',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          {/* FLUX VIDÉO PRINCIPAL ARRIÈRE-PLAN */}
          {callState.type === 'video' ? (
            (callState.ringing || (!remoteStream && !isSwapVideo)) ? (
              localStream && callState.camOn ? (
                <video
                  ref={attachLocalStream}
                  muted
                  autoPlay
                  playsInline
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                    zIndex: 2,
                  }}
                />
              ) : null
            ) : (
              !isSwapVideo ? (
                remoteStream ? (
                  <video
                    ref={attachRemoteStream}
                    autoPlay
                    playsInline
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      zIndex: 2,
                    }}
                  />
                ) : (
                  localStream && callState.camOn ? (
                    <video
                      ref={attachLocalStream}
                      muted
                      autoPlay
                      playsInline
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                        zIndex: 2,
                      }}
                    />
                  ) : null
                )
              ) : (
                localStream && callState.camOn ? (
                  <video
                    ref={attachLocalStream}
                    muted
                    autoPlay
                    playsInline
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                      zIndex: 2,
                    }}
                  />
                ) : null
              )
            )
          ) : null}

          {remoteStream && (
            <audio ref={attachRemoteStream} autoPlay playsInline style={{ display: 'none' }} />
          )}

          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle at 50% 40%, var(--accent-primary) 0%, transparent 60%)',
            opacity: 0.25,
            zIndex: 1,
          }} />

          {/* BANDEAU SUPÉRIEUR CENTRÉ & ÉQUILIBRÉ */}
          <div style={{
            position: 'fixed',
            top: 'max(12px, env(safe-area-inset-top, 12px))',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 24px)',
            maxWidth: '440px',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            boxSizing: 'border-box',
            transition: 'all 500ms cubic-bezier(0.22, 1, 0.36, 1)',
            opacity: isCallInactive ? 0.35 : 1,
            pointerEvents: isCallInactive ? 'none' : 'auto',
          }}>
            {/* CAPSULE PRINCIPALE INFOS APPEL & RÉTRIBUTION */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: isCallInactive ? 'transparent' : 'var(--call-card)',
              backdropFilter: isCallInactive ? 'none' : 'blur(20px)',
              WebkitBackdropFilter: isCallInactive ? 'none' : 'blur(20px)',
              padding: '6px 12px',
              borderRadius: '999px',
              border: isCallInactive ? '1px solid transparent' : '1.5px solid var(--border-color)',
              boxShadow: isCallInactive ? 'none' : '0 12px 35px rgba(0,0,0,0.5), 0 0 20px rgba(214,69,110,0.2)',
              flex: '1',
              minWidth: 0,
              overflow: 'hidden',
            }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src={getAuthorAvatar(selectedChat?.user || 'Thomas G.')}
                  alt={selectedChat?.user || 'Thomas G.'}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid var(--accent-primary)', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-primary)',
                  border: '1.5px solid var(--call-bg)',
                }} />
              </div>

              <div style={{ minWidth: 0, flex: '1 1 auto', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <div style={{ color: '#FFF', fontSize: '12.5px', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedChat?.user || 'Thomas G.'}
                </div>
                <div style={{ color: 'var(--accent-primary)', fontSize: '10.5px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
                  <Clock size={11} color="var(--accent-primary)" />
                  <span>{formatCallTimer(callDuration)}</span>
                  <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>
                    (🪙 {(callDuration / 3600).toFixed(2)})
                  </span>
                </div>
              </div>

              {!callState.ringing && setIsSettlementModalOpen && (
                <button
                  onClick={() => {
                    if (setSettlementCallDuration) setSettlementCallDuration(callDuration);
                    setIsSettlementModalOpen(true);
                  }}
                  title="Ouvrir le bilan & transférer des jetons"
                  style={{
                    border: '1px solid #D97706',
                    backgroundColor: 'rgba(217,119,6,0.25)',
                    color: '#FDE68A',
                    padding: '4px 8px',
                    borderRadius: '999px',
                    fontSize: '10.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 0 10px rgba(217,119,6,0.25)',
                  }}
                >
                  <Coins size={11} color="#D97706" />
                  <span>Rétribuer</span>
                </button>
              )}

              {isTeacher && (
                <div style={{
                  padding: '3px 7px',
                  backgroundColor: 'rgba(217,119,6,0.25)',
                  border: '1px solid #D97706',
                  color: '#FDE68A',
                  borderRadius: '999px',
                  fontSize: '10px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}>
                  <Crown size={11} color="#D97706" />
                  <span>Hôte</span>
                </div>
              )}
            </div>

            {/* BOUTONS ACTIONS RAPIDES DU HEADER */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <button
                onClick={() => setIsCallPip(true)}
                title="Réduire en bulle flottante (PiP)"
                style={{
                  border: '1px solid var(--border-color)',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--call-card)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <Minimize2 size={16} />
              </button>

              <button
                onClick={endCall}
                title="Quitter l'appel"
                style={{
                  border: '1px solid var(--border-color)',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--call-card)',
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* OVERLAY SONNERIE / APPEL EN ATTENTE */}
          {callState.ringing && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
              zIndex: 30,
              pointerEvents: 'none',
              padding: '24px',
              boxSizing: 'border-box',
              backgroundColor: callState.type === 'video' ? 'rgba(0,0,0,0.35)' : 'transparent',
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '14px',
                backgroundColor: 'rgba(20, 18, 16, 0.78)',
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                border: '1.5px solid var(--accent-primary)',
                borderRadius: '28px',
                padding: '24px 32px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.6), var(--shadow-accent)',
                maxWidth: '340px',
                width: '100%',
                textAlign: 'center',
              }}>
                <div style={{ position: 'relative', width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {[1, 2].map(i => (
                    <div key={i} style={{
                      position: 'absolute',
                      width: `${90 + i * 32}px`,
                      height: `${90 + i * 32}px`,
                      borderRadius: '50%',
                      border: '2px solid var(--accent-primary)',
                      opacity: 0.4,
                      animation: `notifPulse ${1 + i * 0.3}s ease-in-out infinite`,
                      animationDelay: `${i * 0.2}s`,
                    }} />
                  ))}
                  <img
                    src={getAuthorAvatar(selectedChat?.user || 'Thomas G.')}
                    alt={selectedChat?.user || 'Thomas G.'}
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid var(--accent-primary)',
                      boxShadow: '0 0 24px rgba(214,69,110,0.5)',
                      position: 'relative',
                      zIndex: 2,
                    }}
                  />
                </div>

                <div>
                  <h3 className="font-editorial-heading" style={{ color: '#FFF', fontSize: '20px', fontWeight: '700', margin: '0 0 4px 0' }}>
                    {selectedChat?.user || 'Thomas G.'}
                  </h3>
                  <div style={{ color: 'var(--accent-primary)', fontSize: '13px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <span className="wave-bar" style={{ height: '12px' }} />
                    <span>{callState.type === 'video' ? 'Appel vidéo... Sonnerie' : 'Appel vocal HD... Sonnerie'}</span>
                    <span className="wave-bar" style={{ height: '12px' }} />
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', margin: '6px 0 0 0' }}>
                    En attente de réponse...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PLACEHOLDER UNIQUEMENT EN APPEL AUDIO OU SANS VIDÉO DISTANTE */}
          {(callState.type === 'audio' || (callState.type === 'video' && !remoteStream && !isSwapVideo && !callState.camOn)) && !callState.ringing && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', zIndex: 10 }}>
              <div style={{ position: 'relative' }}>
                <img
                  src={getAuthorAvatar(selectedChat?.user || 'Thomas G.')}
                  alt={selectedChat?.user || 'Thomas G.'}
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    border: '4px solid var(--accent-primary)',
                    boxShadow: '0 0 40px rgba(214, 69, 110, 0.35)',
                    objectFit: 'cover',
                  }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: '6px',
                  right: '6px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-primary)',
                  border: '3px solid var(--call-bg)',
                  boxShadow: '0 0 10px rgba(214,69,110,0.6)',
                }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h2 className="font-editorial-heading" style={{ color: '#FFF', fontSize: '26px', fontWeight: '600', margin: '0 0 4px 0' }}>
                  {selectedChat?.user || 'Thomas G.'}
                </h2>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600' }}>
                  {callState.type === 'video' ? 'Caméra distante désactivée' : 'Appel audio sécurisé WebRTC'}
                </span>
              </div>
            </div>
          )}

          {/* VIGNETTE FLOTTANTE DU FLUX SECONDAIRE */}
          {callState.type === 'video' && !callState.ringing && (
            (isSwapVideo ? remoteStream : (localStream && callState.camOn)) ? (
              <div
                onPointerDown={handleLocalVideoPointerDown}
                onPointerMove={handleLocalVideoPointerMove}
                onPointerUp={handleLocalVideoPointerUp}
                onPointerCancel={handleLocalVideoPointerUp}
                onClick={handleLocalVideoClick}
                title="Cliquer pour inverser les flux / Glisser pour déplacer"
                style={{
                  position: 'fixed',
                  left: `${localVideoPosition.x}px`,
                  top: `${localVideoPosition.y}px`,
                  width: '110px',
                  height: '150px',
                  borderRadius: '18px',
                  overflow: 'hidden',
                  border: '2px solid var(--accent-primary)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                  backgroundColor: 'var(--call-card)',
                  zIndex: 40,
                  cursor: 'grab',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  touchAction: 'none',
                  opacity: isCallInactive ? 0.5 : 1,
                }}
              >
                {isSwapVideo ? (
                  <video
                    ref={attachRemoteStream}
                    autoPlay
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      pointerEvents: 'none',
                    }}
                  />
                ) : (
                  <video
                    ref={attachLocalStream}
                    muted
                    autoPlay
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                      pointerEvents: 'none',
                    }}
                  />
                )}
                <div style={{
                  position: 'absolute',
                  bottom: '6px',
                  left: '6px',
                  backgroundColor: 'rgba(0,0,0,0.75)',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  color: '#FFF',
                  fontSize: '9px',
                  fontWeight: '700',
                  pointerEvents: 'none',
                }}>
                  {isSwapVideo ? (selectedChat?.user || 'Interlocuteur') : 'Moi'}
                </div>
              </div>
            ) : null
          )}

          {!showCallControls && (
            <button
              onClick={() => setShowCallControls(true)}
              className="premium-button"
              style={{
                position: 'fixed',
                bottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
                left: 'max(16px, env(safe-area-inset-left, 16px))',
                right: 'auto',
                transform: 'none',
                backgroundColor: 'var(--call-card)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid var(--border-color)',
                borderRadius: '999px',
                padding: '8px 18px',
                color: '#FFF',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 16px rgba(214,69,110,0.2)',
                zIndex: 50,
                animation: 'fadeSlideUp 0.25s ease both',
              }}
            >
              <Eye size={14} color="var(--accent-primary)" />
              <span>Afficher les commandes</span>
              <ChevronUp size={14} />
            </button>
          )}

          {/* SOUS-TITRES ET TRADUCTION VOCALE EN DIRECT (IA) */}
          <Suspense fallback={null}>
            <LiveCallSubtitles
              isActive={showCallSubtitles}
              currentLang={currentLang}
              speakerName={selectedChat?.user || 'Interlocuteur'}
              isCompact={false}
            />
          </Suspense>

          {showCallControls && (
            <div
              className="call-controls-dock"
              onPointerDown={handleCallControlsPointerDown}
              onPointerMove={handleCallControlsPointerMove}
              onPointerUp={handleCallControlsPointerUp}
              onPointerCancel={handleCallControlsPointerUp}
              style={{
                transform: `translate(${callControlsPos.x}px, ${callControlsPos.y}px)`,
                opacity: isCallInactive ? 0.35 : 1,
                cursor: isDraggingCallControls ? 'grabbing' : 'grab',
                backgroundColor: 'var(--call-card)',
                borderColor: 'var(--border-color)',
              }}
            >
              {/* LIGNE 1 : CONTRÔLES VITAUX (RACCROCHER, MICRO, CAMÉRA, PIP, POIGNÉE) */}
              <div className="call-controls-row">
                <div
                  title="Glisser pour déplacer"
                  style={{
                    color: 'rgba(255,255,255,0.5)',
                    cursor: isDraggingCallControls ? 'grabbing' : 'grab',
                    paddingRight: '2px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <GripHorizontal size={16} />
                </div>

                <button
                  className="call-btn-circle call-btn-hangup"
                  onClick={endCall}
                  title="Raccrocher et quitter l'appel"
                  style={{
                    backgroundColor: '#DC2626',
                    color: '#FFF',
                    border: '1.5px solid rgba(255,255,255,0.3)',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.6)',
                  }}
                >
                  <PhoneOff size={18} />
                </button>

                <button
                  className="call-btn-circle"
                  onClick={toggleMic}
                  style={{
                    backgroundColor: callState.micOn ? 'rgba(255,255,255,0.18)' : '#DC2626',
                    border: callState.micOn ? 'none' : '1.5px solid rgba(255,255,255,0.3)',
                  }}
                  title={callState.micOn ? 'Couper le micro' : 'Activer le micro'}
                >
                  {callState.micOn ? <Mic size={18} /> : <MicOff size={18} />}
                </button>

                {callState.type === 'video' && (
                  <button
                    className="call-btn-circle"
                    onClick={toggleCam}
                    style={{
                      backgroundColor: callState.camOn ? 'rgba(255,255,255,0.18)' : '#DC2626',
                      border: callState.camOn ? 'none' : '1.5px solid rgba(255,255,255,0.3)',
                    }}
                    title={callState.camOn ? 'Couper la caméra' : 'Activer la caméra'}
                  >
                    {callState.camOn ? <Camera size={18} /> : <VideoOff size={18} />}
                  </button>
                )}

                {/* BOUTON SOUS-TITRAGE EN DIRECT (IA) */}
                <button
                  className="call-btn-circle"
                  onClick={() => setShowCallSubtitles(s => !s)}
                  style={{
                    backgroundColor: showCallSubtitles ? 'var(--accent-primary)' : 'rgba(255,255,255,0.14)',
                    color: '#FFF',
                    fontWeight: '900',
                    fontSize: '12px',
                    boxShadow: showCallSubtitles ? '0 0 16px var(--accent-primary)' : 'none',
                  }}
                  title={showCallSubtitles ? 'Désactiver les sous-titres en direct' : 'Activer les sous-titres et traduction en direct'}
                >
                  CC
                </button>

                <button
                  className="call-btn-circle"
                  onClick={() => setIsCallPip(true)}
                  title="Réduire l'appel (PiP)"
                >
                  <Minimize2 size={18} />
                </button>
              </div>

              {/* LIGNE 2 : OUTILS ÉTENDUS (ÉCRAN, FLIP, SWAP, INVITER, IMMERSION, PROF) */}
              <div className="call-controls-row">
                {callState.type === 'video' && (
                  <button
                    className="call-btn-circle"
                    onClick={toggleScreenShare}
                    style={{
                      backgroundColor: callState.isScreenSharing ? 'var(--accent-primary)' : 'rgba(255,255,255,0.14)',
                      boxShadow: callState.isScreenSharing ? '0 0 16px var(--accent-primary)' : 'none',
                    }}
                    title={callState.isScreenSharing ? "Arrêter le partage d'écran" : "Partager mon écran"}
                  >
                    {callState.isScreenSharing ? <MonitorOff size={18} /> : <Monitor size={18} />}
                  </button>
                )}

                {callState.type === 'video' && callState.camOn && !callState.isScreenSharing && hasMultipleCameras && (
                  <button
                    className="call-btn-circle"
                    onClick={switchCamera}
                    style={{
                      backgroundColor: facingMode === 'environment' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.14)',
                      color: '#FFF',
                    }}
                    title={facingMode === 'user' ? 'Caméra arrière' : 'Caméra avant'}
                  >
                    <SwitchCamera size={18} />
                  </button>
                )}

                {callState.type === 'video' && (
                  <button
                    className="call-btn-circle"
                    onClick={() => setIsSwapVideo(s => !s)}
                    style={{
                      backgroundColor: isSwapVideo ? 'var(--accent-primary)' : 'rgba(255,255,255,0.14)',
                      color: '#FFF',
                    }}
                    title="Inverser les caméras"
                  >
                    <Repeat size={18} />
                  </button>
                )}

                <button
                  className="call-btn-circle"
                  onClick={copyInviteLink}
                  title="Copier le lien d'invitation"
                >
                  <UserPlus size={18} />
                </button>

                <button
                  className="call-btn-circle"
                  onClick={() => setShowCallControls(false)}
                  title="Mode Immersion (Masquer commandes)"
                  style={{ color: 'rgba(255,255,255,0.8)' }}
                >
                  <EyeOff size={18} />
                </button>

                {isTeacher && (
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <button
                      className="call-btn-circle"
                      onClick={() => setIsTeacherMenuOpen(o => !o)}
                      title="Outils Professeur / Modération"
                      style={{
                        backgroundColor: isTeacherMenuOpen ? '#D97706' : 'rgba(217,119,6,0.25)',
                        border: '1.5px solid #D97706',
                        color: '#FFF',
                      }}
                    >
                      <Crown size={18} />
                    </button>

                    {isTeacherMenuOpen && (
                      <div style={{
                        position: 'absolute',
                        bottom: '56px',
                        left: '0',
                        backgroundColor: 'var(--call-card)',
                        backdropFilter: 'blur(16px)',
                        borderRadius: '16px',
                        border: '1.5px solid var(--border-color)',
                        boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
                        padding: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        minWidth: '230px',
                        zIndex: 120,
                      }}>
                        <div style={{
                          padding: '6px 8px',
                          fontSize: '11px',
                          fontWeight: '800',
                          color: '#FDE68A',
                          borderBottom: '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}>
                          <Crown size={12} color="#D97706" /> Modération du cours
                        </div>
                        <button
                          onClick={() => {
                            if (hostMuteParticipant) hostMuteParticipant();
                            setIsTeacherMenuOpen(false);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 10px',
                            borderRadius: '10px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            color: '#FFF',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <MicOff size={14} /> Couper le micro de l'élève
                        </button>
                        <button
                          onClick={() => {
                            if (hostStopParticipantScreenShare) hostStopParticipantScreenShare();
                            setIsTeacherMenuOpen(false);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 10px',
                            borderRadius: '10px',
                            border: 'none',
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            color: '#FFF',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <MonitorOff size={14} /> Arrêter le partage élève
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
