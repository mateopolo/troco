import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video, Phone, ZoomIn, ZoomOut, Mic, MicOff, Camera,
  VideoOff, UserPlus, PhoneOff, GripHorizontal, MoreHorizontal, Globe
} from 'lucide-react';
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
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  if (!callState?.active) return null;

  const chatUser = selectedChat?.user || 'Interlocuteur';
  const chatAvatar = (selectedChat?.avatar || (getAuthorAvatar ? getAuthorAvatar(chatUser) : '')) || '';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000000,
      backgroundColor: '#000000',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', animation: 'fadeSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
      userSelect: 'none', WebkitUserSelect: 'none'
    }}>
      {/* GRADIENT SUBTIL FACETIME */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.65) 100%)',
        pointerEvents: 'none',
        zIndex: 2,
      }} />

      {/* PILULE SUPÉRIEURE FACETIME DISCRÈTE (NOM, STATUT) */}
      <div style={{
        position: 'fixed', top: 'max(16px, env(safe-area-inset-top, 16px))',
        left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: '10px',
        backgroundColor: 'rgba(20, 20, 24, 0.45)', backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        padding: '6px 16px', borderRadius: '999px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
        zIndex: 50
      }}>
        {chatAvatar ? (
          <img src={chatAvatar} alt={chatUser} style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#27272A', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '12px' }}>
            {chatUser[0]}
          </div>
        )}
        <div>
          <div style={{ color: '#FFFFFF', fontSize: '12.5px', fontWeight: '800', lineHeight: 1.2 }}>{chatUser}</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10.5px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {callState.type === 'video' ? <Video size={10} /> : <Phone size={10} />}
            {callState.type === 'video' ? 'Appel vidéo FaceTime' : 'Appel audio HD'}
          </div>
        </div>
      </div>

      {/* FLUX VIDÉO LOCAL (PIP STYLE FACETIME AVEC COINS ARRONDIS) */}
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

      {/* INFORMATIONS DE L'APPELANT : CENTRAGE ABSOLU ET TRANSPARENCE TOTALE (SANS AUCUN CADRE OPAQUE) */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '18px',
        zIndex: 30,
        pointerEvents: 'none',
        width: '100%',
        maxWidth: '92vw',
        textAlign: 'center',
      }}>
        <div style={{ position: 'relative', width: '110px', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {[1, 2].map(i => (
            <div key={i} style={{
              position: 'absolute',
              width: `${110 + i * 32}px`,
              height: `${110 + i * 32}px`,
              borderRadius: '50%',
              border: '1.5px solid rgba(255,255,255,0.3)',
              opacity: 0.35,
              animation: `notifPulse ${1.5 + i * 0.4}s ease-in-out infinite`,
              animationDelay: `${i * 0.25}s`,
            }} />
          ))}
          {chatAvatar ? (
            <img src={chatAvatar} alt={chatUser} style={{ width: '100px', height: '100px', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.7)', boxShadow: '0 16px 40px rgba(0,0,0,0.6)', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))', objectFit: 'cover', position: 'relative', zIndex: 2 }} />
          ) : (
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '38px', color: '#FFF', fontWeight: '800', boxShadow: '0 16px 40px rgba(0,0,0,0.6)', position: 'relative', zIndex: 2 }}>{chatUser[0]}</div>
          )}
        </div>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{
            color: '#FFFFFF',
            fontSize: '26px',
            fontWeight: '800',
            margin: '0 0 6px 0',
            textShadow: '0 2px 14px rgba(0,0,0,0.95), 0 0 4px rgba(0,0,0,0.8)',
            letterSpacing: '-0.3px',
          }}>
            {chatUser}
          </h2>
          <div style={{
            color: 'rgba(255,255,255,0.9)',
            fontSize: '14px',
            fontWeight: '600',
            textShadow: '0 1px 8px rgba(0,0,0,0.85)',
          }}>
            {callState.type === 'video' ? 'Appel vidéo FaceTime sécurisé' : 'Appel audio haute fidélité'}
          </div>
        </div>
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
        <div style={{ position: 'absolute', bottom: '110px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(20,20,24,0.85)', color: '#FFFFFF', padding: '8px 18px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', zIndex: 60 }}>
          Lien d’invitation copié !
        </div>
      )}

      {/* BARRE DE CONTRÔLES DRAGGABLE & ÉPURÉE (FACETIME GLASSMORPHISM AVEC FRAMER MOTION) */}
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.08}
        className="facetime-controls-dock"
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
          title={callState.micOn ? "Couper le micro" : "Activer le micro"}
        >
          {callState.micOn ? <Mic size={20} /> : <MicOff size={20} color="#EF4444" />}
        </button>

        {/* 2. CAMÉRA */}
        {callState.type === 'video' && (
          <button
            className={`facetime-btn ${!callState.camOn ? 'is-off' : ''}`}
            onClick={toggleCam}
            title={callState.camOn ? "Couper la caméra" : "Activer la caméra"}
          >
            {callState.camOn ? <Camera size={20} /> : <VideoOff size={20} color="#EF4444" />}
          </button>
        )}

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
                  className={`facetime-menu-item ${showSubtitles ? 'active' : ''}`}
                  onClick={() => {
                    setShowSubtitles(s => !s);
                    setShowMoreMenu(false);
                  }}
                >
                  <Globe size={16} />
                  <span>{showSubtitles ? 'Désactiver sous-titres' : 'Sous-titres & Traduction IA'}</span>
                </button>

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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

