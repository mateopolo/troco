import React from 'react';
import { X } from 'lucide-react';

export default function CategoryPickerModal({
  isOpen,
  onClose,
  categoryInput = '',
  setCategoryInput,
  handleAddCategory,
  darkMode = false,
  t = (k) => k,
}) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(61,53,48,0.65)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 100005,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        backgroundColor: darkMode ? '#231E1B' : '#FAF7F2',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '360px',
        padding: '24px',
        border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
        boxShadow: 'var(--shadow-modal)',
        animation: 'modalSlideIn 0.4s var(--ease-monopo) both'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', alignItems: 'center' }}>
          <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '20px', fontWeight: '400', color: darkMode ? '#FAF7F2' : '#3D3530' }}>
            {t('addCategory')}
          </h3>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: darkMode ? '#FFF' : '#3D3530',
              display: 'flex',
              padding: '4px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <input
          value={categoryInput}
          onChange={(e) => setCategoryInput(e.target.value)}
          placeholder={t('categoryPlaceholder')}
          style={{
            width: '100%',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '12px 14px',
            marginBottom: '14px',
            backgroundColor: darkMode ? '#1A1715' : '#FFF',
            color: darkMode ? '#FAF7F2' : '#3D3530',
            outline: 'none',
            fontSize: '14px'
          }}
        />

        <button
          onClick={handleAddCategory}
          className="premium-button"
          style={{
            width: '100%',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 14px',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
            color: 'var(--accent-contrast-text, #FFF)',
            fontWeight: '800',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-accent)'
          }}
        >
          {t('addButton')}
        </button>
      </div>
    </div>
  );
}
