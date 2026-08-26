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
        gap: isMobile ? '8px' : '16px',
        width: '100%',
        maxWidth: '920px',
        margin: '0 auto',
        height: isMobile ? '100%' : 'auto',
        minHeight: 0,
        paddingBottom: 0,
        boxSizing: 'border-box',
        overflow: isMobile ? 'hidden' : 'visible',
        animation: 'fadeIn 0.25s ease both',
      }}
    >
      {/* 1. EN-TÊTE DU HUB COMMUNAUTÉ */}
      <div
        style={{
          padding: isMobile ? '10px 14px' : '22px 26px',
          borderRadius: isMobile ? '18px' : '24px',
          backgroundColor: darkMode ? '#1F1B18' : '#FAF8F5',
          border: '1px solid var(--border-color)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap: isMobile ? '8px' : '14px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: isMobile ? '36px' : '44px',
              height: isMobile ? '36px' : '44px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, var(--accent-primary) 0%, #EF4444 100%)',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(239, 68, 68, 0.3)',
              flexShrink: 0,
            }}
          >
            <Globe size={isMobile ? 18 : 22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: isMobile ? '15px' : '18px', fontWeight: '800', color: 'var(--text-main)' }}>
                Communauté & Troco Live
              </h2>
              <span style={{ fontSize: '9px', fontWeight: '800', backgroundColor: '#10B981', color: '#FFF', padding: '2px 7px', borderRadius: '999px' }}>
                1,428 EN LIGNE
              </span>
            </div>
            {!isMobile && (
              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                Événements en direct, entraide instantanée et salle de discussion mondiale.
              </p>
            )}
          </div>
        </div>

        {/* SÉLECTEUR DE SOUS-VUE : CHAT LIVE VS ACTIVITÉ */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--bg-subtle)',
            padding: '3px',
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
              padding: isMobile ? '6px 12px' : '8px 16px',
              borderRadius: '999px',
              fontSize: '11.5px',
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
            <Zap size={13} />
            <span>Chat Mondial</span>
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
              padding: isMobile ? '6px 12px' : '8px 16px',
              borderRadius: '999px',
              fontSize: '11.5px',
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
            <Activity size={13} />
            <span>Fil d'Activité</span>
          </button>
        </div>
      </div>

      {/* 2. CONTENU PRINCIPAL SELON LA VUE */}
      {subView === 'chat' ? (
        <div style={{ flex: 1, minHeight: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <GlobalLiveChat
            currentUser={currentUser}
            onOpenProfile={onOpenProfile}
            darkMode={darkMode}
            isCompact={isMobile}
          />
        </div>
      ) : (
        <div style={{ flex: isMobile ? 1 : 'initial', minHeight: 0, overflowY: isMobile ? 'auto' : 'visible' }}>
          <CommunityActivityFeed
            currentUser={currentUser}
            onOpenProfile={onOpenProfile}
            darkMode={darkMode}
          />
        </div>
      )}
    </div>
  );
}
