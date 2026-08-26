import React, { useState } from 'react';
import { Zap, Activity, Globe } from 'lucide-react';
import GlobalLiveChat from '../../components/GlobalLiveChat';
import CommunityActivityFeed from '../../components/CommunityActivityFeed';

export default function CommunityHubSection({
  currentUser = null,
  onOpenProfile = null,
  darkMode = false,
  isMobile = false,
}) {
  const [subView, setSubView] = useState('chat'); // 'chat' | 'activity'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        maxWidth: '920px',
        margin: '0 auto',
        paddingBottom: isMobile ? '80px' : '30px',
        animation: 'fadeIn 0.25s ease both',
      }}
    >
      {/* 1. EN-TÊTE DU HUB COMMUNAUTÉ */}
      <div
        style={{
          padding: isMobile ? '16px 18px' : '22px 26px',
          borderRadius: '24px',
          backgroundColor: darkMode ? '#1F1B18' : '#FAF8F5',
          border: '1px solid var(--border-color)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, var(--accent-primary) 0%, #EF4444 100%)',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(239, 68, 68, 0.3)',
            }}
          >
            <Globe size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>
                Communauté & Troco Live
              </h2>
              <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#10B981', color: '#FFF', padding: '2px 8px', borderRadius: '999px' }}>
                1,428 EN LIGNE
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Événements en direct, entraide instantanée et salle de discussion mondiale.
            </p>
          </div>
        </div>

        {/* SÉLECTEUR DE SOUS-VUE : CHAT LIVE VS ACTIVITÉ */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--bg-subtle)',
            padding: '4px',
            borderRadius: '999px',
            border: '1px solid var(--border-color)',
            alignSelf: isMobile ? 'stretch' : 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => setSubView('chat')}
            className="premium-button"
            style={{
              flex: isMobile ? 1 : 'initial',
              border: 'none',
              backgroundColor: subView === 'chat' ? 'var(--accent-primary)' : 'transparent',
              color: subView === 'chat' ? '#FFFFFF' : 'var(--text-secondary)',
              padding: '8px 16px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              boxShadow: subView === 'chat' ? 'var(--shadow-accent)' : 'none',
            }}
          >
            <Zap size={14} />
            <span>Chat Mondial (Live)</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('activity')}
            className="premium-button"
            style={{
              flex: isMobile ? 1 : 'initial',
              border: 'none',
              backgroundColor: subView === 'activity' ? 'var(--accent-primary)' : 'transparent',
              color: subView === 'activity' ? '#FFFFFF' : 'var(--text-secondary)',
              padding: '8px 16px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              boxShadow: subView === 'activity' ? 'var(--shadow-accent)' : 'none',
            }}
          >
            <Activity size={14} />
            <span>Fil d'Activité</span>
          </button>
        </div>
      </div>

      {/* 2. CONTENU PRINCIPAL SELON LA VUE */}
      {subView === 'chat' ? (
        <div style={{ height: isMobile ? 'calc(100dvh - 270px)' : 'calc(100vh - 250px)', minHeight: '460px', maxHeight: '720px' }}>
          <GlobalLiveChat
            currentUser={currentUser}
            onOpenProfile={onOpenProfile}
            darkMode={darkMode}
            isCompact={isMobile}
          />
        </div>
      ) : (
        <CommunityActivityFeed
          currentUser={currentUser}
          onOpenProfile={onOpenProfile}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}
