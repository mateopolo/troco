import React from 'react';
import { X, Sliders } from 'lucide-react';

export default function FilterDrawer({
  isOpen,
  onClose,
  formatFilter,
  setFormatFilter,
  selectedCategory,
  setSelectedCategory,
  categories,
  radiusKm,
  setRadiusKm,
  selectedLanguages = [],
  toggleLanguageFilter = () => {},
  t,
  darkMode
}) {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', zIndex: 2500, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{
        width: '100%', maxWidth: '380px', height: '100%',
        backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px',
        boxShadow: '-10px 0 40px rgba(0,0,0,0.2)', borderLeft: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={20} color={darkMode ? '#93C5FD' : '#04265A'} />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: darkMode ? '#FFF' : '#111827' }}>{t('filters') || 'Filtres avancés'}</h3>
          </div>
          <button onClick={onClose} style={{ border: 'none', backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#F3F4F6', color: darkMode ? '#FFF' : '#374151', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {/* FORMAT FILTER */}
        <div>
          <label style={{ fontSize: '13px', fontWeight: '800', color: darkMode ? '#94A3B8' : '#64748B', display: 'block', marginBottom: '10px' }}>{t('exchangeFormat') || 'Format d\'échange'}</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { id: 'all', label: 'Tous les formats' },
              { id: 'remote', label: 'À distance' },
              { id: 'onsite', label: 'Sur place' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setFormatFilter(item.id)}
                style={{
                  padding: '10px 14px', borderRadius: '12px', fontSize: '13px', fontWeight: '700',
                  border: formatFilter === item.id ? '2px solid #04265A' : (darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0'),
                  backgroundColor: formatFilter === item.id ? (darkMode ? 'rgba(4,38,90,0.5)' : '#EFF6FF') : 'transparent',
                  color: darkMode ? '#FFF' : '#111827', cursor: 'pointer', textAlign: 'left'
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* LANGUES FILTER */}
        <div>
          <label style={{ fontSize: '13px', fontWeight: '800', color: darkMode ? '#94A3B8' : '#64748B', display: 'block', marginBottom: '10px' }}>{t('languages') || 'Langues disponibles'}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {[
              { code: 'FR', label: '🇫🇷 FR' },
              { code: 'EN', label: '🇬🇧 EN' },
              { code: 'ES', label: '🇪🇸 ES' },
              { code: 'IT', label: '🇮🇹 IT' },
              { code: 'DE', label: '🇩🇪 DE' },
              { code: 'JA', label: '🇯🇵 JA' },
              { code: 'ZH', label: '🇨🇳 ZH' }
            ].map(({ code, label }) => (
              <button
                key={code}
                onClick={() => toggleLanguageFilter(code)}
                style={{
                  border: selectedLanguages.includes(code) ? '1.5px solid #04265A' : (darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #D1D5DB'),
                  backgroundColor: selectedLanguages.includes(code) ? (darkMode ? 'rgba(96,165,250,0.25)' : '#EFF6FF') : 'transparent',
                  color: selectedLanguages.includes(code) ? (darkMode ? '#93C5FD' : '#04265A') : (darkMode ? '#FFF' : '#111827'),
                  borderRadius: '999px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '4px'
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* RAYON DE RECHERCHE */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label style={{ fontSize: '13px', fontWeight: '800', color: darkMode ? '#94A3B8' : '#64748B' }}>Rayon de recherche</label>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#04265A' }}>{radiusKm} km</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#04265A', cursor: 'pointer' }}
          />
        </div>

        <button
          onClick={onClose}
          className="premium-button"
          style={{ marginTop: 'auto', border: 'none', borderRadius: '14px', padding: '14px', backgroundColor: '#04265A', color: '#FFF', fontWeight: '800', cursor: 'pointer' }}
        >
          Appliquer les filtres
        </button>
      </div>
    </div>
  );
}
