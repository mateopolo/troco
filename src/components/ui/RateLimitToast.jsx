import React from 'react';

export function RateLimitToast({ isRateLimited, retryAfterSeconds, onClose }) {
  if (!isRateLimited) return null;

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 99999,
        background: 'linear-gradient(135deg, #1f2937, #111827)',
        color: '#f9fafb',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        borderRadius: '16px',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        maxWidth: '400px',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          flexShrink: 0,
        }}
      >
        ⏱️
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Action ralentie</p>
        <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>
          Tu vas trop vite, réessaie dans {retryAfterSeconds}s.
        </p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '4px',
          }}
          aria-label="Fermer"
        >
          ✕
        </button>
      )}
    </div>
  );
}
