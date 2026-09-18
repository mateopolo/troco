import React from 'react';
import { X } from 'lucide-react';
import UniversalModal from '../ui/UniversalModal';

export default function BoostListingModal({
  isOpen,
  onClose,
  boostingListing,
  confirmBoostListing,
  boostMessage = '',
  darkMode = false,
  profile,
}) {
  if (!isOpen || !boostingListing) return null;

  const modalHeader = (
    <>
      <button
        onClick={onClose}
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
        🔥 Booster cette annonce
      </div>
    </>
  );

  const modalFooter = (
    <>
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
        Valider le boost — procéder au paiement
      </button>
      {boostMessage && (
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#C67D5B', fontWeight: '700' }}>
          {boostMessage}
        </div>
      )}
    </>
  );

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Booster une annonce"
      showCloseButton={false}
      header={modalHeader}
      footer={modalFooter}
      maxWidth="md"
      contentStyle={{
        backgroundColor: darkMode ? '#231E1B' : '#FAF7F2',
        borderRadius: '24px',
        padding: '24px',
        boxShadow: darkMode ? '0 25px 60px rgba(0,0,0,0.8)' : '0 25px 60px rgba(61,53,48,0.25)',
        border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
        position: 'relative',
      }}
      overlayStyle={{
        backgroundColor: 'rgba(61,53,48,0.72)',
      }}
    >
      <div style={{ fontSize: '13px', color: darkMode ? '#D4C5B5' : '#6B5E54', lineHeight: 1.6, marginBottom: '16px' }}>
        Mets en avant <strong>{boostingListing.title}</strong> pendant 7 jours pour <strong>2,99€</strong>.
      </div>
    </UniversalModal>
  );
}
