import React from 'react';
import { Globe, X, CheckCircle } from 'lucide-react';

const AVAILABLE_LANGUAGES = [
  { code: 'FR', label: 'Français', flag: '🇫🇷' },
  { code: 'EN', label: 'English', flag: '🇬🇧' },
  { code: 'ES', label: 'Español', flag: '🇪🇸' },
  { code: 'IT', label: 'Italiano', flag: '🇮🇹' },
  { code: 'DE', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'JA', label: '日本語', flag: '🇯🇵' },
  { code: 'ZH', label: '中文', flag: '🇨🇳' },
];

export default function LanguageSelectModal({
  isOpen,
  onClose,
  currentLang = 'FR',
  onSelectLanguage,
  darkMode = false,
  t = (k) => k,
}) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(61,53,48,0.7)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 65,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        backgroundColor: darkMode ? '#231E1B' : '#FAF7F2',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '380px',
        padding: '24px',
        boxShadow: '0 24px 60px rgba(61,53,48,0.25)',
        border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
        position: 'relative',
        animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* BOUTON FERMER */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            border: 'none',
            backgroundColor: darkMode ? 'rgba(232,221,211,0.1)' : '#F5EAE4',
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: darkMode ? '#FAF7F2' : '#3D3530'
          }}
        >
          <X size={16} />
        </button>

        {/* TITRE ET DESCRIPTION */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#C67D5B' }}>
          <Globe size={20} />
          <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530' }}>
            {t('selectLanguage')}
          </h3>
        </div>
        <p style={{ fontSize: '12px', color: darkMode ? '#D4C5B5' : '#6B5E54', margin: '0 0 16px', lineHeight: 1.5 }}>
          L'interface et les annonces seront instantanément traduites dans la langue choisie.
        </p>

        {/* LISTE DES LANGUES DISPONIBLES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {AVAILABLE_LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => {
                if (onSelectLanguage) {
                  onSelectLanguage(lang.code);
                }
              }}
              className="premium-button"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '14px',
                border: currentLang === lang.code ? '2px solid #C67D5B' : (darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3'),
                backgroundColor: currentLang === lang.code ? (darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4') : (darkMode ? '#1A1715' : '#FAF7F2'),
                cursor: 'pointer',
                color: currentLang === lang.code ? (darkMode ? '#FAF7F2' : '#A8644A') : (darkMode ? '#D4C5B5' : '#3D3530'),
                fontWeight: currentLang === lang.code ? '800' : '600',
                fontSize: '13px'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>{lang.flag}</span>
                <span>{lang.label}</span>
              </span>
              {currentLang === lang.code && <CheckCircle size={16} color="#C67D5B" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
