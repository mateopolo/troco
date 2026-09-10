import React, { useState } from 'react';
import { isDemoMode } from '../../data/demoData';

export default function DemoModeBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (!isDemoMode() || dismissed) {
    return null;
  }

  return (
    <div
      role="status"
      style={{
        width: '100%',
        backgroundColor: '#f59e0b',
        color: '#78350f',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '13px',
        fontWeight: '600',
        zIndex: 9999,
        position: 'sticky',
        top: 0,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>⚠️</span>
        <span>
          <strong>Mode Démonstration Actif</strong> — Les annonces et transactions d'exemple affichées ne représentent pas d'opérations financières réelles.
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#78350f',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '16px',
          padding: '2px 8px',
          borderRadius: '4px',
        }}
        aria-label="Fermer le bandeau démo"
      >
        ✕
      </button>
    </div>
  );
}
