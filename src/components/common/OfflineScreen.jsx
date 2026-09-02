import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, Sparkles } from 'lucide-react';
import TrocoLogo3D from './TrocoLogo3D';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { hapticLight, hapticSuccess } from '../../utils/haptics';

/**
 * 🌐 OfflineScreen.jsx — Écran Hors-Ligne Interactif & Ludique
 * 
 * 1. Détection automatique de l'état de la connexion (useNetworkStatus).
 * 2. Plein écran fixe (100dvh, z-index 99999).
 * 3. Logo Troco 3D interactif et manipulable (Draggable + Tap Physics avec Framer Motion).
 * 4. Bouton de tentative de reconnexion avec animation de rotation.
 */
export default function OfflineScreen() {
  const { isOnline, checkConnection } = useNetworkStatus();
  const [isChecking, setIsChecking] = useState(false);
  const [rotateAngle, setRotateAngle] = useState(0);

  const handleRetry = async () => {
    hapticLight();
    setIsChecking(true);
    if (typeof checkConnection === 'function') {
      const online = await checkConnection();
      if (online) hapticSuccess();
    } else {
      setTimeout(() => setIsChecking(false), 800);
    }
    setIsChecking(false);
  };

  const handleSpinLogo = () => {
    hapticLight();
    setRotateAngle(prev => prev + 360);
  };

  if (isOnline) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100dvh',
          zIndex: 99999,
          backgroundColor: 'var(--bg-global, #FAF7F2)',
          backgroundImage: 'radial-gradient(circle at 50% 30%, var(--bg-subtle, #F2EDE4) 0%, var(--bg-global, #FAF7F2) 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          boxSizing: 'border-box',
          textAlign: 'center',
          overflow: 'hidden',
          userSelect: 'none',
        }}
      >
        {/* HALO SPATIAL D'ARRIÈRE-PLAN */}
        <div style={{
          position: 'absolute',
          width: '360px',
          height: '360px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(198, 125, 91, 0.15) 0%, transparent 70%)',
          filter: 'blur(30px)',
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        {/* CONTENEUR DU LOGO 3D MANIPULABLE & DRAGGABLE */}
        <div style={{ position: 'relative', zIndex: 1, marginBottom: '28px' }}>
          <motion.div
            drag
            dragConstraints={{ left: -50, right: 50, top: -50, bottom: 50 }}
            dragElastic={0.2}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            animate={{ rotate: rotateAngle }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={handleSpinLogo}
            style={{
              cursor: 'grab',
              display: 'inline-block',
              filter: 'drop-shadow(0 14px 28px rgba(198, 125, 91, 0.35))',
            }}
          >
            <TrocoLogo3D size={110} animated={true} />
          </motion.div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            marginTop: '8px',
            fontSize: '11px',
            fontWeight: '700',
            color: 'var(--accent-primary, #C67D5B)',
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            padding: '4px 10px',
            borderRadius: '999px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid var(--border-color, rgba(0,0,0,0.08))',
          }}>
            <Sparkles size={12} />
            <span>Touchez ou glissez le logo 3D</span>
          </div>
        </div>

        {/* TITRE ET TEXTE LUDIQUE */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#EF4444',
            padding: '6px 14px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: '800',
            alignSelf: 'center',
          }}>
            <WifiOff size={15} />
            <span>Connexion Internet Interrompue</span>
          </div>

          <h2 style={{
            fontSize: 'clamp(20px, 5vw, 24px)',
            fontWeight: '800',
            color: 'var(--text-main, #1F2937)',
            margin: 0,
            letterSpacing: '-0.02em',
          }}>
            Oups ! Vous avez perdu la connexion...
          </h2>

          <p style={{
            fontSize: '14px',
            color: 'var(--text-secondary, #6B7280)',
            lineHeight: 1.5,
            margin: 0,
          }}>
            Faites tourner le logo pendant que nous essayons de vous reconnecter 🌐
          </p>

          {/* BOUTON D'ESSAI DE RECONNEXION */}
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleRetry}
              disabled={isChecking}
              className="premium-button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '999px',
                border: 'none',
                background: 'linear-gradient(135deg, var(--accent-primary, #C67D5B) 0%, var(--accent-primary-hover, #A8644A) 100%)',
                color: '#FFFFFF',
                fontSize: '13.5px',
                fontWeight: '800',
                cursor: isChecking ? 'wait' : 'pointer',
                boxShadow: 'var(--shadow-accent, 0 4px 14px rgba(198, 125, 91, 0.35))',
                transition: 'transform 0.15s ease, opacity 0.15s ease',
              }}
            >
              <RefreshCw size={16} className={isChecking ? 'animate-spin' : ''} style={{ animation: isChecking ? 'spin 1s linear infinite' : 'none' }} />
              <span>{isChecking ? 'Tentative de reconnexion...' : 'Vérifier la connexion'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
