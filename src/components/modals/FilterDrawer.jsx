import React from 'react';
import { X, Sparkles, MapPin } from 'lucide-react';

export default function FilterDrawer({
  isOpen,
  onClose,
  filteredListingsCount = 0,
  isInfiniteRadius = false,
  setIsInfiniteRadius,
  radiusKm = 20,
  setRadiusKm,
  handleRequestGeolocation,
  isGeolocating = false,
  isGeolocated = false,
  selectedLanguages = ['FR', 'EN'],
  toggleLanguageFilter,
  selectedPayment = 'all',
  setSelectedPayment,
  paymentOptions = ['all', 'credits', 'cash', 'troc', 'hybrid'],
  paymentLabels = {
    all: 'Tous',
    credits: 'Crédits temps',
    cash: 'Rémunéré (€)',
    troc: 'Troc direct',
    hybrid: 'Hybride'
  },
  darkMode = false,
  t = (k) => k,
}) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(61,53,48,0.6)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      zIndex: 55,
      display: 'flex',
      justifyContent: 'flex-end',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '360px',
        height: '100%',
        backgroundColor: darkMode ? '#231E1B' : '#FAF7F2',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        padding: '20px',
        boxShadow: '-12px 0 40px rgba(0,0,0,0.25)',
        overflowY: 'auto',
        borderLeft: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
        animation: 'slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* EN-TÊTE DU TIROIR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530' }}>
            {t('filtersTitle')}
          </h3>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: darkMode ? 'rgba(255,255,255,0.08)' : '#E8DDD3',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: darkMode ? '#FFF' : '#3D3530'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* COMPTEUR D'ANNONCES RÉSULTANTES */}
        <div style={{
          padding: '10px 14px',
          borderRadius: '14px',
          backgroundColor: darkMode ? 'rgba(198,125,91,0.2)' : '#F5EAE4',
          border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
          color: darkMode ? '#FAF7F2' : '#A8644A',
          fontSize: '12px',
          fontWeight: '800',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Sparkles size={16} />
          <span>
            {isInfiniteRadius || radiusKm >= 100
              ? `🎉 ${filteredListingsCount} annonces au total (Mode Infini & Visio)`
              : `📍 ${filteredListingsCount} annonce${filteredListingsCount > 1 ? 's' : ''} disponible${filteredListingsCount > 1 ? 's' : ''} dans ${radiusKm} km`}
          </span>
        </div>

        {/* GÉOLOCALISATION SILENCIEUSE GEOPRIVACY BOUTON */}
        <div style={{ marginBottom: '14px' }}>
          <button
            onClick={handleRequestGeolocation}
            disabled={isGeolocating}
            className="premium-button"
            style={{
              width: '100%',
              border: isGeolocated ? '1px solid #9CAF88' : (darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3'),
              backgroundColor: isGeolocated ? (darkMode ? 'rgba(156,175,136,0.25)' : '#EBF0E6') : (darkMode ? '#1A1715' : '#F5F0E8'),
              color: isGeolocated ? '#3D4A35' : (darkMode ? '#FAF7F2' : '#3D3530'),
              padding: '10px 14px',
              borderRadius: '14px',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <MapPin size={15} color={isGeolocated ? '#9CAF88' : '#C67D5B'} />
            {isGeolocating ? 'Localisation...' : isGeolocated ? '📍 Position sécurisée active' : t('useMyLocation')}
          </button>
        </div>

        {/* CURSEUR ET PRESETS DE RAYON KILOMÉTRIQUE */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#D4C5B5' : '#3D3530' }}>
            {t('searchRadius')}
          </label>
          <button
            onClick={() => setIsInfiniteRadius(prev => !prev)}
            style={{
              border: isInfiniteRadius || radiusKm >= 2000 ? '1px solid #C67D5B' : (darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3'),
              backgroundColor: isInfiniteRadius || radiusKm >= 2000 ? (darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4') : (darkMode ? '#1A1715' : '#FAF7F2'),
              color: isInfiniteRadius || radiusKm >= 2000 ? (darkMode ? '#FAF7F2' : '#A8644A') : (darkMode ? '#D4C5B5' : '#6B5E54'),
              borderRadius: '999px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: '800',
              cursor: 'pointer'
            }}
          >
            {t('infiniteWorld')}
          </button>
        </div>

        <input
          type="range"
          min="5"
          max="2000"
          step="5"
          value={isInfiniteRadius ? 2000 : radiusKm}
          onChange={(e) => {
            const val = Number(e.target.value);
            setRadiusKm(val);
            if (val >= 2000) {
              setIsInfiniteRadius(true);
            } else {
              setIsInfiniteRadius(false);
            }
          }}
          style={{
            width: '100%',
            marginTop: '4px',
            accentColor: '#C67D5B',
            background: `linear-gradient(to right, #C67D5B 0%, #C67D5B ${(isInfiniteRadius ? 2000 : radiusKm) / 2000 * 100}%, ${darkMode ? '#3D3530' : '#E8DDD3'} ${(isInfiniteRadius ? 2000 : radiusKm) / 2000 * 100}%, ${darkMode ? '#3D3530' : '#E8DDD3'} 100%)`
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ fontSize: '12px', color: darkMode ? '#FAF7F2' : '#3D3530', fontWeight: '800' }}>
            {isInfiniteRadius || radiusKm >= 2000 ? '♾️ Infini (Monde entier)' : `📍 Jusqu'à ${radiusKm} km`}
          </div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {[5, 25, 100, 500, 2000].map(preset => (
              <button
                key={preset}
                onClick={() => { setRadiusKm(preset); setIsInfiniteRadius(preset >= 2000); }}
                style={{
                  border: !isInfiniteRadius && radiusKm === preset ? '1px solid #C67D5B' : (darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3'),
                  backgroundColor: !isInfiniteRadius && radiusKm === preset ? (darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4') : (darkMode ? '#1A1715' : '#FAF7F2'),
                  color: !isInfiniteRadius && radiusKm === preset ? (darkMode ? '#FAF7F2' : '#A8644A') : (darkMode ? '#D4C5B5' : '#6B5E54'),
                  borderRadius: '8px',
                  padding: '3px 7px',
                  fontSize: '10px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {preset >= 2000 ? 'Monde' : `${preset}km`}
              </button>
            ))}
          </div>
        </div>

        {/* FILTRE MULTI-LANGUES */}
        <label style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#D4C5B5' : '#3D3530' }}>
          {t('languages') || 'Langues'}
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px', marginBottom: '12px' }}>
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
                border: selectedLanguages.includes(code) ? '1px solid #C67D5B' : (darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3'),
                backgroundColor: selectedLanguages.includes(code) ? (darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4') : (darkMode ? '#1A1715' : '#FAF7F2'),
                color: selectedLanguages.includes(code) ? (darkMode ? '#FAF7F2' : '#A8644A') : (darkMode ? '#D4C5B5' : '#6B5E54'),
                borderRadius: '999px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* FILTRE MODE DE RÉTRIBUTION */}
        <label style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#D4C5B5' : '#3D3530' }}>
          Rétribution
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
          {paymentOptions.map(option => (
            <button
              key={option}
              onClick={() => setSelectedPayment(option)}
              style={{
                border: selectedPayment === option ? '1px solid #C67D5B' : (darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3'),
                backgroundColor: selectedPayment === option ? (darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4') : (darkMode ? '#1A1715' : '#FAF7F2'),
                color: selectedPayment === option ? (darkMode ? '#FAF7F2' : '#A8644A') : (darkMode ? '#D4C5B5' : '#6B5E54'),
                borderRadius: '999px',
                padding: '6px 10px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {paymentLabels[option] || option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
