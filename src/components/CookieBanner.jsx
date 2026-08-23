import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, Sliders } from 'lucide-react';

export default function CookieBanner({
  darkMode = false,
  onOpenPrivacyCenter = null,
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('troco_cookie_consent');
      if (!consent) {
        // Afficher avec un léger délai pour une entrée fluide
        const timer = setTimeout(() => setIsVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      setIsVisible(false);
    }
  }, []);

  if (!isVisible) return null;

  const handleAcceptAll = () => {
    try {
      localStorage.setItem('troco_cookie_consent', 'accepted');
      localStorage.setItem('troco_privacy_settings', JSON.stringify({
        necessary: true,
        analytics: true,
        proximityAlerts: true,
        marketingEmails: true,
      }));
    } catch (e) {}
    setIsVisible(false);
  };

  const handleDeclineAll = () => {
    try {
      localStorage.setItem('troco_cookie_consent', 'declined');
      localStorage.setItem('troco_privacy_settings', JSON.stringify({
        necessary: true,
        analytics: false,
        proximityAlerts: false,
        marketingEmails: false,
      }));
    } catch (e) {}
    setIsVisible(false);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '86px',
      left: '16px',
      right: '16px',
      maxWidth: '640px',
      margin: '0 auto',
      zIndex: 100000,
      backgroundColor: 'var(--bg-card)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: '24px',
      padding: '18px 22px',
      boxShadow: 'var(--shadow-modal)',
      border: '1.5px solid var(--border-color)',
      color: 'var(--text-main)',
      animation: 'slideUp 0.3s ease-out',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-subtle)',
          color: 'var(--accent-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <ShieldCheck size={22} />
        </div>

        <div style={{ flex: 1 }}>
          <div className="font-editorial-heading" style={{ fontSize: '17px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-main)' }}>
            🍪 Respect de votre vie privée & Cookies
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Troco utilise des traceurs nécessaires au bon fonctionnement de la plateforme et à la mesure d'audience anonyme. Vous pouvez personnaliser vos choix à tout moment.
          </p>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px' }}>
            <button
              onClick={handleAcceptAll}
              className="premium-button"
              style={{
                border: 'none',
                borderRadius: '999px',
                padding: '8px 18px',
                background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                color: 'var(--accent-contrast-text, #FFF)',
                fontWeight: '800',
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-accent)',
              }}
            >
              Tout accepter
            </button>

            <button
              onClick={handleDeclineAll}
              className="premium-button"
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: '999px',
                padding: '8px 14px',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Continuer sans accepter
            </button>

            {onOpenPrivacyCenter && (
              <button
                onClick={() => {
                  setIsVisible(false);
                  onOpenPrivacyCenter();
                }}
                className="premium-button"
                style={{
                  border: 'none',
                  borderRadius: '999px',
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--accent-primary)',
                  fontWeight: '700',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Sliders size={13} /> Personnaliser
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => setIsVisible(false)}
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

