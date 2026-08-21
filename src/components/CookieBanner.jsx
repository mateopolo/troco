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
      backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: '20px',
      padding: '16px 20px',
      boxShadow: darkMode ? '0 20px 40px rgba(0,0,0,0.6), 0 0 25px rgba(96,165,250,0.15)' : '0 20px 40px rgba(0,0,0,0.15)',
      border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #E2E8F0',
      color: darkMode ? '#F8FAFC' : '#0F172A',
      animation: 'slideUp 0.3s ease-out',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          backgroundColor: darkMode ? 'rgba(59,130,246,0.2)' : '#EFF6FF',
          color: darkMode ? '#60A5FA' : '#04265A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <ShieldCheck size={20} />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: '800', marginBottom: '4px' }}>
            🍪 Respect de votre vie privée & Cookies
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: darkMode ? '#94A3B8' : '#64748B', lineHeight: 1.5 }}>
            Troco utilise des traceurs nécessaires au bon fonctionnement de la plateforme et à la mesure d'audience anonyme. Vous pouvez personnaliser vos choix à tout moment.
          </p>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
            <button
              onClick={handleAcceptAll}
              className="premium-button"
              style={{
                border: 'none',
                borderRadius: '999px',
                padding: '8px 16px',
                backgroundColor: '#04265A',
                color: '#FFF',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(4,38,90,0.25)',
              }}
            >
              Tout accepter
            </button>

            <button
              onClick={handleDeclineAll}
              className="premium-button"
              style={{
                border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #CBD5E1',
                borderRadius: '999px',
                padding: '8px 14px',
                backgroundColor: 'transparent',
                color: darkMode ? '#CBD5E1' : '#475569',
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
                  backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                  color: darkMode ? '#93C5FD' : '#3B82F6',
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
            color: darkMode ? '#94A3B8' : '#94A3B8',
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
