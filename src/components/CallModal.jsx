import React from 'react';
import { Video, Phone, X, ZoomIn, ZoomOut, Mic, MicOff, Camera, VideoOff, UserPlus, PhoneOff } from 'lucide-react';
import { getAuthorAvatar } from '../data/mockData';

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
  setLocalZoom
}) {
  if (!callState.active) return null;

  const chatUser = selectedChat?.user || 'Thomas G.';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      backgroundColor: '#0F172A',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', animation: 'fadeSlideUp 0.3s ease both'
    }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 50% 40%, rgba(96,165,250,0.15) 0%, transparent 60%)' }} />

      {/* BANDEAU SUPÉRIEUR CLASSIQUE */}
      <div style={{
        position: 'absolute', top: '24px', left: '24px', right: '24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 20
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          backgroundColor: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          padding: '8px 16px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <img src={getAuthorAvatar ? getAuthorAvatar(chatUser) : ''} alt={chatUser} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #60A5FA' }} />
          <div>
            <div style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '800' }}>{chatUser}</div>
            <div style={{ color: '#60A5FA', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {callState.type === 'video' ? <Video size={11} /> : <Phone size={11} />}
              {callState.type === 'video' ? 'Appel vidéo en direct' : 'Appel audio HD'}
            </div>
          </div>
        </div>

        <button
          onClick={endCall}
          title="Quitter l'appel"
          style={{
            border: 'none', width: '42px', height: '42px', borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s ease'
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* FLUX VIDÉO LOCAL (PIP) AVEC ZOOM */}
      {callState.type === 'video' && localStream && (
        <div style={{
          position: 'absolute', bottom: '110px', right: '28px',
          width: localZoom ? '240px' : '160px',
          height: localZoom ? '160px' : '110px',
          borderRadius: '20px', overflow: 'hidden',
          border: '2px solid #60A5FA',
          boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
          zIndex: 20, backgroundColor: '#0F172A',
          transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)'
        }}>
          <video ref={localVideoRef} muted playsInline autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover', transform: localZoom ? 'scaleX(-1) scale(1.6)' : 'scaleX(-1) scale(1.0)', transition: 'transform 0.3s ease' }} />
          <button onClick={() => setLocalZoom && setLocalZoom(z => !z)} title={localZoom ? "Zoom arrière" : "Zoom sur ma caméra"} style={{ position: 'absolute', bottom: '8px', right: '8px', border: 'none', borderRadius: '50%', width: '26px', height: '26px', backgroundColor: 'rgba(15,23,42,0.8)', color: '#60A5FA', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
            {localZoom ? <ZoomOut size={13} /> : <ZoomIn size={13} />}
          </button>
        </div>
      )}

      {/* VISUEL CENTRAL */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', zIndex: 10, pointerEvents: 'none' }}>
        {callState.type === 'video' && !localStream ? (
          <>
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'linear-gradient(135deg, #60A5FA 0%, #04265A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '46px', color: '#FFF', fontWeight: '800', boxShadow: '0 0 50px rgba(96,165,250,0.45)' }}>{chatUser[0]}</div>
            <div style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '800' }}>{chatUser}</div>
            <div style={{ color: '#94A3B8', fontSize: '13px' }}>Caméra distante en attente...</div>
          </>
        ) : callState.type === 'video' ? (
          <>
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'linear-gradient(135deg, #F9A8D4 0%, #7C3AED 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '46px', color: '#FFF', fontWeight: '800', boxShadow: '0 0 50px rgba(249,168,212,0.4)' }}>{chatUser[0]}</div>
            <div style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '800' }}>{chatUser}</div>
            <div style={{ color: '#94A3B8', fontSize: '13px' }}>Connexion sécurisée établie</div>
          </>
        ) : (
          <>
            <div className="call-ring" style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'linear-gradient(135deg, #60A5FA 0%, #04265A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '46px', color: '#FFF', fontWeight: '800', boxShadow: '0 0 50px rgba(96,165,250,0.4)' }}>{chatUser[0]}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '24px' }}>
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="wave-bar" style={{ height: `${10 + (i % 3) * 10}px`, animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>
            <div style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '800' }}>{chatUser}</div>
            <div style={{ color: '#94A3B8', fontSize: '13px' }}>Appel audio haute fidélité</div>
          </>
        )}
      </div>

      {/* NOTIFICATION D'INVITATION COPIÉE */}
      {callState.copied && (
        <div style={{ position: 'absolute', bottom: '96px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#04265A', color: '#FFF', padding: '8px 18px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', boxShadow: '0 6px 20px rgba(4,38,90,0.5)', zIndex: 60 }}>
          Lien d’invitation copié !
        </div>
      )}

      {/* BARRE DE CONTRÔLES FIXÉE EN BAS AU CENTRE */}
      <div style={{
        position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
        backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        padding: '12px 24px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '16px',
        border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', zIndex: 50
      }}>
        <button
          onClick={toggleMic}
          title={callState.micOn ? "Coupure micro" : "Activer le micro"}
          style={{ border: 'none', width: '46px', height: '46px', borderRadius: '50%', backgroundColor: callState.micOn ? 'rgba(255,255,255,0.15)' : '#EF4444', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
        >
          {callState.micOn ? <Mic size={18} /> : <MicOff size={18} />}
        </button>

        {callState.type === 'video' && (
          <button
            onClick={toggleCam}
            title={callState.camOn ? "Caméra désactivée" : "Activer la caméra"}
            style={{ border: 'none', width: '46px', height: '46px', borderRadius: '50%', backgroundColor: callState.camOn ? 'rgba(255,255,255,0.15)' : '#EF4444', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
          >
            {callState.camOn ? <Camera size={18} /> : <VideoOff size={18} />}
          </button>
        )}

        <button
          onClick={copyInviteLink}
          title="Inviter en groupe"
          style={{ border: 'none', width: '46px', height: '46px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
        >
          <UserPlus size={18} />
        </button>

        <button
          onClick={endCall}
          title="Raccrocher"
          style={{ border: 'none', width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#EF4444', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(239,68,68,0.55)', transition: 'transform 0.2s ease' }}
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
}
