import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Sparkles } from 'lucide-react';

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Vérifier si l'app est déjà installée en mode standalone
    if (
      (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) ||
      (typeof navigator !== 'undefined' && navigator.standalone)
    ) {
      setIsInstalled(true);
      return;
    }

    // Détection iOS Safari
    const userAgent = typeof window !== 'undefined' ? (window.navigator.userAgent || '') : '';
    const isAppleDevice = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    setIsIOS(isAppleDevice);

    // Écoute de l'événement natif d'installation PWA (Android / Chromium)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Ne pas réafficher si déjà refusé récemment
      const isDismissed = localStorage.getItem('troco_pwa_dismissed');
      if (!isDismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    // Pour iOS, afficher la bannière après un délai si non dismiss
    if (isAppleDevice && !localStorage.getItem('troco_pwa_dismissed')) {
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    try {
      localStorage.setItem('troco_pwa_dismissed', 'true');
    } catch (_) {}
  };

  if (isInstalled || !showBanner) return null;

  return (
    <>
      <div
        className="pwa-install-banner"
        style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: '460px',
          backgroundColor: 'var(--bg-card, #1A1715)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1.5px solid var(--accent-primary, #C67D5B)',
          borderRadius: '20px',
          padding: '12px 16px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.45), 0 0 20px rgba(198, 125, 91, 0.25)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          animation: 'fadeSlideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--accent-primary, #C67D5B) 0%, var(--accent-primary-hover, #A96242) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(198, 125, 91, 0.3)',
            }}
          >
            <Smartphone size={20} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main, #FAF7F2)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>Installer Troco App</span>
              <Sparkles size={12} color="var(--accent-primary, #C67D5B)" />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary, #A09A92)', lineHeight: 1.3 }}>
              Accès rapide et hors ligne depuis votre écran d'accueil
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={handleInstallClick}
            className="premium-button"
            style={{
              border: 'none',
              borderRadius: '12px',
              padding: '8px 14px',
              background: 'linear-gradient(135deg, var(--accent-primary, #C67D5B) 0%, var(--accent-primary-hover, #A96242) 100%)',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 14px rgba(198, 125, 91, 0.35)',
            }}
          >
            <Download size={13} />
            <span>Installer</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary, #A09A92)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Fermer"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* MODALE D'INSTRUCTIONS iOS */}
      {showIOSGuide && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card, #1A1715)',
              borderRadius: '24px',
              padding: '24px',
              maxWidth: '380px',
              width: '100%',
              border: '1.5px solid var(--border-color)',
              boxShadow: 'var(--shadow-modal)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '16px', backgroundColor: 'var(--accent-primary)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <Smartphone size={24} />
            </div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>
              Installer sur iPhone / iPad
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, textAlign: 'left' }}>
              1. Appuyez sur le bouton <strong>Partager</strong> <span style={{ fontSize: '15px' }}>⎋</span> en bas de Safari.<br />
              2. Faites défiler et touchez <strong>« Sur l'écran d'accueil »</strong> 📲.<br />
              3. Touchez <strong>Ajouter</strong> en haut à droite pour profiter de Troco en plein écran !
            </div>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="premium-button"
              style={{
                border: 'none',
                borderRadius: '14px',
                padding: '10px',
                backgroundColor: 'var(--accent-primary)',
                color: '#FFF',
                fontWeight: '800',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Compris ✓
            </button>
          </div>
        </div>
      )}
    </>
  );
}
