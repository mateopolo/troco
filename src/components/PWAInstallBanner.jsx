import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Sparkles } from 'lucide-react';

let globalDeferredPrompt = null;
const listeners = new Set();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    globalDeferredPrompt = e;
    listeners.forEach((cb) => cb(e));
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    listeners.forEach((cb) => cb(null));
  });
}

/**
 * Hook personnalisé pour l'état d'installation PWA
 */
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(!!globalDeferredPrompt);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (
      (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) ||
      (typeof navigator !== 'undefined' && navigator.standalone)
    ) {
      setIsStandalone(true);
      return;
    }

    const userAgent = typeof window !== 'undefined' ? (window.navigator.userAgent || '') : '';
    const isAppleDevice = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    setIsIOS(isAppleDevice);

    const updatePrompt = (e) => {
      setCanInstall(!!e);
    };

    listeners.add(updatePrompt);
    return () => listeners.delete(updatePrompt);
  }, []);

  const triggerInstall = async (onShowIOSGuide) => {
    if (globalDeferredPrompt) {
      globalDeferredPrompt.prompt();
      const { outcome } = await globalDeferredPrompt.userChoice;
      if (outcome === 'accepted') {
        globalDeferredPrompt = null;
        setCanInstall(false);
      }
    } else if (isIOS && onShowIOSGuide) {
      onShowIOSGuide();
    }
  };

  return { canInstall: canInstall || (isIOS && !isStandalone), isStandalone, isIOS, triggerInstall };
}

/**
 * Bouton d'installation permanent pour le Profil ou la Navbar
 */
export function PWAInstallProfileCard({ onOpenGuide = null }) {
  const { isStandalone, triggerInstall } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (isStandalone) {
    return (
      <div style={{
        padding: '12px 16px',
        borderRadius: '16px',
        backgroundColor: 'var(--bg-subtle)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '12.5px',
        fontWeight: '700',
        color: 'var(--accent-success)'
      }}>
        <Smartphone size={18} />
        <span>Application Troco installée sur cet appareil ✓</span>
      </div>
    );
  }

  const handleAction = () => {
    triggerInstall(() => {
      if (onOpenGuide) onOpenGuide();
      else setShowIOSModal(true);
    });
  };

  return (
    <>
      <div
        onClick={handleAction}
        className="premium-button"
        style={{
          padding: '14px 16px',
          borderRadius: '18px',
          backgroundColor: 'var(--bg-subtle)',
          border: '1.5px solid var(--accent-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-card)',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Download size={18} />
          </div>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Installer l'application Troco</span>
              <Sparkles size={13} color="var(--accent-primary)" />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Accès rapide plein écran & notifications
            </div>
          </div>
        </div>

        <button
          type="button"
          style={{
            border: 'none',
            borderRadius: '10px',
            padding: '7px 12px',
            backgroundColor: 'var(--accent-primary)',
            color: '#FFFFFF',
            fontSize: '11.5px',
            fontWeight: '800',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          Installer
        </button>
      </div>

      {showIOSModal && (
        <IOSInstallModal onClose={() => setShowIOSModal(false)} />
      )}
    </>
  );
}

function IOSInstallModal({ onClose }) {
  return (
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
      onClick={onClose}
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
          onClick={onClose}
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
  );
}

/**
 * Bannière flottante discrète affichée 1 seule fois
 */
export default function PWAInstallBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const { canInstall, isStandalone, isIOS, triggerInstall } = usePWAInstall();

  useEffect(() => {
    if (isStandalone) return;

    // Afficher une seule fois très discrètement si non dismiss
    const isDismissed = localStorage.getItem('troco_pwa_dismissed');
    if (!isDismissed && (canInstall || isIOS)) {
      const showTimer = setTimeout(() => {
        setShowBanner(true);
      }, 3500);

      // Auto-dismiss discret après 8 secondes
      const hideTimer = setTimeout(() => {
        setShowBanner(false);
        try {
          localStorage.setItem('troco_pwa_dismissed', 'true');
        } catch (_) {}
      }, 12000);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [canInstall, isIOS, isStandalone]);

  const handleInstallClick = () => {
    triggerInstall(() => setShowIOSGuide(true));
    handleDismiss();
  };

  const handleDismiss = () => {
    setShowBanner(false);
    try {
      localStorage.setItem('troco_pwa_dismissed', 'true');
    } catch (_) {}
  };

  if (isStandalone || !showBanner) return null;

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
          maxWidth: '440px',
          backgroundColor: 'var(--bg-card, #1A1715)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1.5px solid var(--accent-primary, #C67D5B)',
          borderRadius: '18px',
          padding: '10px 14px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.45), 0 0 20px rgba(198, 125, 91, 0.25)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          animation: 'fadeSlideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--accent-primary, #C67D5B) 0%, var(--accent-primary-hover, #A96242) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              flexShrink: 0,
            }}
          >
            <Smartphone size={18} />
          </div>
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Installer Troco App</span>
              <Sparkles size={11} color="var(--accent-primary)" />
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', lineHeight: 1.2 }}>
              Installation 1-clic sur l'écran d'accueil
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
              borderRadius: '10px',
              padding: '7px 12px',
              background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
              color: '#FFFFFF',
              fontSize: '11.5px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
              boxShadow: 'var(--shadow-accent)',
            }}
          >
            <Download size={12} />
            <span>Installer</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Fermer"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {showIOSGuide && (
        <IOSInstallModal onClose={() => setShowIOSGuide(false)} />
      )}
    </>
  );
}
