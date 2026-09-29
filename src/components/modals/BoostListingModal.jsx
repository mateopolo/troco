import React from 'react';
import { X } from 'lucide-react';
import UniversalModal from '../ui/UniversalModal';
import { useLanguage } from '../../contexts/LanguageContext';

export default function BoostListingModal({
  isOpen,
  onClose,
  boostingListing,
  confirmBoostListing,
  boostMessage = '',
  darkMode = false,
  profile,
}) {
  const { t } = useLanguage();
  if (!isOpen || !boostingListing) return null;

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={t('boostListingAriaLabel', 'Booster une annonce')}
      showCloseButton={false}
    >
      <div style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: darkMode ? '#231E1B' : '#FAF7F2',
        borderRadius: '24px',
        padding: '24px',
        boxShadow: darkMode ? '0 25px 60px rgba(0,0,0,0.8)' : '0 25px 60px rgba(61,53,48,0.25)',
        border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
        position: 'relative',
        animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <button
          onClick={onClose}
          aria-label={t('cancelBtn', 'Fermer')}
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            border: 'none',
            backgroundColor: darkMode ? 'rgba(232,221,211,0.1)' : '#F5EAE4',
            width: '32px',
            height: '32px',
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
        <div className="font-editorial-heading" style={{ fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530', marginBottom: '8px', fontSize: '20px' }}>
          {t('boostListingTitle2', '🔥 Booster cette annonce')}
        </div>
        <div style={{ fontSize: '13px', color: darkMode ? '#D4C5B5' : '#6B5E54', lineHeight: 1.6, marginBottom: '16px' }}>
          {t('boostListingDesc', 'Mets en avant {title} pendant 7 jours pour 2,99€.').replace('{title}', boostingListing.title)}
        </div>
        <button
          onClick={confirmBoostListing}
          className="premium-button"
          style={{
            width: '100%',
            border: 'none',
            borderRadius: '14px',
            padding: '12px',
            background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)',
            color: '#FFFFFF',
            fontWeight: '800',
            cursor: 'pointer',
            boxShadow: '0 10px 20px rgba(198,125,91,0.25)'
          }}
        >
          {t('boostListingCta', 'Valider le boost — procéder au paiement')}
        </button>
        {boostMessage && (
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#C67D5B', fontWeight: '700' }}>
            {boostMessage}
          </div>
        )}
      </div>
    </UniversalModal>
  );
}
