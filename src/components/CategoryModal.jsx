import React from 'react';
import { X, Grid, Check } from 'lucide-react';

export default function CategoryModal({
  isOpen,
  onClose,
  selectedCategory,
  setSelectedCategory,
  categories,
  t,
  darkMode
}) {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 3000 }}>
      <div style={{
        backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        borderRadius: '24px', width: '100%', maxWidth: '440px', padding: '24px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.3)', border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.8)',
        position: 'relative'
      }}>
        <button onClick={() => onClose?.()} style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#F3F4F6', color: darkMode ? '#FFF' : '#374151', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <X size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Grid size={20} color={darkMode ? '#93C5FD' : '#04265A'} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: darkMode ? '#FFF' : '#111827' }}>{typeof t === 'function' ? (t('categories') || 'Toutes les catégories') : 'Toutes les catégories'}</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
          {(categories || []).map(cat => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory?.(cat);
                  onClose?.();
                }}
                className="premium-button"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderRadius: '14px',
                  border: isSelected ? (darkMode ? '2px solid #60A5FA' : '2px solid #04265A') : (darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0'),
                  backgroundColor: isSelected ? (darkMode ? 'rgba(4,38,90,0.5)' : '#EFF6FF') : (darkMode ? 'rgba(15,23,42,0.5)' : '#FFF'),
                  color: darkMode ? '#FFF' : '#111827', fontWeight: '700', fontSize: '14px', cursor: 'pointer'
                }}
              >
                <span>{cat}</span>
                {isSelected && <Check size={18} color={darkMode ? '#60A5FA' : '#04265A'} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
