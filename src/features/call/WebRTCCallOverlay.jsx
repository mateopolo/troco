import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Camera,
  SwitchCamera,
  Minimize2,
  Crown,
  MoreHorizontal,
  GripHorizontal,
  UserPlus,
  MonitorUp,
  Globe,
} from 'lucide-react';

import Portal from '../../components/ui/Portal';

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
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Détection du rôle Professeur / Hôte
  const isTeacher = Boolean(
    callState?.isHost ||
    (selectedChat?.author && profile?.name && selectedChat.author.toLowerCase() === profile.name.toLowerCase()) ||
    (selectedListing?.authorProfile?.name && profile?.name && selectedListing.authorProfile.name.toLowerCase() === profile.name.toLowerCase()) ||
    (selectedChat?.listing && profile?.skills?.some(s => selectedChat.listing.toLowerCase().includes(s.toLowerCase())))
  );

  const partnerName = selectedChat?.user || incomingCall?.from || selectedListing?.authorProfile?.name || 'Interlocuteur';
  const partnerAvatar = selectedChat?.avatar || getAuthorAvatar(partnerName);

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
      setShowMoreMenu(false);
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

  const onAccept = handleAcceptIncomingCall || acceptIncomingCall;

  return (
    <>
      {/* 1. OVERLAY DE SONNERIE ENTRANTE */}
      {incomingCall && !callState?.active && (
        <Portal containerId="modal-root" lockScroll={false}>
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
        </Portal>
      )}

      {/* 2. MODAL D'APPEL WEBRTC PLEIN ÉCRAN — STYLE FACETIME IMMERSIF */}
      {callState?.active && !isCallPip && (
        <Portal containerId="modal-root">
          <div
            onPointerDown={resetCallInactivity}
            onPointerMove={resetCallInactivity}
            onTouchStart={resetCallInactivity}
            onClick={resetCallInactivity}
            className="fixed inset-0 z-[999999] bg-[var(--bg-global)] flex flex-col"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999999,
              backgroundColor: '#000000',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              animation: 'fadeSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
          >
          {/* FLUX VIDÉO PRINCIPAL (100% DE L'ÉCRAN SANS CADRES NI BORDURES) */}
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
                    border: 'none',
                    borderRadius: 0,
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
                      border: 'none',
                      borderRadius: 0,
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
                        border: 'none',
                        borderRadius: 0,
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
                      border: 'none',
                      borderRadius: 0,
                    }}
                  />
                ) : null
              )
            )
          ) : null}

          {remoteStream && (
            <audio ref={attachRemoteStream} autoPlay playsInline style={{ display: 'none' }} />
          )}

          {/* DÉGRADÉ SUPÉRIEUR ET INFÉRIEUR FACETIME SUBTIL */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.65) 100%)',
            pointerEvents: 'none',
            zIndex: 3,
          }} />

          {/* 1. BARRE D'INFO COMPACTE SUPÉRIEURE (AVATAR + NOM + STATUS "En appel • durée" + BOUTON MUTE) */}
          <div style={{
            position: 'fixed',
            top: 'max(16px, env(safe-area-inset-top, 16px))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            backgroundColor: 'rgba(20, 20, 24, 0.65)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '999px',
            padding: '6px 14px 6px 8px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
            maxWidth: '92vw',
            minWidth: '240px',
            transition: 'opacity 0.4s ease',
            opacity: isCallInactive ? 0.4 : 1,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
              <div style={{ position: 'relative', width: '32px', height: '32px', flexShrink: 0 }}>
                <img
                  src={partnerAvatar}
                  alt={partnerName}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: '0px',
                  right: '0px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  border: '1.5px solid #141418',
                }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: '700',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {partnerName}
                  </span>
                  {isTeacher && (
                    <span style={{
                      padding: '1px 5px',
                      backgroundColor: 'rgba(245, 158, 11, 0.25)',
                      border: '1px solid #F59E0B',
                      color: '#FDE68A',
                      borderRadius: '999px',
                      fontSize: '9px',
                      fontWeight: '800',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                      flexShrink: 0,
                    }}>
                      <Crown size={9} color="#F59E0B" /> Hôte
                    </span>
                  )}
                </div>
                <span style={{ color: 'rgba(255,255,255,0.72)', fontSize: '11px', fontWeight: '500', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                  {callState.ringing
                    ? 'Sonnerie...'
                    : `En appel • ${formatCallTimer(callDuration)}`}
                </span>
              </div>
            </div>

            {/* BOUTON MUTE RAPIDE À DROITE */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (typeof toggleMic === 'function') toggleMic();
              }}
              title={callState.micOn ? 'Couper le micro' : 'Activer le micro'}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: callState.micOn ? 'rgba(255, 255, 255, 0.12)' : 'rgba(239, 68, 68, 0.35)',
                color: callState.micOn ? '#FFFFFF' : '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.18s ease',
              }}
            >
              {callState.micOn ? <Mic size={15} /> : <MicOff size={15} color="#EF4444" />}
            </button>
          </div>

          {/* 2. AVATAR CENTRAL AGRANDI SANS BORDURE BLANCHE (UNIQUEMENT SI PAS DE FLUX VIDÉO REÇU) */}
          {(callState.ringing || (callState.type === 'audio') || (!remoteStream && !isSwapVideo && !callState.camOn)) && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '14px',
              zIndex: 20,
              pointerEvents: 'none',
              width: '100%',
              maxWidth: '92vw',
              textAlign: 'center',
            }}>
              <div style={{ position: 'relative', width: '128px', height: '128px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={partnerAvatar}
                  alt=""
                  style={{
                    width: '128px',
                    height: '128px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: 'none',
                    boxShadow: '0 20px 48px rgba(0,0,0,0.65)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  }}
                />
              </div>

              {callState.ringing && (
                <div style={{
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: '13.5px',
                  fontWeight: '600',
                  textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                }}>
                  {callState.type === 'video' ? 'Appel vidéo en cours...' : 'Appel audio en cours...'}
                </div>
              )}
            </div>
          )}

          {/* VIGNETTE FLOTTANTE DU FLUX LOCAL (STYLE FACETIME PIP AVEC COINS ARRONDIS ET OMBRES DOUCES) */}
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
                  width: '116px',
                  height: '162px',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  border: '1.5px solid rgba(255, 255, 255, 0.22)',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.65), 0 4px 12px rgba(0,0,0,0.4)',
                  backgroundColor: '#18181B',
                  zIndex: 40,
                  cursor: 'grab',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  touchAction: 'none',
                  opacity: isCallInactive ? 0.5 : 1,
                  transition: 'opacity 0.3s ease',
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
              </div>
            ) : null
          )}

          {/* SOUS-TITRES ET TRADUCTION VOCALE EN DIRECT (IA) */}
          <Suspense fallback={null}>
            <LiveCallSubtitles
              isActive={showCallSubtitles}
              currentLang={currentLang}
              speakerName={selectedChat?.user || incomingCall?.from || 'Interlocuteur'}
              isCompact={false}
              chatId={callState?.roomId || selectedChat?.id || incomingCall?.chatId}
              myProfile={profile}
              partnerName={selectedChat?.user || incomingCall?.from || 'Interlocuteur'}
              isMuted={!callState?.micOn}
              micOn={callState?.micOn}
            />
          </Suspense>

          {/* BARRE D'OUTILS DRAGGABLE & ÉPURÉE (FACETIME GLASSMORPHISM AVEC FRAMER MOTION) */}
          {showCallControls && (
            <motion.div
              drag
              dragMomentum={false}
              dragElastic={0.08}
              className="facetime-controls-dock"
              style={{
                opacity: isCallInactive ? 0.35 : 1,
              }}
            >
              {/* POIGNÉE DE GLISSEMENT FLUIDE (GRIP) */}
              <div
                title="Glisser pour déplacer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  color: 'rgba(255,255,255,0.6)',
                  padding: '0 4px 0 2px',
                  cursor: 'grab',
                }}
              >
                <GripHorizontal size={18} />
              </div>

              {/* 1. MICROPHONE */}
              <button
                className={`facetime-btn ${!callState.micOn ? 'is-muted' : ''}`}
                onClick={toggleMic}
                title={callState.micOn ? 'Couper le micro' : 'Activer le micro'}
              >
                {callState.micOn ? <Mic size={20} /> : <MicOff size={20} color="#EF4444" />}
              </button>

              {/* 2. CAMÉRA */}
              <button
                className={`facetime-btn ${!callState.camOn ? 'is-off' : ''}`}
                onClick={toggleCam}
                title={callState.camOn ? 'Couper la caméra' : 'Activer la caméra'}
              >
                {callState.camOn ? <Camera size={20} /> : <VideoOff size={20} color="#EF4444" />}
              </button>

              {/* 3. BOUTON RACCROCHER (CERCLE ROUGE PROÉMINENT) */}
              <button
                className="facetime-btn facetime-btn-hangup"
                onClick={endCall}
                title="Raccrocher"
              >
                <PhoneOff size={22} />
              </button>

              {/* 4. BOUTON "PLUS..." POUR REGROUPER LES OPTIONS */}
              <div style={{ position: 'relative' }}>
                <button
                  className={`facetime-btn ${showMoreMenu ? 'is-muted' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMoreMenu(prev => !prev);
                  }}
                  title="Plus d'options"
                >
                  <MoreHorizontal size={20} />
                </button>

                {/* MINI-MENU FLOTTANT GLASSMORPHISM */}
                <AnimatePresence>
                  {showMoreMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="facetime-more-menu"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* SOUS-TITRES IA */}
                      <button
                        className={`facetime-menu-item ${showCallSubtitles ? 'active' : ''}`}
                        onClick={() => {
                          setShowCallSubtitles(s => !s);
                          setShowMoreMenu(false);
                        }}
                      >
                        <Globe size={16} />
                        <span>{showCallSubtitles ? 'Désactiver sous-titres' : 'Sous-titres & Traduction IA'}</span>
                      </button>

                      {/* BASCULE CAMÉRA (FLIP) */}
                      {callState.type === 'video' && callState.camOn && hasMultipleCameras && (
                        <button
                          className="facetime-menu-item"
                          onClick={() => {
                            if (switchCamera) switchCamera();
                            setShowMoreMenu(false);
                          }}
                        >
                          <SwitchCamera size={16} />
                          <span>Inverser la caméra</span>
                        </button>
                      )}

                      {/* PARTAGE D'ÉCRAN */}
                      {typeof toggleScreenShare === 'function' && (
                        <button
                          className="facetime-menu-item"
                          onClick={() => {
                            toggleScreenShare();
                            setShowMoreMenu(false);
                          }}
                        >
                          <MonitorUp size={16} />
                          <span>Partager l'écran</span>
                        </button>
                      )}

                      {/* COPIER LE LIEN D'INVITATION */}
                      {typeof copyInviteLink === 'function' && (
                        <button
                          className="facetime-menu-item"
                          onClick={() => {
                            copyInviteLink();
                            setShowMoreMenu(false);
                          }}
                        >
                          <UserPlus size={16} />
                          <span>Inviter un participant</span>
                        </button>
                      )}

                      {/* RÉDUIRE EN PIP */}
                      <button
                        className="facetime-menu-item"
                        onClick={() => {
                          setIsCallPip(true);
                          setShowMoreMenu(false);
                        }}
                      >
                        <Minimize2 size={16} />
                        <span>Réduire en vignette (PiP)</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
          </div>
        </Portal>
      )}
    </>
  );
}
