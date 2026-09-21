import React from 'react';
import { X, Flame } from 'lucide-react';

export default function BoostModal({
  isOpen,
  onClose,
  boostingListing,
  confirmBoostListing,
  boostMessage,
  darkMode,
  t
}) {
  if (!isOpen || !boostingListing) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.55)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', zIndex: 55
    }}>
      <div style={{
        backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderRadius: '24px', width: '100%', maxWidth: '420px', padding: '22px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.20)',
        border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.7)',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '14px', right: '14px',
            border: 'none', backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
            color: darkMode ? '#FFF' : '#374151',
            width: '34px', height: '34px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
          }}
        >
          <X size={16} />
        </button>

        <div style={{ fontWeight: '800', color: darkMode ? '#FFF' : '#111827', marginBottom: '8px', fontSize: '17px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Flame size={18} color="#F59E0B" /> {t('boostListingTitle') || '🔥 Booster cette annonce'}
        </div>

        <div style={{ fontSize: '13px', color: darkMode ? '#94A3B8' : '#64748B', lineHeight: 1.6, marginBottom: '14px' }}>
          Mets en avant <strong>{boostingListing.title}</strong> pendant 7 jours pour <strong>2,99€</strong>.
        </div>

        <button
          onClick={confirmBoostListing}
          className="premium-button"
          style={{
            width: '100%', border: 'none', borderRadius: '14px', padding: '12px',
            backgroundColor: '#F59E0B', color: '#FFFFFF', fontWeight: '700',
            cursor: 'pointer', boxShadow: '0 10px 20px rgba(245,158,11,0.25)'
          }}
        >
          {t('confirmBoost') || 'Valider le boost — procéder au paiement'}
        </button>

        {boostMessage && (
          <div style={{ marginTop: '10px', fontSize: '12px', color: darkMode ? '#93C5FD' : '#04265A', fontWeight: '700' }}>
            {boostMessage}
          </div>
        )}
      </div>
    </div>
  );
}
