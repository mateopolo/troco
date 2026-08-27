import React from 'react';
import { X, Globe, Check } from 'lucide-react';

export default function LanguageModal({
  isOpen,
  onClose,
  currentLang,
  setCurrentLang,
  t,
  darkMode
}) {
  if (!isOpen) return null;

  const languages = [
    { code: 'FR', label: 'Français', flag: '🇫🇷', sub: 'France & Francophonie' },
    { code: 'EN', label: 'English', flag: '🇬🇧', sub: 'United Kingdom & International' },
    { code: 'ES', label: 'Español', flag: '🇪🇸', sub: 'España & Latinoamérica' },
    { code: 'IT', label: 'Italiano', flag: '🇮🇹', sub: 'Italia' },
    { code: 'DE', label: 'Deutsch', flag: '🇩🇪', sub: 'Deutschland & Österreich' },
    { code: 'JA', label: '日本語', flag: '🇯🇵', sub: '日本' },
    { code: 'ZH', label: '中文', flag: '🇨🇳', sub: '中国' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 5000 }}>
      <div style={{ backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderRadius: '24px', width: '100%', maxWidth: '560px', padding: '22px', boxShadow: '0 24px 60px rgba(0,0,0,0.20)', border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.7)', position: 'relative' }}>
        <button onClick={() => onClose?.()} style={{ position: 'absolute', top: '14px', right: '14px', border: 'none', backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#F3F4F6', width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <X size={16} color={darkMode ? '#FFF' : '#374151'} />
        </button>

        <div style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: darkMode ? '#93C5FD' : '#04265A', fontWeight: '700', marginBottom: '6px' }}>
            <Globe size={18} />
            <span>{typeof t === 'function' ? (t('selectLanguage') || 'Langue & Localisation') : 'Langue & Localisation'}</span>
          </div>
          <h3 style={{ margin: 0, fontSize: '20px', color: darkMode ? '#FFF' : '#111827' }}>
            {currentLang === 'FR' ? 'Choisissez votre langue d’interface' :
             currentLang === 'EN' ? 'Choose your interface language' :
             currentLang === 'ES' ? 'Elige tu idioma de interfaz' :
             currentLang === 'IT' ? 'Scegli la tua lingua di interfaccia' :
             currentLang === 'DE' ? 'Wählen Sie Ihre Schnittstellensprache' :
             currentLang === 'JA' ? 'インターフェース言語を選択してください' :
             '选择您的界面语言'}
          </h3>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: darkMode ? '#94A3B8' : '#6B7280' }}>
            Toutes les annonces, les messages et l'interface seront instantanément traduits dans la langue choisie.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {languages.map(lang => {
            const isSelected = currentLang === lang.code;
            return (
              <div
                key={lang.code}
                onClick={() => { setCurrentLang?.(lang.code); onClose?.(); }}
                className="premium-button"
                style={{
                  border: isSelected ? (darkMode ? '2px solid #60A5FA' : '2px solid #04265A') : (darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E5E7EB'),
                  borderRadius: '16px',
                  padding: '14px 16px',
                  backgroundColor: isSelected ? (darkMode ? 'rgba(4,38,90,0.5)' : '#EFF6FF') : (darkMode ? 'rgba(15,23,42,0.6)' : 'rgba(250,250,250,0.8)'),
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>{lang.flag}</span>
                  <div>
                    <div style={{ fontWeight: '700', color: darkMode ? '#FFF' : '#111827', fontSize: '15px' }}>{lang.label}</div>
                    <div style={{ fontSize: '12px', color: darkMode ? '#94A3B8' : '#6B7280' }}>{lang.sub}</div>
                  </div>
                </div>
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  border: isSelected ? (darkMode ? '2px solid #60A5FA' : '2px solid #04265A') : (darkMode ? '2px solid #64748B' : '2px solid #D1D5DB'),
                  backgroundColor: isSelected ? (darkMode ? '#60A5FA' : '#04265A') : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {isSelected && <Check size={13} color="#FFF" strokeWidth={3} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
