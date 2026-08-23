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
      bottom: '16px',
      left: '16px',
      right: '16px',
      maxWidth: '640px',
      margin: '0 auto',
      zIndex: 3800,
      backgroundColor: darkMode ? '#231E1B' : '#FAF7F2',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: '24px',
      padding: '18px 22px',
      boxShadow: darkMode ? '0 20px 40px rgba(0,0,0,0.8), 0 0 25px rgba(198,125,91,0.15)' : '0 20px 40px rgba(61,53,48,0.18)',
      border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
      color: darkMode ? '#FAF7F2' : '#3D3530',
      animation: 'slideUp 0.3s ease-out',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          backgroundColor: darkMode ? 'rgba(198,125,91,0.2)' : '#F5EAE4',
          color: '#C67D5B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <ShieldCheck size={22} />
        </div>

        <div style={{ flex: 1 }}>
          <div className="font-editorial-heading" style={{ fontSize: '17px', fontWeight: '600', marginBottom: '4px', color: darkMode ? '#FAF7F2' : '#3D3530' }}>
            🍪 Respect de votre vie privée & Cookies
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: darkMode ? '#D4C5B5' : '#6B5E54', lineHeight: 1.5 }}>
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
                background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)',
                color: '#FFF',
                fontWeight: '800',
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(198,125,91,0.25)',
              }}
            >
              Tout accepter
            </button>

            <button
              onClick={handleDeclineAll}
              className="premium-button"
              style={{
                border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
                borderRadius: '999px',
                padding: '8px 14px',
                backgroundColor: 'transparent',
                color: darkMode ? '#D4C5B5' : '#6B5E54',
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
                  backgroundColor: darkMode ? 'rgba(232,221,211,0.1)' : '#F5EAE4',
                  color: '#C67D5B',
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
            color: darkMode ? '#D4C5B5' : '#6B5E54',
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
